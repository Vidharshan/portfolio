/* ═══════════════════════════════════════════════════════
   PORTFOLIO + FULL-PAGE SNAKE — script.js
   The snake lives ON the page. Content blocks are walls.
   ═══════════════════════════════════════════════════════ */

// ─── 1. TYPING EFFECT ────────────────────────────────
const ROLES=["Full Stack Developer","AI Enthusiast","Problem Solver","Creative Coder"];
let ri=0,ci=0,del=false;const typed=document.getElementById("typedText");
function typeLoop(){const w=ROLES[ri];typed.textContent=del?w.slice(0,--ci):w.slice(0,++ci);let d=del?35:70;
if(!del&&ci===w.length){d=1800;del=true}else if(del&&ci===0){del=false;ri=(ri+1)%ROLES.length;d=400}setTimeout(typeLoop,d)}
setTimeout(typeLoop,1200);

// ─── 2. NAVBAR ───────────────────────────────────────
const nav=document.getElementById("navbar");
window.addEventListener("scroll",()=>nav.classList.toggle("scrolled",scrollY>50));
const navToggle=document.getElementById("navToggle"),navLinks=document.getElementById("navLinks");
navToggle.addEventListener("click",()=>{navToggle.classList.toggle("active");navLinks.classList.toggle("open");document.body.style.overflow=navLinks.classList.contains("open")?"hidden":""});
navLinks.querySelectorAll(".nav-link").forEach(l=>l.addEventListener("click",()=>{navToggle.classList.remove("active");navLinks.classList.remove("open");document.body.style.overflow=""}));

// ─── 3. SCROLL ANIM + COUNTERS ──────────────────────
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")}),{threshold:.12,rootMargin:"0px 0px -40px 0px"});
document.querySelectorAll("[data-animate]").forEach(el=>obs.observe(el));
let countDone=false;
const cObs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!countDone){countDone=true;
document.querySelectorAll(".stat-num").forEach(c=>{const t=+c.dataset.target,s=performance.now();
(function up(now){const p=Math.min((now-s)/1800,1);c.textContent=Math.round(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(up)})(s)})}}),{threshold:.5});
const hs=document.querySelector(".hero-stats");if(hs)cObs.observe(hs);
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{e.preventDefault();const t=document.querySelector(a.getAttribute("href"));if(t)t.scrollIntoView({behavior:"smooth"})}));

// ─── 4. CONTACT FORM ────────────────────────────────
document.getElementById("contactForm").addEventListener("submit",e=>{e.preventDefault();const b=e.target.querySelector("button");const o=b.innerHTML;
b.innerHTML="<span>Sent! ✓</span>";b.style.background="linear-gradient(135deg,#22c55e,#16a34a)";setTimeout(()=>{b.innerHTML=o;b.style.background="";e.target.reset()},2500)});

// ═══════════════════════════════════════════════════════
// 5. FULL-PAGE SNAKE GAME
// The snake slithers around the viewport.
// Content elements (headings, cards, buttons…) are walls.
// ═══════════════════════════════════════════════════════

const CELL = 18;                       // px per grid cell
const TICK = 110;                      // ms between moves
const AI_RESUME_DELAY = 4000;          // ms before AI retakes control
const OBSTACLE_PAD = 1;               // cells of padding around content

const snakeCanvas = document.getElementById("snake-canvas");
const sCtx = snakeCanvas.getContext("2d");
const $hudScore = document.getElementById("hudScore");
const $hudHint = document.getElementById("hudHint");

// Selectors for elements that count as walls
const WALL_SELECTORS = [
    "nav","h1","h2","h3","p","pre","code",
    ".btn",".code-card",".hero-badge",".hero-stats",".stat",
    ".skill-card",".proj-card",".proj-img",".proj-body",
    ".c-card",".contact-form",".chip",
    ".section-hdr",".about-chips",".about-lead",
    "footer","input","textarea","button","label",
    ".tags span",".proj-tags span",".snake-hud",
    ".hero-cta",".hero-desc",".hero-title",
    ".contact-info h3",".contact-info > p"
].join(",");

let gridCols, gridRows;
let wallGrid = [];   // true = blocked
let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = null;
let score = 0;
let hiScore = +(localStorage.getItem("snakeHi2") || 0);
let isUserControlling = false;
let userTimer = null;
let gameInterval = null;

// ─── Canvas sizing ────────────────────────────────
function sizeCanvas() {
    snakeCanvas.width = window.innerWidth;
    snakeCanvas.height = window.innerHeight;
    gridCols = Math.floor(snakeCanvas.width / CELL);
    gridRows = Math.floor(snakeCanvas.height / CELL);
}

