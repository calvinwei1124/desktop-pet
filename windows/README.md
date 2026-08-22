# 卡通桌面宠物 · Windows 版

macOS 版代码见同级目录 `desktop-pet/`，本目录是**独立存放的 Windows 版本**（代码与 macOS 版分开），功能一致：

- 屏幕常驻卡通宠物（机器猫 / 葫芦兄弟 / 齐天大圣 / 舒克和贝塔 / 邋遢大王），可自由扩展角色
- 单击宠物是"抚摸"，拖动可移动，双击打开设置
- 🍅 番茄工作法：工作 / 短休 / 长休循环，阶段切换弹系统通知提醒休息
- 休息时宠物停下并冒 `💤` 气泡
- 个性化：大小、透明度、点击穿透、开机自启
- 菜单栏（托盘）控制：切换角色、番茄钟开始/暂停/重置、设置、关于、检查更新、作者信息

## 与 macOS 版的差异（仅实现层）

| 项目 | macOS | Windows |
| --- | --- | --- |
| 托盘 | 空图标 + 文字标题 `🍅 倒计时` | 图标 `assets/tray-icon.png` + ToolTip 倒计时 |
| 置顶层级 | `screen-saver` | `normal` |
| 透明窗口 | 原生 `transparent` | 额外指定 `backgroundColor:'#00000000'` |
| 多桌面显示 | `setVisibleOnAllWorkspaces` | 不适用（忽略该项） |
| 打包产物 | `.dmg` | `.exe`（NSIS 安装包）/ 便携版 `.exe` |

共享文件（跨平台通用，与 macOS 版内容一致）：`characters.js`、`index.html`、`renderer.js`、`style.css`、`settings.html`、`settings.js`、`about.html`、`about.js`、`assets/*.png`。

## 运行 / 构建（在 Windows 上）

```bash
npm install          # 安装 electron 与 electron-builder
npm start            # 开发模式启动
npm run dist         # 打包 NSIS 安装包（输出 dist/*.exe）
npm run dist:portable# 打包便携版 exe
```

> 打包需要 `icon.ico`（已提供，多尺寸含透明）。如需替换图标，准备一张正方形透明 PNG，用任意工具转成 `icon.ico` 覆盖即可。

## 如何新增角色

打开 `characters.js`，在数组末尾加一个对象：

```js
{ id:'xxx', name:'名称', bg:'#颜色', src:'assets/xxx.png', phrases:['台词1','台词2'] }
```

把角色图片放进 `assets/`，保存后重新 `npm start`，新角色会自动出现在角色列表与托盘菜单中。

## 说明

- 配置保存在 `%APPDATA%/cartoon-desktop-pet/config.json`
- 检查更新 / 作者信息指向 GitHub 仓库 `calvinwei1124/desktop-pet`
