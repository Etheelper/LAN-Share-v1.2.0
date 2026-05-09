; LAN Share - Inno Setup Script
; 打包 LAN Share 局域网资源共享系统（含 PyInstaller 独立后端）

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
Source: "dist\LAN-Share-Backend.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\启动 LAN Share.bat"; DestDir: "{app}"; Flags: ignoreversion

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
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateDir(ExpandConstant('{app}\data'));
    CreateDir(ExpandConstant('{app}\backend\storage\files'));
    CreateDir(ExpandConstant('{app}\backend\uploads'));
  end;
end;
