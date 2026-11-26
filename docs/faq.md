# FAQ

Short answers, each pointing at the file that does the work. Command details are in [reference.md](reference.md);
one card end to end is in [lifecycle.md](lifecycle.md).

### Why tmux?

The leader and every lane are long-running Claude Code sessions that must keep going after you close the terminal.
tmux gives each one a detached session that you can attach to and leave. It also lets `superadvisor` read each screen
(`capture-pane`) to work out BUSY / IDLE / WAITING, and keep a pane after Claude Code exits (`remain-on-exit`), which is
how `status` shows DEAD. Everything runs on its own socket (`tmux -L sa`, change it with `SA_SOCKET`), so the kit's
sessions do not mix with yours.

### Why a git worktree per lane?

Lanes run at the same time. With one checkout they would edit the same files and switch branches under each other.
Each lane gets `.claude/worktrees/<name>` on its own branch `lane/<name>`, cut from the integration branch, so one card
is one folder, one branch and one PR that can be reviewed on its own. Reopening a lane with the same name reuses the
folder and the branch. Metrics are written to the main checkout, so removing a worktree loses nothing.

### What happens when a lane is stuck?

`superadvisor patrol` flags it: dead pane, a permission prompt waiting at least `patrol.waiting_min` minutes (default
5), or a screen unchanged for at least `patrol.stuck_min` minutes (default 20). Plain `patrol` only reports; only
`patrol --clean --apply` acts — it closes lanes that are idle, merged and clean, and `cron --install` runs it every 15 minutes.
The `lead` skill tells the leader to look at the lane, pass owner-only permission prompts to you, or close the lane,
write a narrower brief and reopen it with the same name. After a second stall it stops and asks you. Inside a lane,
`turn-guard` also cuts off a `builder` or `tester` run at 130 tool calls so it summarizes instead of looping.

### Is `owner-guard` a security boundary?

No. It is a guard rail against a lane doing owner work by habit, not a control against a hostile agent. It runs only
when `KIT_LANE=1`, which `superadvisor lane open` sets in the environment. It only looks at Bash, Edit, Write and
MultiEdit calls, and only at direct command segments: text inside quotes is treated as data, so a command wrapped in
`bash -c '...'`, a script file or another language is not inspected (of `gh api`, only calls on a `/merge` endpoint are). Without `jq` every hook lets everything
through. The leader is not a lane, so `owner-guard` never applies to it; its merge rules are instructions in
`brains/lead.md`. For a real boundary use branch protection on the integration branch, required reviews, and tokens
with the smallest scope you can give the machine.

### How close is the cost estimate to my real bill?

It is an estimate. `kit-stats.sh` multiplies the token counts recorded by the metrics hooks by a price table per
tier (USD per million tokens: haiku 1 in / 5 out, sonnet 2 / 10, opus 4 / 20, cache read and write priced
separately). It does not know your plan, discounts or current list prices, and it misses sessions that ran without the
plugin. On the first Stop of a session whose transcript is over 20 MB, `metrics-main` starts counting from that point
instead of back-filling. Put your own rates in `.claude/metrics/pricing.json` (same shape). For a measured number,
compare with Claude Code's `total_cost_usd` (the benchmark records both) or your billing page.

### How do I use it with an existing repo?

Run `superadvisor init /path/to/repo`. It never overwrites: existing files are kept, and `CLAUDE.md` gets a marked
block appended (skipped if the marker is already there). Fill the `<...>` placeholders in that block (test,
typecheck, sensitive paths), set `integration_branch` in `brains/config.json` (for example `dev`), and commit the new
files to that branch. Install the plugin so lanes get the hooks and agents. Then `superadvisor up /path/to/repo`.

### Does it run on Linux?

Yes. The CLI and hooks are bash (3.2 or newer) with `tmux`, `git` and `jq`; the install guide gives the apt
commands. `superadvisor cron` prints both a crontab sample (Linux and macOS) and a launchd sample (macOS only). On
Windows, use WSL.

### What may the leader merge?

By default, only a PR you name, for example `M 12`, and only on the head that was approved; if the head changes it
asks again. The minimum is green tests on that exact head and no High/Critical findings left after at most two review
rounds. It never releases, deploys, tags, force pushes, changes permissions or deletes data that cannot be recovered.
You can widen or narrow this by editing `brains/lead.md`. Lanes can never merge: `owner-guard` denies `gh pr merge`
and `gh api .../merge` inside a lane, as well as force, tag and release pushes.

### How do I stop everything?

One lane: `superadvisor lane close <name>` (the worktree is kept). The leader:
`tmux -L sa kill-session -t <PROJECT>-LEAD`. Every session on the kit's socket, for every project:
`tmux -L sa kill-server`. If you installed the cron or launchd sample, remove that line from `crontab -e` or unload
the launchd job. Worktrees and branches stay until you remove them.

### How does Remote Control fit in?

Every session the CLI starts, the leader and each lane, runs `claude --remote-control <session name>`. In the Claude
app you pick `<PROJECT>-LEAD` and talk to the leader from your phone; you can also open a lane by its session name to
look at it. This needs Claude Code to be logged in to claude.ai. Without it, attach in a terminal with
`tmux -L sa attach -t <session>`.

### How do I tune the hook thresholds?

| What | Where |
|------|-------|
| `turn-guard` warnings and cap (60, 90, 130 tool calls) | `TURN_GUARD_WARN`, `TURN_GUARD_WARN2`, `TURN_GUARD_DENY`; `TURN_GUARD_OFF=1` disables it. Set them in the `env` block of `.claude/settings.json` or `settings.local.json`, or export them before `superadvisor up`. `kit-stats.sh` reads `TURN_GUARD_DENY` from the same places. |
| `test-budget` | Name a file, folder or filter; prefix `FULL_SUITE_OK=1` only when you really want the whole suite |
| Patrol thresholds | `patrol.waiting_min`, `patrol.stuck_min` in `brains/config.json` |
| First-run transcript limit for `metrics-main` | `KIT_METRICS_MAIN_MAX_FIRST_BYTES` (default 20 MB) |
| `agent-routing` roster | Edit `plugin/hooks/agent-routing.sh` |

### Can I run lanes without the plugin?

The CLI does not depend on the plugin: `superadvisor` only needs bash, tmux, git and jq. Without the plugin the
sessions still start, but there are no hooks (no `owner-guard`, no budgets, no metrics), no pinned agents and no
`lead` skill. Use the plugin.

### How do I uninstall?

```bash
tmux -L sa kill-server
```

```bash
claude plugin uninstall agi-agent-kit@agi-agent-kit
```

```bash
claude plugin marketplace remove agi-agent-kit
```

Files that `init` copied into your project stay. Delete `brains/`, `.claude/rules/workflow.md`,
`.claude/rules/token-budget.md`, the `superadvisor:begin`…`superadvisor:end` block in `CLAUDE.md`, the two
`.gitignore` lines, `.claude/metrics/` and any `.claude/worktrees/` you no longer want.
