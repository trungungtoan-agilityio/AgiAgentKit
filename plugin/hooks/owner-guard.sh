#!/bin/bash
# PreToolUse hook (matcher Bash|Edit|Write|MultiEdit|NotebookEdit): keep a LANE session (env KIT_LANE=1) off owner-only
# actions. A lane is a worker session started by a leader; merging, publishing to a shared branch, releasing
# and changing the kit's own rules are the owner's calls, so a lane reports to the leader instead.
# Denied while KIT_LANE=1 (there is nobody to ask, so always deny):
#   - gh pr merge; gh api writes (-X POST/PUT/PATCH/DELETE, -f/-F/--field/--raw-field/--input, graphql) — a
#     plain GET, such as reading pulls/<n>/merge, passes;
#   - printing credentials: gh auth token, gh auth status -t, git credential;
#   - git push naming a protected branch (main / master / dev, plus KIT_PROTECTED_BRANCHES, which superadvisor
#     sets to the integration branch; incl. HEAD:main, refs/heads/main, +main);
#   - git push that rewrites or widens what is published: --force* (and unambiguous prefixes), a short flag cluster
#     with f or d, +refspec, :branch, wildcard refspecs, --mirror, --all, --delete, --prune, --no-verify, and tags
#     (--tags, --follow-tags, refs/tags/..., `tag <name>`, or a name that is a local tag);
#   - gh release create / edit / delete / upload;
#   - writing .claude/settings*.json, .claude/hooks/**, brains/lead.md, brains/config.json or .mcp.json
#     (Edit/Write/MultiEdit/NotebookEdit, or a Bash redirect / tee / mv / cp / ln / rm / install / sed -i / perl -i).
#     Paths and commands are matched case-insensitively.
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
# guarded_path <path>: 0 when a lane must not write it. Compared after lower-casing (macOS file systems ignore
# case) and collapsing "//" and "/./".
guarded_path() {
  local f
  f=$(printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -e 's#//*#/#g' -e 's#/\./#/#g' -e 's#^\./##')
  case "$f" in
    template/brains/*|*/template/brains/*) return 1 ;;   # the kit's own template, not a live project file
    *.claude/settings*.json|*.claude/hooks/*|brains/lead.md|*/brains/lead.md|brains/config.json|*/brains/config.json|.mcp.json|*/.mcp.json) return 0 ;;
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
# Heredoc: the lines after the first one holding "<<" are its body (data); "<<<" stays on its line.
case "$CMD" in *'<<'*) CMD=$(printf '%s\n' "$CMD" | awk '{print} /<</{exit}') ;; esac
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)
RE_WRITE='((^|[[:space:]])(tee|mv|cp|ln|rm|install|sed[[:space:]]+-i[^[:space:]]*|perl[[:space:]]+-[a-z]*i[a-z]*)[[:space:]]|(^|[^-])>)[^;&|]*(\.claude/+settings[a-z.]*\.json|\.claude/+hooks/|brains/+lead\.md|brains/+config\.json|\.mcp\.json)'
RE_PRE='^[[:space:]({]*((env|command|exec|nohup|time|sudo)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*)*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*([^[:space:]]*/)?'
RE_GITOPT='([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|--[a-z-]+(=[^[:space:]]*)?))*'
PUSH_LONG=" --force --force-with-lease --force-if-includes --mirror --all --delete --no-verify --tags --follow-tags --prune "
set -f
shopt -s nocasematch
while IFS= read -r seg; do
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+pr[[:space:]]+merge ]]; then
    deny "$MSG Không chạy gh pr merge."
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+api[[:space:]] ]]; then
    # A lane only reads through gh api: any write method, field or GraphQL call is the owner's.
    if [[ "$seg" =~ [[:space:]](-X|--method)[[:space:]=]*[\"\']?(post|put|patch|delete) ]] \
      || [[ "$seg" =~ [[:space:]](-[fF]|--field|--raw-field|--input)([[:space:]=]|$) ]] \
      || [[ "$seg" =~ [[:space:]][\"\']?graphql([\"\'[:space:]]|$) ]]; then
      deny "$MSG gh api trong lane chỉ được đọc (no writes, merges or GraphQL through gh api)."
    fi
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+auth[[:space:]]+(token|status.*[[:space:]](-t|--show-token)) ]] \
    || [[ "$seg" =~ ${RE_PRE}git${RE_GITOPT}[[:space:]]+credential ]]; then
    deny "$MSG Không in token hay credential."
  fi
  if [[ "$seg" =~ ${RE_PRE}gh[[:space:]]+release[[:space:]]+(create|edit|delete|upload) ]]; then
    deny "$MSG Không tạo hay sửa GitHub release."
  fi
  if [[ "$seg" =~ ${RE_PRE}git${RE_GITOPT}[[:space:]]+push([[:space:]]|$) ]]; then
    read -ra tk <<< "$seg"
    seen=0
    for t in "${tk[@]}"; do
      if [ "$seen" = 0 ]; then [ "$t" = push ] && seen=1; continue; fi   # only words after "push" count
      t="${t#[\"\'(]}"; t="${t%%[\"\');\}]*}"; t="${t%[\"\']}"
      case "$t" in
        --) continue ;;
        --*)   # git accepts any unambiguous prefix of a long option (--mirr, --del)
          o="${t%%=*}"
          case "$PUSH_LONG" in *" $o"*) [ "${#o}" -ge 4 ] && deny "$MSG Không git push $t (merge nhánh tích hợp vào lane rồi push thường thay cho rebase + force)." ;; esac
          continue ;;
        -*[fd]*) deny "$MSG Không git push $t (force hay xoá nhánh: merge nhánh tích hợp vào lane rồi push thường)." ;;
        -*) continue ;;
        tag) deny "$MSG Không push tag." ;;
        +*) deny "$MSG Không force push ($t)." ;;
        :*|*'*'*) deny "$MSG Không xoá nhánh hay push theo wildcard ($t)." ;;
      esac
      case "$t" in *refs/tags/*) deny "$MSG Không push tag." ;; esac
      src="${t%%:*}"
      if [ -n "$CWD" ] && [ -n "$src" ] && git -C "$CWD" show-ref --verify --quiet "refs/tags/$src" 2>/dev/null; then
        deny "$MSG Không push tag ($src)."
      fi
      b="${t##*:}"; b="${b#refs/heads/}"; b="${b#heads/}"
      [ -n "$b" ] && case "$PROTECTED" in *" $b "*) deny "$MSG Không git push lên $b." ;; esac
    done
  fi
  wseg="${seg//template\/brains\//template/_/}"   # the kit's own template/brains/ is not a live project file
  if [[ "$wseg" =~ $RE_WRITE ]]; then deny "$MSG Không sửa settings, hook, brains/lead.md, brains/config.json hay .mcp.json."; fi
done < <(printf '%s\n' "$CMD" | tr ';&|' '\n\n\n')
exit 0
