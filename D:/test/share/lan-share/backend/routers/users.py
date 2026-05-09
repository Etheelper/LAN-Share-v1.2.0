"""
LAN Share - 用户管理路由（管理员专用）
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user, get_current_admin
from models.user import User
from schemas.user_schema import UserResponse, UserUpdate, UserListResponse

router = APIRouter()


@router.get("/", response_model=UserListResponse, summary="获取用户列表（管理员）")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员获取所有用户列表，支持搜索和筛选"""
    query = db.query(User)
    
    if keyword:
        query = query.filter(
            (User.username.contains(keyword)) | 
            (User.nickname.contains(keyword))
        )
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return UserListResponse(total=total, users=[UserResponse.model_validate(u) for u in users])


@router.post("/", response_model=UserResponse, summary="创建用户（管理员）")
def create_user(
    username: str,
    password: str,
    nickname: Optional[str] = None,
    role: str = "user",
    storage_quota: Optional[int] = None,
    auto_active: bool = False,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员手动创建用户"""
    from core.security import hash_password
    
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    user = User(
        username=username,
        password_hash=hash_password(password),
        nickname=nickname or username,
        role=role,
        status="active" if auto_active else "pending",
        storage_quota=storage_quota or (50 * 1024 * 1024 * 1024),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse, summary="获取指定用户信息")
def get_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员获取指定用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.patch("/{user_id}", response_model=UserResponse, summary="编辑用户信息")
def update_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员修改用户信息（昵称/密码/状态/配额）"""
    from core.security import hash_password
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if data.nickname is not None:
        user.nickname = data.nickname
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.status is not None:
        if data.status not in ("active", "frozen", "pending"):
            raise HTTPException(status_code=400, detail="无效的状态值")
        user.status = data.status
    if data.storage_quota is not None:
        user.storage_quota = data.storage_quota
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", summary="删除用户（管理员）")
def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员删除用户（软删除）"""
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 软删除：冻结账户而非删除
    user.status = "frozen"
    user.username = f"_deleted_{user.id}_{user.username}"
    db.commit()
    return {"message": "用户已删除（账户已冻结）"}


@router.post("/{user_id}/activate", summary="激活用户账户")
def activate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员激活待审核用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if user.status != "pending":
        raise HTTPException(status_code=400, detail="用户状态不是待审核")
    
    user.status = "active"
    db.commit()
    return {"message": "用户已激活"}


@router.post("/{user_id}/reset-password", summary="重置用户密码")
def reset_password(
    user_id: int,
    new_password: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员重置用户密码"""
    from core.security import hash_password
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="密码长度不能少于6位")
    
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "密码已重置"}