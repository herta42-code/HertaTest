@echo off
chcp 65001 >nul
title Stop Cards of Deception Server
cls

echo ======================================================================
echo             🛑 หยุดการทำงาน CARDS OF DECEPTION SERVER 🛑
echo ======================================================================
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '[SUCCESS] ปิดเซิร์ฟเวอร์เรียบร้อยแล้ว!' -ForegroundColor Green"

echo.
ping 127.0.0.1 -n 3 >nul