@echo off
chcp 65001 >nul
title LAN Share - 局域网资源共享

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

set "PYTHON_EXE="
if exist "%APP_DIR%python\python.exe" (
    set "PYTHON_EXE=%APP_DIR%python\python.exe"
) else if exist "%APP_DIR%..\python\python.exe" (
    set "PYTHON_EXE=%APP_DIR%..\python\python.exe"
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        set "PYTHON_EXE=python"
    )
)

if "%PYTHON_EXE%"=="" (
    echo ══════════════════════════════════════════════════
    echo   错误: 未找到 Python 环境!
    echo   请重新安装 LAN Share
    echo ══════════════════════════════════════════════════
    pause
    exit /b 1
)

set "BACKEND_DIR="
if exist "%APP_DIR%backend\run.py" (
    set "BACKEND_DIR=%APP_DIR%backend"
) else if exist "%APP_DIR%..\backend\run.py" (
    set "BACKEND_DIR=%APP_DIR%..\backend"
)

if "%BACKEND_DIR%"=="" (
    echo ══════════════════════════════════════════════════
    echo   错误: 未找到后端程序!
    echo   请重新安装 LAN Share
    echo ══════════════════════════════════════════════════
    pause
    exit /b 1
)

echo ══════════════════════════════════════════════════
echo   LAN Share 局域网资源共享系统
echo ══════════════════════════════════════════════════
echo.
echo   访问地址: http://localhost:8000
echo   按 Ctrl+C 停止服务
echo.

cd /d "%BACKEND_DIR%"
"%PYTHON_EXE%" run.py
