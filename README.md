# 🃏 Cards of Deception (COD)

> **Real-time Multiplayer Fantasy Card Game with WebSockets & Node.js**

เกมไพ่โกหกหลอกลวง (Cards of Deception / Liar's Dice & Cheat Inspired) ในธีมแฟนตาซี พิกเซลอาร์ต รองรับผู้เล่น 2-4 คน แบบ Real-time Multiplayer ผ่าน WebSocket ทั้งคอมพิวเตอร์และมือถือ

---

## 🌟 ฟีเจอร์เด่น (Key Features)

- **Real-time Multiplayer:** เล่นพร้อมกันได้ 2-4 คน ผ่าน WebSockets
- **LAN & Local Network Support:** เล่นด้วยกันในวง Wi-Fi เดียวกันได้ทันที ไม่ต้องตั้งค่า Router
- **Auto Room Matching:** ระบบจับคู่ห้องอัจฉริยะ รองรับการพิมพ์รหัสห้องทั้งแบบ 4 หลัก (เช่น `8899`), แบบมีขีด (`COD-8899`) หรือตัวพิมพ์เล็ก-ใหญ่
- **AI Bot Opponents:** เพิ่มบอท AI เล่นแทนคนได้หากผู้เล่นไม่ครบ
- **Audio & Visual Effects:** ระบบเสียง BGM, SFX และแอนิเมชันเอฟเฟกต์การท้าจับโกหก (Challenging)
- **Responsive UI:** เล่นได้ทั้งบน PC, Mac, โน้ตบุ๊ก, แท็บเล็ต และสมาร์ตโฟน

---

## 🚀 วิธีเริ่มเล่น (Quick Start)

### วิธีที่ 1: ดับเบิ้ลคลิกไฟล์ (Windows)
1. ดับเบิ้ลคลิกไฟล์ `run.bat` (หรือ `เข้าเล่นเกม.bat`)
2. เบราว์เซอร์จะเปิดหน้าเกมขึ้นมาให้อัตโนมัติที่ `http://localhost:3000`

### วิธีที่ 2: ใช้คำสั่ง Node.js
```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้นเซิร์ฟเวอร์
npm start
```

---

## 🌐 วิธีเล่นกับเพื่อนบนมือถือ & อุปกรณ์อื่น (Play on All Devices & Cross-Platform)

รองรับการเล่นร่วมกันได้ทุกอุปกรณ์: **PC, Mac, iPhone, iPad, Android Phone, Android Tablet**

### วิธีที่ง่ายที่สุด: สแกน QR Code เข้าเล่นได้ทันที (Fastest & Easiest)
1. **เครื่อง Host:**
   - รันเซิร์ฟเวอร์ด้วย `เริ่มเล่นเกม.bat` (หรือ `npm start`)
   - กด **CREATE ROOM** (สร้างห้อง) และเข้าสู่ห้อง Lobby
   - กดปุ่ม **📱 QR CODE** ข้างรหัสห้อง (หรือปุ่ม QR CODE ที่หน้าเมนูหลัก)
2. **เพื่อนหรือผู้เล่นอื่น (มือถือ / แท็บเล็ต):**
   - เชื่อมต่อ Wi-Fi วงเดียวกัน
   - **เปิดกล้องมือถือ (iPhone หรือ Android)** แล้วสแกน QR Code บนหน้าจอ
   - เบราว์เซอร์จะเปิดเกมขึ้นมาให้พร้อมกรอกรหัสห้องให้อัตโนมัติทันที!
   - เลือกตัวละคร พิมพ์ชื่อ แล้วกด **JOIN GAME** ได้เลย!

### หรือแชร์ลิงก์ตรง (Direct Link):
- ในหน้าต่าง QR Code สามารถกด **📋 คัดลอกลิงก์** แล้วส่งให้เพื่อนใน LINE, Discord หรือแชตต่างๆ
- เพื่อนกดลิงก์แล้วจะเข้าสู่หน้าห้องนั้นทันทีโดยไม่ต้องพิมพ์รหัสเอง

---

## 🛠️ โครงสร้างโปรเจกต์ (Project Structure)

```text
├── server.js              # Node.js HTTP & WebSocket Server
├── cardgame.html          # Main HTML UI
├── js/
│   └── cardgameEngine.js  # Client Game Engine & WebSocket Client
├── css/
│   └── cardgame.css       # Pixel Fantasy Styling & Animations
├── photo/                 # การ์ด, ตัวละคร, และภาพพื้นหลัง
├── run.bat                # Windows Launcher Script
└── package.json           # Node dependencies
```

---

## 📜 กติกาการเล่นเบื้องต้น (Game Rules)

1. ผู้เล่นแต่ละคนจะได้รับการแจกไพ่เท่าๆ กัน
2. ในแต่ละรอบ จะมี "Rank เป้าหมาย" ที่ต้องลง (เช่น K, Q, J, A)
3. ผู้เล่นต้องลงไพ่คว่ำหน้า 1-4 ใบ โดยบอกว่าเป็นไพ่เป้าหมาย (จะลงจริงหรือโกหกก็ได้)
4. ผู้เล่นคนถัดไปสามารถเลือกที่จะ:
   - **ลงไพ่ต่อ:** วางไพ่คว่ำหน้าเพิ่ม
   - **ท้าจับโกหก (Challenge):** เปิดไพ่ที่คนก่อนหน้าเพิ่งลง
     - ถ้าเขาโกหกจริง: คนโกหกจะโดนดาเมจ และเก็บไพ่ทั้งหมดบนโต๊ะ
     - ถ้าเขาพูดจริง: คนที่กดท้าจะโดนดาเมจแทน!
5. ใครไพ่หมดมือก่อนและ HP ไม่หมด จะเป็นผู้ชนะ!
