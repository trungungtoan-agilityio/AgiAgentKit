#!/usr/bin/env bash
# Test bench/run.sh (--dry-run and a full run with a fake claude/npm/npx on PATH) and bench/report.sh.
# Run: bash tests/bench/dry-run.sh   (exit 0 when all pass)
set -uo pipefail
H="$(cd "$(dirname "$0")/../.." && pwd)"
RUN="$H/bench/run.sh"; REP="$H/bench/report.sh"
for c in jq git perl tar; do command -v "$c" >/dev/null 2>&1 || { echo "SKIP: $c not installed"; exit 0; }; done
T="$(mktemp -d "${TMPDIR:-/tmp}/sa-bench-test.XXXXXX")"; trap 'rm -rf "$T"' EXIT
pass=0; failn=0
t() { # t <name> <command...>
  local n="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); else failn=$((failn+1)); echo "FAIL: $n"; fi
}
has() { grep -qF -- "$2" "$1"; }
lacks() { ! grep -qF -- "$2" "$1"; }

# ---- fakes: claude (logs facts, writes superadvisor metrics, prints a result JSON), npm, npx (fake vitest json) ----
F="$T/fake"; mkdir -p "$F" "$T/tmp"
cat > "$F/claude" <<'EOF'
#!/usr/bin/env bash
model=""; plug=0; prev=""
for a in "$@"; do
  [ "$prev" = --model ] && model="$a"
  [ "$a" = --plugin-dir ] && plug=1
  prev="$a"
done
{
  echo "cwd=$PWD has_acc=$(ls tests 2>/dev/null | grep -c acceptance) has_answers=$([ -e .answers ] && echo 1 || echo 0)" \
       "has_backlog=$([ -e BACKLOG.md ] && echo 1 || echo 0) has_rules=$([ -f .claude/rules/workflow.md ] && echo 1 || echo 0)" \
       "plugin=$plug proj_env=${CLAUDE_PROJECT_DIR:-unset}"
} >> "${FAKE_LOG:?}"
[ -z "${FAKE_SLEEP:-}" ] || exec sleep "$FAKE_SLEEP"
if [ "$plug" = 1 ]; then
  mkdir -p .claude/metrics
  {
    echo '{"ts":"2026-01-01T00:00:01Z","session":"s1","kind":"subagent","agent":"builder","model":"claude-sonnet-5-5","turns":5,"tok_in":100,"tok_out":50,"cache_read":1000,"cache_write":0,"duration_ms":2000}'
    echo '{"ts":"2026-01-01T00:00:02Z","session":"s1","kind":"main","model":"claude-sonnet-5-5","turns":3,"tok_in":10,"tok_out":20,"cache_read":300,"cache_write":0,"ctx_max":5000}'
  } > .claude/metrics/events.jsonl
fi
printf '{"type":"result","subtype":"success","is_error":false,"duration_ms":12345,"num_turns":7,"total_cost_usd":0.4321,"usage":{"input_tokens":110,"output_tokens":70,"cache_read_input_tokens":1300,"cache_creation_input_tokens":0},"modelUsage":{"%s":{"inputTokens":110,"outputTokens":70,"cacheReadInputTokens":1300,"cacheCreationInputTokens":0,"costUSD":0.4321}}}\n' "$model"
EOF
cat > "$F/npm" <<'EOF'
#!/usr/bin/env bash
[ "$1" = ci ] && mkdir -p node_modules
exit 0
EOF
cat > "$F/npx" <<'EOF'
#!/usr/bin/env bash
acc="$(ls tests | grep acceptance | head -1)"
st=passed; [ "${FAKE_PASS:-1}" = 1 ] || st=failed
echo "fake vitest banner"
printf '{"testResults":[{"name":"%s/tests/%s","status":"%s","assertionResults":[{"status":"passed"},{"status":"passed"},{"status":"%s"}]},{"name":"%s/tests/library.test.ts","status":"passed","assertionResults":[{"status":"passed"}]}]}\n' "$PWD" "$acc" "$st" "$st" "$PWD"
EOF
chmod +x "$F/claude" "$F/npm" "$F/npx"
export PATH="$F:$PATH" TMPDIR="$T/tmp" FAKE_LOG="$T/fake.log" CLAUDE_PROJECT_DIR=/nonexistent-project
unset BENCH_TIMEOUT BENCH_SETTING_SOURCES BENCH_KEEP

