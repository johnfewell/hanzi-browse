## Hanzi Browse — Architecture Guide

This file is for AI agents (Claude Code, Cursor, Codex, etc.) working on this codebase. It describes what this project is, how it works, and where things live.

### What is Hanzi Browse?

A browser automation platform that gives AI agents access to a real Chrome browser with the user's signed-in sessions. The AI agent sends a task, the browser executes it autonomously.

Hanzi Browse is **BYOM (bring your own model)** and runs entirely on the user's machine — there is no hosted backend. Two ways to use it:
- **MCP / CLI** — your AI agent (Claude Code, Cursor, Codex, etc.) gains browser tools via the local MCP server. Installed with `npx hanzi-browse setup`.
- **Standalone sidepanel** — a direct chat UI in Chrome's side panel; same extension, its own agent loop.

Both use the same infrastructure: Chrome extension + local relay + domain skills + your own LLM.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  AI Agent (Claude Code / Cursor / Codex / etc.) │
└──────────────────────┬──────────────────────────┘
                       │ MCP protocol (stdio)
              ┌────────▼────────┐
              │   MCP Server    │  server/src/index.ts
              │  (Node.js CLI)  │  5 tools: browser_start/message/status/stop/screenshot
              └────────┬────────┘
                       │ WebSocket (ws://localhost:7862)
              ┌────────▼────────┐
              │  Chrome Extension│  src/background/service-worker.js
              │  (service worker)│  13 tool handlers, CDP, DOM service
              └────────┬────────┘
                       │ Chrome DevTools Protocol
              ┌────────▼────────┐
              │   Real Browser   │  User's signed-in Chrome
              └─────────────────┘
```

The agent loop runs **in the extension** (BYOM, using the user's own LLM credentials). The MCP server is a thin local bridge that forwards tasks to the extension over the relay and returns results.

### Key directories

| Path | What | Key files |
|------|------|-----------|
| `src/background/` | Chrome extension core | `service-worker.js`, `modules/mcp-bridge.js`, `modules/api.js`, `modules/cdp-helper.js` |
| `src/background/tool-handlers/` | 13 browser tools | `computer-core.js`, `navigation-core.js`, `form-core.js`, `read-page-core.js`, `utility-core.js` |
| `src/background/managers/` | Tab, debugger, DOM, license | `tab-manager.js`, `debugger-manager.js`, `dom-service/` |
| `server/src/` | MCP server + CLI | `index.ts` (MCP), `cli.ts` (CLI), `relay/` (local relay) |
| `server/src/llm/` | LLM client | `client.ts` (Anthropic), `credentials.ts` (key detection) |
| `server/skills/` | Agent skills (markdown) | Each skill is a `SKILL.md` with instructions |
| `server/src/agent/domain-skills.json` | Domain interaction patterns | Single source of truth for per-domain tips (x.com, linkedin, zillow, amazon…) |
| `native-host/` | OAuth bridge for extension | `native-bridge.cjs` |

### Value proposition

**MCP / CLI — "For your agent"**
A browser sub-agent for your coding agent. One command installs it. Your agent delegates browser work and keeps its context free for code.
- One command setup (`npx hanzi-browse setup` detects your AI agents, wires each one's MCP config).
- Site knowledge built in (site playbooks in `server/src/agent/domain-skills.json`).
- Offloads the browser, not your context (main agent fires one tool call; sub-agent runs the loop; returns a clean answer).
- BYOM and fully local — no hosted backend, no data leaves the user's machine.

### Modes of operation

One BYOM infrastructure (extension + local relay + LLM client), two ways to drive it.

**1. MCP / CLI (primary) — agent drives the developer's own Chrome.**
- Installed via `npx hanzi-browse setup`. The user's AI agent gains 5 tools: `browser_start`, `browser_message`, `browser_status`, `browser_stop`, `browser_screenshot`.
- BYOM: reads Claude Code OAuth, Codex `auth.json`, macOS Keychain, or `ANTHROPIC_API_KEY`. No data leaves the user's machine.

**2. Standalone sidepanel — direct chat UI in Chrome's side panel.**
- Same extension, its own agent loop + native-host credential bridge. No MCP server required.

### Skills

Skills are markdown files (`SKILL.md`) that teach AI agents when and how to use browser automation for specific workflows. They're installed into the agent's skills directory during `npx hanzi-browse setup`.

| Skill | What it does |
|-------|-------------|
| `hanzi-browse` | Core — when to use browser tools |
| `e2e-tester` | Test web apps like QA |
| `social-poster` | Post to LinkedIn/X/Reddit |
| `linkedin-prospector` | Find and connect with prospects |
| `a11y-auditor` | Run accessibility audits |
| `data-extractor` | Extract structured data from websites into CSV/JSON |
| `x-marketer` | X/Twitter marketing |

### Domain skills

Domain-specific interaction tips live in `server/src/agent/domain-skills.json` — a single JSON array consumed by the extension (the agent loop) and bundled into the extension at its repo path. Each entry has `domain`, `skill` (markdown body), and optional `antiBot: true`.

They're loaded into the agent's system prompt when the task URL matches a known domain (x.com, linkedin.com, gmail, github, zillow, amazon, and ~20 more). They prevent the agent from making known mistakes — e.g., using `form_input` on Draft.js editors (X, LinkedIn), which silently fails.

To add a new domain: append an entry to `server/src/agent/domain-skills.json`. The old `server/site-patterns/` directory is removed — do not re-add it.

### Build

```bash
cd server && npm run build     # TypeScript → dist/
cd .. && npm run build         # Extension → dist/ (Vite)
```

### CLI

```bash
node server/dist/cli.js start "task" --url <url> --context "extra"
node server/dist/cli.js status [session_id]
node server/dist/cli.js message <session_id> "follow-up"
node server/dist/cli.js stop <session_id> [--remove]
```

### Development

```bash
make setup    # First time: check prereqs + install deps + build server & extension
make build    # Rebuild server (tsc) + extension (vite)
make dev      # Rebuild the server on change (tsc --watch)
make test     # Run server tests
make clean    # Remove build artifacts
```

- Relay: ws://localhost:7862 (auto-started by the MCP server)
- Extension: Load `dist/` in chrome://extensions

There is no server-side database or hosted backend — everything runs locally and BYOM. Session state is stored on disk under `~/.hanzi-browse/sessions/`.

### Tips

- The `--context` flag passes info the agent needs (form data, preferences, tone)
- The `--url` flag sets the starting page for the task
- The Chrome extension must be loaded and running for any mode to work
- Session state stored in `~/.hanzi-browse/sessions/`
- `chrome.tabs.group()` can move tabs across windows — MCP sessions with dedicated windows must skip tab grouping
- Extension code changes require reloading in chrome://extensions, not just restarting the server
- `read_page` returns accessibility tree; `get_page_text` returns visible text. For SPAs like X, `get_page_text` is more reliable.
- Never use `form_input` on Draft.js editors (X, Facebook). Use `javascript_tool` with `execCommand('insertText')` instead.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