// ─── Build collision grid from DOM ────────────────
function buildWallGrid() {
    wallGrid = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    const els = document.querySelectorAll(WALL_SELECTORS);
    els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        // If element is off-screen vertically, skip
        if (r.bottom < 0 || r.top > window.innerHeight) return;

        const c1 = Math.floor(r.left / CELL) - OBSTACLE_PAD;
        const c2 = Math.ceil(r.right / CELL) + OBSTACLE_PAD;
        const r1 = Math.floor(r.top / CELL) - OBSTACLE_PAD;
        const r2 = Math.ceil(r.bottom / CELL) + OBSTACLE_PAD;

        for (let row = Math.max(0, r1); row < Math.min(gridRows, r2); row++)
            for (let col = Math.max(0, c1); col < Math.min(gridCols, c2); col++)
                wallGrid[row][col] = true;
    });
}

function isWall(x, y) {
    if (x < 0 || x >= gridCols || y < 0 || y >= gridRows) return true;
    return wallGrid[y] && wallGrid[y][x];
}

function isSelf(x, y) {
    return snake.some(s => s.x === x && s.y === y);
}

function isFree(x, y) {
    return !isWall(x, y) && !isSelf(x, y);
}

// ─── Find empty cell ──────────────────────────────
function randomEmpty() {
    const empties = [];
    for (let r = 0; r < gridRows; r++)
        for (let c = 0; c < gridCols; c++)
            if (!wallGrid[r][c] && !isSelf(c, r))
                empties.push({ x: c, y: r });
    return empties.length ? empties[Math.floor(Math.random() * empties.length)] : { x: 1, y: 1 };
}

// ─── Spawn food ───────────────────────────────────
function spawnFood() {
    food = randomEmpty();
}

// ─── Init snake ───────────────────────────────────
function initSnake() {
    buildWallGrid();
    const start = randomEmpty();
    snake = [start];
    // Try to add 2 more segments behind
    for (let i = 1; i <= 2; i++) {
        const prev = snake[snake.length - 1];
        const behind = { x: prev.x - 1, y: prev.y };
        if (isFree(behind.x, behind.y)) snake.push(behind);
    }
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    $hudScore.textContent = score;
    spawnFood();
}

// ─── Simple AI auto-pilot ─────────────────────────
function aiDecide() {
    // Possible directions (exclude 180° reverse)
    const dirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 }
    ].filter(d => !(d.x === -dir.x && d.y === -dir.y));

    const head = snake[0];

    // Score each direction: prefer food direction, avoid walls
    let best = null, bestScore = -Infinity;
    for (const d of dirs) {
        const nx = head.x + d.x, ny = head.y + d.y;
        if (!isFree(nx, ny)) continue;

        let s = 0;
        // Reward: moving toward food
        if (food) {
            const currDist = Math.abs(head.x - food.x) + Math.abs(head.y - food.y);
            const newDist = Math.abs(nx - food.x) + Math.abs(ny - food.y);
            s += (currDist - newDist) * 3;
        }
        // Reward: continuing current direction (smooth movement)
        if (d.x === dir.x && d.y === dir.y) s += 1;
        // Reward: open space ahead (look 3 cells ahead)
        let open = 0;
        for (let k = 1; k <= 3; k++) {
            if (isFree(nx + d.x * k, ny + d.y * k)) open++;
        }
        s += open;
        // Small random factor for variety
        s += Math.random() * 0.5;

        if (s > bestScore) { bestScore = s; best = d; }
    }

    if (best) nextDir = best;
    else {
        // All directions blocked — try any free neighbor
        for (const d of dirs) {
            if (isFree(head.x + d.x, head.y + d.y)) { nextDir = d; return; }
        }
        // Truly stuck — teleport
        const np = randomEmpty();
        snake = [np];
        dir = { x: 1, y: 0 }; nextDir = dir;
    }
}

// ─── Game tick ────────────────────────────────────
function tick() {
    if (!isUserControlling) aiDecide();

    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wrap around edges
    if (head.x < 0) head.x = gridCols - 1;
    if (head.x >= gridCols) head.x = 0;
    if (head.y < 0) head.y = gridRows - 1;
    if (head.y >= gridRows) head.y = 0;

    // Wall or self collision
    if (isWall(head.x, head.y) || isSelf(head.x, head.y)) {
        if (isUserControlling) {
            // Player hit something — respawn, keep score
            beep(180, 0.2);
            const np = randomEmpty();
            snake = [np];
            dir = { x: 1, y: 0 }; nextDir = dir;
            switchToAI();
        } else {
            // AI stuck — teleport
            const np = randomEmpty();
            snake = [np];
            dir = { x: 1, y: 0 }; nextDir = dir;
        }
        return;
    }

    snake.unshift(head);

    // Food?
    if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        if (score > hiScore) { hiScore = score; localStorage.setItem("snakeHi2", hiScore); }
        $hudScore.textContent = score;
        beep(880, 0.08);
        setTimeout(() => beep(1100, 0.06), 50);
        spawnFood();
    } else {
        snake.pop();
    }
}

