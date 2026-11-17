#!/usr/bin/env bash
# Test the telemetry hooks: metrics-main.sh (kind "main", one line per Stop and model, delta only) and
# metrics-subagent.sh (kind "subagent", one line per run). Run: bash tests/plugin/metrics.sh (exit 0 when all pass)
set -uo pipefail
H="$(cd "$(dirname "$0")/../.." && pwd)"
MAIN="$H/plugin/hooks/metrics-main.sh"
SUB="$H/plugin/hooks/metrics-subagent.sh"
command -v jq >/dev/null 2>&1 || { echo "SKIP: jq not installed"; exit 0; }
command -v git >/dev/null 2>&1 || { echo "SKIP: git not installed"; exit 0; }
T="$(mktemp -d "${TMPDIR:-/tmp}/sa-metrics.XXXXXX")"; trap 'rm -rf "$T"' EXIT
pass=0; failn=0
check() { # check <name> <want> <got>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); else failn=$((failn+1)); echo "FAIL: $1 (want '$2', got '$3')"; fi
}

R="$T/repo"; git init -q "$R" 2>/dev/null
MD="$R/.claude/metrics"; EV="$MD/events.jsonl"
export CLAUDE_PROJECT_DIR="$R"
evn() { wc -l < "$EV" 2>/dev/null | tr -d ' '; }

# assistant <id> <model> <in> <out> <cache_read> <cache_write> [sidechain]
assistant() {
  jq -cn --arg id "$1" --arg m "$2" --argjson i "$3" --argjson o "$4" --argjson cr "$5" --argjson cw "$6" --argjson sc "${7:-false}" \
    '{type:"assistant", uuid:("u-"+$id), isSidechain:$sc, message:{id:$id, model:$m,
      usage:{input_tokens:$i, output_tokens:$o, cache_read_input_tokens:$cr, cache_creation_input_tokens:$cw}}}'
}
run_main() { jq -cn --arg s "${2:-sess-1}" --arg t "$1" '{session_id:$s, transcript_path:$t}' | bash "$MAIN"; }

# --- main session: first Stop = two turns (one message written as two blocks), a sidechain, a synthetic, a user line ---
TR="$T/session.jsonl"
{
  assistant m1 claude-opus-5-5 10 100 1000 200
  assistant m1 claude-opus-5-5 10 100 1000 200
  assistant m2 claude-opus-5-5 20 50 3000 0
  assistant s1 claude-sonnet-5-5 99 99 99 99 true
  assistant m3 "<synthetic>" 7 7 7 7
  echo '{"type":"user","message":{"content":"hi"}}'
} > "$TR"
run_main "$TR"; check "first Stop exits 0" 0 "$?"
check "first Stop wrote one line" 1 "$(evn)"
l1="$(sed -n 1p "$EV")"
check "kind is main" main "$(jq -r .kind <<<"$l1")"
check "session" sess-1 "$(jq -r .session <<<"$l1")"
check "model" claude-opus-5-5 "$(jq -r .model <<<"$l1")"
check "turns dedupe by message id, skip sidechain + synthetic" 2 "$(jq -r .turns <<<"$l1")"
check "tok_in" 30 "$(jq -r .tok_in <<<"$l1")"
check "tok_out" 150 "$(jq -r .tok_out <<<"$l1")"
check "cache_read" 4000 "$(jq -r .cache_read <<<"$l1")"
check "cache_write" 200 "$(jq -r .cache_write <<<"$l1")"
check "ctx_max = largest in+read+write of a turn" 3020 "$(jq -r .ctx_max <<<"$l1")"
check "ts is ISO-8601" yes "$(jq -r 'if (.ts|test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z$")) then "yes" else "no" end' <<<"$l1")"

run_main "$TR"
check "second Stop with nothing new adds no line" 1 "$(evn)"
assistant m4 claude-opus-5-5 5 40 8000 100 >> "$TR"
run_main "$TR"
check "second Stop adds exactly one line" 2 "$(evn)"
l2="$(sed -n 2p "$EV")"
check "second Stop counts only the delta (turns)" 1 "$(jq -r .turns <<<"$l2")"
check "second Stop tok_in" 5 "$(jq -r .tok_in <<<"$l2")"
check "second Stop ctx_max" 8105 "$(jq -r .ctx_max <<<"$l2")"
check "line 1 unchanged" "$l1" "$(sed -n 1p "$EV")"

# --- main session: edge cases ---
TA="$T/a.jsonl"; { assistant a1 claude-opus-5-5 1 1 1 1; assistant a2 claude-sonnet-5-5 2 2 2 2; } > "$TA"
n0=$(evn); run_main "$TA" sess-a
check "two models in one chunk: two lines" $((n0 + 2)) "$(evn)"

