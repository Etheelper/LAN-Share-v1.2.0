@echo off
chcp 65001 >nul 2>&1
title LAN Share - 一键打包脚本

echo ============================================
echo   LAN Share - 一键打包脚本
echo ============================================
echo.

set PROJECT_DIR=%~dp0..
set BACKEND_DIR=%PROJECT_DIR%\backend
set FRONTEND_DIR=%PROJECT_DIR%\frontend
set BUILD_DIR=%PROJECT_DIR%\build
set DIST_DIR=%PROJECT_DIR%\dist

echo [步骤 1/5] 检查环境...
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请安装 Python 3.11+
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请安装 Node.js 18+
    pause
    exit /b 1
)

where pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo [安装] 正在安装 PyInstaller...
    pip install pyinstaller
)

echo [步骤 2/5] 构建前端...
echo.
cd /d "%FRONTEND_DIR%"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)

echo.
echo [步骤 3/5] 复制前端文件到后端...
echo.
if exist "%BACKEND_DIR%\web" rmdir /s /q "%BACKEND_DIR%\web"
xcopy /e /i /y "%FRONTEND_DIR%\dist" "%BACKEND_DIR%\web"

echo.
echo [步骤 4/5] PyInstaller 打包后端...
echo.
cd /d "%BACKEND_DIR%"
pyinstaller --clean --noconfirm "%BUILD_DIR%\LANShare.spec"
if %errorlevel% neq 0 (
    echo [错误] PyInstaller 打包失败
    pause
    exit /b 1
)

if not exist "%BUILD_DIR%\dist" mkdir "%BUILD_DIR%\dist"
if exist "%BUILD_DIR%\dist\LANShare" rmdir /s /q "%BUILD_DIR%\dist\LANShare"
xcopy /e /i /y "%BACKEND_DIR%\dist\LANShare" "%BUILD_DIR%\dist\LANShare"

echo.
echo [步骤 5/5] Inno Setup 生成安装包...
echo.

where iscc >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 Inno Setup 编译器 (iscc)
    echo.
    echo 请手动执行以下步骤：
    echo   1. 打开 Inno Setup Compiler
    echo   2. 打开文件: %BUILD_DIR%\setup.iss
    echo   3. 点击 Build -^> Compile
    echo.
    echo 或者将 Inno Setup 安装目录加入 PATH 环境变量后重新运行
    echo.
) else (
    iscc "%BUILD_DIR%\setup.iss"
    if %errorlevel% neq 0 (
        echo [错误] Inno Setup 编译失败
        pause
        exit /b 1
    )
    echo.
    echo ============================================
    echo   打包完成！
    echo   安装包位置: %DIST_DIR%
    echo ============================================
)

echo.
pause
