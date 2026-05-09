"""
LAN Share - 局域网资源共享系统
FastAPI 后端入口
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core.config import settings
from core.database import engine, Base
from routers import auth, users, files, upload, stream

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LAN Share API",
    description="局域网资源共享系统 - 服务器端API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户管理"])
app.include_router(files.router, prefix="/api/files", tags=["文件管理"])
app.include_router(upload.router, prefix="/api/upload", tags=["上传"])
app.include_router(stream.router, prefix="/api/stream", tags=["流媒体与下载"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "LAN Share Backend"}


FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(os.path.join(FRONTEND_DIST, "favicon.svg"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "name": "LAN Share API",
            "version": "1.0.0",
            "docs": "/docs" if settings.DEBUG else "disabled",
            "hint": "前端未部署，请将 frontend/dist 内容复制到 backend/web/ 目录",
        }
