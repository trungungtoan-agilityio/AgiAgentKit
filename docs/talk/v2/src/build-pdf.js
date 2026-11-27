// Same deck as build.js, rendered as HTML (inches, same coordinates) and printed to PDF by headless Chrome.
// Run: NODE_PATH=./node_modules node build-pdf.js   (writes ../Session-Superadvisor-V2-AgilityIO.pdf)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const HTML = path.join(__dirname, "deck-print.html");
const PDF = path.join(__dirname, "..", "Session-Superadvisor-V2-AgilityIO.pdf");
const ASSETS = path.join(__dirname, "..", "..", "src", "assets"); // shared logo, poster and demo recording
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const logo = "data:image/png;base64," + fs.readFileSync(path.join(ASSETS, "agility-logo.png")).toString("base64");
const poster = "data:image/png;base64," + fs.readFileSync(path.join(ASSETS, "demo-poster.png")).toString("base64");
const K = { ink: "#0A2630", body: "#425466", purple: "#5D38AC", blue: "#3C78E8", violet: "#983DCF", mist: "#F4F5F8", soft: "#EFEAFB", line: "#E1E5EC" };
const GRAD = `linear-gradient(135deg, ${K.violet}, ${K.blue})`;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ico = (n, c = K.purple) => ReactDOMServer.renderToStaticMarkup(React.createElement(fa[n], { color: c, size: "100%" }));

