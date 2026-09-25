#!/bin/zsh
set -euo pipefail

HOST_NAME="com.anicloud.xray_chrome"
INSTALL_DIR="$HOME/Library/Application Support/XrayChrome"
STATE_PATH="$INSTALL_DIR/runtime/state.json"
XRAY_PATH="$INSTALL_DIR/xray/xray"
MANIFEST_PATH="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json"

if [[ -f "$STATE_PATH" ]]; then
  PID="$(/usr/bin/plutil -extract pid raw -o - "$STATE_PATH" 2>/dev/null || true)"
  if [[ "$PID" == <-> ]]; then
    COMMAND="$(/bin/ps -p "$PID" -o command= 2>/dev/null || true)"
    if [[ "$COMMAND" == *"$XRAY_PATH"* ]]; then
      /bin/kill "$PID" 2>/dev/null || true
    fi
  fi
fi

/bin/rm -f "$MANIFEST_PATH"
/bin/rm -rf "$INSTALL_DIR"
echo "برنامه همراه macOS و Xray حذف شدند. افزونه را نیز از chrome://extensions حذف کنید."
