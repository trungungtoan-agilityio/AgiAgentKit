// Same deck as build.js, rendered as HTML (inches, same coordinates) and printed to PDF by headless Chrome.
// Run: NODE_PATH=./node_modules node build-pdf.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const HTML = path.join(__dirname, "deck-print.html");
const PDF = path.join(__dirname, "Session-Superadvisor-AgilityIO.pdf");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const logo = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "assets", "agility-logo.png")).toString("base64");
const poster = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "assets", "demo-poster.png")).toString("base64");
const K = { ink: "#0A2630", body: "#425466", purple: "#5D38AC", blue: "#3C78E8", violet: "#983DCF", mist: "#F4F5F8", soft: "#EFEAFB", line: "#E1E5EC" };
const GRAD = `linear-gradient(135deg, ${K.violet}, ${K.blue})`;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ico = (n, c = K.purple) => ReactDOMServer.renderToStaticMarkup(React.createElement(fa[n], { color: c, size: "100%" }));

const box = (x, y, w, h, css, inner = "") => `<div style="position:absolute;left:${x}in;top:${y}in;width:${w}in;height:${h}in;${css}">${inner}</div>`;
const text = (x, y, w, h, pt, css, t) => box(x, y, w, h, `font-size:${pt}pt;${css}`, t);
const card = (x, y, w, h, css = "") => box(x, y, w, h, `background:#fff;border:1px solid ${K.line};box-shadow:0 2px 8px rgba(10,38,48,.08);${css}`);
const iconCircle = (x, y, d, n) => box(x, y, d, d, `background:${K.soft};border-radius:50%;`, `<div style="position:absolute;inset:${d * 0.26}in">${ico(n)}</div>`);
const twoLine = (t, sub, tp, sp, tc = K.ink, sc = K.body) => `<div style="display:flex;flex-direction:column;justify-content:center;height:100%"><b style="font-size:${tp}pt;color:${tc}">${esc(t)}</b><span style="font-size:${sp}pt;color:${sc};margin-top:4pt">${esc(sub)}</span></div>`;

let n = 0;
const slides = [];
function contentSlide(kicker, title, body, mist = false) {
  n++;
  slides.push(`<section style="background:${mist ? K.mist : "#fff"}">
    <img src="${logo}" style="position:absolute;left:11in;top:.45in;width:1.65in" alt="Agility IO">
    ${text(0.7, 0.45, 9.5, 0.35, 12, `font-weight:700;color:${K.purple};letter-spacing:2pt`, esc(kicker.toUpperCase()))}
    ${text(0.7, 0.85, 10, 1.25, 34, `font-weight:700;color:${K.ink};line-height:1.1`, esc(title))}
    ${body}
    ${text(0.7, 7.0, 3, 0.3, 10, `color:${K.body}`, "agilityio.com")}
    ${text(12.2, 7.0, 0.5, 0.3, 10, `color:${K.body};text-align:right`, n)}
  </section>`);
}
function coverSlide(title, lead, foot, footCss) {
  n++;
  slides.push(`<section style="background:#fff">
    ${box(8.6, 0, 4.733, 7.5, `background:${GRAD}`)}
    <img src="${logo}" style="position:absolute;left:.7in;top:.6in;width:2.4in" alt="Agility IO">
    ${box(0.7, 2.1, 7.6, 1.5, `display:flex;align-items:flex-end;font-size:54pt;font-weight:700;color:${K.ink};line-height:1.05`, esc(title))}
    ${text(0.7, 3.85, 7.4, 1.5, 22, `color:${K.body};line-height:1.3`, esc(lead))}
    ${text(0.7, 6.55, 7.4, 0.4, 14, footCss, foot)}
  </section>`);
}
const table = (x, y, colW, rowH, pt, rows, opts = {}) => {
  const cols = colW.map((w) => `<col style="width:${w}in">`).join("");
  const head = rows[0].map((c) => `<th>${esc(c)}</th>`).join("");
  const body = rows.slice(1).map((r) => "<tr>" + r.map((c, j) => `<td style="${opts.cell ? opts.cell(j) : ""}">${esc(c)}</td>`).join("") + "</tr>").join("");
  return `<table style="position:absolute;left:${x}in;top:${y}in;width:${colW.reduce((a, b) => a + b, 0)}in;table-layout:fixed;font-size:${pt}pt"><colgroup>${cols}</colgroup><tr style="height:${rowH}in">${head}</tr>${body.replace(/<tr>/g, `<tr style="height:${rowH}in">`)}</table>`;
};

