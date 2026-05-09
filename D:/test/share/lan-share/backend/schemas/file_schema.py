"""
LAN Share - Pydantic Schemas
文件相关请求与响应模型
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ 文件通用 ============
class FileResponse(BaseModel):
    id: int
    name: str
    file_type: str
    mime_type: Optional[str]
    size: int
    storage_mode: str  # index / uploaded
    local_path: Optional[str]
    server_path: Optional[str]
    visibility: str
    owner_id: int
    folder_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    # 是否在线（索引文件需要原电脑在线）
    is_online: bool = True

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    total: int
    files: List[FileResponse]


# ============ 添加文件 ============
class FileAddRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., description="video / image / document / other")
    mime_type: Optional[str] = None
    size: int = Field(..., ge=0, description="文件大小，字节")
    storage_mode: str = Field(..., description="index=索引本地文件 / uploaded=上传到服务器")

    # 索引模式（storage_mode=index）
    local_path: Optional[str] = Field(None, description="本地文件完整路径（索引模式必填）")

    # 上传模式（storage_mode=uploaded，此处仅记录，由分片接口填充）
    server_path: Optional[str] = None
    file_hash: Optional[str] = None

    visibility: str = Field(default="private", description="private / public / shared")
    folder_id: Optional[int] = None


class FileUpdateRequest(BaseModel):
    name: Optional[str] = None
    visibility: Optional[str] = None
    folder_id: Optional[int] = None


class FileDeleteRequest(BaseModel):
    file_ids: List[int] = Field(..., min_items=1)


# ============ 文件夹 ============
class FolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None
    visibility: str = "private"


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    owner_id: int
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 权限设置 ============
class FileAccessGrant(BaseModel):
    file_id: int
    user_id: int
    can_view: bool = True
    can_download: bool = False


# ============ 上传相关 ============
class ChunkUploadInitRequest(BaseModel):
    filename: str
    file_size: int
    chunk_size: int = Field(default=5 * 1024 * 1024)
    total_chunks: int
    storage_mode: str = "uploaded"  # 上传模式
    file_type: str = "other"
    visibility: str = "private"
    folder_id: Optional[int] = None
    # 秒传用
    file_hash: Optional[str] = None


class ChunkUploadInitResponse(BaseModel):
    file_id: int
    upload_id: str  # 内部上传ID
    total_chunks: int
    skipped_chunks: List[int]  # 已存在的分片（秒传）
    server_path: Optional[str] = None  # 已存在的文件路径（秒传）


class ChunkUploadRequest(BaseModel):
    upload_id: str
    chunk_index: int
    chunk_hash: Optional[str] = None


class ChunkUploadResponse(BaseModel):
    chunk_index: int
    received: bool
    file_id: int


class ChunkMergeRequest(BaseModel):
    upload_id: str


class ChunkMergeResponse(BaseModel):
    file_id: int
    server_path: str
    skipped: bool  # 是否秒传（直接复用已有文件）


# ============ 流媒体与下载 ============
class StreamResponse(BaseModel):
    file_id: int
    file_name: str
    file_size: int
    content_type: str
    storage_mode: str
    # 索引模式需要原电脑在线
    is_online: bool = True


# ============ 共享文件组 ============
class SharedGroupResponse(BaseModel):
    owner_id: int
    owner_nickname: str
    files: List[FileResponse]


class SharedListResponse(BaseModel):
    groups: List[SharedGroupResponse]
