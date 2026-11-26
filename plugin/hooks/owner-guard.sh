#!/bin/bash
# PreToolUse hook (matcher Bash|Edit|Write|MultiEdit): keep a LANE session (env KIT_LANE=1) off owner-only
# actions. A lane is a worker session started by a leader; merging, publishing to a shared branch, releasing
# and changing the kit's own rules are the owner's calls, so a lane reports to the leader instead.
# Denied while KIT_LANE=1 (there is nobody to ask, so always deny):
#   - gh pr merge; gh api calls on a .../merge endpoint; gh auth token;
#   - git push naming a protected branch (main / master / dev, plus KIT_PROTECTED_BRANCHES, which superadvisor
#     sets to the integration branch; incl. HEAD:main, refs/heads/main, +main);
#   - git push that rewrites or widens what is published: --force*, -f, +refspec, --mirror, --all, --delete, -d,
#     --no-verify, and tags (--tags, --follow-tags, refs/tags/..., `tag <name>`);
#   - gh release create / edit / delete / upload;
#   - writing .claude/settings*.json, .claude/hooks/** or brains/lead.md (Edit/Write/MultiEdit/NotebookEdit, or a
#     Bash redirect / tee / mv / cp / sed -i).
# Only real command segments count (text inside quotes is data). Not a lane: pass. No jq: pass. Always exit 0.
# A safety net for honest mistakes, not a security boundary: branch protection on the remote is the real lock.
INPUT=$(cat)
[ "${KIT_LANE:-}" = 1 ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r, additionalContext: $r}}'
  exit 0
}
MSG="lane không làm việc của owner — báo leader (a lane does not do owner-only work: report to the leader)."

PROTECTED=" main master dev $(printf '%s' "${KIT_PROTECTED_BRANCHES:-}" | tr ',' ' ') "
# guarded_path <path>: 0 when a lane must not write it
guarded_path() {
  case "$1" in
    *.claude/settings*.json|*.claude/hooks/*|brains/lead.md|*/brains/lead.md) return 0 ;;
  esac
  return 1
}

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
case "$TOOL" in
  Edit|Write|MultiEdit|NotebookEdit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' 2>/dev/null)
    guarded_path "$FILE" && deny "$MSG Không sửa $FILE."
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
RE_WRITE='(>|tee|mv|cp|sed -i)[^;&|]*(\.claude/settings[A-Za-z.]*\.json|\.claude/hooks/|brains/lead\.md)'
RE_PRE='^[[:space:]]*(env[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
set -f
while IFS= read -r seg; do
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+pr[[:space:]]+merge ]]; then
    deny "$MSG Không chạy gh pr merge."
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+api[[:space:]].*/merge([[:space:]?]|$) ]]; then
    deny "$MSG Không merge qua gh api."
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+auth[[:space:]]+token ]]; then
    deny "$MSG Không in token GitHub."
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+release[[:space:]]+(create|edit|delete|upload) ]]; then
    deny "$MSG Không tạo hay sửa GitHub release."
  fi
  if [[ "$seg" =~ ${RE_PRE}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+push([[:space:]]|$) ]]; then
    read -ra tk <<< "$seg"
    seen=0
    for t in "${tk[@]}"; do
      if [ "$seen" = 0 ]; then [ "$t" = push ] && seen=1; continue; fi   # only words after "push" count
      case "$t" in
        --force*|-f|-[a-zA-Z]*f*|--mirror|--all|--delete|-d|--no-verify|--tags|--follow-tags)
          deny "$MSG Không git push $t (merge nhánh tích hợp vào lane rồi push thường thay cho rebase + force)." ;;
        -*) continue ;;
        tag) deny "$MSG Không push tag." ;;
        +*) deny "$MSG Không force push ($t)." ;;
      esac
      case "$t" in *refs/tags/*) deny "$MSG Không push tag." ;; esac
      b="${t##*:}"; b="${b#refs/heads/}"
      case "$PROTECTED" in *" $b "*) deny "$MSG Không git push lên $b." ;; esac
    done
  fi
  if [[ "$seg" =~ $RE_WRITE ]]; then deny "$MSG Không sửa settings, hook hay brains/lead.md."; fi
done < <(printf '%s\n' "$CMD" | tr ';&|' '\n\n\n')
exit 0
