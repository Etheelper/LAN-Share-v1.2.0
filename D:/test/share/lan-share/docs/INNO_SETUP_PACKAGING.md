# LAN Share - Inno Setup 封包配置文档

## 1. 概述

本文档详细说明 LAN Share 项目中 Inno Setup 安装脚本的配置和使用方法。通过 Inno Setup 可以将 PyInstaller 打包后的应用程序制作为标准的 Windows 安装程序，提供专业的安装体验。

### 1.1 现有配置位置

- 安装脚本：`build/setup.iss`
- 构建脚本：`build/build.bat`
- PyInstaller 配置：`build/LANShare.spec`

### 1.2 输出产物

执行打包后生成的安装包：`dist/LANShare_Setup_1.0.0.exe`

---

## 2. 脚本结构总览

```iss
; ============================================================
; LAN Share - Inno Setup 安装脚本
; 局域网资源共享系统 Windows 安装包
; ============================================================

#define AppName "LAN Share"
#define AppVersion "1.0.0"
#define AppPublisher "LAN Share"
#define AppURL "https://github.com/lan-share"
#define AppExeName "LANShare.exe"

[Setup]
; 基本配置区
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
; ... 安装行为配置

[Languages]
; 语言配置

[Tasks]
; 附加任务配置

[Files]
; 文件复制配置

[Icons]
; 快捷方式配置

[Run]
; 安装后执行配置

[UninstallDelete]
; 卸载清理配置

[Code]
; Pascal 代码逻辑
```

---

## 3. 核心配置详解

### 3.1 版本常量定义

```iss
#define AppName "LAN Share"
#define AppVersion "1.0.0"
#define AppPublisher "LAN Share"
#define AppURL "https://github.com/lan-share"
#define AppExeName "LANShare.exe"
```

| 常量 | 说明 | 建议值 |
|------|------|--------|
| `AppName` | 应用程序显示名称 | 应与快捷方式名称一致 |
| `AppVersion` | 版本号 | 遵循语义化版本，如 `1.0.0` |
| `AppPublisher` | 发布者名称 | 公司或个人名称 |
| `AppURL` | 应用程序官网 | 用于"关于"对话框链接 |
| `AppExeName` | 主程序文件名 | 与 PyInstaller 输出的一致 |

**版本号更新流程**：
1. 修改 `AppVersion` 常量值
2. `OutputBaseFilename` 会自动使用新版本号生成文件名

### 3.2 [Setup] 区段配置

```iss
[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=LANShare_Setup_{#AppVersion}
SetupIconFile=..\build\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#AppName}
```

| 配置项 | 说明 | 推荐值 |
|--------|------|--------|
| `AppId` | 唯一标识符 | 使用 `{%GUID}` 格式，每个产品应唯一 |
| `DefaultDirName` | 默认安装路径 | `{autopf}` = Program Files |
| `OutputDir` | 安装包输出目录 | 相对于 setup.iss 的路径 |
| `OutputBaseFilename` | 输出文件名 | 不含扩展名，ISS 自动添加 `.exe` |
| `SetupIconFile` | 安装程序图标 | `.ico` 格式，可选 |
| `Compression` | 压缩算法 | `lzma2/ultra64` 压缩率最高 |
| `SolidCompression` | 固态压缩 | `yes` 进一步提高压缩率 |
| `WizardStyle` | 向导风格 | `modern` 为现代扁平风格 |
| `ArchitecturesAllowed` | 支持的架构 | `x64compatible` = x64 和 ARM64 |
| `ArchitecturesInstallIn64BitMode` | 64位模式安装 | 与上保持一致 |
| `PrivilegesRequired` | 权限要求 | `admin` 需管理员权限 |
| `DisableProgramGroupPage` | 禁用自定义开始菜单 | `yes` 使用默认组 |

**AppId 生成方法**：
- 使用 Python：`python -c "import uuid; print(uuid.uuid4())"`
- 或在线工具：https://www.guidgenerator.com/

### 3.3 [Languages] 语言配置

```iss
[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
```

