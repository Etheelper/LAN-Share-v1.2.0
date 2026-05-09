LAN Share - 打包部署说明
============================

一、整体架构
------------

LAN Share 是一个 B/S 架构的局域网资源共享系统：

  浏览器 (HTML/JS/CSS)
       ↓ HTTP
  FastAPI 服务器 (Python, 打包为 LANShare.exe)
       ↓
  SQLite 数据库 + 本地文件存储

打包思路：将 Python 后端用 PyInstaller 打包为 exe，
前端 HTML 文件嵌入到 exe 同目录的 web/ 文件夹中，
最后用 Inno Setup 制作 Windows 安装程序。


二、打包前准备
--------------

1. 安装 Python 3.11+ (必须)
   下载: https://www.python.org/downloads/
   安装时勾选 "Add to PATH"

2. 安装 Node.js 18+ (构建前端用)
   下载: https://nodejs.org/

3. 安装 PyInstaller
   命令: pip install pyinstaller

4. 安装 Inno Setup 6
   下载: https://jrsoftware.org/isdl.php
   安装后将安装目录加入系统 PATH
   默认路径: C:\Program Files (x86)\Inno Setup 6


三、一键打包
------------

直接运行:

  cd build
  build.bat

脚本会自动执行:
  1. 检查环境
  2. 构建前端 (npm install + npm run build)
  3. 复制前端 dist 到 backend/web/
  4. PyInstaller 打包后端为 LANShare.exe
  5. Inno Setup 生成安装包

最终安装包输出到: dist/LANShare_Setup_1.0.0.exe


四、手动打包步骤
----------------

如果一键脚本不工作，可手动执行:

步骤1: 构建前端
  cd frontend
  npm install
  npm run build

步骤2: 复制前端到后端
  将 frontend/dist/ 目录下所有文件
  复制到 backend/web/ 目录

步骤3: 安装后端依赖
  cd backend
  pip install -r requirements.txt
  pip install pyinstaller

步骤4: PyInstaller 打包
  cd backend
  pyinstaller --clean --noconfirm ..\build\LANShare.spec

  输出目录: backend/dist/LANShare/

步骤5: Inno Setup 编译
  打开 Inno Setup Compiler
  打开 build/setup.iss
  点击 Build -> Compile

  或命令行:
  iscc build\setup.iss


五、文件结构说明
----------------

打包后的安装目录结构:

  LAN Share/
  ├── LANShare.exe          主程序 (Python + FastAPI)
  ├── start.bat             启动脚本 (打开浏览器)
  ├── .env                  环境配置
  ├── web/                  前端静态文件
  │   ├── index.html
  │   ├── favicon.svg
  │   └── assets/
  │       ├── index-xxx.js
  │       └── index-xxx.css
  ├── data/                 数据库目录 (运行时创建)
  │   └── lanshare.db
  ├── storage/              文件存储 (运行时创建)
  │   ├── files/
  │   └── chunks/
  └── _internal/            PyInstaller 运行时依赖


六、运行方式
------------

安装后，用户有两种启动方式:

方式1: 双击桌面快捷方式或开始菜单快捷方式
  → 调用 start.bat → 启动 LANShare.exe → 自动打开浏览器

方式2: 直接运行 LANShare.exe
  → 启动服务器，需手动访问 http://localhost:8000

首次运行:
  1. 程序自动创建数据库和管理员账户
  2. 默认管理员: admin / admin123456
  3. 请登录后立即修改密码


七、关键配置文件
----------------

.env 文件说明:

  SECRET_KEY     JWT密钥 (生产环境务必修改为随机字符串)
  HOST           监听地址 (0.0.0.0 = 所有网卡)
  PORT           端口号 (默认8000)
  UPLOAD_DIR     上传文件存储路径
  CHUNK_DIR      分片临时目录
  DEBUG          调试模式 (生产环境设为false)


八、Inno Setup 自定义
---------------------

修改 build/setup.iss 中的以下内容:

  AppVersion      版本号
  AppPublisher    发布者名称
  SetupIconFile   安装包图标 (需要 .ico 格式)
  OutputBaseFilename  输出文件名

添加图标:
  1. 准备一个 .ico 文件放到 build/icon.ico
  2. setup.iss 中 SetupIconFile 已配置为 build/icon.ico


九、常见问题
------------

Q: PyInstaller 打包后运行报错找不到模块?
A: 在 LANShare.spec 的 hiddenimports 中添加缺失的模块名

Q: 前端页面空白?
A: 确认 backend/web/ 目录存在且包含 index.html

Q: 安装后无法启动?
A: 右键 start.bat -> 以管理员身份运行

Q: 局域网其他电脑无法访问?
A: 检查 Windows 防火墙，放行 8000 端口

Q: 如何修改端口?
A: 编辑安装目录下的 .env 文件，修改 PORT 值


十、版本更新流程
----------------

1. 修改代码
2. 更新 build/setup.iss 中的 AppVersion
3. 运行 build.bat 重新打包
4. 分发新的安装包
5. 用户覆盖安装即可 (数据库和文件不受影响)
