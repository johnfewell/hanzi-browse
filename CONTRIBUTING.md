# Contributing to Hanzi Browse

Thanks for wanting to contribute! Here's what you need to know.

## Setup

Prerequisites: Node.js 18+, a Chromium browser. No database or Docker needed — Hanzi Browse is fully local and BYOM.

```bash
git clone https://github.com/hanzili/hanzi-browse
cd hanzi-browse
make setup
```

This installs dependencies and builds both the server (MCP/CLI/relay) and the extension.

Load the extension: open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the repo root (the folder that contains `manifest.json`).

## Commands

| Command | What it does |
|---------|-------------|
| `make setup` | Check prereqs + install deps + build |
| `make build` | Build server (tsc) + extension (vite) |
| `make dev` | Rebuild the server on change (tsc --watch) |
| `make test` | Run server tests |
| `make clean` | Remove build artifacts |
| `make help` | Show all commands |

## Architecture

```
Extension (src/)         → Preact, built with Vite (dist/)
MCP Server (server/src/)  → TypeScript, built with tsc (server/dist/)
```

Hanzi Browse is BYOM (bring your own model) and fully local — there is no hosted backend, database, or SDK. The agent loop runs in the extension using the user's own LLM credentials; the MCP server is a thin local bridge that forwards tasks to the extension over the relay (`ws://localhost:7862`).

Two ways to drive it:
- **MCP / CLI** — `npx hanzi-browse setup` wires Hanzi Browse into your AI agent as an MCP tool.
- **Standalone sidepanel** — a direct chat UI in Chrome's side panel.

## What to work on

### Good first contributions

- **New skills** — just a `SKILL.md` file. See `server/skills/linkedin-prospector/SKILL.md` for the pattern.
- **Domain knowledge** — add interaction tips for a website the agent supports. See the section below.
- **CLI improvements** — `server/src/cli/setup.ts` and `server/src/cli.ts`.
- **Tool handlers** — each handler in `src/background/tool-handlers/` is isolated.
- **Platform support** — we're primarily macOS. Windows and Linux contributions welcome.

### Adding domain knowledge (site-specific interaction tips)

All per-domain guidance lives in **`server/src/agent/domain-skills.json`** — a single JSON array consumed by the extension. When the agent navigates to a matching domain, these tips are injected into its system prompt automatically.

> **Do NOT add files to `server/site-patterns/`.** That directory was removed. Any PR targeting it will need to be reworked. Use `domain-skills.json` instead.

To add a new domain, append an entry to the JSON array:

```json
{
  "domain": "example.com",
  "skill": "Example.com interaction tips:\n- Tip one\n- Tip two"
}
```

If the site has bot detection (CAPTCHAs, "Press & Hold", Cloudflare challenges), add `"antiBot": true`.

Keep each `skill` string concise (5–10 bullets). Focus on things an AI agent would get wrong without guidance: tricky selectors, async loading, Draft.js editors, anti-bot stops, form submission quirks. General site descriptions aren't useful — specific, verified pitfalls are.

### Needs discussion first

Open an issue before working on:
- Service worker (`src/background/service-worker.js`)
- MCP bridge (`src/background/modules/mcp-bridge.js`)
- Auth or credential handling
- New LLM provider integrations

These modules are tightly coupled and security-sensitive.

## Testing

```bash
cd server && npm test
```

## PR checklist

- [ ] Limited to one area (skill, test, CLI, tool handler, or docs)
- [ ] Tested locally (`make build` and `make test` pass)
- [ ] No changes to security-sensitive modules without prior discussion
- [ ] Follows existing code style

## Questions?

[Discord](https://discord.gg/hahgu5hcA5) · [GitHub Issues](https://github.com/hanzili/hanzi-browse/issues) · hanzili0217@gmail.com
