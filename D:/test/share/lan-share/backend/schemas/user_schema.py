"""
LAN Share - Pydantic Schemas
用户相关请求与响应模型
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ 用户 ============
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    nickname: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
    storage_quota: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    username: str
    nickname: Optional[str]
    role: str
    storage_quota: int
    storage_used: int
    status: str
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    users: List[UserResponse]


# ============ 认证 ============
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    nickname: Optional[str] = None
