#!/usr/bin/env bash
# Test plugin/scripts/kit-stats.sh on a fixture events.jsonl: Main session section, per-model cost including
# main rows, fit per agent, and the three escalation signals (builder -> debugger, turns >= cap, failed verify).
# Run: bash tests/plugin/kit-stats.sh   (exit 0 when all pass)
set -uo pipefail
H="$(cd "$(dirname "$0")/../.." && pwd)"
STATS="$H/plugin/scripts/kit-stats.sh"
command -v jq >/dev/null 2>&1 || { echo "SKIP: jq not installed"; exit 0; }
command -v git >/dev/null 2>&1 || { echo "SKIP: git not installed"; exit 0; }
T="$(mktemp -d "${TMPDIR:-/tmp}/sa-stats.XXXXXX")"; trap 'rm -rf "$T"' EXIT
unset TURN_GUARD_DENY
pass=0; failn=0
check() { # check <name> <want> <got>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); else failn=$((failn+1)); echo "FAIL: $1 (want '$2', got '$3')"; fi
}

R="$T/repo"; git init -q "$R" 2>/dev/null
mkdir -p "$R/.claude/metrics"
EV="$R/.claude/metrics/events.jsonl"
export CLAUDE_PROJECT_DIR="$R"

# The cap the stats must use is the turn-guard default, not a number baked into the test.
CAP=$(sed -n 's/.*TURN_GUARD_DENY:-}" *\([0-9][0-9]*\).*/\1/p' "$H/plugin/hooks/turn-guard.sh" | head -1)
[ -n "$CAP" ] || { echo "FAIL: cannot read the TURN_GUARD_DENY default from plugin/hooks/turn-guard.sh"; exit 1; }
OVER=$((CAP + 10))

S=claude-sonnet-5-5; O=claude-opus-5-5
# Strictly increasing timestamps (a file counter, because $(ts) runs in a subshell).
echo 0 > "$T/n"
ts() { local n; n=$(( $(cat "$T/n") + 1 )); echo "$n" > "$T/n"; printf '2026-01-01T00:%02d:%02dZ' $((n/60)) $((n%60)); }
sub() { # sub <session> <agent> <model> <turns>
  jq -cn --arg s "$1" --arg a "$2" --arg m "$3" --argjson t "$4" --arg ts "$(ts)" \
    '{ts:$ts, session:$s, kind:"subagent", agent:$a, model:$m, turns:$t, tok_in:100, tok_out:100, cache_read:1000, cache_write:0, duration_ms:1000}'
}
ver() { jq -cn --arg s "$1" --argjson p "$2" --arg ts "$(ts)" '{ts:$ts, session:$s, kind:"verify", pass:$p}'; }
main_row() { jq -cn --argjson c "$1" --arg ts "$(ts)" \
  '{ts:$ts, session:"sess-main", kind:"main", model:"claude-opus-5-5", turns:10, tok_in:1000, tok_out:100, cache_read:10000, cache_write:0, ctx_max:$c}'; }

{
  # A: builder, then debugger                         -> signal builder -> debugger
  sub sessA builder "$S" 30;   sub sessA debugger "$O" 20
  # B: builder at the cap                             -> signal turns
  sub sessB builder "$S" "$OVER"
  # C: tester then a failing verify                   -> signal failed verify (tester); a later builder + passing verify is clean
  sub sessC tester "$S" 20;    ver sessC false;  sub sessC builder "$S" 10;  ver sessC true
  # D: one builder run hit by all three signals       -> still ONE escalated run
  sub sessD builder "$S" "$OVER";  ver sessD false;  sub sessD debugger "$O" 20
  # E: clean builder run
  sub sessE builder "$S" 10;   ver sessE true
  # Main session: five Stops with ctx_max 50k..250k (two above 150k)
  for c in 50000 100000 150000 200000 250000; do main_row "$c"; done
} > "$EV"

out="$(bash "$STATS" 2>"$T/err")"; check "kit-stats exits 0" 0 "$?"
SC="$R/.claude/metrics/scorecard.json"
[ -s "$SC" ] && pass=$((pass+1)) || { failn=$((failn+1)); echo "FAIL: scorecard.json written"; }
q() { jq -r "$1" "$SC"; }

# Escalation signals
check "threshold read from turn-guard" "$CAP" "$(q .global.turn_deny_threshold)"
check "signal builder -> debugger (A, D)" 2 "$(q .global.signals.builder_to_debugger)"
check "signal turns (B, D)" 2 "$(q .global.signals.turns)"
check "signal failed verify (C tester, D)" 2 "$(q .global.signals.verify_fail)"
check "escalated runs dedupe (A, B, C-tester, D)" 4 "$(q .global.escalated_runs)"

