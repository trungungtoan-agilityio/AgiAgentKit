# Deck source — Session Superadvisor

Source for `docs/talk/v2/Session-Superadvisor-V2-AgilityIO.pptx` and `.pdf`. Two builders render the **same deck**
from the same coordinates:

- `build.js` → `../Session-Superadvisor-V2-AgilityIO.pptx` (via `pptxgenjs`, then an Office theme is written in).
- `build-pdf.js` → `../Session-Superadvisor-V2-AgilityIO.pdf` (React → one HTML page → headless Chrome print).

Both write straight into `docs/talk/v2/`, so there is no copy step. Edit both builders when you change a slide.

## Build

```bash
npm ci
NODE_PATH=./node_modules node build-pdf.js        # needs Google Chrome at /Applications/Google Chrome.app
APPLY_THEME="/path/to/skills/pptx/scripts/apply_theme.js" NODE_PATH=./node_modules node build.js
```

`APPLY_THEME` points at the Claude Code pptx skill's `scripts/apply_theme.js`; without it the deck builds with Office
default accent colors. After building, render the PDF and read every page for overflow.

## Assets

Read from `docs/talk/src/assets/` through a relative path (`../../src/assets/`): logo SVG/PNG, `agikit-demo.mp4`
(embedded in slide 14 of the pptx) and `demo-poster.png` (video cover in the pptx, still image on slide 14 of the PDF).
