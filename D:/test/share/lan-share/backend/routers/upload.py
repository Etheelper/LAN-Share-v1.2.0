"""
LAN Share - 分片上传路由
初始化 / 分片上传 / 秒传 / 合并 / 取消
"""

from __future__ import annotations

import os
import uuid
import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.user import User
from models.file_record import FileRecord, FileChunk
from schemas.file_schema import (
    ChunkUploadInitRequest, ChunkUploadInitResponse,
    ChunkMergeRequest, ChunkMergeResponse,
)

router = APIRouter()

# 内存中存储进行中的上传（生产环境建议用Redis）
active_uploads = {}  # upload_id -> {user_id, file_id, total_chunks, chunks_received}


# ============ 秒传检测 ============
def compute_file_hash(file_path: str, chunk_size: int = 1024 * 1024) -> str:
    """计算文件MD5（用于秒传检测）"""
    md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            md5.update(chunk)
    return md5.hexdigest()


def check_instant_upload(db: Session, file_hash: str, owner_id: int) -> tuple:
    """
    检查是否存在完全相同的文件（秒传）
    返回: (is_duplicate, existing_file_record)
    """
    existing = db.query(FileRecord).filter(
        FileRecord.file_hash == file_hash,
        FileRecord.storage_mode == "uploaded",
        FileRecord.deleted == 0,
    ).first()

    return existing is not None, existing