// 1 cover
coverSlide("Session Superadvisor", "One leader session runs many Claude Code sessions, with guardrails and token telemetry built in.", "Agility IO  ·  Sen Agi", `color:${K.body}`);

// 2 problem
contentSlide("The problem", "Many sessions in parallel, one person watching them all", [
  ["FaUsers", "You are the bottleneck", "Every session asks for approval or direction. Step away and everything stops."],
  ["FaTriangleExclamation", "Stuck sessions go unseen", "A permission prompt open since noon, a lane looping on one error — unnoticed until evening."],
  ["FaFire", "Long sessions burn tokens", "Each turn re-reads the whole context. The longer the session, the pricier every question."],
].map(([i, t, d], k) => { const x = 0.7 + k * 4.05, y = 2.55; return card(x, y, 3.75, 3.9) + iconCircle(x + 0.4, y + 0.4, 0.95, i) + text(x + 0.4, y + 1.6, 2.95, 0.8, 20, `font-weight:700;color:${K.ink}`, esc(t)) + text(x + 0.4, y + 2.45, 2.95, 1.25, 15, `color:${K.body};line-height:1.35`, esc(d)); }).join(""));

// 3 statement
n++;
slides.push(`<section style="background:${GRAD}">
  ${box(0.9, 1.6, 11.5, 2.6, "display:flex;align-items:flex-end;font-size:48pt;font-weight:700;color:#fff;line-height:1.1", "You talk to one session. The others report to it.")}
  ${text(0.9, 4.5, 10.8, 1.6, 22, "color:#fff;line-height:1.35", "The leader assigns work, unblocks lanes and merges within the limits you set. You decide product, production and permissions.")}
</section>`);

