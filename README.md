<div align="center">

[English](README.md) | [中文](docs/zh/README.md)

<img src="docs/logo.svg" width="80" alt="Hanzi Browse" />

# Hanzi Browse

**The context layer for browsing agents.**

Your browsing agent keeps failing on real sites — X uses Draft.js, LinkedIn hides the<br/>
connect button, Gmail needs keyboard shortcuts. Hanzi Browse ships 24 site playbooks —<br/>
**hints for the LLM, not brittle scripts** — so it actually finishes the task.

[![npm](https://img.shields.io/npm/v/hanzi-browse?color=%23cb3837&label=npm)](https://www.npmjs.com/package/hanzi-browse)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/iklpkemlmbhemkiojndpbhoakgikpmcd?label=chrome%20web%20store&color=%234285F4)](https://chrome.google.com/webstore/detail/iklpkemlmbhemkiojndpbhoakgikpmcd)
[![Discord](https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/hahgu5hcA5)
[![License](https://img.shields.io/badge/license-PolyForm%20NC-green)](LICENSE)

**Works with**

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

## A browser sub-agent for your coding agent

One command. `npx hanzi-browse setup` detects every AI agent on your machine (Claude Code, Cursor, Codex, and 9 more) and wires Hanzi Browse in as an MCP tool. Your main agent delegates browser work; a sub-agent runs the loop — *read page → plan next action → click/type/scroll → observe → repeat until done* — and returns a clean answer. Site playbooks auto-load by URL so the model already knows the quirks.

It's **BYOM (bring your own model)** and fully local: it drives your own Chrome with your own logins, using your own LLM key. No hosted backend, no data leaves your machine.

![Use it now](docs/diagrams/use-it.svg)

<br/>

## Get Started

```bash
npx hanzi-browse setup
```

One command does everything:

```
npx hanzi-browse setup
│
├── 1. Detect browsers ──── Chrome, Brave, Edge, Arc, Chromium
│
├── 2. Install extension ── Opens Chrome Web Store, waits for install
│
├── 3. Detect AI agents ─── Claude Code, Cursor, Codex, Windsurf,
│                           VS Code, Gemini CLI, Amp, Cline, Roo Code
│
├── 4. Configure MCP ────── Merges hanzi-browse into each agent's config
│
├── 5. Install skills ───── Copies browser skills into each agent
│
└── 6. Connect your model ─ BYOM: Claude, GPT, Gemini, or any API key
```

**BYOM (bring your own model)** — use your Claude Pro/Max subscription, GPT Plus, Gemini, or any API key. Free forever, runs entirely on your machine.


<br/>

## Examples

```
"Go to Gmail and unsubscribe from all marketing emails from the last week"
"Apply for the senior engineer position on careers.acme.com"
"Log into my bank and download last month's statement"
"Find AI engineer jobs on LinkedIn in San Francisco"
```

<br/>

## Skills

Skills are installed automatically during `npx hanzi-browse setup`. Your agent reads these as markdown files — each one teaches the agent *when* and *how* to use the browser for a specific workflow.

| Skill | Description |
|-------|-------------|
| `hanzi-browse` | Core skill — when and how to use browser automation |
| `e2e-tester` | Test your app in a real browser, report bugs with screenshots |
| `social-poster` | Draft per-platform posts, publish from your signed-in accounts |
| `linkedin-prospector` | Find prospects, send personalized connection requests |
| `a11y-auditor` | Run accessibility audits in a real browser |
| `data-extractor` | Extract structured data from websites into CSV/JSON |
| `x-marketer` | Twitter/X marketing workflows |

Open source — [add your own](https://github.com/hanzili/hanzi-browse/tree/main/server/skills).

### Site Playbooks — the context layer

The CLI and extension rely on a shared set of **site playbooks** — verified interaction recipes for complex websites. They teach the LLM how async loading works on X, which selector hides LinkedIn's connect button, that Gmail responds to keyboard shortcuts, and how to sidestep anti-bot detection on ~20 other sites.

**Hints for the LLM, not brittle scripts.** The model stays in control; we just hand it the cheat sheet. When the DOM shifts, the agent adapts — no adapter to rebuild.

**Currently supports 24 sites:** X, LinkedIn, Gmail, GitHub, Notion, Figma, Slack, Reddit, Amazon, eBay, Walmart, Target, Zillow, Apartments.com, Craigslist, Indeed, Google Docs, Sheets, Calendar, Drive, ChatGPT, Claude.ai, Stack Overflow.

All playbooks live in [`server/src/agent/domain-skills.json`](server/src/agent/domain-skills.json) as a single shared JSON array. To add a site, open a PR appending a `{ domain, skill }` entry.

<br/>

## Tools

| Tool | Description |
|------|-------------|
| `browser_start` | Run a task. Blocks until complete. |
| `browser_message` | Send follow-up to an existing session. |
| `browser_status` | Check progress. |
| `browser_stop` | Stop a task. |
| `browser_screenshot` | Capture current page as image. |

<br/>

## Pricing

**Free forever.** Hanzi Browse is BYOM (bring your own model): you use your own Claude, GPT, or Gemini key, everything runs on your machine, and no task data ever leaves it.

<br/>

## Development

**Prerequisites:** [Node.js 18+](https://nodejs.org/). No database or Docker needed — Hanzi Browse is fully local and BYOM.

### First time (local setup)

```bash
git clone https://github.com/hanzili/hanzi-browse
cd hanzi-browse
make setup
```

Checks prerequisites, installs dependencies, and builds both the server (MCP/CLI/relay) and the extension.

### Load the extension

Open `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select the project root (the folder that contains `manifest.json`).

### Verify everything works

With the extension loaded, run a task through the CLI:

```bash
node server/dist/cli.js start "Go to example.com and tell me the page title"
```

You should see a Chrome window open, the agent navigate to example.com, and return the page title. If this works, the local relay + extension + agent loop are all connected. (The relay on `ws://localhost:7862` is auto-started by the MCP/CLI.)

### Configuration

No configuration is required. Hanzi Browse reads model credentials from your environment, your Claude Code / Codex login, the macOS Keychain, or the extension's settings. Optional telemetry (`SENTRY_DSN`, `POSTHOG_API_KEY`) can be set via `.env` — see `.env.example`.

### Commands

| Command | What it does |
|---------|-------------|
| `make setup` | First-time setup (check prereqs + install deps + build) |
| `make build` | Rebuild server (tsc) + extension (vite) |
| `make dev` | Rebuild the server on change (tsc --watch) |
| `make test` | Run server tests |
| `make clean` | Remove build artifacts |
| `make help` | Show all commands |

<br/>

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

Good first contributions: new skills, site playbooks (`domain-skills.json` entries), platform testing, translations. Check the [open issues](https://github.com/hanzili/hanzi-browse/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

<br/>

## Community

[Discord](https://discord.gg/hahgu5hcA5) · [Twitter](https://x.com/user)

<br/>

## Privacy

Hanzi Browse is BYOM and fully local. [Read the privacy policy](PRIVACY.md).

- No task data is sent to Hanzi Browse servers — there is no hosted backend.
- Page content and screenshots go only to the AI provider whose key you supply.

<br/>

## License

[Polyform Noncommercial 1.0.0](LICENSE)
