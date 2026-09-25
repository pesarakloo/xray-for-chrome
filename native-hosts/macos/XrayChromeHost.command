#!/bin/zsh
set -u

ROOT="$HOME/Library/Application Support/XrayChrome"
XRAY_BIN="$ROOT/xray/xray"
RUNTIME_DIR="$ROOT/runtime"
LOGS_DIR="$ROOT/logs"
CONFIG_PATH="$RUNTIME_DIR/config.json"
STATE_PATH="$RUNTIME_DIR/state.json"
ERROR_LOG="$LOGS_DIR/error.log"
MAX_MESSAGE_SIZE=16777216

TMP_DIR="$(/usr/bin/mktemp -d -t xray-chrome-host)" || exit 1
REQUEST_PATH="$TMP_DIR/request.json"
RESPONSE_PATH="$TMP_DIR/response.json"
CONFIG_TEMP="$TMP_DIR/config.json"
PROBE_PID=""
stop_probe() {
  if [[ "$PROBE_PID" == <-> ]]; then
    local command="$(process_command "$PROBE_PID")"
    if [[ "$command" == *"$TMP_DIR/probe.json"* ]]; then
      /bin/kill -9 "$PROBE_PID" 2>/dev/null || true
      wait "$PROBE_PID" 2>/dev/null || true
    fi
  fi
  PROBE_PID=""
}
cleanup() {
  stop_probe
  /bin/rm -rf "$TMP_DIR"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

write_prefix() {
  local length="$1"
  printf "\\$(printf '%03o' $(( length & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 8) & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 16) & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 24) & 255 )))"
}

send_response() {
  local length="$(/usr/bin/wc -c < "$RESPONSE_PATH" | /usr/bin/tr -d ' ')"
  write_prefix "$length"
  /bin/cat "$RESPONSE_PATH"
  exit 0
}

new_response() {
  /usr/bin/plutil -create json "$RESPONSE_PATH" >/dev/null 2>&1
}

put_string() {
  /usr/bin/plutil -insert "$1" -string "$2" "$RESPONSE_PATH" >/dev/null 2>&1
}

put_integer() {
  /usr/bin/plutil -insert "$1" -integer "$2" "$RESPONSE_PATH" >/dev/null 2>&1
}

put_bool() {
  /usr/bin/plutil -insert "$1" -bool "$2" "$RESPONSE_PATH" >/dev/null 2>&1
}

respond_error() {
  local message="${1:0:1200}"
  new_response
  put_bool ok false
  put_string error "$message"
  send_response
}

process_command() {
  /bin/ps -p "$1" -o command= 2>/dev/null || true
}

owned_pid() {
  [[ -f "$STATE_PATH" ]] || return 1
  local pid="$(/usr/bin/plutil -extract pid raw -o - "$STATE_PATH" 2>/dev/null || true)"
  [[ "$pid" == <-> ]] || return 1
  /bin/kill -0 "$pid" 2>/dev/null || return 1
  local command="$(process_command "$pid")"
  [[ "$command" == *"$XRAY_BIN"* && "$command" == *"$CONFIG_PATH"* ]] || return 1
  printf '%s' "$pid"
}

stop_owned() {
  local pid="$(owned_pid 2>/dev/null || true)"
  if [[ "$pid" == <-> ]]; then
    /bin/kill "$pid" 2>/dev/null || true
    local attempts=0
    while /bin/kill -0 "$pid" 2>/dev/null && (( attempts < 30 )); do
      /bin/sleep 0.1
      attempts=$(( attempts + 1 ))
    done
    /bin/kill -9 "$pid" 2>/dev/null || true
  fi
  /bin/rm -f "$STATE_PATH"
}

xray_version() {
  if [[ ! -x "$XRAY_BIN" ]]; then
    printf 'Xray نصب نیست'
    return
  fi
  local version="$("$XRAY_BIN" version 2>/dev/null | /usr/bin/head -n 1)"
  [[ -n "$version" ]] && printf '%s' "$version" || printf 'Xray'
}

make_status_response() {
  local pid="$(owned_pid 2>/dev/null || true)"
  new_response
  put_bool ok true
  put_string platform macos
  put_string version "$(xray_version)"
  if [[ "$pid" == <-> ]]; then
    local port="$(/usr/bin/plutil -extract port raw -o - "$STATE_PATH" 2>/dev/null || printf 10808)"
    put_bool running true
    put_integer pid "$pid"
    put_integer port "$port"
  else
    put_bool running false
  fi
  send_response
}

read_message() {
  local length="$(/usr/bin/od -An -tu4 -N4 | /usr/bin/tr -d '[:space:]')"
  [[ "$length" == <-> ]] || exit 0
  (( length > 0 && length <= MAX_MESSAGE_SIZE )) || respond_error "اندازه پیام Native Messaging معتبر نیست."
  /bin/dd bs=1 count="$length" of="$REQUEST_PATH" 2>/dev/null
  local actual="$(/usr/bin/wc -c < "$REQUEST_PATH" | /usr/bin/tr -d ' ')"
  [[ "$actual" == "$length" ]] || respond_error "پیام Native Messaging ناقص دریافت شد."
  /usr/bin/plutil -lint "$REQUEST_PATH" >/dev/null 2>&1 || respond_error "ساختار پیام دریافتی معتبر نیست."
}

handle_start() {
  [[ -x "$XRAY_BIN" ]] || respond_error "هسته Xray نصب نشده است؛ install.command را دوباره اجرا کنید."
  local port="$(/usr/bin/plutil -extract port raw -o - "$REQUEST_PATH" 2>/dev/null || printf 10808)"
  [[ "$port" == <-> ]] || respond_error "پورت محلی معتبر نیست."
  (( port >= 1024 && port <= 65535 )) || respond_error "پورت محلی معتبر نیست."

  /bin/mkdir -p "$RUNTIME_DIR" "$LOGS_DIR"
  /bin/chmod 700 "$RUNTIME_DIR" "$LOGS_DIR"
  stop_owned

  /usr/bin/plutil -extract config json -o "$CONFIG_TEMP" "$REQUEST_PATH" >/dev/null 2>&1 || respond_error "کانفیگ Xray دریافت نشد."
  /usr/bin/plutil -replace log.loglevel -string warning "$CONFIG_TEMP" >/dev/null 2>&1 || true
  /usr/bin/plutil -remove log.error "$CONFIG_TEMP" >/dev/null 2>&1 || true
  /usr/bin/plutil -insert log.error -string "$ERROR_LOG" "$CONFIG_TEMP" >/dev/null 2>&1 || respond_error "ثبت مسیر گزارش Xray ناموفق بود."
  /bin/cp "$CONFIG_TEMP" "$CONFIG_PATH"
  /bin/chmod 600 "$CONFIG_PATH"

  local validation_path="$TMP_DIR/validation.log"
  "$XRAY_BIN" run -test -c "$CONFIG_PATH" >"$validation_path" 2>&1
  local validation_status=$?
  if (( validation_status != 0 )); then
    local validation="$(/usr/bin/tail -c 900 "$validation_path" 2>/dev/null)"
    respond_error "کانفیگ توسط Xray رد شد: $validation"
  fi

  /usr/bin/nohup "$XRAY_BIN" run -c "$CONFIG_PATH" </dev/null >/dev/null 2>&1 &
  local xray_pid=$!
  /bin/sleep 0.85
  /bin/kill -0 "$xray_pid" 2>/dev/null || respond_error "Xray بلافاصله متوقف شد. گزارش خطا را بررسی کنید."

  /usr/bin/plutil -create json "$STATE_PATH" >/dev/null 2>&1
  /usr/bin/plutil -insert pid -integer "$xray_pid" "$STATE_PATH" >/dev/null 2>&1
  /usr/bin/plutil -insert port -integer "$port" "$STATE_PATH" >/dev/null 2>&1
  /usr/bin/plutil -insert xrayExecutable -string "$XRAY_BIN" "$STATE_PATH" >/dev/null 2>&1
  /usr/bin/plutil -insert createdAt -string "$(/bin/date -u +'%Y-%m-%dT%H:%M:%SZ')" "$STATE_PATH" >/dev/null 2>&1
  /bin/chmod 600 "$STATE_PATH"

  local ready=false
  local attempts=0
  while (( attempts < 18 )); do
    if /usr/bin/nc -z -w 1 127.0.0.1 "$port" >/dev/null 2>&1; then
      ready=true
      break
    fi
    /bin/sleep 0.15
    attempts=$(( attempts + 1 ))
  done
  if [[ "$ready" != true ]]; then
    stop_owned
    respond_error "Xray اجرا شد اما پراکسی محلی در دسترس قرار نگرفت."
  fi

  new_response
  put_bool ok true
  put_bool running true
  put_string platform macos
  put_integer pid "$xray_pid"
  put_integer port "$port"
  put_string version "$(xray_version)"
  send_response
}

probe_response() {
  # Clean up before sending the response: Chrome may close the host immediately.
  stop_probe
  new_response
  put_bool ok true
  put_string status "$1"
  [[ -n "${2:-}" ]] && put_integer latencyMs "$2"
  [[ -n "${3:-}" ]] && put_string error "$3"
  send_response
}

handle_probe() {
  [[ -x "$XRAY_BIN" ]] || respond_error "هسته Xray نصب نیست؛ نصب‌کننده را دوباره اجرا کنید."
  local probe_config="$TMP_DIR/probe.json"
  /usr/bin/plutil -extract config json -o "$probe_config" "$REQUEST_PATH" >/dev/null 2>&1 || respond_error "کانفیگ تست دریافت نشد."
  /bin/chmod 600 "$probe_config"

  local port=0
  local attempts=0
  while (( attempts < 10 )); do
    port=$(( 20000 + RANDOM ))
    /usr/bin/nc -z -w 1 127.0.0.1 "$port" >/dev/null 2>&1 || break
    attempts=$(( attempts + 1 ))
  done
  (( attempts < 10 )) || probe_response error "" "پورت محلی برای تست در دسترس نیست."
  /usr/bin/plutil -replace log -json '{"loglevel":"none"}' "$probe_config" >/dev/null 2>&1 || respond_error "تنظیم تست ناموفق بود."
  /usr/bin/plutil -replace inbounds -json "[{\"tag\":\"latency-http\",\"listen\":\"127.0.0.1\",\"port\":$port,\"protocol\":\"http\",\"settings\":{}}]" "$probe_config" >/dev/null 2>&1 || respond_error "تنظیم پورت تست ناموفق بود."

  # Separate config, process and port: never touch the active connection's state.
  "$XRAY_BIN" run -c "$probe_config" </dev/null >"$TMP_DIR/probe.log" 2>&1 &
  PROBE_PID=$!
  local ready=false
  attempts=0
  while (( attempts < 30 )); do
    /bin/kill -0 "$PROBE_PID" 2>/dev/null || probe_response error "" "کانفیگ برای تست اجرا نشد؛ تنظیمات آن را بررسی کنید."
    if /usr/bin/nc -z -w 1 127.0.0.1 "$port" >/dev/null 2>&1; then
      ready=true
      break
    fi
    /bin/sleep 0.1
    attempts=$(( attempts + 1 ))
  done
  [[ "$ready" == true ]] || probe_response error "" "پراکسی موقت تست آماده نشد."
  /bin/kill -0 "$PROBE_PID" 2>/dev/null || probe_response error "" "اجرای تست پینگ متوقف شد."

  local metrics
  metrics="$(/usr/bin/curl --disable --silent --show-error --output /dev/null \
    --noproxy "" --proxy "http://127.0.0.1:$port" \
    --connect-timeout 8 --max-time 8 --http1.1 \
    --write-out '%{http_code} %{time_total}' \
    'https://www.gstatic.com/generate_204' 2>"$TMP_DIR/probe-curl.log")"
  local curl_status=$?
  (( curl_status == 28 )) && probe_response timeout "" "تا ۸ ثانیه پاسخی از مسیر کانفیگ دریافت نشد."
  (( curl_status == 0 )) || probe_response error "" "درخواست HTTPS از مسیر کانفیگ ناموفق بود."
  local http_code seconds
  IFS=' ' read -r http_code seconds <<< "$metrics"
  [[ "$http_code" == 204 ]] || probe_response error "" "مقصد تست پاسخ مورد انتظار را برنگرداند."
  local elapsed_ms="$(printf '%s' "$seconds" | /usr/bin/awk '{ n=int($1*1000+0.5); print (n < 1 ? 1 : n) }')"
  probe_response ok "$elapsed_ms"
}

read_message
ACTION="$(/usr/bin/plutil -extract action raw -o - "$REQUEST_PATH" 2>/dev/null || true)"

case "$ACTION" in
  start)
    handle_start
    ;;
  stop)
    stop_owned
    new_response
    put_bool ok true
    put_bool running false
    send_response
    ;;
  status)
    make_status_response
    ;;
  logs)
    LOG_CONTENT=""
    [[ -f "$ERROR_LOG" ]] && LOG_CONTENT="$(/usr/bin/tail -c 65536 "$ERROR_LOG" 2>/dev/null)"
    PID_VALUE="$(owned_pid 2>/dev/null || true)"
    new_response
    put_bool ok true
    put_bool running "$([[ "$PID_VALUE" == <-> ]] && printf true || printf false)"
    put_string logs "$LOG_CONTENT"
    send_response
    ;;
  ping)
    new_response
    put_bool ok true
    put_string hostVersion 0.3.3
    put_integer probeVersion 1
    put_string platform macos
    send_response
    ;;
  probe)
    handle_probe
    ;;
  *)
    respond_error "درخواست برنامه همراه شناخته نشد."
    ;;
esac
