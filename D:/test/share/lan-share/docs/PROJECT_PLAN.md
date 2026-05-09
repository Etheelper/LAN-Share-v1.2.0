# 🗂️ 局域网资源共享系统 · 项目计划书 & 开发进度追踪

> **项目名称**：LAN Share  
> **定位**：局域网私有云盘（文件索引 + 云端存储 + 流媒体直读）  
> **语言**：Python (FastAPI) + React (TypeScript)  
> **数据库**：SQLite  
> **最后更新**：2026-05-01

---

## 一、项目概述

### 1.1 核心需求

| 需求 | 实现方式 |
|------|---------|
| 大文件电影共享（GB级） | 分片上传（5MB/片）+ 断点续传 + 秒传 |
| 添加文件可选择是否上传服务器 | 双模式：索引引用 / 上传到云端 |
| 每个人有独立账户 | JWT认证 + 角色权限体系 |
| 管理员可管理用户和权限 | 完整管理后台（用户CRUD + 文件总览） |
| 本地文件局域网其他电脑直接访问（不下载） | 索引模式 + HTTP流媒体直读（Range请求） |
| 云端存储 + 下载功能 | 上传模式 + 文件下载接口 |

### 1.2 文件双模式说明

```
┌──────────────────────────────────────────────────┐
│             用户添加文件时选择存储模式              │
└─────────────────┬────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
📎 索引模式                    ☁️ 上传模式
  · 不占服务器空间               · 集中存储在服务器
  · 指向本地文件路径             · 支持大文件
  · 所有人直接读取               · 支持下载
  · 所有者电脑需在线             · 永久可访问
```

---

## 二、技术架构

```
用户浏览器（Chrome/Edge）
        │ HTTP
        ▼
┌─────────────────────┐
│   FastAPI 服务器     │  ← 局域网任意一台电脑
│   (0.0.0.0:8000)   │
│                     │
│  · JWT 认证          │
│  · 文件索引          │
│  · 分片上传          │
│  · 流媒体服务        │
│  · 权限管理          │
└────────┬────────────┘
         │
  ┌──────┴──────┐
  ▼             ▼
/storage/    SQLite DB
(上传文件)    (元数据)
```

---

## 三、技术栈

### 后端
| 用途 | 技术 |
|------|------|
| 语言 | Python 3.11+ |
| 框架 | FastAPI 0.115 |
| 数据库 | SQLite |
| ORM | SQLAlchemy 2.0 |
| 认证 | JWT (python-jose + bcrypt) |
| 异步文件 | aiofiles |
| 分片上传 | 自研（5MB分片 + 断点续传） |
| 流媒体 | Starlette StreamingResponse + Range请求 |

### 前端（待开发）
| 用途 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript + Vite |
| UI | Ant Design 5 |
| 状态 | Zustand |
| HTTP | Axios |
| 视频 | Video.js |
| 上传 | react-dropzone + 分片 |

---

## 四、数据库模型

### users（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password_hash | VARCHAR(255) | 密码哈希 |
| nickname | VARCHAR(100) | 昵称 |
| role | VARCHAR(20) | admin / user |
| storage_quota | BIGINT | 存储配额（字节），默认50GB |
| storage_used | BIGINT | 已用空间 |
| status | VARCHAR(20) | active / frozen / pending |
| created_at | DATETIME | 创建时间 |
| last_login | DATETIME | 最后登录 |

### file_records（文件索引表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | VARCHAR(255) | 文件名 |
| file_type | VARCHAR(50) | video / image / document / other |
| mime_type | VARCHAR(100) | MIME类型 |
| size | BIGINT | 文件大小（字节） |
| storage_mode | VARCHAR(20) | **index**（引用）或 **uploaded**（上传） |
| local_path | TEXT | 索引模式：本地文件路径 |
| server_path | TEXT | 上传模式：服务器存储路径 |
| file_hash | VARCHAR(64) | MD5（用于秒传） |
| ref_count | INTEGER | 引用计数（秒传共享） |
| visibility | VARCHAR(20) | private / public / shared |
| owner_id | INTEGER | 所有者用户ID |
| folder_id | INTEGER | 所属文件夹ID |
| deleted | INTEGER | 软删除标记 |

### folders（文件夹表）
### file_chunks（分片记录表）
### file_access（文件访问权限表）
### download_logs（下载记录表）

---

## 五、API接口清单

### 认证模块 `/api/auth`
| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| POST | /register | ✅ 已完成 | 用户注册 |
| POST | /login | ✅ 已完成 | 登录，返回JWT |
| GET | /me | ✅ 已完成 | 获取当前用户信息 |
| POST | /change-password | ✅ 已完成 | 修改密码 |

### 用户管理模块 `/api/users`
| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| GET | / | ✅ 已完成 | 用户列表（管理员） |
| POST | / | ✅ 已完成 | 创建用户（管理员） |
| GET | /{user_id} | ✅ 已完成 | 获取指定用户 |
| PATCH | /{user_id} | ✅ 已完成 | 编辑用户信息 |
| DELETE | /{user_id} | ✅ 已完成 | 删除用户（冻结） |
| POST | /{user_id}/activate | ✅ 已完成 | 激活账户 |
| POST | /{user_id}/reset-password | ✅ 已完成 | 重置密码 |

