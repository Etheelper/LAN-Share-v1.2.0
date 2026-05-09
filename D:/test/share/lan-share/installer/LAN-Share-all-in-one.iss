; LAN Share - Inno Setup Script
; 完整打包 LAN Share 局域网资源共享系统

#define MyAppName "LAN Share"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "LAN Share"
#define MyAppExeName "LAN Share.exe"
#define MyAppURL "https://github.com/lan-share"
#define MyAppCopyright "Copyright (C) 2024"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppCopyright={#MyAppCopyright}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\output
OutputBaseFilename=LAN-Share-Setup-{#MyAppVersion}-all
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=
UninstallDisplayIcon={app}\LAN-Share-Backend.exe
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Setup
VersionInfoTextVersion={#MyAppVersion}
MinVersion=10.0

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "开机自动启动"; GroupDescription: "服务选项:"; Flags: unchecked

[Files]
Source: "dist\LAN-Share-Backend.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\backend\web"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\启动 LAN Share.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\启动 {#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; WorkingDir: "{app}"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "启动 {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\web"
Type: filesandordirs; Name: "{app}\storage"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateDir(ExpandConstant('{app}\data'));
    CreateDir(ExpandConstant('{app}\web'));
    CreateDir(ExpandConstant('{app}\web\assets'));
    CreateDir(ExpandConstant('{app}\storage'));
    CreateDir(ExpandConstant('{app}\storage\files'));
    CreateDir(ExpandConstant('{app}\storage\chunks'));

    if not FileExists(ExpandConstant('{app}\.env')) then
    begin
      if FileExists(ExpandConstant('{app}\web\..\.env.example')) then
      begin
        FileCopy(ExpandConstant('{app}\web\..\.env.example'), ExpandConstant('{app}\.env'), False);
      end
      else
      begin
        SaveStringToFile(ExpandConstant('{app}\.env'),
          'DEBUG=false' + #13#10 +
          'ENV=production' + #13#10 +
          'HOST=0.0.0.0' + #13#10 +
          'PORT=8000' + #13#10 +
          'DATABASE_URL=sqlite:///./data/lanshare.db' + #13#10 +
          'UPLOAD_DIR=./storage/files' + #13#10 +
          'CHUNK_DIR=./storage/chunks' + #13#10 +
          'INDEX_ALLOWED_PATHS=C:\\,D:\\,E:\\,F:\\' + #13#10 +
          'MAX_FILE_SIZE=0' + #13#10 +
          'SECRET_KEY=' + GenerateRandomKey + #13#10 +
          'ALGORITHM=HS256' + #13#10 +
          'ACCESS_TOKEN_EXPIRE_MINUTES=1440' + #13#10 +
          'DEFAULT_STORAGE_QUOTA=53687091200' + #13#10 +
          'CHUNK_SIZE=5242880', False);
      end;
    end;
  end;
end;

function GenerateRandomKey(): String;
var
  S: String;
  i: Integer;
begin
  S := '';
  for i := 1 to 64 do
  begin
    S := S + Chr(Ord('a') + Random(26));
  end;
  Result := S;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;
