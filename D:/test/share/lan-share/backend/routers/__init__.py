"""
LAN Share - 路由包初始化
"""

from .auth import router as auth_router
from .users import router as users_router
from .files import router as files_router
from .upload import router as upload_router
from .stream import router as stream_router

__all__ = [
    "auth_router",
    "users_router",
    "files_router",
    "upload_router",
    "stream_router",
]