# Lifecycle of one card

This page follows one card from an empty project to a merged PR, with the commands that run at each step. The example
is card **C3** (reservations queue, size M) from the demo backlog in `demo-app/BACKLOG.md`. Size S cards (1–3 files)
never get a lane: the leader does them itself.

The kit is assumed to be cloned to `~/AgiAgentKit` and the project to live in `~/demo-library`, so the session names
start with `DEMO-LIBRARY-`. The session prefix is the project folder name in capitals, with every character other than
`A-Z` and `0-9` turned into `-`.

## 1. Set up the project once

```bash
~/AgiAgentKit/bin/superadvisor init ~/demo-library
```

`init` copies `template/` into the project without overwriting anything: `.claude/rules/workflow.md`,
`.claude/rules/token-budget.md`, `brains/` (`lead.md`, `config.json`, `decisions.md`, `directives/`, `inbox/`) and a
`CLAUDE.md` block between `superadvisor:begin` / `superadvisor:end` markers. It adds `brains/.local/` and
`.claude/worktrees/` to `.gitignore` and creates `brains/.local/briefs/` and `brains/.local/samples/`.

Then fill the `<...>` placeholders in `CLAUDE.md`, check `brains/config.json`, and commit the new files to the
integration branch. Lanes branch from that branch, so it must exist locally.

```json
{
  "status": "active",
  "integration_branch": "main",
  "patrol": {
    "waiting_min": 5,
    "stuck_min": 20
  }
}
```

## 2. Start the leader

```bash
~/AgiAgentKit/bin/superadvisor up ~/demo-library
```

This starts tmux session `DEMO-LIBRARY-LEAD` on socket `sa`, in the project root, running
`claude --remote-control DEMO-LIBRARY-LEAD --permission-mode auto` with a start prompt that points the leader at
`CLAUDE.md`, `brains/lead.md` and the `lead` skill. `up --dry-run` prints that command instead. If the session already
exists, `up` says so and does nothing.

Open it with `tmux -L sa attach -t DEMO-LIBRARY-LEAD`, or from the Claude app under Remote Control.

## 3. Give the leader work

You type, for example: *"Read BACKLOG.md, size each card, open a lane for C3."* The leader reads `brains/`, sizes the
cards S/M/L and writes one brief per M card. A brief is a plain Markdown file in the shape the `lead` skill defines:

```markdown
# Brief: c3
## Nhiệm vụ        Add a reservations queue: reserve(bookId, memberId); when a book is returned it goes
                   to the first member in the queue (FIFO) as a new loan.
## Xong khi        PR open; new tests for reserve and FIFO hand-over green; existing tests and typecheck green.
## File            src/library.ts, src/types.ts, tests/library.test.ts
## Model           sonnet
## Được / không được
- Được: add types and tests for reservations
- Không được: merge PR, edit .env*, edit old migrations, refactor outside this card
## Lệnh test       npx vitest run tests/library.test.ts && npm run typecheck
```

The section headings are in Vietnamese because the skill's template is; the lane reads whatever the file says.

## 4. Open the lane

```bash
~/AgiAgentKit/bin/superadvisor lane open c3 --brief /path/to/c3-brief.md
```

What happens, in order:

1. The name is checked: only `a-z`, `0-9` and `-`, not starting with `-`, not `lead`.
2. The integration branch from `brains/config.json` must exist, or `lane open` stops.
3. If a session `DEMO-LIBRARY-C3` already runs, `lane open` stops and tells you to close it first.
4. Worktree `.claude/worktrees/c3` is created on a new branch `lane/c3` from the integration branch. If the folder
   already exists it is reused; if the branch already exists it is checked out.
5. The brief is copied to `brains/.local/briefs/c3.md`.
6. tmux session `DEMO-LIBRARY-C3` starts in the worktree with `KIT_LANE=1`, `KIT_LANE_NAME`, `KIT_LANE_BRIEF`, `KIT_PROTECTED_BRANCHES` (the integration branch) and
   `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000`, running Claude Code in auto mode with Remote Control. The prompt tells it
   it is a lane (one card, one worktree, one PR, never merge) followed by the brief text.

