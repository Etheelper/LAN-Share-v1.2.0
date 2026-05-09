"""
LAN Share - 流媒体直读 & 文件下载路由
视频边下边播 / 图片/PDF预览 / 文件下载
支持 HTTP Range 请求（拖动进度条不断点）
"""

from __future__ import annotations

import os
import re
import mimetypes
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from starlette.datastructures import Headers

from core.database import get_db
from core.security import get_current_user, get_optional_user
from core.config import settings
from models.user import User
from models.file_record import FileRecord, DownloadLog

router = APIRouter()

# 常见视频格式
VIDEO_MIMETYPES = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".webm": "video/webm",
}


def encode_filename(filename: str) -> str:
    """编码文件名以支持中文等非ASCII字符"""
    try:
        filename.encode('ascii')
        return f'"{filename}"'
    except UnicodeEncodeError:
        import urllib.parse
        return f"filename*=UTF-8''{urllib.parse.quote(filename)}"


# ============ 辅助函数 ============
def check_access(file_record: FileRecord, user: User, db: Session) -> bool:
    """检查文件访问权限"""
    if user is None:
        return file_record.visibility == "public"
    
    if user.role == "admin":
        return True
    if file_record.owner_id == user.id:
        return True
    if file_record.visibility == "public":
        return True
    
    from models.file_record import FileAccess
    if file_record.visibility == "shared":
        access = db.query(FileAccess).filter(
            FileAccess.file_id == file_record.id,
            FileAccess.user_id == user.id,
            FileAccess.can_view == 1,
        ).first()
        return access is not None
    
    return False


def check_download_access(file_record: FileRecord, user: User, db: Session) -> bool:
    """检查文件下载权限"""
    if user is None or user.role != "admin":
        # 非管理员需要是所有者或者有下载权限
        from models.file_record import FileAccess
        if file_record.owner_id == user.id:
            return True
        if file_record.visibility in ("public", "shared"):
            access = db.query(FileAccess).filter(
                FileAccess.file_id == file_record.id,
                FileAccess.user_id == user.id,
                FileAccess.can_download == 1,
            ).first()
            return access is not None
        return False
    return True


def log_download(file_id: int, user_id: int, request: Request, db: Session):
    """记录下载日志"""
    log = DownloadLog(
        user_id=user_id,
        file_id=file_id,
        downloaded_at=datetime.now(timezone.utc),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )
    db.add(log)
    db.commit()


# ============ 1. 获取文件流（元信息）============
@router.get("/info/{file_id}", summary="获取文件流信息")
def get_stream_info(
    file_id: int,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """获取文件信息（大小/类型/是否在线），供前端判断能否播放"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if not check_access(f, user, db):
        raise HTTPException(status_code=403, detail="无权限访问")
    
    # 索引模式：检查原电脑是否在线
    is_online = True
    if f.storage_mode == "index" and f.local_path:
        is_online = os.path.exists(f.local_path)
    
    # 视频文件特殊标记
    is_video = f.file_type == "video" or (
        f.mime_type and f.mime_type.startswith("video/")
    )
    
    return {
        "file_id": f.id,
        "name": f.name,
        "size": f.size,
        "content_type": f.mime_type or "application/octet-stream",
        "storage_mode": f.storage_mode,
        "is_online": is_online,
        "is_video": is_video,
        "visibility": f.visibility,
        "server_path": f.server_path if f.storage_mode == "uploaded" else None,
        "local_path": f.local_path if f.storage_mode == "index" else None,
    }


# ============ 2. 流式读取文件（核心功能）============
@router.get("/file/{file_id}", summary="流式读取文件（支持Range）")
def stream_file(
    file_id: int,
    request: Request,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    核心功能：流式读取文件，支持 HTTP Range 请求
    - 视频：边下边播，拖动进度条不断点
    - 图片：直接显示
    - 文档：预览
    
    Range请求示例：
    - Range: bytes=0-1023 （前1KB）
    - Range: bytes=1024- （从1024字节到文件末尾）
    - Range: bytes=-1024 （最后1KB）
    """
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if not check_access(f, user, db):
        raise HTTPException(status_code=403, detail="无权限访问")
    
    # 确定文件路径
    if f.storage_mode == "uploaded":
        if not f.server_path or not os.path.exists(f.server_path):
            raise HTTPException(status_code=404, detail="文件不存在（服务器端）")
        file_path = f.server_path
    else:  # index 模式
        if not f.local_path or not os.path.exists(f.local_path):
            raise HTTPException(status_code=503, detail="文件不在线（源电脑未开机）")
        file_path = f.local_path
    
    file_size = os.path.getsize(file_path)
    
    # 确定Content-Type
    content_type = f.mime_type
    if not content_type:
        ext = os.path.splitext(f.name)[1].lower()
        if ext in VIDEO_MIMETYPES:
            content_type = VIDEO_MIMETYPES[ext]
        else:
            content_type = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
    
    # 处理 Range 请求
    range_header = request.headers.get("range")
    
    if not range_header:
        # 无Range：完整文件下载
        return StreamingResponse(
            open_file_stream(file_path),
            media_type=content_type,
            headers={
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Content-Disposition": f"attachment; {encode_filename(f.name)}",
            },
        )
    
    # 解析 Range
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        range_match = re.match(r"bytes=(\d+)-", range_header)
    
    if range_match:
        start = int(range_match.group(1))
        end_str = range_match.group(2)
        end = int(end_str) if end_str else file_size - 1
        
        # 边界检查
        start = max(0, start)
        end = min(end, file_size - 1)
        
        if start >= file_size:
            raise HTTPException(
                status_code=416,
                detail=f"Range Not Satisfiable (file size: {file_size})",
            )
        
        content_length = end - start + 1
        
        # 返回部分内容 (206 Partial Content)
        def range_stream():
            with open(file_path, "rb") as fp:
                fp.seek(start)
                remaining = content_length
                chunk_size = 1024 * 1024  # 1MB per chunk
                while remaining > 0:
                    to_read = min(chunk_size, remaining)
                    chunk = fp.read(to_read)
                    if not chunk:
                        break
                    yield chunk
                    remaining -= len(chunk)
        
        return StreamingResponse(
            range_stream(),
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Disposition": f"inline; {encode_filename(f.name)}",
                "Cache-Control": "no-cache",
            },
        )
    else:
        # 无法解析Range，返回完整文件
        return StreamingResponse(
            open_file_stream(file_path),
            media_type=content_type,
            headers={
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
            },
        )