| 语言 | MessagesFile | 说明 |
|------|--------------|------|
| 简体中文 | `compiler:Languages\ChineseSimplified.isl` | 安装界面显示中文 |
| English | `compiler:Default.isl` | 默认英语 |

**添加其他语言**：
```iss
Name: "chinesetraditional"; MessagesFile: "compiler:Languages\ChineseTraditional.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"
```

Inno Setup 6 默认支持的语言列表位于安装目录的 `Languages` 文件夹中。

### 3.4 [Tasks] 附加任务

```iss
[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
```

| 参数 | 说明 |
|------|------|
| `Name` | 任务标识符 |
| `Description` | 显示给用户的描述，`{cm:...}` 为内置常量 |
| `GroupDescription` | 任务组描述 |
| `Flags: unchecked` | 默认不勾选 |

**常用内置常量**：
- `{cm:CreateDesktopIcon}` = "创建桌面快捷方式"
- `{cm:AdditionalIcons}` = "附加快捷方式"

### 3.5 [Files] 文件配置

```iss
[Files]
; 主程序（PyInstaller 输出目录）
Source: "..\build\dist\LANShare\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; 启动脚本
Source: "..\build\start.bat"; DestDir: "{app}"; Flags: ignoreversion

; 文档
Source: "..\README.txt"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('..\README.txt')
```

| 参数 | 说明 |
|------|------|
| `Source` | 源文件路径（相对于 setup.iss） |
| `DestDir` | 目标目录，`{app}` = 安装根目录 |
| `Flags` | 特殊标志 |
| `Check` | 条件函数，为 True 时才复制 |

**常用 Flags**：
| Flag | 说明 |
|------|------|
| `ignoreversion` | 不检查版本，覆盖已有文件 |
| `recursesubdirs` | 递归复制子目录 |
| `createallsubdirs` | 自动创建不存在的子目录 |
| `overwriteontouched` | 文件被修改时覆盖 |

### 3.6 [Icons] 快捷方式配置

```iss
[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\{#AppExeName}"; IconIndex: 0
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\{#AppExeName}"; IconIndex: 0; Tasks: desktopicon
```

| 路径常量 | 说明 |
|----------|------|
| `{group}` | 开始菜单程序组 |
| `{autodesktop}` | 桌面 |
| `{userappdata}` | 用户 AppData 目录 |
| `{commonappdata}` | 公共 AppData 目录 |

| 参数 | 说明 |
|------|------|
| `IconFilename` | 图标文件路径 |
| `IconIndex` | 图标索引（exe/dll 中有多图标时） |
| `Tasks` | 关联的任务，只有勾选才创建 |

### 3.7 [Run] 安装后运行

```iss
[Run]
Filename: "{app}\start.bat"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
```

| 参数 | 说明 |
|------|------|
| `Description` | 显示文本 |
| `Flags: nowait` | 不等待程序结束 |
| `Flags: postinstall` | 安装完成后运行 |
| `Flags: skipifsilent` | 静默安装时跳过 |

### 3.8 [UninstallDelete] 卸载清理

```iss
[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\storage"
Type: filesandordirs; Name: "{app}\__pycache__"
Type: dirifempty; Name: "{app}"
```

| Type | 说明 |
|------|------|
| `filesandordirs` | 删除指定文件或目录 |
| `dirifempty` | 仅当目录为空时删除 |

**注意**：数据目录的删除应谨慎，建议添加确认对话框避免用户误删。

---

## 4. [Code] 区段 - Pascal 脚本

```iss
[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir, StorageDir: string;
begin
  if CurStep = ssPostInstall then
  begin
    DataDir := ExpandConstant('{app}\data');
    StorageDir := ExpandConstant('{app}\storage\files');
    if not DirExists(DataDir) then
      ForceDirectories(DataDir);
    if not DirExists(StorageDir) then
      ForceDirectories(StorageDir);
  end;
end;
```

### 4.1 常用事件函数

