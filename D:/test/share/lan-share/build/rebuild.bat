@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ======================================
echo LAN Share - 完整打包脚本
echo ======================================
echo.

cd /d "%~dp0"

if not exist "python-3.11.9-embed-amd64.zip" (
    echo 错误: 找不到 python-3.11.9-embed-amd64.zip
    echo 请下载 Python 3.11.9 Embeddable Package:
    echo https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
    echo.
    pause
    exit /b 1
)

echo [1/5] 检查 Python 环境...
if not exist "python-embed" (
    echo 解压 Python Embeddable...
    powershell -Command "Expand-Archive -Path 'python-3.11.9-embed-amd64.zip' -DestinationPath 'python-embed' -Force"
)

if exist "python-embed\python.exe" (
    set PYTHON=python-embed\python.exe
) else (
    set PYTHON=python
)

echo [2/5] 检查依赖包...
if not exist "python-embed\Scripts" (
    mkdir "python-embed\Scripts"
)

echo [3/5] 安装依赖...
%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install pyinstaller

echo [4/5] 运行 PyInstaller...
cd backend
..\%PYTHON% -m PyInstaller LAN-Share-Backend.spec --clean --noconfirm
cd ..

if %ERRORLEVEL% neq 0 (
    echo PyInstaller 构建失败!
    pause
    exit /b 1
)

echo [5/5] 复制输出文件...
if not exist "installer\dist" mkdir "installer\dist"
copy "backend\dist\LAN-Share-Backend\LAN-Share-Backend.exe" "installer\dist\LAN-Share-Backend.exe"

if not exist "output" mkdir "output"

echo.
echo ======================================
echo 打包完成!
echo ======================================
echo.
echo 输出文件:
echo - backend\dist\LAN-Share-Backend\LAN-Share-Backend.exe
echo - installer\dist\LAN-Share-Backend.exe
echo.
echo 下一步:
echo 1. 使用 Inno Setup 编译 installer\LAN-Share.iss
echo 2. 生成的安装包将在 output 目录
echo.
pause
