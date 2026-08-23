# ✦ kakaoracle / fenbi-helper

> 给网页加一点魔法，让信息回到它该在的位置。

![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-111111?style=flat-square&logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-0.10.1-111111?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-111111?style=flat-square)
![No build](https://img.shields.io/badge/build-none-111111?style=flat-square)

一个轻量、零构建依赖的 Chrome 网页增强扩展。它把常用网站整理成更清爽、更专注的阅读体验：粉笔、CSDN、知乎，以及一个独立的 JSON 美化工具。

## ✨ 能做什么

### style 样式

| 网站 | 能力 |
| --- | --- |
| 粉笔 | 显示题友评论、隐藏解析视频、黑白阅读 |
| CSDN | 只展示博文、黑白阅读、内容位置调整 |
| 知乎 | 只展示评论、黑白阅读 |
| 通用 | 尝试对其他网页启用黑白阅读 |

### 前端

- **JSON 美化**：从扩展弹窗开启后自动打开独立页面。
- 支持格式化、压缩、复制、树形查看与节点折叠。

## 🚀 安装

1. 打开 Chrome 的 `chrome://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录，安装后刷新目标页面。

扩展复用浏览器现有登录会话，不读取、保存、打印或手动转发账号 Cookie。

## 🧭 使用方式

点击工具栏中的扩展图标，在树形面板中展开 `style 样式` 或 `前端`，按需打开功能。网站之间的开关彼此隔离；关闭上级开关即可停用该组能力。

## 🛠️ 开发

项目无需构建步骤，直接编辑源文件即可。修改后重新加载扩展并刷新目标网页。

版本使用 `0.x.y`：`x` 为 `1–100`，`y` 为 `1–10`。

## 📜 许可证

[MIT License](./LICENSE)

使用粉笔、CSDN、知乎等网站时，请遵守对应网站的服务条款、版权规则和接口政策。

<p align="center">Made with ☕ · keep it simple · keep it useful</p>
