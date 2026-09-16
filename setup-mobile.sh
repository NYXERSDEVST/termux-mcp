#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
pkg update -y
pkg install -y git nodejs curl ffmpeg termux-api
mkdir -p "$HOME/creator-mobile-node"
cp mobile-node.sh "$HOME/creator-mobile-node/mobile-node.sh" 2>/dev/null || true
chmod +x "$HOME/creator-mobile-node/mobile-node.sh" 2>/dev/null || true
cat <<'EOF'
Mobile node dependencies installed.

Run after setting:
  export CLOUD_URL='https://YOUR-RENDER-SERVICE.onrender.com'
  export CONTROL_TOKEN='YOUR_PRIVATE_TOKEN'
  export NODE_ID='motorola-g15'
  $HOME/creator-mobile-node/mobile-node.sh

For wake lock:
  termux-wake-lock
EOF
