# agi-agent-kit (plugin)

A minimal Claude Code plugin for running a leader session that coordinates several lane sessions cheaply.

## What it contains

- `agents/`: five subagents split by model tier. `scout` (haiku, read-only lookups), `builder` and `tester`
  (sonnet, writing code and tests), `debugger` and `reviewer` (opus, hard bugs and one review pass).
- `hooks/`: `turn-guard` (caps builder/tester tool calls), `test-budget` (denies whole-suite test runs),
  `agent-routing` (keeps delegation on the roster and the pinned model tiers), `owner-guard` (keeps lane sessions
  off merging, pushing to shared branches and editing permission settings), and two metrics hooks that append
  token usage of subagents and the main session to `.claude/metrics/events.jsonl`.
- `scripts/`: `kit-stats.sh` (scorecard by model, agent and main session) and `token-watch.sh` (one-line check).
- `skills/lead/`: the leader loop, used together with the `superadvisor` CLI from the parent repository.

Requires `jq` for the hooks and scripts; without it the guard hooks let every call through.

## Install

From the repository root, add the marketplace and install:

```bash
claude plugin marketplace add /path/to/AgiAgentKit
```

```bash
claude plugin install agi-agent-kit@agi-agent-kit
```

Or load it for a single session without installing:

```bash
claude --plugin-dir ./plugin
```

Full setup: [`docs/INSTALL.md`](../docs/INSTALL.md). Thresholds and environment variables: [`docs/reference.md`](../docs/reference.md).