# ---- dry-run ---------------------------------------------------------------
D1="$T/d1.txt"; D2="$T/d2.txt"; D3="$T/d3.txt"
bash "$RUN" baseline C1 --dry-run --out "$T/never1" > "$D1" 2>&1; rc1=$?
bash "$RUN" superadvisor C3 --dry-run --out "$T/never2" > "$D2" 2>&1; rc2=$?
bash "$RUN" baseline all --dry-run --out "$T/never3" > "$D3" 2>&1; rc3=$?
t "dry-run baseline exits 0" test "$rc1" = 0
t "dry-run superadvisor exits 0" test "$rc2" = 0
t "dry-run all exits 0" test "$rc3" = 0
t "baseline uses the opus model" has "$D1" "--model claude-opus-5-5"
t "baseline uses acceptEdits and allowedTools" has "$D1" "--permission-mode acceptEdits"
t "baseline has allowedTools" has "$D1" "--allowedTools"
t "baseline has no plugin" lacks "$D1" "--plugin-dir"
t "baseline has no superadvisor init" lacks "$D1" "superadvisor init"
t "baseline prompt carries the card text" has "$D1" "Phí trễ hạn lệch một ngày"
t "baseline prompt hides the size/agent hint" lacks "$D1" "**Agent:**"
t "dry-run copies demo-app without answers" has "$D1" "--exclude=.answers"
t "dry-run installs with npm ci" has "$D1" "npm ci"
t "superadvisor loads the plugin" has "$D2" "--plugin-dir"
t "superadvisor runs superadvisor init" has "$D2" "superadvisor init"
t "superadvisor uses the sonnet model" has "$D2" "--model claude-sonnet-5-5"
t "superadvisor prompt tells the leader to delegate" has "$D2" "reviewer"
t "superadvisor dry-run shows kit-stats" has "$D2" "kit-stats.sh"
t "all expands to six cards" test "$(grep -c '^## baseline C' "$D3")" = 6
t "dry-run writes nothing" test ! -e "$T/never1" -a ! -e "$T/never2" -a ! -e "$T/never3"
t "dry-run never calls claude" test ! -e "$FAKE_LOG"
bash "$RUN" nope C1 --dry-run >/dev/null 2>&1; t "rejects a bad mode" test "$?" != 0
bash "$RUN" superadvisor C9 --dry-run >/dev/null 2>&1; t "rejects a bad card" test "$?" != 0
bash "$RUN" superadvisor C1 --runs 0 --dry-run >/dev/null 2>&1; t "rejects --runs 0" test "$?" != 0

# ---- full fake runs --------------------------------------------------------
O="$T/out"
bash "$RUN" baseline C1 --runs 2 --out "$O" > "$T/r1.txt" 2>&1; t "fake baseline run exits 0" test "$?" = 0
bash "$RUN" superadvisor C6 --runs 1 --out "$O" > "$T/r2.txt" 2>&1; t "fake superadvisor run exits 0" test "$?" = 0
R="$O/results.jsonl"
t "results.jsonl has 3 lines" test "$(wc -l < "$R" | tr -d ' ')" = 3
t "every line is well-formed" jq -e -s 'length == 3 and all(.[];
  (.mode | IN("baseline","superadvisor")) and (.card | test("^C[1-6]$")) and (.run | type) == "number"
  and .pass == true and .tests_passed == 3 and .tests_total == 3 and .status == "ok"
  and (.cost_usd | type) == "number" and (.tokens_in | type) == "number" and (.tokens_out | type) == "number"
  and (.cache_read | type) == "number" and (.turns | type) == "number" and (.duration_s | type) == "number"
  and (.tokens_by_model | length) >= 1)' "$R"
