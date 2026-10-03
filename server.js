const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const { exec } = require('child_process');

let QRCode = null;
try {
    QRCode = require('qrcode');
} catch (e) {
    console.warn('[WARN] qrcode module not found, fallback mode');
}

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

// Helper: get IPv4 LAN addresses (prioritizing real Wi-Fi/Ethernet over virtual adapters)
function getLanIpv4Addresses() {
    const ifaces = os.networkInterfaces();
    const realIps = [];
    const virtualIps = [];

    for (const dev in ifaces) {
        const isVirtual = /virtual|vmware|vbox|vethernet|hyper-v|loopback|wsl/i.test(dev);
        ifaces[dev].forEach(details => {
            if (details.family === 'IPv4' && !details.internal) {
                if (isVirtual || details.address.startsWith('192.168.56.')) {
                    virtualIps.push(details.address);
                } else {
                    realIps.push(details.address);
                }
            }
        });
    }
    const allIps = [...realIps, ...virtualIps];
    return allIps.length > 0 ? allIps : ['127.0.0.1'];
}

// MIME Types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

// HTTP Static Server
const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);

    // Cross-Device API: Network info
    if (reqPath === '/api/network-info' || reqPath === '/api/info') {
        const ips = getLanIpv4Addresses();
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            port: PORT,
            ips: ips,
            primaryIp: ips[0] || 'localhost',
            urls: ips.map(ip => `http://${ip}:${PORT}`)
        }));
        return;
    }

    // Cross-Device API: QR Code Image
    if (reqPath === '/api/qrcode') {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const text = parsedUrl.searchParams.get('text') || `http://localhost:${PORT}`;
        if (!QRCode) {
            res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('QR generator module not available');
            return;
        }
        QRCode.toBuffer(text, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, (err, buffer) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('QR Code generation error: ' + err.message);
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(buffer);
        });
        return;
    }

    if (reqPath === '/' || reqPath === '') {
        reqPath = '/cardgame.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(ROOT_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

// WebSocket Server for Real-Time Multiplayer
const wss = new WebSocket.Server({ server });

// Game State Management
const rooms = new Map(); // roomCode -> RoomObject
const clientMap = new Map(); // ws -> { id, roomCode, isHost }

const CHARACTER_PRESETS = [
    { id: '1', title: 'Paladin Warrior', avatar: './photo/character/โปรเจ็กต์ใหม่ 16 [3589520].png' },
    { id: '2', title: 'Elf Archer', avatar: './photo/character/โปรเจ็กต์ใหม่ 16 [60E167B].png' },
    { id: '3', title: 'Arcane Sorceress', avatar: './photo/character/โปรเจ็กต์ใหม่ 16 [821AF33].png' },
    { id: '4', title: 'Shadow Assassin', avatar: './photo/character/โปรเจ็กต์ใหม่ 16 [B5F0626].png' }
];

const BOT_PRESETS = [
    { name: 'Player 2', charId: '2' },
    { name: 'Player 3', charId: '3' },
    { name: 'Player 4', charId: '4' }
];

const CLASSIC_RANKS = ['K', 'Q', 'J', 'A'];
const FULL_DECK_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS = CLASSIC_RANKS;

function getRanksForMode(mode) {
    return (mode === 'FULL_DECK' || !mode) ? FULL_DECK_RANKS : CLASSIC_RANKS;
}

function getNextLadderRank(currentRank) {
    const idx = FULL_DECK_RANKS.indexOf(String(currentRank || '').trim().toUpperCase());
    if (idx === -1) return FULL_DECK_RANKS[0];
    return FULL_DECK_RANKS[(idx + 1) % FULL_DECK_RANKS.length];
}

// EXPANSION: DECEPTION ROLES (บทบาทตัวละครพิเศษ)
const DECEPTION_ROLES = [
    {
        id: 'inspector',
        name: 'Inspector',
        titleTh: 'สารวัตร',
        icon: '🔍',
        color: '#ffd700',
        skillName: 'Investigative Eye',
        skillNameTh: 'เนตรสืบสวน (แอบส่องจับพิรุธ)',
        descTh: 'แอบดูไพ่ล่าสุดของผู้เล่นคนที่เพิ่งลงไปได้ แต่จะไม่สามารถเรียก Call Bluff คนนั้นได้หากเราเป็นคนเล่นต่อจากคนก่อนหน้า',
        descEn: 'Inspect the latest cards played by the previous player, but you cannot Call Bluff on them if you are taking the turn directly after them.'
    },
    {
        id: 'trickster',
        name: 'Trickster',
        titleTh: 'นักต้มตุ๋น',
        icon: '🎭',
        color: '#c084fc',
        skillName: 'Sleight of Hand',
        skillNameTh: 'สับไพ่พลิกแพลง (มายากลสลับไพ่)',
        descTh: 'เมื่อถึงตาตนเอง สามารถสลับไพ่ 1 ใบบนมือให้กลายเป็นไพ่เป้าหมายของโต๊ะรอบนี้แบบลับๆ',
        descEn: 'On your turn, secretly transmute 1 card in hand into the current table target rank.'
    },
    {
        id: 'hacker',
        name: 'The Hacker',
        titleTh: 'แฮกเกอร์',
        icon: '💻',
        color: '#00ff88',
        skillName: 'Glitch Shuffle',
        skillNameTh: 'สลับป่วนระบบ (Glitch Shuffle)',
        descTh: 'สุ่มสลับไพ่ในมือแบบอิสระ ไพ่ใบที่อยู่ในมือของคนบนโต๊ะจะถูกสลับแบบสุ่มทุกใบ',
        descEn: 'Freely randomize and shuffle all cards in hands across everyone at the table.'
    },
    {
        id: 'gambler',
        name: 'Gambler',
        titleTh: 'นักเสี่ยงโชค',
        icon: '🎲',
        color: '#ff4444',
        skillName: 'Gambler\'s Bet',
        skillNameTh: 'เดิมพันนักเสี่ยงโชค (Gamble Call Bluff)',
        descTh: 'เมื่อจับโกหกสำเร็จ ฟื้นฟู +1 HP ❤️ แต่หากจับผิดไม่สำเร็จ จะสุ่มทำลายไอเทม 1 ชิ้นในมือแทน (ถ้าไอเทมหมดจะเสีย 1 HP แทน)',
        descEn: 'When successfully calling bluff, restore +1 HP ❤️. If call bluff fails, randomly destroy 1 item in hand (loses 1 HP instead if no items left).'
    }
];

// EXPANSION: SECRET OBJECTIVES (ภารกิจลับเฉพาะตัว)
const SECRET_OBJECTIVES = [
    {
        id: 'point_thief',
        nameTh: 'โจรขโมยแต้ม (Point Thief)',
        nameEn: 'Point Thief',
        icon: '🗡️',
        descTh: 'หากทำให้ผู้เล่นทางซ้ายมือของคุณถูกจับโกหกจน HP หมดสิ้น (💀) คุณจะได้รับฟื้นฟู +1 หัวใจ ❤️ และโล่ป้องกัน 🛡️',
        descEn: 'If the player to your left is eliminated by being caught bluffing, gain +1 Heart ❤️ and a Shield 🛡️.'
    },
    {
        id: 'silent_con',
        nameTh: 'นักต้มตุ๋นเงียบ (Silent Con)',
        nameEn: 'Silent Con',
        icon: '🎭',
        descTh: 'เล่นจนไพ่หมดมือโดยไม่เคยถูกใครจับโกหกสำเร็จเลย จะได้รับฟื้นฟู +1 หัวใจ ❤️ และโล่ป้องกัน 🛡️',
        descEn: 'Clear your hand without ever being caught bluffing to gain +1 Heart ❤️ and a Shield 🛡️.'
    },
    {
        id: 'master_bluff',
        nameTh: 'จอมตบตา (Master Bluff)',
        nameEn: 'Master Bluff',
        icon: '🃏',
        descTh: 'บลัฟสำเร็จโดยไม่มีใครกล้าท้าจับโกหกครบ 3 ครั้ง จะได้รับฟื้นฟู +1 หัวใจ ❤️ และโล่ป้องกัน 🛡️',
        descEn: 'Successfully bluff 3 times without being challenged to gain +1 Heart ❤️ and a Shield 🛡️.'
    }
];

// EXPANSION: DYNAMIC RULE ROUND (กติกาเปลี่ยนตามรอบ)
const DYNAMIC_RULES = [
    {
        id: 'WILD_CLAIM',
        name: 'Wild Claim',
        nameTh: 'Wild Claim (เคลมหน้าไพ่อิสระ)',
        icon: '🃏',
        desc: 'All cards and Jokers can be freely claimed as any target rank. Bluffing is wilder!',
        descTh: 'รอบนี้ไพ่ Joker หรือไพ่ทุกใบสามารถนำมาบลัฟสลับหน้าอ้างอิงได้อย่างอิสระ!'
    },
    {
        id: 'DOUBLE_CHAOS',
        name: 'Double Chaos',
        nameTh: 'Double Chaos (อลหม่านสองเท่า)',
        icon: '⚡',
        desc: 'Play 1-3 cards normally. Getting caught bluffing costs 1 HP immediately!',
        descTh: 'รอบนี้สามารถลงไพ่ 1-3 ใบตามปกติ หากถูกจับบลัฟจะเสีย 1 HP!'
    },
    {
        id: 'FORCED_TARGET',
        name: 'Forced Target',
        nameTh: 'Forced Target (เป้าหมายบังคับ)',
        icon: '🎯',
        desc: 'When calling LIAR, you are forced to challenge the target player!',
        descTh: 'รอบนี้หากจะกด LIAR ต้องท้าทายผู้เล่นคนก่อนหน้าเท่านั้น!'
    },
    {
        id: 'STANDARD',
        name: 'Standard Duel',
        nameTh: 'Standard Duel (การดวลมาตรฐาน)',
        icon: '🛡️',
        desc: 'Standard rules apply. Play 1-3 cards and challenge bluffs normally.',
        descTh: 'กติกามาตรฐาน ลงไพ่ 1-3 ใบและจับโกหกตามปกติ'
    }
];

// 8 UNIQUE GAME ITEMS (2 COPIES EACH = 16 ITEMS TOTAL IN POOL)
const GAME_ITEMS = [
    {
        id: 'steal_hp',
        icon: '🩸',
        name: 'HP Steal',
        nameTh: 'ขโมยหัวใจ',
        desc: 'Steal 1 Heart from an opponent to heal yourself (Target must have > 1 HP).',
        descTh: 'ดูดเลือดศัตรู 1 หัวใจมาเพิ่มให้ตัวเอง (กดใช้แล้วเลือกศัตรูที่มี HP > 1)',
        timing: 'TARGET'
    },
    {
        id: 'freeze_player',
        icon: '❄️',
        name: 'Freeze Turn',
        nameTh: 'แช่แข็งระงับเทิร์น',
        desc: 'Freeze an opponent to skip their next turn (Click target on your turn).',
        descTh: 'ข้ามตาเล่นของศัตรู 1 รอบ (ใช้ในตาเรา แล้วคลิกเลือกศัตรูที่ต้องการสตั๊น)',
        timing: 'TARGET'
    },
    {
        id: 'reverse_turn',
        icon: '🔄',
        name: 'Reverse Turn',
        nameTh: 'สลับทิศทางเทิร์น',
        desc: 'Immediately reverse turn order to change who plays next (Use on your turn).',
        descTh: 'สลับทิศทางการเดินเทิร์นย้อนกลับทันที (ใช้ในตาเรา เพื่อเปลี่ยนลำดับเล่น)',
        timing: 'INSTANT'
    },
    {
        id: 'reflect_damage',
        icon: '🪞',
        name: 'Reflect Damage',
        nameTh: 'สะท้อนดาเมจ',
        desc: 'Reflect 1 damage back to the challenger so they lose HP instead (Use when challenged).',
        descTh: 'สะท้อน 1 ดาเมจกลับไปหาคนที่มาจับผิดเรา ให้เขาโดนลดเลือดแทน (ใช้ตอนถูกจับผิด)',
        timing: 'REACTION'
    },
    {
        id: 'single_card_curse',
        icon: '🔒',
        name: 'Single Card Curse',
        nameTh: 'คำสาปใบเดียว',
        desc: 'Curse an opponent to play only 1 card on their next turn (Click target on your turn).',
        descTh: 'สาปให้ศัตรูลงการ์ดได้แค่ใบเดียวในตาถัดไป (ใช้ในตาเรา แล้วคลิกเลือกศัตรู)',
        timing: 'TARGET'
    },
    {
        id: 'heal_hp',
        icon: '💖',
        name: 'Heal Potion',
        nameTh: 'ฟื้นฟูหัวใจ',
        desc: 'Instantly restore +1 Heart to yourself (Use anytime when damaged, max 3 HP).',
        descTh: 'ฟื้นฟูเลือดให้ตัวเองทันที +1 หัวใจ (ใช้ได้ตลอดเวลาเมื่อเลือดลด สูงสุด 3 HP)',
        timing: 'INSTANT'
    },
    {
        id: 'bluff_shield',
        icon: '🛡️',
        name: 'Bluff Shield',
        nameTh: 'ป้องกันการจับผิด',
        desc: 'Absorb damage so you lose 0 HP when caught bluffing (Use when challenged).',
        descTh: 'ดูดซับดาเมจ ไม่เสียหัวใจเมื่อโดนจับโกหกได้ (ใช้ป้องกันตัวเมื่อถูกจับผิด)',
        timing: 'REACTION'
    },
    {
        id: 'swap_hand',
        icon: '🤹',
        name: 'Swap Hands',
        nameTh: 'สลับการ์ดในมือ',
        desc: 'Swap your entire hand with a chosen opponent (Use on your turn to discard bad cards).',
        descTh: 'สลับไพ่ทั้งมือกับศัตรูที่เลือกทันที (ใช้ในตาเรา เพื่อขโมยไพ่น้อยหรือทิ้งไพ่แย่)',
        timing: 'TARGET'
    }
];

function createItemDeck() {
    const deck = [];
    GAME_ITEMS.forEach(item => {
        deck.push({ ...item, uid: `${item.id}_1`, used: false });
        deck.push({ ...item, uid: `${item.id}_2`, used: false });
    });
    deck.sort(() => Math.random() - 0.5);
    return deck;
}

function createDeck(multiplier = 1, mode = 'FULL_DECK') {
    let deck = [];
    let id = 1;
    const isFull = (mode === 'FULL_DECK' || !mode);
    const ranks = isFull ? FULL_DECK_RANKS : CLASSIC_RANKS;
    const copiesPerRank = isFull ? 4 : 6;
    for (let m = 0; m < multiplier; m++) {
        ranks.forEach(rank => {
            for (let i = 0; i < copiesPerRank; i++) {
                deck.push({ id: id++, rank });
            }
        });
        deck.push({ id: id++, rank: 'JOKER' });
        deck.push({ id: id++, rank: 'JOKER' });
    }
    deck.sort(() => Math.random() - 0.5);
    return deck;
}

function broadcastToRoom(room, data) {
    const json = JSON.stringify(data);
    room.players.forEach(p => {
        if (!p.isBot && p.ws && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(json);
        }
    });
}

function sendToPlayer(player, data) {
    if (!player.isBot && player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(data));
    }
}

