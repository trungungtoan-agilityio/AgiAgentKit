#!/bin/bash
# Stop hook: measure the MAIN session's tokens (the coordinator, usually the biggest cost).
# Each Stop appends one kind "main" line per model to <main checkout>/.claude/metrics/events.jsonl,
# covering ONLY the transcript bytes added since the previous Stop of that session.
#   - The cursor is a BYTE offset (`tail -c +N` seeks; `tail -n +N` would scan a huge transcript).
#   - A partial last line (still being written) is not consumed; the next Stop counts it.
#   - A session with no cursor whose transcript is above the first-run limit is not back-filled:
#     the cursor starts at the current size and measuring begins from now on.
#   - ctx_max = the largest context (input + cache read + cache write) of any turn in the chunk.
# Never blocks; always exits 0.
set -o pipefail
umask 077   # the metrics dir holds usage data: keep it private
MAX_FIRST="${KIT_METRICS_MAIN_MAX_FIRST_BYTES:-20971520}"   # 20 MB
case $MAX_FIRST in ''|*[!0-9]*) MAX_FIRST=20971520 ;; esac
INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0

# Metrics dir: the main checkout's (the lib sits at ../scripts/ of the plugin).
LIB="$(dirname "$0")/../scripts/kit-metrics-lib.sh"
if [ -f "$LIB" ]; then . "$LIB"; MDIR=$(kit_metrics_dir); kit_ensure_dir "$MDIR"
else MDIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/metrics"; mkdir -p "$MDIR"; fi

# Same mkdir lock as metrics-subagent.sh; a lock older than 2 minutes is stale: remove it.
LOCKDIR="$MDIR/.metrics.lock"
LOCKED=0
for _ in 1 2 3 4 5; do
  if mkdir "$LOCKDIR" 2>/dev/null; then LOCKED=1; break; fi
  if [ -n "$(find "$LOCKDIR" -maxdepth 0 -mmin +2 2>/dev/null)" ]; then
    rmdir "$LOCKDIR" 2>/dev/null
    continue
  fi
  sleep 1
done
[ "$LOCKED" -eq 1 ] || exit 0   # best-effort: skip rather than risk double-counting
trap 'rmdir "$LOCKDIR" 2>/dev/null' EXIT

# Own byte cursor ("cursorb-main-"), apart from metrics-subagent's line cursor.
CUR="$MDIR/.cursorb-main-$(basename "$TRANSCRIPT")"
SZ=$(wc -c < "$TRANSCRIPT" 2>/dev/null | tr -d ' ')
case $SZ in ''|*[!0-9]*) exit 0 ;; esac
OFF=""
if [ -f "$CUR" ]; then
  OFF=$(cat "$CUR" 2>/dev/null)
  case $OFF in ''|*[!0-9]*) OFF="" ;; esac   # must be numeric: used inside $(( ))
fi
if [ -z "$OFF" ]; then
  if [ "$SZ" -gt "$MAX_FIRST" ]; then echo "$SZ" > "$CUR"; exit 0; fi
  OFF=0
else
  OFF=$((10#$OFF))                  # no octal: "08" would abort the hook
  [ "$SZ" -lt "$OFF" ] && OFF=0     # transcript replaced by a shorter one
fi
[ "$SZ" -gt "$OFF" ] || exit 0      # nothing new

# Consume only complete lines: bytes OFF..SZ minus a partial last line (no trailing newline).
END=$SZ
if [ -n "$(tail -c +"$SZ" "$TRANSCRIPT" 2>/dev/null | head -c 1)" ]; then
  PART=$(tail -c +"$((OFF + 1))" "$TRANSCRIPT" 2>/dev/null | head -c "$((SZ - OFF))" | tail -n 1 | wc -c | tr -d ' ')
  case $PART in ''|*[!0-9]*) exit 0 ;; esac
  END=$((SZ - PART))
fi
CL=$((END - OFF))
[ "$CL" -gt 0 ] || exit 0

# Main-thread assistant lines only (sidechains are the subagents' own records). Piped straight into
# jq: no temp copy of the transcript is written. The cursor moves only when jq succeeded.
OUT=$(
  tail -c +"$((OFF + 1))" "$TRANSCRIPT" 2>/dev/null | head -c "$CL" | jq -cRs --arg session "$SESSION" '
    [ split("\n")[] | select(length > 0) | (fromjson? // empty) | select(type=="object")
      | select((.isSidechain // false) == false and .type == "assistant" and (.message.model // "") != "<synthetic>")
      | {id: (.message.id // .uuid), model: (.message.model // "unknown"),
         ti: (.message.usage.input_tokens // 0), to: (.message.usage.output_tokens // 0),
         cr: (.message.usage.cache_read_input_tokens // 0), cw: (.message.usage.cache_creation_input_tokens // 0),
         ctx: ((.message.usage.input_tokens // 0) + (.message.usage.cache_read_input_tokens // 0) + (.message.usage.cache_creation_input_tokens // 0))} ]
    | unique_by(.id)   # one line per content block, same usage: count each message once
    | group_by(.model)[]
    | {ts: (now | todateiso8601), session: $session, kind: "main",
       model: .[0].model, turns: length,
       tok_in: (map(.ti) | add), tok_out: (map(.to) | add),
       cache_read: (map(.cr) | add), cache_write: (map(.cw) | add),
       ctx_max: (map(.ctx) | max)}' 2>/dev/null
  st=("${PIPESTATUS[@]}")
  # tail may get SIGPIPE (141) once head has its bytes; only jq or a real read failure counts.
  [ "${st[2]}" -eq 0 ] && { [ "${st[0]}" -eq 0 ] || [ "${st[0]}" -eq 141 ]; }
)
RC=$?
[ "$RC" -eq 0 ] || exit 0

[ -n "$OUT" ] && printf '%s\n' "$OUT" >> "$MDIR/events.jsonl"
echo "$END" > "$CUR"
exit 0