TB="$T/b.jsonl"   # a partial last line is not consumed until it is complete
{ assistant b1 claude-opus-5-5 11 1 1 1; assistant b2 claude-opus-5-5 22 1 1 1 | tr -d '\n' | head -c 30; } > "$TB"
n0=$(evn); run_main "$TB" sess-b
check "partial line: only the complete line counted" "$((n0 + 1))" "$(evn)"
check "partial line: cursor stops before the partial line" "$(assistant b1 claude-opus-5-5 11 1 1 1 | wc -c | tr -d ' ')" "$(cat "$MD/.cursorb-main-b.jsonl")"
{ assistant b1 claude-opus-5-5 11 1 1 1; assistant b2 claude-opus-5-5 22 1 1 1; } > "$TB"
run_main "$TB" sess-b
check "partial line: completed line counted at the next Stop" "1 22" "$(tail -n 1 "$EV" | jq -r '"\(.turns) \(.tok_in)"')"

TD="$T/d.jsonl"   # first Stop on a transcript above the first-run limit: no back-fill, cursor = size
{ assistant d1 claude-opus-5-5 5 1 1 1; assistant d2 claude-opus-5-5 5 1 1 1; } > "$TD"
n0=$(evn); KIT_METRICS_MAIN_MAX_FIRST_BYTES=10 run_main "$TD" sess-d
check "first-run limit: no line written" "$n0" "$(evn)"
check "first-run limit: cursor = size" "$(wc -c < "$TD" | tr -d ' ')" "$(cat "$MD/.cursorb-main-d.jsonl")"
assistant d3 claude-opus-5-5 9 1 1 1 >> "$TD"
KIT_METRICS_MAIN_MAX_FIRST_BYTES=10 run_main "$TD" sess-d
check "first-run limit: next Stop counts only the new turn" "1 9" "$(tail -n 1 "$EV" | jq -r '"\(.turns) \(.tok_in)"')"

TE="$T/e.jsonl"   # a lock older than 2 minutes is stale: removed, and the Stop still records
assistant e1 claude-opus-5-5 4 1 1 1 > "$TE"
mkdir "$MD/.metrics.lock"; touch -t 202001010000 "$MD/.metrics.lock"
n0=$(evn); run_main "$TE" sess-e
check "stale lock: the Stop records" $((n0 + 1)) "$(evn)"
check "stale lock: lock released after the run" no "$([ -d "$MD/.metrics.lock" ] && echo yes || echo no)"
[ -f "$MD/.gitignore" ] && pass=$((pass+1)) || { failn=$((failn+1)); echo "FAIL: metrics dir has its own .gitignore"; }

printf 'not json' | bash "$MAIN"; check "garbage stdin exits 0 (main)" 0 "$?"
printf '{"session_id":"x","transcript_path":"%s/none"}' "$T" | bash "$MAIN"; check "missing transcript exits 0" 0 "$?"

# --- subagent: one run = one line, per-agent transcript, line cursor ---
# sub_line <id> <uuid> <parent uuid or ""> <timestamp> <in> <out>
sub_line() {
  jq -cn --arg id "$1" --arg u "$2" --arg p "$3" --arg ts "$4" --argjson i "$5" --argjson o "$6" \
    '{type:"assistant", isSidechain:true, uuid:$u, parentUuid:(if $p == "" then null else $p end), timestamp:$ts,
      message:{id:$id, model:"claude-sonnet-5-5",
        usage:{input_tokens:$i, output_tokens:$o, cache_read_input_tokens:100, cache_creation_input_tokens:0}}}'
}
run_sub() { jq -cn --arg t "$1" '{session_id:"sess-1", agent_transcript_path:$t, agent_type:"agi-agent-kit:builder"}' | bash "$SUB"; }
TS="$T/agent-1.jsonl"
{ sub_line a1 u1 "" 2026-01-01T00:00:00.000Z 10 5; sub_line a2 u2 u1 2026-01-01T00:00:07.000Z 20 5; } > "$TS"
n0=$(evn); run_sub "$TS"; check "subagent Stop exits 0" 0 "$?"
check "subagent wrote one line" $((n0 + 1)) "$(evn)"
s1="$(tail -n 1 "$EV")"
check "kind is subagent" subagent "$(jq -r .kind <<<"$s1")"
check "agent name without plugin prefix" builder "$(jq -r .agent <<<"$s1")"
check "model" claude-sonnet-5-5 "$(jq -r .model <<<"$s1")"
check "turns" 2 "$(jq -r .turns <<<"$s1")"
check "tok_in / tok_out / cache_read" "30 10 200" "$(jq -r '"\(.tok_in) \(.tok_out) \(.cache_read)"' <<<"$s1")"
check "duration_ms spans first to last turn" 7000 "$(jq -r .duration_ms <<<"$s1")"
run_sub "$TS"
check "second SubagentStop with nothing new adds no line" $((n0 + 1)) "$(evn)"
sub_line a3 u3 u2 2026-01-01T00:00:10.000Z 5 5 >> "$TS"
run_sub "$TS"
check "later turn: only the delta is recorded" "1 5" "$(tail -n 1 "$EV" | jq -r '"\(.turns) \(.tok_in)"')"
printf 'not json' | bash "$SUB" 2>/dev/null; check "garbage stdin exits 0 (subagent)" 0 "$?"

echo "metrics: $pass passed, $failn failed"
[ "$failn" -eq 0 ]
