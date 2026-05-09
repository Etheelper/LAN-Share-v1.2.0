; LAN Share - Inno Setup Script
; 打包 LAN Share 局域网资源共享系统（含 Python 便携版）

#define MyAppName "LAN Share"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "LAN Share"
#define MyAppExeName "LAN Share.exe"
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
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Auto start Backend on boot"; GroupDescription: "Service Options:"

[Files]
Source: "python-embed\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__\*.pyc;*.pyc"
Source: "..\frontend\dist\*"; DestDir: "{app}\backend\web"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\启动 LAN Share.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\启动 LAN Share.bat"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\启动 LAN Share.bat"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\启动 LAN Share.bat"; Tasks: startupicon

[Run]
Filename: "{app}\启动 LAN Share.bat"; Description: "Start LAN Share Service"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"

[Code]
function InitializeSetup(): Boolean;
var
  PythonSrcPath: String;
begin
  Result := True;
  PythonSrcPath := ExpandConstant('{src}\python-embed');

  if not DirExists(PythonSrcPath) then
  begin
    MsgBox('Please extract Python Embeddable package to:' + #13#10 + #13#10 +
           '{src}\python-embed\' + #13#10 + #13#10 +
           'Download:' + #13#10 +
           'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' + #13#10 + #13#10 +
           'Expected files:' + #13#10 +
           'python.exe, python311.dll, etc.',
           mbInformation, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateDir(ExpandConstant('{app}\data'));
    CreateDir(ExpandConstant('{app}\backend\storage\files'));
    CreateDir(ExpandConstant('{app}\backend\uploads'));

    if not FileExists(ExpandConstant('{app}\backend\.env')) then
    begin
      if FileExists(ExpandConstant('{app}\backend\.env.example')) then
        FileCopy(ExpandConstant('{app}\backend\.env.example'), ExpandConstant('{app}\backend\.env'), False);
    end;
  end;
end;
