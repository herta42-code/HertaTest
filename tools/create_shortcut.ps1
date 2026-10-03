$ws = New-Object -ComObject WScript.Shell
$desk = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desk 'Cards of Deception.lnk'
$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot 'เริ่มเล่นเกม.bat'
$icon = Join-Path $projectRoot 'favicon.ico'

$sc = $ws.CreateShortcut($linkPath)
$sc.TargetPath = $target
$sc.WorkingDirectory = $projectRoot
$sc.IconLocation = "$icon,0"
$sc.Description = 'Cards of Deception - Real-time Multiplayer Card Game'
$sc.Save()

Write-Host "[SUCCESS] Created Desktop Shortcut at: $linkPath" -ForegroundColor Green
