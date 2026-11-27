# Session Superadvisor

A complete, self-contained talk on Superadvisor: one leader session that runs many Claude Code lanes, with guardrails,
token telemetry, and lanes that open safely, report back by themselves and clean up after the card.

| File | What it is |
| --- | --- |
| `Session-Superadvisor-V2-AgilityIO.pptx` | The deck, 20 slides, demo video embedded on slide 18 |
| `Session-Superadvisor-V2-AgilityIO.pdf` | Same deck as PDF (slide 18 shows the video's poster frame) |
| `handout.html` / `handout.yaml` | English handout for the audience |
| `qa.html` / `qa.yaml` | Q&A and discussion prep (Vietnamese) |
| `cheatsheet.html` / `cheatsheet.yaml` | Command cheat sheet (Vietnamese) |
| `src/` | Deck builders; see `src/README.md` |

Slides: 1 Cover · 2 The problem · 3 One session, the others report · 4 Architecture · 5 Four roles ·
6 One card, brief to merge · 7 The leader's loop · 8 Lane lifecycle · 9 Load gate · 10 Report back ·
11 Reuse and clean up · 12 Roles in kit-context · 13 Hooks · 14 Model routing · 15 Measure everything ·
16 Gated epic merge · 17 Spec by prototype · 18 Demo (video) · 19 Try it · 20 Thank you / Q&A.

The superadvisor CLI, the five agents, the six hooks, cron, the sample app and the benchmark are in AgiAgentKit. The
lane lifecycle (slides 8–12), the epic merge gate (16) and the prototype template (17) ship in AgentAutoKit
(agent-brains plugin).

Rebuild the HTML pages after editing a YAML file:

```bash
cd docs/talk/v2
npx -y @bestagentkits/render@0.3.0 validate handout.yaml --json
npx -y @bestagentkits/render@0.3.0 handout.yaml --out handout.html
```
