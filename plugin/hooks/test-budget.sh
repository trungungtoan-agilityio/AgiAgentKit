#!/bin/bash
# PreToolUse hook (matcher Bash): deny commands that run the WHOLE test suite (that is CI's job);
# the local gate is the tests the change touches. Denied commands (no selector given):
#   npm|pnpm|yarn test / run test*, vitest / npx vitest [run], pytest / python -m pytest, go test ./...
# A file, directory, name filter (-t, -k, -m), --changed, --lf or -run counts as a selector.
# Passes when the command contains FULL_SUITE_OK=1 (only when the user asked for the full suite).
# Only real command segments count (split on && || ; |); text inside quotes and heredocs is data.
# Pragmatic: may miss (false negative), never blocks a selective run. No jq: allow. Always exit 0.
INPUT=$(cat)
command -v jq >/dev/null 2>&1 || exit 0
. "$(dirname "$0")/../scripts/kit-hook-lib.sh"
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$CMD" ] && exit 0
[ "${#CMD}" -gt 20000 ] && exit 0
case "$CMD" in *FULL_SUITE_OK=1*) exit 0 ;; esac

# selective <args>: 0 when the args name a file, directory or filter (a selective run)
selective() {
  local t
  for t in "$@"; do
    case "$t" in
      run|watch|dev|related) ;;
      -t|-k|-m|--lf|--last-failed|--changed|--changed=*|--testNamePattern|--testNamePattern=*) return 0 ;;
      -*) ;;
      *) return 0 ;;
    esac
  done
  return 1
}

# runs_all <command tokens>: 0 when the command runs a whole test suite
runs_all() {
  while [ $# -gt 0 ]; do   # drop env assignments and wrappers
    case "$1" in [A-Za-z_]*=*|npx|pnpx|bunx|env|time|nohup|exec|command|-y|--yes) shift ;; *) break ;; esac
  done
  [ $# -gt 0 ] || return 1
  local c="${1##*/}"; shift
  case "$c" in
    vitest|pytest|py.test) selective "$@" && return 1; return 0 ;;
    python|python3) [ "${1:-}" = -m ] && [ "${2:-}" = pytest ] || return 1; shift 2; selective "$@" && return 1; return 0 ;;
    go)
      [ "${1:-}" = test ] || return 1
      case " $* " in *" -run "*|*" -run="*) return 1 ;; *" ./... "*) return 0 ;; esac
      return 1 ;;
    npm|pnpm|yarn)
      case "${1:-}" in
        test|t) shift ;;
        run|run-script) case "${2:-}" in test|test:*) shift 2 ;; *) return 1 ;; esac ;;
        exec|x) shift; runs_all "$@"; return ;;
        vitest|pytest) runs_all "$@"; return ;;
        *) return 1 ;;
      esac
      selective "$@" && return 1; return 0 ;;
  esac
  return 1
}

# Mask separators (; | & newline) inside quoted strings so they do not split a command.
if command -v perl >/dev/null 2>&1; then
  CMD=$(printf '%s' "$CMD" | perl -0777 -pe 's/"([^"]*)"|\x27([^\x27]*)\x27/my $q = defined $1 ? "\"" : "\x27"; my $x = defined $1 ? $1 : $2; $x =~ s{[;|&\n<]}{_}g; $q.$x.$q/ge')
fi
case "$CMD" in *'<<'*) CMD="${CMD%%<<*}" ;; esac   # heredoc: only the part before << is a command
set -f
while IFS= read -r seg; do
  read -ra raw <<< "$seg"
  tk=(); skip=0
  for t in "${raw[@]}"; do
    [ "$skip" = 1 ] && { skip=0; continue; }
    case "$t" in
      [0-9\&]*[\<\>]|[\<\>]) skip=1; continue ;;   # redirect operator, target is the next token
      [0-9\&]*[\<\>]*|[\<\>]*) continue ;;          # redirect with attached target
    esac
    t="${t#[\"\']}"; t="${t%[\"\']}"
    tk+=("$t")
  done
  [ "${#tk[@]}" -gt 0 ] || continue
  if runs_all "${tk[@]}"; then
    kit_decide "Test budget: lệnh này chạy CẢ bộ test (whole suite), đó là việc của CI." \
      "Chạy test liên quan thôi: nêu file/thư mục/mẫu tên (vd \`npx vitest run <file>\`, \`pytest <file>\`, \`go test ./<pkg>\`). Chỉ khi người dùng yêu cầu rõ chạy cả suite mới thêm tiền tố FULL_SUITE_OK=1 (name the test files; the full suite is CI's job)."
    exit 0
  fi
done < <(printf '%s\n' "$CMD" | tr ';&|' '\n\n\n')
exit 0
