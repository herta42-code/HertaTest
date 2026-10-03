@echo off
chcp 65001 >nul
title Disable Auto-Start Cards of Deception Server
cls

echo ======================================================================
echo          🛑 ยกเลิกรัน Server อัตโนมัติตอนเปิดเครื่องคอมพิวเตอร์ 🛑
echo ======================================================================
echo.

powershell -NoProfile -Command ^
    "$startup = [Environment]::GetFolderPath('Startup'); " ^
    "$linkPath = Join-Path $startup 'Cards of Deception Server.lnk'; " ^
    "if (Test-Path $linkPath) { Remove-Item $linkPath -Force; Write-Host '[SUCCESS] ยกเลิกการเปิด Server ตอนเปิดคอมเรียบร้อยแล้ว!' -ForegroundColor Green } else { Write-Host '[INFO] ไม่มีการตั้งค่าเปิดตอนเปิดคอมอยู่แล้ว' -ForegroundColor Yellow }"

echo.
ping 127.0.0.1 -n 3 >nul
