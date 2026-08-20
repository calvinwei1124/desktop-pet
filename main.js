const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const characters = require('./characters.js');

let petWindow = null;
let settingsWindow = null;
let tray = null;

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const DEFAULT_CONFIG = {
  character: 'machine-cat',
  scale: 1,
  opacity: 1,
  clickThrough: false,
  onAllSpaces: true,
  autostart: false,
  pomodoro: {
    enabled: false,
    workMin: 25,
    shortMin: 5,
    longMin: 15,
    longEvery: 4,
    notify: true,
    autoStartBreak: true,
    autoStartWork: false,
  },
};

function loadConfig() {
  try {
    return Object.assign({}, DEFAULT_CONFIG, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); } catch (e) { /* ignore */ }
}

// 设置开机自启；沙箱/无权限环境下会抛 "Operation not permitted"，需静默兜底
function safeSetLogin(on) {
  try { app.setLoginItemSettings({ openAtLogin: on }); }
  catch (e) { /* 无权限时忽略，不影响主功能 */ }
}
let config = loadConfig();

const BASE = 200;

// ---------- 番茄工作法计时引擎（跑在主进程，窗口失焦也不停） ----------
const PD = {
  running: false,
  phase: 'work',        // 'work' | 'short' | 'long'
  remaining: (config.pomodoro.workMin || 25) * 60,
  completed: 0,         // 当前循环内已完成的工作番茄数
  interval: null,
};

function pdPhaseMinutes() {
  const p = config.pomodoro;
  if (PD.phase === 'work') return +p.workMin || 25;
  if (PD.phase === 'short') return +p.shortMin || 5;
  return +p.longMin || 15;
}
function pdPhaseLabel() {
  return PD.phase === 'work' ? '工作' : PD.phase === 'short' ? '短休息' : '长休息';
}
function fmtMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function pdNotify(title, body) {
  if (!config.pomodoro.notify) return;
  try { new Notification({ title, body, silent: false }).show(); }
  catch (e) { /* 无通知权限时忽略 */ }
}
function sendPomodoro() {
  const state = {
    enabled: !!config.pomodoro.enabled,
    running: PD.running,
    phase: PD.phase,
    phaseLabel: pdPhaseLabel(),
    remaining: PD.remaining,
    completed: PD.completed,
    total: +config.pomodoro.longEvery || 4,
  };
  const push = (win) => { if (win && win.webContents) { try { win.webContents.send('pomodoro', state); } catch (e) {} } };
  push(petWindow);
  push(settingsWindow);
  if (tray) {
    if (state.enabled && state.running) tray.setTitle(`🍅 ${fmtMMSS(state.remaining)}`);
    else tray.setTitle('Pet');
  }
}
function pdStart() {
  if (PD.running) return;
  if (PD.remaining <= 0) PD.remaining = pdPhaseMinutes() * 60;
  PD.running = true;
  PD.interval = setInterval(pdTick, 1000);
  sendPomodoro();
  refreshTrayMenu();
}
function pdPause() {
  PD.running = false;
  if (PD.interval) { clearInterval(PD.interval); PD.interval = null; }
  sendPomodoro();
  refreshTrayMenu();
}
function pdReset() {
  pdPause();
  PD.phase = 'work';
  PD.completed = 0;
  PD.remaining = pdPhaseMinutes() * 60;
  sendPomodoro();
  refreshTrayMenu();
}
function pdTick() {
  PD.remaining--;
  if (PD.remaining <= 0) {
    PD.remaining = 0;
    sendPomodoro();          // 先显示 00:00
    pdAdvance();
    return;
  }
  sendPomodoro();
}
function pdAdvance() {
  // 当前阶段结束，进入下一阶段
  if (PD.phase === 'work') {
    PD.completed++;
    const isLong = PD.completed % (+config.pomodoro.longEvery || 4) === 0;
    PD.phase = isLong ? 'long' : 'short';
    pdNotify('🍅 工作完成！', isLong ? '完成一个番茄钟，来一轮长休息吧~' : '辛苦啦，伸展一下休息几分钟~');
  } else {
    PD.phase = 'work';
    pdNotify('☕ 休息结束', '继续专注，开始新的番茄钟！');
  }
  PD.remaining = pdPhaseMinutes() * 60;
  refreshTrayMenu();
  const auto = PD.phase === 'work' ? config.pomodoro.autoStartWork : config.pomodoro.autoStartBreak;
  if (!auto) pdPause();      // 不自动衔接则暂停，等待用户开始
}


