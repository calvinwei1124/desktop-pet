const { ipcRenderer, shell } = require('electron');

document.getElementById('closeBtn').onclick = () => window.close();
document.getElementById('checkBtn').onclick = () => shell.openExternal('https://github.com/calvinwei1124/desktop-pet');
