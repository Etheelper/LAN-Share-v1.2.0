@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ══════════════════════════════════════════════════
echo   LAN Share 一键打包脚本
echo ══════════════════════════════════════════════════
echo.

cd /d "%~dp0.."

set "ROOT_DIR=%cd%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "INSTALLER_DIR=%ROOT_DIR%\installer"
set "OUTPUT_DIR=%ROOT_DIR%\output"
set "PYTHON_EMBED_DIR=%INSTALLER_DIR%\python-embed"

echo [步骤 1/6] 检查 Python 嵌入式包...
if not exist "%INSTALLER_DIR%\python-embed" (
    if exist "%ROOT_DIR%\python-3.11.9-embed-amd64.zip" (
        echo 正在解压 Python 嵌入式包...
        powershell -Command "Expand-Archive -Path '%ROOT_DIR%\python-3.11.9-embed-amd64.zip' -DestinationPath '%INSTALLER_DIR%\python-embed' -Force"
    ) else if exist "%INSTALLER_DIR%\python-3.11.9-embed-amd64.zip" (
        echo 正在解压 Python 嵌入式包...
        powershell -Command "Expand-Archive -Path '%INSTALLER_DIR%\python-3.11.9-embed-amd64.zip' -DestinationPath '%INSTALLER_DIR%\python-embed' -Force"
    ) else (
        echo 错误: 找不到 Python 嵌入式包!
        echo 请下载: https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
        echo 放到: %INSTALLER_DIR%\
        pause
        exit /b 1
    )
)

if not exist "%PYTHON_EMBED_DIR%\python.exe" (
    echo 错误: python-embed 目录中没有 python.exe
    pause
    exit /b 1
)
echo Python 嵌入式包: OK

echo.
echo [步骤 2/6] 配置 Python 嵌入式包...
set "PYINI=%PYTHON_EMBED_DIR%\python311._pth"
if exist "%PYINI%" (
    powershell -Command "(Get-Content '%PYINI%') -replace '#import site','import site' | Set-Content '%PYINI%'"
    echo 已启用 import site
)

if not exist "%PYTHON_EMBED_DIR%\Scripts" mkdir "%PYTHON_EMBED_DIR%\Scripts"

echo.
echo [步骤 3/6] 安装 Python 依赖到嵌入式包...
"%PYTHON_EMBED_DIR%\python.exe" -m pip install --upgrade pip --no-warn-script-location 2>nul
if %ERRORLEVEL% neq 0 (
    echo 首次安装 pip...
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%PYTHON_EMBED_DIR%\get-pip.py'"
    "%PYTHON_EMBED_DIR%\python.exe" "%PYTHON_EMBED_DIR%\get-pip.py" --no-warn-script-location
    del "%PYTHON_EMBED_DIR%\get-pip.py" 2>nul
)

echo 安装后端依赖...
"%PYTHON_EMBED_DIR%\python.exe" -m pip install -r "%BACKEND_DIR%\requirements.txt" --no-warn-script-location
if %ERRORLEVEL% neq 0 (
    echo 依赖安装失败!
    pause
    exit /b 1
)
echo 依赖安装: OK

echo.
echo [步骤 4/6] 检查前端构建...
if not exist "%BACKEND_DIR%\web\index.html" (
    if exist "%FRONTEND_DIR%\dist\index.html" (
        echo 复制前端构建文件到 backend/web...
        xcopy "%FRONTEND_DIR%\dist\*" "%BACKEND_DIR%\web\" /E /Y /Q
    ) else (
        echo 警告: 前端未构建，将使用 API 模式
    )
)
echo 前端文件: OK

echo.
echo [步骤 5/6] 创建启动器 EXE...
if not exist "%INSTALLER_DIR%\dist" mkdir "%INSTALLER_DIR%\dist"

powershell -Command "Add-Type -OutputAssembly '%INSTALLER_DIR%\dist\LAN-Share.exe' -OutputType ConsoleApplication -TypeDefinition 'using System;using System.Diagnostics;using System.IO;class Program{static void Main(){string appDir=Path.GetDirectoryName(System.Reflection.Assembly.GetEntryAssembly().Location);string python=Path.Combine(appDir,\"python\",\"python.exe\");string run=Path.Combine(appDir,\"backend\",\"run.py\");if(!File.Exists(python)){Console.WriteLine(\"错误: 找不到 Python: \"+python);Console.ReadLine();return;}if(!File.Exists(run)){Console.WriteLine(\"错误: 找不到启动脚本: \"+run);Console.ReadLine();return;}var psi=new ProcessStartInfo();psi.FileName=python;psi.Arguments=\"\"\"\"+run+\"\"\"\";psi.WorkingDirectory=Path.GetDirectoryName(run);psi.UseShellExecute=false;var p=Process.Start(psi);if(p!=null){Console.WriteLine(\"LAN Share 已启动 - http://localhost:8000\");Console.WriteLine(\"按 Ctrl+C 停止服务\");p.WaitForExit();}}}'" 2>nul

if not exist "%INSTALLER_DIR%\dist\LAN-Share.exe" (
    echo 启动器 EXE 创建失败，将使用 BAT 启动
)

echo.
echo [步骤 6/6] 准备完成!
echo.
echo ══════════════════════════════════════════════════
echo   所有文件已准备就绪
echo ══════════════════════════════════════════════════
echo.
echo 下一步: 使用 Inno Setup 编译安装脚本
echo   脚本位置: %INSTALLER_DIR%\LAN-Share-Full.iss
echo   输出位置: %OUTPUT_DIR%\
echo.
echo 或者直接运行程序测试:
echo   %PYTHON_EMBED_DIR%\python.exe %BACKEND_DIR%\run.py
echo.
pause