function getSanitizedPlayers(players) {
    return players.map(p => ({
        id: p.id,
        name: p.name,
        charId: p.charId,
        avatar: p.avatar,
        title: p.title,
        isHost: p.isHost,
        isBot: p.isBot,
        hp: p.hp,
        cardCount: p.hand ? p.hand.length : 0,
        isAlive: p.hp > 0,
        role: p.role || null,
        shield: !!p.shield,
        isFrozen: !!p.isFrozen,
        isSingleCardCursed: !!p.isSingleCardCursed,
        itemsCount: p.items ? p.items.filter(it => !it.used).length : 0,
        itemsUsedCount: p.items ? p.items.filter(it => it.used).length : 0,
        roleSkillUsed: !!p.roleSkillUsed,
        draftOrder: p.draftOrder || null,
        staticSeatIndex: p.staticSeatIndex !== undefined ? p.staticSeatIndex : null,
        suspicion: p.suspicion || { rate: 50, bluffs: 0, truths: 0, totalPlays: 0 },
        secretObjectiveProgress: p.secretObjective ? (p.secretObjective.progress || 0) : 0
    }));
}

wss.on('connection', (ws) => {
    const clientId = 'user_' + Math.random().toString(36).substring(2, 9);
    clientMap.set(ws, { id: clientId, roomCode: null, isHost: false });

    // Send server LAN info to client for easy QR Code and mobile joining
    try {
        const lanIps = getLanIpv4Addresses();
        ws.send(JSON.stringify({
            type: 'SERVER_NETWORK_INFO',
            port: PORT,
            ips: lanIps,
            primaryIp: lanIps[0] || 'localhost'
        }));
    } catch (e) {}

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleClientMessage(ws, clientId, data);
        } catch (e) {
            console.error('Failed to parse client message:', e);
        }
    });

    ws.on('close', () => {
        const clientInfo = clientMap.get(ws);
        if (clientInfo && clientInfo.roomCode) {
            handleClientLeave(ws, clientInfo.roomCode);
        }
        clientMap.delete(ws);
    });
});

function normalizeRoomCode(code) {
    if (!code) return '';
    let clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^\d{4}$/.test(clean)) {
        clean = 'COD' + clean;
    }
    return clean;
}

function findRoom(code) {
    if (!code) return null;
    if (rooms.has(code)) return rooms.get(code);
    const clean = normalizeRoomCode(code);
    for (const [key, r] of rooms.entries()) {
        if (normalizeRoomCode(key) === clean || normalizeRoomCode(r.code) === clean) {
            return r;
        }
    }
    return null;
}

