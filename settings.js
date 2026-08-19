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
closeBtn.onclick = () => window.close();
