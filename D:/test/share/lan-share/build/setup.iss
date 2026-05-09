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

; 许可协议（可选）
; LicenseFile=..\LICENSE.txt

; 安装界面设置
SetupWindowTitle=安装 - {#AppName}
WizardSmallImageFile=

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 主程序（PyInstaller 输出目录）
Source: "..\build\dist\LANShare\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; 启动脚本
Source: "..\build\start.bat"; DestDir: "{app}"; Flags: ignoreversion

; 文档
Source: "..\README.txt"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('..\README.txt')

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\{#AppExeName}"; IconIndex: 0
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\{#AppExeName}"; IconIndex: 0; Tasks: desktopicon

[Run]
Filename: "{app}\start.bat"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\storage"
Type: filesandordirs; Name: "{app}\__pycache__"
Type: dirifempty; Name: "{app}"

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
