// --- Audio Synthesis via Web Audio API (Gamified Effects) ---
function playSound(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        if (type === 'success') {
            // retro double-beep success chime
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
            
            setTimeout(() => {
                const audioCtx2 = new AudioContext();
                const osc2 = audioCtx2.createOscillator();
                const gain2 = audioCtx2.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx2.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(659.25, audioCtx2.currentTime); // E5
                gain2.gain.setValueAtTime(0.1, audioCtx2.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx2.currentTime + 0.4);
                osc2.start(audioCtx2.currentTime);
                osc2.stop(audioCtx2.currentTime + 0.4);
            }, 100);
        } else if (type === 'error') {
            // buzz fail sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'click') {
            // soft mechanical blip
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'laser') {
            // synth frequency sweep
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch (err) {
        console.log('Sound synthesis blocked or not supported:', err);
    }
}

// --- Dynamic Data States ---
const quizCompletionState = {
    "lesson-1": false,
    "lesson-2": false,
    "lesson-3": false,
    "lesson-4": false,
    "lesson-5": false,
    "lesson-6": false,
    "lesson-7": false,
    "lesson-8": false,
    "lesson-9": false,
    "lesson-10": false,
    "lesson-11": false,
    "lesson-12": false
};

const defaultSandboxTemplates = {
    default: `# ร่ายคาถา Python ตรงนี้ และทดสอบพลังงาน!
def cast_magic():
    print("คุรุคุรุ~! หุ่นเชิดร่ายมนตร์สำเร็จ!")
    for i in range(1, 4):
        print(f"คลื่นพลังงานจำลองระลอกที่ {i}")

cast_magic()
`,
    "lesson-1": `# ทดลองตรวจสอบเวอร์ชัน Python ใน Sandbox
import sys
print("ห้องแล็บตรวจพบเวอร์ชัน Python:", sys.version)
`,
    "lesson-2": `# ตัวแปรและประเภทข้อมูล
puppet_name = "KuruDoll-Alpha"
level = 83
height = 145.5
is_active = True

print(f"ชื่อ: {puppet_name} (ระดับ {level})")
print(f"ประเภทระดับ: {type(level)} / สถานะ: {type(is_active)}")
`,
    "lesson-3": `# ตัวดำเนินการเลขและการหารเศษ
a = 17
b = 5
print("บวก:", a + b)
print("หารปัดเศษลง (//):", a // b)
print("หารเอาเศษ (Modulo %):", a % b)
print("เทียบเท่ากันหรือไม่ (==):", a == (b * 3 + 2))
`,
    "lesson-4": `# ประตูแยกแห่ง Aeon (If-Else)
score = 85

if score >= 80:
    print("Aha (Elation) ยินดีในตัวคุณ!")
elif score >= 50:
    print("Lan (Hunt) สนับสนุนความเร็ว!")
else:
    print("Nanook (Destruction) ทำลายพลังงานนี้...")
`,
    "lesson-5": `# วงแหวนวนซ้ำและควบคุมวง
for count in range(1, 6):
    if count == 4:
        print("ข้ามเลข 4 ไปด้วยคำสั่ง continue")
        continue
    print("วนรอบเวทมนตร์ครั้งที่:", count)
`,
    "lesson-6": `# คลังเก็บของและดัชนีลิสต์
backpack = ["Curio", "Cosmic Dice", "Space Coin"]
backpack.append("Herta Doll")

print("จำนวนสิ่งของ:", len(backpack))
print("ไอเทมแรก [0]:", backpack[0])
print("ไอเทมท้ายสุด [-1]:", backpack[-1])
print("ส่วนสไลซ์ [1:3]:", backpack[1:3])
`,
    "lesson-7": `# สารานุกรม Dictionaries
research_dict = {
    "subject": "Python Magic",
    "creator": "Herta",
    "difficulty": "Easy"
}

# ป้องกันระบบล่มด้วย .get()
print("วิชา:", research_dict.get("subject"))
print("หัวข้อวิจัยที่ไม่มี:", research_dict.get("secret_room", "ห้องลับยังไม่ปลดล็อก"))
`,
    "lesson-8": `# จารึกและเรียกใช้ฟังก์ชัน
def summon_doll(model_id, power_level=100):
    summon_msg = f"หุ่นเชิดรหัส {model_id} ตื่นจากการหลับใหล! พลังงาน: {power_level}%"
    return summon_msg

result = summon_doll("Kuru-09", 120)
print(result)
`,
    "lesson-9": `# พิมพ์เขียว Class และ Object
class MagicPuppet:
    def __init__(self, name, element):
        self.name = name
        self.element = element
        
    def attack(self):
        return f"{self.name} ร่ายพลังงาน {self.element}!"

my_doll = MagicPuppet("Doll-V1", "Quantum Spark")
print(my_doll.attack())
`,
    "lesson-10": `# การสืบทอดพิมพ์เขียวคลาส
class BaseDoll:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return f"{self.name} พยักหน้าเบาๆ"

class CombatDoll(BaseDoll):
    def attack(self):
        return f"{self.name} ยิงคลื่นเลเซอร์เวทย์!"

soldier = CombatDoll("Doll-Knight")
print(soldier.speak())
print(soldier.attack())
`,
    "lesson-11": `# เกราะ Try-Except ป้องกันระบบพัง
try:
    x = 100 / 0
except ZeroDivisionError as err:
    print("ตรวจพบข้อผิดพลาดร้ายแรงและสกัดได้:", err)
finally:
    print("คำสั่งในบล็อก finally รันเสมอเพื่อเคลียร์พลังงาน!")
`,
    "lesson-12": `# การเปิดม้วนเอกสาร (ไฟล์) เสมือน
# ใน Pyodide จะเป็นการจำลองระบบไฟล์ใน WebAssembly
with open("simulated_note.txt", "w") as f:
    f.write("บันทึกลับลับของ Herta")

with open("simulated_note.txt", "r") as f:
    data = f.read()
    print("เนื้อหาไฟล์:", data)
`
};

let pyodideInstance = null;

// --- Initialize Core Logic on Dom Loaded ---
document.addEventListener("DOMContentLoaded", () => {
    initSPARouter();
    initInteractiveLessons();
    initQuizHandlers();
    initHertaWidget();
    initSandbox();
    initContactModal();
});

// --- SPA Router and Section Swapper ---
function initSPARouter() {
    const menuButtons = document.querySelectorAll(".menu-item");
    const navLinks = document.querySelectorAll(".header-nav .nav-link");
    const sections = document.querySelectorAll(".lesson-section");

    function swapSection(targetId) {
        // Trigger sound click
        playSound('click');

        // Normalise target IDs
        let sectionId = `content-${targetId}`;
        if (!document.getElementById(sectionId)) return;

        // Hide all sections, show active
        sections.forEach(sec => sec.classList.remove("active"));
        document.getElementById(sectionId).classList.add("active");

        // Sync active states on Sidebar
        menuButtons.forEach(btn => {
            if (btn.getAttribute("data-target") === targetId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Sync active states on Header nav links
        navLinks.forEach(link => {
            const linkTarget = link.getAttribute("data-target");
            if (linkTarget === targetId || (targetId.startsWith("lesson-") && linkTarget === "lesson-1")) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Auto Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update Sandbox default code template if user hasn't heavily modified it
        updateSandboxTemplate(targetId);
    }

    // Bind sidebar clicks
    menuButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            swapSection(target);
        });
    });

    // Bind header clicks
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const target = link.getAttribute("data-target");
            if (target) {
                e.preventDefault();
                swapSection(target);
            }
        });
    });

    // Bind all next chapter buttons
    document.querySelectorAll(".next-chapter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const next = btn.getAttribute("data-next");
            swapSection(next);
        });
    });
}

