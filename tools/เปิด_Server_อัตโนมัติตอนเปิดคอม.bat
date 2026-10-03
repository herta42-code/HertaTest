@echo off
chcp 65001 >nul
title Enable Auto-Start Cards of Deception Server
cls

echo ======================================================================
echo    ⚙️ ตั้งค่าให้ Server รันอัตโนมัติตอนเปิดเครื่องคอมพิวเตอร์ (Windows) ⚙️
echo ======================================================================
echo.

powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$startup = [Environment]::GetFolderPath('Startup'); " ^
    "$linkPath = Join-Path $startup 'Cards of Deception Server.lnk'; " ^
    "$sc = $ws.CreateShortcut($linkPath); " ^
    "$sc.TargetPath = 'wscript.exe'; " ^
    "$sc.Arguments = '\""%~dp0เริ่มเล่นเกม_แบบซ่อนหน้าต่าง.vbs\""'; " ^
    "$sc.WorkingDirectory = '%~dp0..'; " ^
    "$sc.IconLocation = '%~dp0..\favicon.ico,0'; " ^
    "$sc.Description = 'Cards of Deception Auto Background Server'; " ^
    "$sc.Save(); " ^
    "Write-Host '[SUCCESS] ตั้งค่าให้ Server ทำงานอัตโนมัติตอนเปิดคอมเรียบร้อยแล้ว!' -ForegroundColor Green"

echo.
ping 127.0.0.1 -n 3 >nul
