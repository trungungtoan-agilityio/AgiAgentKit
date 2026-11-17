#!/bin/bash
# Shared helpers for the metrics hooks and scripts. Source this; do not run directly.
# All metrics live under <main checkout>/.claude/metrics/ and are git-ignored runtime data.

# The repo's MAIN checkout, even when called from a linked worktree: a worktree is removed
# after its branch merges, and data kept inside it would go with it. Outside git (or in a
# submodule / bare layout) this is the project dir itself.
kit_main_root() {
  local root="${CLAUDE_PROJECT_DIR:-$(pwd)}" common
  common=$(git -C "$root" rev-parse --git-common-dir 2>/dev/null) || { echo "$root"; return; }
  case "$common" in /*) ;; *) common="$root/$common" ;; esac
  if [ "$(basename "$common")" = ".git" ] && [ -d "$common" ]; then
    (cd "$(dirname "$common")" && pwd -P)
  else
    echo "$root"
  fi
}

kit_metrics_dir() { echo "$(kit_main_root)/.claude/metrics"; }

# Create the metrics dir with a "*" .gitignore inside: a plugin install writes into projects whose
# .gitignore never heard of it, and a "stage everything" commit would sweep the log into the repo.
kit_ensure_dir() {
  mkdir -p "$1" 2>/dev/null || return 1
  [ -f "$1/.gitignore" ] || printf '*\n' > "$1/.gitignore" 2>/dev/null
  return 0
}

kit_events_file() { echo "$(kit_metrics_dir)/events.jsonl"; }

# The model: line of an agent file, read from its frontmatter block only.
kit_agent_model() {
  [ -f "$1" ] || { echo ""; return; }
  sed -n -e '1{/^---[[:space:]]*$/!q;}' -e '1,/^---$/{s/^model:[[:space:]]*//p;}' "$1" \
    | head -1 | tr -d '\r'
}