| 函数 | 触发时机 |
|------|----------|
| `InitializeSetup()` | 安装程序初始化，返回 False 终止安装 |
| `InitializeWizard()` | 向导初始化完成 |
| `CurStepChanged(CurStep)` | 各步骤切换时 |
| `InitializeUninstall()` | 卸载程序初始化 |
| `CurUninstallStepChanged(CurUninstallStep)` | 卸载步骤切换时 |

### 4.2 CurStep 的值

| 值 | 说明 |
|----|------|
| `ssInstall` | 开始安装 |
| `ssPostInstall` | 安装完成，生成快捷方式前 |
| `ssDone` | 安装全部完成 |

### 4.3 常用 API

```pascal
// 目录操作
ForceDirectories(DirName);           // 创建目录（含父目录）
DirExists(DirName): Boolean;         // 检查目录是否存在
DeleteFile(FileName);                // 删除文件
DeleteDirectory(DirName, IncludeSubdirs); // 删除目录

// 字符串操作
ExpandConstant('{app}');              // 展开常量
ExtractFileName(FileName);           // 提取文件名
ExtractFileExt(FileName);            // 提取扩展名

// 注册表操作
RegWriteStringValue(RootKey, SubKey, ValueName, String);
RegQueryStringValue(RootKey, SubKey, ValueName, var Result: String);

// 用户交互
MsgBox('Message', mbInformation, MB_OK);
InputQuery('Title', 'Prompt', var Value: String);
```

### 4.4 扩展示例：安装前检查

```iss
[Code]
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  Result := True;

  // 检查 .NET Framework（如果需要）
  if not RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\.NETFramework\v4.0.30319') then
  begin
    if MsgBox('LAN Share 需要 .NET Framework 4.0 或更高版本。' + #13#10 +
              '是否继续安装？', mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;

  // 检查端口占用
  if PortInUse(8000) then
  begin
    if MsgBox('端口 8000 已被占用。' + #13#10 +
              '安装后可能无法正常启动。' + #13#10 +
              '是否继续安装？', mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;
end;

function PortInUse(Port: Integer): Boolean;
var
  TCPTable: Array of record
    LocalPort: DWord;
    State: DWord;
  end;
  Size, NumEntries: DWord;
  i: Integer;
begin
  Result := False;
  // 实际实现需要调用 Windows API GetExtendedTcpTable
end;
```

---

## 5. 高级配置

### 5.1 多版本共存

如果需要支持同一程序的多个版本并行安装：

```iss
[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
DisableProgramGroupPage=yes
AllowNoIcons=yes
```

### 5.2 自定义安装向导页面

```iss
[Code]
var
  CustomPage: TOutputMsgMemoWizardPage;

procedure InitializeWizard;
begin
  CustomPage := CreateOutputMsgMemoPage(wpWelcome,
    '许可证说明',
    '请仔细阅读以下许可协议',
    '本软件遵循 MIT 许可证...'#13#10#13#10 +
    '1. 免费使用'#13#10 +
    '2. 可用于商业目的'#13#10 +
    '3. 修改和分发');
end;
```

### 5.3 文件版本检测与更新

```iss
[Files]
; 仅当源文件更新时才覆盖
Source: "..\build\dist\LANShare\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion
```

### 5.4 组件选择安装

```iss
[Setup]
; 启用组件功能
ShowComponentSizes=yes

[Components]
Name: "main"; Description: "主程序"; Types: full compact custom; Flags: fixed
Name: "samples"; Description: "示例文件"; Types: full
Name: "docs"; Description: "文档"; Types: full

[Files]
Source: "..\build\dist\LANShare\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: main
Source: "..\samples\*"; DestDir: "{app}\samples"; Flags: ignoreversion recursesubdirs; Components: samples
```

---

## 6. 编译与执行

### 6.1 命令行编译

```bash
# 标准编译
iscc "D:\project\build\setup.iss"

# 指定输出目录
iscc /o "D:\output" "D:\project\build\setup.iss"

# 静默编译（无输出）
iscc /q "D:\project\build\setup.iss"

# 仅验证脚本（不生成输出）
iscc /d "D:\project\build\setup.iss"
```

### 6.2 一键打包脚本流程

`build.bat` 的完整流程：