# Fit per agent and tier
b='.agents[] | select(.agent=="builder" and .model=="sonnet")'
check "builder runs" 5 "$(q "$b | .runs")"
check "builder escalations (A, B, D)" 3 "$(q "$b | .escalations")"
check "builder fit" 0.4 "$(q "$b | .fit_score")"
check "builder pinned tier comes from the agent file" sonnet "$(q "$b | .pinned")"
t='.agents[] | select(.agent=="tester" and .model=="sonnet")'
check "tester escalated by a failing verify" 1 "$(q "$t | .escalations")"
check "tester fit" 0 "$(q "$t | .fit_score")"
check "debugger never escalated" 0 "$(q '.agents[] | select(.agent=="debugger") | .escalations')"
check "main rows never enter fit (runs = subagent runs only)" 8 "$(q '[.agents[].runs] | add')"

# Main session
check "main stops" 5 "$(q .main.runs)"
check "main total tokens" 55500 "$(q .main.total_tokens)"
check "main est cost (opus list price)" 0.04 "$(q .main.est_cost_usd)"
check "main ctx_max p50" 150000 "$(q .main.ctx_max_p50)"
check "main ctx_max p90" 200000 "$(q .main.ctx_max_p90)"
check "main ctx_max over 150k" 2 "$(q .main.ctx_over_150k)"

# Per-model cost includes the main rows (opus: 2 debugger runs + 5 main stops)
om='.models[] | select(.model=="claude-opus-5-5")'
check "opus: subagent runs" 2 "$(q "$om | .records")"
check "opus: main stops" 5 "$(q "$om | .main_records")"
check "opus: tokens include main rows" 5200 "$(q "$om | .tok_in")"
check "opus: est cost = main 0.04 + subagents 0.0052, to the cent" 0.05 "$(q "$om | .est_cost_usd")"

# Markdown
case "$out" in *"## Main session"*) pass=$((pass+1)) ;; *) failn=$((failn+1)); echo "FAIL: markdown has a Main session section" ;; esac
case "$out" in *"builder -> debugger: 2"*"failed verify (optional): 2"*) pass=$((pass+1)) ;; *) failn=$((failn+1)); echo "FAIL: markdown lists the per-signal counts" ;; esac

# Cap precedence: process env > settings.local.json > settings.json > turn-guard default
TURN_GUARD_DENY=25 bash "$STATS" >/dev/null 2>&1
check "env cap 25: builder A (30), B, D count" 3 "$(q .global.signals.turns)"
printf '{"env":{"TURN_GUARD_DENY":"200"}}\n' > "$R/.claude/settings.json"
bash "$STATS" >/dev/null 2>&1
check "settings.json cap is used" 200 "$(q .global.turn_deny_threshold)"
check "a run under the cap is not an escalation" 0 "$(q .global.signals.turns)"
printf '{"env":{"TURN_GUARD_DENY":"25"}}\n' > "$R/.claude/settings.local.json"
bash "$STATS" >/dev/null 2>&1
check "settings.local.json wins over settings.json" 25 "$(q .global.turn_deny_threshold)"
TURN_GUARD_DENY=30 bash "$STATS" >/dev/null 2>&1
check "process env wins over settings files" 30 "$(q .global.turn_deny_threshold)"
rm -f "$R/.claude/settings.json" "$R/.claude/settings.local.json"

# A builder run on the wrong tier (a caller passed "model") shows up as off-pin
sub sessG builder "$O" 10 >> "$EV"
out3="$(bash "$STATS" 2>/dev/null)"
case "$out3" in *"ran 1x on **opus** but is pinned to **sonnet**"*) pass=$((pass+1)) ;; *) failn=$((failn+1)); echo "FAIL: markdown lists the off-pin run" ;; esac

# No main rows: the section says so and nothing breaks
grep -v '"kind":"main"' "$EV" > "$T/ev2" && mv "$T/ev2" "$EV"
out2="$(bash "$STATS" 2>/dev/null)"
check "no main rows: runs 0" 0 "$(q .main.runs)"
case "$out2" in *"No main-session rows yet"*) pass=$((pass+1)) ;; *) failn=$((failn+1)); echo "FAIL: markdown explains missing main rows" ;; esac

echo "kit-stats: $pass passed, $failn failed"
[ "$failn" -eq 0 ]
