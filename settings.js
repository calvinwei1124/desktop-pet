const { ipcRenderer } = require('electron');
const characters = require('./characters.js');

const charSel = document.getElementById('char');
const scale = document.getElementById('scale');
const scaleVal = document.getElementById('scaleVal');
const opacity = document.getElementById('opacity');
const opacityVal = document.getElementById('opacityVal');
const ct = document.getElementById('ct');
const spaces = document.getElementById('spaces');
const auto = document.getElementById('auto');
const closeBtn = document.getElementById('closeBtn');
const pdEnabled = document.getElementById('pdEnabled');
const pdWork = document.getElementById('pdWork');
const pdShort = document.getElementById('pdShort');
const pdLong = document.getElementById('pdLong');
const pdEvery = document.getElementById('pdEvery');
const workVal = document.getElementById('workVal');
const shortVal = document.getElementById('shortVal');
const longVal = document.getElementById('longVal');
const everyVal = document.getElementById('everyVal');
const pdNotify = document.getElementById('pdNotify');
const pdAutoBreak = document.getElementById('pdAutoBreak');
const pdAutoWork = document.getElementById('pdAutoWork');
const pdToggle = document.getElementById('pdToggle');
const pdReset = document.getElementById('pdReset');
const pdStatus = document.getElementById('pdStatus');

characters.forEach((c) => {
  const o = document.createElement('option');
  o.value = c.id;
  o.textContent = c.name;
  charSel.appendChild(o);
});

ipcRenderer.invoke('getConfig').then((cfg) => {
  charSel.value = cfg.character;
  scale.value = cfg.scale;
  scaleVal.textContent = (+cfg.scale).toFixed(1);
  opacity.value = cfg.opacity;
  opacityVal.textContent = (+cfg.opacity).toFixed(2);
  ct.checked = cfg.clickThrough;
  spaces.checked = cfg.onAllSpaces;
  auto.checked = cfg.autostart;
  const p = cfg.pomodoro || {};
  pdEnabled.checked = !!p.enabled;
  pdWork.value = p.workMin || 25; workVal.textContent = p.workMin || 25;
  pdShort.value = p.shortMin || 5; shortVal.textContent = p.shortMin || 5;
  pdLong.value = p.longMin || 15; longVal.textContent = p.longMin || 15;
  pdEvery.value = p.longEvery || 4; everyVal.textContent = p.longEvery || 4;
  pdNotify.checked = p.notify !== false;
  pdAutoBreak.checked = p.autoStartBreak !== false;
  pdAutoWork.checked = !!p.autoStartWork;
});

charSel.onchange = () => ipcRenderer.send('setCharacter', charSel.value);
scale.oninput = () => {
  scaleVal.textContent = (+scale.value).toFixed(1);
  ipcRenderer.send('setScale', +scale.value);
};
opacity.oninput = () => {
  opacityVal.textContent = (+opacity.value).toFixed(2);
  ipcRenderer.send('setOpacity', +opacity.value);
};
ct.onchange = () => ipcRenderer.send('setClickThrough', ct.checked);
spaces.onchange = () => ipcRenderer.send('setOnAllSpaces', spaces.checked);
auto.onchange = () => ipcRenderer.send('setAutostart', auto.checked);

// ---------- 番茄钟 ----------
function fmtPomo(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}
pdEnabled.onchange = () => ipcRenderer.send('setPomodoroConfig', { enabled: pdEnabled.checked });
pdWork.oninput = () => { workVal.textContent = pdWork.value; ipcRenderer.send('setPomodoroConfig', { workMin: +pdWork.value }); };
pdShort.oninput = () => { shortVal.textContent = pdShort.value; ipcRenderer.send('setPomodoroConfig', { shortMin: +pdShort.value }); };
pdLong.oninput = () => { longVal.textContent = pdLong.value; ipcRenderer.send('setPomodoroConfig', { longMin: +pdLong.value }); };
pdEvery.oninput = () => { everyVal.textContent = pdEvery.value; ipcRenderer.send('setPomodoroConfig', { longEvery: +pdEvery.value }); };
pdNotify.onchange = () => ipcRenderer.send('setPomodoroConfig', { notify: pdNotify.checked });
pdAutoBreak.onchange = () => ipcRenderer.send('setPomodoroConfig', { autoStartBreak: pdAutoBreak.checked });
pdAutoWork.onchange = () => ipcRenderer.send('setPomodoroConfig', { autoStartWork: pdAutoWork.checked });
pdToggle.onclick = () => ipcRenderer.send('pomodoroControl', 'toggle');
pdReset.onclick = () => ipcRenderer.send('pomodoroControl', 'reset');

// 实时状态（主进程每秒推送）
ipcRenderer.on('pomodoro', (e, s) => {
  if (!s || !s.enabled) {
    pdStatus.textContent = '状态：未启用';
    pdToggle.textContent = '开始 / 暂停';
    return;
  }
  const tag = s.running ? '进行中' : '已暂停';
  const dots = '●'.repeat(s.completed) + '○'.repeat(Math.max(0, s.total - s.completed));
  pdStatus.textContent = `状态：${s.phaseLabel} ${tag} · 剩余 ${fmtPomo(s.remaining)} · 本轮回合 ${dots}`;
  pdToggle.textContent = s.running ? '暂停' : '开始';
});

closeBtn.onclick = () => window.close();
