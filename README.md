# 卡通桌面宠物（类似 PawPal，macOS）

一个用 Electron 做的桌面宠物小应用，宠物会自己在屏幕上溜达、跳跃、冒泡说话，
你点一下它会开心冒爱心，拖动可以移动，双击打开设置换角色。内置 5 个原创卡通角色：

- 机器猫
- 葫芦兄弟
- 齐天大圣
- 舒克和贝塔
- 邋遢大王

> 角色均为原创卡通致敬形象（非官方版权素材），仅供个人学习/娱乐使用。

## 运行方式

需要本机已安装 [Node.js](https://nodejs.org/)（建议 18+）。

```bash
cd desktop-pet
npm install      # 首次安装 Electron（约几十 MB，需要联网）
npm start       # 启动桌面宠物
```

启动后宠物会出现在屏幕底部中央，菜单栏会出现一个标题为 `Pet` 的托盘图标，
点击托盘可切换角色、打开设置或退出。

## 基本操作

| 操作 | 效果 |
| --- | --- |
| 单击宠物 | 抚摸，冒爱心 + 开心台词 |
| 拖动宠物 | 移动到任意位置 |
| 双击宠物 | 打开设置窗口 |
| 点击托盘 `Pet` | 切换角色 / 设置 / 退出 |

## 设置项

- **当前角色**：切换已有宠物
- **大小**：0.5x ~ 2x 缩放
- **透明度**：0.3 ~ 1
- **点击穿透**：开启后宠物完全不挡鼠标，适合纯装饰
- **所有桌面显示**：在每一个桌面/全屏应用上都显示
- **开机自动启动**：登录系统后自动运行

所有设置都会自动保存到 `~/Library/Application Support/cartoon-desktop-pet/config.json`。

## 如何新增角色（重点：可无限扩展）

角色以 **PNG 图片**形式存放在 `assets/` 目录下，注册在 `characters.js` 数组里。**加角色只需两步，无需改动任何其他代码**：

1. 把图片放进 `assets/`，文件名建议与 `id` 一致（如 `my-char.png`）。
2. 在 `characters.js` 数组里追加一个对象：

```js
{
  id: 'my-char',                 // 唯一英文标识，与图片文件名一致
  name: '我的角色',              // 显示名称
  bg: '#ff0000',                // 气泡描边主色
  src: 'assets/my-char.png',    // 图片路径（相对于项目根目录）
  phrases: ['台词一', '台词二'],  // 随机冒泡内容
}
```

保存后重新 `npm start`，新角色会自动出现在设置下拉框和托盘菜单中。

### 关于角色图片

- **推荐 `1024x1024` PNG，带透明背景**（与窗口透明效果搭配最自然）。
- 全身构图，主体居中，边缘留少量留白，避免被裁切。
- 风格不限：写实、卡通、3D 渲染均可；只要放在透明背景上就行。
- 想换 GIF 动效？可在 `renderer.js` 把 `<img>` 换成支持动画的标签即可，结构已预留。

## 打包成安装包（dmg）

已内置 `electron-builder` 配置，默认生成 `.dmg` 镜像（双击挂载后把 App 拖进「应用程序」即可）。

### 打包
```bash
npm install --save-dev electron-builder
npm run dist        # 生成 dist/卡通桌面宠物-1.0.0.dmg（默认目标）
# 或只生成 .app（不打包）：npm run dist:app
# 或生成 .pkg 安装包：        npm run dist:pkg
```
图标 `icon.icns` 已由机器猫图通过 `sips`/`iconutil` 生成为 `icon.icns`，无需重复。

### 安装（未签名放行）
本 App **未做代码签名**（无开发者证书），首次打开 macOS 会拦截。任选一种放行：
- **方式 A（推荐）**：双击 `卡通桌面宠物-1.0.0.dmg` 挂载 → 把「卡通桌面宠物」拖到「Applications」文件夹即可。若弹拦截，右键（或 Control+点击）dmg 内 App → 打开 → 仍要打开。
- **方式 B**：系统设置 → 隐私与安全性 → 底部「已阻止使用…」→ 仍要打开。
- **方式 C（pkg 备选）**：若改用 `npm run dist:pkg` 生成 .pkg，右键 pkg → 打开 → 仍要打开，按安装器完成。

> 若 `electron-builder` 生成 dmg 时卡在下载 dmg 组件（网络受限），可手动兜底：
> `hdiutil create -volname "卡通桌面宠物" -srcfolder "dist/mac/卡通桌面宠物.app" -ov -format UDZO "dist/卡通桌面宠物-1.0.0.dmg"`

> 若想彻底消除拦截，需加入 Apple Developer Program，在 `package.json` 的 `build.mac.identity` 配置证书并开启 `notarize`。

## 文件结构

```
desktop-pet/
├── package.json      # 项目配置 & 启动脚本
├── main.js           # 主进程：窗口/托盘/配置/通信
├── index.html        # 宠物窗口
├── renderer.js       # 宠物行为逻辑（行走/互动/气泡）
├── style.css         # 宠物样式与动画
├── characters.js     # ★ 角色注册表（加角色改这里）
├── settings.html     # 设置窗口
├── settings.js       # 设置逻辑
├── assets/           # ★ 角色图片（机器猫、葫芦兄弟、齐天大圣、舒克贝塔、邋遢大王）
└── README.md
```

## 已知小限制

- 当前版本宠物是一个小方块窗口，未做「透明区域点击穿透」的逐像素命中，
  所以互动模式下宠物周围一小块区域会挡住鼠标；需要纯装饰时请开启「点击穿透」。
- 角色为原创卡通形象，若用于公开发布请注意相关 IP 授权。