// ─── Render ───────────────────────────────────────
function render() {
    sCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);

    // Food (pulsing golden dot)
    if (food) {
        const pulse = 0.6 + Math.sin(Date.now() / 140) * 0.4;
        const fx = food.x * CELL + CELL / 2;
        const fy = food.y * CELL + CELL / 2;
        const fr = CELL * 0.32 * pulse;

        sCtx.save();
        sCtx.shadowColor = "#ffcc00";
        sCtx.shadowBlur = 12 * pulse;
        sCtx.beginPath();
        sCtx.arc(fx, fy, fr, 0, Math.PI * 2);
        sCtx.fillStyle = "#ffcc00";
        sCtx.fill();
        sCtx.beginPath();
        sCtx.arc(fx, fy, fr * 0.45, 0, Math.PI * 2);
        sCtx.fillStyle = "#fff8e0";
        sCtx.fill();
        sCtx.restore();
    }

    // Snake
    const len = snake.length;
    for (let i = len - 1; i >= 0; i--) {
        const seg = snake[i];
        const sx = seg.x * CELL, sy = seg.y * CELL;
        const t = 1 - i / Math.max(len, 1);          // 1 at head, 0 at tail

        sCtx.save();
        if (i === 0) {
            // Head
            sCtx.shadowColor = "#39ff14";
            sCtx.shadowBlur = 10;
            sCtx.fillStyle = "#7fff5a";
            roundRect(sCtx, sx + 1, sy + 1, CELL - 2, CELL - 2, 5);
            sCtx.fill();
            // Eyes
            sCtx.shadowBlur = 0;
            sCtx.fillStyle = "#0a1a0a";
            const es = Math.max(2, CELL * 0.14);
            if (dir.x === 1)       { sCtx.fillRect(sx+CELL*.62,sy+CELL*.22,es,es); sCtx.fillRect(sx+CELL*.62,sy+CELL*.6,es,es); }
            else if (dir.x === -1) { sCtx.fillRect(sx+CELL*.24,sy+CELL*.22,es,es); sCtx.fillRect(sx+CELL*.24,sy+CELL*.6,es,es); }
            else if (dir.y === -1) { sCtx.fillRect(sx+CELL*.22,sy+CELL*.24,es,es); sCtx.fillRect(sx+CELL*.6,sy+CELL*.24,es,es); }
            else                   { sCtx.fillRect(sx+CELL*.22,sy+CELL*.62,es,es); sCtx.fillRect(sx+CELL*.6,sy+CELL*.62,es,es); }
        } else {
            // Body — gradient fade from green to dimmer green
            const g = Math.round(200 * t + 55);
            const r = Math.round(40 * t + 15);
            const b = Math.round(16 * t + 8);
            sCtx.fillStyle = `rgb(${r},${g},${b})`;
            sCtx.shadowColor = `rgba(57,255,20,${0.15 * t})`;
            sCtx.shadowBlur = 4 * t;
            roundRect(sCtx, sx + 2, sy + 2, CELL - 4, CELL - 4, 4);
            sCtx.fill();
        }
        sCtx.restore();
    }

    requestAnimationFrame(render);
}

function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r,y);
    c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
    c.closePath();
}

// ─── Audio ────────────────────────────────────────
let audioCtx = null;
function beep(freq, dur) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = "square"; o.frequency.value = freq; g.gain.value = 0.06;
        o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        o.stop(audioCtx.currentTime + dur);
    } catch (_) {}
}

// ─── User input ───────────────────────────────────
function switchToUser() {
    isUserControlling = true;
    $hudHint.textContent = "You're playing!";
    clearTimeout(userTimer);
    userTimer = setTimeout(switchToAI, AI_RESUME_DELAY);
}
function switchToAI() {
    isUserControlling = false;
    $hudHint.textContent = "Arrow keys to play";
}

function trySetDir(dx, dy) {
    if (dir.x === -dx && dir.y === -dy) return; // no 180
    nextDir = { x: dx, y: dy };
    switchToUser();
}

document.addEventListener("keydown", e => {
    switch (e.key) {
        case "ArrowUp":    case "w": case "W": e.preventDefault(); trySetDir(0,-1); break;
        case "ArrowDown":  case "s": case "S": e.preventDefault(); trySetDir(0,1);  break;
        case "ArrowLeft":  case "a": case "A": e.preventDefault(); trySetDir(-1,0); break;
        case "ArrowRight": case "d": case "D": e.preventDefault(); trySetDir(1,0);  break;
    }
});

// Touch swipe
let touchStart = null;
document.addEventListener("touchstart", e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener("touchend", e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) trySetDir(dx > 0 ? 1 : -1, 0);
    else trySetDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
});

// ─── Scroll & resize → rebuild grid ──────────────
let scrollDebounce = null;
function onLayoutChange() {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
        sizeCanvas();
        buildWallGrid();
        // If snake is now inside a wall, teleport
        if (snake.length && isWall(snake[0].x, snake[0].y)) {
            const np = randomEmpty();
            snake = [np];
            dir = { x: 1, y: 0 }; nextDir = dir;
        }
        // If food is inside a wall, respawn
        if (food && isWall(food.x, food.y)) spawnFood();
    }, 120);
}
window.addEventListener("scroll", onLayoutChange, { passive: true });
window.addEventListener("resize", onLayoutChange);

// ─── Start everything ─────────────────────────────
sizeCanvas();
initSnake();
gameInterval = setInterval(tick, TICK);
requestAnimationFrame(render);
