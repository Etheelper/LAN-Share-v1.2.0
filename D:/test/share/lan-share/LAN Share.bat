@echo off
chcp 65001 >nul
title LAN Share 启动器

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%.."

:: 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel%==0 (
    echo 检测到系统 Python，正在启动服务...
    cd /d "%APP_DIR%\backend"
    python run.py
    goto :end
)

:: 检查便携版 Python
if exist "%APP_DIR%\python\python.exe" (
    echo 检测到便携版 Python，正在启动服务...
    cd /d "%APP_DIR%\backend"
    "%APP_DIR%\python\python.exe" run.py
    goto :end
)

:: 没有 Python，提示用户
echo.
echo ════════════════════════════════════════════════════════════
echo                     LAN Share 启动器
echo ════════════════════════════════════════════════════════════
echo.
echo 错误：未找到 Python 环境！
echo.
echo 请选择以下方式之一：
echo.
echo   方式一：安装 Python（推荐）
echo   1. 下载 Python 3.11+：https://www.python.org/downloads/
echo   2. 安装时勾选 "Add Python to PATH"
echo   3. 重新运行此脚本
echo.
echo   方式二：下载便携版 Python
echo   1. 下载 Python Embeddable Package：
echo      https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
echo   2. 解压到当前目录下的 "python" 文件夹
echo   3. 重新运行此脚本
echo.
echo ════════════════════════════════════════════════════════════
pause >nul

:end
if defined APP_DIR (
    cd /d "%APP_DIR%"
)
