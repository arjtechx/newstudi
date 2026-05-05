$DesktopPath = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -comObject WScript.Shell

$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Iniciar App.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """c:\Users\gcarv\Nova pasta\newstudi\run-hidden.vbs"""
$Shortcut.WorkingDirectory = "c:\Users\gcarv\Nova pasta\newstudi"
$Shortcut.Save()

$Shortcut2 = $WshShell.CreateShortcut("$DesktopPath\Parar App.lnk")
$Shortcut2.TargetPath = "c:\Users\gcarv\Nova pasta\newstudi\stop-app.bat"
$Shortcut2.WorkingDirectory = "c:\Users\gcarv\Nova pasta\newstudi"
$Shortcut2.Save()
