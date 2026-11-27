#!/usr/bin/env bash
# Self-contained tests for bin/superadvisor: temp git repo + fake tmux/claude on PATH.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
SA="$REPO/bin/superadvisor"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0

t() { # t <description> <command...>
  local d="$1"; shift
  if "$@" >/dev/null 2>&1; then PASS=$((PASS + 1)); echo "  ok   $d"; else FAIL=$((FAIL + 1)); echo "  FAIL $d"; fi
}
has() { grep -qF -- "$2" "$1"; }          # has <file> <literal>
hasre() { grep -qE -- "$2" "$1"; }        # hasre <file> <regex>
lacks() { ! grep -qF -- "$2" "$1"; }

# ---- fakes -------------------------------------------------------------
mkdir -p "$TMP/bin" "$TMP/fake"
cat > "$TMP/bin/tmux" <<'EOF'
#!/usr/bin/env bash
# Fake tmux: logs every argument, keeps sessions/panes under $FAKE_DIR.
D="${FAKE_DIR:?}"
mkdir -p "$D/pane" "$D/dead"; touch "$D/sessions"
printf 'CALL\n' >> "$D/tmux.log"; printf 'ARG %s\n' "$@" >> "$D/tmux.log"
while [ $# -gt 0 ]; do case "$1" in -u) shift ;; -L) shift 2 ;; *) break ;; esac; done
sub="${1:-}"; shift
target=""; sname=""; prev=""
for a in "$@"; do
  [ "$prev" = -t ] && { target="${a#=}"; target="${target%:}"; }
  [ "$prev" = -s ] && sname="$a"
  prev="$a"
done
case "$sub" in
  new-session) echo "$sname" >> "$D/sessions"; mkdir -p "$D/path"; c=""; prev=""
               for a in "$@"; do [ "$prev" = -c ] && c="$a"; prev="$a"; done; printf '%s' "$c" > "$D/path/$sname" ;;
  display-message) cat "$D/path/$target" 2>/dev/null ;;
  has-session) grep -qx "$target" "$D/sessions" ;;
  list-sessions) cat "$D/sessions" ;;
  list-panes) cat "$D/dead/$target" 2>/dev/null || echo 0 ;;
  capture-pane) cat "$D/pane/$target" 2>/dev/null; true ;;
  kill-session) grep -vx "$target" "$D/sessions" > "$D/sessions.new"; mv "$D/sessions.new" "$D/sessions" ;;
  *) true ;;
esac
EOF
cat > "$TMP/bin/claude" <<'EOF'
#!/usr/bin/env bash
printf 'claude %s\n' "$*" >> "${FAKE_DIR:?}/claude.log"
EOF
chmod +x "$TMP/bin/tmux" "$TMP/bin/claude"
export PATH="$TMP/bin:$PATH" FAKE_DIR="$TMP/fake"
LOG="$FAKE_DIR/tmux.log"

# ---- temp project (name "proj" -> session prefix PROJ) -----------------
P="$TMP/proj"
mkdir -p "$P"
git -C "$P" init -q
git -C "$P" symbolic-ref HEAD refs/heads/main
git -C "$P" -c user.name=tester -c user.email=tester@example.com commit -q --allow-empty -m "init"
export SA_PROJECT="$P"
printf 'Làm thẻ thử nghiệm.\nXong khi test xanh.\n' > "$TMP/brief.md"

