#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

CLOUD_URL=${CLOUD_URL:?Set CLOUD_URL, e.g. https://your-render-service.onrender.com}
CONTROL_TOKEN=${CONTROL_TOKEN:?Set CONTROL_TOKEN}
NODE_ID=${NODE_ID:-motorola-g15}
NODE_NAME=${NODE_NAME:-Motorola G15}
INTERVAL=${INTERVAL:-60}

headers=(-H "Authorization: Bearer $CONTROL_TOKEN" -H 'Content-Type: application/json')

register() {
  curl -fsS "${headers[@]}" -X POST "$CLOUD_URL/api/nodes/register" \
    -d "{\"id\":\"$NODE_ID\",\"name\":\"$NODE_NAME\",\"type\":\"android-termux\",\"capabilities\":[\"shell\",\"files\",\"ffmpeg\",\"heartbeat\"]}"
}

heartbeat() {
  local battery='unknown' storage='unknown'
  if command -v termux-battery-status >/dev/null 2>&1; then
    battery=$(termux-battery-status 2>/dev/null | tr -d '\n' | sed 's/"/\\"/g' || echo unknown)
  fi
  storage=$(df -h "$HOME" | tail -1 | awk '{print $4}')
  curl -fsS "${headers[@]}" -X POST "$CLOUD_URL/api/nodes/$NODE_ID/heartbeat" \
    -d "{\"name\":\"$NODE_NAME\",\"type\":\"android-termux\",\"storageFree\":\"$storage\",\"batteryRaw\":\"$battery\"}" >/dev/null
}

register
while true; do heartbeat || true; sleep "$INTERVAL"; done