const box = (x, y, w, h, css, inner = "") => `<div style="position:absolute;left:${x}in;top:${y}in;width:${w}in;height:${h}in;${css}">${inner}</div>`;
const text = (x, y, w, h, pt, css, t) => box(x, y, w, h, `font-size:${pt}pt;${css}`, t);
const card = (x, y, w, h, css = "") => box(x, y, w, h, `background:#fff;border:1px solid ${K.line};box-shadow:0 2px 8px rgba(10,38,48,.08);${css}`);
const darkCard = (x, y, w, h) => card(x, y, w, h, `background:${K.ink};border-color:${K.ink}`);
const iconCircle = (x, y, d, n) => box(x, y, d, d, `background:${K.soft};border-radius:50%;`, `<div style="position:absolute;inset:${d * 0.26}in">${ico(n)}</div>`);
const twoLine = (t, sub, tp, sp, tc = K.ink, sc = K.body) => `<div style="display:flex;flex-direction:column;justify-content:center;height:100%"><b style="font-size:${tp}pt;color:${tc}">${esc(t)}</b><span style="font-size:${sp}pt;color:${sc};margin-top:4pt;line-height:1.3">${esc(sub)}</span></div>`;
const note = (t, y = 6.4, h = 0.5, pt = 12) => text(0.7, y, 11.9, h, pt, `font-style:italic;color:${K.body};line-height:1.35`, esc(t));
const arrowsSvg = (lines, id) => `<svg style="position:absolute;left:0;top:0" width="13.333in" height="7.5in" viewBox="0 0 13.333 7.5"><defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${K.body}"/></marker></defs>` +
  lines.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${K.body}" stroke-width=".018" marker-end="url(#${id})"/>`).join("") + "</svg>";

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
function statementSlide(title, lead) {
  n++;
  slides.push(`<section style="background:${GRAD}">
    ${box(0.9, 1.6, 11.5, 2.6, "display:flex;align-items:flex-end;font-size:48pt;font-weight:700;color:#fff;line-height:1.1", esc(title))}
    ${text(0.9, 4.5, 10.8, 1.6, 22, "color:#fff;line-height:1.35", esc(lead))}
  </section>`);
}
const table = (x, y, colW, rowH, pt, rows, opts = {}) => {
  const cols = colW.map((w) => `<col style="width:${w}in">`).join("");
  const head = rows[0].map((c) => `<th>${esc(c)}</th>`).join("");
  const body = rows.slice(1).map((r) => "<tr>" + r.map((c, j) => `<td style="${opts.cell ? opts.cell(j) : ""}">${esc(c)}</td>`).join("") + "</tr>").join("");
  return `<table style="position:absolute;left:${x}in;top:${y}in;width:${colW.reduce((a, b) => a + b, 0)}in;table-layout:fixed;font-size:${pt}pt"><colgroup>${cols}</colgroup><tr style="height:${rowH}in">${head}</tr>${body.replace(/<tr>/g, `<tr style="height:${rowH}in">`)}</table>`;
};

const tcell = (j) => "background:#fff;" + (j === 0 ? `font-weight:700;color:${K.purple}` : "");
const grid6 = (items, tp, sp) => items.map(([i, t, d], k) => {
  const x = 0.7 + (k % 2) * 6.05, y = 2.4 + Math.floor(k / 2) * 1.5, last = k === 5;
  return (last ? darkCard(x, y, 5.85, 1.3) : card(x, y, 5.85, 1.3)) + iconCircle(x + 0.25, y + 0.25, 0.8, i) +
    box(x + 1.3, y, 4.35, 1.3, "", twoLine(t, d, tp, sp, last ? "#fff" : K.ink, last ? K.line : K.body));
}).join("");

// 1 cover
coverSlide("Session Superadvisor", "One leader session runs many Claude Code lanes — with guardrails, token telemetry and lanes that report back and clean up.", "Agility IO  ·  Sen Agi", `color:${K.body}`);

// 2 problem
contentSlide("The problem", "Many sessions in parallel, one person watching them all", [
  ["FaUsers", "You are the bottleneck", "Every session asks for approval or direction. Step away and everything stops."],
  ["FaTriangleExclamation", "Stuck sessions go unseen", "A permission prompt open since noon, a lane looping on one error — unnoticed until evening."],
  ["FaFire", "Long sessions burn tokens", "Each turn re-reads the whole context. The longer the session, the pricier every question."],
].map(([i, t, d], k) => { const x = 0.7 + k * 4.05, y = 2.55; return card(x, y, 3.75, 3.9) + iconCircle(x + 0.4, y + 0.4, 0.95, i) + text(x + 0.4, y + 1.6, 2.95, 0.8, 20, `font-weight:700;color:${K.ink}`, esc(t)) + text(x + 0.4, y + 2.45, 2.95, 1.25, 15, `color:${K.body};line-height:1.35`, esc(d)); }).join(""));

// 3 statement
statementSlide("You talk to one session. The others report to it.", "The leader assigns work, unblocks lanes and merges within the limits you set. You decide product, production and permissions.");

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
  contentSlide("Architecture", "Owner, leader, lanes, brains, hooks and metrics", svg +
    node(0.7, 3.85, 2.0, 1.0, "Owner", "on the phone", "owner") + node(3.4, 3.85, 2.5, 1.0, "Leader session", "tmux + Remote Control", "lead") +
    node(6.7, 2.3, 2.5, 0.85, "Lane: C3 (medium)", "sonnet + opus review") + node(6.7, 3.93, 2.5, 0.85, "Lane: C4 (medium)", "sonnet + opus review") + node(6.7, 5.45, 2.5, 0.8, "Lane: C6 (hard)", "opus") +
    node(10.0, 2.9, 2.6, 0.9, "Hooks", "every tool call", "guard") + node(10.0, 4.6, 2.6, 0.9, "Token metrics", "kit-stats", "guard") + node(3.4, 5.6, 2.5, 0.85, "Brains", "patrol · reports") +
    lbl(2.72, 4.45, 0.7, "Remote") + lbl(6.5, 6.72, 1.5, "metrics") + lbl(4.75, 5.05, 1.5, "stuck? alert"));
}

