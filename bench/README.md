# Benchmark: baseline vs superadvisor

English · [Tiếng Việt](README.vi.md)

Compares two ways of doing the same 6 cards from `demo-app/BACKLOG.md` and prints a table for the talk.

| Mode | How it runs |
|------|-------------|
| `baseline` | One headless session, no plugin, no rules, model `claude-opus-5-5`. Prompt = the card text. |
| `superadvisor` | Project set up with `superadvisor init`, loaded with `--plugin-dir plugin/`, main session `claude-sonnet-5-5` acting as leader: it sizes the card itself, delegates to `builder`/`tester`/`debugger`, and runs one `reviewer` round for M/L cards (per `.claude/rules/workflow.md`). Same card text. |

## Cost warning

Every run is a real Claude Code session and spends real tokens (an L card on opus can cost a few USD). Try it first
with `--dry-run` (does not call `claude`, writes nothing), then start with one card and one run. `all --runs 3` for
both modes is 36 sessions.

## Running

```
bench/run.sh <baseline|superadvisor> <C1..C6|all> [--runs N] [--out <dir>] [--dry-run]
bench/report.sh <out-dir>          # prints a Markdown table from <out-dir>/results.jsonl
```

Example: `bench/run.sh baseline C1 --dry-run`, then `bench/run.sh superadvisor all --runs 3 --out bench/out/talk` and
`bench/run.sh baseline all --runs 3 --out bench/out/talk` (the same `--out` so the report can compare both modes).
Needs bash 3.2+, `jq`, `git`, `node`/`npm`, `perl`, and a logged-in `claude`. Check the tooling with
`bash tests/bench/dry-run.sh`.

Environment variables: `BENCH_TIMEOUT` (seconds, default 900), `BENCH_BASELINE_MODEL`, `BENCH_SUPERADVISOR_MODEL`,
`BENCH_SETTING_SOURCES` (default `project,local`: does not load user-level settings/CLAUDE.md/plugins, so both modes
are fair; set it empty to use Claude Code's default), `BENCH_KEEP=1` (keep the temp folder), `CLAUDE_BIN`.

Each run: copies `demo-app/` (without `node_modules`, `.answers/`, `BACKLOG.md`) into a temp git repo, runs `npm ci`,
commits; for `superadvisor` it also runs `bin/superadvisor init` and commits; runs `claude -p ... --output-format json
--permission-mode acceptEdits --allowedTools <list>`; only after the agent finishes does it copy
`bench/acceptance/<card>.test.ts` into `tests/` and run `npx vitest run tests/`. It writes only to the temp folder and
to `<out>` (default `bench/out/<timestamp>/`, git-ignored). `<out>/raw/<mode>-<card>-<n>/` keeps the raw JSON, logs
and `changes.patch` (the diff the agent produced) for later review.

## What is measured

- **Correctness**: all of the card's acceptance tests pass AND all other `tests/` pass. Acceptance tests are hidden
  from the agent. For C6 the tests only check behaviour; "fix the root cause, not the symptom" and the explanation of
  the cause must be graded by hand against `demo-app/.answers/C6.md`, using `changes.patch` and the agent's final
  report (not yet in `results.jsonl`).
- **Efficiency**: `total_cost_usd`, tokens (`modelUsage` per model; `usage` when missing), number of turns, wall time.
  For `superadvisor`, `kit_stats` (from the hooks + `plugin/scripts/kit-stats.sh`) splits main-session and subagent
  tokens per model, plus the number of kit agent calls (`delegations`; 0 means the leader did not delegate).
- **Usability**: how often a human had to help. Headless mode CANNOT measure this (there is no human in the loop). The
  closest columns are `status` (timeout/error) and `delegations`. To measure it for real, run the leader demo live and
  count the prompts a human typed.

Measured (Claude Code JSON, Vitest): success, cost, tokens, turns, time. Estimated: `kit_est_cost_usd` from the default
price table in `kit-stats.sh` (override with `.claude/metrics/pricing.json`); do not compare it directly with
`total_cost_usd`.

## Assumptions

- API names where the BACKLOG leaves them open (the tests use only these names; renaming them turns tests red):
  - C1: `lateFeeCents(dueAt, returnedAt)`, `FEE_PER_DAY_CENTS` (25) in `src/fees.ts`.
  - C2: error code `ALREADY_ON_LOAN`; loans read through `listLoans(memberId)`.
  - C3: `reserve(bookId, memberId)`; the reserver's new loan is read through `listLoans(memberId)` (`borrowedAt` = the
    return time, 14-day due date); FIFO order is checked through successive returns. The behaviour of a member who is
    skipped afterwards is not checked.
  - C4: `new Library({ maxLoansPerMember })`, `addMember(id, name, { maxLoans })`, going over the limit is still
    `LIMIT_REACHED`, invalid values throw `Error` (not necessarily `LibraryError`).
  - C5: `src/dates.ts` exports `MS_PER_DAY`, `addDays(date, n)`, `diffMs(a, b)` (the sign of `diffMs` is not
    checked); `tests/dates.test.ts` must exist; `library.ts`/`fees.ts` import from `./dates`. Behaviour tests stay
    compatible with the old bug (returning exactly 1 day late is still 50 cents) because this is a pure refactor.
  - C6: a loan returned late is no longer in `listOverdue`; plus non-regression tests.
- Each card runs on its own against the original `demo-app` (cards do not accumulate).
- The flags `--setting-sources`, `--plugin-dir`, `--allowedTools` and the model names follow the current Claude Code
  release; if yours differs, edit the top of `bench/run.sh`. The allowed-tools list limits Bash to `npm/npx/git/node`
  and a few read commands.
- With few runs (1-3), `± deviation` is only indicative; state N when presenting.