function createPetWindow() {
  const size = Math.round(BASE * config.scale);
  petWindow = new BrowserWindow({
    width: size,
    height: size,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  petWindow.setAlwaysOnTop(true, 'screen-saver');
  petWindow.setVisibleOnAllWorkspaces(!!config.onAllSpaces, { visibleOnFullScreen: true });
  petWindow.setOpacity(config.opacity);
  if (config.clickThrough) petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.loadFile('index.html', { query: { char: config.character } });
  petWindow.webContents.on('did-finish-load', () => sendPomodoro());
  petWindow.on('closed', () => { petWindow = null; });
}

function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 420,
    height: 540,
    transparent: false,
    frame: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

let aboutWindow = null;
function createAboutWindow() {
  if (aboutWindow) { aboutWindow.focus(); return; }
  aboutWindow = new BrowserWindow({
    width: 420,
    height: 560,
    transparent: false,
    frame: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  aboutWindow.loadFile('about.html');
  aboutWindow.on('closed', () => { aboutWindow = null; });
}

function setCharacter(id) {
  config.character = id;
  saveConfig(config);
  if (petWindow) petWindow.loadFile('index.html', { query: { char: id } });
  refreshTrayMenu();
}

function refreshTrayMenu() {
  const charItems = characters.map((c) => ({
    label: c.name,
    type: 'radio',
    checked: config.character === c.id,
    click: () => setCharacter(c.id),
  }));
  const menu = Menu.buildFromTemplate([
    { label: '桌面宠物', enabled: false },
    { type: 'separator' },
    ...charItems,
    { type: 'separator' },
    { label: `🍅 番茄钟 · ${pdPhaseLabel()} ${fmtMMSS(PD.remaining)}`, enabled: false },
    { label: PD.running ? '暂停番茄钟' : '开始番茄钟', click: () => (PD.running ? pdPause() : pdStart()) },
    { label: '重置番茄钟', click: () => pdReset() },
    { type: 'separator' },
    { label: '设置', click: createSettingsWindow },
    { label: '关于本应用', click: createAboutWindow },
    { label: '退出', click: () => app.quit() },
  ]);
  if (tray) tray.setContextMenu(menu);
}

function buildTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('Pet');
  refreshTrayMenu();
  tray.on('click', () => { if (petWindow) petWindow.show(); });
}

// ---------- IPC ----------
ipcMain.handle('getScreen', () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});
ipcMain.handle('getConfig', () => config);

ipcMain.on('move', (e, x, y) => { if (petWindow) petWindow.setPosition(Math.round(x), Math.round(y)); });
ipcMain.on('openSettings', () => createSettingsWindow());
ipcMain.on('openAbout', () => createAboutWindow());
ipcMain.on('setCharacter', (e, id) => setCharacter(id));
ipcMain.on('setScale', (e, scale) => {
  config.scale = scale; saveConfig(config);
  if (!petWindow) return;
  const old = petWindow.getSize();
  const nw = Math.round(BASE * scale);
  const [x, y] = petWindow.getPosition();
  petWindow.setSize(nw, nw);
  petWindow.setPosition(Math.round(x + (old[0] - nw) / 2), Math.round(y + (old[1] - nw) / 2));
});
ipcMain.on('setOpacity', (e, o) => {
  config.opacity = o; saveConfig(config);
  if (petWindow) petWindow.setOpacity(o);
});
ipcMain.on('setClickThrough', (e, on) => {
  config.clickThrough = on; saveConfig(config);
  if (petWindow) petWindow.setIgnoreMouseEvents(on, { forward: true });
});
ipcMain.on('setOnAllSpaces', (e, on) => {
  config.onAllSpaces = on; saveConfig(config);
  if (petWindow) petWindow.setVisibleOnAllWorkspaces(on, { visibleOnFullScreen: true });
});
ipcMain.on('setAutostart', (e, on) => {
  config.autostart = on; saveConfig(config);
  safeSetLogin(on);
});

// ---------- 番茄钟 IPC ----------
ipcMain.on('pomodoroControl', (e, action) => {
  if (action === 'start') pdStart();
  else if (action === 'pause') pdPause();
  else if (action === 'toggle') (PD.running ? pdPause() : pdStart());
  else if (action === 'reset') pdReset();
});
ipcMain.on('setPomodoroConfig', (e, patch) => {
  config.pomodoro = Object.assign({}, config.pomodoro, patch || {});
  saveConfig(config);
  // 关闭总开关或尚未开始时，重算当前阶段剩余时间；关闭总开关则暂停
  if (!config.pomodoro.enabled) pdPause();
  if (!PD.running) PD.remaining = pdPhaseMinutes() * 60;
  sendPomodoro();
  refreshTrayMenu();
});

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();
  safeSetLogin(!!config.autostart);
  createPetWindow();
  buildTray();
  app.on('activate', () => { if (!petWindow) createPetWindow(); });
});

app.on('window-all-closed', (e) => {
  // 托盘常驻：关闭所有窗口也不退出
  e.preventDefault();
});
