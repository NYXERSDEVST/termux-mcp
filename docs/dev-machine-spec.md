# Recommended dev machine spec

This is a **reference configuration**, not something this project provisions
for you. Nothing in this repo spins up cloud hardware or a VM automatically —
you supply the machine (physical or a cloud VM you rent yourself), and the
`packages/server` + `packages/mcp-server` in this repo run on it.

The numbers below are based on a Ryzen AI Max-class mini PC (the class of
machine shown in the product screenshots that prompted this doc), because its
spec happens to line up well with running a local terminal/dashboard stack
plus a local LLM if you want one:

| Component | Recommended | Why it matters here |
|---|---|---|
| CPU | AMD Ryzen AI Max+ 395 (or similar 16-core/32-thread mobile/desktop APU) | Enough headroom to run the dashboard server, a real shell (`node-pty`), Playwright/Chromium for the `browse_url` MCP tool, and your app's own build (`vite build`, `tsc`) at the same time. |
| RAM | 64–128 GB (LPDDR5X-8000 or similar) | The bulk of this is for **you**, not this repo: room for browser tabs, IDE, Docker/Podman containers, and optionally a locally-hosted model. This repo's own processes (server + dashboard + MCP server) comfortably fit in under 2 GB. |
| GPU / NPU | Integrated graphics with an NPU (e.g. Radeon 8060S + XDNA-class NPU, ~50 TOPS+) | Only relevant if you run local inference (e.g. via Ollama/llama.cpp) instead of the cloud Claude API. Not required — the copilot panel defaults to the hosted Anthropic API. |
| Storage | NVMe SSD, 1 TB+ | Fast `npm install`/`vite build` cycles; templates and export bundles are small (a few MB each) and don't need much space themselves. |
| Network | Dual 2.5–10 GbE and/or Wi-Fi 6E/7 | Only matters if you're serving the dashboard to other devices on your network (e.g. previewing on a phone) or syncing large export bundles. |
| PSU / expansion (desktop form factor) | 300 W+, PCIe x16 slot if you want a discrete GPU later | Not required for this repo. Only relevant if you later add local GPU-accelerated inference. |

## What this repo actually needs

In practice, to run everything in this repo (dashboard + server + MCP
server) you need far less than the table above:

- Node.js ≥ 20
- ~500 MB free disk for `node_modules` across the three packages
- A POSIX shell (Linux, macOS, or WSL2 on Windows) for the `node-pty`-backed
  terminal panel
- Optionally: `ANTHROPIC_API_KEY` set, for the copilot panel to actually call
  Claude instead of showing "not configured"

The high-spec table above is for the *rest of your workflow* (running a
browser, an IDE, containers, maybe a local model) alongside this stack — not
a requirement this repo enforces or checks for.
