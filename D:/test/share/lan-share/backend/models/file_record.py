"""
LAN Share - 文件索引模型
支持两种模式：index（索引引用本地文件）/ uploaded（上传到服务器）
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Text
from core.database import Base


class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 文件基本信息
    name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # video / image / document / other
    mime_type = Column(String(100), nullable=True)
    size = Column(BigInteger, default=0)  # 字节
    
    # 存储模式
    # index = 引用本地文件（不占服务器空间）
    # uploaded = 上传到服务器（占服务器空间）
    storage_mode = Column(String(20), nullable=False)  # index / uploaded
    
    # 索引模式：文件在本地的路径
    local_path = Column(Text, nullable=True)
    
    # 上传模式：文件在服务器的存储路径
    server_path = Column(Text, nullable=True)
    
    # 上传模式：文件MD5（用于秒传）
    file_hash = Column(String(64), nullable=True)
    
    # 引用计数（秒传时多个用户共享同一份物理文件）
    ref_count = Column(Integer, default=1)
    
    # 权限
    visibility = Column(String(20), default="private")  # private / public / shared
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 所属文件夹
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    
    # 元数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 软删除标记
    deleted = Column(Integer, default=0)

    def __repr__(self):
        return f"<FileRecord(id={self.id}, name={self.name}, mode={self.storage_mode})>"


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    visibility = Column(String(20), default="private")  # private / public
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted = Column(Integer, default=0)

    def __repr__(self):
        return f"<Folder(id={self.id}, name={self.name})>"


class FileAccess(Base):
    """文件访问权限 - 用于 shared 模式下指定可见用户"""
    __tablename__ = "file_access"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("file_records.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    can_view = Column(Integer, default=1)
    can_download = Column(Integer, default=0)
    granted_at = Column(DateTime, default=datetime.utcnow)


class FileChunk(Base):
    """文件分片记录 - 用于大文件分片上传"""
    __tablename__ = "file_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("file_records.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_hash = Column(String(64), nullable=True)
    chunk_size = Column(BigInteger, default=0)
    stored_path = Column(Text, nullable=True)
    uploaded = Column(Integer, default=0)  # 0=未完成 1=已完成
    uploaded_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<FileChunk(file_id={self.file_id}, index={self.chunk_index})>"


class DownloadLog(Base):
    """下载记录"""
    __tablename__ = "download_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("file_records.id"), nullable=False)
    downloaded_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)