"""
LAN Share - 文件管理路由
文件CRUD / 文件夹管理 / 搜索 / 权限设置
"""

from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List

from core.database import get_db
from core.security import get_current_user, get_current_admin
from core.config import settings
from models.user import User
from models.file_record import FileRecord, Folder, FileAccess, DownloadLog
from schemas.file_schema import (
    FileResponse, FileListResponse, FileAddRequest, FileUpdateRequest,
    FolderCreateRequest, FolderResponse, FileAccessGrant, SharedListResponse,
    SharedGroupResponse
)

router = APIRouter()


def check_file_access(file_record: FileRecord, user: User, db: Session) -> bool:
    """检查用户是否有权访问文件"""
    if file_record.owner_id == user.id:
        return True
    if user.role == "admin":
        return True
    if file_record.visibility == "public":
        return True
    if file_record.visibility == "shared":
        access = db.query(FileAccess).filter(
            FileAccess.file_id == file_record.id,
            FileAccess.user_id == user.id,
            FileAccess.can_view == 1,
        ).first()
        return access is not None
    return False


def check_index_file_online(file_record: FileRecord) -> bool:
    """检查索引文件是否在线（原电脑是否开机）"""
    if file_record.storage_mode != "index":
        return True
    return os.path.exists(file_record.local_path)


