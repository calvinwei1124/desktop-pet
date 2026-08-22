# 卡通桌面宠物 · 双版本仓库

一个桌面宠物 App（类似 PawPal）——透明悬浮窗 + 卡通角色 + 番茄工作法提醒。
本仓库同时维护 **macOS** 与 **Windows** 两个平台的独立代码，分别存放在子目录中。

## 目录结构

```
（仓库根）/
├── desktop-pet-mac/         ← macOS 版（Electron，透明悬浮窗 + 菜单栏托盘）
│   ├── main.js             ← 主进程（macOS 专属：托盘文字标题、Dock、screen-saver 置顶）
│   ├── renderer.js / style.css / index.html
│   ├── settings.html / settings.js
│   ├── about.html / about.js
│   ├── characters.js / assets/
│   ├── icon.icns           ← macOS 安装包图标
│   └── package.json        ← 打包目标：dmg / pkg
└── desktop-pet-win/        ← Windows 版（Electron，透明窗 + 系统托盘图标）
    ├── main.js             ← 主进程（Windows 专属：托盘图标 + ToolTip、透明背景色、normal 置顶）
    ├── renderer.js / style.css / index.html
    ├── settings.html / settings.js
    ├── about.html / about.js
    ├── characters.js / assets/（含 tray-icon.png）
    ├── icon.ico            ← Windows 安装包图标（多尺寸透明）
    └── package.json        ← 打包目标：NSIS / Portable exe
```

## 两个版本的差异（仅实现层，功能一致）

| 维度 | macOS 版 | Windows 版 |
| --- | --- | --- |
| 托盘 | 空图标 + 文字标题 `🍅 24:30` | `tray-icon.png` 图标 + ToolTip 显示倒计时 |
| 透明窗口 | 原生 `transparent:true` | 必须指定 `backgroundColor:'#00000000'` 避免黑块 |
| 置顶层级 | `screen-saver` | `normal` |
| 多桌面显示 | 支持（`onAllSpaces`） | 无此概念，配置项自动忽略 |
| 打包产物 | `.dmg` / `.pkg` | `.exe`（NSIS 安装包 / 便携版） |

## 开发与构建

两个版本各自独立 `npm install` 与 `npm start`，互不影响：

```bash
# macOS
cd desktop-pet-mac && npm install && npm start
npm run dist        # 打包 dmg / pkg

# Windows（需在 Windows 机器上构建 exe）
cd desktop-pet-win && npm install && npm start
npm run dist        # 打包 NSIS / Portable
```

## 共享与扩展

两个版本的渲染层（`renderer.js`、`style.css`、`index.html`、`characters.js`、设置页、关于页）
功能一致，修改时请同步两份；平台差异仅集中在各版本的 `main.js` 与 `package.json`。

新增角色：编辑对应版本的 `characters.js`，在数组末尾追加一个对象即可。