function handleClientMessage(ws, clientId, data) {
    switch (data.type) {
        case 'CREATE_ROOM': {
            let roomCode = (data.roomCode || 'COD-8899').trim().toUpperCase();
            if (/^\d{4}$/.test(roomCode)) {
                roomCode = 'COD-' + roomCode;
            }
            const hostName = (data.playerName || 'Host').trim();
            const charId = String(data.charId || '1');
            const charPreset = CHARACTER_PRESETS.find(c => c.id === charId) || CHARACTER_PRESETS[0];

            const existing = findRoom(roomCode);
            if (existing) {
                // If room exists and is empty or stale, recreate it
                const activeHumans = existing.players.filter(p => !p.isBot && p.ws && p.ws.readyState === WebSocket.OPEN);
                if (activeHumans.length > 0) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${roomCode} is already active!` }));
                    return;
                }
                rooms.delete(existing.code);
            }

            const hostPlayer = {
                id: clientId,
                name: hostName,
                charId: charId,
                avatar: charPreset.avatar,
                title: charPreset.title,
                isHost: true,
                isBot: false,
                hp: 3,
                hand: [],
                ws: ws,
                staticSeatIndex: 0
            };

            const room = {
                code: roomCode,
                hostId: clientId,
                players: [hostPlayer],
                state: 'LOBBY',
                mode: data.mode === 'CLASSIC' ? 'CLASSIC' : 'FULL_DECK',
                dynamicRule: DYNAMIC_RULES[3],
                drawPile: [],
                targetRank: 'K',
                turnIndex: 0,
                tablePile: [],
                lastPlayed: [],
                lastPlayerIdx: null,
                pendingIsBluff: false,
                pendingBluffPlayerIdx: null,
                hackedPlayerId: null,
                hackerPlayerId: null
            };

            rooms.set(roomCode, room);
            clientMap.set(ws, { id: clientId, roomCode, isHost: true });

            ws.send(JSON.stringify({
                type: 'ROOM_CREATED',
                roomCode,
                mode: room.mode,
                you: { id: clientId, isHost: true },
                players: getSanitizedPlayers(room.players)
            }));
            console.log(`[ROOM CREATED] Code: ${roomCode} by ${hostName} (${clientId}) [Mode: ${room.mode}]`);
            break;
        }

        case 'SET_GAME_MODE': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.hostId !== clientId || room.state !== 'LOBBY') return;

            room.mode = data.mode === 'CLASSIC' ? 'CLASSIC' : 'FULL_DECK';
            broadcastToRoom(room, {
                type: 'LOBBY_UPDATED',
                roomCode: room.code,
                mode: room.mode,
                players: getSanitizedPlayers(room.players),
                message: room.mode === 'FULL_DECK'
                    ? '🔥 เปลี่ยนโหมดเป็น FULL DECK MODE (ระบบไต่บันได 2➔A, ลงไพ่แล้วสุ่มจั่วขึ้นมือ 1 ใบ)!'
                    : '🛡️ เปลี่ยนโหมดเป็น CLASSIC MODE (คลาสสิก K, Q, J, A - ไม่จั่วไพ่เพิ่ม)'
            });
            break;
        }

        case 'JOIN_ROOM': {
            const rawCode = (data.roomCode || '').trim().toUpperCase();
            const playerName = (data.playerName || 'Player').trim();
            const charId = String(data.charId || '2');
            const charPreset = CHARACTER_PRESETS.find(c => c.id === charId) || CHARACTER_PRESETS[1];

            const room = findRoom(rawCode);
            if (!room) {
                ws.send(JSON.stringify({ 
                    type: 'ERROR', 
                    code: 'ROOM_NOT_FOUND',
                    roomCode: rawCode,
                    message: `Room "${rawCode}" not found! Please check the code.` 
                }));
                return;
            }

            const roomCode = room.code;

            if (room.state !== 'LOBBY') {
                ws.send(JSON.stringify({ type: 'ERROR', message: `Game in room "${roomCode}" has already started!` }));
                return;
            }

            if (room.players.length >= 4) {
                ws.send(JSON.stringify({ type: 'ERROR', message: `Room "${roomCode}" is full (4/4 players)!` }));
                return;
            }

            const newPlayer = {
                id: clientId,
                name: playerName,
                charId: charId,
                avatar: charPreset.avatar,
                title: charPreset.title,
                isHost: false,
                isBot: false,
                hp: 3,
                hand: [],
                ws: ws,
                staticSeatIndex: room.players.length
            };

            room.players.push(newPlayer);
            clientMap.set(ws, { id: clientId, roomCode, isHost: false });

            // Notify joiner
            ws.send(JSON.stringify({
                type: 'ROOM_JOINED',
                roomCode,
                mode: room.mode,
                you: { id: clientId, isHost: false },
                players: getSanitizedPlayers(room.players)
            }));

            // Broadcast to room
            broadcastToRoom(room, {
                type: 'LOBBY_UPDATED',
                roomCode,
                mode: room.mode,
                players: getSanitizedPlayers(room.players),
                message: `${playerName} joined the lobby!`
            });

            console.log(`[PLAYER JOINED] ${playerName} (${clientId}) joined room ${roomCode}`);
            break;
        }

        case 'ADD_AI': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.hostId !== clientId || room.state !== 'LOBBY') return;

            if (room.players.length >= 4) {
                ws.send(JSON.stringify({ type: 'ERROR', message: `ห้องเต็มแล้ว (4/4 คน)!` }));
                return;
            }

            const usedChars = new Set(room.players.map(p => p.charId));
            const availableChar = CHARACTER_PRESETS.find(c => !usedChars.has(c.id)) || CHARACTER_PRESETS[room.players.length % CHARACTER_PRESETS.length];
            const botIdx = room.players.filter(p => p.isBot).length;
            const botPreset = BOT_PRESETS[botIdx] || { name: `Player ${room.players.length + 1}` };

            const newBot = {
                id: 'bot_' + Math.random().toString(36).substring(2, 7),
                name: botPreset.name,
                charId: availableChar.id,
                avatar: availableChar.avatar,
                title: availableChar.title,
                isHost: false,
                isBot: true,
                hp: 3,
                hand: [],
                ws: null,
                staticSeatIndex: room.players.length
            };
            room.players.push(newBot);

            broadcastToRoom(room, {
                type: 'LOBBY_UPDATED',
                roomCode: room.code,
                players: getSanitizedPlayers(room.players),
                message: `${newBot.name} เข้าร่วมห้องแล้ว! (${room.players.length}/4)`
            });
            break;
        }

        case 'KICK_PLAYER': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.hostId !== clientId || room.state !== 'LOBBY') return;

            const targetId = data.targetId;
            const targetIndex = room.players.findIndex(p => p.id === targetId);
            if (targetIndex <= 0) return; // cannot kick host or invalid player

            const kickedPlayer = room.players[targetIndex];
            room.players.splice(targetIndex, 1);
            room.players.forEach((p, idx) => { p.staticSeatIndex = idx; });

            // If it's a real connected player, notify them
            if (kickedPlayer.ws) {
                try {
                    kickedPlayer.ws.send(JSON.stringify({
                        type: 'KICKED',
                        message: 'คุณถูกหัวหน้าห้องเตะออกจากห้อง!'
                    }));
                } catch (e) {}
                clientMap.delete(kickedPlayer.ws);
            }

            broadcastToRoom(room, {
                type: 'LOBBY_UPDATED',
                roomCode: room.code,
                players: getSanitizedPlayers(room.players),
                message: `${kickedPlayer.name} ถูกลบออกจากห้องแล้ว! (${room.players.length}/4)`
            });
            break;
        }

        case 'START_GAME': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.hostId !== clientId || room.state !== 'LOBBY') return;

            // Cannot start game if in room alone without bots or other players (require at least 2 players)
            if (room.players.length < 2) {
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: 'ไม่สามารถเริ่มเกมได้! ต้องมีผู้เล่นหรือบอทอย่างน้อย 2 คนขึ้นไป (กดปุ่ม "PLAY WITH AI" เพื่อเพิ่มบอท หรือรอผู้เล่นอื่นเข้าร่วม)'
                }));
                return;
            }

            startRoomSeatDraft(room);
            break;
        }

        case 'CLAIM_SEAT_CARD': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.state !== 'SEAT_SELECTION' || !room.seatDraft) return;

            const player = room.players.find(p => p.id === clientId);
            if (!player) return;

            const cardIndex = parseInt(data.cardIndex);
            if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= room.seatDraft.cards.length) return;

            const card = room.seatDraft.cards[cardIndex];
            if (!card || card.claimedBy) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'มีคนเลือกใบนี้ไปแล้ว! กรุณาเลือกใบอื่น' }));
                return;
            }

            const alreadyClaimed = room.seatDraft.cards.some(c => c.claimedBy && c.claimedBy.id === player.id);
            if (alreadyClaimed) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'คุณได้เลือกไพ่ไปแล้ว!' }));
                return;
            }

            card.claimedBy = { id: player.id, name: player.name, avatar: player.avatar };
            broadcastToRoom(room, {
                type: 'SEAT_CARD_CLAIMED',
                cardIndex: card.index,
                player: { id: player.id, name: player.name, avatar: player.avatar }
            });

            checkSeatDraftFinished(room);
            break;
        }

        case 'PLAY_CARDS': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.state !== 'PLAYING') return;

            const currentP = room.players[room.turnIndex];
            if (!currentP || currentP.id !== clientId) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'ยังไม่ถึงตาของคุณ กรุณารอสักครู่!' }));
                return;
            }

            const playedCardIds = data.cardIds || [];
            if (playedCardIds.length === 0) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'กรุณาเลือกไพ่อย่างน้อย 1 ใบก่อนลงไพ่!' }));
                return;
            }
            if (playedCardIds.length > 3) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'เลือกลงไพ่ได้สูงสุด 3 ใบเท่านั้น!' }));
                return;
            }
            if (currentP.isSingleCardCursed && playedCardIds.length > 1) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'คุณติดคำสาปใบเดียว สามารถลงไพ่ได้เพียง 1 ใบเท่านั้น!' }));
                return;
            }

            const playedCards = currentP.hand.filter(c => playedCardIds.includes(c.id));
            if (playedCards.length === 0) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'คุณต้องเลือกไพ่ที่อยู่ในมือเพื่อลงเล่นอย่างน้อย 1 ใบ!' }));
                return;
            }
            currentP.hand = currentP.hand.filter(c => !playedCardIds.includes(c.id));
            if (currentP.isSingleCardCursed) {
                currentP.isSingleCardCursed = false;
            }

            // Secret Objective: MASTER_BLUFF check (if previous player bluffed and went unchallenged)
            if (room.pendingIsBluff && room.pendingBluffPlayerIdx !== null) {
                const prevP = room.players[room.pendingBluffPlayerIdx];
                if (prevP && prevP.id !== currentP.id) {
                    prevP.uncaughtBluffs = (prevP.uncaughtBluffs || 0) + 1;
                    if (prevP.secretObjective) {
                        prevP.secretObjective.progress = prevP.uncaughtBluffs;
                    }
                    if (prevP.uncaughtBluffs >= 3 && prevP.secretObjective && prevP.secretObjective.id === 'master_bluff' && !prevP.secretObjectiveCompleted) {
                        prevP.secretObjectiveCompleted = true;
                        prevP.hp = Math.min(3, prevP.hp + 1);
                        prevP.shield = true;
                        broadcastToRoom(room, {
                            type: 'OBJECTIVE_REWARD',
                            message: `🃏 ภารกิจลับสำเร็จ: จอมตบตา! ${prevP.name} บลัฟสำเร็จครบ 3 ครั้ง! ได้รับฟื้นฟู 1 หัวใจ ❤️ และโล่ป้องกัน 🛡️!`,
                            players: getSanitizedPlayers(room.players)
                        });
                    }
                }
            }

            // Record if current play is a bluff
            const isCurrentBluff = playedCards.some(c => c.rank !== room.targetRank && c.rank !== 'JOKER');
            room.pendingIsBluff = isCurrentBluff;
            room.pendingBluffPlayerIdx = room.turnIndex;
            room.lastPlayedTargetRank = room.targetRank; // Accused claimed this target rank
            currentP.blockedBluffTargetId = null;
            currentP.blockedBluffTurnIndex = null;

            room.tablePile.push(...playedCards);
            room.lastPlayed = playedCards;
            room.lastPlayerIdx = room.turnIndex;

            // Full Deck Rule: Draw exactly 1 card when playing cards (regardless of whether 1-3 cards played)
            let drawnCount = 0;
            if (room.mode === 'FULL_DECK' || !room.mode) {
                const countToDraw = 1;
                if (!room.drawPile || room.drawPile.length < countToDraw + 10) {
                    room.drawPile = room.drawPile || [];
                    room.drawPile.push(...createDeck(1, room.mode));
                }
                for (let d = 0; d < countToDraw; d++) {
                    if (room.drawPile.length > 0) {
                        const drawn = room.drawPile.pop();
                        currentP.hand.push(drawn);
                        drawnCount++;
                    }
                }
            }

            // Advance Ladder if Full Deck mode
            const claimedRank = room.lastPlayedTargetRank;
            if (room.mode === 'FULL_DECK' || !room.mode) {
                room.targetRank = getNextLadderRank(room.targetRank);
            }

            // Send updated hand to the player who played
            sendToPlayer(currentP, {
                type: 'YOUR_HAND',
                hand: currentP.hand,
                targetRank: room.targetRank,
                drawnCount: drawnCount
            });

            // Check if player emptied hand -> Force next player to Call Bluff!
            if (currentP.hand.length === 0) {
                stopTurnTimer(room);
                advanceTurn(room);
                const nextP = room.players[room.turnIndex];

                room.forcedLastCardTargetId = currentP.id;

                broadcastToRoom(room, {
                    type: 'PLAYER_PLAYED_CARDS',
                    playerId: currentP.id,
                    playerName: currentP.name,
                    playerAvatar: currentP.avatar,
                    count: playedCards.length,
                    drawnCount: drawnCount,
                    claimedRank: claimedRank,
                    targetRank: room.targetRank,
                    tablePileCount: room.tablePile.length,
                    drawPileCount: room.drawPile ? room.drawPile.length : 0,
                    nextTurnIndex: room.turnIndex,
                    lastPlayedSummary: `Played ${playedCards.length} card(s) claiming [${claimedRank}]` + (drawnCount > 0 ? ` (Drawn ${drawnCount})` : '') + ((room.mode === 'FULL_DECK' || !room.mode) ? ` ➔ Next Ladder: [${room.targetRank}]` : ''),
                    players: getSanitizedPlayers(room.players)
                });

                broadcastToRoom(room, {
                    type: 'FORCED_BLUFF_ALERT',
                    message: `🚨 LAST CARD! ${currentP.name} เล่นไพ่หมดมือ! บังคับให้ ${nextP.name} CALL BLUFF ทันที! (Last Card - Forced Call Bluff!)`
                });

                if (room.forcedBluffTimeout) clearTimeout(room.forcedBluffTimeout);
                room.forcedBluffTimeout = setTimeout(() => {
                    room.forcedBluffTimeout = null;
                    if (room.state !== 'PLAYING') return;
                    if (room.tablePile.length > 0 && room.lastPlayerIdx !== null) {
                        executeBluffChallenge(room, nextP);
                    }
                }, 1200);
                return;
            }

            // Next turn
            stopTurnTimer(room);
            advanceTurn(room);

            broadcastToRoom(room, {
                type: 'PLAYER_PLAYED_CARDS',
                playerId: currentP.id,
                playerName: currentP.name,
                playerAvatar: currentP.avatar,
                count: playedCards.length,
                drawnCount: drawnCount,
                claimedRank: claimedRank,
                targetRank: room.targetRank,
                tablePileCount: room.tablePile.length,
                drawPileCount: room.drawPile ? room.drawPile.length : 0,
                nextTurnIndex: room.turnIndex,
                lastPlayedSummary: `Played ${playedCards.length} card(s) claiming [${claimedRank}]` + (drawnCount > 0 ? ` (Drawn ${drawnCount})` : '') + ((room.mode === 'FULL_DECK' || !room.mode) ? ` ➔ Next Ladder: [${room.targetRank}]` : ''),
                players: getSanitizedPlayers(room.players)
            });

            startTurnTimer(room);
            checkAndExecuteBotTurn(room);
            break;
        }

        case 'CALL_BLUFF': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.state !== 'PLAYING') return;
            if (room.isProcessingBluff) return;
            if (room.forcedBluffTimeout) { clearTimeout(room.forcedBluffTimeout); room.forcedBluffTimeout = null; }
            stopTurnTimer(room);

            const challenger = room.players[room.turnIndex];
            if (!challenger || challenger.id !== clientId) return;
            if (room.lastPlayed.length === 0 || room.lastPlayerIdx === null) return;

            // Inspector restriction check: cannot call bluff on target if inspected when playing directly next
            if (challenger.blockedBluffTargetId && challenger.blockedBluffTurnIndex === room.turnIndex) {
                const targetPlayer = room.players.find(p => p.id === challenger.blockedBluffTargetId);
                const tName = targetPlayer ? targetPlayer.name : 'ผู้เล่นคนนี้';
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: `คุณใช้สกิลส่องดูไพ่ของ ${tName} ไปแล้ว จึงไม่สามารถ Call Bluff ในตานี้ได้!`
                }));
                return;
            }

            executeBluffChallenge(room, challenger);
            break;
        }

        case 'USE_ROLE_SKILL': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.state !== 'PLAYING') return;

            const player = room.players.find(p => p.id === clientId);
            if (!player || player.hp <= 0) return;
            if (player.roleSkillUsed) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'คุณได้ใช้สกิลประจำตัวไปแล้วในเกมนี้!' }));
                return;
            }

            const role = player.role;
            if (!role) return;

            if (role.id === 'inspector') {
                if (room.tablePile.length === 0 || room.lastPlayed.length === 0 || room.lastPlayerIdx === null || room.lastPlayerIdx === undefined) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'ยังไม่มีไพ่ที่เพิ่งลงไปให้ตรวจสอบ!' }));
                    return;
                }
                const lastPlayer = room.players[room.lastPlayerIdx];
                if (!lastPlayer) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'ไม่พบข้อมูลผู้เล่นที่เพิ่งลงไพ่!' }));
                    return;
                }

                // Check if the inspector is taking the turn right after that player
                const isDirectlyNext = (room.turnIndex === room.players.indexOf(player));

                player.roleSkillUsed = true;
                if (isDirectlyNext) {
                    player.blockedBluffTargetId = lastPlayer.id;
                    player.blockedBluffTurnIndex = room.turnIndex;
                }

                const checkTarget = room.lastPlayedTargetRank || room.targetRank;
                const inspectedCards = room.lastPlayed.map(c => c.rank || c);
                const hasLie = room.lastPlayed.some(c => c.rank !== checkTarget && c.rank !== 'JOKER');
                const isTruth = !hasLie;

                sendToPlayer(player, {
                    type: 'SKILL_RESULT',
                    roleId: 'inspector',
                    targetName: lastPlayer.name,
                    targetAvatar: lastPlayer.avatar,
                    inspectedCards: inspectedCards,
                    targetRank: checkTarget,
                    isLie: hasLie,
                    isTruth: isTruth,
                    cannotCallBluff: isDirectlyNext,
                    message: `🔍 [INVESTIGATIVE EYE] แอบส่องไพ่ล่าสุดของ ${lastPlayer.name}: [ ${inspectedCards.join(', ')} ] (${isTruth ? 'ไพ่จริงทั้งหมด 🟢' : 'มีการโกหก/บลัฟ 🔴'})${isDirectlyNext ? ' ⚠️ คุณเป็นคนเล่นต่อ จึงไม่สามารถ Call Bluff ในตานี้ได้!' : ''}`
                });
                broadcastToRoom(room, {
                    type: 'ROLE_SKILL_ACTIVATED',
                    playerId: player.id,
                    playerName: player.name,
                    roleId: 'inspector',
                    message: `🔍 ${player.name} (Inspector) ใช้สกิล Investigative Eye แอบส่องไพ่ล่าสุดของ ${lastPlayer.name}!`
                });
                broadcastToRoom(room, {
                    type: 'PLAYERS_UPDATED',
                    players: getSanitizedPlayers(room.players)
                });
            } else if (role.id === 'trickster') {
                if (room.turnIndex !== room.players.indexOf(player)) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้สกิล Sleight of Hand ได้เฉพาะในตาของตนเองเท่านั้น!' }));
                    return;
                }
                let cardToSwap = null;
                if (data.cardId) {
                    cardToSwap = player.hand.find(c => c.id === data.cardId);
                }
                if (!cardToSwap && player.hand.length > 0) {
                    cardToSwap = player.hand[0];
                }
                if (cardToSwap) {
                    cardToSwap.rank = room.targetRank;
                    player.roleSkillUsed = true;
                    sendToPlayer(player, {
                        type: 'YOUR_HAND',
                        hand: player.hand,
                        role: player.role,
                        roleSkillUsed: true,
                        skillNotice: `🎭 Sleight of Hand: แปลงไพ่ในมือเป็น ${room.targetRank} สำเร็จ!`
                    });
                    // Trickster skill is secret: do NOT notify or broadcast to others in the room
                }
            } else if (role.id === 'hacker') {
                const activePlayersWithCards = room.players.filter(p => p.hp > 0 && p.hand && p.hand.length > 0);
                let pool = [];
                const counts = [];
                for (const p of activePlayersWithCards) {
                    counts.push(p.hand.length);
                    pool.push(...p.hand);
                }

                if (pool.length < 2) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'มีไพ่บนมือน้อยเกินไป ไม่สามารถสุ่มสลับได้!' }));
                    return;
                }

                player.roleSkillUsed = true;

                // Fisher-Yates shuffle all cards
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }

                let offset = 0;
                for (let i = 0; i < activePlayersWithCards.length; i++) {
                    const p = activePlayersWithCards[i];
                    const count = counts[i];
                    p.hand = pool.slice(offset, offset + count);
                    offset += count;

                    sendToPlayer(p, {
                        type: 'YOUR_HAND',
                        hand: p.hand,
                        role: p.role,
                        roleSkillUsed: p.roleSkillUsed,
                        skillNotice: p.id === player.id
                            ? '💻 Glitch Shuffle: สุ่มสลับไพ่ในมือของผู้เล่นทุกคนบนโต๊ะสำเร็จ!'
                            : '💻 ถูกแฮก! ไพ่ในมือของทุกคนบนโต๊ะถูกสุ่มสลับใหม่ทั้งหมด!'
                    });
                }

                sendToPlayer(player, {
                    type: 'SKILL_RESULT',
                    roleId: 'hacker',
                    message: '💻 Glitch Shuffle: สุ่มสลับไพ่ในมือของผู้เล่นทุกคนบนโต๊ะใหม่ทั้งหมดสำเร็จ!'
                });

                broadcastToRoom(room, {
                    type: 'ROLE_SKILL_ACTIVATED',
                    playerId: player.id,
                    playerName: player.name,
                    roleId: 'hacker',
                    message: `💻 ${player.name} (The Hacker) ใช้สกิลสลับป่วนระบบ สุ่มสลับไพ่ในมือของผู้เล่นทุกคนบนโต๊ะใหม่ทั้งหมด!`
                });

                broadcastToRoom(room, {
                    type: 'PLAYERS_UPDATED',
                    players: getSanitizedPlayers(room.players)
                });
            } else if (role.id === 'gambler') {
                ws.send(JSON.stringify({
                    type: 'ROLE_SKILL_INFO',
                    message: '🎲 สกิล Gambler เป็นสกิลติดตัว ทำงานอัตโนมัติเมื่อกด CALL BLUFF (ทายถูกได้ +1 HP ❤️ / ทายผิดสุ่มทำลายไอเทม 1 ชิ้นในมือ หรือเสีย 1 HP แทนเมื่อไม่มีไอเทม)'
                }));
            }
            break;
        }

        case 'USE_ITEM': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.state !== 'PLAYING') return;

            const player = room.players.find(p => p.id === clientId);
            if (!player || player.hp <= 0) return;

            const item = player.items ? player.items.find(it => (it.id === data.itemId || it.uid === data.itemId || (data.itemUid && it.uid === data.itemUid)) && !it.used) : null;
            if (!item) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'คุณไม่มีไอเทมนี้หรือไอเทมนี้ถูกใช้ไปแล้ว!' }));
                return;
            }

            const pIdx = room.players.indexOf(player);
            const isOwnTurn = (room.turnIndex === pIdx);

            if (item.id === 'steal_hp') {
                if (!isOwnTurn) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้ได้เฉพาะในเทิร์นของตัวเองเท่านั้น!' }));
                    return;
                }
                const target = room.players.find(p => p.id === data.targetId);
                if (!target || target.hp <= 0 || target.id === player.id) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'เป้าหมายไม่ถูกต้อง!' }));
                    return;
                }
                if (target.hp <= 1) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'ไม่สามารถขโมย HP ของผู้เล่นที่เหลือ HP ≤ 1 ได้!' }));
                    return;
                }
                item.used = true;
                target.hp = Math.max(0, target.hp - 1);
                player.hp = Math.min(3, player.hp + 1);
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'steal_hp',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    targetId: target.id,
                    targetName: target.name,
                    targetAvatar: target.avatar,
                    message: `🩸 ${player.name} ใช้ไอเทมขโมย 1 HP จาก ${target.name}!`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            } else if (item.id === 'freeze_player') {
                if (!isOwnTurn) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้ได้เฉพาะในเทิร์นของตัวเองเท่านั้น!' }));
                    return;
                }
                const target = room.players.find(p => p.id === data.targetId);
                if (!target || target.hp <= 0 || target.id === player.id) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'เป้าหมายไม่ถูกต้อง!' }));
                    return;
                }
                item.used = true;
                target.isFrozen = true;
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'freeze_player',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    targetId: target.id,
                    targetName: target.name,
                    targetAvatar: target.avatar,
                    message: `❄️ ${player.name} ใช้ไอเทมแช่แข็งระงับเทิร์น ${target.name} 1 รอบ!`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            } else if (item.id === 'reverse_turn') {
                if (!isOwnTurn) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้ได้เฉพาะในเทิร์นของตัวเองเท่านั้น!' }));
                    return;
                }
                item.used = true;
                room.turnDirection = (room.turnDirection === 1) ? -1 : 1;
                const dirName = room.turnDirection === 1 ? 'ตามเข็มนาฬิกา' : 'ทวนเข็มนาฬิกา';
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'reverse_turn',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    message: `🔄 ${player.name} ใช้ไอเทมสลับทิศทางเทิร์น! (${dirName})`
                });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            } else if (item.id === 'single_card_curse') {
                if (!isOwnTurn) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้ได้เฉพาะในเทิร์นของตัวเองเท่านั้น!' }));
                    return;
                }
                const target = room.players.find(p => p.id === data.targetId);
                if (!target || target.id === player.id || target.hp <= 0) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'กรุณาเลือกผู้เล่นฝั่งตรงข้าม 1 คน!' }));
                    return;
                }
                item.used = true;
                target.isSingleCardCursed = true;
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'single_card_curse',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    targetId: target.id,
                    targetName: target.name,
                    targetAvatar: target.avatar,
                    message: `🔒 ${player.name} ใช้คำสาปใบเดียวใส่ ${target.name}! ${target.name} จะลงไพ่ได้เพียง 1 ใบเท่านั้นในตาถัดไป!`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            } else if (item.id === 'heal_hp') {
                if (player.hp >= 3) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'HP เต็ม 3 แล้ว ไม่สามารถฮีลเพิ่มได้!' }));
                    return;
                }
                item.used = true;
                player.hp = Math.min(3, player.hp + 1);
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'heal_hp',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    message: `💖 ${player.name} ใช้ยาฟื้นฟูหัวใจ +1 HP! (HP: ${player.hp}/3)`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            } else if (item.id === 'swap_hand') {
                if (!isOwnTurn) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'สามารถใช้ได้เฉพาะในเทิร์นของตัวเองเท่านั้น!' }));
                    return;
                }
                const target = room.players.find(p => p.id === data.targetId);
                if (!target || target.hp <= 0 || target.id === player.id) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'เป้าหมายไม่ถูกต้อง!' }));
                    return;
                }
                item.used = true;
                const tempHand = player.hand;
                player.hand = target.hand;
                target.hand = tempHand;
                sendToPlayer(player, { type: 'YOUR_HAND', hand: player.hand });
                sendToPlayer(target, { type: 'YOUR_HAND', hand: target.hand });
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'swap_hand',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    targetId: target.id,
                    targetName: target.name,
                    targetAvatar: target.avatar,
                    message: `🤹 ${player.name} สลับการ์ดทั้งหมดในมือกับ ${target.name}!`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
            } else if (item.id === 'bluff_shield') {
                item.used = true;
                player.shield = true;
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'bluff_shield',
                    userId: player.id,
                    userName: player.name,
                    userAvatar: player.avatar,
                    message: `🛡️ ${player.name} กางโล่ป้องกัน (Bluff Shield)! ป้องกันดาเมจจากการจับผิดครั้งถัดไป!`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                sendToPlayer(player, { type: 'YOUR_ITEMS_UPDATED', items: player.items });
            }
            break;
        }

        case 'RESET_TO_LOBBY': {
            const clientInfo = clientMap.get(ws);
            if (!clientInfo || !clientInfo.roomCode) return;
            const room = rooms.get(clientInfo.roomCode);
            if (!room || room.hostId !== clientId) return;

            stopTurnTimer(room);
            if (room.botTimeout) { clearTimeout(room.botTimeout); room.botTimeout = null; }
            if (room.roundTimeout) { clearTimeout(room.roundTimeout); room.roundTimeout = null; }
            if (room.forcedBluffTimeout) { clearTimeout(room.forcedBluffTimeout); room.forcedBluffTimeout = null; }
            if (room.transitionTimeout) { clearTimeout(room.transitionTimeout); room.transitionTimeout = null; }
            room.state = 'LOBBY';
            room.isProcessingBluff = false;
            room.players.sort((a, b) => (a.staticSeatIndex ?? 0) - (b.staticSeatIndex ?? 0));
            room.players.forEach(p => {
                p.hp = 3;
                p.hand = [];
                p.roleSkillUsed = false;
                p.shield = false;
                p.isFrozen = false;
                p.isSingleCardCursed = false;
                p.secretObjectiveCompleted = false;
                p.items = [];
                p.uncaughtBluffs = 0;
                p.successfulCalls = 0;
                p.blockedBluffTargetId = null;
                p.blockedBluffTurnIndex = null;
            });
            room.tablePile = [];
            room.lastPlayed = [];
            room.lastPlayerIdx = null;
            room.pendingIsBluff = false;
            room.pendingBluffPlayerIdx = null;
            room.forcedLastCardTargetId = null;
            room.eliminationOrder = [];

            broadcastToRoom(room, {
                type: 'RETURNED_TO_LOBBY',
                roomCode: room.code,
                mode: room.mode,
                players: getSanitizedPlayers(room.players),
                message: 'Returned to lobby! Ready for a new match.'
            });
            break;
        }

        case 'LEAVE_ROOM': {
            const clientInfo = clientMap.get(ws);
            if (clientInfo && clientInfo.roomCode) {
                handleClientLeave(ws, clientInfo.roomCode);
                clientInfo.roomCode = null;
                clientInfo.isHost = false;
            }
            break;
        }
    }
}

function triggerSecretObjectiveReward(room, player, rewardReason) {
    if (!player || player.hp <= 0 || player.secretObjectiveCompleted) return;
    player.secretObjectiveCompleted = true;
    player.hp = Math.min(3, player.hp + 1);
    player.shield = true;

    broadcastToRoom(room, {
        type: 'OBJECTIVE_REWARD',
        message: rewardReason,
        players: getSanitizedPlayers(room.players)
    });
}

function startRoomSeatDraft(room) {
    room.state = 'SEAT_SELECTION';
    const count = room.players.length;
    const orders = [];
    for (let i = 1; i <= count; i++) orders.push(i);
    orders.sort(() => Math.random() - 0.5);

    room.seatDraft = {
        cards: orders.map((ord, idx) => ({
            index: idx,
            order: ord,
            claimedBy: null
        })),
        timeLimit: 6,
        timer: null,
        botTimers: []
    };

    broadcastToRoom(room, {
        type: 'SEAT_SELECTION_STARTED',
        timeLimit: 6,
        cardCount: count,
        playerCount: count
    });

    // Schedule bot claims if there are bots in room
    room.players.forEach(p => {
        if (p.isBot) {
            const botDelay = 800 + Math.random() * 1600;
            const bTimer = setTimeout(() => {
                if (room.state !== 'SEAT_SELECTION' || !room.seatDraft) return;
                const unclaimed = room.seatDraft.cards.filter(c => !c.claimedBy);
                if (unclaimed.length > 0) {
                    const pickedCard = unclaimed[Math.floor(Math.random() * unclaimed.length)];
                    pickedCard.claimedBy = { id: p.id, name: p.name, avatar: p.avatar };
                    broadcastToRoom(room, {
                        type: 'SEAT_CARD_CLAIMED',
                        cardIndex: pickedCard.index,
                        player: { id: p.id, name: p.name, avatar: p.avatar }
                    });
                    checkSeatDraftFinished(room);
                }
            }, botDelay);
            room.seatDraft.botTimers.push(bTimer);
        }
    });

    // Timeout fallback if someone is AFK
    room.seatDraft.timer = setTimeout(() => {
        if (room.state === 'SEAT_SELECTION') {
            finishSeatDraft(room);
        }
    }, 6500);
}

function checkSeatDraftFinished(room) {
    if (!room.seatDraft) return;
    const claimedCount = room.seatDraft.cards.filter(c => c.claimedBy !== null).length;
    if (claimedCount >= room.players.length) {
        finishSeatDraft(room);
    }
}

function finishSeatDraft(room) {
    if (!room.seatDraft || room.state !== 'SEAT_SELECTION') return;
    clearTimeout(room.seatDraft.timer);
    room.seatDraft.botTimers.forEach(t => clearTimeout(t));

    // Assign any players who didn't pick
    room.players.forEach(p => {
        const hasPicked = room.seatDraft.cards.some(c => c.claimedBy && c.claimedBy.id === p.id);
        if (!hasPicked) {
            const unclaimed = room.seatDraft.cards.find(c => !c.claimedBy);
            if (unclaimed) {
                unclaimed.claimedBy = { id: p.id, name: p.name, avatar: p.avatar };
            }
        }
    });

    // Map each player to their card order
    room.players.forEach(p => {
        const card = room.seatDraft.cards.find(c => c.claimedBy && c.claimedBy.id === p.id);
        p.draftOrder = card ? card.order : 4;
    });

    // Sort players by drafted order (rank 1 goes first)
    room.players.sort((a, b) => a.draftOrder - b.draftOrder);

    broadcastToRoom(room, {
        type: 'SEAT_SELECTION_RESULT',
        cards: room.seatDraft.cards.map(c => ({
            index: c.index,
            order: c.order,
            claimedBy: c.claimedBy
        })),
        firstPlayer: room.players[0],
        players: getSanitizedPlayers(room.players)
    });

    // Transition to the playing arena after clients see the 3D flip animation
    if (room.transitionTimeout) clearTimeout(room.transitionTimeout);
    room.transitionTimeout = setTimeout(() => {
        room.transitionTimeout = null;
        if (room.state === 'SEAT_SELECTION') {
            startRoomNewRound(room, true);
        }
    }, 2800);
}

function startRoomNewRound(room, isFullReset = false) {
    room.state = 'PLAYING';

    // Clear Freeze Turn, Single Card Curse and Inspector bluff blocks on all players when round finishes / new round begins
    room.players.forEach(p => {
        p.isFrozen = false;
        p.isSingleCardCursed = false;
        p.blockedBluffTargetId = null;
        p.blockedBluffTurnIndex = null;
    });

    // Assign Roles and Secret Objectives on new game (isFullReset)
    if (isFullReset) {
        const shuffledRoles = [...DECEPTION_ROLES].sort(() => Math.random() - 0.5);
        const shuffledObjs = [...SECRET_OBJECTIVES].sort(() => Math.random() - 0.5);
        const itemDeck = createItemDeck();

        room.turnDirection = 1;
        room.singleCardCurseActive = false;
        room.eliminationOrder = [];

        room.players.forEach((p, idx) => {
            p.hp = 3;
            p.role = shuffledRoles[idx % shuffledRoles.length];
            p.shield = false;
            p.isFrozen = false;
            p.items = [itemDeck.pop(), itemDeck.pop()];
            p.roleSkillUsed = false;
            p.secretObjectiveCompleted = false;
            p.secretObjective = {
                ...shuffledObjs[idx % shuffledObjs.length],
                progress: 0
            };
            p.suspicion = { rate: 50, bluffs: 0, truths: 0, totalPlays: 0 };
            p.uncaughtBluffs = 0;
            p.caughtCount = 0;
        });

        // Set left target player for POINT_THIEF
        room.players.forEach((p, idx) => {
            if (p.secretObjective && p.secretObjective.id === 'point_thief') {
                const leftIdx = (idx + 1) % room.players.length;
                p.secretObjective.targetPlayerId = room.players[leftIdx].id;
                p.secretObjective.targetPlayerName = room.players[leftIdx].name;
                p.secretObjective.descTh = `หากทำให้ ${room.players[leftIdx].name} (ฝั่งซ้าย) ถูกจับโกหกจน HP หมดสิ้น คุณจะได้รับฟื้นฟู +1 หัวใจ ❤️ และโล่ป้องกัน 🛡️!`;
            }
        });
    }

    // Dynamic Rule for this round
    if (room.mode === 'FULL_DECK' || !room.mode) {
        const rulesList = [DYNAMIC_RULES[0], DYNAMIC_RULES[1], DYNAMIC_RULES[2], DYNAMIC_RULES[3]];
        room.dynamicRule = rulesList[Math.floor(Math.random() * rulesList.length)];
    } else {
        room.dynamicRule = DYNAMIC_RULES[3]; // Standard Duel
    }

    // Deck & Full Deck draw pile
    const deckMultiplier = (room.mode === 'FULL_DECK' || !room.mode) ? 2 : 1;
    const fullDeck = createDeck(deckMultiplier, room.mode);

    room.players.forEach((p, idx) => {
        if (p.hp > 0) {
            p.hand = fullDeck.slice(idx * 6, (idx + 1) * 6);
        } else {
            p.hand = [];
        }
    });

    room.drawPile = fullDeck.slice(room.players.length * 6);
    if ((room.mode === 'FULL_DECK' || !room.mode) && room.drawPile.length < 20) {
        room.drawPile.push(...createDeck(1, room.mode));
    }

    const availableRanks = getRanksForMode(room.mode);
    room.targetRank = (room.mode === 'FULL_DECK' || !room.mode) ? '2' : availableRanks[Math.floor(Math.random() * availableRanks.length)];
    room.lastPlayedTargetRank = null;
    room.tablePile = [];
    room.lastPlayed = [];
    room.lastPlayerIdx = null;
    room.pendingIsBluff = false;
    room.pendingBluffPlayerIdx = null;
    room.turnIndex = 0;

    // Skip eliminated host
    while (room.players[room.turnIndex] && room.players[room.turnIndex].hp <= 0) {
        room.turnIndex = (room.turnIndex + 1) % room.players.length;
    }

    broadcastToRoom(room, {
        type: 'GAME_STARTED',
        roomCode: room.code,
        mode: room.mode || 'FULL_DECK',
        dynamicRule: room.dynamicRule,
        targetRank: room.targetRank,
        turnIndex: room.turnIndex,
        tablePileCount: 0,
        drawPileCount: room.drawPile.length,
        players: getSanitizedPlayers(room.players)
    });

    // Send private hands, role, and secret objective to each player
    room.players.forEach(p => {
        sendToPlayer(p, {
            type: 'YOUR_HAND',
            hand: p.hand || [],
            targetRank: room.targetRank,
            role: p.role,
            items: p.items || [],
            secretObjective: p.secretObjective,
            shield: !!p.shield,
            roleSkillUsed: !!p.roleSkillUsed
        });
    });

    console.log(`[ROUND STARTED] Room: ${room.code} Target: TABLE ${room.targetRank} Rule: ${room.dynamicRule.nameTh}`);
    startTurnTimer(room);
    checkAndExecuteBotTurn(room);
}

function advanceTurn(room) {
    const prevTurnPlayer = room.players[room.turnIndex];
    if (prevTurnPlayer) {
        prevTurnPlayer.blockedBluffTargetId = null;
        prevTurnPlayer.blockedBluffTurnIndex = null;
    }

    let loopCount = 0;
    const dir = room.turnDirection || 1;
    do {
        room.turnIndex = (room.turnIndex + dir + room.players.length) % room.players.length;
        loopCount++;
    } while (room.players[room.turnIndex].hp <= 0 && loopCount < room.players.length);

    // Skip frozen player
    const curP = room.players[room.turnIndex];
    if (curP && curP.isFrozen) {
        curP.isFrozen = false;
        broadcastToRoom(room, {
            type: 'PLAYER_FROZEN_SKIPPED',
            playerId: curP.id,
            playerName: curP.name,
            message: `❄️ ${curP.name} ถูกแช่แข็ง ข้ามเทิร์น 1 รอบ!`
        });
        broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
        advanceTurn(room);
        return;
    }
}

const TURN_DURATION_SECONDS = 45;

function stopTurnTimer(room) {
    if (room && room.turnTimer) {
        clearInterval(room.turnTimer);
        room.turnTimer = null;
    }
}

function startTurnTimer(room) {
    stopTurnTimer(room);
    if (!room || room.state !== 'PLAYING') return;

    room.turnTimeRemaining = TURN_DURATION_SECONDS;

    broadcastToRoom(room, {
        type: 'TURN_TIMER_TICK',
        timeRemaining: room.turnTimeRemaining,
        turnIndex: room.turnIndex,
        targetRank: room.targetRank,
        totalTime: TURN_DURATION_SECONDS
    });

    room.turnTimer = setInterval(() => {
        if (!room || room.state !== 'PLAYING') {
            stopTurnTimer(room);
            return;
        }

        room.turnTimeRemaining--;

        if (room.turnTimeRemaining > 0) {
            broadcastToRoom(room, {
                type: 'TURN_TIMER_TICK',
                timeRemaining: room.turnTimeRemaining,
                turnIndex: room.turnIndex,
                targetRank: room.targetRank,
                totalTime: TURN_DURATION_SECONDS
            });
        } else {
            stopTurnTimer(room);
            handleTurnTimeout(room);
        }
    }, 1000);
}

function checkRoomEliminations(room) {
    if (!room.eliminationOrder) room.eliminationOrder = [];
    room.players.forEach(p => {
        if (p.hp <= 0 && !room.eliminationOrder.includes(p.id)) {
            room.eliminationOrder.push(p.id);
        }
    });
}

function buildRoomStandings(room, winner) {
    checkRoomEliminations(room);
    const totalPlayers = room.players.length;
    const standings = [];

    // 1st place: Last survivor / Winner
    if (winner) {
        standings.push({
            id: winner.id,
            name: winner.name,
            avatar: winner.avatar,
            hp: typeof winner.hp === 'number' ? winner.hp : 3,
            rank: 1,
            isWinner: true,
            eliminationIndex: 0
        });
    }

    const eliminatedIds = [...(room.eliminationOrder || [])];

    // Ensure all players other than winner are accounted for
    room.players.forEach(p => {
        if ((!winner || p.id !== winner.id) && !eliminatedIds.includes(p.id)) {
            eliminatedIds.push(p.id);
        }
    });

    const reversedEliminated = [...eliminatedIds].reverse();
    reversedEliminated.forEach((pid) => {
        if (winner && pid === winner.id) return;
        const p = room.players.find(pl => pl.id === pid);
        if (!p) return;
        const elimIndex = eliminatedIds.indexOf(pid) + 1; // 1 = eliminated first
        const rank = Math.max(2, totalPlayers - elimIndex + 1);
        standings.push({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            hp: Math.max(0, p.hp || 0),
            rank: rank,
            eliminationIndex: elimIndex,
            isWinner: false
        });
    });

    // Fallback: Ensure all players on the board are included in standings
    room.players.forEach(p => {
        if (!standings.some(s => s.id === p.id || s.name === p.name)) {
            standings.push({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                hp: Math.max(0, p.hp || 0),
                rank: standings.length + 1,
                isWinner: false
            });
        }
    });

    standings.sort((a, b) => a.rank - b.rank);
    // Renumber sequential ranks (1st, 2nd, 3rd, 4th)
    standings.forEach((s, idx) => {
        s.rank = idx + 1;
    });
    return standings;
}

function handleTurnTimeout(room) {
    if (!room || room.state !== 'PLAYING') return;

    const timedOutPlayer = room.players[room.turnIndex];
    if (!timedOutPlayer) return;

    // Deduct 1 HP heart
    timedOutPlayer.hp = Math.max(0, timedOutPlayer.hp - 1);
    const isEliminated = timedOutPlayer.hp <= 0;

    checkRoomEliminations(room);

    console.log(`[TIMEOUT] Room: ${room.code} Player: ${timedOutPlayer.name} ran out of time! Remaining HP: ${timedOutPlayer.hp}`);

    broadcastToRoom(room, {
        type: 'PLAYER_TIMEOUT',
        playerId: timedOutPlayer.id,
        playerName: timedOutPlayer.name,
        playerAvatar: timedOutPlayer.avatar,
        hp: timedOutPlayer.hp,
        isEliminated: isEliminated,
        message: `${timedOutPlayer.name} หมดเวลา 45 วินาที! โดนตัดหัวใจ 1 ดวง (${timedOutPlayer.name} ran out of time and lost 1 heart!)`,
        players: getSanitizedPlayers(room.players)
    });

    // Check if game is over (1 or 0 alive players)
    const alivePlayers = room.players.filter(p => p.hp > 0);
    if (alivePlayers.length <= 1) {
        stopTurnTimer(room);
        if (room.botTimeout) { clearTimeout(room.botTimeout); room.botTimeout = null; }
        if (room.roundTimeout) { clearTimeout(room.roundTimeout); room.roundTimeout = null; }
        const winner = alivePlayers[0] || timedOutPlayer;
        const standings = buildRoomStandings(room, winner);
        broadcastToRoom(room, {
            type: 'GAME_OVER',
            winner: {
                id: winner.id,
                name: winner.name,
                avatar: winner.avatar,
                title: winner.title || 'Ultimate Survivor'
            },
            standings: standings,
            players: getSanitizedPlayers(room.players)
        });
        room.state = 'LOBBY';
        return;
    }

    // Advance turn to next alive player
    advanceTurn(room);

    broadcastToRoom(room, {
        type: 'TURN_CHANGED',
        nextTurnIndex: room.turnIndex,
        targetRank: room.targetRank,
        players: getSanitizedPlayers(room.players)
    });

    startTurnTimer(room);
    checkAndExecuteBotTurn(room);
}

function executeBluffChallenge(room, challenger) {
    if (room.isProcessingBluff) return;
    room.isProcessingBluff = true;

    const accused = room.players[room.lastPlayerIdx];
    if (!accused) {
        room.isProcessingBluff = false;
        return;
    }
    const targetRank = room.lastPlayedTargetRank || room.targetRank;
    const revealed = room.lastPlayed.map(c => c.rank);

    const isLying = room.lastPlayed.some(c => c.rank !== targetRank && c.rank !== 'JOKER');
    let loser = isLying ? accused : challenger;

    const wasForcedLastCard = (room.forcedLastCardTargetId === accused.id || accused.hand.length === 0);
    room.forcedLastCardTargetId = null;

    // Track Suspicion & stats for accused
    accused.suspicion = accused.suspicion || { rate: 50, bluffs: 0, truths: 0, totalPlays: 0 };
    accused.suspicion.totalPlays = (accused.suspicion.totalPlays || 0) + 1;
    if (isLying) {
        accused.suspicion.bluffs = (accused.suspicion.bluffs || 0) + 1;
        accused.caughtCount = (accused.caughtCount || 0) + 1;
    } else {
        accused.suspicion.truths = (accused.suspicion.truths || 0) + 1;
    }
    const totalVerified = accused.suspicion.bluffs + accused.suspicion.truths;
    accused.suspicion.rate = Math.round((accused.suspicion.bluffs / totalVerified) * 100);

    let damage = 1;
    let specialNotes = [];

    // Forced Last Card notes
    if (wasForcedLastCard) {
        if (isLying) {
            specialNotes.push(`🚨 บลัฟแตกตอนไพ่หมดมือ! ${accused.name} โกหกในไพ่ใบสุดท้าย จึงไม่ชนะในรอบนี้และถูกลงโทษ! (Last Card Bluff Caught!)`);
        } else {
            specialNotes.push(`🎉 ซื่อสัตย์จนใบสุดท้าย! ${accused.name} ลงไพ่จริงจนหมดมือและชนะในรอบนี้! (${accused.name} played TRUTH on last card and won the round!)`);
        }
    }

    // Gambler Bet Skill: Triggers when challenger is Gambler
    if (challenger.role && challenger.role.id === 'gambler') {
        if (isLying) {
            // Call bluff SUCCESSFUL: Gambler restores 1 HP
            challenger.hp = Math.min(3, challenger.hp + 1);
            specialNotes.push(`🎲 สกิล Gambler: ทายถูก! จับโกหกสำเร็จ ${challenger.name} ได้รับการฟื้นฟู 1 HP! ❤️ (HP: ${challenger.hp}/3)`);
        } else {
            // Call bluff UNSUCCESSFUL: Randomly destroy 1 unused item in hand, or destroy HP if no items left
            const unusedItems = (challenger.items || []).filter(it => !it.used);
            if (unusedItems.length > 0) {
                const randIdx = Math.floor(Math.random() * unusedItems.length);
                const destroyedItem = unusedItems[randIdx];
                destroyedItem.used = true;
                damage = 0; // Item destroyed instead of HP!
                const itemName = destroyedItem.nameTh || destroyedItem.name;
                specialNotes.push(`🎲 สกิล Gambler: ทายผิด! สุ่มทำลายไอเทม [${itemName}] ในมือของ ${challenger.name} แทนการเสียพลังชีวิต!`);
                sendToPlayer(challenger, { type: 'YOUR_ITEMS_UPDATED', items: challenger.items });
            } else {
                damage = 1; // No items left -> destroy HP instead!
                specialNotes.push(`🎲 สกิล Gambler: ทายผิดและไม่มีไอเทมเหลือในมือ! ${challenger.name} เสียพลังชีวิต 1 HP แทน!`);
            }
        }
    }

    // Reaction Item: Reflect Damage
    const otherParty = (accused.id === loser.id) ? challenger : accused;
    const reflectItem = (loser.items || []).find(it => it.id === 'reflect_damage' && !it.used);
    if (reflectItem && otherParty && otherParty.hp > 1 && damage > 0) {
        reflectItem.used = true;
        const reflectMsg = `🪞 สะท้อนดาเมจ! ${loser.name} ใช้กระจกสะท้อนดาเมจ ${damage} HP กลับไปหา ${otherParty.name}!`;
        specialNotes.push(reflectMsg);
        broadcastToRoom(room, {
            type: 'ITEM_USED',
            itemId: 'reflect_damage',
            userId: loser.id,
            userName: loser.name,
            userAvatar: loser.avatar,
            targetId: otherParty.id,
            targetName: otherParty.name,
            targetAvatar: otherParty.avatar,
            message: reflectMsg
        });
        sendToPlayer(loser, { type: 'YOUR_ITEMS_UPDATED', items: loser.items });
        loser = otherParty;
    }

    // Reaction Item: Bluff Shield
    const bluffShieldItem = (loser.items || []).find(it => it.id === 'bluff_shield' && !it.used);
    let shieldUsed = false;
    if (bluffShieldItem && damage > 0) {
        bluffShieldItem.used = true;
        damage = 0;
        shieldUsed = true;
        const shieldMsg = `🛡️ มนต์กำบังจับผิด! ${loser.name} ใช้ Bluff Shield ดูดซับดาเมจ ไม่เสียหัวใจในรอบนี้!`;
        specialNotes.push(shieldMsg);
        broadcastToRoom(room, {
            type: 'ITEM_USED',
            itemId: 'bluff_shield',
            userId: loser.id,
            userName: loser.name,
            userAvatar: loser.avatar,
            message: shieldMsg
        });
        sendToPlayer(loser, { type: 'YOUR_ITEMS_UPDATED', items: loser.items });
    }

    // Inspector Shield / Objective Shield: If loser has shield active, absorb damage!
    if (loser.shield && damage > 0) {
        loser.shield = false;
        shieldUsed = true;
        damage = 0;
        specialNotes.push(`🛡️ โล่ป้องกัน ป้องกันความเสียหายให้กับ ${loser.name}!`);
    } else if (damage > 0) {
        loser.hp = Math.max(0, loser.hp - damage);
    }

    // 4. Penalty Draw in Full Deck Mode (or when liar emptied hand):
    let penaltyDrawCount = 0;
    if (((room.mode === 'FULL_DECK' || !room.mode) || wasForcedLastCard) && loser.hp > 0) {
        penaltyDrawCount = Math.floor(Math.random() * 2) + 2; // 2-3 cards
        if (!room.drawPile || room.drawPile.length < penaltyDrawCount) {
            room.drawPile = room.drawPile || [];
            room.drawPile.push(...createDeck(1, room.mode));
        }
        for (let i = 0; i < penaltyDrawCount; i++) {
            loser.hand.push(room.drawPile.pop());
        }
        sendToPlayer(loser, {
            type: 'YOUR_HAND',
            hand: loser.hand,
            penaltyNotice: `🚨 โดนจั่วไพ่ลงโทษ ${penaltyDrawCount} ใบ!`
        });
        specialNotes.push(`🚨 Penalty Draw: ${loser.name} ถูกลงโทษจั่วไพ่เพิ่ม ${penaltyDrawCount} ใบเข้ามือ!`);
    }

    // 5. Secret Objective Checks for Bonus Rewards (does NOT end game prematurely)
    // Check POINT_THIEF
    room.players.forEach(p => {
        if (p.secretObjective && p.secretObjective.id === 'point_thief' && p.hp > 0 && !p.secretObjectiveCompleted) {
            const targetP = room.players.find(tp => tp.id === p.secretObjective.targetPlayerId);
            if (targetP && targetP.hp <= 0 && loser.id === targetP.id) {
                p.secretObjectiveCompleted = true;
                p.hp = Math.min(3, p.hp + 1);
                p.shield = true;
                specialNotes.push(`🗡️ ภารกิจลับสำเร็จ: โจรขโมยแต้ม! ${p.name} กำจัด ${targetP.name} สำเร็จ! ได้รับฟื้นฟู 1 หัวใจ ❤️ และโล่ป้องกัน 🛡️!`);
            }
        }
    });

    // Check SILENT_CON
    room.players.forEach(p => {
        if (p.secretObjective && p.secretObjective.id === 'silent_con' && p.hp > 0 && !p.secretObjectiveCompleted) {
            if (p.hand.length === 0 && (p.caughtCount || 0) === 0) {
                p.secretObjectiveCompleted = true;
                p.hp = Math.min(3, p.hp + 1);
                p.shield = true;
                specialNotes.push(`🎭 ภารกิจลับสำเร็จ: นักต้มตุ๋นเงียบ! ${p.name} ไพ่หมดมือโดยไม่เคยโดนจับโกหก! ได้รับฟื้นฟู 1 หัวใจ ❤️ และโล่ป้องกัน 🛡️!`);
            }
        }
    });

    // GAME ENDS ONLY WHEN ONLY 1 SURVIVOR REMAINS ALIVE
    checkRoomEliminations(room);
    const alivePlayers = room.players.filter(p => p.hp > 0);
    const isGameOver = alivePlayers.length <= 1;
    const winner = isGameOver ? (alivePlayers[0] || challenger) : null;
    const victoryReason = isGameOver ? '👑 ผู้รอดชีวิตคนสุดท้าย (Last Survivor Standing)' : '';
    const standings = isGameOver ? buildRoomStandings(room, winner) : [];

    broadcastToRoom(room, {
        type: 'BLUFF_RESULT',
        challenger: { name: challenger.name, avatar: challenger.avatar },
        accused: { name: accused.name, avatar: accused.avatar },
        isLying,
        targetRank,
        revealed,
        loser: {
            name: loser.name,
            hp: loser.hp,
            shieldUsed,
            damage,
            penaltyDrawCount
        },
        specialNotes,
        isGameOver,
        victoryReason,
        winner: winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, charId: winner.charId } : null,
        standings: standings,
        players: getSanitizedPlayers(room.players)
    });

    if (wasForcedLastCard && !isLying) {
        broadcastToRoom(room, {
            type: 'ROUND_WINNER',
            winner: { id: accused.id, name: accused.name, avatar: accused.avatar },
            message: `${accused.name} played all cards truthfully and won the round! Re-dealing new cards...`
        });
    }

    room.tablePile = [];
    room.lastPlayed = [];
    room.lastPlayerIdx = null;
    room.pendingIsBluff = false;
    room.pendingBluffPlayerIdx = null;
    room.isProcessingBluff = false;

    // Reset Freeze Turn, Single Card Curse and bluff blocks on all players when round finishes
    room.players.forEach(p => {
        p.isFrozen = false;
        p.isSingleCardCursed = false;
        p.blockedBluffTargetId = null;
        p.blockedBluffTurnIndex = null;
    });
    broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });

    if (isGameOver) {
        stopTurnTimer(room);
        if (room.botTimeout) { clearTimeout(room.botTimeout); room.botTimeout = null; }
        if (room.roundTimeout) { clearTimeout(room.roundTimeout); room.roundTimeout = null; }
        room.state = 'LOBBY';

        // Guaranteed GAME_OVER broadcast after bluff reveal animation completes
        setTimeout(() => {
            broadcastToRoom(room, {
                type: 'GAME_OVER',
                winner: winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, title: winner.title || 'Ultimate Survivor' } : null,
                standings: standings,
                players: getSanitizedPlayers(room.players)
            });
        }, 3500);
        return;
    }

    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    room.roundTimeout = setTimeout(() => {
        room.roundTimeout = null;
        if (room.state !== 'PLAYING') return;
        startRoomNewRound(room, false);
    }, 4500);
}

function checkAndExecuteBotTurn(room) {
    if (room.state !== 'PLAYING') return;
    const bot = room.players[room.turnIndex];
    if (!bot || !bot.isBot || bot.hp <= 0) return;

    if (room.botTimeout) clearTimeout(room.botTimeout);
    room.botTimeout = setTimeout(() => {
        room.botTimeout = null;
        if (room.state !== 'PLAYING') return;
        if (room.turnIndex !== room.players.indexOf(bot)) return;

        // Bot skill usage
        if (bot.role && !bot.roleSkillUsed) {
            if (bot.role.id === 'trickster') {
                const hasMatching = bot.hand.some(c => c.rank === room.targetRank || c.rank === 'JOKER');
                if (!hasMatching && bot.hand.length > 0) {
                    bot.hand[0].rank = room.targetRank;
                    bot.roleSkillUsed = true;
                    // Trickster skill is secret: do NOT broadcast to room
                }
            } else if (bot.role.id === 'hacker' && Math.random() < 0.35) {
                const activePlayersWithCards = room.players.filter(p => p.hp > 0 && p.hand && p.hand.length > 0);
                let pool = [];
                const counts = [];
                for (const p of activePlayersWithCards) {
                    counts.push(p.hand.length);
                    pool.push(...p.hand);
                }
                if (pool.length >= 2) {
                    bot.roleSkillUsed = true;
                    for (let i = pool.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [pool[i], pool[j]] = [pool[j], pool[i]];
                    }
                    let offset = 0;
                    for (let i = 0; i < activePlayersWithCards.length; i++) {
                        const p = activePlayersWithCards[i];
                        const count = counts[i];
                        p.hand = pool.slice(offset, offset + count);
                        offset += count;
                        sendToPlayer(p, {
                            type: 'YOUR_HAND',
                            hand: p.hand,
                            role: p.role,
                            roleSkillUsed: p.roleSkillUsed,
                            skillNotice: `💻 ถูกแฮก! ${bot.name} (The Hacker) สุ่มสลับไพ่ในมือของทุกคนบนโต๊ะใหม่ทั้งหมด!`
                        });
                    }
                    broadcastToRoom(room, {
                        type: 'ROLE_SKILL_ACTIVATED',
                        playerId: bot.id,
                        playerName: bot.name,
                        roleId: 'hacker',
                        message: `💻 ${bot.name} (The Hacker) ใช้สกิลสลับป่วนระบบ สุ่มสลับไพ่ในมือของทุกคนบนโต๊ะใหม่ทั้งหมด!`
                    });
                    broadcastToRoom(room, {
                        type: 'PLAYERS_UPDATED',
                        players: getSanitizedPlayers(room.players)
                    });
                }
            }
        }

        // Bot item usage
        if (bot.items && bot.items.length > 0) {
            // Heal HP if low
            const healItem = bot.items.find(it => it.id === 'heal_hp' && !it.used);
            if (healItem && bot.hp < 3) {
                healItem.used = true;
                bot.hp = Math.min(3, bot.hp + 1);
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'heal_hp',
                    userId: bot.id,
                    userName: bot.name,
                    userAvatar: bot.avatar,
                    message: `💖 ${bot.name} ใช้ยาฟื้นฟูหัวใจ +1 HP! (HP: ${bot.hp}/3)`
                });
                broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
            }

            // Steal HP from an opponent with > 1 HP
            const stealItem = bot.items.find(it => it.id === 'steal_hp' && !it.used);
            if (stealItem && bot.hp < 3) {
                const candidates = room.players.filter(p => p.id !== bot.id && p.hp > 1);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    stealItem.used = true;
                    target.hp = Math.max(0, target.hp - 1);
                    bot.hp = Math.min(3, bot.hp + 1);
                    broadcastToRoom(room, {
                        type: 'ITEM_USED',
                        itemId: 'steal_hp',
                        userId: bot.id,
                        userName: bot.name,
                        userAvatar: bot.avatar,
                        targetId: target.id,
                        targetName: target.name,
                        targetAvatar: target.avatar,
                        message: `🩸 ${bot.name} ใช้ไอเทมขโมย 1 HP จาก ${target.name}!`
                    });
                    broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                }
            }

            // Freeze player
            const freezeItem = bot.items.find(it => it.id === 'freeze_player' && !it.used);
            if (freezeItem && Math.random() < 0.4) {
                const candidates = room.players.filter(p => p.id !== bot.id && p.hp > 0 && !p.isFrozen);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    freezeItem.used = true;
                    target.isFrozen = true;
                    broadcastToRoom(room, {
                        type: 'ITEM_USED',
                        itemId: 'freeze_player',
                        userId: bot.id,
                        userName: bot.name,
                        userAvatar: bot.avatar,
                        targetId: target.id,
                        targetName: target.name,
                        targetAvatar: target.avatar,
                        message: `❄️ ${bot.name} ใช้ไอเทมแช่แข็งระงับเทิร์น ${target.name} 1 รอบ!`
                    });
                    broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                }
            }

            // Single card curse
            const curseItem = bot.items.find(it => it.id === 'single_card_curse' && !it.used);
            if (curseItem && Math.random() < 0.4) {
                const candidates = room.players.filter(p => p.id !== bot.id && p.hp > 0 && !p.isSingleCardCursed);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    curseItem.used = true;
                    target.isSingleCardCursed = true;
                    broadcastToRoom(room, {
                        type: 'ITEM_USED',
                        itemId: 'single_card_curse',
                        userId: bot.id,
                        userName: bot.name,
                        userAvatar: bot.avatar,
                        targetId: target.id,
                        targetName: target.name,
                        targetAvatar: target.avatar,
                        message: `🔒 ${bot.name} ใช้คำสาปใบเดียวใส่ ${target.name}! ${target.name} จะลงไพ่ได้เพียง 1 ใบเท่านั้นในตาถัดไป!`
                    });
                    broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                }
            }

            // Reverse turn
            const reverseItem = bot.items.find(it => it.id === 'reverse_turn' && !it.used);
            if (reverseItem && Math.random() < 0.25) {
                reverseItem.used = true;
                room.turnDirection = (room.turnDirection === 1) ? -1 : 1;
                const dirName = room.turnDirection === 1 ? 'ตามเข็มนาฬิกา' : 'ทวนเข็มนาฬิกา';
                broadcastToRoom(room, {
                    type: 'ITEM_USED',
                    itemId: 'reverse_turn',
                    userId: bot.id,
                    userName: bot.name,
                    userAvatar: bot.avatar,
                    message: `🔄 ${bot.name} ใช้ไอเทมสลับทิศทางเทิร์น! (${dirName})`
                });
            }

            // Swap hands if bot has 4+ cards and opponent has <= 2
            const swapItem = bot.items.find(it => it.id === 'swap_hand' && !it.used);
            if (swapItem && bot.hand.length >= 4) {
                const candidates = room.players.filter(p => p.id !== bot.id && p.hp > 0 && p.hand && p.hand.length <= 2);
                if (candidates.length > 0) {
                    const target = candidates[0];
                    swapItem.used = true;
                    const tempHand = bot.hand;
                    bot.hand = target.hand;
                    target.hand = tempHand;
                    sendToPlayer(target, { type: 'YOUR_HAND', hand: target.hand });
                    broadcastToRoom(room, {
                        type: 'ITEM_USED',
                        itemId: 'swap_hand',
                        userId: bot.id,
                        userName: bot.name,
                        userAvatar: bot.avatar,
                        targetId: target.id,
                        targetName: target.name,
                        targetAvatar: target.avatar,
                        message: `🤹 ${bot.name} สลับการ์ดทั้งหมดในมือกับ ${target.name}!`
                    });
                    broadcastToRoom(room, { type: 'PLAYERS_UPDATED', players: getSanitizedPlayers(room.players) });
                }
            }
        }

        // Bot decision: Should call bluff?
        const lastCount = room.lastPlayed.length;
        let bluffChance = lastCount === 3 ? 0.45 : (lastCount === 2 ? 0.30 : 0.15);
        const claimedRank = room.lastPlayedTargetRank || room.targetRank;
        if (claimedRank) {
            const myCopies = bot.hand.filter(c => c.rank === claimedRank).length;
            if (myCopies + lastCount > 4) {
                bluffChance = 0.95; // Impossible to have > 4 copies, almost guaranteed bluff caught!
            }
        }

        const isBluffBlocked = (bot.blockedBluffTargetId && bot.blockedBluffTurnIndex === room.turnIndex);
        if (!isBluffBlocked && room.tablePile.length > 0 && room.lastPlayed.length > 0 && Math.random() < bluffChance) {
            stopTurnTimer(room);
            executeBluffChallenge(room, bot);
            return;
        }

        // Determine how many cards to play
        let maxCards = bot.isSingleCardCursed ? 1 : Math.min(bot.hand.length, Math.floor(Math.random() * 2) + 1);
        if (bot.isSingleCardCursed) {
            bot.isSingleCardCursed = false;
        }
        let countToPlay = Math.max(1, Math.min(bot.hand.length, maxCards));
        if (countToPlay <= 0) return;

        // Check Secret Objective: MASTER_BLUFF for previous player
        if (room.pendingIsBluff && room.pendingBluffPlayerIdx !== null) {
            const prevP = room.players[room.pendingBluffPlayerIdx];
            if (prevP && prevP.id !== bot.id) {
                prevP.uncaughtBluffs = (prevP.uncaughtBluffs || 0) + 1;
                if (prevP.secretObjective) {
                    prevP.secretObjective.progress = prevP.uncaughtBluffs;
                }
                if (prevP.uncaughtBluffs >= 3 && prevP.secretObjective && prevP.secretObjective.id === 'master_bluff' && !prevP.secretObjectiveCompleted) {
                    prevP.secretObjectiveCompleted = true;
                    prevP.hp = Math.min(3, prevP.hp + 1);
                    prevP.shield = true;
                    broadcastToRoom(room, {
                        type: 'OBJECTIVE_REWARD',
                        message: `🃏 ภารกิจลับสำเร็จ: จอมตบตา! ${prevP.name} บลัฟสำเร็จครบ 3 ครั้ง! ได้รับฟื้นฟู 1 หัวใจ ❤️ และโล่ป้องกัน 🛡️!`,
                        players: getSanitizedPlayers(room.players)
                    });
                }
            }
        }

        // Smart card selection for Bot:
        const matchingCards = bot.hand.filter(c => c.rank === room.targetRank || c.rank === 'JOKER');
        let cardsToPlay = [];
        if (matchingCards.length > 0 && Math.random() < 0.75) {
            cardsToPlay = matchingCards.slice(0, countToPlay);
        } else {
            const nonMatching = bot.hand.filter(c => c.rank !== room.targetRank && c.rank !== 'JOKER');
            cardsToPlay = (nonMatching.length >= countToPlay) ? nonMatching.slice(0, countToPlay) : bot.hand.slice(0, countToPlay);
        }
        bot.hand = bot.hand.filter(c => !cardsToPlay.some(cp => cp.id === c.id));

        const isCurrentBluff = cardsToPlay.some(c => c.rank !== room.targetRank && c.rank !== 'JOKER');
        room.pendingIsBluff = isCurrentBluff;
        room.pendingBluffPlayerIdx = room.turnIndex;
        room.lastPlayedTargetRank = room.targetRank; // Accused bot claimed this target rank
        room.tablePile.push(...cardsToPlay);
        room.lastPlayed = cardsToPlay;
        room.lastPlayerIdx = room.turnIndex;

        // Full Deck Rule: Bot also draws exactly 1 card when playing cards (regardless of whether 1-3 cards played)
        let botDrawnCount = 0;
        if (room.mode === 'FULL_DECK' || !room.mode) {
            const countToDraw = 1;
            if (!room.drawPile || room.drawPile.length < countToDraw + 10) {
                room.drawPile = room.drawPile || [];
                room.drawPile.push(...createDeck(1, room.mode));
            }
            for (let d = 0; d < countToDraw; d++) {
                if (room.drawPile.length > 0) {
                    const drawn = room.drawPile.pop();
                    bot.hand.push(drawn);
                    botDrawnCount++;
                }
            }
        }

        // Advance Ladder if Full Deck mode
        const botClaimedRank = room.lastPlayedTargetRank;
        if (room.mode === 'FULL_DECK' || !room.mode) {
            room.targetRank = getNextLadderRank(room.targetRank);
        }

        if (bot.hand.length === 0) {
            stopTurnTimer(room);
            advanceTurn(room);
            const nextP = room.players[room.turnIndex];

            room.forcedLastCardTargetId = bot.id;

            broadcastToRoom(room, {
                type: 'PLAYER_PLAYED_CARDS',
                playerId: bot.id,
                playerName: bot.name,
                playerAvatar: bot.avatar,
                count: cardsToPlay.length,
                drawnCount: botDrawnCount,
                claimedRank: botClaimedRank,
                targetRank: room.targetRank,
                tablePileCount: room.tablePile.length,
                drawPileCount: room.drawPile ? room.drawPile.length : 0,
                nextTurnIndex: room.turnIndex,
                lastPlayedSummary: `Played ${cardsToPlay.length} card(s) claiming [${botClaimedRank}]` + (botDrawnCount > 0 ? ` (Drawn ${botDrawnCount})` : '') + ((room.mode === 'FULL_DECK' || !room.mode) ? ` ➔ Next Ladder: [${room.targetRank}]` : ''),
                players: getSanitizedPlayers(room.players)
            });

            broadcastToRoom(room, {
                type: 'FORCED_BLUFF_ALERT',
                message: `🚨 LAST CARD! ${bot.name} เล่นไพ่หมดมือ! บังคับให้ ${nextP.name} CALL BLUFF ทันที! (Last Card - Forced Call Bluff!)`
            });

            if (room.forcedBluffTimeout) clearTimeout(room.forcedBluffTimeout);
            room.forcedBluffTimeout = setTimeout(() => {
                room.forcedBluffTimeout = null;
                if (room.state !== 'PLAYING') return;
                if (room.tablePile.length > 0 && room.lastPlayerIdx !== null) {
                    executeBluffChallenge(room, nextP);
                }
            }, 1200);
            return;
        }

        stopTurnTimer(room);
        advanceTurn(room);

        broadcastToRoom(room, {
            type: 'PLAYER_PLAYED_CARDS',
            playerId: bot.id,
            playerName: bot.name,
            playerAvatar: bot.avatar,
            count: cardsToPlay.length,
            drawnCount: botDrawnCount,
            claimedRank: botClaimedRank,
            targetRank: room.targetRank,
            tablePileCount: room.tablePile.length,
            drawPileCount: room.drawPile ? room.drawPile.length : 0,
            nextTurnIndex: room.turnIndex,
            lastPlayedSummary: `Played ${cardsToPlay.length} card(s) claiming [${botClaimedRank}]` + (botDrawnCount > 0 ? ` (Drawn ${botDrawnCount})` : '') + ((room.mode === 'FULL_DECK' || !room.mode) ? ` ➔ Next Ladder: [${room.targetRank}]` : ''),
            players: getSanitizedPlayers(room.players)
        });

        startTurnTimer(room);
        checkAndExecuteBotTurn(room);
    }, 1500);
}

function closeAndDestroyRoom(room, roomCode, hostOrReason) {
    if (!room) return;

    // 1. Mark room as closed so NO pending setTimeout or interval can proceed
    room.state = 'CLOSED';

    // 2. Clear all turn, bot, and round timers
    stopTurnTimer(room);
    if (room.botTimeout) {
        clearTimeout(room.botTimeout);
        room.botTimeout = null;
    }
    if (room.roundTimeout) {
        clearTimeout(room.roundTimeout);
        room.roundTimeout = null;
    }
    if (room.forcedBluffTimeout) {
        clearTimeout(room.forcedBluffTimeout);
        room.forcedBluffTimeout = null;
    }
    if (room.transitionTimeout) {
        clearTimeout(room.transitionTimeout);
        room.transitionTimeout = null;
    }
    if (room.seatDraft) {
        if (room.seatDraft.timer) clearTimeout(room.seatDraft.timer);
        if (room.seatDraft.botTimers) {
            room.seatDraft.botTimers.forEach(t => clearTimeout(t));
            room.seatDraft.botTimers = [];
        }
    }

    const hostName = (typeof hostOrReason === 'string' && !hostOrReason.includes(' '))
        ? hostOrReason
        : (room.players.find(p => p.isHost)?.name || 'Host');

    const closeMsg = typeof hostOrReason === 'string' && hostOrReason.includes(' ')
        ? hostOrReason
        : `ห้องนี้ถูกปิดลงโดย ${hostName} แล้ว`;

    broadcastToRoom(room, {
        type: 'ROOM_CLOSED',
        hostName: hostName,
        message: closeMsg
    });

    room.players.forEach(p => {
        if (p.ws && clientMap.has(p.ws)) {
            const cInfo = clientMap.get(p.ws);
            cInfo.roomCode = null;
            cInfo.isHost = false;
        }
    });

    rooms.delete(roomCode);
    console.log(`[ROOM CLOSED & DESTROYED] Room ${roomCode} has been completely closed and all timers stopped.`);
}

function handleClientLeave(ws, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const idx = room.players.findIndex(p => p.ws === ws);
    if (idx !== -1) {
        const leftPlayer = room.players[idx];
        console.log(`[PLAYER LEFT] ${leftPlayer.name} left room ${roomCode}`);

        // If host leaves, close and destroy the entire room immediately
        if (leftPlayer.isHost) {
            closeAndDestroyRoom(room, roomCode, leftPlayer.name);
            return;
        }

        const wasPlaying = (room.state === 'PLAYING');
        const wasTurn = (room.turnIndex === idx);

        room.players.splice(idx, 1);
        room.players.forEach((p, i) => { p.staticSeatIndex = i; });

        // If no human players remain in the room, close and destroy it immediately
        const remainingHumans = room.players.filter(p => !p.isBot && p.ws && p.ws.readyState === WebSocket.OPEN);
        if (remainingHumans.length === 0) {
            closeAndDestroyRoom(room, roomCode, 'ห้องนี้ถูกปิดลงเนื่องจากไม่มีผู้เล่นในห้องแล้ว');
            return;
        }

        if (wasPlaying) {
            // Adjust lastPlayerIdx
            if (room.lastPlayerIdx === idx) {
                room.lastPlayerIdx = null;
                room.lastPlayed = [];
            } else if (room.lastPlayerIdx !== null && room.lastPlayerIdx > idx) {
                room.lastPlayerIdx--;
            }

            // Check remaining alive players
            checkRoomEliminations(room);
            const alivePlayers = room.players.filter(p => p.hp > 0);
            if (alivePlayers.length <= 1) {
                stopTurnTimer(room);
                if (room.botTimeout) clearTimeout(room.botTimeout);
                if (room.roundTimeout) clearTimeout(room.roundTimeout);
                const winner = alivePlayers[0] || room.players[0];
                const standings = buildRoomStandings(room, winner);
                broadcastToRoom(room, {
                    type: 'GAME_OVER',
                    winner: winner ? { id: winner.id, name: winner.name, avatar: winner.avatar } : null,
                    message: winner ? `🏆 ${winner.name} เป็นผู้ชนะเพียงหนึ่งเดียวที่เหลืออยู่บนโต๊ะ!` : 'จบเกม!',
                    standings: standings,
                    players: getSanitizedPlayers(room.players)
                });
                room.state = 'LOBBY';
                return;
            }

            // Adjust turnIndex
            if (room.turnIndex > idx) {
                room.turnIndex--;
            } else if (wasTurn) {
                if (room.turnIndex >= room.players.length) {
                    room.turnIndex = 0;
                }
                if (room.players[room.turnIndex] && room.players[room.turnIndex].hp <= 0) {
                    advanceTurn(room);
                }
                stopTurnTimer(room);
                startTurnTimer(room);
                checkAndExecuteBotTurn(room);
            }

            broadcastToRoom(room, {
                type: 'PLAYERS_UPDATED',
                players: getSanitizedPlayers(room.players)
            });
            broadcastToRoom(room, {
                type: 'TURN_CHANGED',
                turnIndex: room.turnIndex,
                targetRank: room.targetRank,
                activePlayerId: room.players[room.turnIndex]?.id,
                activePlayerName: room.players[room.turnIndex]?.name,
                turnDirection: room.turnDirection,
                message: `${leftPlayer.name} ออกจากเกม! ส่งต่อเทิร์นให้ ${room.players[room.turnIndex]?.name}`
            });
        } else {
            broadcastToRoom(room, {
                type: 'LOBBY_UPDATED',
                roomCode,
                players: getSanitizedPlayers(room.players),
                message: `${leftPlayer.name} has left the room.`
            });
        }
    }
}

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('  🎮 CARDS OF DECEPTION - REAL-TIME MULTIPLAYER 🎮');
    console.log('====================================================');
    console.log(`  Local:   http://localhost:${PORT}`);

    const ips = getLanIpv4Addresses();
    ips.forEach(ip => {
        console.log(`  Network: http://${ip}:${PORT} (เปิดจากมือถือ/แท็บเล็ต/คอมเครื่องอื่นในวง Wi-Fi)`);
    });
    console.log('  📱 รองรับการสแกน QR Code เพื่อเข้าห้องทันทีบนมือถือทุกรุ่น!');
    console.log('====================================================');

    // Auto open browser if flag --open is present or AUTO_OPEN=true
    if (process.argv.includes('--open') || process.env.AUTO_OPEN === 'true') {
        const url = `http://localhost:${PORT}`;
        const cmd = process.platform === 'win32' ? `start ${url}` :
                    process.platform === 'darwin' ? `open ${url}` :
                    `xdg-open ${url}`;
        exec(cmd, (err) => {
            if (err) {
                console.log(`  [INFO] โปรดเปิดเบราว์เซอร์แล้วไปที่: ${url}`);
            }
        });
    }
});