echo "== init"
"$SA" init "$P" > "$TMP/init1.out" 2>&1
t "init tạo workflow.md" test -f "$P/.claude/rules/workflow.md"
t "init tạo token-budget.md" test -f "$P/.claude/rules/token-budget.md"
t "init tạo brains/config.json hợp lệ" jq -e '.integration_branch' "$P/brains/config.json"
t "init tạo brains/lead.md" test -f "$P/brains/lead.md"
t "init tạo CLAUDE.md có khối superadvisor" has "$P/CLAUDE.md" "superadvisor:begin"
echo "KEEP-ME" >> "$P/brains/decisions.md"
printf '# CLAUDE cũ\n' > "$TMP/claude-md.bak"; cp "$P/CLAUDE.md" "$TMP/claude-md.before"
"$SA" init "$P" > "$TMP/init2.out" 2>&1
t "init lần 2 không ghi đè file đã có" has "$P/brains/decisions.md" "KEEP-ME"
t "init lần 2 không nối trùng CLAUDE.md" cmp -s "$P/CLAUDE.md" "$TMP/claude-md.before"
t "init lần 2 báo giữ nguyên" has "$TMP/init2.out" "giữ nguyên"
# CLAUDE.md pre-existing without marker -> block appended, content preserved
P2="$TMP/other"; mkdir -p "$P2"; printf '# Có sẵn\n' > "$P2/CLAUDE.md"
"$SA" init "$P2" > /dev/null 2>&1
t "init nối khối vào CLAUDE.md có sẵn" has "$P2/CLAUDE.md" "superadvisor:begin"
t "init giữ nội dung CLAUDE.md cũ" has "$P2/CLAUDE.md" "# Có sẵn"
git -C "$P" add -A >/dev/null 2>&1
git -C "$P" -c user.name=tester -c user.email=tester@example.com commit -q -m "chore: init superadvisor"

echo "== up"
"$SA" up "$P" --dry-run > "$TMP/up-dry.out" 2>&1
t "up --dry-run in --remote-control" has "$TMP/up-dry.out" "--remote-control"
t "up --dry-run có PROJ-LEAD" has "$TMP/up-dry.out" "PROJ-LEAD"
t "up --dry-run có --permission-mode auto" has "$TMP/up-dry.out" "--permission-mode"
t "up --dry-run không chạy new-session" lacks "$LOG" "new-session"
"$SA" up "$P" > "$TMP/up1.out" 2>&1
t "up mở session leader" has "$LOG" "ARG PROJ-LEAD"
"$SA" up "$P" > "$TMP/up2.out" 2>&1
t "up lần 2 báo đã chạy" has "$TMP/up2.out" "đã chạy"

echo "== lane open"
"$SA" lane open fix-login --brief "$TMP/brief.md" --model sonnet > "$TMP/lane.out" 2>&1
t "lane open tạo worktree" test -d "$P/.claude/worktrees/fix-login"
t "lane open tạo nhánh lane/fix-login" test -n "$(git -C "$P" branch --list lane/fix-login)"
t "lane open chép brief" has "$P/brains/.local/briefs/fix-login.md" "Làm thẻ thử nghiệm"
t "lane open env KIT_LANE=1" has "$LOG" "ARG KIT_LANE=1"
t "lane open env compaction 200000" has "$LOG" "ARG CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000"
t "lane open có KIT_LANE_BRIEF" has "$LOG" "ARG KIT_LANE_BRIEF="
t "lane open protects the integration branch" has "$LOG" "ARG KIT_PROTECTED_BRANCHES=main"
t "lane open --remote-control PROJ-FIX-LOGIN" has "$LOG" "ARG PROJ-FIX-LOGIN"
t "lane open có --model sonnet" has "$LOG" "ARG sonnet"
t "lane open đưa brief vào prompt" has "$LOG" "Xong khi test xanh."
t "lane open: -- trước prompt (--add-dir không nuốt prompt)" grep -A1 -qx "ARG --" "$LOG"
"$SA" lane open fix-login --brief "$TMP/brief.md" > "$TMP/lane2.out" 2>&1
t "lane open trùng tên bị từ chối" has "$TMP/lane2.out" "đang chạy"
"$SA" lane open bad_name --brief "$TMP/brief.md" > "$TMP/lane3.out" 2>&1
t "lane open tên sai bị từ chối" has "$TMP/lane3.out" "Tên lane"
"$SA" lane close fix-login > "$TMP/close.out" 2>&1
t "lane close giữ worktree" test -d "$P/.claude/worktrees/fix-login"

