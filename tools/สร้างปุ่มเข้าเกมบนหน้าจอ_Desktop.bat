@echo off
chcp 65001 >nul
title Create Desktop Shortcut - Cards of Deception
cls

echo ======================================================================
echo       🖥️ Creating Desktop Shortcut for Cards of Deception...
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"

echo.
ping 127.0.0.1 -n 3 >nul