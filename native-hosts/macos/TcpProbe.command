#!/bin/zsh
set -u
zmodload zsh/datetime || exit 1
export LC_ALL=C
REQUEST_PATH="$1"
TMP_DIR="$2"
SCRIPT_DIR="${0:A:h}"
typeset -A workers began
typeset -a pending

emit_message() {
  local payload="$1"
  # LC_ALL=C makes zsh's length byte-based, including UTF-8 error messages.
  local length=${#payload}
  printf "\\$(printf '%03o' $(( length & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 8) & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 16) & 255 )))"
  printf "\\$(printf '%03o' $(( (length >> 24) & 255 )))"
  printf '%s' "$payload"
}

cleanup_tcp() {
  local job_pid
  for job_pid in "${workers[@]}"; do /bin/kill -TERM "$job_pid" 2>/dev/null || true; done
  for job_pid in "${workers[@]}"; do wait "$job_pid" 2>/dev/null || true; done
  /bin/rm -rf "$TMP_DIR"
}
trap cleanup_tcp EXIT
trap 'exit 1' HUP INT TERM PIPE

TARGETS_PATH="$TMP_DIR/tcp-targets.tsv"
if ! /usr/bin/osascript -l JavaScript "$SCRIPT_DIR/TcpTargets.js" "$REQUEST_PATH" > "$TARGETS_PATH" 2>"$TMP_DIR/parse.log"; then
  emit_message '{"ok":false,"error":"فهرست آدرس‌ها یا پورت‌های تست TCP معتبر نیست."}'
  exit 1
fi

probe_one() {
  trap - EXIT
  local token="$1" address="$2" tcp_port="$3" tcp_pid=""
  trap 'if [[ -n "$tcp_pid" ]]; then /bin/kill -TERM "$tcp_pid" 2>/dev/null; wait "$tcp_pid" 2>/dev/null; fi; exit 0' HUP INT TERM
  local -F start_time=$EPOCHREALTIME
  /usr/bin/nc -z -G "$timeout_seconds" -w "$timeout_seconds" "$address" "$tcp_port" </dev/null > /dev/null 2>"$TMP_DIR/$token.error" &
  tcp_pid=$!
  wait "$tcp_pid"
  local exit_code=$?
  tcp_pid=""
  local -i elapsed_ms=$(( (EPOCHREALTIME - start_time) * 1000 + 0.5 ))
  (( elapsed_ms < 1 )) && elapsed_ms=1
  local result
  if (( exit_code == 0 )); then
    result="{\"ok\":true,\"type\":\"result\",\"id\":\"$token\",\"status\":\"ok\",\"latencyMs\":$elapsed_ms}"
  elif (( elapsed_ms >= timeout_ms - 20 )); then
    result="{\"ok\":true,\"type\":\"result\",\"id\":\"$token\",\"status\":\"timeout\",\"error\":\"مهلت اتصال TCP به سرور تمام شد.\"}"
  else
    result="{\"ok\":true,\"type\":\"result\",\"id\":\"$token\",\"status\":\"error\",\"error\":\"اتصال TCP برقرار نشد؛ آدرس، پورت یا شبکه را بررسی کنید.\"}"
  fi
  printf '%s' "$result" > "$TMP_DIR/$token.partial"
  /bin/mv "$TMP_DIR/$token.partial" "$TMP_DIR/$token.result"
}

exec 3< "$TARGETS_PATH"
IFS= read -r timeout_ms <&3 || exit 1
timeout_seconds=$(( (timeout_ms + 999) / 1000 ))
while IFS=$'\t' read -r token address tcp_port <&3; do
  [[ -n "$token" ]] || continue
  began[$token]=$EPOCHREALTIME
  probe_one "$token" "$address" "$tcp_port" &
  workers[$token]="$!"
  pending+=("$token")
done
exec 3<&-

# Every destination has started before collection; no two-item work queue.
while (( ${#pending} )); do
  typeset -a remaining=()
  for token in "${pending[@]}"; do
    if [[ -f "$TMP_DIR/$token.result" ]]; then
      emit_message "$(<"$TMP_DIR/$token.result")"
      wait "${workers[$token]}" 2>/dev/null || true
      unset "workers[$token]"
    elif (( (EPOCHREALTIME - began[$token]) * 1000 >= timeout_ms )); then
      # Also bounds DNS resolution, which nc's connection timeout may not cover.
      /bin/kill -TERM "${workers[$token]}" 2>/dev/null || true
      wait "${workers[$token]}" 2>/dev/null || true
      unset "workers[$token]"
      if [[ -f "$TMP_DIR/$token.result" ]]; then
        emit_message "$(<"$TMP_DIR/$token.result")"
      else
        emit_message "{\"ok\":true,\"type\":\"result\",\"id\":\"$token\",\"status\":\"timeout\",\"error\":\"مهلت اتصال TCP به سرور تمام شد.\"}"
      fi
    elif ! /bin/kill -0 "${workers[$token]}" 2>/dev/null; then
      wait "${workers[$token]}" 2>/dev/null || true
      unset "workers[$token]"
      emit_message "{\"ok\":true,\"type\":\"result\",\"id\":\"$token\",\"status\":\"error\",\"error\":\"اجرای تست TCP ناموفق بود؛ منابع سیستم را بررسی کنید.\"}"
    else
      remaining+=("$token")
    fi
  done
  pending=("${remaining[@]}")
  (( ${#pending} )) && /bin/sleep 0.02
done
emit_message '{"ok":true,"type":"done"}'
