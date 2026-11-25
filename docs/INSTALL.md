# Install and set up AgiAgentKit

About 10 minutes. Each step ends with a check, so you know it worked before moving on.

## 1. Prerequisites

| Tool | Why | Check | Install (macOS / Debian-Ubuntu) |
|------|-----|-------|---------------------------------|
| Claude Code | Runs the leader and lanes | `claude --version` | See the Claude Code docs |
| `git` | Each lane works in its own worktree | `git --version` | `brew install git` / `sudo apt install git` |
| `tmux` | Hosts the leader and lane sessions | `tmux -V` | `brew install tmux` / `sudo apt install tmux` |
| `jq` | Hooks read tool calls as JSON | `jq --version` | `brew install jq` / `sudo apt install jq` |
| Node.js 20+ | Only for the demo app | `node --version` | `brew install node` / nodesource |

Windows: use WSL. Remote Control (driving the leader from your phone) needs you to be logged in to claude.ai in
Claude Code.

## 2. Get the kit

```bash
git clone https://github.com/trungungtoan-agilityio/AgiAgentKit.git
```

Optional: put the CLI on your `PATH`, so you can type `superadvisor` instead of the full path.

```bash
echo 'export PATH="$HOME/AgiAgentKit/bin:$PATH"' >> ~/.zshrc
```

Check: `superadvisor --help` prints the command list. The rest of this guide assumes the kit is cloned to `~/AgiAgentKit`.

## 3. Install the plugin

Register the folder as a plugin marketplace, then install the plugin from it.

```bash
claude plugin marketplace add ~/AgiAgentKit
```

```bash
claude plugin install agi-agent-kit@agi-agent-kit
```

Check: `claude plugin details agi-agent-kit@agi-agent-kit` lists 5 agents, the hooks and the `lead` skill.

Just trying it? Skip the install and load the plugin for one session only:

```bash
claude --plugin-dir ~/AgiAgentKit/plugin
```

## 4. Set up your project

The project must be a git repo, because lanes branch from it.

```bash
superadvisor init /path/to/your-project
```

This copies, without overwriting anything:

| File | What to do with it |
|------|--------------------|
| `CLAUDE.md` | Created, or a marked block is appended. Fill in the `<...>` placeholders: test and typecheck commands, protected paths. |
| `.claude/rules/workflow.md`, `token-budget.md` | Size work S/M/L, route it to the right agent, keep test runs narrow. Edit to taste. |
| `brains/lead.md` | What the leader may do alone, what it must ask you, what it never does. Read it once. |
| `brains/config.json` | `integration_branch` (lanes branch from it, default `main`) and patrol thresholds in minutes. |
| `brains/decisions.md`, `directives/`, `inbox/` | The leader's memory. Leave empty to start. |

It also adds `brains/.local/` and `.claude/worktrees/` to `.gitignore`. Commit these files to the integration branch.

## 5. Start the leader

```bash
superadvisor up /path/to/your-project
```

The leader runs in tmux on its own socket (`sa`), in auto mode, with Remote Control on. The session name is the
folder name in capitals plus `-LEAD`, for example `YOUR-PROJECT-LEAD`.

- **From the terminal:** `tmux -L sa attach -t YOUR-PROJECT-LEAD` (detach with `Ctrl-b d`).
- **From your phone:** Claude app → Remote Control → `YOUR-PROJECT-LEAD`.

Check: `superadvisor status` shows one line for the leader.

## 6. Give it work

Tell the leader what to do in plain words, for example: *"Read BACKLOG.md, size each card, open a lane for each
medium card."* The leader does the small cards itself and writes a brief per medium card, opening a lane with
`superadvisor lane open`. Each lane gets a worktree and a branch `lane/<name>`, and opens a PR when its card is done.

You approve merges by saying so to the leader, for example `M 12` to merge PR 12.

| Command | Use |
|---------|-----|
| `superadvisor status` | One line per session: BUSY, IDLE, WAITING or DEAD, and minutes since the screen changed |
| `superadvisor patrol` | Same, and flags lanes stuck longer than the patrol threshold |
| `superadvisor report` | Short daily report: lanes, stuck flags, commits, estimated cost |
| `superadvisor cron [--install]` | No flag: prints a crontab and launchd sample (installs nothing). `--install`: schedules `patrol --clean --apply` every 15 min, `review` at 22:00 and `report` at 08:00 |

## 7. Read the scorecard

Run it from inside your project, where the hooks write `.claude/metrics/events.jsonl`.

```bash
~/AgiAgentKit/plugin/scripts/kit-stats.sh
```

It shows tokens and estimated cost per agent and for the main session, plus signs that work went to the wrong
tier. `plugin/scripts/token-watch.sh --hours 24` shows recent spend.

## Uninstall

```bash
tmux -L sa kill-server
```

```bash
claude plugin uninstall agi-agent-kit@agi-agent-kit
```

```bash
claude plugin marketplace remove agi-agent-kit
```

Files that `init` copied into your project stay; delete them yourself if you no longer want them.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `superadvisor up` says the leader already runs | It does. Attach with `tmux -L sa attach -t YOUR-PROJECT-LEAD`. |
| A hook denied a full test run | Intended. Run a file or a filter, or add `FULL_SUITE_OK=1` to the command. |
| A builder stopped after many tool calls | `turn-guard` cut it off at 130 calls. Narrow the brief, or raise `TURN_GUARD_DENY`. |
| A lane cannot merge or push to `main` | Intended: only the leader merges, and only with your approval. |
| Hooks do nothing | Install `jq`, then check that the plugin is enabled. |
| The leader is not in the Claude app | Log in to claude.ai in Claude Code, then run `superadvisor up` again. |
