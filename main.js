const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
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
    { label: '设置', click: createSettingsWindow },
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
