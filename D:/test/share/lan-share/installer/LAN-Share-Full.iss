; LAN Share - 完整安装包脚本
; 包含 Python 嵌入式包 + 后端源码 + 前端 + 防火墙规则
; 索引模式需要后端源码文件

#define MyAppName "LAN Share"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "LAN Share"
#define MyAppURL "https://github.com/lan-share"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\output
OutputBaseFilename=LAN-Share-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
UninstallDisplayIcon={app}\LAN-Share.exe
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Setup
VersionInfoTextVersion={#MyAppVersion}

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "开机自动启动"; GroupDescription: "服务选项:"; Flags: unchecked
Name: "firewall"; Description: "添加防火墙规则（允许局域网访问）"; GroupDescription: "网络设置:"; Flags: checkedonce

[Files]
Source: "python-embed\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\backend\main.py"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\run.py"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\.env"; DestDir: "{app}\backend"; Flags: ignoreversion onlyifdoesntexist
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\requirements.txt"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\core\*.py"; DestDir: "{app}\backend\core"; Flags: ignoreversion
Source: "..\backend\models\*.py"; DestDir: "{app}\backend\models"; Flags: ignoreversion
Source: "..\backend\routers\*.py"; DestDir: "{app}\backend\routers"; Flags: ignoreversion
Source: "..\backend\schemas\*.py"; DestDir: "{app}\backend\schemas"; Flags: ignoreversion
Source: "..\backend\scripts\*.py"; DestDir: "{app}\backend\scripts"; Flags: ignoreversion
Source: "..\backend\web\*"; DestDir: "{app}\backend\web"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\启动 LAN Share.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\LAN-Share.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\启动 LAN Share.bat"; WorkingDir: "{app}"; IconFilename: "{app}\LAN-Share.exe"; IconIndex: 0
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\启动 LAN Share.bat"; Tasks: desktopicon; WorkingDir: "{app}"; IconFilename: "{app}\LAN-Share.exe"; IconIndex: 0

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\启动 LAN Share.bat"""; Flags: uninsdeletevalue; Tasks: startupicon

[Run]
Filename: "{app}\启动 LAN Share.bat"; Description: "启动 {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\backend\storage"
Type: filesandordirs; Name: "{app}\backend\__pycache__"
Type: filesandordirs; Name: "{app}\backend\core\__pycache__"
Type: filesandordirs; Name: "{app}\backend\models\__pycache__"
Type: filesandordirs; Name: "{app}\backend\routers\__pycache__"
Type: filesandordirs; Name: "{app}\backend\schemas\__pycache__"

[Code]
function InitializeSetup(): Boolean;
var
  PythonSrcPath: String;
begin
  Result := True;
  PythonSrcPath := ExpandConstant('{src}\python-embed');

  if not DirExists(PythonSrcPath) then
  begin
    MsgBox(
      '未找到 Python 嵌入式包！' + #13#10 + #13#10 +
      '请将 Python 3.11 嵌入式包解压到：' + #13#10 +
      PythonSrcPath + '\' + #13#10 + #13#10 +
      '下载地址：' + #13#10 +
      'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' + #13#10 + #13#10 +
      '解压后应包含 python.exe 等文件',
      mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  AppPath: String;
  PythonExe: String;
  PipPath: String;
  EnvFile: String;
begin
  if CurStep = ssPostInstall then
  begin
    AppPath := ExpandConstant('{app}');
    PythonExe := AppPath + '\python\python.exe';
    PipPath := AppPath + '\python\Scripts\pip.exe';

    CreateDir(AppPath + '\data');
    CreateDir(AppPath + '\backend\storage');
    CreateDir(AppPath + '\backend\storage\files');
    CreateDir(AppPath + '\backend\storage\chunks');

    EnvFile := AppPath + '\backend\.env';
    if not FileExists(EnvFile) then
    begin
      if FileExists(AppPath + '\backend\.env.example') then
        FileCopy(AppPath + '\backend\.env.example', EnvFile, False);
    end;

    if WizardIsTaskSelected('firewall') then
    begin
      Exec('netsh', 'advfirewall firewall delete rule name="LAN Share Backend"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('netsh', 'advfirewall firewall add rule name="LAN Share Backend" dir=in action=allow program="' + AppPath + '\python\python.exe" enable=yes profile=private', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('netsh', 'advfirewall firewall add rule name="LAN Share Backend (Public)" dir=in action=allow program="' + AppPath + '\python\python.exe" enable=yes profile=public', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('netsh', 'advfirewall firewall add rule name="LAN Share Port 8000" dir=in action=allow protocol=TCP localport=8000 profile=private', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('netsh', 'advfirewall firewall add rule name="LAN Share Port 8000 (Public)" dir=in action=allow protocol=TCP localport=8000 profile=public', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;

    if FileExists(PythonExe) then
    begin
      Exec(PythonExe, '-m pip install --upgrade pip --no-warn-script-location', AppPath + '\python', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec(PythonExe, '-m pip install -r "' + AppPath + '\backend\requirements.txt" --no-warn-script-location', AppPath + '\python', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    Exec('netsh', 'advfirewall firewall delete rule name="LAN Share Backend"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('netsh', 'advfirewall firewall delete rule name="LAN Share Backend (Public)"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('netsh', 'advfirewall firewall delete rule name="LAN Share Port 8000"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('netsh', 'advfirewall firewall delete rule name="LAN Share Port 8000 (Public)"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
