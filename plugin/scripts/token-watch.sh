#!/usr/bin/env bash
# One-line token check over .claude/metrics/events.jsonl (written by the metrics hooks): run it after a
# workflow change to compare before/after.
#   token-watch.sh                      # last hour
#   token-watch.sh --hours 24
#   token-watch.sh --since 2026-11-03T06:00:00Z [--until <ts>]
#   token-watch.sh --since <ts> --json  # print JSON (for automated comparison)
# Warns when: a builder run has > 100 assistant turns | a main-session Stop had context > 150k.
# "turns" are assistant messages (deduplicated by id); hooks/turn-guard.sh counts tool calls instead.
# Reads local files only: no network, never prints prompt content.
set -euo pipefail
# Default: the main checkout's events.jsonl, so a worktree reads the right file; TOKEN_WATCH_EVENTS wins.
if [ -n "${TOKEN_WATCH_EVENTS:-}" ]; then
  EV="$TOKEN_WATCH_EVENTS"
else
  # shellcheck source=/dev/null
  . "$(dirname "$0")/kit-metrics-lib.sh"
  EV="$(kit_events_file)"
fi
HOURS=1; SINCE=""; UNTIL="9999"; JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    --hours|--since|--until)
      [ $# -ge 2 ] || { echo "token-watch: $1 needs a value" >&2; exit 2; }
      case "$1" in --hours) HOURS="$2" ;; --since) SINCE="$2" ;; --until) UNTIL="$2" ;; esac
      shift 2 ;;
    --json) JSON=1; shift ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "token-watch: unknown argument: $1" >&2; exit 2 ;;
  esac
done
command -v jq >/dev/null || { echo "token-watch: jq is required" >&2; exit 2; }
[ -f "$EV" ] || { echo "token-watch: not found: $EV" >&2; exit 2; }
if [ -z "$SINCE" ]; then
  SINCE=$(date -u -v-"${HOURS}"H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "-${HOURS} hours" +%Y-%m-%dT%H:%M:%SZ)
fi

jq -s --arg s "$SINCE" --arg u "$UNTIL" '
  [.[] | select(.ts != null and .ts >= $s and .ts < $u)] as $e
  | ($e | map(select(.kind == "subagent"))) as $sa
  | ($sa | map(select(.agent == "builder"))) as $b
  | ($b | map(.turns // 0) | sort) as $t
  | ($e | map(select(.kind == "main"))) as $mn
  | {
      since: $s, until: $u,
      subagent_runs: ($sa | length),
      cache_read_M: ($sa | map(.cache_read // 0) | add // 0 | . / 1e6 | floor),
      main_stops: ($mn | length),
      main_tokens_M: ($mn | map((.tok_in // 0) + (.tok_out // 0) + (.cache_read // 0) + (.cache_write // 0)) | add // 0 | . / 1e6 | floor),
      main_ctx_over_150k: ($mn | map(select((.ctx_max // 0) > 150000)) | length),
      builder_runs: ($b | length),
      builder_p50_turns: (if ($t | length) > 0 then $t[($t | length) / 2 | floor] else null end),
      builder_over_100: ($b | map(select((.turns // 0) > 100)) | length)
    }
  | .warn = ([
      (if .builder_over_100 > 0 then "builder >100 turns: \(.builder_over_100)" else empty end),
      (if .main_ctx_over_150k > 0 then "main context >150k in \(.main_ctx_over_150k) stops" else empty end)
    ])
' "$EV" | if [ "$JSON" = 1 ]; then cat; else jq -r '
  "token-watch \(.since) -> \(if .until == "9999" then "now" else .until end): subagent \(.subagent_runs) runs, cache read \(.cache_read_M)M | main \(.main_stops) stops \(.main_tokens_M)M tokens, ctx>150k: \(.main_ctx_over_150k) | builder p50 \(.builder_p50_turns // "-") assistant turns, >100: \(.builder_over_100)"
  + (if (.warn | length) > 0 then "\nWARN: " + (.warn | join(" | ")) else "\nOK: within budget" end)'; fi
