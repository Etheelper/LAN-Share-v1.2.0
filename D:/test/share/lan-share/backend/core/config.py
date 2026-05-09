"""
LAN Share - 系统配置
从 .env 文件加载所有配置项
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """系统配置项"""

    # ===== 环境 =====
    DEBUG: bool = True
    ENV: str = "development"  # development / production

    # ===== 服务器 =====
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ===== 数据库 =====
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/lanshare.db"

    # ===== 文件存储 =====
    # 上传模式：文件存储在此目录
    UPLOAD_DIR: str = f"{BASE_DIR}/storage/files"
    CHUNK_DIR: str = f"{BASE_DIR}/storage/chunks"

    # 索引模式：允许读取的本地路径（逗号分隔，万能正则）
    INDEX_ALLOWED_PATHS: str = "C:\\,D:\\,E:\\,F:\\,/mnt/,/home/"

    # 单文件大小限制（字节），默认无限制
    MAX_FILE_SIZE: int = 0  # 0 = 无限制

    # ===== JWT认证 =====
    SECRET_KEY: str = "CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时

    # ===== 用户配额 =====
    DEFAULT_STORAGE_QUOTA: int = 50 * 1024 * 1024 * 1024  # 50GB

    # ===== 分片上传 =====
    CHUNK_SIZE: int = 5 * 1024 * 1024  # 5MB per chunk

    class Config:
        env_file = BASE_DIR / ".env"
        extra = "allow"


settings = Settings()

# 确保目录存在
os.makedirs(f"{BASE_DIR}/data", exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHUNK_DIR, exist_ok=True)