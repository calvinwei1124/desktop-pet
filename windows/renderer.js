const { ipcRenderer } = require('electron');
const characters = require('./characters.js');

const params = new URLSearchParams(location.search);
const charId = params.get('char') || 'machine-cat';
const character = characters.find((c) => c.id === charId) || characters[0];

const stage = document.getElementById('stage');
const pet = document.getElementById('pet');
const bob = document.getElementById('bob');
const bubble = document.getElementById('bubble');
const timerEl = document.getElementById('timer');

bob.innerHTML = `<img class="char-img" src="${character.src}" alt="${character.name}" draggable="false">`;
document.documentElement.style.setProperty('--accent', character.bg || '#3b82f6');

let screenW = 1440;
let screenH = 900;
let pos = { x: 600, y: 700 };
let dir = 1; // 1 向右, -1 向左
const speed = 1.3;
let moving = true;
let dragging = false;
let startMouse = null;
let startPos = null;
let moved = false;

ipcRenderer.invoke('getScreen').then((s) => {
  screenW = s.width;
  screenH = s.height;
  pos.x = Math.round((screenW - window.outerWidth) / 2);
  pos.y = Math.round(screenH - window.outerHeight - 12);
  ipcRenderer.send('move', pos.x, pos.y);
});

function applyFlip() {
  pet.style.transform = dir < 0 ? 'scaleX(-1)' : 'scaleX(1)';
}

// 行走循环
function tick() {
  if (moving && !dragging) {
    pos.x += speed * dir;
    const maxX = screenW - window.outerWidth;
    if (pos.x <= 0) { pos.x = 0; dir = 1; }
    else if (pos.x >= maxX) { pos.x = maxX; dir = -1; }
    applyFlip();
    ipcRenderer.send('move', Math.round(pos.x), Math.round(pos.y));
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// 气泡
function showBubble(text) {
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubble._t);
  bubble._t = setTimeout(() => bubble.classList.remove('show'), 3200);
}
function randomPhrase() {
  const list = character.phrases || ['你好呀~'];
  showBubble(list[Math.floor(Math.random() * list.length)]);
}
setInterval(() => { if (Math.random() < 0.5) randomPhrase(); }, 9000);

// ---------- 番茄钟 ----------
let pomo = { enabled: false, running: false, phase: 'work', phaseLabel: '工作', remaining: 0, completed: 0, total: 4 };
function fmtPomo(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}
function renderTimer() {
  if (!pomo.enabled) { timerEl.className = ''; timerEl.innerHTML = ''; return; }
  timerEl.className = 'show ' + pomo.phase + (pomo.running ? '' : ' paused');
  const dots = '●'.repeat(pomo.completed) + '○'.repeat(Math.max(0, pomo.total - pomo.completed));
  timerEl.innerHTML =
    `<span class="plabel">${pomo.phaseLabel}</span>` +
    `<span class="ptime">${fmtPomo(pomo.remaining)}</span>` +
    `<span class="pdots">${dots}</span>`;
}
function spawnZZZ() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const z = document.createElement('div');
      z.className = 'zzz';
      z.textContent = 'Z';
      z.style.left = 55 + Math.random() * 15 + '%';
      stage.appendChild(z);
      setTimeout(() => z.remove(), 1400);
    }, i * 350);
  }
}
function setResting(on) {
  if (on) { moving = false; stage.classList.add('resting'); spawnZZZ(); }
  else { moving = true; stage.classList.remove('resting'); }
}
ipcRenderer.on('pomodoro', (e, s) => {
  const prevPhase = pomo.phase, prevRun = pomo.running;
  pomo = s;
  renderTimer();
  if (!s.enabled) { setResting(false); return; }
  if (s.phase !== 'work' && prevPhase === 'work') {
    setResting(true);                                  // 进入休息
    showBubble(s.phase === 'long' ? '长休息啦~ 喝口水、远眺一下 👀' : '休息一下~ 伸个懒腰 💤');
  } else if (s.phase === 'work' && prevPhase !== 'work' && s.running) {
    setResting(false);                                 // 休息结束，恢复工作
    showBubble('开始专注！加油 💪');
  } else if (!prevRun && s.running && s.phase === 'work') {
    setResting(false);
  }
});

// 跳跃
function jump() {
  stage.classList.add('jump');
  setTimeout(() => stage.classList.remove('jump'), 600);
}
setInterval(() => { if (moving && !dragging && Math.random() < 0.3) jump(); }, 7000);

// 抚摸 -> 爱心 + 开心气泡
function petPet() {
  showBubble('好喜欢你呀~');
  pet.classList.add('happy');
  setTimeout(() => pet.classList.remove('happy'), 500);
  for (let i = 0; i < 5; i++) spawnHeart(i * 120);
}
function spawnHeart(delay) {
  setTimeout(() => {
    const h = document.createElement('div');
    h.className = 'heart';
    h.style.left = 40 + Math.random() * 20 + '%';
    stage.appendChild(h);
    setTimeout(() => h.remove(), 1200);
  }, delay);
}

// 拖动 / 点击
stage.addEventListener('mousedown', (e) => {
  dragging = true;
  moved = false;
  startMouse = { x: e.clientX, y: e.clientY };
  startPos = { ...pos };
  stage.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - startMouse.x;
  const dy = e.clientY - startMouse.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  pos.x = startPos.x + dx;
  pos.y = startPos.y + dy;
  ipcRenderer.send('move', Math.round(pos.x), Math.round(pos.y));
});
window.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  stage.style.cursor = 'grab';
  if (!moved) petPet();
});

// 双击打开设置
stage.addEventListener('dblclick', () => ipcRenderer.send('openSettings'));