echo "== status"
: > "$FAKE_DIR/sessions"
printf '%s\n' PROJ-WAIT PROJ-BUSY PROJ-IDLE PROJ-DEAD >> "$FAKE_DIR/sessions"
printf 'Edit file\n Do you want to proceed?\n ❯ 1. Yes\n   2. No\n' > "$FAKE_DIR/pane/PROJ-WAIT"
printf '✻ Thinking… (12s · esc to interrupt)\n' > "$FAKE_DIR/pane/PROJ-BUSY"
printf '╭──────╮\n│ > │\n╰──────╯\n  ? for shortcuts\n' > "$FAKE_DIR/pane/PROJ-IDLE"
printf 'Pane is dead\n' > "$FAKE_DIR/pane/PROJ-DEAD"; echo 1 > "$FAKE_DIR/dead/PROJ-DEAD"
rm -rf "$P/brains/.local/samples"
SA_NOW=1000000 "$SA" status > "$TMP/status.out" 2>&1
t "status: WAITING" hasre "$TMP/status.out" '^PROJ-WAIT +WAITING'
t "status: BUSY" hasre "$TMP/status.out" '^PROJ-BUSY +BUSY'
t "status: IDLE" hasre "$TMP/status.out" '^PROJ-IDLE +IDLE'
t "status: DEAD" hasre "$TMP/status.out" '^PROJ-DEAD +DEAD'
t "status ghi mẫu" test -f "$P/brains/.local/samples/PROJ-BUSY.txt"

echo "== patrol"
SA_NOW=1000000 "$SA" patrol > "$TMP/patrol0.out" 2>&1
t "patrol: lane vừa đổi chưa bị KẸT" lacks "$TMP/patrol0.out" "KẸT: PROJ-BUSY"
t "patrol: DEAD luôn bị cờ" has "$TMP/patrol0.out" "KẸT: PROJ-DEAD"
SA_NOW=$((1000000 + 1500)) "$SA" patrol > "$TMP/patrol1.out" 2>&1
t "patrol: BUSY không đổi 25 phút bị KẸT" has "$TMP/patrol1.out" "KẸT: PROJ-BUSY"
t "patrol: WAITING quá 5 phút bị KẸT" has "$TMP/patrol1.out" "KẸT: PROJ-WAIT"
t "patrol ghi patrol.log" has "$P/brains/.local/patrol.log" "PROJ-BUSY"

echo "== report"
"$SA" report > "$TMP/report.out" 2>&1
t "report chạy không có metrics" has "$TMP/report.out" "== Báo cáo PROJ"
t "report liệt kê lane" has "$TMP/report.out" "PROJ-BUSY"
t "report có cờ KẸT gần nhất" has "$TMP/report.out" "KẸT: PROJ-BUSY"
t "report có commit hôm nay" has "$TMP/report.out" "init"

echo "== lane close (squash) / patrol --clean"
cat > "$TMP/bin/gh" <<'EOF'
#!/usr/bin/env bash
# Fake gh: merged PR heads come from $FAKE_DIR/gh-merged/<branch with / as _>; open PRs are one fixed line.
head=""; state=""; prev=""
for a in "$@"; do [ "$prev" = --head ] && head="$a"; [ "$prev" = --state ] && state="$a"; prev="$a"; done
if [ "$state" = merged ]; then cat "${FAKE_DIR:?}/gh-merged/${head//\//_}" 2>/dev/null; else echo "#7 feat: open thing"; fi
true
EOF
chmod +x "$TMP/bin/gh"
mkdir -p "$FAKE_DIR/gh-merged"
: > "$FAKE_DIR/sessions"; rm -rf "$P/brains/.local/samples"
for l in done-card fresh-card dirty-card sq-card open-card; do "$SA" lane open "$l" --brief "$TMP/brief.md" >/dev/null 2>&1; done
for l in done-card dirty-card sq-card open-card; do
  W="$P/.claude/worktrees/$l"; echo x > "$W/$l.txt"; git -C "$W" add "$l.txt"
  git -C "$W" -c user.name=tester -c user.email=tester@example.com commit -q -m "feat: $l"
  git -C "$P" rev-parse "lane/$l" > "$FAKE_DIR/gh-merged/lane_$l"   # squash-merged PR, head = branch tip
