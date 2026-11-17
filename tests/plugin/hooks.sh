#!/usr/bin/env bash
# Test the guard hooks (turn-guard, agent-routing, test-budget, owner-guard) with fake stdin JSON.
# Run: bash tests/plugin/hooks.sh   (exit 0 when every case passes)
set -uo pipefail
H="$(cd "$(dirname "$0")/../.." && pwd)"
P="$H/plugin/hooks"
command -v jq >/dev/null 2>&1 || { echo "SKIP: jq not installed"; exit 0; }
T="$(mktemp -d "${TMPDIR:-/tmp}/sa-hooks.XXXXXX")"; trap 'rm -rf "$T"' EXIT
unset TURN_GUARD_OFF TURN_GUARD_WARN TURN_GUARD_WARN2 TURN_GUARD_DENY KIT_LANE FULL_SUITE_OK
pass=0; failn=0

# kind <hook output>: none | warn | ask | deny
kind() {
  [ -z "$1" ] && { echo none; return; }
  local d; d="$(printf '%s' "$1" | jq -r '.hookSpecificOutput.permissionDecision // empty')"
  [ -n "$d" ] && { echo "$d"; return; }
  printf '%s' "$1" | jq -e '.hookSpecificOutput.additionalContext' >/dev/null 2>&1 && { echo warn; return; }
  echo other
}
chk() { # chk <name> <want> <hook output>
  local got; got="$(kind "$3")"
  if [ "$got" = "$2" ]; then pass=$((pass+1)); else failn=$((failn+1)); echo "FAIL (want $2, got $got): $1"; fi
}
has() { # has <name> <hook output> <jq filter that must be true>
  if printf '%s' "$2" | jq -e "$3" >/dev/null 2>&1; then pass=$((pass+1)); else failn=$((failn+1)); echo "FAIL: $1"; fi
}

bash_in() { jq -cn --arg c "$1" --arg m "${2:-auto}" '{hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:$c},permission_mode:$m}'; }
edit_in() { jq -cn --arg t "$1" --arg f "$2" '{hook_event_name:"PreToolUse",tool_name:$t,tool_input:{file_path:$f}}'; }
agent_in() { # agent_in <subagent_type> [model]
  jq -cn --arg t "$1" --arg m "${2:-}" '{hook_event_name:"PreToolUse",tool_name:"Agent",permission_mode:"auto",
    tool_input:({subagent_type:$t} + (if $m == "" then {} else {model:$m} end))}'
}

# --- turn-guard: thresholds via TGENV (empty = the defaults 60 / 90 / 130) ---
TGENV="TURN_GUARD_WARN=2 TURN_GUARD_WARN2=4 TURN_GUARD_DENY=6"
turns() { # turns <session> <agent_type> <tool> <n> [mode]: run the hook n times as one subagent, print the last output
  local out="" i
  for ((i = 0; i < $4; i++)); do
    out="$(jq -cn --arg s "$1" --arg t "$2" --arg tool "$3" --arg m "${5:-auto}" \
      '{hook_event_name:"PreToolUse",session_id:$s,agent_id:"a1",agent_type:$t,tool_name:$tool,tool_input:{},permission_mode:$m}' \
      | env $TGENV TMPDIR="$T" bash "$P/turn-guard.sh")"
  done
  printf '%s' "$out"
}
chk "call 1 is silent" none "$(turns t1 builder Read 1)"
chk "call 2 warns (WARN)" warn "$(turns t2 builder Read 2)"
chk "call 3 is silent" none "$(turns t3 builder Read 3)"
chk "call 4 warns (WARN2)" warn "$(turns t4 builder Read 4)"
chk "call 5 Bash still allowed" none "$(turns t5 builder Bash 5)"
out="$(turns t6 builder Bash 6)"
chk "call 6 Bash denied in auto mode" deny "$out"
has "deny carries a stop-and-summarize guidance" "$out" '.hookSpecificOutput | (.permissionDecisionReason | length > 0) and (.additionalContext | test("tóm tắt"))'
chk "call 6 Bash asks in default mode" ask "$(turns t6b builder Bash 6 default)"
chk "call 6 Edit denied" deny "$(turns t7 builder Edit 6)"
chk "call 6 Write denied" deny "$(turns t7b builder Write 6)"
chk "call 6 Read still passes" none "$(turns t8 builder Read 6)"
chk "tester is counted" deny "$(turns t9 tester Bash 6)"
chk "plugin-prefixed builder is counted" deny "$(turns t10 agi-agent-kit:builder Bash 6)"
chk "scout is not counted" none "$(turns t11 scout Bash 10)"
chk "reviewer is not counted" none "$(turns t12 reviewer Bash 10)"
chk "main session (no agent_id) is not counted" none "$(jq -cn '{hook_event_name:"PreToolUse",session_id:"m",tool_name:"Bash"}' | TURN_GUARD_DENY=1 TMPDIR="$T" bash "$P/turn-guard.sh")"
chk "TURN_GUARD_OFF=1 disables the guard" none "$(TGENV="$TGENV TURN_GUARD_OFF=1"; turns t13 builder Bash 6)"
out="$(echo '{bad json' | TMPDIR="$T" bash "$P/turn-guard.sh")"; rc=$?
[ "$rc" -eq 0 ] && [ -z "$out" ] && pass=$((pass+1)) || { failn=$((failn+1)); echo "FAIL: broken JSON must exit 0 silently"; }
TGENV=""
chk "default: call 59 is silent" none "$(turns d1 builder Read 59)"
chk "default: call 60 warns" warn "$(turns d2 builder Read 60)"