Options: `--model <id>` picks the lane model (without it, Claude Code's default model is used), `--worktree <path>`
puts the worktree elsewhere, `--dry-run` prints the `git worktree add`, the `cp` and the tmux command without running
them.

While the lane works, every tool call goes through the hooks: `owner-guard` denies merges, pushes to
`main`/`master`/`dev` or the integration branch, force/tag/release pushes and writes to `.claude/settings*.json`,
`.claude/hooks/` and `brains/lead.md`; `test-budget` denies whole-suite test runs; `turn-guard`
caps `builder`/`tester` runs; `agent-routing` keeps delegation on the five pinned agents. The metrics hooks append
token counts to `.claude/metrics/events.jsonl` in the main checkout.

## 5. Watch: status and patrol

```bash
~/AgiAgentKit/bin/superadvisor status
```

```
SESSION                      STATE    PHÚT-KHÔNG-ĐỔI
DEMO-LIBRARY-C3              BUSY     0m
DEMO-LIBRARY-LEAD            IDLE     3m
```

Both commands work from inside the project (they use the git top-level of the current folder, or `SA_PROJECT`). Each
row is one tmux session whose name starts with the project prefix. The last column is the number of minutes since the
pane's text last changed; digits and symbols are dropped before comparing, so clocks and spinners do not count as
progress. The previous sample is kept in `brains/.local/samples/<session>.txt`.

| State | How it is detected |
|-------|--------------------|
| `DEAD` | tmux reports the pane as dead: Claude Code exited (panes are kept with `remain-on-exit`) |
| `WAITING` | The last 15 non-empty lines contain a permission prompt, such as "Do you want to", "Allow this", `(y/n)`, "1. Yes", or "waiting for permission/approval" |
| `BUSY` | The last 15 non-empty lines contain "esc to interrupt", "ctrl+c to interrupt", or a spinner line |
| `IDLE` | None of the above: finished, or waiting for input |

```bash
~/AgiAgentKit/bin/superadvisor patrol
```

`patrol` prints the same table, appends one line per session to `brains/.local/patrol.log`, and prints a
`KẸT: ...` ("stuck") flag when:

| Flag | Rule | Default |
|------|------|---------|
| Dead | State is `DEAD` | — |
| Waiting too long | State is `WAITING` for at least `patrol.waiting_min` minutes | 5 |
| No change | State is not `WAITING`, the session is not the leader, and the pane has not changed for at least `patrol.stuck_min` minutes | 20 |

Plain `patrol` only reports; it never touches a session. `patrol --clean` lists lanes that are idle for at least
`patrol.idle_close_min` minutes (30), merged, clean and pushed; `--clean --apply` closes them and removes their
worktrees. `superadvisor cron --install` schedules `patrol --clean --apply` every 15 minutes, `review` at 22:00 and
`report` at 08:00 (launchd on macOS, a marked crontab block on Linux). Without a flag, `cron` only prints samples.

When a lane is flagged, the `lead` skill tells the leader to look at it, report owner-only permission prompts to you,
or close the lane, write a narrower brief and reopen it with the same name (the worktree and branch are reused). After
a second stall it stops and asks you.

## 6. The PR

The lane works in `lane/c3`, runs the test command from the brief, pushes its branch and opens a PR against the
integration branch, then stops. It cannot merge: `owner-guard` denies `gh pr merge` in a lane. The leader checks the
PR and tests, runs at most two review rounds with `reviewer` when the card needs it, and reports to you in at most five
lines, for example:

```
Xong: —
Đang chạy: c3 IDLE, PR #12 open, targeted tests green on the PR head
Cần anh: M 12
```

## 7. Merge on your word

You answer `M 12`. Under the default rules in `brains/lead.md`, this is the only way the leader merges: tests green on
the exact head that was approved, no High/Critical findings left after at most two review rounds. If the head changed
after you spoke, it asks again. Releases, deploys, permission changes and force pushes always go back to you. These
rules live in `brains/lead.md` and the `lead` skill; no hook enforces them on the leader.

## 8. Close the lane

```bash
~/AgiAgentKit/bin/superadvisor lane close c3 --rm-worktree
```

This kills session `DEMO-LIBRARY-C3` and removes its patrol sample. With `--rm-worktree` it removes the worktree and
deletes branch `lane/c3`, but only when the branch counts as merged: either `git branch --merged <integration branch>`
lists `lane/c3`, or — with `gh` installed — a merged PR's head is the branch tip, so a squash-merged PR counts too
(`bin/superadvisor` `branch_merged`). Pull the integration branch first. If neither holds (for example `gh` is not
installed, or you committed more after the PR), `lane close` keeps the worktree and says so; remove it yourself with
`git worktree remove` once you are sure. Without `--rm-worktree` the worktree is always kept.

The leader then writes one line to `brains/decisions.md`.

## 9. Report

```bash
~/AgiAgentKit/bin/superadvisor report
```

Prints the session table, the last five stuck flags from `patrol.log`, today's commits (`git log --since=midnight`,
up to 20) and, when `plugin/scripts/kit-stats.sh` and `.claude/metrics/events.jsonl` exist, the cost lines from the
scorecard. Costs are estimates from a price table; see [faq.md](faq.md).