// 5 roles
contentSlide("Roles", "Four roles, each knows what is not its job", table(0.7, 2.45, [1.9, 5.7, 4.3], 0.75, 16, [
  ["Role", "Does", "Never does"],
  ["Owner", "Decides product; approves merges to the integration branch, production, permissions", "Hand-feed work to each lane"],
  ["Leader", "Sizes the backlog, writes briefs, opens and reuses lanes, unblocks, merges within limits", "Write large blocks of code itself"],
  ["Lane", "One card, one worktree, one PR; loads only safe context; reports READY by itself", "Merge, push to main, release or change permissions — hooks block it"],
  ["Brains", "Patrol every 15 min, nightly review, morning report", "Become a second chat channel"],
], { cell: tcell }) + note("Lane and leader load different context (KIT_ROLE): a lane skips lead-only files, but safety and permission rules always load.", 6.45, 0.4, 13), true);

// 6 one card
contentSlide("One card", "One card, from brief to merge", [
  ["1", "Size it", "S (1–3 files): the leader does it. M or a hard bug: a lane."],
  ["2", "Write the brief", "Goal, files, the test command, what is out of scope."],
  ["3", "Open the lane", "Own worktree, branch lane/<card> and tmux session."],
  ["4", "Build and test", "Tiered agents; the brief's tests must be green."],
  ["5", "Open the PR", "Push, PR to the integration branch, a READY line, stop."],
  ["6", "Review", "One opus review round, two at most; no High or Critical left."],
  ["7", "Merge", "Owner says M 12, or the epic gate passes — same head only."],
  ["8", "Wrap up", "Lane reused or closed, worktree cleaned, five-line report."],
].map(([num, t, d], k) => {
  const x = 0.7 + (k % 4) * 3.025, y = 2.4 + Math.floor(k / 4) * 2.0, dark = k === 6;
  return (dark ? darkCard(x, y, 2.825, 1.8) : card(x, y, 2.825, 1.8)) +
    box(x + 0.25, y + 0.25, 0.45, 0.45, `background:${K.purple};color:#fff;font-size:15pt;font-weight:700;display:flex;align-items:center;justify-content:center`, num) +
    box(x + 0.85, y + 0.25, 1.775, 0.45, `display:flex;align-items:center;font-size:17pt;font-weight:700;color:${dark ? "#fff" : K.ink}`, esc(t)) +
    text(x + 0.25, y + 0.85, 2.325, 0.8, 13, `color:${dark ? K.line : K.body};line-height:1.3`, esc(d));
}).join("") + note("Demo card C3: superadvisor lane open c3 --brief c3.md → PR → owner answers M 12 → merge → lane close c3 --rm-worktree.", 6.45, 0.4));

// 7 leader loop
contentSlide("The leader", "The leader’s loop, after every event", grid6([
  ["FaWrench", "1. Unblock first", "Rewrite the brief narrower, reopen the lane."],
  ["FaCircleCheck", "2. Merge ready PRs", "Only within the owner’s limits; ask the rest."],
  ["FaPaperPlane", "3. Assign idle lanes", "Reuse an idle lane; two lanes never edit the same files."],
  ["FaBroom", "4. Clean up", "Close or reuse the lane, drop worktrees that are safe to drop."],
  ["FaComments", "5. Report briefly", "Five lines at most, only when something changed."],
  ["FaClock", "Never just wait", "Waiting on review? Give another lane work."],
], 18, 14), true);