@router.get("/", response_model=FileListResponse, summary="获取文件列表")
def list_files(
    folder_id: Optional[int] = None,
    file_type: Optional[str] = None,
    visibility: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取文件列表（智能过滤：公开+自己上传/索引的）"""
    query = db.query(FileRecord).filter(
        FileRecord.deleted == 0,
        FileRecord.folder_id == folder_id,
    )

    if file_type:
        query = query.filter(FileRecord.file_type == file_type)
    if keyword:
        query = query.filter(FileRecord.name.contains(keyword))

    query = query.filter(
        or_(
            FileRecord.owner_id == current_user.id,
            FileRecord.visibility == "public",
        )
    )

    total = query.count()
    files = query.order_by(FileRecord.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for f in files:
        fr = FileResponse(
            id=f.id, name=f.name, file_type=f.file_type,
            mime_type=f.mime_type, size=f.size,
            storage_mode=f.storage_mode, local_path=f.local_path,
            server_path=f.server_path, visibility=f.visibility,
            owner_id=f.owner_id, folder_id=f.folder_id,
            created_at=f.created_at, updated_at=f.updated_at,
            is_online=check_index_file_online(f),
        )
        result.append(fr)

    return FileListResponse(total=total, files=result)


@router.get("/shared", response_model=SharedListResponse, summary="获取共享文件列表（按用户分组）")
def list_shared_files(
    keyword: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取所有共享文件/文件夹，按上传者分组（显示所有用户）"""
    
    users_query = db.query(User).filter(User.status == "active")
    if keyword:
        users_query = users_query.filter(
            or_(User.nickname.contains(keyword), User.username.contains(keyword))
        )
    all_users = users_query.all()
    
    shared_files_map: dict[int, list] = {}
    shared_folders_map: dict[int, list] = {}
    
    for user in all_users:
        shared_files_map[user.id] = []
        shared_folders_map[user.id] = []
    
    shared_files = db.query(FileRecord).filter(
        FileRecord.deleted == 0,
        FileRecord.visibility.in_(["public", "shared"]),
        FileRecord.owner_id.in_([u.id for u in all_users]),
    ).all()
    
    shared_folders = db.query(Folder).filter(
        Folder.deleted == 0,
        Folder.visibility == "public",
        Folder.owner_id.in_([u.id for u in all_users]),
    ).all()
    
    for f in shared_files:
        if f.owner_id in shared_files_map:
            shared_files_map[f.owner_id].append(f)
    
    for folder in shared_folders:
        if folder.owner_id in shared_folders_map:
            shared_folders_map[folder.owner_id].append(folder)
    
    groups = []
    for user in sorted(all_users, key=lambda u: u.nickname or u.username or ""):
        files = []
        
        for f in shared_files_map.get(user.id, []):
            files.append(FileResponse(
                id=f.id, name=f.name, file_type=f.file_type,
                mime_type=f.mime_type, size=f.size,
                storage_mode=f.storage_mode, local_path=f.local_path,
                server_path=f.server_path, visibility=f.visibility,
                owner_id=f.owner_id, folder_id=f.folder_id,
                created_at=f.created_at, updated_at=f.updated_at,
                is_online=check_index_file_online(f),
            ))
        
        for folder in shared_folders_map.get(user.id, []):
            files.append(FileResponse(
                id=folder.id, name=folder.name, file_type="folder",
                mime_type=None, size=0,
                storage_mode="folder", local_path=None,
                server_path=None, visibility=folder.visibility,
                owner_id=folder.owner_id, folder_id=folder.id,
                created_at=folder.created_at, updated_at=folder.created_at,
                is_online=True,
            ))
        
        groups.append(SharedGroupResponse(
            owner_id=user.id,
            owner_nickname=user.nickname or user.username,
            files=files,
        ))
    
    return SharedListResponse(groups=groups)


@router.post("/", response_model=FileResponse, summary="添加文件记录")
def add_file(
    data: FileAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """添加文件记录（索引模式或上传模式）"""
    if data.storage_mode == "index":
        if not data.local_path:
            raise HTTPException(status_code=400, detail="索引模式必须提供 local_path")
        if not os.path.exists(data.local_path):
            raise HTTPException(status_code=400, detail="本地文件不存在")
        file_size = os.path.getsize(data.local_path)
    elif data.storage_mode == "uploaded":
        file_size = data.size
    else:
        raise HTTPException(status_code=400, detail="storage_mode 必须是 index 或 uploaded")

    if current_user.storage_used + file_size > current_user.storage_quota:
        raise HTTPException(status_code=400, detail="存储配额不足")

    if data.storage_mode == "index":
        existing = db.query(FileRecord).filter(
            FileRecord.local_path == data.local_path,
            FileRecord.deleted == 0,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="该路径已存在记录，请勿重复添加")

    file_record = FileRecord(
        name=data.name,
        file_type=data.file_type,
        mime_type=data.mime_type,
        size=file_size,
        storage_mode=data.storage_mode,
        local_path=data.local_path if data.storage_mode == "index" else None,
        server_path=data.server_path,
        file_hash=data.file_hash,
        visibility=data.visibility,
        owner_id=current_user.id,
        folder_id=data.folder_id,
    )
    db.add(file_record)

    if data.storage_mode == "uploaded":
        current_user.storage_used += file_size

    db.commit()
    db.refresh(file_record)

    return FileResponse(
        id=file_record.id, name=file_record.name,
        file_type=file_record.file_type, mime_type=file_record.mime_type,
        size=file_record.size, storage_mode=file_record.storage_mode,
        local_path=file_record.local_path, server_path=file_record.server_path,
        visibility=file_record.visibility, owner_id=file_record.owner_id,
        folder_id=file_record.folder_id,
        created_at=file_record.created_at, updated_at=file_record.updated_at,
        is_online=check_index_file_online(file_record),
    )


@router.get("/{file_id}", response_model=FileResponse, summary="获取文件详情")
def get_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取文件详情"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")

    if not check_file_access(f, current_user, db):
        raise HTTPException(status_code=403, detail="无权限访问此文件")

    return FileResponse(
        id=f.id, name=f.name, file_type=f.file_type,
        mime_type=f.mime_type, size=f.size,
        storage_mode=f.storage_mode, local_path=f.local_path,
        server_path=f.server_path, visibility=f.visibility,
        owner_id=f.owner_id, folder_id=f.folder_id,
        created_at=f.created_at, updated_at=f.updated_at,
        is_online=check_index_file_online(f),
    )


@router.patch("/{file_id}", response_model=FileResponse, summary="更新文件信息")
def update_file(
    file_id: int,
    data: FileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新文件（所有者或管理员）"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")

    if f.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权限修改此文件")

    if data.name is not None:
        f.name = data.name
    if data.visibility is not None:
        if data.visibility not in ("private", "public", "shared"):
            raise HTTPException(status_code=400, detail="无效的可见性设置")
        f.visibility = data.visibility
    if data.folder_id is not None:
        f.folder_id = data.folder_id

    db.commit()
    db.refresh(f)

    return FileResponse(
        id=f.id, name=f.name, file_type=f.file_type,
        mime_type=f.mime_type, size=f.size,
        storage_mode=f.storage_mode, local_path=f.local_path,
        server_path=f.server_path, visibility=f.visibility,
        owner_id=f.owner_id, folder_id=f.folder_id,
        created_at=f.created_at, updated_at=f.updated_at,
        is_online=check_index_file_online(f),
    )


@router.delete("/", summary="删除文件")
def delete_files(
    file_ids: List[int] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除文件（所有者或管理员可删除，public文件只有所有者和管理员可删）"""
    files = db.query(FileRecord).filter(
        FileRecord.id.in_(file_ids),
        FileRecord.deleted == 0,
    ).all()

    if not files:
        raise HTTPException(status_code=404, detail="文件不存在")

    deleted_count = 0
    not_allowed_count = 0
    for f in files:
        # 只有所有者、管理员可以删除
        # public 文件也遵循此规则（不允许其他用户删除）
        if f.owner_id == current_user.id or current_user.role == "admin":
            f.deleted = 1
            if f.storage_mode == "uploaded":
                owner = db.query(User).filter(User.id == f.owner_id).first()
                if owner:
                    owner.storage_used = max(0, owner.storage_used - f.size)
            deleted_count += 1
        else:
            not_allowed_count += 1

    db.commit()

    if not_allowed_count > 0:
        if deleted_count == 0:
            raise HTTPException(status_code=403, detail="无权限删除这些文件")
        else:
            return {"message": f"已删除 {deleted_count} 个文件，{not_allowed_count} 个文件无权限删除", "total": len(file_ids), "deleted": deleted_count}

    return {"message": f"已删除 {deleted_count} 个文件", "total": len(file_ids)}


@router.get("/folders/all", response_model=List[FolderResponse], summary="获取文件夹树")
def get_all_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的所有文件夹"""
    folders = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.deleted == 0,
    ).order_by(Folder.name).all()
    return [FolderResponse.model_validate(f) for f in folders]


@router.post("/folders", response_model=FolderResponse, summary="创建文件夹")
def create_folder(
    data: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建文件夹"""
    folder = Folder(
        name=data.name,
        parent_id=data.parent_id,
        owner_id=current_user.id,
        visibility=data.visibility,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderResponse.model_validate(folder)


@router.delete("/folders/{folder_id}", summary="删除文件夹")
def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除文件夹（同时删除内部文件）"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    folder.deleted = 1
    db.query(FileRecord).filter(FileRecord.folder_id == folder_id).update({"deleted": 1})
    db.commit()
    return {"message": "文件夹已删除"}


@router.post("/access", summary="授予文件访问权限")
def grant_file_access(
    data: FileAccessGrant,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """文件所有者授予指定用户访问权限"""
    f = db.query(FileRecord).filter(FileRecord.id == data.file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    if f.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="只有文件所有者可以设置权限")

    existing = db.query(FileAccess).filter(
        FileAccess.file_id == data.file_id,
        FileAccess.user_id == data.user_id,
    ).first()

    if existing:
        existing.can_view = 1 if data.can_view else 0
        existing.can_download = 1 if data.can_download else 0
    else:
        access = FileAccess(
            file_id=data.file_id,
            user_id=data.user_id,
            can_view=1 if data.can_view else 0,
            can_download=1 if data.can_download else 0,
        )
        db.add(access)

    f.visibility = "shared"
    db.commit()
    return {"message": "权限已设置"}


@router.delete("/access/{file_id}/{user_id}", summary="撤销文件访问权限")
def revoke_file_access(
    file_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """撤销权限"""
    f = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.deleted == 0).first()
    if not f:
        raise HTTPException(status_code=404, detail="文件不存在")
    if f.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权限")

    db.query(FileAccess).filter(
        FileAccess.file_id == file_id,
        FileAccess.user_id == user_id,
    ).delete()
    db.commit()
    return {"message": "权限已撤销"}


@router.get("/admin/all", response_model=FileListResponse, summary="管理员获取所有文件")
def admin_list_all_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    keyword: Optional[str] = None,
    storage_mode: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员查看所有文件（所有模式）"""
    query = db.query(FileRecord).filter(FileRecord.deleted == 0)

    if keyword:
        query = query.filter(FileRecord.name.contains(keyword))
    if storage_mode:
        query = query.filter(FileRecord.storage_mode == storage_mode)

    total = query.count()
    files = query.order_by(FileRecord.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for f in files:
        result.append(FileResponse(
            id=f.id, name=f.name, file_type=f.file_type,
            mime_type=f.mime_type, size=f.size,
            storage_mode=f.storage_mode, local_path=f.local_path,
            server_path=f.server_path, visibility=f.visibility,
            owner_id=f.owner_id, folder_id=f.folder_id,
            created_at=f.created_at, updated_at=f.updated_at,
            is_online=check_index_file_online(f),
        ))

    return FileListResponse(total=total, files=result)


@router.get("/downloads", summary="获取下载记录")
def get_downloads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的下载记录（管理员可看所有）"""
    query = db.query(DownloadLog).join(FileRecord)

    if current_user.role != "admin":
        query = query.filter(DownloadLog.user_id == current_user.id)

    total = query.count()
    logs = query.order_by(DownloadLog.downloaded_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for log in logs:
        f = db.query(FileRecord).filter(FileRecord.id == log.file_id).first()
        result.append({
            "id": log.id,
            "file_id": log.file_id,
            "file_name": f.name if f else "(已删除)",
            "downloaded_at": log.downloaded_at,
            "ip_address": log.ip_address,
        })

    return {"total": total, "records": result}