done
echo wip > "$P/.claude/worktrees/dirty-card/wip.txt"
rm -f "$FAKE_DIR/gh-merged/lane_open-card"   # open-card has commits but no merged PR
"$SA" lane close sq-card --rm-worktree > "$TMP/sq.out" 2>&1
t "lane close --rm-worktree accepts a squash-merged branch" test ! -d "$P/.claude/worktrees/sq-card"
t "lane close deletes the squash-merged branch" test -z "$(git -C "$P" branch --list lane/sq-card)"
for s in PROJ-DONE-CARD PROJ-FRESH-CARD PROJ-DIRTY-CARD PROJ-OPEN-CARD; do printf '│ > │\n  ? for shortcuts\n' > "$FAKE_DIR/pane/$s"; done
SA_NOW=2000000 "$SA" patrol --clean > "$TMP/clean0.out" 2>&1
t "clean: lane idle < idle_close_min is kept" has "$TMP/clean0.out" "Keep PROJ-DONE-CARD: IDLE 0m"
SA_NOW=$((2000000 + 1860)) "$SA" patrol --clean > "$TMP/clean1.out" 2>&1
t "clean: merged idle lane would close" has "$TMP/clean1.out" "Would close PROJ-DONE-CARD"
t "clean: lane without commits is kept" has "$TMP/clean1.out" "Keep PROJ-FRESH-CARD: no commits"
t "clean: dirty worktree is kept" has "$TMP/clean1.out" "Keep PROJ-DIRTY-CARD: worktree dirty"
t "clean: unmerged lane is kept" has "$TMP/clean1.out" "Keep PROJ-OPEN-CARD: lane/open-card not merged"
t "clean without --apply keeps the worktree" test -d "$P/.claude/worktrees/done-card"
SA_NOW=$((2000000 + 1860)) "$SA" patrol --clean --apply > "$TMP/clean2.out" 2>&1
t "clean --apply removes the worktree" test ! -d "$P/.claude/worktrees/done-card"
t "clean --apply kills the session" lacks "$FAKE_DIR/sessions" "PROJ-DONE-CARD"
t "clean --apply keeps other lanes" test -d "$P/.claude/worktrees/dirty-card"
t "clean --apply logs AUTO-CLOSE" has "$P/brains/.local/patrol.log" "AUTO-CLOSE PROJ-DONE-CARD"

echo "== review"
"$SA" review > "$TMP/review.out" 2>&1
t "review writes reviews/<date>.md" test -f "$P/brains/.local/reviews/$(date '+%Y-%m-%d').md"
t "review lists open PRs" has "$TMP/review.out" "#7 feat: open thing"
t "review lists lanes" has "$TMP/review.out" "PROJ-FRESH-CARD"
t "review lists today's stuck flags" has "$TMP/review.out" "KẸT: PROJ-"
t "review lists today's commits" has "$TMP/review.out" "chore: init superadvisor"
GH_BIN=no-such-gh "$SA" review > "$TMP/review2.out" 2>&1
t "review without gh skips PRs" has "$TMP/review2.out" "gh not found"

