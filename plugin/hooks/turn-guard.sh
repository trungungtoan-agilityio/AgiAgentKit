#!/bin/bash
# PreToolUse hook (no matcher): counts tool calls of the builder/tester subagents and caps them.
# Long subagent runs are the biggest token sink: warn early, block edits past the limit.
#   - Subagents only (non-empty .agent_id); the main session is never counted.
#   - Counter file: ${TMPDIR:-/tmp}/claude-turn-guard/<session>-<agent> (+1 per call).
#   - Env: TURN_GUARD_WARN=60, TURN_GUARD_WARN2=90, TURN_GUARD_DENY=130, TURN_GUARD_OFF=1 (disable).
#   - At WARN / WARN2: a reminder to stop at a safe point. From DENY: Edit/Write/Bash are
#     denied (asked outside auto mode); Read/Grep still pass so the agent can write its summary.
# Pragmatic: parallel calls may miscount by 1-2. Missing jq: pass through. Always exit 0.
INPUT=$(cat)
[ "${TURN_GUARD_OFF:-}" = 1 ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0
. "$(dirname "$0")/../scripts/kit-hook-lib.sh"

# One jq call, fields joined by 0x1f so empty fields survive `read`.
IFS=$'\x1f' read -r EV AID ATYPE SID TOOL < <(printf '%s' "$INPUT" | jq -r '[.hook_event_name // "", .agent_id // "", .agent_type // "", .session_id // "", .tool_name // ""] | join("\u001f")' 2>/dev/null)
[ "$EV" = PreToolUse ] || exit 0
[ -n "$AID" ] || exit 0
ATYPE="${ATYPE#*:}"   # drop a plugin prefix "x:"
case "$ATYPE" in builder|tester) ;; *) exit 0 ;; esac

num() { case "$1" in ''|*[!0-9]*) echo "$2" ;; *) echo "$1" ;; esac; }
WARN=$(num "${TURN_GUARD_WARN:-}" 60)
WARN2=$(num "${TURN_GUARD_WARN2:-}" 90)
DENY=$(num "${TURN_GUARD_DENY:-}" 130)

SAFE_SID=$(printf '%s' "$SID" | tr -cd 'A-Za-z0-9_-'); [ -n "$SAFE_SID" ] || SAFE_SID=nosession
SAFE_AID=$(printf '%s' "$AID" | tr -cd 'A-Za-z0-9_-'); [ -n "$SAFE_AID" ] || exit 0
DIR="${TMPDIR:-/tmp}/claude-turn-guard"
umask 077
mkdir -p "$DIR" 2>/dev/null || exit 0
[ -d "$DIR" ] && [ ! -L "$DIR" ] && [ -O "$DIR" ] || exit 0   # shared /tmp: refuse a symlink or another user's dir
F="$DIR/$SAFE_SID-$SAFE_AID"

N=$(cat "$F" 2>/dev/null); N=$(num "$N" 0); N=$((10#$N + 1))
TMP=$(mktemp "$DIR/.tmp.XXXXXX" 2>/dev/null) || exit 0
printf '%s\n' "$N" > "$TMP" && mv -f "$TMP" "$F" || { rm -f "$TMP"; exit 0; }

if [ "$N" -ge "$DENY" ]; then
  case "$TOOL" in
    Edit|Write|MultiEdit|NotebookEdit|Bash)
      kit_decide "Đã đạt $DENY lượt gọi tool (token budget): $TOOL bị chặn (tool-call cap reached)." \
        "Dừng ngay: không sửa file hay chạy lệnh nữa. Kết thúc lượt bằng bản tóm tắt (đã làm / còn lại / file nào, nêu file chưa commit) để leader giao lát mới cho agent mới (stop and summarize; Read/Grep still work)." ;;
  esac
  exit 0
fi

if [ "$N" -eq "$WARN" ] || [ "$N" -eq "$WARN2" ]; then
  MSG="Subagent đã gọi $N tool (token budget): dừng ở điểm an toàn, commit WIP nếu có sửa, rồi trả tóm tắt ngắn (đã làm / còn lại / file nào) cho leader (stop at a safe point and summarize). Từ lần gọi thứ $DENY, Edit/Write/Bash sẽ bị chặn."
  jq -n --arg m "$MSG" '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $m}}'
fi
exit 0
