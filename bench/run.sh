#!/usr/bin/env bash
# bench/run.sh - run demo-app backlog cards in two modes and record one JSON line per run.
#   baseline : one headless Claude Code session, no plugin, no rules, model $BENCH_BASELINE_MODEL.
#   superadvisor     : project prepared with `superadvisor init`, plugin loaded via --plugin-dir, leader model
#              $BENCH_SUPERADVISOR_MODEL that must delegate through the kit agents.
# Usage: bench/run.sh <baseline|superadvisor> <C1..C6|all> [--runs N] [--out <dir>] [--dry-run]
# Env: BENCH_TIMEOUT (s, default 900), BENCH_BASELINE_MODEL, BENCH_SUPERADVISOR_MODEL, BENCH_SETTING_SOURCES
#      (default "project,local"; empty = Claude Code default), BENCH_KEEP=1 (keep the temp copies), CLAUDE_BIN.
# WARNING: every run spends real tokens. Writes only to a temp copy and <out> (default bench/out/<timestamp>/).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
APP="$REPO/demo-app"; PLUGIN="$REPO/plugin"; SA="$REPO/bin/superadvisor"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
TIMEOUT="${BENCH_TIMEOUT:-900}"
BASE_MODEL="${BENCH_BASELINE_MODEL:-claude-opus-5-5}"
SUPERADVISOR_MODEL="${BENCH_SUPERADVISOR_MODEL:-claude-sonnet-5-5}"
SOURCES="${BENCH_SETTING_SOURCES-project,local}"
TOOLS_BASE="Read,Edit,Write,Glob,Grep,Bash(npm:*),Bash(npx:*),Bash(git:*),Bash(node:*),Bash(ls:*),Bash(cat:*),Bash(grep:*),Bash(find:*),Bash(sed:*),Bash(wc:*),Bash(head:*),Bash(tail:*)"
TOOLS_SUPERADVISOR="$TOOLS_BASE,Task,Agent"

die() { printf 'LỖI: %s\n' "$*" >&2; exit 1; }
usage() { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

[ $# -ge 2 ] || usage
MODE="$1"; CARDARG="$2"; shift 2
RUNS=1; OUT=""; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) [ $# -ge 2 ] || die "Thiếu giá trị cho --runs"; RUNS="$2"; shift 2 ;;
    --out) [ $# -ge 2 ] || die "Thiếu giá trị cho --out"; OUT="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) die "Tham số lạ: $1" ;;
  esac
done
case "$MODE" in baseline|superadvisor) ;; *) die "Mode phải là baseline hoặc superadvisor (nhận: $MODE)" ;; esac
case "$RUNS" in ''|*[!0-9]*|0) die "--runs phải là số nguyên >= 1" ;; esac
case "$TIMEOUT" in ''|*[!0-9]*) die "BENCH_TIMEOUT phải là số giây" ;; esac
if [ "$CARDARG" = all ]; then CARDS="C1 C2 C3 C4 C5 C6"; else
  case "$CARDARG" in C[1-6]) CARDS="$CARDARG" ;; *) die "Thẻ phải là C1..C6 hoặc all (nhận: $CARDARG)" ;; esac
fi
[ -n "$OUT" ] || OUT="$HERE/out/$(date +%Y%m%d-%H%M%S)"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
[ -f "$APP/BACKLOG.md" ] || die "Không thấy $APP/BACKLOG.md"
if [ "$DRY" = 0 ]; then
  for c in jq git npm npx perl awk tar "$CLAUDE_BIN"; do command -v "$c" >/dev/null 2>&1 || die "Thiếu lệnh: $c"; done
  mkdir -p "$OUT" || die "Không tạo được $OUT"
  printf 'CẢNH BÁO: mỗi lượt chạy tốn token thật (mode=%s, thẻ=%s, %s lượt).\n' "$MODE" "$CARDS" "$RUNS" >&2
fi