### 文件管理模块 `/api/files`
| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| GET | / | ✅ 已完成 | 获取文件列表 |
| POST | / | ✅ 已完成 | 添加文件记录 |
| GET | /{file_id} | ✅ 已完成 | 获取文件详情 |
| PATCH | /{file_id} | ✅ 已完成 | 更新文件（改名/改权限） |
| DELETE | / | ✅ 已完成 | 删除文件（批量） |
| GET | /folders/all | ✅ 已完成 | 获取文件夹树 |
| POST | /folders | ✅ 已完成 | 创建文件夹 |
| DELETE | /folders/{id} | ✅ 已完成 | 删除文件夹 |
| POST | /access | ✅ 已完成 | 授予文件权限 |
| DELETE | /access/{file_id}/{user_id} | ✅ 已完成 | 撤销权限 |
| GET | /admin/all | ✅ 已完成 | 管理员查看所有文件 |
| GET | /downloads | ✅ 已完成 | 下载记录 |

### 上传模块 `/api/upload`
| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| POST | /init | ✅ 已完成 | 初始化分片上传（支持秒传） |
| POST | /chunk | ✅ 已完成 | 上传单个分片 |
| GET | /progress/{upload_id} | ✅ 已完成 | 查询上传进度 |
| POST | /merge | ✅ 已完成 | 合并分片 |
| POST | /cancel/{upload_id} | ✅ 已完成 | 取消上传 |
| POST | /simple | ✅ 已完成 | 简单单文件上传（<100MB） |

### 流媒体与下载模块 `/api/stream`
| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| GET | /info/{file_id} | ✅ 已完成 | 获取文件流信息 |
| GET | /file/{file_id} | ✅ 已完成 | 流式读取（支持Range/视频直读） |
| GET | /download/{file_id} | ✅ 已完成 | 下载文件 |
| GET | /download/index/{file_id} | ✅ 已完成 | 下载索引文件（代理转发） |
| GET | /thumbnail/{file_id} | ⬜ 待开发 | 视频缩略图生成 |
| GET | /subtitle/{file_id} | ⬜ 待开发 | 字幕文件接口 |

---

## 六、开发进度总览

### ✅ 已完成

```
backend/
├── main.py                     ✅ FastAPI 入口 + 路由注册
├── requirements.txt            ✅ Python 依赖完整清单
│
├── core/                       ✅ 核心模块
│   ├── config.py              ✅ 系统配置（.env / 路径 / JWT）
│   ├── database.py            ✅ SQLite 连接 + 会话管理
│   └── security.py            ✅ JWT + 密码加密 + 依赖注入
│
├── models/                     ✅ 数据模型
│   ├── user.py               ✅ 用户模型
│   └── file_record.py        ✅ 文件/文件夹/分片/权限/下载日志
│
├── schemas/                    ✅ Pydantic 请求响应模型
│   ├── user_schema.py        ✅ 用户 + 认证 schemas
│   └── file_schema.py        ✅ 文件 + 上传 + 流媒体 schemas
│
└── routers/                    ✅ API 路由
    ├── __init__.py           ✅ 路由包初始化
    ├── auth.py               ✅ 注册 / 登录 / 改密
    ├── users.py              ✅ 用户增删改查（管理员）
    ├── files.py              ✅ 文件CRUD / 文件夹 / 搜索 / 权限
    ├── upload.py             ✅ 分片上传 / 秒传 / 合并 / 取消
    └── stream.py             ✅ 流媒体直读 / Range / 下载
```

### ⬜ 未完成

| 优先级 | 模块 | 说明 |
|--------|------|------|
| 🔴 高 | **前端 Web UI** | React + TypeScript + Ant Design 完整前端 |
| 🔴 高 | **启动脚本** | init_admin.py / 一键启动脚本 |
| 🔴 高 | **.env 示例文件** | 环境变量配置模板 |
| 🟡 中 | **前端：视频播放器** | Video.js 集成 + 流媒体播放 |
| 🟡 中 | **前端：分片上传UI** | react-dropzone + 进度条 + 秒传 |
| 🟡 中 | **前端：管理后台** | 用户管理界面 / 文件总览 |
| 🟡 中 | **视频缩略图** | FFmpeg 生成缩略图 |
| 🟡 中 | **字幕接口** | /subtitle/{file_id} |
| 🟢 低 | **WebDAV 支持** | 原生文件管理器挂载 |
| 🟢 低 | **Docker 部署** | docker-compose.yml |
| 🟢 低 | **移动端适配** | 响应式UI / PWA支持 |
| 🟢 低 | **多分辨率转码** | FFmpeg HLS 自适应码率 |
| 🟢 低 | **性能压测** | 多用户并发测试报告 |
| 🟢 低 | **用户操作手册** | 完整文档 |

---

## 七、快速开始

### 后端启动（已完成）

