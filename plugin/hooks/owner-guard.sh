#!/bin/bash
# PreToolUse hook (matcher Bash|Edit|Write|MultiEdit): keep a LANE session (env KIT_LANE=1) off owner-only
# actions. A lane is a worker session started by a leader; merging, publishing to a shared branch and
# changing the permission settings are the owner's calls, so a lane report to the leader instead.
# Denied while KIT_LANE=1 (there is nobody to ask, so always deny):
#   - gh pr merge;  git push naming main / master / dev (incl. HEAD:main, refs/heads/main, +main);
#   - writing .claude/settings*.json (Edit/Write/MultiEdit, or a Bash redirect / tee / mv / sed -i).
# Only real command segments count (text inside quotes is data). Not a lane: pass. No jq: pass. Always exit 0.
INPUT=$(cat)
[ "${KIT_LANE:-}" = 1 ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r, additionalContext: $r}}'
  exit 0
}
MSG="lane không làm việc của owner — báo leader (a lane does not do owner-only work: report to the leader)."

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
case "$TOOL" in
  Edit|Write|MultiEdit|NotebookEdit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    case "$FILE" in *.claude/settings*.json) deny "$MSG Không sửa $FILE." ;; esac
    exit 0 ;;
  Bash) ;;
  *) exit 0 ;;
esac

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$CMD" ] && exit 0
[ "${#CMD}" -gt 20000 ] && exit 0
# Mask separators inside quoted strings so they do not split a command.
if command -v perl >/dev/null 2>&1; then
  CMD=$(printf '%s' "$CMD" | perl -0777 -pe 's/"([^"]*)"|\x27([^\x27]*)\x27/my $q = defined $1 ? "\"" : "\x27"; my $x = defined $1 ? $1 : $2; $x =~ s{[;|&\n<]}{_}g; $q.$x.$q/ge')
fi
case "$CMD" in *'<<'*) CMD="${CMD%%<<*}" ;; esac
RE_SETTINGS='(>|tee|mv|sed -i)[^;&|]*\.claude/settings[A-Za-z.]*\.json'
set -f
while IFS= read -r seg; do
  if [[ "$seg" =~ ^[[:space:]]*(env[[:space:]]+)?gh[[:space:]]+pr[[:space:]]+merge ]]; then
    deny "$MSG Không chạy gh pr merge."
  fi
  if [[ "$seg" =~ ^[[:space:]]*(env[[:space:]]+)?git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$) ]]; then
    read -ra tk <<< "$seg"
    seen=0
    for t in "${tk[@]}"; do
      if [ "$t" = push ]; then seen=1; continue; fi
      [ "$seen" = 1 ] || continue   # only words after "push" name a branch
      b="${t##*:}"; b="${b#+}"; b="${b#refs/heads/}"
      case "$b" in main|master|dev) deny "$MSG Không git push lên $b." ;; esac
    done
  fi
  if [[ "$seg" =~ $RE_SETTINGS ]]; then deny "$MSG Không sửa .claude/settings*.json."; fi
done < <(printf '%s\n' "$CMD" | tr ';&|' '\n\n\n')
exit 0