# --- agent-routing ---
AR() { bash "$P/agent-routing.sh"; }
out="$(agent_in builder opus | AR)"
chk "model parameter denied" deny "$out"
has "message lists the roster" "$out" '.hookSpecificOutput.additionalContext | test("builder") and test("debugger")'
chk "model parameter asks outside auto mode" ask "$(agent_in builder opus | jq -c '.permission_mode = "default"' | AR)"
chk "general-purpose denied" deny "$(agent_in general-purpose | AR)"
chk "missing subagent_type denied" deny "$(agent_in "" | AR)"
for a in builder agi-agent-kit:reviewer scout Explore Plan; do chk "$a passes" none "$(agent_in "$a" | AR)"; done

# --- test-budget ---
tb() { chk "test-budget: $2" "$1" "$(bash_in "$2" | bash "$P/test-budget.sh")"; }
for c in 'npm test' 'npm run test' 'npx vitest run' 'npx vitest' 'vitest' 'pytest' 'python -m pytest -q' 'go test ./...' \
  'cd app && npm test 2>&1 | tail -20' 'CI=1 pnpm test'; do tb deny "$c"; done
for c in 'npm test -- src/a.test.ts' 'npx vitest run src/a.test.ts' 'npx vitest run -t login' 'pytest tests/test_a.py' 'pytest -k login' \
  'go test ./pkg/...' 'go test ./... -run TestA' 'FULL_SUITE_OK=1 npm test' 'npm run build' 'git commit -m "npm test; fix"' 'ls'; do tb none "$c"; done
chk "test-budget: asks outside auto mode" ask "$(bash_in 'npm test' default | bash "$P/test-budget.sh")"

# --- owner-guard: a lane (KIT_LANE=1) stays off owner-only actions ---
for c in 'gh pr merge 12 --squash' 'git push origin main' 'git push origin HEAD:dev' 'git -C sub push origin master' 'git push -f origin +main' \
  'echo {} > .claude/settings.json' 'cd x && gh pr merge 3'; do
  out="$(bash_in "$c" | KIT_LANE=1 bash "$P/owner-guard.sh")"; chk "owner-guard: $c" deny "$out"
done
has "message tells the lane to report to the leader" "$out" '.hookSpecificOutput.permissionDecisionReason | test("báo leader")'
for c in 'git push origin feature/dev' 'git push -u origin lane/card-1' 'gh pr create --fill' 'git commit -m "gh pr merge later"' 'cat .claude/settings.json'; do
  chk "owner-guard: $c" none "$(bash_in "$c" | KIT_LANE=1 bash "$P/owner-guard.sh")"
done
chk "owner-guard: Edit settings.json" deny "$(edit_in Edit /proj/.claude/settings.json | KIT_LANE=1 bash "$P/owner-guard.sh")"
chk "owner-guard: Write settings.local.json" deny "$(edit_in Write .claude/settings.local.json | KIT_LANE=1 bash "$P/owner-guard.sh")"
chk "owner-guard: Edit a source file" none "$(edit_in Edit src/a.ts | KIT_LANE=1 bash "$P/owner-guard.sh")"
chk "owner-guard: not a lane, merge allowed" none "$(bash_in 'gh pr merge 12' | bash "$P/owner-guard.sh")"
chk "owner-guard: not a lane, push main allowed" none "$(bash_in 'git push origin main' | bash "$P/owner-guard.sh")"

echo "hooks: $pass passed, $failn failed"
[ "$failn" -eq 0 ]
