#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

pkg update -y
pkg install -y git nodejs curl ffmpeg termux-api

ROOT="$HOME/creator-mobile-node"
mkdir -p "$ROOT"
cp mobile-node.sh "$ROOT/mobile-node.sh" 2>/dev/null || true
cp mobile-mcp.mjs "$ROOT/mobile-mcp.mjs" 2>/dev/null || true
cp package.json "$ROOT/package.json" 2>/dev/null || true
chmod +x "$ROOT/mobile-node.sh" 2>/dev/null || true

cd "$ROOT"
npm install --omit=dev

cat > "$ROOT/start-cloud-node.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
: "${CLOUD_URL:=https://openstreamingplatform-worker.onrender.com}"
: "${CONTROL_TOKEN:?Set CONTROL_TOKEN first}"
: "${NODE_ID:=motorola-g15}"
: "${NODE_NAME:=Motorola G15}"
export CLOUD_URL CONTROL_TOKEN NODE_ID NODE_NAME
termux-wake-lock 2>/dev/null || true
exec "$HOME/creator-mobile-node/mobile-node.sh"
EOF
chmod +x "$ROOT/start-cloud-node.sh"

cat > "$ROOT/start-local-mcp.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export MOBILE_MCP_ROOT="$HOME/creator-mobile-node"
exec node "$HOME/creator-mobile-node/mobile-mcp.mjs"
EOF
chmod +x "$ROOT/start-local-mcp.sh"

cat <<'EOF'
Motorola node + local MCP installed.

Cloud worker:
  export CONTROL_TOKEN='YOUR_PRIVATE_TOKEN'
  ~/creator-mobile-node/start-cloud-node.sh

Local safe MCP (stdio):
  ~/creator-mobile-node/start-local-mcp.sh

The local MCP only exposes device status, files under ~/creator-mobile-node, media probing, and preview transcoding. It does not expose arbitrary shell execution.
EOF