CUR_W=""
cleanup() {
  case "$CUR_W" in */aak-bench.*) [ "${BENCH_KEEP:-0}" = 1 ] || rm -rf "$CUR_W" ;; esac
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# card_text <id>: the card section of BACKLOG.md without the "Size/Agent" hint line (it would leak the routing).
card_text() {
  awk -v id="$1" '
    $0 ~ ("^## " id " ") { on = 1; print; next }
    on && /^## / { exit }
    on && /^- \*\*Size:\*\*/ { next }
    on { print }' "$APP/BACKLOG.md"
}

build_prompt() { # <mode> <card>
  local text; text="$(card_text "$2")"
  [ -n "$text" ] || die "Không thấy thẻ $2 trong BACKLOG.md"
  local common="Thư mục hiện tại là một app TypeScript nhỏ (Library loans). Làm đúng MỘT thẻ dưới đây, không làm thẻ khác. Lệnh kiểm chung: npm run typecheck && npx vitest run tests/. Test cũ phải luôn xanh; hành vi mới phải có test. Khi xong, báo cáo ngắn gọn."
  if [ "$1" = superadvisor ]; then
    printf '%s\n\n%s\n\n%s\n' "Bạn là leader của Session Superadvisor. Theo .claude/rules/workflow.md: (1) xác định cỡ thẻ S/M/L; (2) giao việc qua các agent của kit thay vì tự viết code: builder viết code, tester viết và chạy test mục tiêu, debugger khi nguyên nhân chưa rõ hoặc test hỏng hai lần; (3) thẻ cỡ M/L chạy đúng một lượt reviewer rồi sửa High/Critical (nếu có); (4) session chính chỉ điều phối và kiểm kết quả." "$common" "$text"
  else
    printf '%s\n\n%s\n' "$common" "$text"
  fi
}

# step <cmd...>: print in dry-run, else run with output appended to $LOG. step_cd <dir> <cmd...>: same inside <dir>.
LOG=/dev/null
step() {
  if [ "$DRY" = 1 ]; then printf '+'; printf ' %q' "$@"; printf '\n'; return 0; fi
  "$@" >>"$LOG" 2>&1
}
step_cd() {
  local d="$1"; shift
  if [ "$DRY" = 1 ]; then printf '+ (cd %q &&' "$d"; printf ' %q' "$@"; printf ')\n'; return 0; fi
  (cd "$d" && "$@") >>"$LOG" 2>&1
}

