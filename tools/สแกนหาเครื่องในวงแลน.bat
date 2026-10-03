@echo off
chcp 65001 >nul
title LAN Network Scanner - Cards of Deception
cls

echo ======================================================================
echo           🔍 เครื่องมือสแกนหาอุปกรณ์ในเครือข่ายเดียวกัน (LAN / Wi-Fi)
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$wifi = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|อีเทอร์เน็ต|Ethernet' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '192.168.56*' } | Select-Object -First 1; " ^
    "if (-not $wifi) { Write-Host '[!] ไม่พบการเชื่อมต่อเครือข่ายหลัก' -ForegroundColor Yellow; exit }; " ^
    "$myIp = $wifi.IPAddress; " ^
    "$octets = $myIp.Split('.'); " ^
    "$subnet = \"$($octets[0]).$($octets[1]).$($octets[2])\"; " ^
    "Write-Host \"[+] เครือข่ายปัจจุบันของคุณ (My IP): \" -NoNewline; Write-Host $myIp -ForegroundColor Cyan; " ^
    "Write-Host \"[+] ลิงก์สำหรับให้เพื่อนเข้าเล่นเกม: \" -NoNewline; Write-Host \"http://$($myIp):3000\" -ForegroundColor Yellow; " ^
    "Write-Host \"`nกำลังสแกนค้นหาอุปกรณ์ในวง $subnet.1 ถึง $subnet.254 กรุณารอสักครู่ (ประมาณ 3-5 วินาที)...`n\" -ForegroundColor Gray; " ^
    "$tasks = @(); " ^
    "foreach ($i in 1..254) { " ^
    "    $targetIp = \"$subnet.$i\"; " ^
    "    $p = New-Object System.Net.NetworkInformation.Ping; " ^
    "    $tasks += [PSCustomObject]@{ IP = $targetIp; Ping = $p; Task = $p.SendPingAsync($targetIp, 500) }; " ^
    "}; " ^
    "[System.Threading.Tasks.Task]::WaitAll($tasks.Task); " ^
    "$found = @(); " ^
    "foreach ($t in $tasks) { " ^
    "    if ($t.Task.Status -eq 'RanToCompletion' -and $t.Task.Result.Status -eq 'Success') { " ^
    "        $name = ''; " ^
    "        try { $name = [System.Net.Dns]::GetHostEntry($t.IP).HostName } catch { $name = '(ไม่ระบุ Hostname)' }; " ^
    "        $isMe = if ($t.IP -eq $myIp) { ' (เครื่องนี้ - HOST 💻)' } else { '' }; " ^
    "        $found += [PSCustomObject]@{ 'IP Address' = ($t.IP + $isMe); 'Device Name' = $name; 'Ping' = \"$($t.Task.Result.RoundtripTime) ms\"; 'Status' = 'ONLINE 🟢' }; " ^
    "    }; " ^
    "    $t.Ping.Dispose(); " ^
    "}; " ^
    "Write-Host '======================================================================' -ForegroundColor DarkGray; " ^
    "if ($found.Count -gt 0) { " ^
    "    $found | Format-Table -AutoSize; " ^
    "    Write-Host \"`n[SUCCESS] พบอุปกรณ์ที่เชื่อมต่ออยู่ในวงเดียวกันทั้งหมด $($found.Count) เครื่อง!\" -ForegroundColor Green; " ^
    "} else { " ^
    "    Write-Host '[INFO] ไม่พบอุปกรณ์อื่นในวงเครือข่าย' -ForegroundColor Yellow; " ^
    "}"

echo.
echo ======================================================================
echo กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
pause >nul
