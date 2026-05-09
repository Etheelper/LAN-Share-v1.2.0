"""
LAN Share - 用户模型
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100), nullable=True)
    role = Column(String(20), default="user")  # admin / user
    storage_quota = Column(BigInteger, default=50 * 1024 * 1024 * 1024)  # 50GB
    storage_used = Column(BigInteger, default=0)
    status = Column(String(20), default="active")  # active / frozen
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"