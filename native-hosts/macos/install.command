#!/bin/zsh
set -euo pipefail

EXTENSION_ID="kcefgbldpcaoicjpdcmilahhlcbcflpj"
HOST_NAME="com.anicloud.xray_chrome"
INSTALL_DIR="$HOME/Library/Application Support/XrayChrome"
HOST_DIR="$INSTALL_DIR/host"
XRAY_DIR="$INSTALL_DIR/xray"
RUNTIME_DIR="$INSTALL_DIR/runtime"
LOGS_DIR="$INSTALL_DIR/logs"
STATE_PATH="$RUNTIME_DIR/state.json"
HOST_PATH="$HOST_DIR/XrayChromeHost.command"
XRAY_PATH="$XRAY_DIR/xray"
MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
SCRIPT_DIR="${0:A:h}"

LOCAL_XRAY=""
STABLE_ONLY=false

while (( $# > 0 )); do
  case "$1" in
    --xray)
      (( $# >= 2 )) || { echo "بعد از --xray باید مسیر فایل xray را بنویسید." >&2; exit 2; }
      LOCAL_XRAY="$2"
      shift 2
      ;;
    --stable-only)
      STABLE_ONLY=true
      shift
      ;;
    *)
      echo "گزینه ناشناخته: $1" >&2
      exit 2
      ;;
  esac
done

[[ -f "$SCRIPT_DIR/XrayChromeHost.command" ]] || {
  echo "فایل XrayChromeHost.command کنار نصب‌کننده پیدا نشد." >&2
  exit 1
}
[[ -f "$SCRIPT_DIR/ResolveRelease.js" ]] || {
  echo "فایل ResolveRelease.js کنار نصب‌کننده پیدا نشد." >&2
  exit 1
}

TEMP_DIR="$(/usr/bin/mktemp -d -t xray-chrome-install)"
trap '/bin/rm -rf "$TEMP_DIR"' EXIT

/bin/mkdir -p "$HOST_DIR" "$XRAY_DIR" "$RUNTIME_DIR" "$LOGS_DIR" "$MANIFEST_DIR"
/bin/chmod 700 "$INSTALL_DIR" "$HOST_DIR" "$XRAY_DIR" "$RUNTIME_DIR" "$LOGS_DIR"

# Stop only the Xray process previously launched by this host.
if [[ -f "$STATE_PATH" ]]; then
  OLD_PID="$(/usr/bin/plutil -extract pid raw -o - "$STATE_PATH" 2>/dev/null || true)"
  if [[ "$OLD_PID" == <-> ]]; then
    OLD_COMMAND="$(/bin/ps -p "$OLD_PID" -o command= 2>/dev/null || true)"
    if [[ "$OLD_COMMAND" == *"$XRAY_PATH"* ]]; then
      /bin/kill "$OLD_PID" 2>/dev/null || true
    fi
  fi
  /bin/rm -f "$STATE_PATH"
fi

/bin/cp "$SCRIPT_DIR/XrayChromeHost.command" "$HOST_PATH"
/bin/chmod 700 "$HOST_PATH"
/usr/bin/xattr -dr com.apple.quarantine "$HOST_PATH" 2>/dev/null || true

if [[ -n "$LOCAL_XRAY" ]]; then
  [[ -f "$LOCAL_XRAY" ]] || { echo "فایل Xray پیدا نشد: $LOCAL_XRAY" >&2; exit 1; }
  /bin/cp "$LOCAL_XRAY" "$XRAY_PATH"
else
  case "$(/usr/bin/uname -m)" in
    arm64)
      ASSET_NAME="Xray-macos-arm64-v8a.zip"
      ;;
    x86_64)
      ASSET_NAME="Xray-macos-64.zip"
      ;;
    *)
      echo "معماری این Mac پشتیبانی نمی‌شود: $(/usr/bin/uname -m)" >&2
      exit 1
      ;;
  esac

  echo "در حال دریافت اطلاعات نسخه Xray..."
  RELEASES_PATH="$TEMP_DIR/releases.json"
  /usr/bin/curl --fail --location --retry 3 --connect-timeout 20 \
    --output "$RELEASES_PATH" \
    "https://api.github.com/repos/XTLS/Xray-core/releases?per_page=20"

  STABLE_ARGUMENT=""
  [[ "$STABLE_ONLY" == true ]] && STABLE_ARGUMENT="stable-only"
  RELEASE_INFO="$(/usr/bin/osascript -l JavaScript "$SCRIPT_DIR/ResolveRelease.js" \
    "$RELEASES_PATH" "$ASSET_NAME" "$STABLE_ARGUMENT")"
  IFS=$'\t' read -r DOWNLOAD_URL EXPECTED_DIGEST RELEASE_TAG <<< "$RELEASE_INFO"
  [[ -n "$DOWNLOAD_URL" ]] || { echo "لینک دانلود Xray پیدا نشد." >&2; exit 1; }

  ARCHIVE_PATH="$TEMP_DIR/$ASSET_NAME"
  echo "در حال دانلود Xray $RELEASE_TAG (معمولاً حدود چند ده مگابایت)..."
  /usr/bin/curl --fail --location --retry 3 --connect-timeout 20 \
    --progress-bar --output "$ARCHIVE_PATH" "$DOWNLOAD_URL"

  if [[ "$EXPECTED_DIGEST" == sha256:* ]]; then
    EXPECTED_SHA256="${EXPECTED_DIGEST#sha256:}"
    ACTUAL_SHA256="$(/usr/bin/shasum -a 256 "$ARCHIVE_PATH" | /usr/bin/awk '{print $1}')"
    [[ "${ACTUAL_SHA256:l}" == "${EXPECTED_SHA256:l}" ]] || {
      echo "بررسی SHA-256 ناموفق بود؛ نصب متوقف شد." >&2
      exit 1
    }
  fi

  EXTRACT_DIR="$TEMP_DIR/extracted"
  /bin/mkdir -p "$EXTRACT_DIR"
  /usr/bin/ditto -x -k "$ARCHIVE_PATH" "$EXTRACT_DIR"
  EXTRACTED_XRAY="$(/usr/bin/find "$EXTRACT_DIR" -type f -name xray -print -quit)"
  [[ -n "$EXTRACTED_XRAY" ]] || { echo "فایل xray داخل بسته پیدا نشد." >&2; exit 1; }
  /bin/cp "$EXTRACTED_XRAY" "$XRAY_PATH"

  for DATA_FILE in geoip.dat geosite.dat; do
    FOUND_DATA="$(/usr/bin/find "$EXTRACT_DIR" -type f -name "$DATA_FILE" -print -quit)"
    [[ -z "$FOUND_DATA" ]] || /bin/cp "$FOUND_DATA" "$XRAY_DIR/$DATA_FILE"
  done
fi

/bin/chmod 700 "$XRAY_PATH"
/usr/bin/xattr -dr com.apple.quarantine "$XRAY_DIR" 2>/dev/null || true
/usr/bin/codesign --force --sign - "$XRAY_PATH" >/dev/null 2>&1 || true

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Xray companion for Chrome",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
/bin/chmod 600 "$MANIFEST_PATH"

echo
echo "نصب برنامه همراه macOS کامل شد."
echo "این نسخه به Xcode یا Command Line Tools نیاز ندارد."
echo "Google Chrome را کاملاً ببندید و دوباره باز کنید."
