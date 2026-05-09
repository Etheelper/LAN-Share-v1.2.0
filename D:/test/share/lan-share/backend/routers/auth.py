"""
LAN Share - 认证路由
注册 / 登录 / 获取当前用户 / 修改密码
"""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    hash_password, verify_password, create_access_token, get_current_user
)
from models.user import User
from schemas.user_schema import (
    LoginRequest, LoginResponse, RegisterRequest, UserResponse
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, summary="用户注册")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_username = db.query(User).filter(User.username == data.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="用户名已存在")

    existing_nickname = db.query(User).filter(User.nickname == data.nickname).first()
    if existing_nickname:
        raise HTTPException(status_code=400, detail="昵称已被使用")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        nickname=data.nickname or data.username,
        role="user",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse, summary="用户登录")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    if user.status == "frozen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被冻结，请联系管理员",
        )

    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户待审核，请联系管理员激活",
        )

    token = create_access_token(data={"sub": str(user.id)})

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", summary="获取用户列表（用于共享授权）")
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取所有活跃用户列表，用于文件共享授权"""
    users = db.query(User).filter(
        User.status == "active",
        User.id != current_user.id,
    ).order_by(User.nickname or User.username).all()
    
    return [
        {"id": u.id, "username": u.username, "nickname": u.nickname or u.username}
        for u in users
    ]


@router.post("/change-password", summary="修改密码")
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度不能少于6位")

    current_user.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "密码修改成功"}
