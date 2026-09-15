# Windows: dev setup + packaging

## Running this repo's dev stack on Windows

Native `node-pty` (used by `packages/server`'s terminal panel) needs a
POSIX-ish shell backend. Two supported paths:

- **WSL2** (recommended): `wsl --install`, then clone and run the repo
  inside the WSL2 filesystem (not `/mnt/c/...` — that path is slow for
  `node_modules`). `node-pty` spawns `bash`/`wsl.exe` cleanly here.
- **Native Windows**: `node-pty` also works directly with
  `conpty` (Windows' native pseudoconsole, used automatically on Windows 10
  1809+) — spawn `powershell.exe` or `cmd.exe` instead of `bash` in
  `packages/server/src/ws/terminal.ts`.

## Packaging the dashboard as a Windows app

The dashboard is a PWA, so the simplest Windows-native install is via
**PWABuilder** (Microsoft's own tool, works from any PWA URL):

```bash
npx pwabuilder https://your-domain --platform windows
```

This produces an `.msix` package installable directly or publishable to the
Microsoft Store. For a heavier native shell (system tray, native menus, file
system access beyond what PWAs expose), wrap it in
[Tauri](https://tauri.app/) instead — much lighter than Electron:

```bash
npm install -D @tauri-apps/cli
npx tauri init
npx tauri build   # produces an .msi / .exe
```

## Microsoft Store submission

1. Register a developer account at [partner.microsoft.com](https://partner.microsoft.com/dashboard)
2. Reserve the app name, create a submission, upload the `.msix`
3. Certification is automated and usually finishes within hours
