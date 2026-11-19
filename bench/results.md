# Benchmark results

One run per card per mode on the six cards of `demo-app/BACKLOG.md` (N = 1, so treat the spread as unknown).
Method: [bench/README.md](README.md). Both modes ran headless with project settings only.

| Mode | Cards passed | Cost per card (USD) | Wall time per card (s) |
|---|---:|---:|---:|
| baseline: one Opus session | 6/6 | 0.292 | 66 |
| superadvisor: Sonnet leader + tiered agents | 6/6 | 0.270 | 62 |

## What this shows

- Same pass rate on the hidden acceptance tests.
- Superadvisor cost 92% of baseline. It used more tokens in total (mostly cache reads on Sonnet and Haiku), but at cheaper rates than Opus.
- Wall time was about the same.
- The demo app is small, so the leader's advantage is small. Coordination pays off on longer sessions and parallel lanes. Headless runs cannot measure how often a human had to step in.

## Per card

| Mode | Card | Pass | Cost USD | Total tokens (k) | Wall time (s) | Kit agent calls |
|---|---|---|---:|---:|---:|---:|
| baseline | C1 | yes | 0.397 | 195 | 38 | - |
| baseline | C2 | yes | 0.216 | 161 | 56 | - |
| baseline | C3 | yes | 0.346 | 220 | 81 | - |
| baseline | C4 | yes | 0.330 | 216 | 86 | - |
| baseline | C5 | yes | 0.253 | 204 | 58 | - |
| baseline | C6 | yes | 0.214 | 201 | 74 | - |
| superadvisor | C1 | yes | 0.282 | 314 | 35 | 2 |
| superadvisor | C2 | yes | 0.129 | 259 | 29 | 0 |
| superadvisor | C3 | yes | 0.515 | 803 | 142 | 4 |
| superadvisor | C4 | yes | 0.244 | 372 | 70 | 2 |
| superadvisor | C5 | yes | 0.215 | 397 | 39 | 2 |
| superadvisor | C6 | yes | 0.236 | 232 | 58 | 1 |

`Cost USD` is `total_cost_usd` reported by Claude Code. `Kit agent calls` counts subagent runs logged by the kit's hooks.
Wall time is the full `claude -p` run. The `duration_s` and `turns` fields count only the main session, so they leave out time spent in subagents.