t "baseline line has no kit stats" jq -e -s '[.[] | select(.mode == "baseline")] | length == 2 and all(.[]; .kit_stats == null and .delegations == null)' "$R"
t "superadvisor line has delegations and kit stats" jq -e -s '[.[] | select(.mode == "superadvisor")][0]
  | .delegations >= 1 and (.kit_est_cost_usd | type) == "number" and (.kit_stats.models | length) >= 1' "$R"
t "token totals come from modelUsage" jq -e -s '.[0].tokens_in == 110 and .[0].cache_read == 1300 and .[0].cost_usd == 0.4321' "$R"
t "agent never saw acceptance tests" lacks "$FAKE_LOG" "has_acc=1"
t "agent never saw .answers" lacks "$FAKE_LOG" "has_answers=1"
t "agent never saw BACKLOG.md" lacks "$FAKE_LOG" "has_backlog=1"
t "baseline copy has no rules" has "$FAKE_LOG" "has_rules=0 plugin=0"
t "superadvisor copy has the rules and the plugin" has "$FAKE_LOG" "has_rules=1 plugin=1"
t "claude does not inherit CLAUDE_PROJECT_DIR" lacks "$FAKE_LOG" "proj_env=/nonexistent-project"
t "temp copies are removed" test "$(ls "$T/tmp" | grep -c aak-bench)" = 0
t "raw artifacts are kept" test -f "$O/raw/superadvisor-C6-1/result.json" -a -f "$O/raw/superadvisor-C6-1/changes.patch"

# ---- timeout and failing acceptance ---------------------------------------
O2="$T/out2"
FAKE_SLEEP=5 BENCH_TIMEOUT=1 bash "$RUN" baseline C2 --out "$O2" >/dev/null 2>&1
t "timeout is recorded" jq -e -s '.[0].status == "timeout" and .[0].cost_usd == null' "$O2/results.jsonl"
O3="$T/out3"
FAKE_PASS=0 bash "$RUN" superadvisor C4 --out "$O3" >/dev/null 2>&1
t "failing acceptance gives pass=false" jq -e -s '.[0].pass == false and .[0].tests_passed == 2 and .[0].tests_total == 3' "$O3/results.jsonl"

# ---- report ----------------------------------------------------------------
bash "$REP" "$O" > "$T/rep.md" 2>&1; t "report exits 0" test "$?" = 0
t "report has the mode x card table" has "$T/rep.md" "| baseline | C1 | 2 | 2/2 (100%) |"
t "report has the superadvisor row" has "$T/rep.md" "| superadvisor | C6 | 1 | 1/1 (100%) |"
t "report shows mean ± spread" has "$T/rep.md" "0.432 ± 0"
t "report has a summary per mode" test "$(grep -cE '^- \*\*(baseline|superadvisor)\*\*' "$T/rep.md")" = 2
t "report has the comparison line" has "$T/rep.md" "So sánh superadvisor / baseline"
t "report has tokens by model" has "$T/rep.md" "claude-opus-5-5"
t "report states what is measured" has "$T/rep.md" "**Đo được**"
t "report states what is estimated" has "$T/rep.md" "**Ước tính**"
bash "$REP" "$O3" > "$T/rep3.md" 2>&1
t "report shows a failed run as 0/1" has "$T/rep3.md" "| superadvisor | C4 | 1 | 0/1 (0%) |"
bash "$REP" "$T/empty" >/dev/null 2>&1; t "report fails on a missing results file" test "$?" != 0

echo "bench: $pass passed, $failn failed"
[ "$failn" = 0 ]
