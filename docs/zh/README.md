<div align="center">

[English](../../README.md) | [中文](README.md)

<img src="../logo.svg" width="80" alt="Hanzi Browse" />

# Hanzi Browse

**浏览 agent 的上下文层。**

你的浏览 agent 总是在真实网站上翻车 —— X 用的是 Draft.js、LinkedIn 的 connect 按钮藏起来、<br/>
Gmail 要用键盘快捷键。Hanzi Browse 自带 24 份站点 playbook ——<br/>
**给 LLM 的提示，不是脆弱的脚本** —— 让 agent 真正能把任务跑完。

[![npm](https://img.shields.io/npm/v/hanzi-browse?color=%23cb3837&label=npm)](https://www.npmjs.com/package/hanzi-browse)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/iklpkemlmbhemkiojndpbhoakgikpmcd?label=chrome%20web%20store&color=%234285F4)](https://chrome.google.com/webstore/detail/iklpkemlmbhemkiojndpbhoakgikpmcd)
[![Discord](https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/hahgu5hcA5)
[![License](https://img.shields.io/badge/license-PolyForm%20NC-green)](../../LICENSE)

**适配**

<a href="https://claude.ai/code"><img src="https://browse.hanzilla.co/logos/claude-logo-0p9b6824.png" width="28" height="28" alt="Claude Code" title="Claude Code"></a>&nbsp;&nbsp;
<a href="https://cursor.com"><img src="https://browse.hanzilla.co/logos/cursor-logo-5jxhjn17.png" width="28" height="28" alt="Cursor" title="Cursor"></a>&nbsp;&nbsp;
<a href="https://openai.com/codex"><img src="https://browse.hanzilla.co/logos/openai-logo-6323x4zd.png" width="24" height="24" alt="Codex" title="Codex"></a>&nbsp;&nbsp;
<a href="https://ai.google.dev/gemini-api/docs/cls"><img src="https://browse.hanzilla.co/logos/gemini-logo-1f6kvbwc.png" width="24" height="24" alt="Gemini CLI" title="Gemini CLI"></a>&nbsp;&nbsp;
<img src="https://browse.hanzilla.co/logos/github-logo-tr9d8349.png" width="24" height="24" alt="VS Code" title="VS Code">&nbsp;&nbsp;
<img src="https://browse.hanzilla.co/logos/kiro-logo-wk3s9bcy.png" width="24" height="24" alt="Kiro" title="Kiro">&nbsp;&nbsp;
<img src="https://browse.hanzilla.co/logos/antigravity-logo-szj1gjgv.png" width="24" height="24" alt="Antigravity" title="Antigravity">&nbsp;&nbsp;
<img src="https://browse.hanzilla.co/logos/opencode-logo-svpy0wcb.png" width="24" height="24" alt="OpenCode" title="OpenCode">

<br/>

[![Watch demo](https://img.youtube.com/vi/3tHzg2ps-9w/maxresdefault.jpg)](https://www.youtube.com/watch?v=3tHzg2ps-9w)

</div>

<br/>

## 给你的编程 agent 配一个浏览器子 agent

一个命令。`npx hanzi-browse setup` 会检测你机器上所有 AI agent（Claude Code、Cursor、Codex 等共 12 个），自动把 Hanzi Browse 配成它们的 MCP 工具。主 agent 把浏览器工作委托出去；子 agent 自己跑循环 —— *读页面 → 规划下一步 → 点击/输入/滚动 → 观察结果 → 重复直到完成* —— 然后返回一个干净的答案。站点 playbook 按 URL 自动加载，模型不用再摸索网站的坑。

它是 **BYOM（自带模型）** 且完全本地运行：用你自己的 Chrome（带你自己的登录态）、你自己的 LLM key。没有任何托管后端，数据不会离开你的机器。

![Use it now](../diagrams/use-it.svg)

<br/>

## 快速开始

```bash
npx hanzi-browse setup
```

这一个命令会把主要步骤都串起来：

```text
npx hanzi-browse setup
│
├── 1. 检测浏览器 ───── Chrome、Brave、Edge、Arc、Chromium
│
├── 2. 安装扩展 ────── 打开 Chrome Web Store，并等待安装完成
│
├── 3. 检测 AI agent ─ Claude Code、Cursor、Codex、Windsurf、
│                      VS Code、Gemini CLI、Amp、Cline、Roo Code
│
├── 4. 配置 MCP ───── 将 hanzi-browse 合并进各 agent 的配置
│
├── 5. 安装技能 ───── 把浏览器相关技能复制到各 agent
│
└── 6. 连接你的模型 ── BYOM：Claude、GPT、Gemini 或任意 API Key
```

**BYOM（自带模型）**：使用你自己的 Claude Pro/Max、GPT Plus、Gemini 或任意 API Key。永久免费，完全在你的机器上运行。

<br/>

## 示例

```text
"打开 Gmail，帮我退订最近一周的营销邮件"
"去 careers.acme.com 帮我投递 senior engineer 岗位"
"登录我的银行账户，把上个月账单下载下来"
"去 LinkedIn 帮我找旧金山的 AI 工程师岗位"
```

<br/>

## Skills

安装向导会自动把浏览器技能装进你的 agent。技能的作用，是教 agent 在什么场景下该用浏览器，以及该怎么用浏览器完成特定流程。

| Skill | 说明 |
|-------|------|
| `hanzi-browse` | 核心技能，定义何时以及如何使用浏览器自动化 |
| `e2e-tester` | 在真实浏览器里测试你的应用，并带截图反馈问题 |
| `social-poster` | 按不同平台改写文案，并用你已登录的账号发布 |
| `linkedin-prospector` | 寻找潜在客户或候选人，并发送个性化连接请求 |
| `a11y-auditor` | 在真实浏览器里执行无障碍检查 |
| `data-extractor` | 从网站中提取结构化数据，输出为 CSV/JSON |
| `x-marketer` | 面向 Twitter / X 的营销工作流 |

开源可扩展，你也可以[自己写技能](https://github.com/hanzili/hanzi-browse/tree/main/server/skills)。

<br/>

## 站点 playbook —— 上下文层

CLI 和扩展共享同一套 **站点 playbook** —— 针对复杂网站验证过的交互手册。它们告诉 LLM：X 页面怎么处理异步加载、LinkedIn 的 connect 按钮该用哪个选择器、Gmail 怎么用键盘快捷键操作，以及另外 ~20 个站点各自的坑怎么绕。

**给 LLM 的提示，不是脆弱的脚本。** 模型始终在掌舵，我们只是把小抄塞给它。DOM 改了，agent 会自己适应 —— 没有 adapter 要重写。

**当前覆盖 24 个站点：** X、LinkedIn、Gmail、GitHub、Notion、Figma、Slack、Reddit、Amazon、eBay、Walmart、Target、Zillow、Apartments.com、Craigslist、Indeed、Google Docs、Sheets、Calendar、Drive、ChatGPT、Claude.ai、Stack Overflow。

所有 playbook 都在 [`server/src/agent/domain-skills.json`](../../server/src/agent/domain-skills.json) 里，就是一个 JSON 数组。要加新站点，提个 PR 追加一条 `{ domain, skill }` 就行。

<br/>

## 工具

| Tool | 说明 |
|------|------|
| `browser_start` | 发起一个任务，并阻塞等待直到任务完成 |
| `browser_message` | 向现有会话发送后续指令 |
| `browser_status` | 查询任务进度 |
| `browser_stop` | 停止任务 |
| `browser_screenshot` | 截取当前页面 |

<br/>

## 定价

**永久免费。** Hanzi Browse 是 BYOM（自带模型）：用你自己的 Claude、GPT 或 Gemini key，全部在你的机器上运行，任务数据永远不会离开本机。

<br/>

## 开发

**前置条件：** [Node.js 18+](https://nodejs.org/)。不需要数据库或 Docker —— Hanzi Browse 完全本地、BYOM 运行。

### 第一次运行

```bash
git clone https://github.com/hanzili/hanzi-browse
cd hanzi-browse
make setup
```

这个命令会检查环境、安装依赖，并构建 server（MCP/CLI/relay）和扩展。

### 手动加载扩展

打开 `chrome://extensions`，开启 Developer Mode，点击 “Load unpacked”，选择仓库根目录（包含 `manifest.json` 的文件夹）。

### 验证一切正常

加载好扩展后，用 CLI 跑一个任务：

```bash
node server/dist/cli.js start "Go to example.com and tell me the page title"
```

应该会看到 Chrome 窗口打开，agent 导航到 example.com，然后返回页面标题。如果成功，说明本地 relay + 扩展 + agent loop 全部连通。（`ws://localhost:7862` 上的 relay 由 MCP/CLI 自动启动。）

### 常用命令

| Command | 说明 |
|---------|------|
| `make setup` | 首次初始化（检查依赖 + 安装 + 构建） |
| `make build` | 构建 server（tsc）+ 扩展（vite） |
| `make dev` | 监听变更并重新构建 server（tsc --watch） |
| `make test` | 运行 server 测试 |
| `make clean` | 清理构建产物 |
| `make help` | 查看全部命令 |

### 配置

无需任何配置。Hanzi Browse 会从你的环境变量、Claude Code / Codex 登录态、macOS Keychain 或扩展设置里读取模型凭据。可选的遥测（`SENTRY_DSN`、`POSTHOG_API_KEY`）可通过 `.env` 设置，详见 `.env.example`。

<br/>

## 参与贡献

欢迎提交贡献，具体说明见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

很适合作为第一次贡献的方向包括：新技能、站点 playbook（`domain-skills.json` 条目）、平台兼容性测试，以及文档翻译。

<br/>

## 社区

[Discord](https://discord.gg/hahgu5hcA5) · [Twitter / X](https://x.com/user)

<br/>

## 隐私

Hanzi Browse 是 BYOM 且完全本地运行。完整说明请看[隐私政策](../../PRIVACY.md)。

- 任务数据不会发送到任何 Hanzi 服务器 —— 没有托管后端。
- 页面内容和截图只会发给你提供 key 的那个模型提供方。

## License

[Polyform Noncommercial 1.0.0](../../LICENSE)
