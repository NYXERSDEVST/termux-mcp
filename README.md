# Nyxers Workflow Cloud Dev

An AI-driven dev dashboard (terminal, copilot, device preview, CLI, export,
templates, PWA) plus an MCP server for agentic tooling
(`run_command`, `list_templates`, `export_workspace`, `browse_url`,
`get_dev_machine_spec`).

## What's actually real here vs. what needs your own credentials

Everything in this repo runs — there's no mock UI behind the panels:

| Feature | Status |
|---|---|
| Terminal panel | **Real.** `node-pty` spawns an actual shell; the dashboard talks to it over a WebSocket (`/ws/terminal`). |
| CLI panel | **Real.** One-shot command execution via `/api/cli`. |
| Device Preview panel | **Real.** An iframe with viewport presets — point it at any URL, including your own dev server. |
| Templates / Store panel | **Real.** Reads `templates/*/template.json`; three starter templates ship in this repo. |
| Export panel | **Real.** Zips any directory in the workspace and streams it as a download. |
| PWA (manifest + service worker) | **Real.** `packages/dashboard/public/manifest.webmanifest` + `sw.js` cache the app shell. |
| MCP server (`packages/mcp-server`) | **Real.** stdio MCP server with 5 working tools — see below. |
| Copilot panel | **Real, but needs your key.** Calls the Anthropic API (`claude-opus-5`) via `/api/copilot` — set `ANTHROPIC_API_KEY` on the server, or it tells you plainly that it isn't configured instead of faking a response. |
| Cloud/VM provisioning | **Not automated by this repo.** See `docs/dev-machine-spec.md` — it's a reference spec, not a provisioning script. You bring the machine (physical or a cloud VM you rent); this repo just runs on it. |

## Repo layout

```
packages/
  dashboard/    # Vite + React PWA — the actual UI (terminal, copilot, preview, ...)
  server/       # Express + WebSocket backend the dashboard talks to
  mcp-server/   # Standalone MCP server (stdio) — usable independently of the dashboard
templates/      # Starter projects the Templates/Store + Export panels list
docs/
  dev-machine-spec.md       # reference hardware spec (not provisioning)
  platform-guides/          # Android, iOS, Windows, database, Firebase, Google AI,
                             # OpenAI platform, Web3 — real setup/deploy instructions
```

## Running it

```bash
npm install
npm run dev:server      # terminal 1 — http://localhost:8787
npm run dev:dashboard    # terminal 2 — http://localhost:5173 (proxies /api and /ws to :8787)
```

Optional, for the Copilot panel:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### MCP server (standalone)

```bash
npm run build --workspace packages/mcp-server
node packages/mcp-server/dist/index.js
```

Point any MCP-compatible client at that stdio process. `run_command` runs
with the same OS privileges as this process and is not sandboxed — wire it
only to a trusted local client, never over a network transport.

## Building for real deployment

- Dashboard: `npm run build --workspace packages/dashboard` → static output in
  `packages/dashboard/dist`, deployable to any static host (see
  `docs/platform-guides/firebase.md` for one concrete path).
- Server: `npm run build --workspace packages/server` → `dist/index.js`, run
  it anywhere Node 20+ runs.
- Mobile/desktop app store packaging (APK/AAB, iOS, Windows): see
  `docs/platform-guides/android.md`, `ios.md`, `windows.md`.
- Database beyond the in-memory default: `docs/platform-guides/database.md`.

## Why this repo, not a new one

This work started as a request for a brand-new GitHub repository
(`nyxersdevst/nyxers-workflow-cloud-dev`), but this session's GitHub
integration doesn't have permission to create repositories. It landed here
instead, on the `claude/aether-build-diagnostics-b6t83e` branch, by explicit
choice when that came up.
