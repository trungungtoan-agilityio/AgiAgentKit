#!/bin/bash
# PreToolUse hook (matcher Agent|Task): keep delegation on the kit roster.
# Denies (the reason goes back to the agent so it can re-route itself):
#   - a `model` parameter (it overrides the agent's pinned model tier);
#   - general-purpose / no subagent_type (runs at the main-session model with no turn cap).
# Everything else (roster agents with or without the plugin prefix, Explore, Plan...) passes.
# Denied in auto mode, asked otherwise (see kit_decide). No jq: allow (a cost guard, not security).
INPUT=$(cat)
command -v jq >/dev/null 2>&1 || exit 0
. "$(dirname "$0")/../scripts/kit-hook-lib.sh"
TYPE=$(printf '%s' "$INPUT" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)
MODEL=$(printf '%s' "$INPUT" | jq -r '.tool_input.model // ""' 2>/dev/null)

ROSTER="tìm file/symbol → scout · code đã rõ cách làm → builder · viết/sửa test → tester · nguyên nhân chưa rõ → debugger · review một lượt → reviewer"

if [ -n "$MODEL" ]; then
  kit_decide "Lời gọi Agent truyền model, ghi đè tier đã ghim (the call passes a model)." \
    "Không truyền model cho Agent tool: mỗi agent đã ghim model trong frontmatter. Gọi lại không có model, hoặc chọn agent khác: $ROSTER"
  exit 0
fi
case "$TYPE" in
  ""|general-purpose|claude)
    kit_decide "general-purpose (hoặc thiếu subagent_type) chạy ở model của session chính, không có trần lượt (no tier, no turn cap)." \
      "Đừng dùng general-purpose: chọn agent theo việc — $ROSTER" ;;
esac
exit 0
