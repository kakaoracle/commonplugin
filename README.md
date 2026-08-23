# kakaoracle/fenbi-helper

一个轻量、零构建依赖的 Chrome Manifest V3 浏览器增强扩展。它把常用网页整理成清晰、可控的阅读与工具体验：粉笔题友评论、CSDN 博文阅读、知乎内容阅读，以及独立 JSON 美化页面。

> 当前版本：`0.10.1`

## 功能概览

### style 样式

- **粉笔**：恢复题友评论、隐藏解析视频、粉笔页面黑白化。
- **CSDN**：只展示博文、独立黑白化、博文主体偏左/居中/偏右。
- **知乎**：只展示评论、独立黑白化。
- **通用**：对尚未专门适配的网站尝试启用通用黑白模式。

所有网站开关互相隔离，不会用粉笔开关控制 CSDN 或知乎。

### 前端

- **JSON 美化**：从扩展弹窗开启后自动打开独立页面，支持格式化、压缩、复制、树形查看和节点折叠。
- 使用浏览器原生 JSON API，运行时无第三方依赖。

## 安装

1. 打开 Chrome：`chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录。
5. 安装后刷新目标网页。

扩展只复用浏览器已有登录会话发起请求，不读取、保存、打印或手动转发账号 Cookie。

## 开发结构

- `manifest.json`：Manifest V3 配置、权限和页面匹配范围。
- `content.js` / `content.css`：网站分流、状态应用、评论加载和页面样式。
- `popup.html` / `popup.css` / `popup.js`：树状分组设置面板。
- `json.html` / `json.css` / `json.js`：独立 JSON 美化页面。
- `background.js`：跨域 JSON 请求代理。
- `LICENSE`：MIT 开源许可证。

## JSON 方案选择

实现前比较了 GitHub 上三类方案：

1. [prettier/prettier](https://github.com/prettier/prettier)：格式化质量和生态最好，但体积较大、配置复杂。
2. [josdejong/jsoneditor](https://github.com/josdejong/jsoneditor)：树形编辑和校验能力完整，但 UI 与依赖规模较大。
3. [mohsen1/json-formatter-js](https://github.com/mohsen1/json-formatter-js)：专注 JSON 树形展示、支持折叠、实现思路轻量。

本项目选择第三种思路，并使用原生 `JSON.parse` / `JSON.stringify` 加自有轻量树渲染，保持零运行时依赖。

## 版本规则

版本严格使用 `0.x.y`：`x` 范围为 `1–100`，用于阶段性功能迭代；`y` 范围为 `1–10`，用于修复和小优化。不随意跨到 `1.x.y` 等大版本。

## 提交与同步

本地代码是唯一来源。每次修复完成并通过检查后，提交到 GitHub `master`。Commit 信息保持简短、二次元风格，例如：`✨ 新技能解锁`、`🛠️ 修复小怪兽`、`🌙 夜间维护`。

本地 `agents/` 和 `AGENTS.md` 仅供接手者使用，已通过 `.gitignore` 排除，不上传到 GitHub。

## 许可证

本项目采用 [MIT License](./LICENSE) 开源。使用粉笔、CSDN、知乎等网站时，请遵守对应网站的服务条款、版权规则和接口使用政策。