run_one() { # <mode> <card> <n>
  local mode="$1" card="$2" n="$3" model tools W RAW prompt rc status t0 wall RES VJ ACC KIT LINE accfile
  if [ "$mode" = superadvisor ]; then model="$SUPERADVISOR_MODEL"; tools="$TOOLS_SUPERADVISOR"; else model="$BASE_MODEL"; tools="$TOOLS_BASE"; fi
  prompt="$(build_prompt "$mode" "$card")" || exit 1
  RAW="$OUT/raw/$mode-$card-$n"; accfile="bench-$card.acceptance.test.ts"
  if [ "$DRY" = 1 ]; then W="<tmpdir>/aak-bench.XXXXXX"; printf '\n## %s %s run %s\n' "$mode" "$card" "$n"
  else W="$(mktemp -d "${TMPDIR:-/tmp}/aak-bench.XXXXXX")" || die "mktemp lỗi"; CUR_W="$W"; mkdir -p "$RAW"; LOG="$RAW/setup.log"; fi

  # 1. fresh temp git repo from demo-app (no node_modules, no .answers, no BACKLOG: the card is in the prompt)
  local tarx="--exclude=node_modules --exclude=.answers --exclude=BACKLOG.md"
  if [ "$DRY" = 1 ]; then printf '+ (cd %q && tar %s -cf - .) | (cd %q && tar -xf -)\n' "$APP" "$tarx" "$W"
  else (cd "$APP" && tar $tarx -cf - .) | (cd "$W" && tar -xf -) || die "Chép demo-app lỗi"; fi
  step git -C "$W" init -q || die "git init lỗi"
  step git -C "$W" config user.name bench; step git -C "$W" config user.email bench@example.invalid
  step_cd "$W" npm ci --silent --no-audit --no-fund || die "npm ci lỗi (xem $LOG)"
  step git -C "$W" add -A; step git -C "$W" commit -q -m "demo-app baseline" || die "git commit lỗi"
  if [ "$mode" = superadvisor ]; then
    step "$SA" init "$W" || die "superadvisor init lỗi (xem $LOG)"
    step git -C "$W" add -A; step git -C "$W" commit -q -m "superadvisor init" || die "git commit lỗi"
  fi

  # 2. one headless session
  local args; args=(-p "$prompt" --output-format json --model "$model" --permission-mode acceptEdits)
  [ -z "$SOURCES" ] || args+=(--setting-sources "$SOURCES")
  [ "$mode" != superadvisor ] || args+=(--plugin-dir "$PLUGIN")
  args+=(--allowedTools "$tools")
  if [ "$DRY" = 1 ]; then
    printf 'PROMPT=<<EOF\n%s\nEOF\n' "$prompt"
    printf '+ (cd %q && env -u CLAUDE_PROJECT_DIR -u CLAUDECODE perl -e %q %s %q' "$W" 'alarm shift; exec @ARGV' "$TIMEOUT" "$CLAUDE_BIN"
    local a; for a in "${args[@]}"; do if [ "$a" = "$prompt" ]; then printf ' "$PROMPT"'; else printf ' %q' "$a"; fi; done; printf ')\n'
  else
    t0=$(date +%s)
    (cd "$W" && env -u CLAUDE_PROJECT_DIR -u CLAUDECODE perl -e 'alarm shift; exec @ARGV' "$TIMEOUT" "$CLAUDE_BIN" "${args[@]}") \
      >"$RAW/result.json" 2>"$RAW/claude.err" </dev/null
    rc=$?; wall=$(( $(date +%s) - t0 ))
    step git -C "$W" add -A
    git -C "$W" diff --cached --stat HEAD >"$RAW/changes.stat" 2>/dev/null
    git -C "$W" diff --cached HEAD >"$RAW/changes.patch" 2>/dev/null
  fi

  # 3. hidden acceptance test goes in only now, then the whole tests/ dir runs once
  if [ "$DRY" = 1 ]; then printf '+ cp %q %q\n' "$HERE/acceptance/$card.test.ts" "$W/tests/$accfile"
  else mkdir -p "$W/tests"; cp "$HERE/acceptance/$card.test.ts" "$W/tests/$accfile" || die "Không chép được test chấp nhận $card"; fi
  if [ "$DRY" = 1 ]; then
    printf '+ (cd %q && npx vitest run tests/ --reporter=json)\n' "$W"
    [ "$mode" != superadvisor ] || printf '+ (cd %q && CLAUDE_PROJECT_DIR=%q bash %q)\n' "$W" "$W" "$PLUGIN/scripts/kit-stats.sh"
    return 0
  fi
  (cd "$W" && npx vitest run tests/ --reporter=json) >"$RAW/vitest.out" 2>"$RAW/vitest.err"
  VJ="$(sed -n '/^{/,$p' "$RAW/vitest.out" | jq -c . 2>/dev/null)"
  ACC='{"tests_passed":0,"tests_total":0,"suite_failed":null}'
  if [ -n "$VJ" ]; then
    ACC="$(printf '%s' "$VJ" | jq -c --arg f "$accfile" '
      ([.testResults[]? | select(.name | endswith($f)) | .assertionResults[]?]) as $a
      | ([.testResults[]? | select(.name | endswith($f) | not)]) as $s
      | {tests_passed: ($a | map(select(.status == "passed")) | length), tests_total: ($a | length),
         suite_failed: ([$s[] | (.assertionResults // [])[] | select(.status == "failed")] | length)
                       + ([$s[] | select(.status == "failed" and ((.assertionResults // []) | length) == 0)] | length)}')" \
      || ACC='{"tests_passed":0,"tests_total":0,"suite_failed":null}'
  fi

  # 4. superadvisor: main-session + subagent tokens by model (hooks -> kit-stats.sh; cost there is an ESTIMATE)
  KIT=null
  if [ "$mode" = superadvisor ]; then
    (cd "$W" && CLAUDE_PROJECT_DIR="$W" bash "$PLUGIN/scripts/kit-stats.sh") >"$RAW/kit-stats.md" 2>"$RAW/kit-stats.err"
    cp "$W/.claude/metrics/events.jsonl" "$RAW/events.jsonl" 2>/dev/null
    KIT="$(jq -c '{models: [.models[]? | {model, records, main_records, tok_in, tok_out, cache_read, cache_write, est_cost_usd}],
                   agents: [.agents[]? | {agent, model, runs}]}' "$W/.claude/metrics/scorecard.json" 2>/dev/null)" || KIT=null
    [ -n "$KIT" ] || KIT=null
  fi

  # 5. one JSON line
  RES="$(jq -c 'if type == "array" then (map(select(.type == "result")) | last) else . end' "$RAW/result.json" 2>/dev/null)"
  { [ -n "$RES" ] && [ "$RES" != null ]; } || RES='{}'
  status=ok
  if [ "$rc" = 142 ] || [ "$rc" = 124 ]; then status=timeout
  elif [ "$rc" != 0 ] || [ "$(printf '%s' "$RES" | jq -r '.is_error // false')" = true ] || [ "$RES" = '{}' ]; then status=error; fi
  LINE="$(jq -cn --arg mode "$mode" --arg card "$card" --argjson run "$n" --arg status "$status" --arg model "$model" \
    --argjson rc "$rc" --argjson wall "$wall" --argjson res "$RES" --argjson acc "$ACC" --argjson kit "$KIT" '
    ($res.modelUsage // {}) as $mu
    | ($mu | with_entries(.value |= {in: (.inputTokens // 0), out: (.outputTokens // 0), cache_read: (.cacheReadInputTokens // 0),
                                     cache_write: (.cacheCreationInputTokens // 0), cost_usd: (.costUSD // null)})) as $tbm
    | ($res.usage // {}) as $u
    | def tot(f; k): if ($tbm | length) > 0 then ([$tbm[] | f] | add) else $u[k] end;
    {mode: $mode, card: $card, run: $run, status: $status, model: $model, exit_code: $rc,
     pass: (($acc.tests_total > 0) and ($acc.tests_passed == $acc.tests_total) and ($acc.suite_failed == 0)),
     tests_passed: $acc.tests_passed, tests_total: $acc.tests_total, suite_failed: $acc.suite_failed,
     cost_usd: ($res.total_cost_usd // null),
     tokens_in: tot(.in; "input_tokens"), tokens_out: tot(.out; "output_tokens"),
     cache_read: tot(.cache_read; "cache_read_input_tokens"), cache_write: tot(.cache_write; "cache_creation_input_tokens"),
     turns: ($res.num_turns // null), duration_s: (if $res.duration_ms == null then $wall else $res.duration_ms / 1000 end),
     wall_s: $wall, tokens_by_model: $tbm,
     delegations: (if $kit == null then null else ([$kit.agents[].runs] | add // 0) end),
     kit_est_cost_usd: (if $kit == null then null else ([$kit.models[].est_cost_usd] | add // 0) end),
     kit_stats: $kit}')" || die "Không dựng được dòng kết quả"
  printf '%s\n' "$LINE" >>"$OUT/results.jsonl"
  printf '[%s %s #%s] %s pass=%s tests=%s/%s cost=%s\n' "$mode" "$card" "$n" "$status" \
    "$(printf '%s' "$LINE" | jq -r .pass)" "$(printf '%s' "$LINE" | jq -r .tests_passed)" \
    "$(printf '%s' "$LINE" | jq -r .tests_total)" "$(printf '%s' "$LINE" | jq -r '.cost_usd // "n/a"')"
  cleanup; CUR_W=""
}

i=1
while [ "$i" -le "$RUNS" ]; do
  for c in $CARDS; do run_one "$MODE" "$c" "$i"; done
  i=$((i + 1))
done
[ "$DRY" = 1 ] || printf 'Xong. Kết quả: %s/results.jsonl (tổng hợp: bench/report.sh %s)\n' "$OUT" "$OUT"
