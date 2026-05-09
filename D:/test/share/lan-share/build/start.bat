@echo off
chcp 65001 >nul 2>&1
title LAN Share - 局域网资源共享系统

echo ============================================
echo   LAN Share - 局域网资源共享系统
echo ============================================
echo.

set APP_DIR=%~dp0
set DATA_DIR=%APP_DIR%data
set STORAGE_DIR=%APP_DIR%storage

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%STORAGE_DIR%\files" mkdir "%STORAGE_DIR%\files"
if not exist "%STORAGE_DIR%\chunks" mkdir "%STORAGE_DIR%\chunks"

echo [1/3] 正在启动服务器...
echo.
echo   访问地址: http://localhost:8000
echo   局域网访问: http://你的IP:8000
echo.
echo   默认管理员: admin / admin123456
echo   (请登录后立即修改密码)
echo.
echo [2/3] 正在打开浏览器...
start http://localhost:8000

echo [3/3] 服务器运行中，关闭此窗口将停止服务
echo.

"%APP_DIR%LANShare.exe"
