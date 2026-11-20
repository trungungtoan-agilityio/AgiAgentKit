# Talk documents

Supplementary pages for the Superadvisor talk (`Session-Superadvisor-AgilityIO.pdf` / `.pptx`). The pages are in
Vietnamese; open the HTML files in a browser, they make no network request.

| Page | Spec | Content |
|------|------|---------|
| [handout.html](handout.html) | `handout.yaml` | One-page companion: the problem, leader/lanes/brains, one card's lifecycle, benchmark numbers |
| [qa.html](qa.html) | `qa.yaml` | Q&A for a team adopting the kit: FAQ answers, install checklist, known limits |
| [cheatsheet.html](cheatsheet.html) | `cheatsheet.yaml` | `superadvisor` commands, environment variables, hooks, brains paths |

Facts come from the slides, `docs/lifecycle.md`, `docs/faq.md`, `docs/reference.md`, `docs/INSTALL.md` and
`bench/results.md`. Edit the YAML spec, not the HTML.

## Regenerate

The pages are compiled with the `ak-render` skill (`plugin/skills/ak-render/`), pinned to `@bestagentkits/render`
0.3.0. From the repository root:

```bash
npx -y @bestagentkits/render@0.3.0 validate docs/talk/handout.yaml --json
```

```bash
npx -y @bestagentkits/render docs/talk/handout.yaml --out docs/talk/handout.html
```

Do the same for `qa.yaml` and `cheatsheet.yaml`.