# 辅助：生成文件流
def open_file_stream(path: str, chunk_size: int = 1024 * 1024):
    """分块读取文件，避免内存溢出"""
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk


# ============ 3. 直接下载文件（触发下载对话框）============
@router.get("/download/{file_id}", summary="下载文件")
def download_file(
    file_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """下载文件（弹出保存对话框）"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if not check_access(f, user, db):
        raise HTTPException(status_code=403, detail="无权限访问")
    
    if not check_download_access(f, user, db):
        raise HTTPException(status_code=403, detail="无下载权限")
    
    # 索引模式：检查在线
    if f.storage_mode == "index":
        if not f.local_path or not os.path.exists(f.local_path):
            raise HTTPException(
                status_code=503,
                detail="文件不在线，请确保源电脑已开机并连接到局域网",
            )
        file_path = f.local_path
    else:
        if not f.server_path or not os.path.exists(f.server_path):
            raise HTTPException(status_code=404, detail="文件不存在（服务器端）")
        file_path = f.server_path
    
    # 异步记录下载日志（不影响下载速度）
    if user:
        background_tasks.add_task(log_download, file_id, user.id, request, db)
    
    # 返回文件下载响应
    return StreamingResponse(
        open_file_stream(file_path),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; {encode_filename(f.name)}",
            "Content-Length": str(os.path.getsize(file_path)),
        },
    )


# ============ 4. 下载索引模式文件（代理转发）============
@router.get("/download/index/{file_id}", summary="下载索引文件（代理）")
def download_index_file(
    file_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """下载索引模式文件（通过服务器代理转发，来自用户本地电脑的文件）"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if f.storage_mode != "index":
        raise HTTPException(status_code=400, detail="此接口仅用于索引文件")
    
    if not check_access(f, user, db):
        raise HTTPException(status_code=403, detail="无权限访问")
    
    if not check_download_access(f, user, db):
        raise HTTPException(status_code=403, detail="无下载权限")
    
    if not f.local_path or not os.path.exists(f.local_path):
        raise HTTPException(
            status_code=503,
            detail="文件不在线（源电脑未开机）",
        )
    
    file_size = os.path.getsize(f.local_path)
    
    if user:
        background_tasks.add_task(log_download, file_id, user.id, request, db)
    
    # Range 支持（同stream_file）
    range_header = request.headers.get("range")
    
    if not range_header:
        return StreamingResponse(
            open_file_stream(f.local_path),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; {encode_filename(f.name)}",
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
            },
        )
    
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if range_match:
        start = int(range_match.group(1))
        end_str = range_match.group(2)
        end = int(end_str) if end_str else file_size - 1
        start = max(0, start)
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        def range_stream():
            with open(f.local_path, "rb") as fp:
                fp.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk = fp.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    yield chunk
                    remaining -= len(chunk)
        
        return StreamingResponse(
            range_stream(),
            status_code=206,
            media_type="application/octet-stream",
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Disposition": f"attachment; {encode_filename(f.name)}",
            },
        )
    
    return StreamingResponse(
        open_file_stream(f.local_path),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; {encode_filename(f.name)}",
            "Content-Length": str(file_size),
        },
    )


# ============ 5. 获取视频预览缩略图（可选）============
@router.get("/thumbnail/{file_id}", summary="获取视频缩略图")
def get_thumbnail(
    file_id: int,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """获取视频缩略图（第一次访问时生成并缓存）"""
    # 此功能需要 ffmpeg，简化实现：返回空
    # 完整实现可参考：ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 thumb.jpg
    raise HTTPException(status_code=501, detail="缩略图功能开发中")


# ============ 6. 视频字幕文件（可选）============
@router.get("/subtitle/{file_id}", summary="获取字幕文件")
def get_subtitle(
    file_id: int,
    fmt: str = "vtt",
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """获取视频字幕（需要同名的.srt/.vtt文件存在）"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if not check_access(f, user, db):
        raise HTTPException(status_code=403, detail="无权限访问")
    
    # 查找同名字幕文件
    base_name = os.path.splitext(f.name)[0]
    subtitle_path = None
    
    for ext in [".vtt", ".srt", ".ass"]:
        candidate = os.path.join(os.path.dirname(f.server_path or f.local_path), base_name + ext)
        if os.path.exists(candidate):
            subtitle_path = candidate
            break
    
    if not subtitle_path:
        raise HTTPException(status_code=404, detail="字幕文件不存在")
    
    return FileResponse(
        path=subtitle_path,
        media_type="text/vtt" if fmt == "vtt" else "text/plain",
        filename=os.path.basename(subtitle_path),
    )