// --- Interactive Lesson Components ---
function initInteractiveLessons() {
    
    // --- Chapter 1: OS Switcher ---
    const osTabs = document.querySelectorAll("#os-switcher-widget .tab-btn");
    const osContents = document.querySelectorAll("#os-switcher-widget .tab-content");
    osTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            playSound('click');
            osTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetOs = tab.getAttribute("data-os");
            osContents.forEach(c => {
                if (c.id === `os-${targetOs}-content`) {
                    c.classList.remove("hidden");
                } else {
                    c.classList.add("hidden");
                }
            });
        });
    });

    // Copy terminal command buttons
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const codeEl = document.getElementById(targetId);
            if (codeEl) {
                navigator.clipboard.writeText(codeEl.textContent)
                    .then(() => {
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = `<i class="fa-solid fa-check" style="color: #2ecc71;"></i>`;
                        playSound('click');
                        setTimeout(() => btn.innerHTML = originalHtml, 1500);
                    });
            }
        });
    });

    // --- Chapter 2: Variable Inspector ---
    const btnInspectVar = document.getElementById("btn-inspect-var");
    if (btnInspectVar) {
        btnInspectVar.addEventListener("click", () => {
            const name = document.getElementById("var-name-input").value.trim();
            let value = document.getElementById("var-value-input").value.trim();
            const type = document.getElementById("var-type-select").value;
            const output = document.getElementById("inspector-output");

            if (!name) {
                output.innerHTML = `<span class="error-text"><i class="fa-solid fa-triangle-exclamation"></i> ข้อผิดพลาด: กรุณาระบุชื่อตัวแปร!</span>`;
                playSound('error');
                return;
            }

            // Variable rules check
            const pyKeywords = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'print', 'input', 'len'];
            const validNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

            if (/\s/.test(name)) {
                output.innerHTML = `<span class="error-text"><i class="fa-solid fa-xmark"></i> ข้อผิดพลาด: ห้ามมีช่องว่างในชื่อตัวแปร!</span>`;
                playSound('error');
            } else if (!validNameRegex.test(name)) {
                output.innerHTML = `<span class="error-text"><i class="fa-solid fa-xmark"></i> ข้อผิดพลาด: ชื่อตัวแปรต้องเริ่มต้นด้วยตัวอักษรหรือเครื่องหมายขีดล่าง (_) เท่านั้น และห้ามมีอักขระพิเศษอื่น!</span>`;
                playSound('error');
            } else if (pyKeywords.includes(name)) {
                output.innerHTML = `<span class="error-text"><i class="fa-solid fa-xmark"></i> ข้อผิดพลาด: "${name}" เป็นคำสงวนพิเศษในภาษา Python ไม่สามารถใช้ตั้งชื่อตัวแปรได้!</span>`;
                playSound('error');
            } else {
                // Formatting values for visual display
                let formattedVal = value;
                if (type === 'str') formattedVal = `"${value}"`;
                if (type === 'bool') {
                    if (value.toLowerCase() === 'true' || value === '1') formattedVal = 'True';
                    else if (value.toLowerCase() === 'false' || value === '0') formattedVal = 'False';
                    else formattedVal = 'True';
                }

                output.innerHTML = `
                    <span class="success-text"><i class="fa-solid fa-check-double"></i> ผ่านข้อกำหนดการสลักหน่วยความจำ!</span><br>
                    <p style="margin-top: 8px; font-family: monospace;">กล่องชื่อ <strong>${name}</strong> เก็บข้อมูลประเภท <strong>${type.toUpperCase()}</strong> มีอักขระโครงสร้างเป็น: <code>${name} = ${formattedVal}</code></p>
                `;
                playSound('success');
            }
        });
    }

    // --- Chapter 3: Operator Calculator ---
    const btnCalc = document.getElementById("btn-calc-execute");
    if (btnCalc) {
        btnCalc.addEventListener("click", () => {
            const val1 = parseFloat(document.getElementById("calc-val1").value);
            const val2 = parseFloat(document.getElementById("calc-val2").value);
            const op = document.getElementById("calc-op").value;
            const resultBox = document.getElementById("calc-result");

            if (isNaN(val1) || isNaN(val2)) {
                resultBox.innerHTML = `<span class="error-text">กรุณากรอกตัวเลขทั้งสองช่อง!</span>`;
                playSound('error');
                return;
            }

            let result;
            let displayCode = `result = ${val1} ${op} ${val2}`;
            
            switch (op) {
                case '+': result = val1 + val2; break;
                case '-': result = val1 - val2; break;
                case '*': result = val1 * val2; break;
                case '/': 
                    if (val2 === 0) {
                        resultBox.innerHTML = `<span class="error-text">ZeroDivisionError: เกิดภัยพิบัติหารด้วย 0!</span>`;
                        playSound('error');
                        return;
                    }
                    result = val1 / val2; 
                    break;
                case '//': 
                    if (val2 === 0) {
                        resultBox.innerHTML = `<span class="error-text">ZeroDivisionError: ตัวหารต้องไม่ใช่ 0!</span>`;
                        playSound('error');
                        return;
                    }
                    result = Math.floor(val1 / val2); 
                    break;
                case '%': 
                    if (val2 === 0) {
                        resultBox.innerHTML = `<span class="error-text">ZeroDivisionError: ตัวหารเศษต้องไม่ใช่ 0!</span>`;
                        playSound('error');
                        return;
                    }
                    result = val1 % val2; 
                    break;
                case '**': result = Math.pow(val1, val2); break;
                case '==': result = val1 === val2 ? 'True' : 'False'; break;
                case '!=': result = val1 !== val2 ? 'True' : 'False'; break;
                default: result = "ไม่รองรับ";
            }

            resultBox.innerHTML = `
                <div>
                    <span style="color: #A9B2C3;">สั่งรันอักขระ:</span> <code style="background: none; padding: 0; color: var(--accent-light-purple); font-size:1em;">${displayCode}</code><br>
                    <span style="color: #A9B2C3; margin-top:5px; display:inline-block;">ผลลัพธ์ในหน่วยความจำ:</span> 
                    <strong style="color: var(--accent-pink); font-size:1.1em;">${result}</strong>
                </div>
            `;
            playSound('success');
        });
    }

    // --- Chapter 4: Decision Flowchart ---
    const virtueSlider = document.getElementById("virtue-score-slider");
    const virtueDisplay = document.getElementById("virtue-score-display");
    if (virtueSlider && virtueDisplay) {
        virtueSlider.addEventListener("input", () => {
            const score = parseInt(virtueSlider.value);
            virtueDisplay.textContent = score;

            // Nodes
            const pathGold = document.getElementById("path-gold");
            const pathSilver = document.getElementById("path-silver");
            const pathBronze = document.getElementById("path-bronze");
            const nodeGold = document.getElementById("node-gold");
            const nodeSilver = document.getElementById("node-silver");
            const nodeBronze = document.getElementById("node-bronze");
            const blessingAeon = document.getElementById("blessing-aeon");
            const blessingDesc = document.getElementById("blessing-description");
            const flowCard = document.getElementById("flowchart-output-card");

            // Reset states
            [pathGold, pathSilver, pathBronze].forEach(p => p.classList.remove("highlighted"));
            [nodeGold, nodeSilver, nodeBronze].forEach(n => n.classList.remove("active"));

            // Calculate blessing path
            if (score >= 80) {
                pathGold.classList.add("highlighted");
                nodeGold.classList.add("active");
                blessingAeon.textContent = "Aeon Aha (Elation)";
                blessingAeon.style.color = "#FFD700";
                blessingDesc.textContent = '"ยินดีด้วย! ท่านได้รับพรสีทองจากเทพแห่งความยินดีปรีดา คลื่นเสียงหัวเราะระดับจักรวาลมอบโชคลาภและความสนุกสนานจนหุ่นเชิดต้องหมุนร่ายรำ!"';
                flowCard.style.borderLeftColor = "#FFD700";
            } else if (score >= 50) {
                pathSilver.classList.add("highlighted");
                nodeSilver.classList.add("active");
                blessingAeon.textContent = "Aeon Lan (Hunt)";
                blessingAeon.style.color = "var(--brand-magic)";
                blessingDesc.textContent = '"คุณมีความเร็วและเป้าหมายที่ชัดเจน ดุจลูกธนูสีเงินที่พุ่งตัดฟากฟ้าและสยบอุปสรรคทั้งปวงด้วยความเฉียบคม"';
                flowCard.style.borderLeftColor = "var(--brand-magic)";
            } else {
                pathBronze.classList.add("highlighted");
                nodeBronze.classList.add("active");
                blessingAeon.textContent = "Aeon Nanook (Destruction)";
                blessingAeon.style.color = "#e74c3c";
                blessingDesc.textContent = '"คำเตือน! สภาวะจิตหลงผิดดึงดูดพลังทำลายล้าง มหันตภัยแห่งเปลวเพลิงสีส้มแดงพร้อมแผดเผาหุ่นเชิดหากปราศจากความระมัดระวัง"';
                flowCard.style.borderLeftColor = "#e74c3c";
            }
        });
    }

    // --- Chapter 5: Loop Animator ---
    const loopTypeSelect = document.getElementById("loop-type-select");
    const btnLoopStart = document.getElementById("btn-loop-start");
    const btnLoopNext = document.getElementById("btn-loop-next");
    const loopVarState = document.getElementById("loop-var-state");
    const loopGraphic = document.getElementById("loop-graphic");

    let loopState = {
        type: 'for',
        step: 0,
        i: 1,
        count: 1,
        logs: []
    };

    if (btnLoopStart && btnLoopNext) {
        btnLoopStart.addEventListener("click", () => {
            playSound('click');
            loopState.type = loopTypeSelect.value;
            loopState.step = 1;
            loopState.i = 1;
            loopState.count = 1;
            loopState.logs = ["[เริ่มต้น] ตั้งค่าวัดรอบกระแสวนลูป"];
            
            btnLoopNext.removeAttribute("disabled");
            updateLoopVisualizer();
        });

        btnLoopNext.addEventListener("click", () => {
            playSound('click');
            loopState.step++;
            
            if (loopState.type === 'for') {
                if (loopState.i <= 3) {
                    loopState.logs.push(`รอบที่ ${loopState.i}: แสดงผลคำว่า "รดน้ำวิเศษรอบที่ ${loopState.i}"`);
                    loopState.i++;
                } else {
                    loopState.logs.push("[สิ้นสุด] ลูปทำครบจำนวนช่วง range(1, 4) และจบลูปอย่างสมบูรณ์");
                    btnLoopNext.setAttribute("disabled", "true");
                }
            } else {
                if (loopState.count <= 3) {
                    loopState.logs.push(`รอบที่ ${loopState.count}: แสดงผล "ทดลองร่างที่ ${loopState.count}" และทำคำสั่ง count += 1`);
                    loopState.count++;
                } else {
                    loopState.logs.push("[สิ้นสุด] ตัวแปร count มีค่าเป็น 4 เงื่อนไข (count <= 3) กลายเป็น False จึงจบลูป!");
                    btnLoopNext.setAttribute("disabled", "true");
                }
            }
            updateLoopVisualizer();
        });
    }

    function updateLoopVisualizer() {
        // Render logs
        loopVarState.innerHTML = loopState.logs.map(log => `<p style="margin-bottom:4px; font-size:12.5px;">&gt; ${log}</p>`).join("");
        loopVarState.scrollTop = loopVarState.scrollHeight;

        // Render graphical puppet movement
        let puppetIcon = '<i class="fa-solid fa-robot"></i>';
        let htmlContent = '';

        if (loopState.type === 'for') {
            const currentRound = loopState.i - 1;
            if (currentRound > 0 && currentRound <= 3) {
                htmlContent = `
                    <div class="active-puppet-action kurukuru-active">
                        ${puppetIcon}
                        <span>รดน้ำรอบที่ ${currentRound} (i = ${currentRound})</span>
                    </div>
                `;
            } else {
                htmlContent = `
                    <div class="active-puppet-action">
                        ${puppetIcon}
                        <span>จบลูปเรียบร้อย!</span>
                    </div>
                `;
            }
        } else {
            const currentRound = loopState.count - 1;
            if (currentRound > 0 && currentRound <= 3) {
                htmlContent = `
                    <div class="active-puppet-action kurukuru-active">
                        ${puppetIcon}
                        <span>ทดลองหุ่นเชิดร่างที่ ${currentRound} (count = ${currentRound})</span>
                    </div>
                `;
            } else {
                htmlContent = `
                    <div class="active-puppet-action">
                        ${puppetIcon}
                        <span>จบลูปเรียบร้อย (count = 4)</span>
                    </div>
                `;
            }
        }

        loopGraphic.innerHTML = htmlContent;
        
        // Trigger quick spin on puppet graphic
        const puppetEl = loopGraphic.querySelector('.active-puppet-action');
        if (puppetEl) {
            puppetEl.classList.remove("kurukuru-active");
            void puppetEl.offsetWidth; // trigger reflow
            puppetEl.classList.add("kurukuru-active");
        }
    }

    // --- Chapter 6: Interactive List ---
    let suitcaseList = ['crystal', 'shield', 'sword'];
    const suitcaseContainer = document.getElementById("suitcase-container");
    const btnListAdd = document.getElementById("btn-list-add");
    const listInputItem = document.getElementById("list-input-item");
    const btnListInspect = document.getElementById("btn-list-inspect");
    const listSearchIndex = document.getElementById("list-search-index");
    const listInspectResult = document.getElementById("list-inspect-result");

    function renderSuitcase() {
        if (!suitcaseContainer) return;
        suitcaseContainer.innerHTML = suitcaseList.map((item, idx) => {
            return `
                <div class="list-item-cube" id="cube-${idx}">
                    <span class="cube-index">${idx}</span>
                    <i class="fa-solid fa-box-archive" style="font-size:18px; color: var(--brand-primary); margin-top:8px;"></i>
                    <span class="cube-val">"${item}"</span>
                </div>
            `;
        }).join("");
    }

    if (suitcaseContainer) {
        renderSuitcase();

        btnListAdd.addEventListener("click", () => {
            const item = listInputItem.value.trim();
            if (!item) return;

            suitcaseList.append ? suitcaseList.append(item) : suitcaseList.push(item);
            playSound('click');
            renderSuitcase();

            // Highlight the newly added cube (which is the last index)
            const newIndex = suitcaseList.length - 1;
            const newCube = document.getElementById(`cube-${newIndex}`);
            if (newCube) {
                newCube.classList.add("inspected");
                setTimeout(() => newCube.classList.remove("inspected"), 1000);
            }
            listInputItem.value = "";
        });

        btnListInspect.addEventListener("click", () => {
            let idx = parseInt(listSearchIndex.value);
            if (isNaN(idx)) {
                listInspectResult.innerHTML = `<span class="error-text">กรุณากรอกตัวเลขดัชนี!</span>`;
                playSound('error');
                return;
            }

            // Remove highlighted states
            document.querySelectorAll(".list-item-cube").forEach(el => el.classList.remove("inspected"));

            // Calculate positive equivalent for negative indices
            let targetIdx = idx;
            if (idx < 0) {
                targetIdx = suitcaseList.length + idx;
            }

            if (targetIdx >= 0 && targetIdx < suitcaseList.length) {
                const targetCube = document.getElementById(`cube-${targetIdx}`);
                if (targetCube) {
                    targetCube.classList.add("inspected");
                    listInspectResult.innerHTML = `
                        ดัชนีการเข้าถึง <code>bag[${idx}]</code> คืนผลข้อมูลเป็น: 
                        <strong style="color: var(--brand-magic); font-size:1.1em;">"${suitcaseList[targetIdx]}"</strong>
                    `;
                    playSound('success');
                }
            } else {
                listInspectResult.innerHTML = `<span class="error-text"><i class="fa-solid fa-xmark"></i> IndexError: ดัชนีนอกขอบเขตกระเป๋า!</span>`;
                playSound('error');
            }
        });
    }

    // --- Chapter 7: Dictionary Catalog ---
    let researchCatalog = {
        "subject": "Python",
        "researcher": "Herta"
    };

    const dictTable = document.getElementById("dict-table");
    const dictJsonDisplay = document.getElementById("dict-json-display");
    const dictKeyInput = document.getElementById("dict-key");
    const dictValInput = document.getElementById("dict-val");
    const btnDictSet = document.getElementById("btn-dict-set");

    function renderDict() {
        if (!dictTable || !dictJsonDisplay) return;

        // Render catalog table rows
        let rowsHtml = '';
        for (const [key, value] of Object.entries(researchCatalog)) {
            rowsHtml += `
                <tr>
                    <td><code>"${key}"</code></td>
                    <td><code>"${value}"</code></td>
                    <td>
                        <button class="btn-icon" onclick="deleteDictKey('${key}')" style="width:26px; height:26px;">
                            <i class="fa-solid fa-trash-can" style="font-size:11px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
        dictTable.querySelector("tbody").innerHTML = rowsHtml;

        // Render json block
        dictJsonDisplay.textContent = JSON.stringify(researchCatalog, null, 2);
    }

    // Expose deletion globally for simplicity
    window.deleteDictKey = function(key) {
        playSound('click');
        delete researchCatalog[key];
        renderDict();
    };

    if (btnDictSet) {
        renderDict();

        btnDictSet.addEventListener("click", () => {
            const key = dictKeyInput.value.trim();
            const val = dictValInput.value.trim();

            if (!key || !val) {
                alert("กรุณากรอกทั้งคีย์ค้นหาและคำอธิบายข้อมูล!");
                playSound('error');
                return;
            }

            // Check duplicate key warn
            if (researchCatalog.hasOwnProperty(key)) {
                playSound('error');
                alert(`⚠️ คำเตือน: คีย์ "${key}" ซ้ำในสารานุกรม! ข้อมูลเดิม ("${researchCatalog[key]}") จะโดนทับด้วยค่าใหม่ ("${val}")!`);
            } else {
                playSound('click');
            }

            researchCatalog[key] = val;
            renderDict();
            dictKeyInput.value = '';
            dictValInput.value = '';
        });
    }

    // --- Chapter 8: Function Spell Machine ---
    const btnMachineRun = document.getElementById("btn-machine-run");
    const machineCanvas = document.getElementById("machine-canvas");
    const nodeOutputVal = document.getElementById("node-output-val");

    if (btnMachineRun) {
        btnMachineRun.addEventListener("click", () => {
            playSound('click');
            const name = document.getElementById("spell-name").value.trim() || "Spark";
            const mana = parseInt(document.getElementById("spell-mana").value) || 0;

            // Trigger animation class
            const functionNode = machineCanvas.querySelector(".function-box-node");
            functionNode.style.transform = "scale(1.1)";
            functionNode.style.borderColor = "var(--brand-magic)";

            setTimeout(() => {
                functionNode.style.transform = "scale(1)";
                functionNode.style.borderColor = "rgba(142, 122, 181, 0.3)";
                
                const damageOutput = mana * 2.5;
                nodeOutputVal.querySelector(".return-text").innerHTML = `
                    <code style="background:none; padding:0; color:#2ecc71;">"ร่าย ${name} ดาเมจ: ${damageOutput}"</code>
                `;
                playSound('success');
            }, 600);
        });
    }

    // --- Chapter 9: Puppet OOP Builder ---
    const btnBuildPuppet = document.getElementById("btn-build-puppet");
    const puppetYard = document.getElementById("puppet-yard");

    if (btnBuildPuppet) {
        btnBuildPuppet.addEventListener("click", () => {
            const name = document.getElementById("puppet-name-input").value.trim() || "Doll-X";
            const color = document.getElementById("puppet-color-select").value;
            const noPuppetsNotice = puppetYard.querySelector(".no-puppets-notice");
            if (noPuppetsNotice) noPuppetsNotice.remove();

            playSound('click');

            // Spawn visual puppet card
            let colorClass = '';
            let textHexColor = '';
            if (color === 'purple') { colorClass = 'custom-puppet-wood'; textHexColor = '#8E7AB5'; }
            if (color === 'pink') { colorClass = 'custom-puppet-pink'; textHexColor = '#E198B7'; }
            if (color === 'blue') { colorClass = 'custom-puppet-blue'; textHexColor = '#D4ADFC'; }

            const puppetId = `doll-${Date.now()}`;
            const cardHtml = `
                <div class="spawned-puppet-card ${colorClass}" id="${puppetId}">
                    <i class="fa-solid fa-robot"></i>
                    <span class="puppet-card-name">${name}</span>
                    <span class="puppet-card-status">Active</span>
                    <button class="btn btn-primary" onclick="triggerPuppetAction('${puppetId}', '${name}')" style="font-size:11px; padding: 4px 8px; margin-top:5px;">
                        .kurukuru()
                    </button>
                </div>
            `;
            puppetYard.insertAdjacentHTML('beforeend', cardHtml);
        });

        window.triggerPuppetAction = function(id, name) {
            const puppetCard = document.getElementById(id);
            if (puppetCard) {
                // Synthesize cute spell sound
                playSound('success');

                // Toggle kurukuru spin
                puppetCard.classList.remove("kurukuru-active");
                void puppetCard.offsetWidth; // force layout reflow
                puppetCard.classList.add("kurukuru-active");

                // Trigger Herta speech widget
                triggerHertaSpeech(`หุ่นเชิด "${name}" รันความสามารถหมุนตัว คุรุคุรุ~!`);
            }
        };
    }

    // --- Chapter 10: OOP Inheritance ---
    const btnInheritance = document.getElementById("btn-demo-inheritance");
    const inheritanceOutput = document.getElementById("inheritance-demo-output");

    if (btnInheritance) {
        btnInheritance.addEventListener("click", () => {
            playSound('laser');
            
            // Highlight child node
            const childNode = document.querySelector(".child-node");
            childNode.style.borderColor = "var(--brand-magic)";
            childNode.style.boxShadow = "var(--shadow-glow)";
            childNode.style.transform = "scale(1.05)";

            inheritanceOutput.innerHTML = `
                <span class="success-text"><i class="fa-solid fa-circle-check"></i> คลาสลูกสืบทอดร่างและอัปเกรดสำเร็จ!</span><br>
                <code style="background:none; padding:0; color: #FF79C6;">CombatPuppet("Kuru-Blaster").fire_laser()</code><br>
                <span>ผลการรัน: "หุ่นเชิด Kuru-Blaster ยิงลำแสงสีม่วงพาสเทลอัดศัตรูระดับ 250 เมกะวัตต์!"</span>
            `;

            setTimeout(() => {
                childNode.style.borderColor = "rgba(142, 122, 181, 0.3)";
                childNode.style.boxShadow = "none";
                childNode.style.transform = "scale(1)";
            }, 1500);
        });
    }

    // --- Chapter 11: Try-Except Shield ---
    const btnTestShield = document.getElementById("btn-test-shield");
    const shieldDivisor = document.getElementById("shield-divisor");
    const shieldToggle = document.getElementById("shield-toggle");
    const shieldTerminal = document.getElementById("shield-terminal");

    if (btnTestShield) {
        btnTestShield.addEventListener("click", () => {
            const divVal = parseInt(shieldDivisor.value);
            const isShieldOn = shieldToggle.checked;
            
            shieldTerminal.innerHTML = `<p class="sys-msg">[System] กำลังยิงคาถาแบ่งกำลังไฟฟ้า 100 / ${divVal} ...</p>`;

            setTimeout(() => {
                if (divVal === 0) {
                    if (isShieldOn) {
                        playSound('success');
                        shieldTerminal.insertAdjacentHTML('beforeend', `
                            <p class="safe-msg"><i class="fa-solid fa-shield-halved"></i> [GRACEFUL] ตรวจจับ ZeroDivisionError! ดึงความปลอดภัยการดักจับข้อยกเว้นทำงาน...</p>
                            <p style="color: var(--accent-pink); font-family: monospace;">ผลการรองรับ: "เกราะสะกดบอกว่า ไม่สามารถหารระบบพลังงานด้วยศูนย์ได้!"</p>
                        `);
                    } else {
                        playSound('error');
                        shieldTerminal.insertAdjacentHTML('beforeend', `
                            <p class="err-msg"><i class="fa-solid fa-circle-exclamation"></i> [CRITICAL CRASH] ZeroDivisionError: division by zero</p>
                            <p class="err-msg">!!! ตรวจพบจุดปนเปื้อน พลังงานรั่วไหล ห้องวิจัยค้างและเสียหายอย่างรุนแรง !!!</p>
                        `);
                    }
                } else {
                    playSound('success');
                    const ans = 100 / divVal;
                    shieldTerminal.insertAdjacentHTML('beforeend', `
                        <p class="safe-msg"><i class="fa-solid fa-circle-check"></i> คำสั่งสำเร็จราบรื่น!</p>
                        <p style="color: #2ecc71; font-family: monospace;">ผลลัพธ์คำนวณ: ${ans}</p>
                    `);
                }
                shieldTerminal.scrollTop = shieldTerminal.scrollHeight;
            }, 500);
        });
    }

    // --- Chapter 12: Virtual File System ---
    const btnFileWrite = document.getElementById("btn-virtual-file-write");
    const fileInput = document.getElementById("virtual-file-input");
    const fileDoc = document.getElementById("virtual-file-document");
    const filePreview = document.getElementById("virtual-file-preview");

    if (btnFileWrite) {
        btnFileWrite.addEventListener("click", () => {
            const dataText = fileInput.value.trim() || "ไฟล์เปล่า...";
            playSound('success');

            // Flashing document visualizer
            fileDoc.classList.add("written");
            filePreview.textContent = dataText;

            setTimeout(() => {
                fileDoc.classList.remove("written");
            }, 1000);
        });
    }
}

// --- Chapter Quiz Handlers & Progress Tracking ---
function initQuizHandlers() {
    const quizCards = document.querySelectorAll(".quiz-card");

    quizCards.forEach(card => {
        const optionBtns = card.querySelectorAll(".option-btn");
        const feedbackPane = card.querySelector(".quiz-feedback");
        const lessonId = card.id; // e.g. quiz-1

        optionBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Clear active selected styles on siblings
                optionBtns.forEach(b => {
                    b.classList.remove("selected-correct", "selected-incorrect");
                });

                const isCorrect = btn.getAttribute("data-correct") === "true";

                if (isCorrect) {
                    playSound('success');
                    btn.classList.add("selected-correct");
                    feedbackPane.className = "quiz-feedback correct";
                    feedbackPane.innerHTML = `
                        <i class="fa-solid fa-circle-check"></i> <strong>ปัญญาสลักสำเร็จ:</strong> ถูกต้องแล้ว! พรสมาคมอัจฉริยะคุ้มครองคุณ!
                    `;
                    feedbackPane.classList.remove("hidden");

                    // Set progress and check marks
                    markLessonCompleted(lessonId);

                    // Confetti effects!
                    triggerConfettiCelebration();

                    // Spin Herta floating widget
                    triggerHertaKurukuruSpin(true);
                } else {
                    playSound('error');
                    btn.classList.add("selected-incorrect");
                    feedbackPane.className = "quiz-feedback incorrect";
                    
                    // Cute sassy quotes from Herta on failure
                    const sassyFailQuotes = [
                        "ไม่ใช่คำตอบนั้น! ตั้งสติวิจัยหน่อยสิ?",
                        "คุณเลือกเส้นทางผิดแล้ว ลองศึกษาข้อมูลกฎบทเรียนข้างบนอีกรอบล่ะ!",
                        "คุรุคุรุ~ ผิดซะงั้น! เลิกเดาสุ่มได้แล้วนะ!",
                        "ถ้า Aeon มองอยู่ ป่านนี้คงกุมขมับแล้วล่ะ... ลองใหม่!"
                    ];
                    const randomSassy = sassyFailQuotes[Math.floor(Math.random() * sassyFailQuotes.length)];
                    feedbackPane.innerHTML = `
                        <i class="fa-solid fa-triangle-exclamation"></i> <strong>ข้อวิจัยล้มเหลว:</strong> ${randomSassy}
                    `;
                    feedbackPane.classList.remove("hidden");
                }
            });
        });
    });
}

function markLessonCompleted(quizCardId) {
    // quizCardId is like "quiz-1", map to lesson key: "lesson-1"
    const lessonKey = quizCardId.replace("quiz-", "lesson-");
    if (quizCompletionState.hasOwnProperty(lessonKey) && !quizCompletionState[lessonKey]) {
        quizCompletionState[lessonKey] = true;
        
        // Update sidebar check status
        const statusIconContainer = document.getElementById(`status-${quizCardId.split("-")[1]}`);
        if (statusIconContainer) {
            statusIconContainer.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        }

        // Calculate progress percentage
        calculateGlobalProgress();
    }
}

function calculateGlobalProgress() {
    let completedCount = 0;
    const totalLessons = Object.keys(quizCompletionState).length;

    for (const val of Object.values(quizCompletionState)) {
        if (val) completedCount++;
    }

    const percentage = Math.round((completedCount / totalLessons) * 100);

    // Update displays
    document.getElementById("global-progress-percent").textContent = `${percentage}%`;
    document.getElementById("global-progress-bar").style.width = `${percentage}%`;

    // If 100%, unlock graduation certificate!
    if (percentage === 100) {
        unlockGraduation();
    }
}

function unlockGraduation() {
    // Hide locked message
    const lockedMsg = document.getElementById("certificate-locked-message");
    const certWidget = document.getElementById("certificate-widget");
    const nameInputGroup = document.getElementById("cert-name-input-group");

    if (lockedMsg && certWidget) {
        lockedMsg.classList.add("hidden");
        certWidget.classList.remove("hidden");
        if (nameInputGroup) nameInputGroup.style.display = "block";
        
        // Spark extra confetti
        triggerConfettiCelebration(true);
        triggerHertaSpeech("ว้าว! มหัศจรรย์จริง! คุณผ่าน Simulated Universe ทั้ง 12 บทเรียนแล้ว! มารับใบประกาศอัจฉริยะเกียรติยศจากฉันได้เลย!");

        // Bind dynamic certificate name updating
        const studentNameInput = document.getElementById("student-cert-name");
        const certNameDisplay = document.getElementById("cert-name-display");
        
        if (studentNameInput && certNameDisplay) {
            studentNameInput.addEventListener("input", () => {
                certNameDisplay.textContent = studentNameInput.value.trim() || "ผู้เรียนผู้ทรงปัญญา";
            });
        }
    }
}

// Confetti celebrate helper
function triggerConfettiCelebration(isEpic = false) {
    if (typeof confetti === 'function') {
        if (isEpic) {
            // Big blast
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        } else {
            // Normal blast
            confetti({
                particleCount: 60,
                spread: 60,
                origin: { y: 0.7 }
            });
        }
    }
}

// --- Floating Herta Chibi Widget Logic ---
const sassyQuotes = [
    "คุรุคุรุ~ คุรุริน~!",
    "เลิกจ้องฉันด้วยสายตาเซ่อซ่าแบบนั้นแล้วไปเขียนโค้ดต่อได้แล้ว!",
    "Simulated Universe นี้สร้างโดยสมาคมอัจฉริยะเชียวนะ ศึกษาดีๆ ล่ะ!",
    "โอ้? เริ่มเข้าใจวิชาเวทมนตร์ขึ้นมาบ้างแล้วนี่... พยายามเข้าล่ะ",
    "หุ่นเชิดกำลังหมุนตัวติ้วๆ~ หมุนรอบปัญญาระดับสเปกตรัม!",
    "ถ้าเจอโค้ดบั๊กตรงไหนก็เข้าไปแชทบีบกลไกดูสิ... แต่อย่าร้องไห้มาหาฉันล่ะ!",
    "สัญญาสิว่าเมื่อเรียนจบแล้ว คุณจะไม่ลืมมาอัปเกรดระบบหุ่นเชิดให้ฉันด้วย"
];

function initHertaWidget() {
    const avatar = document.getElementById("herta-floating-avatar");
    if (avatar) {
        avatar.addEventListener("click", () => {
            playSound('success');
            triggerHertaKurukuruSpin(false);
            
            // Pick a random sassy line
            const randomLine = sassyQuotes[Math.floor(Math.random() * sassyQuotes.length)];
            triggerHertaSpeech(randomLine);
        });
    }
}

function triggerHertaSpeech(text) {
    const speechBubble = document.getElementById("herta-widget-speech");
    if (speechBubble) {
        speechBubble.textContent = text;
        speechBubble.classList.remove("hidden");
        
        // Auto-fade speech bubble after 4.5 seconds
        if (window.speechFadeTimer) clearTimeout(window.speechFadeTimer);
        window.speechFadeTimer = setTimeout(() => {
            speechBubble.classList.add("hidden");
        }, 4500);
    }
}

function triggerHertaKurukuruSpin(isQuizSuccess = false) {
    const chibiImg = document.getElementById("herta-widget-img");
    if (chibiImg) {
        chibiImg.classList.remove("kurukuru-active", "kurukuru-super-active");
        void chibiImg.offsetWidth; // force layout reflow

        if (isQuizSuccess) {
            chibiImg.classList.add("kurukuru-super-active");
            triggerHertaSpeech("ถูกต้องร้อยคะแนน! คุรุคุรุ~ คุรุริน~!");
            setTimeout(() => chibiImg.classList.remove("kurukuru-super-active"), 2000);
        } else {
            chibiImg.classList.add("kurukuru-active");
            setTimeout(() => chibiImg.classList.remove("kurukuru-active"), 800);
        }
    }
}

// --- Python Sandbox (Pyodide Integration) ---
let activeExecutionTarget = "sandbox";

function initSandbox() {
    // Drawer Elements
    const sandboxDesk = document.getElementById("sandbox-desk");
    const toggleBtn = document.getElementById("btn-sandbox-toggle");
    const codeEditor = document.getElementById("sandbox-code-editor");
    const runBtn = document.getElementById("btn-sandbox-run");
    const resetBtn = document.getElementById("btn-sandbox-reset");
    const clearBtn = document.getElementById("btn-sandbox-clear");
    const outputConsole = document.getElementById("sandbox-output");
    const compilerIndicator = document.getElementById("compiler-status");

    // Playground Elements
    const playCodeEditor = document.getElementById("playground-code-editor");
    const playRunBtn = document.getElementById("btn-playground-run");
    const playResetBtn = document.getElementById("btn-playground-reset");
    const playClearBtn = document.getElementById("btn-playground-clear");
    const playOutputConsole = document.getElementById("playground-output");
    const playCompilerIndicator = document.getElementById("playground-compiler-status");
    const playTemplateSelect = document.getElementById("playground-template-select");
    const playLineNumbers = document.getElementById("playground-line-numbers");

    // Enable tab indentation for both editors
    if (codeEditor) enableTabIndentation(codeEditor);
    if (playCodeEditor) enableTabIndentation(playCodeEditor);

    // Toggle sandbox slide panel
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            playSound('click');
            sandboxDesk.classList.toggle("open");
        });
    }

    // Clear output logs (Drawer)
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            playSound('click');
            outputConsole.textContent = '';
        });
    }

    // Reset editor code template (Drawer)
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            playSound('click');
            const activeMenuItem = document.querySelector(".menu-item.active");
            const currentLesson = activeMenuItem ? activeMenuItem.getAttribute("data-target") : 'default';
            codeEditor.value = defaultSandboxTemplates[currentLesson] || defaultSandboxTemplates.default;
        });
    }

    // Line Numbers & Scroll sync for Playground Editor
    function updatePlaygroundLineNumbers() {
        if (!playCodeEditor || !playLineNumbers) return;
        const lines = playCodeEditor.value.split('\n');
        const lineCount = lines.length;
        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            html += `<span>${i}</span>`;
        }
        playLineNumbers.innerHTML = html;
        playLineNumbers.scrollTop = playCodeEditor.scrollTop;
    }

    if (playCodeEditor) {
        playCodeEditor.addEventListener("input", updatePlaygroundLineNumbers);
        playCodeEditor.addEventListener("scroll", () => {
            if (playLineNumbers) playLineNumbers.scrollTop = playCodeEditor.scrollTop;
        });
        // Initial call
        updatePlaygroundLineNumbers();
    }

    // Clear logs (Playground)
    if (playClearBtn) {
        playClearBtn.addEventListener("click", () => {
            playSound('click');
            if (playOutputConsole) playOutputConsole.textContent = '';
        });
    }

    // Reset code (Playground)
    if (playResetBtn) {
        playResetBtn.addEventListener("click", () => {
            playSound('click');
            const selected = playTemplateSelect ? playTemplateSelect.value : 'default';
            playCodeEditor.value = defaultSandboxTemplates[selected] || defaultSandboxTemplates.default;
            updatePlaygroundLineNumbers();
        });
    }

    // Template selection (Playground)
    if (playTemplateSelect) {
        playTemplateSelect.addEventListener("change", (e) => {
            playSound('click');
            const selected = e.target.value;
            playCodeEditor.value = defaultSandboxTemplates[selected] || defaultSandboxTemplates.default;
            updatePlaygroundLineNumbers();
        });
    }

    // Load Pyodide asynchronously
    async function loadPyodideCompiler() {
        try {
            if (typeof loadPyodide === 'function') {
                pyodideInstance = await loadPyodide({
                    stdout: (text) => {
                        if (activeExecutionTarget === "playground") {
                            if (playOutputConsole) playOutputConsole.textContent += text + "\n";
                        } else {
                            if (outputConsole) outputConsole.textContent += text + "\n";
                        }
                    },
                    stderr: (text) => {
                        if (activeExecutionTarget === "playground") {
                            if (playOutputConsole) playOutputConsole.textContent += "Error: " + text + "\n";
                        } else {
                            if (outputConsole) outputConsole.textContent += "Error: " + text + "\n";
                        }
                    }
                });
                
                // Set ready states for Drawer
                if (compilerIndicator) {
                    compilerIndicator.textContent = "พร้อมรัน";
                    compilerIndicator.className = "compiler-status-indicator ready";
                }
                if (outputConsole) {
                    outputConsole.textContent = "ระบบวิญญาณ Pyodide พร้อมสำแดงฤทธิ์! ป้อนโค้ด Python และกด รันเวทมนตร์ ด้านล่างได้เลย.\n";
                }
                if (runBtn) runBtn.removeAttribute("disabled");

                // Set ready states for Playground
                if (playCompilerIndicator) {
                    playCompilerIndicator.textContent = "พร้อมรัน";
                    playCompilerIndicator.className = "compiler-status-indicator ready";
                }
                if (playOutputConsole) {
                    playOutputConsole.textContent = "ระบบวิญญาณ Pyodide พร้อมสำแดงฤทธิ์! โหลดตัวอย่างหรือป้อนโค้ดของคุณ แล้วกด รันเวทมนตร์ (Run Python) ได้เลย.\n";
                }
                if (playRunBtn) playRunBtn.removeAttribute("disabled");

            } else {
                throw new Error("Pyodide library script not loaded from CDN.");
            }
        } catch (err) {
            console.error("Pyodide initialization failure:", err);
            if (compilerIndicator) {
                compilerIndicator.textContent = "การเชื่อมต่อขัดข้อง";
                compilerIndicator.className = "compiler-status-indicator error";
            }
            if (outputConsole) {
                outputConsole.textContent = "ข้อผิดพลาด: ไม่สามารถเริ่มระบบคอมไพเลอร์ Pyodide ได้เนื่องจากการโหลดเครือข่ายขัดข้อง กรุณาลองใหม่อีกครั้ง.\n";
            }

            if (playCompilerIndicator) {
                playCompilerIndicator.textContent = "การเชื่อมต่อขัดข้อง";
                playCompilerIndicator.className = "compiler-status-indicator error";
            }
            if (playOutputConsole) {
                playOutputConsole.textContent = "ข้อผิดพลาด: ไม่สามารถเริ่มระบบคอมไพเลอร์ Pyodide ได้เนื่องจากการโหลดเครือข่ายขัดข้อง กรุณาลองใหม่อีกครั้ง.\n";
            }
        }
    }

    loadPyodideCompiler();

    // Exec code compiler (Drawer)
    if (runBtn) {
        runBtn.addEventListener("click", async () => {
            if (!pyodideInstance) return;
            activeExecutionTarget = "sandbox";
            playSound('click');
            outputConsole.textContent = "--- กำลังรันคาถาเวทมนตร์ Python ---\n";
            const code = codeEditor.value;

            try {
                await pyodideInstance.runPythonAsync(code);
            } catch (err) {
                playSound('error');
                outputConsole.textContent += "\n[CRITICAL ERROR]\n" + err + "\n";
            }
        });
    }

    // Exec code compiler (Playground)
    if (playRunBtn) {
        playRunBtn.addEventListener("click", async () => {
            if (!pyodideInstance) return;
            activeExecutionTarget = "playground";
            playSound('click');
            playOutputConsole.textContent = "--- กำลังรันคาถาเวทมนตร์ Python ---\n";
            const code = playCodeEditor.value;

            try {
                await pyodideInstance.runPythonAsync(code);
            } catch (err) {
                playSound('error');
                playOutputConsole.textContent += "\n[CRITICAL ERROR]\n" + err + "\n";
            }
        });
    }
}

function enableTabIndentation(textarea) {
    textarea.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 4;
            textarea.dispatchEvent(new Event("input"));
        }
    });
}

function updateSandboxTemplate(targetId) {
    const codeEditor = document.getElementById("sandbox-code-editor");
    if (codeEditor) {
        // If current value is match to one of templates or it's empty, we swap it
        const currentVal = codeEditor.value.trim();
        const templates = Object.values(defaultSandboxTemplates).map(t => t.trim());
        
        if (currentVal === '' || templates.includes(currentVal)) {
            codeEditor.value = defaultSandboxTemplates[targetId] || defaultSandboxTemplates.default;
        }
    }
}

// --- Contact Herta Modal Logic ---
function initContactModal() {
    const modal = document.getElementById("contact-modal");
    const openTrigger = document.getElementById("contact-herta-trigger");
    const closeBtn = document.getElementById("btn-close-modal");
    const sendBtn = document.getElementById("btn-send-message-herta");
    const senderInput = document.getElementById("contact-sender-name");
    const msgInput = document.getElementById("contact-msg");
    const replyPane = document.getElementById("modal-reply");

    if (openTrigger) {
        openTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            playSound('click');
            modal.classList.remove("hidden");
            replyPane.classList.add("hidden");
            senderInput.value = '';
            msgInput.value = '';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            playSound('click');
            modal.classList.add("hidden");
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            const sender = senderInput.value.trim() || "ผู้เรียนไร้นาม";
            const text = msgInput.value.trim();

            if (!text) {
                alert("กรุณากรอกข้อความร้องเรียน!");
                playSound('error');
                return;
            }

            playSound('success');

            const hertaSassyReplies = [
                `"สวัสดี ${sender}... ฉันอ่านสารวิจัยของคุณแล้ว สรุปว่ามันน่าเบื่อมากๆ เลยล่ะ! เอาเวลาเขียนข้อความยาวเฟื้อยแบบนี้ไปทดลองบททดสอบ 12 บทเรียนจำลองให้ผ่านก่อนเถอะนะ!"`,
                `"นี่ ${sender} ใช่ไหม? ฉันกำลังวิเคราะห์ Curio โบราณอยู่นะ ห้ามทักมากวนใจบ่อยๆ! แต่เอาเถอะ ถ้ามีปัญหากับบทเรียน ก็ทดลองกดรันโคดรันใน Sandbox ดูก่อนสิ!"`,
                `"สารร้องเรียนทะลุมิติจาก ${sender} ถูกส่งมาถึงกองหนังสือแล้ว ฉันจะส่งหุ่นเชิดร่าง 2 ไปกวาดใบเสร็จเอกสารมาปัดฝุ่นแล้วกัน! คุรุคุรุ~ คุรุริน~!"`
            ];

            const randomReply = hertaSassyReplies[Math.floor(Math.random() * hertaSassyReplies.length)];

            replyPane.innerHTML = `
                <h5 style="color: var(--accent-pink); font-weight:700; margin-bottom: 5px;"><i class="fa-solid fa-reply"></i> Herta ได้สุ่มตอบกลับสารของคุณ:</h5>
                <p style="margin:0;">${randomReply}</p>
            `;
            replyPane.classList.remove("hidden");
        });
    }
}
