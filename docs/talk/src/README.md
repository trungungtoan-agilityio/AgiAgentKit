# Deck source — Session Superadvisor

Source for the two deck files one level up (`docs/talk/Session-Superadvisor-AgilityIO.pptx` and `.pdf`). Two builders
render the **same deck** from the same coordinates:

- `build.js` → `Session-Superadvisor-AgilityIO.pptx` (via `pptxgenjs`, then an Office theme is written in).
- `build-pdf.js` → `Session-Superadvisor-AgilityIO.pdf` (React → one HTML page → headless Chrome print).

Edit both when you change a slide, so the PowerPoint and the PDF stay in sync.

## Install

```bash
npm ci
```

Deps: `pptxgenjs`, `sharp`, `react`, `react-dom`, `react-icons` (see `package.json`).

## Build the PDF

Needs Google Chrome at `/Applications/Google Chrome.app` (edit the `CHROME` constant for another path).

```bash
NODE_PATH=./node_modules node build-pdf.js
```

## Build the PowerPoint

`build.js` post-processes the deck's theme with the Claude Code **pptx skill's** `scripts/apply_theme.js` (pptxgenjs
hard-codes Office's palette, so scheme colors resolve to Office blue/orange until the deck's own colors are written
into `ppt/theme/theme1.xml`). Point `APPLY_THEME` at that script:

```bash
APPLY_THEME="/path/to/skills/pptx/scripts/apply_theme.js" NODE_PATH=./node_modules node build.js
```

Without `apply_theme.js` the deck still builds, but the accent colors fall back to Office defaults.

## Copy the output back into the repo

The builders write next to themselves; copy the two files to `docs/talk/` (overwrite). Then render the PDF and read
every page to check for overflow or overlapping shapes.

## Assets

- `assets/agility-logo.svg`, `assets/agility-logo.png` — logo (SVG for the pptx, PNG for the PDF).
- `assets/agikit-demo.mp4` — one-minute demo recording, embedded in slide 10 of the pptx (plays in PowerPoint).
- `assets/demo-poster.png` — a frame of the recording, used as the video cover in the pptx and as the still shown on
  slide 10 of the PDF (Chrome cannot embed a playable video). Regenerate with
  `ffmpeg -ss 00:00:30 -i assets/agikit-demo.mp4 -frames:v 1 -vf scale=1280:-2 assets/demo-poster.png`.
