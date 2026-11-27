# Session Superadvisor

A complete, self-contained talk on Superadvisor: one leader session that runs many Claude Code lanes, with guardrails,
token telemetry, and lanes that open safely, report back by themselves and clean up after the card.

| File | What it is |
| --- | --- |
| `Session-Superadvisor-V2-AgilityIO.pptx` | The deck, 16 slides, demo video embedded on slide 14 |
| `Session-Superadvisor-V2-AgilityIO.pdf` | Same deck as PDF (slide 14 shows the video's poster frame) |
| `handout.html` / `handout.yaml` | English handout for the audience |
| `qa.html` / `qa.yaml` | Q&A and discussion prep (Vietnamese) |
| `cheatsheet.html` / `cheatsheet.yaml` | Command cheat sheet (Vietnamese) |
| `src/` | Deck builders; see `src/README.md` |

Slides: 1 Cover · 2 The problem · 3 One session, the others report · 4 Architecture · 5 Four roles ·
6 One card, brief to merge · 7 The leader's loop · 8 Lane lifecycle · 9 Hooks · 10 Model routing ·
11 Measure everything · 12 Gated epic merge · 13 Spec by prototype · 14 Demo (video) · 15 Try it ·
16 Thank you / Q&A.

The slides stay at overview level; the details behind them (load gate thresholds, lane events and escalation, reuse
and cleanup rules, adopt, role-scoped context) are in `handout.html`.

The superadvisor CLI, the five agents, the six hooks, cron, the sample app and the benchmark are in AgiAgentKit. The
lane lifecycle (slide 8), role-scoped context (5), the epic merge gate (12) and the prototype template (13) ship in
AgentAutoKit (agent-brains plugin).

Rebuild the HTML pages after editing a YAML file:

```bash
cd docs/talk/v2
npx -y @bestagentkits/render@0.3.0 validate handout.yaml --json
npx -y @bestagentkits/render@0.3.0 handout.yaml --out handout.html
```