```
1. 环境检查
   ├── 检查 Python 是否安装
   ├── 检查 Node.js 是否安装
   └── 检查/安装 PyInstaller

2. 前端构建
   ├── cd frontend
   ├── npm install
   └── npm run build

3. 复制前端文件
   └── xcopy frontend/dist backend/web

4. PyInstaller 打包
   ├── cd backend
   ├── pyinstaller --clean --noconfirm LANShare.spec
   └── xcopy backend/dist/LANShare build/dist/LANShare

5. Inno Setup 编译
   └── iscc build/setup.iss
```

### 6.3 调试技巧

```iss
[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  // 调试：写入日志
  if CurStep = ssInstall then
    MsgBox('开始安装步骤', mbInformation, MB_OK);
  if CurStep = ssPostInstall then
    MsgBox('安装完成', mbInformation, MB_OK);
end;
```

---

## 7. 常见问题

### 7.1 安装包图标不显示

**原因**：图标文件路径错误或格式不对

**解决**：
1. 确保 `SetupIconFile=..\build\icon.ico` 路径正确
2. 确保是 256x256 的 `.ico` 文件
3. 路径使用正斜杠 `/` 或双反斜杠 `\\`

### 7.2 卸载后数据未删除

**原因**：`UninstallDelete` 配置不完整

**解决**：检查 `DestDir` 路径是否与安装时一致

```iss
[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\storage"
```

### 7.3 快捷方式启动失败

**原因**：快捷方式指向的 `start.bat` 无法找到

**解决**：确保 `[Icons]` 中的路径正确，使用 `{app}` 相对路径

```iss
Name: "{group}\{#AppName}"; Filename: "{app}\start.bat"
```

### 7.4 权限不足导致安装失败

**原因**：`PrivilegesRequired=admin` 但用户非管理员

**解决**：
1. 右键选择"以管理员身份运行"
2. 或将 `PrivilegesRequired` 改为 `lowest`

### 7.5 安装包体积过大

**优化方法**：
1. 使用 `Compression=lzma2/ultra64` 和 `SolidCompression=yes`
2. 排除不必要的文件（如 `__pycache__`、`.pdb`）
3. 在 PyInstaller spec 中排除不必要模块

```python
excludes=[
    'tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy',
    'PIL', 'cv2', 'pytest', 'setuptools',
],
```

---

## 8. 安全考虑

### 8.1 签名安装包

```bash
# 使用 signtool 签名（需要代码签名证书）
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td SHA256 /fd SHA256 setup.exe
```

### 8.2 防止篡改

Inno Setup 不提供内置防篡改功能，建议：
1. 对安装包进行数字签名
2. 在应用程序中验证自身完整性
3. 使用加壳工具（如 Themida）保护 exe

### 8.3 敏感数据处理

如果安装包包含敏感配置：
1. 避免在安装脚本中硬编码密钥
2. 首次运行时生成随机密钥
3. 敏感数据存储在用户目录而非安装目录

---

## 9. 配置检查清单

发布安装包前，请确认以下配置：

- [ ] `AppVersion` 版本号已更新
- [ ] `AppId` 是唯一的 GUID
- [ ] `OutputBaseFilename` 包含版本号
- [ ] `SetupIconFile` 图标文件存在
- [ ] `[Languages]` 包含目标市场的语言
- [ ] `[Tasks]` 桌面快捷方式选项已配置
- [ ] `[Icons]` 路径使用正确的 `{app}` 变量
- [ ] `[UninstallDelete]` 清理规则完整
- [ ] `[Code]` 中的目录创建逻辑正确
- [ ] PyInstaller spec 中的 `datas` 包含所有必要文件
- [ ] 安装包已测试安装/卸载流程

---

## 10. 参考资源

- [Inno Setup 官方文档](https://jrsoftware.org/ishelp/)
- [Inno Setup 常见问题](https://jrsoftware.org/isfaq.php)
- [Inno Setup 脚本示例](https://jrsoftware.org/issamples.php)
- [Inno Setup 官方论坛](https://jrsoftware.org/discuss.php)
