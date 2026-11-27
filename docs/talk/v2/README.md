# Session Superadvisor V2

Second version of the Superadvisor talk: a short recap of V1, then what changed between 25 and 27 November. V1
(`docs/talk/Session-Superadvisor-AgilityIO.*` and its handout, Q&A and cheat sheet) stays as it was.

| File | What it is |
| --- | --- |
| `Session-Superadvisor-V2-AgilityIO.pptx` | The deck, 15 slides, demo video embedded on slide 13 |
| `Session-Superadvisor-V2-AgilityIO.pdf` | Same deck as PDF (slide 13 shows the video's poster frame) |
| `handout.html` / `handout.yaml` | English handout for the audience |
| `qa.html` / `qa.yaml` | Q&A and discussion prep (Vietnamese) |
| `cheatsheet.html` / `cheatsheet.yaml` | Command cheat sheet for the new lane commands (Vietnamese) |
| `src/` | Deck builders; see `src/README.md` |

Slides: 1 Cover · 2 Problem (recap) · 3 Architecture (recap) · 4 V1 → V2 · 5 Lane lifecycle · 6 Load gate ·
7 Report back · 8 Reuse and clean up · 9 Roles in kit-context · 10 Gated epic merge · 11 Spec by prototype ·
12 In AgiAgentKit this week · 13 Demo (video) · 14 Try it · 15 Thank you.

The lane features on slides 5–11 ship in AgentAutoKit (agent-brains plugin), not in AgiAgentKit.

Rebuild the HTML pages after editing a YAML file:

```bash
npx -y @bestagentkits/render@0.3.0 validate handout.yaml --json
npx -y @bestagentkits/render@0.3.0 handout.yaml --out handout.html
```