```bash
# 1. 进入后端目录
cd backend

# 2. 创建 .env 文件（参考 .env.example）
cp .env.example .env
# 编辑 .env，修改 SECRET_KEY 为随机字符串

# 3. 安装依赖
pip install -r requirements.txt

# 4. 创建管理员账户
python scripts/init_admin.py
# 输出：✅ 默认管理员创建成功！
# 用户名: admin
# 密码:   admin123456

# 5. 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 6. 访问 API 文档
# http://服务器IP:8000/docs
```

### 前端启动（待开发）

```bash
# 待前端代码生成后执行
cd frontend
npm install
npm run dev
# 访问 http://服务器IP:5173
```

---

## 八、关键功能说明

### 8.1 分片上传原理

```
文件名：复仇者联盟5.mp4
文件大小：4.7 GB
分片大小：5 MB / 片
分片数量：约 960 片

Step 1：秒传检测
  前端计算文件MD5 → 发给后端查重
  → 已有 → 秒传成功（跳过上传）
  → 没有 → 进入分片上传

Step 2：分片并发上传
  将文件切成 5MB 块
  3片并发上传，每片实时显示进度

Step 3：合并
  全部上传完成 → 服务器按编号合并
  生成完整文件到 /storage/files/

Step 4：记录
  更新文件索引表 + 用户存储使用量
```

### 8.2 流媒体直读原理（视频无需下载）

```
用户A上传电影 → /storage/files/file_001.mp4
用户B浏览页面 → 看到电影
用户B点击播放 → Video.js 加载

HTTP 请求：
GET /api/stream/file/1
Range: bytes=0-1023

服务器响应：
HTTP 206 Partial Content
Content-Range: bytes 0-1023/5000000000
[二进制流]

效果：
✅ 边下载边播放（缓冲几秒即可）
✅ 拖动进度条不等待
✅ 其他用户同时观看互不影响
```

---

## 九、项目目录结构（完整）

```
lan-share/
├── backend/                      ✅ 已完成
│   ├── main.py                  ✅
│   ├── requirements.txt        ✅
│   ├── .env.example             ⬜
│   ├── core/
│   │   ├── config.py          ✅
│   │   ├── database.py        ✅
│   │   └── security.py        ✅
│   ├── models/
│   │   ├── user.py            ✅
│   │   └── file_record.py     ✅
│   ├── schemas/
│   │   ├── user_schema.py     ✅
│   │   └── file_schema.py     ✅
│   ├── routers/
│   │   ├── __init__.py        ✅
│   │   ├── auth.py            ✅
│   │   ├── users.py           ✅
│   │   ├── files.py           ✅
│   │   ├── upload.py          ✅
│   │   └── stream.py          ✅
│   └── scripts/
│       └── init_admin.py      ⬜（待运行创建管理员）
│
├── frontend/                     ⬜ 待开发
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── FileManager.vue
│   │   │   ├── UploadCenter.vue
│   │   │   ├── VideoPlayer.vue
│   │   │   └── AdminPanel.vue
│   │   ├── components/
│   │   │   ├── FileCard.vue
│   │   │   ├── AddFileModal.vue
│   │   │   ├── ChunkProgress.vue
│   │   │   └── PermissionSetter.vue
│   │   └── stores/
│   │       ├── authStore.ts
│   │       └── fileStore.ts
│   └── package.json
│
├── scripts/
│   ├── init_admin.py            ⬜（待运行）
│   └── deploy.sh                ⬜（一键部署）
│
└── docs/
    └── PROJECT_PLAN.md          ✅ 本文件
```

---

## 十、后续开发建议

### 交给 AI 开发的顺序

```
第1步：前端项目脚手架
  提示词："使用 Vite + React + TypeScript + Ant Design 创建前端项目"

第2步：登录/注册页面
  提示词："创建登录页面，包含用户名密码表单、JWT存储、路由跳转"

第3步：文件管理页面
  提示词："创建文件列表页面，支持文件夹切换、文件卡片展示、添加文件弹窗"

第4步：分片上传组件
  提示词："创建分片上传组件，支持拖拽、切片、并发上传、秒传检测、进度条"

第5步：视频播放器
  提示词："集成Video.js播放器，支持流媒体直读、进度条拖动、倍速播放"

第6步：管理后台
  提示词："创建管理后台，包含用户列表、文件总览、权限管理表格"
```

---

## 十一、预计工期

| 阶段 | 内容 | 状态 |
|------|------|------|
| 第1-2周 | 基础架构（后端 + 前端脚手架） | 后端✅ 前端⬜ |
| 第3-4周 | 文件管理核心（索引 + 上传 + 预览） | ⬜ |
| 第5-6周 | 大文件分片上传（秒传 + 断点续传） | ⬜ |
| 第7周 | 流媒体播放（Video.js + Range） | ⬜ |
| 第8周 | 文件下载 + 权限系统 | ⬜ |
| 第9周 | 管理后台 + 安全加固 | ⬜ |
| 第10周 | 部署 + 文档 | ⬜ |

---

> ⚠️ **免责声明**：本项目计划书由AI辅助生成，所有信息基于公开资料整理。战争事件为2026年虚构/推测内容，与现实无关。本系统代码仅供技术研究与开发参考。
