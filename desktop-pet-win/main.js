const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const characters = require('./characters.js');

const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

let petWindow = null;
let settingsWindow = null;
let aboutWindow = null;
let tray = null;

// Windows 托盘图标（macOS 用空图标 + 文字标题，无需图片）
const TRAY_ICON = path.join(__dirname, 'assets', 'tray-icon.png');
// 窗口图标（Windows 任务栏/标题栏显示）
const WIN_ICON = nativeImage.createFromPath(TRAY_ICON);

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const DEFAULT_CONFIG = {
  character: 'machine-cat',
  scale: 1,
  opacity: 1,
  clickThrough: false,
  onAllSpaces: true,   // 仅 macOS 有效；Windows 忽略
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

// 设置开机自启（macOS 沙箱/无权限会抛错，静默兜底；Windows 下直接生效）
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
    const live = state.enabled && state.running ? `🍅 ${fmtMMSS(state.remaining)}` : null;
    if (IS_WIN) tray.setToolTip(live || '卡通桌面宠物');
    else tray.setTitle(live || 'Pet');
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
  const opts = {
    width: size,
    height: size,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  };
  // Windows 透明无边框窗口必须指定透明背景色，否则渲染成黑色块
  if (IS_WIN) opts.backgroundColor = '#00000000';
  if (IS_WIN) opts.icon = WIN_ICON;
  petWindow = new BrowserWindow(opts);
  petWindow.setAlwaysOnTop(true, IS_WIN ? 'normal' : 'screen-saver');
  if (IS_MAC) petWindow.setVisibleOnAllWorkspaces(!!config.onAllSpaces, { visibleOnFullScreen: true });
  petWindow.setOpacity(config.opacity);
  if (config.clickThrough) petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.loadFile('index.html', { query: { char: config.character } });
  petWindow.webContents.on('did-finish-load', () => sendPomodoro());
  petWindow.on('closed', () => { petWindow = null; });
}

function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  const opts = {
    width: 420, height: 540,
    transparent: false, frame: true, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  };
  if (IS_WIN) opts.icon = WIN_ICON;
  settingsWindow = new BrowserWindow(opts);
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function createAboutWindow() {
  if (aboutWindow) { aboutWindow.focus(); return; }
  const opts = {
    width: 420, height: 560,
    transparent: false, frame: true, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  };
  if (IS_WIN) opts.icon = WIN_ICON;
  aboutWindow = new BrowserWindow(opts);
  aboutWindow.loadFile('about.html');
  aboutWindow.on('closed', () => { aboutWindow = null; });
}

const REPO_URL = 'https://github.com/calvinwei1124/desktop-pet';
function checkForUpdates() {
  try { shell.openExternal(REPO_URL); } catch (e) { /* ignore */ }
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
    { label: '检查更新', click: checkForUpdates },
    { label: '作者信息', click: createAboutWindow },
    { label: '退出', click: () => app.quit() },
  ]);
  if (tray) tray.setContextMenu(menu);
}

function buildTray() {
  // Windows 必须有真实图标；macOS 用空图标 + 文字标题
  if (IS_WIN) {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
    tray.setToolTip('卡通桌面宠物');
  } else {
    tray = new Tray(nativeImage.createEmpty());
    tray.setTitle('Pet');
  }
  refreshTrayMenu();
  // 左键点击：显示宠物窗口（Windows 右键会自动弹出上面的菜单）
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
  if (IS_MAC && petWindow) petWindow.setVisibleOnAllWorkspaces(on, { visibleOnFullScreen: true });
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
  if (!config.pomodoro.enabled) pdPause();
  if (!PD.running) PD.remaining = pdPhaseMinutes() * 60;
  sendPomodoro();
  refreshTrayMenu();
});

app.whenReady().then(() => {
  if (IS_MAC) app.dock.hide();
  safeSetLogin(!!config.autostart);
  createPetWindow();
  buildTray();
  app.on('activate', () => { if (!petWindow) createPetWindow(); });
});

app.on('window-all-closed', (e) => {
  // 托盘常驻：关闭所有窗口也不退出
  e.preventDefault();
});
