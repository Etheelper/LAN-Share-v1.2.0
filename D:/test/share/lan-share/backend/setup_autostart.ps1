$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\LAN Share Backend.lnk")
$Shortcut.TargetPath = "%USERPROFILE%\AppData\Local\Programs\Python\Python37\python.exe"
$Shortcut.Arguments = "run.py"
$Shortcut.WorkingDirectory = "D:\test\share\lan-share\backend"
$Shortcut.Description = "LAN Share Backend Server"
$Shortcut.Save()
Write-Host "已创建开机自启动快捷方式到开始菜单启动文件夹"
Write-Host "快捷方式路径: $env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\LAN Share Backend.lnk"