echo "== cron --install / --uninstall (fakes only)"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "$FAKE_DIR/launchctl.log"\n' > "$TMP/bin/launchctl"
cat > "$TMP/bin/crontab" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = -l ]; then cat "$FAKE_DIR/crontab" 2>/dev/null || { echo "no crontab for tester" >&2; exit 1; }; else cat > "$FAKE_DIR/crontab"; fi
EOF
chmod +x "$TMP/bin/launchctl" "$TMP/bin/crontab"
printf '#!/usr/bin/env bash\necho "crontab: permission denied" >&2; exit 1\n' > "$TMP/bin/badcrontab"; chmod +x "$TMP/bin/badcrontab"
export SA_LAUNCHD_DIR="$TMP/la" SA_LAUNCHD_LOG_DIR="$TMP/logs" SA_LAUNCHCTL_BIN="$TMP/bin/launchctl" SA_CRONTAB_BIN="$TMP/bin/crontab"
SA_CRON_MODE=launchd "$SA" cron --install --dry-run > "$TMP/cd.out" 2>&1
t "launchd --dry-run prints a plist" has "$TMP/cd.out" "<integer>900</integer>"
t "launchd --dry-run writes nothing" test ! -d "$TMP/la"
SA_CRON_MODE=launchd "$SA" cron --install --project "$P" > /dev/null 2>&1
SA_CRON_MODE=launchd "$SA" cron --install --project "$P" > /dev/null 2>&1
t "launchd install is idempotent (3 plists)" test "$(ls "$TMP/la" | wc -l | tr -d ' ')" = 3
t "launchd patrol job runs patrol --clean --apply" has "$TMP/la/com.agiagentkit.superadvisor.proj.patrol.plist" "<string>--apply</string>"
t "launchd review job at 22:00" has "$TMP/la/com.agiagentkit.superadvisor.proj.review.plist" "<integer>22</integer>"
t "launchd bootstrap called" has "$FAKE_DIR/launchctl.log" "bootstrap gui/"
t "launchd log goes to the log dir (not under the project)" has "$TMP/la/com.agiagentkit.superadvisor.proj.patrol.plist" "$TMP/logs/superadvisor-proj-patrol.log"
t "launchd plist sets no WorkingDirectory" lacks "$TMP/la/com.agiagentkit.superadvisor.proj.patrol.plist" "WorkingDirectory"
SA_CRON_MODE=launchd "$SA" cron --uninstall --project "$P" > /dev/null 2>&1
t "launchd uninstall removes plists" test -z "$(ls "$TMP/la")"
printf '0 1 * * * echo keep\n' > "$FAKE_DIR/crontab"; cp "$FAKE_DIR/crontab" "$TMP/ct.before"
SA_CRON_MODE=crontab "$SA" cron --install --dry-run > /dev/null 2>&1
t "crontab --dry-run writes nothing" cmp -s "$FAKE_DIR/crontab" "$TMP/ct.before"
SA_CRON_MODE=crontab "$SA" cron --install > /dev/null 2>&1
SA_CRON_MODE=crontab "$SA" cron --install > /dev/null 2>&1
t "crontab install is idempotent (one block)" test "$(grep -c 'superadvisor:begin PROJ' "$FAKE_DIR/crontab")" = 1
t "crontab keeps other lines" has "$FAKE_DIR/crontab" "echo keep"
t "crontab patrol every 15 min with --clean --apply" hasre "$FAKE_DIR/crontab" '^\*/15 .* patrol --clean --apply'
t "crontab review 22:00" hasre "$FAKE_DIR/crontab" '^0 22 .* review'
t "crontab report 08:00" hasre "$FAKE_DIR/crontab" '^0 8 .* report'
SA_CRON_MODE=crontab "$SA" cron --uninstall > /dev/null 2>&1
t "crontab uninstall restores the original" cmp -s "$FAKE_DIR/crontab" "$TMP/ct.before"
SA_CRONTAB_BIN="$TMP/bin/badcrontab" SA_CRON_MODE=crontab "$SA" cron --install > "$TMP/ctbad.out" 2>&1
t "crontab -l failure aborts the install" has "$TMP/ctbad.out" "crontab -l failed"

echo "== cron / help"
"$SA" cron > "$TMP/cron.out" 2>&1
t "cron in dòng patrol */15" has "$TMP/cron.out" "*/15 * * * *"
t "cron sample matches the installed schedule (report 08:00)" has "$TMP/cron.out" "0 8 * * *"
t "cron sample runs patrol --clean --apply" has "$TMP/cron.out" "patrol --clean --apply"
t "cron sample includes the launchd plists" has "$TMP/cron.out" "<integer>22</integer>"
"$SA" --help > "$TMP/help.out" 2>&1
t "--help liệt kê lane open" has "$TMP/help.out" "lane open"

echo "superadvisor: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
