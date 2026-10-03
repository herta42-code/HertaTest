@echo off
chcp 65001 >nul
title Cards of Deception - Game Launcher
cls

echo ======================================================================
echo          🎮 CARDS OF DECEPTION - AUTO LAUNCHER 🎮
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. ตรวจสอบ Node.js
set "NODE_CMD="
if exist "%~dp0bin\node.exe" (
    set "NODE_CMD=%~dp0bin\node.exe"
    echo [INFO] ตรวจพบ Node.js แบบพกพา [bin\node.exe]
) else (
    where node >nul 2>&1
    if %errorlevel% equ 0 (
        set "NODE_CMD=node"
        echo [INFO] ตรวจพบ Node.js ในระบบเครื่อง
    ) else if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
        echo [INFO] ตรวจพบ Node.js ใน Program Files
    )
)

if "%NODE_CMD%"=="" (
    echo [ERROR] ไม่พบ Node.js ในเครื่องคอมพิวเตอร์ของคุณ!
    echo.
    echo วิธีแก้ไข:
    echo 1. ดาวน์โหลดและติดตั้ง Node.js จาก: https://nodejs.org/
    echo 2. เมื่อติดตั้งเสร็จ ให้ดับเบิลคลิกไฟล์นี้เพื่อเริ่มเล่นเกมได้ทันที
    echo.
    echo ======================================================================
    pause
    exit /b 1
)

:: ตรวจสอบคำสั่ง npm
set "NPM_CMD="
where npm >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_CMD=npm"
) else if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
) else if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
) else if exist "%AppData%\npm\npm.cmd" (
    set "NPM_CMD=%AppData%\npm\npm.cmd"
)

:: 2. ตรวจสอบ dependencies [node_modules] - ติดตั้งให้อัตโนมัติในครั้งแรก
set "NEED_INSTALL=0"
if not exist "%~dp0node_modules\" set "NEED_INSTALL=1"
if not exist "%~dp0node_modules\ws\" set "NEED_INSTALL=1"
if not exist "%~dp0node_modules\qrcode\" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
    echo.
    echo ----------------------------------------------------------------------
    echo [INFO] ตรวจพบการเปิดเกมครั้งแรก [ยังไม่ได้ติดตั้งโมดูลไลบรารี]
    echo [INFO] กำลังรัน npm install ให้อัตโนมัติ กรุณารอสักครู่...
    echo [INFO] ขั้นตอนนี้จะทำงานเพียงแค่ครั้งแรกเท่านั้น
    echo ----------------------------------------------------------------------
    echo.
    if "%NPM_CMD%"=="" (
        echo [ERROR] ไม่พบคำสั่ง npm ในระบบ ไม่สามารถติดตั้งแพ็กเกจได้อัตโนมัติ!
        echo กรุณาดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/ ให้เรียบร้อย
        echo.
        pause
        exit /b 1
    )
    call "%NPM_CMD%" install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERROR] ติดตั้งแพ็กเกจไม่สำเร็จ!
        echo กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองเปิดใหม่อีกครั้ง
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] ติดตั้งส่วนเสริมที่จำเป็นเรียบร้อยแล้ว! พร้อมเข้าเล่นเกม
    echo.
) else (
    echo [INFO] ตรวจพบไฟล์ระบบเกมครบถ้วน พร้อมใช้งาน
)

:: 3. ตรวจสอบว่า Server รันอยู่แล้วหรือไม่บน Port 3000
netstat -ano | findstr /R ":3000.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [INFO] ตรวจพบเซิร์ฟเวอร์กำลังทำงานอยู่แล้ว!
    echo [INFO] กำลังเปิดหน้าต่างเกมบนเว็บเบราว์เซอร์ของคุณทันที...
    start http://localhost:3000
    ping 127.0.0.1 -n 3 >nul
    exit /b 0
)

:: 4. สตาร์ท Server และเปิดเบราว์เซอร์
echo.
echo [INFO] กำลังเริ่มรันเซิร์ฟเวอร์เกม และเปิดหน้าต่างเกมบนเว็บเบราว์เซอร์...
echo [INFO] คุณสามารถย่อหน้าต่างนี้ไว้ได้ และปิดหน้าต่างนี้เมื่อต้องการเลิกเล่น
echo.
"%NODE_CMD%" server.js --open

if errorlevel 1 (
    echo.
    echo [ERROR] เซิร์ฟเวอร์หยุดทำงานหรือเกิดข้อผิดพลาด
    pause
)