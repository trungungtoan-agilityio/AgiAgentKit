#!/bin/bash
# Shared helper for the guard hooks. Source this; do not run directly.

# kit_decide <reason for the human> <guidance for the model>: print a PreToolUse decision.
# Needs $INPUT (the hook's stdin JSON). In auto / bypassPermissions / dontAsk mode nobody is
# prompted, so the call is denied and the guidance tells the agent how to carry on by itself;
# in every other mode the owner is asked.
kit_decide() {
  local mode d
  mode=$(printf '%s' "$INPUT" | jq -r '.permission_mode // empty' 2>/dev/null)
  case "$mode" in auto|bypassPermissions|dontAsk) d=deny ;; *) d=ask ;; esac
  jq -n --arg d "$d" --arg r "$1" --arg c "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r, additionalContext: $c}}'
}