# ============ 1. 初始化上传 ============
@router.post("/init", response_model=ChunkUploadInitResponse, summary="初始化分片上传")
def init_upload(
    data: ChunkUploadInitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    步骤1: 初始化大文件上传
    - 秒传检测：如果文件已存在，直接复用
    - 否则创建新的文件记录，准备接收分片
    """
    file_hash = data.file_hash
    
    # 秒传检测
    if file_hash:
        is_dup, existing = check_instant_upload(db, file_hash, current_user.id)
        if is_dup and existing:
            # 秒传成功！直接关联文件给当前用户
            return ChunkUploadInitResponse(
                file_id=existing.id,
                upload_id="instant",
                total_chunks=data.total_chunks,
                skipped_chunks=list(range(data.total_chunks)),
                server_path=existing.server_path,
            )
    
    # 检查配额
    if current_user.storage_used + data.file_size > current_user.storage_quota:
        raise HTTPException(status_code=400, detail="存储配额不足")
    
    # 创建文件记录
    file_record = FileRecord(
        name=data.filename,
        file_type=data.file_type,
        size=data.file_size,
        storage_mode="uploaded",
        file_hash=file_hash,
        visibility=data.visibility,
        owner_id=current_user.id,
        folder_id=data.folder_id,
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    
    # 生成上传ID
    upload_id = str(uuid.uuid4())
    
    # 初始化分片记录
    for i in range(data.total_chunks):
        chunk = FileChunk(
            file_id=file_record.id,
            chunk_index=i,
            uploaded=0,
        )
        db.add(chunk)
    
    db.commit()
    
    # 记录活动上传
    active_uploads[upload_id] = {
        "user_id": current_user.id,
        "file_id": file_record.id,
        "total_chunks": data.total_chunks,
        "chunks_received": [],
        "filename": data.filename,
    }
    
    return ChunkUploadInitResponse(
        file_id=file_record.id,
        upload_id=upload_id,
        total_chunks=data.total_chunks,
        skipped_chunks=[],
        server_path=None,
    )


# ============ 2. 上传分片 ============
@router.post("/chunk", summary="上传单个分片")
async def upload_chunk(
    upload_id: str,
    chunk_index: int,
    chunk_data: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    步骤2: 上传单个分片（5MB）
    - 验证upload_id和user_id匹配
    - 保存分片到临时目录
    - 更新分片记录
    """
    if upload_id == "instant":
        return {"message": "秒传，无需上传分片"}
    
    if upload_id not in active_uploads:
        raise HTTPException(status_code=400, detail="无效的upload_id或上传已过期")
    
    upload_info = active_uploads[upload_id]
    if upload_info["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此上传")
    
    if chunk_index >= upload_info["total_chunks"]:
        raise HTTPException(status_code=400, detail="分片编号超出范围")
    
    # 保存分片
    chunk_dir = os.path.join(settings.CHUNK_DIR, upload_id)
    os.makedirs(chunk_dir, exist_ok=True)
    
    chunk_path = os.path.join(chunk_dir, f"chunk_{chunk_index:04d}")
    
    # 写入分片文件
    content = await chunk_data.read()
    with open(chunk_path, "wb") as f:
        f.write(content)
    
    # 更新数据库分片记录
    chunk_record = db.query(FileChunk).filter(
        FileChunk.file_id == upload_info["file_id"],
        FileChunk.chunk_index == chunk_index,
    ).first()
    
    if chunk_record:
        chunk_record.uploaded = 1
        chunk_record.chunk_size = len(content)
        chunk_record.stored_path = chunk_path
        chunk_record.uploaded_at = __import__("datetime").datetime.utcnow()
    
    db.commit()
    
    # 更新活动记录
    active_uploads[upload_id]["chunks_received"].append(chunk_index)
    
    received_count = len(active_uploads[upload_id]["chunks_received"])
    
    return {
        "message": "分片已保存",
        "chunk_index": chunk_index,
        "chunk_size": len(content),
        "upload_progress": f"{received_count}/{upload_info['total_chunks']}",
    }


# ============ 3. 查询分片上传进度 ============
@router.get("/progress/{upload_id}", summary="查询上传进度")
def get_upload_progress(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询当前上传进度（已上传的分片列表）"""
    if upload_id not in active_uploads:
        raise HTTPException(status_code=400, detail="upload_id不存在或已过期")
    
    info = active_uploads[upload_id]
    if info["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问")
    
    # 从数据库查询已上传的分片
    uploaded_chunks = db.query(FileChunk).filter(
        FileChunk.file_id == info["file_id"],
        FileChunk.uploaded == 1,
    ).all()
    
    uploaded_indexes = [c.chunk_index for c in uploaded_chunks]
    
    return {
        "upload_id": upload_id,
        "file_id": info["file_id"],
        "filename": info["filename"],
        "total_chunks": info["total_chunks"],
        "uploaded_chunks": uploaded_indexes,
        "progress_percent": f"{len(uploaded_indexes) / info['total_chunks'] * 100:.1f}%",
    }


# ============ 4. 合并分片 ============
@router.post("/merge", response_model=ChunkMergeResponse, summary="合并分片")
def merge_chunks(
    data: ChunkMergeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    步骤3: 将所有分片合并为完整文件
    - 检查所有分片是否已上传完成
    - 按顺序合并到目标文件
    - 删除临时分片
    - 更新文件记录
    """
    upload_id = data.upload_id
    
    if upload_id == "instant":
        raise HTTPException(status_code=400, detail="秒传模式不需要合并")
    
    if upload_id not in active_uploads:
        raise HTTPException(status_code=400, detail="upload_id不存在或已过期")
    
    info = active_uploads[upload_id]
    if info["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")
    
    file_id = info["file_id"]
    total_chunks = info["total_chunks"]
    filename = info["filename"]
    
    # 检查分片完整性
    uploaded_chunks = db.query(FileChunk).filter(
        FileChunk.file_id == file_id,
        FileChunk.uploaded == 1,
    ).all()
    
    uploaded_indexes = set(c.chunk_index for c in uploaded_chunks)
    expected_indexes = set(range(total_chunks))
    missing = expected_indexes - uploaded_indexes
    
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"分片不完整，缺少以下分片: {sorted(missing)}",
        )
    
    # 确定目标文件路径
    file_ext = os.path.splitext(filename)[1]
    stored_filename = f"file_{file_id}_{uuid.uuid4().hex}{file_ext}"
    server_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    
    # 合并分片
    chunk_dir = os.path.join(settings.CHUNK_DIR, upload_id)
    
    with open(server_path, "wb") as dest:
        for i in range(total_chunks):
            chunk_path = os.path.join(chunk_dir, f"chunk_{i:04d}")
            with open(chunk_path, "rb") as src:
                dest.write(src.read())
    
    # 更新文件记录
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    file_record.server_path = server_path
    
    # 获取真实文件大小
    actual_size = os.path.getsize(server_path)
    file_record.size = actual_size
    
    # 计算实际MD5并更新（可选）
    # file_record.file_hash = compute_file_hash(server_path)
    
    # 更新用户存储使用量
    current_user.storage_used += actual_size
    
    # 清理分片临时目录
    import shutil
    try:
        shutil.rmtree(chunk_dir)
    except Exception:
        pass
    
    # 删除活动上传记录
    del active_uploads[upload_id]
    
    db.commit()
    db.refresh(file_record)
    
    return ChunkMergeResponse(
        file_id=file_record.id,
        server_path=server_path,
        skipped=False,
    )


# ============ 5. 取消上传 ============
@router.post("/cancel/{upload_id}", summary="取消上传")
def cancel_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """取消上传，清理已上传的分片"""
    if upload_id not in active_uploads:
        return {"message": "上传不存在"}
    
    info = active_uploads[upload_id]
    if info["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")
    
    file_id = info["file_id"]
    
    # 删除文件记录
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if file_record:
        # 软删除文件记录
        file_record.deleted = 1
        db.commit()
    
    # 删除分片目录
    chunk_dir = os.path.join(settings.CHUNK_DIR, upload_id)
    import shutil
    try:
        shutil.rmtree(chunk_dir)
    except Exception:
        pass
    
    # 删除活动记录
    del active_uploads[upload_id]
    
    return {"message": "上传已取消"}


# ============ 6. 简单单文件上传（小于100MB）============
@router.post("/simple", summary="简单单文件上传（小于100MB）")
async def simple_upload(
    file_data: UploadFile = File(...),
    visibility: str = "private",
    folder_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    简单上传模式（不分片，用于小文件）
    文件直接完整上传到服务器
    """
    # 读取文件内容
    content = await file_data.read()
    file_size = len(content)
    
    # 检查配额
    if current_user.storage_used + file_size > current_user.storage_quota:
        raise HTTPException(status_code=400, detail="存储配额不足")
    
    # 确定文件类型
    filename = file_data.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    
    # 简单文件类型判断
    video_exts = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"}
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    doc_exts = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"}
    
    if ext in video_exts:
        file_type = "video"
    elif ext in image_exts:
        file_type = "image"
    elif ext in doc_exts:
        file_type = "document"
    else:
        file_type = "other"
    
    # 保存文件
    stored_name = f"file_{uuid.uuid4().hex}{ext}"
    server_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    
    with open(server_path, "wb") as f:
        f.write(content)
    
    # 计算MD5
    md5_hash = hashlib.md5(content).hexdigest()
    
    # 检查秒传
    existing = db.query(FileRecord).filter(
        FileRecord.file_hash == md5_hash,
        FileRecord.storage_mode == "uploaded",
        FileRecord.deleted == 0,
    ).first()
    
    if existing:
        # 秒传成功，删除刚上传的文件
        os.remove(server_path)
        return {
            "file_id": existing.id,
            "name": existing.name,
            "size": existing.size,
            "skipped": True,
            "message": "秒传成功！",
        }
    
    # 创建文件记录
    file_record = FileRecord(
        name=filename,
        file_type=file_type,
        size=file_size,
        storage_mode="uploaded",
        server_path=server_path,
        file_hash=md5_hash,
        visibility=visibility,
        owner_id=current_user.id,
        folder_id=folder_id,
    )
    db.add(file_record)
    current_user.storage_used += file_size
    db.commit()
    db.refresh(file_record)
    
    return {
        "file_id": file_record.id,
        "name": file_record.name,
        "size": file_record.size,
        "storage_mode": "uploaded",
        "skipped": False,
        "message": "上传成功",
    }