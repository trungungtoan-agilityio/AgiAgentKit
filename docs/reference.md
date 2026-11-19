# AgiAgentKit reference

## `superadvisor` CLI

| Command | What it does |
|---------|--------------|
| `superadvisor init <project>` | Copies the template (rules, `brains/`, a `CLAUDE.md` block) into the project. Never overwrites. |
| `superadvisor up [<project>] [--dry-run]` | Starts the leader `<PROJECT>-LEAD` in tmux with Remote Control and auto mode. |
| `superadvisor lane open <name> --brief <file> [--model <id>] [--worktree <path>] [--dry-run]` | Opens a lane: worktree, branch `lane/<name>`, a tmux session with `KIT_LANE=1`. |
| `superadvisor lane close <name> [--rm-worktree]` | Stops a lane. Deletes the worktree only if its branch is merged (a squash-merged PR whose head is the branch tip counts). |
| `superadvisor status` | One line per session: BUSY, IDLE, WAITING or DEAD, and minutes without change. |
| `superadvisor patrol [--clean [--apply]]` | `status`, plus a `patrol.log` entry and a stuck flag for lanes over the threshold. `--clean` lists lanes that are IDLE for `idle_close_min`, merged, with a clean worktree and no unpushed commits; `--apply` closes them and removes the worktree. |
| `superadvisor report` | Short daily report: lanes, stuck flags, commits, estimated cost. |
| `superadvisor review` | Read-only nightly review, saved to `brains/.local/reviews/<date>.md`: open PRs (needs `gh`), lanes, today's stuck flags, today's commits on the integration branch, estimated cost. |
| `superadvisor cron [--install\|--uninstall] [--project <p>] [--dry-run]` | No flag: prints samples. `--install`: `patrol --clean --apply` every 15 minutes, `review` at 22:00, `report` at 08:00 (launchd on macOS, a marked crontab block on Linux). Idempotent. Logs go to `brains/.local/`. |

| Variable | Default | Meaning |
|----------|---------|---------|
| `SA_PROJECT` | current folder | Project folder |
| `SA_SOCKET` | `sa` | tmux socket name, so the kit's sessions stay apart from yours |
| `CLAUDE_BIN`, `TMUX_BIN`, `GH_BIN` | `claude`, `tmux`, `gh` | Binaries to use |
| `SA_LAUNCHD_DIR`, `SA_LAUNCHCTL_BIN`, `SA_CRONTAB_BIN`, `SA_CRON_MODE` | `~/Library/LaunchAgents`, `launchctl`, `crontab`, by OS | Where `cron --install` writes (tests point these at fakes) |

## Agents

| Agent | Model | Use for | Tools |
|-------|-------|---------|-------|
| `scout` | `claude-haiku-5-5` | Read-only lookups: files, symbols, call sites, summaries | Read, Grep, Glob |
| `builder` | `claude-sonnet-5-5` | Known-cause changes across 1–5 files | Read, Grep, Glob, Edit, Write, targeted tests and typecheck, `git status/diff` |
| `tester` | `claude-sonnet-5-5` | Writing or fixing tests | Read, Grep, Glob, Edit, Write, targeted tests |
| `debugger` | `claude-opus-5-5` | Unknown root cause, cross-layer or flaky bugs, a builder failing twice | As builder, plus `node` and `git log` |
| `reviewer` | `claude-opus-5-5` | One review before a PR; read-only | Read, Grep, Glob, `git status/diff/log` |

Most calls are reads, so they go to the cheapest tier; the strong model appears only where judgement matters. Each
agent pins its model in its frontmatter, and the `agent-routing` hook rejects calls that try to override it.

## Hooks

| Hook | Blocks | Threshold | Tune with |
|------|--------|-----------|-----------|
| `turn-guard` | `builder`/`tester` runs that go on too long (Read and Grep still pass so they can report) | Warns at 60 and 90 tool calls, blocks from 130 | `TURN_GUARD_WARN`, `TURN_GUARD_WARN2`, `TURN_GUARD_DENY`, `TURN_GUARD_OFF=1` |
| `test-budget` | Whole-suite test runs (`npm test`, `vitest`, `pytest`, `go test ./...` with no file or filter) | A file, folder, `-t`, `-k` or `--changed` passes | Add `FULL_SUITE_OK=1` to the command |
| `agent-routing` | Agent calls that pass `model`, or use `general-purpose` / no `subagent_type` | Every call | Edit `plugin/hooks/agent-routing.sh` |
| `owner-guard` | In lanes only: `gh pr merge`, pushes to `main`/`master`/`dev`, writes to `.claude/settings*.json` | Every call in a lane | `KIT_LANE` (set by `superadvisor`) |
| `metrics-subagent` | Nothing; logs each subagent run | Each subagent stop | — |
| `metrics-main` | Nothing; logs the main session per model | Each `Stop` | `KIT_METRICS_MAIN_MAX_FIRST_BYTES` (default 20 MB of transcript read on first run) |

In auto mode a blocking hook denies with guidance, so the agent changes course instead of waiting. In other modes it
asks you. Without `jq` every hook lets the call through: they save tokens, they are not a security boundary.

## Metrics

Every hook writes to `<project>/.claude/metrics/events.jsonl`. Lane worktrees write to the main checkout, so nothing is
lost when a worktree is removed. The folder has its own `.gitignore` and holds token counts only, never prompt text.

- A `subagent` row per subagent run: agent, model, tokens, turns, duration.
- A `main` row per model per `Stop` of the session you type in (or the leader): tokens and `ctx_max`, the largest
  context seen. The main session is usually the biggest cost, because its context keeps growing.

```bash
plugin/scripts/kit-stats.sh
```

Writes `scorecard.md` and `scorecard.json`: cost per model, the main session, and a fit score per agent and tier
(how often work escalated, for example builder → debugger).

```bash
plugin/scripts/token-watch.sh --hours 24
```

Recent spend. Costs come from a price table; override it with `.claude/metrics/pricing.json`.

## Brains

| Path | Content |
|------|---------|
| `brains/lead.md` | What the leader does alone, what it asks you, what it never does |
| `brains/config.json` | `integration_branch`, patrol thresholds (`waiting_min`, `stuck_min`, `idle_close_min`) |
| `brains/decisions.md` | Decisions already made, so the leader does not ask twice |
| `brains/directives/` | Standing instructions from you |
| `brains/inbox/` | New work dropped in for the leader |
| `brains/.local/` | Runtime data: briefs, patrol log, nightly reviews, cron logs. Git-ignored. |