// 8 lane lifecycle
contentSlide("Lane lifecycle", "A lane’s life in five steps",
  box(1.3, 3.14, 10.5, 0.02, `background:${K.line}`) + [
    ["FaGaugeHigh", "1. Gate", "Machine too full? The lane does not open."],
    ["FaUserShield", "2. Run in role", "Safe context only; it cannot act as the leader."],
    ["FaBell", "3. Report back", "A watcher tells the leader in about a minute."],
    ["FaRecycle", "4. Reuse", "An idle lane takes the next brief."],
    ["FaBroom", "5. Clean up", "Heavy build folders first; worktrees only when safe."],
  ].map(([i, t, d], k) => { const cx = 0.7 + k * 2.44; return iconCircle(cx + 0.35, 2.6, 1.1, i) + text(cx, 3.95, 2.2, 0.45, 18, `font-weight:700;color:${K.ink}`, esc(t)) + text(cx, 4.45, 2.1, 1.1, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  note("Thresholds, events, the lane pool and adopt for your own launcher scripts: see the handout.", 6.1, 0.4, 13));

// 9 hooks
contentSlide("Hooks", "Guardrails live in hooks, not in promises", table(0.7, 2.4, [2.5, 6.6, 2.8], 0.52, 14, [
  ["Hook", "Does", "Threshold"],
  ["turn-guard", "Denies long builder/tester runs (Read, Grep still pass)", "Warn 60 & 90, deny from 130"],
  ["agent-routing", "Denies model overrides and generic agents", "Every Agent call"],
  ["test-budget", "Denies whole-suite test runs, also behind timeout, nice or sudo", "Unless FULL_SUITE_OK=1"],
  ["owner-guard", "Denies merges, protected-branch, force, delete and tag pushes, releases, gh api writes, settings and hook edits", "In lanes"],
  ["metrics-subagent", "Logs only — tokens per subagent run", "Each subagent stop"],
  ["metrics-main", "Logs only — main-session tokens per model", "Each Stop"],
], { cell: (j) => "background:#fff;" + (j === 0 ? "font-weight:700" : "") }) +
  note("AgiAgentKit ships six hooks: four deny (with guidance, never a prompt in auto mode), two only log. Quoted prose in commit messages does not trip owner-guard.", 6.45, 0.5, 13), true);

// 10 model routing
contentSlide("Model routing", "Clear work goes to cheap models, hard work to strong ones",
  table(0.7, 2.45, [1.7, 1.6, 4.3], 0.62, 16, [
    ["Agent", "Model", "When"],
    ["scout", "haiku", "Find files, look things up, summarize code"],
    ["builder", "sonnet", "Known-cause changes across 1–5 files"],
    ["tester", "sonnet", "Write and fix tests"],
    ["reviewer", "opus", "One review round before the PR"],
    ["debugger", "opus", "Unknown root cause, a test red twice"],
  ], { cell: (j) => (j === 0 ? "font-weight:700" : j === 1 ? `color:${K.blue}` : "") }) +
  card(8.8, 2.45, 3.8, 3.72) + iconCircle(9.2, 2.85, 0.9, "FaShieldHalved") +
  box(9.2, 3.95, 3.0, 2.0, "", `<b style="font-size:18pt;color:${K.ink}">Pinned, not chosen on the fly</b><p style="font-size:15pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Each agent pins its model. The agent-routing hook rejects model overrides at call time.</p>`) +
  text(0.7, 6.4, 8.0, 0.4, 13, `color:${K.body}`, "Kit price table (input/output, USD per 1M tokens): sonnet ≈ 2× haiku, opus ≈ 4× haiku."));

// 11 measure
contentSlide("Measure everything", "Measure the main session, not just subagents", [
  ["~70%", "of tokens are spent in the main session — the part nobody measured", "FaGaugeHigh"],
  ["153 → 0", "subagent runs over 100 turns per week, after turning on turn-guard", "FaChartColumn"],
  ["6/6 · 92%", "benchmark: same pass rate at 92% of the cost of one Opus session", "FaScaleBalanced"],
].map(([num, d, i], k) => { const x = 0.7 + k * 4.05; return card(x, 2.45, 3.75, 3.5) + iconCircle(x + 0.4, 2.8, 0.8, i) + box(x + 0.4, 3.75, 3.1, 0.9, `display:flex;align-items:center;font-size:40pt;font-weight:700;color:${K.purple}`, esc(num)) + text(x + 0.4, 4.75, 3.0, 1.05, 15, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  text(0.7, 6.15, 11.9, 0.6, 12, `font-style:italic;color:${K.body};line-height:1.35`, "How measured: events.jsonl token logs on one internal project, anonymized · API list prices. Benchmark: bench/results.md, six demo cards, N = 1 per card, Sonnet leader + tiered agents vs one Opus session; wall time about the same."), true);

// 12 epic merge
contentSlide("Epic merge", "The leader merges into epic branches, behind a gate", grid6([
  ["FaCodeBranch", "Base is epic/<slug>-<issue>", "Never the integration or a release branch."],
  ["FaUserCheck", "The right PR", "Not a draft, not from a fork, the project’s author."],
  ["FaCircleCheck", "Gate and Review on the same head", "Gate PASS and Review High 0 · Critical 0 for that sha."],
  ["FaFileShield", "Sensitive paths go to the owner", "Dot-folders, CLAUDE.md, scripts, hooks, settings, deploy, lockfiles."],
  ["FaRocket", "No deploy trigger", "Workflow on: keys checked on every branch involved."],
  ["FaToggleOn", "On by default, fails closed", "Epic lead-merge: off in CLAUDE.md turns it off; read errors count as off."],
], 17, 14));

// 13 spec by prototype
contentSlide("Spec by prototype", "Spec by prototype, before any code",
  arrowsSvg([0, 1, 2, 3].map((k) => { const x = 0.7 + k * 2.44 + 2.15; return [x + 0.03, 3.225, x + 0.26, 3.225]; }), "p") +
  [
    ["FaBookOpen", "Guide", "Demo script + UAT"], ["FaMobileScreen", "App", "Phone frame, tabs"], ["FaDesktop", "Web", "Responsive, cart"],
    ["FaCashRegister", "Staff / POS", "Queue + scan"], ["FaChartLine", "Admin", "KPI, orders, audit"],
  ].map(([i, t, d], k) => { const x = 0.7 + k * 2.44, y = 2.45; return card(x, y, 2.15, 1.55) + iconCircle(x + 0.2, y + 0.2, 0.6, i) + box(x + 0.2, y + 0.85, 1.75, 0.6, "", `<b style="font-size:16pt;color:${K.ink}">${esc(t)}</b><div style="font-size:12pt;color:${K.body};margin-top:2pt">${esc(d)}</div>`); }).join("") +
  text(0.7, 4.15, 11.9, 0.35, 13, `font-style:italic;color:${K.body}`, "Sample flow in the template: order in App or Web → Staff queue → complete → Admin KPI and audit update.") +
  [
    ["FaFileCode", "One HTML file", "Copy the template, keep only the screens the feature needs, fill the TODO domain markers."],
    ["FaListCheck", "UAT checklist built in", "The Guide screen walks the demo script and ticks each acceptance step as you click."],
    ["FaMask", "Mock data only", "Made-up names and orders, never real data. Linked in the issue as the behavior spec."],
  ].map(([i, t, d], k) => { const x = 0.7 + k * 4.025, y = 4.75; return card(x, y, 3.85, 1.75) + iconCircle(x + 0.25, y + 0.25, 0.7, i) + box(x + 1.15, y + 0.2, 2.5, 1.35, "", `<b style="font-size:16pt;color:${K.ink}">${esc(t)}</b><p style="font-size:12pt;color:${K.body};margin:4pt 0 0;line-height:1.35">${esc(d)}</p>`); }).join(""), true);

// 14 demo (video in the pptx)
contentSlide("Demo · sample project “Library loans”", "A six-card backlog, from small fixes to a hard bug",
  box(1.3, 3.14, 10.7, 0.02, `background:${K.line}`) + [
    ["FaPlay", "Start the leader", "superadvisor up; it shows on the phone"], ["FaMagnifyingGlass", "Size the backlog", "S, M or L; agents by tier"],
    ["FaCode", "Open two lanes", "Own brief and worktree each"], ["FaBell", "Patrol flags a lane", "Leader narrows the brief, reopens"],
    ["FaMobileScreen", "Approve on phone", "Owner approves; leader merges"], ["FaChartColumn", "Read the scorecard", "Tokens by model, main session"],
  ].map(([i, t, d], k) => { const cx = 0.7 + k * 2.0; return iconCircle(cx + 0.35, 2.6, 1.1, i) + box(cx + 1.15, 2.55, 0.4, 0.4, `background:${K.purple};color:#fff;font-size:14pt;font-weight:700;display:flex;align-items:center;justify-content:center`, k + 1) + text(cx, 3.95, 1.85, 0.75, 16, `font-weight:700;color:${K.ink}`, esc(t)) + text(cx, 4.7, 1.85, 1.1, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  `<img src="${poster}" style="position:absolute;left:.7in;top:5.85in;width:1.96in;height:1.1in;object-fit:cover;border:1px solid ${K.line};border-radius:4px" alt="Demo recording poster frame">` +
  box(.7, 5.85, 1.96, 1.1, "display:flex;align-items:center;justify-content:center", `<div style="width:.5in;height:.5in;border-radius:50%;background:rgba(10,38,48,.55);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:.14in solid #fff;border-top:.09in solid transparent;border-bottom:.09in solid transparent;margin-left:.04in"></div></div>`) +
  box(2.95, 5.85, 9.65, 1.1, "display:flex;flex-direction:column;justify-content:center", `<b style="font-size:16pt;color:${K.ink}">Demo recording (embedded in the PowerPoint)</b><p style="font-size:13pt;color:${K.body};margin:6pt 0 0;line-height:1.35">One minute: problem → architecture → init → up → lane → PR → merge → close (card C3) → benchmark. File: docs/talk/src/assets/agikit-demo.mp4</p>`));

// 15 try it
contentSlide("Try it", "Install in about ten minutes",
  box(0.7, 2.45, 7.9, 2.6, `background:${K.ink};color:#fff;font-family:'Courier New',monospace;font-size:13pt;padding:.25in .35in;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:6pt`,
    ["git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", "claude plugin marketplace add ./AgiAgentKit", "claude plugin install agi-agent-kit@agi-agent-kit", "AgiAgentKit/bin/superadvisor init /path/to/project", "AgiAgentKit/bin/superadvisor up /path/to/project", "AgiAgentKit/bin/superadvisor cron --install --project /path/to/project"].map((l) => `<div>${l}</div>`).join("")) +
  card(9.0, 2.45, 3.6, 2.6) + box(9.3, 2.6, 3.0, 2.3, "", `<b style="font-size:18pt;color:${K.ink}">Includes</b><p style="font-size:14pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Five tiered agents, six hooks (four deny, two log only), the superadvisor CLI with cron, a sample app with a six-card backlog, and a benchmark.</p>`) +
  text(0.7, 5.35, 11.9, 0.4, 15, `color:${K.body}`, "AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license") +
  text(0.7, 5.8, 11.9, 0.4, 15, `color:${K.body}`, "Read after the talk:  docs/talk/v2/handout.html  ·  cheatsheet.html  ·  qa.html") +
  text(0.7, 6.25, 11.9, 0.4, 13, `font-style:italic;color:${K.body}`, "Load gate, watcher, lane reuse, roles, epic merge and the prototype template ship in AgentAutoKit (agent-brains plugin)."), true);

// 16 thanks
coverSlide("Thank you", "Questions?  One leader, lanes that gate, report and clean up, guardrails in hooks — and measure everything.",
  `<a href="https://www.agilityio.com/" style="color:${K.purple};font-weight:700;text-decoration:none">agilityio.com</a>`, "");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Session Superadvisor</title><style>
@page { size: 13.333in 7.5in; margin: 0 }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact }
html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif }
section { position: relative; width: 13.333in; height: 7.5in; overflow: hidden; page-break-after: always; break-after: page }
section:last-child { page-break-after: auto; break-after: auto }
table { border-collapse: collapse; color: ${K.ink} }
th { background: ${K.purple}; color: #fff; text-align: left; font-weight: 700 }
th, td { border: 1px solid ${K.line}; padding: .05in .15in; vertical-align: middle; box-sizing: border-box }
</style></head><body>${slides.join("\n")}</body></html>`;
fs.writeFileSync(HTML, html);
execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${PDF}`, require("url").pathToFileURL(HTML).href], { stdio: "ignore" });
console.log("wrote " + PDF + " (" + slides.length + " pages)");