// 4 architecture
{
  const node = (x, y, w, h, t, sub, kind) => {
    const dark = kind === "owner" || kind === "lead";
    const bg = kind === "owner" ? K.purple : kind === "lead" ? K.ink : "#fff";
    const bd = kind === "guard" ? `2px solid ${K.blue}` : `1px solid ${dark ? bg : K.line}`;
    return box(x, y, w, h, `background:${bg};border:${bd};box-shadow:0 2px 8px rgba(10,38,48,.08);padding:0 .2in;box-sizing:border-box`, twoLine(t, sub, 16, 12, dark ? "#fff" : K.ink, dark ? K.line : K.body));
  };
  const L = (x1, y1, x2, y2, dash, head = true) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${K.body}" stroke-width=".018" ${dash ? 'stroke-dasharray=".08 .06"' : ""} ${head ? 'marker-end="url(#a)"' : ""}/>`;
  const svg = `<svg style="position:absolute;left:0;top:0" width="13.333in" height="7.5in" viewBox="0 0 13.333 7.5"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K.body}"/></marker></defs>
    ${L(2.7, 4.35, 3.4, 4.35)}${L(5.9, 4.1, 6.7, 2.73)}${L(5.9, 4.35, 6.7, 4.35)}${L(5.9, 4.6, 6.7, 5.85)}${L(9.2, 2.73, 10.0, 3.03)}${L(9.2, 4.35, 10.0, 3.35)}${L(9.2, 5.85, 10.0, 3.5)}${L(11.3, 3.8, 11.3, 4.6)}
    ${L(11.3, 5.5, 11.3, 6.65, 1, 0)}${L(11.3, 6.65, 4.65, 6.65, 1, 0)}${L(4.65, 6.65, 4.65, 6.45, 1)}${L(4.65, 5.6, 4.65, 4.85, 1)}</svg>`;
  const lbl = (x, y, w, t) => text(x, y, w, 0.3, 11, `font-weight:700;color:${K.purple}`, t);
  contentSlide("How it works", "Leader, lanes, brains and guardrails", svg +
    node(0.7, 3.85, 2.0, 1.0, "Owner", "on the phone", "owner") + node(3.4, 3.85, 2.5, 1.0, "Leader session", "tmux + Remote Control", "lead") +
    node(6.7, 2.3, 2.5, 0.85, "Lane: small", "sonnet") + node(6.7, 3.93, 2.5, 0.85, "Lane: medium", "sonnet + opus review") + node(6.7, 5.45, 2.5, 0.8, "Lane: hard bug", "opus") +
    node(10.0, 2.9, 2.6, 0.9, "Hooks", "every tool call", "guard") + node(10.0, 4.6, 2.6, 0.9, "Token metrics", "kit-stats", "guard") + node(3.4, 5.6, 2.5, 0.85, "Brains", "patrol · reports") +
    lbl(2.72, 4.45, 0.7, "Remote") + lbl(6.5, 6.72, 1.5, "metrics") + lbl(4.75, 5.05, 1.5, "stuck? alert"));
}

// 5 roles
contentSlide("How it works", "Four roles, each knows what is not its job", table(0.7, 2.45, [1.9, 5.6, 4.4], 0.75, 16, [
  ["Role", "Does", "Never does"],
  ["Owner", "Decides product; approves merges, production, permissions", "Hand-feed work to each lane"],
  ["Leader", "Splits the backlog, writes briefs, opens lanes, unblocks, merges within limits", "Write large blocks of code itself"],
  ["Lane", "One card, one worktree, one PR", "Merge or change permissions — the owner-guard hook blocks it"],
  ["Brains", "15-minute patrol, nightly review, morning report", "Become a second chat channel"],
], { cell: (j) => (j === 0 ? `font-weight:700;color:${K.purple}` : "") }));

// 6 loop
contentSlide("How it works", "The leader’s loop, after every event", [
  ["FaWrench", "1. Unblock first", "Rewrite the brief narrower, reopen the lane."],
  ["FaCircleCheck", "2. Merge ready PRs", "Only within the owner’s limits; ask the rest."],
  ["FaPaperPlane", "3. Assign idle lanes", "Two lanes never edit the same files."],
  ["FaBroom", "4. Clean up", "Close the lane, drop the merged worktree."],
  ["FaComments", "5. Report briefly", "Five lines at most, only when something changed."],
  ["FaClock", "Never just wait", "Waiting on review? Give another lane work."],
].map(([i, t, d], k) => {
  const x = 0.7 + (k % 2) * 6.05, y = 2.4 + Math.floor(k / 2) * 1.5, last = k === 5;
  return card(x, y, 5.85, 1.3, last ? `background:${K.ink};border-color:${K.ink}` : "") + iconCircle(x + 0.25, y + 0.25, 0.8, i) +
    box(x + 1.3, y, 4.35, 1.3, "", twoLine(t, d, 18, 14, last ? "#fff" : K.ink, last ? K.line : K.body));
}).join(""));

// 7 agents
contentSlide("Saving tokens", "Clear work goes to cheap models, hard work to strong ones",
  table(0.7, 2.45, [1.7, 1.6, 4.3], 0.62, 16, [
    ["Agent", "Model", "When"], ["scout", "haiku", "Find files, look things up, summarize code"], ["builder", "sonnet", "Known-cause changes across 1–5 files"],
    ["tester", "sonnet", "Write and fix tests"], ["reviewer", "opus", "One review round before the PR"], ["debugger", "opus", "Unknown root cause, a test red twice"],
  ], { cell: (j) => (j === 0 ? "font-weight:700" : j === 1 ? `color:${K.blue}` : "") }) +
  card(8.8, 2.45, 3.8, 3.72) + iconCircle(9.2, 2.85, 0.9, "FaShieldHalved") +
  box(9.2, 3.95, 3.0, 2.0, "", `<b style="font-size:18pt;color:${K.ink}">Pinned, not chosen on the fly</b><p style="font-size:15pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Each agent pins its model. The agent-routing hook rejects model overrides at call time.</p>`) +
  text(0.7, 6.4, 8.0, 0.4, 13, `color:${K.body}`, "Kit price table (input/output, USD per 1M tokens): sonnet ≈ 2× haiku, opus ≈ 4× haiku."));

// 8 guards
contentSlide("Saving tokens", "Guardrails live in hooks, not in promises",
  table(0.7, 2.4, [2.9, 5.6, 3.4], 0.52, 15, [
    ["Hook", "Does", "Threshold"], ["turn-guard", "Denies long builder/tester runs (Read, Grep still pass)", "Warn 60 & 90, deny from 130"], ["agent-routing", "Denies model overrides and generic agents", "Every Agent call"],
    ["test-budget", "Denies whole-suite test runs", "Unless FULL_SUITE_OK=1"], ["owner-guard", "Denies lane merges, shared-branch pushes, settings writes", "In lanes (KIT_LANE=1)"],
    ["metrics-subagent", "Logs only — tokens per subagent run", "Each subagent stop"], ["metrics-main", "Logs only — main-session tokens per model", "Each Stop"],
  ], { cell: (j) => "background:#fff;" + (j === 0 ? "font-weight:700" : "") }) +
  text(0.7, 6.45, 11.9, 0.5, 14, `color:${K.body}`, "Six hooks: four deny (in auto mode, with guidance instead of a prompt), two only log. Lanes compact at 200k tokens and close after each card."), true);

// 9 telemetry
contentSlide("Saving tokens", "Measure the main session, not just subagents", [
  ["~70%", "of tokens are spent in the main session — the part nobody measured before", "FaGaugeHigh"],
  ["153 → 0", "subagent runs over 100 turns per week, after turning on turn-guard", "FaChartColumn"],
].map(([b, l, i], k) => { const x = 0.7 + k * 6.05; return card(x, 2.45, 5.85, 3.5) + iconCircle(x + 0.45, 2.85, 0.8, i) + text(x + 0.45, 3.75, 5, 1.1, 60, `font-weight:700;color:${K.purple};line-height:1.1`, esc(b)) + text(x + 0.45, 4.85, 5, 0.9, 16, `color:${K.body};line-height:1.35`, esc(l)); }).join("") +
  text(0.7, 6.2, 11.9, 0.5, 12, `font-style:italic;color:${K.body}`, "How measured: events.jsonl token logs over several weeks on one internal project, anonymized · API list prices. Demo bench (bench/results.md, N=1, six cards): same pass rate, about 8% cheaper than a single Opus session."));

// 10 demo
contentSlide("Demo · sample project “Library loans”", "A six-card backlog, from small fixes to a hard bug",
  box(1.3, 3.14, 10.7, 0.02, `background:${K.line}`) + [
    ["FaPlay", "Start the leader", "superadvisor up; it shows on the phone"], ["FaMagnifyingGlass", "Size the backlog", "S, M or L; agents by tier"],
    ["FaCode", "Open two lanes", "Own brief and worktree each"], ["FaBell", "Patrol flags a lane", "Leader narrows the brief, reopens"],
    ["FaMobileScreen", "Approve on phone", "Owner approves; leader merges"], ["FaChartColumn", "Read the scorecard", "Tokens by model, main session"],
  ].map(([i, t, d], k) => { const cx = 0.7 + k * 2.0; return iconCircle(cx + 0.35, 2.6, 1.1, i) + box(cx + 1.15, 2.55, 0.4, 0.4, `background:${K.purple};color:#fff;font-size:14pt;font-weight:700;display:flex;align-items:center;justify-content:center`, k + 1) + text(cx, 3.95, 1.85, 0.75, 16, `font-weight:700;color:${K.ink}`, esc(t)) + text(cx, 4.7, 1.85, 1.1, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  `<img src="${poster}" style="position:absolute;left:.7in;top:5.85in;width:1.96in;height:1.1in;object-fit:cover;border:1px solid ${K.line};border-radius:4px" alt="Demo recording poster frame">` +
  box(.7, 5.85, 1.96, 1.1, "display:flex;align-items:center;justify-content:center", `<div style="width:.5in;height:.5in;border-radius:50%;background:rgba(10,38,48,.55);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:.14in solid #fff;border-top:.09in solid transparent;border-bottom:.09in solid transparent;margin-left:.04in"></div></div>`) +
  box(2.95, 5.85, 9.65, 1.1, "display:flex;flex-direction:column;justify-content:center", `<b style="font-size:16pt;color:${K.ink}">Demo recording (embedded in the PowerPoint)</b><p style="font-size:13pt;color:${K.body};margin:6pt 0 0;line-height:1.35">One minute: problem → architecture → init → up → lane → PR → merge → close (card C3) → benchmark. File: docs/talk/src/assets/agikit-demo.mp4</p>`));

// 11 try it
contentSlide("Try it", "Install in five minutes",
  box(0.7, 2.45, 7.9, 2.4, `background:${K.ink};color:#fff;font-family:'Courier New',monospace;font-size:13pt;padding:.25in .35in;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:6pt`,
    ["git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", "claude plugin marketplace add ./AgiAgentKit", "claude plugin install agi-agent-kit@agi-agent-kit", "AgiAgentKit/bin/superadvisor init /path/to/project", "AgiAgentKit/bin/superadvisor up /path/to/project"].map((l) => `<div>${l}</div>`).join("")) +
  card(9.0, 2.45, 3.6, 2.4) + box(9.3, 2.6, 3.0, 2.1, "", `<b style="font-size:18pt;color:${K.ink}">Includes</b><p style="font-size:14pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Five tiered agents, six hooks, the superadvisor CLI, a sample app with a six-card backlog, and a benchmark.</p>`) +
  text(0.7, 5.2, 11.9, 0.4, 15, `color:${K.body}`, "AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license") +
  text(0.7, 5.65, 11.9, 0.4, 15, `color:${K.body}`, "Read after the talk:  docs/talk/handout.html  ·  cheatsheet.html  ·  qa.html"), true);

// 12 thanks
coverSlide("Thank you", "Questions?  One leader, many lanes, guardrails in hooks — and measure everything.",
  `<a href="https://www.agilityio.com/" style="color:${K.purple};font-weight:700;text-decoration:none">agilityio.com</a>`, "");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Session Superadvisor</title><style>
@page { size: 13.333in 7.5in; margin: 0 }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact }
html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif }
section { position: relative; width: 13.333in; height: 7.5in; overflow: hidden; page-break-after: always; break-after: page }
section:last-child { page-break-after: auto; break-after: auto }
table { border-collapse: collapse; color: ${K.ink} }
th { background: ${K.purple}; color: #fff; text-align: left; font-weight: 700 }
th, td { border: 1px solid ${K.line}; padding: .06in .15in; vertical-align: middle; box-sizing: border-box }
</style></head><body>${slides.join("\n")}</body></html>`;
fs.writeFileSync(HTML, html);
execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${PDF}`, "file://" + HTML], { stdio: "ignore" });
console.log("wrote " + PDF + " (" + slides.length + " pages)");
