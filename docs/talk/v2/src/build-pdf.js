// Same deck as build.js (V2), rendered as HTML (inches, same coordinates) and printed to PDF by headless Chrome.
// Run: NODE_PATH=./node_modules node build-pdf.js   (writes ../Session-Superadvisor-V2-AgilityIO.pdf)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const HTML = path.join(__dirname, "deck-print.html");
const PDF = path.join(__dirname, "..", "Session-Superadvisor-V2-AgilityIO.pdf");
const ASSETS = path.join(__dirname, "..", "..", "src", "assets"); // shared with V1
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
const table = (x, y, colW, rowH, pt, rows, opts = {}) => {
  const cols = colW.map((w) => `<col style="width:${w}in">`).join("");
  const head = rows[0].map((c) => `<th>${esc(c)}</th>`).join("");
  const body = rows.slice(1).map((r) => "<tr>" + r.map((c, j) => `<td style="${opts.cell ? opts.cell(j) : ""}">${esc(c)}</td>`).join("") + "</tr>").join("");
  return `<table style="position:absolute;left:${x}in;top:${y}in;width:${colW.reduce((a, b) => a + b, 0)}in;table-layout:fixed;font-size:${pt}pt"><colgroup>${cols}</colgroup><tr style="height:${rowH}in">${head}</tr>${body.replace(/<tr>/g, `<tr style="height:${rowH}in">`)}</table>`;
};

// 1 cover
coverSlide("Session Superadvisor V2", "Lanes that open safely, report back by themselves and clean up after the card.", "Agility IO  ·  Sen Agi  ·  kit updates 25–27 Nov", `color:${K.body}`);

// 2 problem (recap)
contentSlide("Recap from V1", "Many sessions in parallel, one person watching them all", [
  ["FaUsers", "You are the bottleneck", "Every session asks for approval or direction. Step away and everything stops."],
  ["FaTriangleExclamation", "Stuck sessions go unseen", "A permission prompt open since noon, a lane looping on one error — unnoticed until evening."],
  ["FaFire", "Long sessions burn tokens", "Each turn re-reads the whole context. The longer the session, the pricier every question."],
].map(([i, t, d], k) => { const x = 0.7 + k * 4.05, y = 2.55; return card(x, y, 3.75, 3.9) + iconCircle(x + 0.4, y + 0.4, 0.95, i) + text(x + 0.4, y + 1.6, 2.95, 0.8, 20, `font-weight:700;color:${K.ink}`, esc(t)) + text(x + 0.4, y + 2.45, 2.95, 1.25, 15, `color:${K.body};line-height:1.35`, esc(d)); }).join(""));

// 3 architecture (recap)
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
  contentSlide("Recap from V1", "You talk to one leader; lanes report to it", svg +
    node(0.7, 3.85, 2.0, 1.0, "Owner", "on the phone", "owner") + node(3.4, 3.85, 2.5, 1.0, "Leader session", "tmux + Remote Control", "lead") +
    node(6.7, 2.3, 2.5, 0.85, "Lane: C3 (medium)", "sonnet + opus review") + node(6.7, 3.93, 2.5, 0.85, "Lane: C4 (medium)", "sonnet + opus review") + node(6.7, 5.45, 2.5, 0.8, "Lane: C6 (hard)", "opus") +
    node(10.0, 2.9, 2.6, 0.9, "Hooks", "every tool call", "guard") + node(10.0, 4.6, 2.6, 0.9, "Token metrics", "kit-stats", "guard") + node(3.4, 5.6, 2.5, 0.85, "Brains", "patrol · reports") +
    lbl(2.72, 4.45, 0.7, "Remote") + lbl(6.5, 6.72, 1.5, "metrics") + lbl(4.75, 5.05, 1.5, "stuck? alert"));
}

// 4 V1 -> V2
contentSlide("What's new", "V1 → V2: what changed", table(0.7, 2.35, [2.4, 4.0, 5.5], 0.56, 14, [
  ["Topic", "V1", "V2"],
  ["Opening a lane", "Opens whenever the leader asks", "Load gate first: kit-load says OK, WARN or STOP"],
  ["Done or stuck?", "15-minute patrol reads the screen", "Lane hooks push events; a 60 s watcher tells the leader, then escalates"],
  ["After the card", "Close the lane, remove the merged worktree", "Reuse the idle lane (pool of 3); worktrees removed only when safe"],
  ["What a lane loads", "Same context as the leader", "Lane role: safe context only, hard denies against role escape"],
  ["Merging", "Owner approves every merge", "Leader merges into epic/* when the gate passes and review shows High 0 · Critical 0"],
  ["The spec", "A written brief", "Brief plus a clickable prototype with mock data"],
], { cell: (j) => "background:#fff;" + (j === 0 ? `font-weight:700;color:${K.purple}` : j === 1 ? `color:${K.body}` : "") }) +
  note("The lane features ship in AgentAutoKit (agent-brains 0.11–0.14, kit 2.35–2.37). AgiAgentKit, the kit you can download for this talk, got the hook and cron fixes (slide 12).", 6.45, 0.5), true);

// 5 lane lifecycle
contentSlide("Lane lifecycle", "A lane’s life in five steps",
  box(1.3, 3.14, 10.5, 0.02, `background:${K.line}`) + [
    ["FaGaugeHigh", "1. Gate", "kit-load measures the machine before a lane opens."],
    ["FaUserShield", "2. Run in role", "Safe context only; hard denies against role escape."],
    ["FaBell", "3. Report back", "Hooks log events; a watcher tells the leader."],
    ["FaRecycle", "4. Reuse", "An idle lane takes the next brief; pool of 3."],
    ["FaBroom", "5. Clean up", "Heavy build folders go first; worktrees only when safe."],
  ].map(([i, t, d], k) => { const cx = 0.7 + k * 2.44; return iconCircle(cx + 0.35, 2.6, 1.1, i) + text(cx, 3.95, 2.2, 0.45, 18, `font-weight:700;color:${K.ink}`, esc(t)) + text(cx, 4.45, 2.1, 1.1, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  card(0.7, 5.8, 11.9, 0.85) + iconCircle(0.9, 5.92, 0.6, "FaLink") +
  box(1.75, 5.8, 10.6, 0.85, "", twoLine("Lanes from your own scripts: kit-tmux lanes adopt", "Registers a running tmux lane in the leader’s book so the watcher sees it. Leader only; checks name, socket and that the session is real.", 15, 12)));

// 6 load gate
contentSlide("1 · Load gate", "Measure the machine before opening a lane",
  table(0.7, 2.4, [2.5, 5.1], 0.52, 14, [
    ["kit-load measures", "Why it matters"],
    ["Free RAM %", "Every lane is a Claude Code session plus its tools"],
    ["Swap", "STOP only when free RAM < 30% or memory pressure is high"],
    ["Load per core", "Builds and tests in several lanes at once"],
    ["Free disk", "Under 40 GB the leader is told to sweep worktrees"],
    ["Booted simulators", "One iOS simulator at a time, shut down after use"],
    ["Idle Colima", "A Docker VM with no container still holds RAM"],
  ], { cell: (j) => (j === 0 ? "font-weight:700" : "") }) +
  card(8.8, 2.4, 3.8, 3.64) + iconCircle(9.2, 2.75, 0.9, "FaTrafficLight") +
  box(9.2, 3.8, 3.0, 2.1, "", `<b style="font-size:18pt;color:${K.ink}">OK · WARN · STOP</b><p style="font-size:14pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Exit 0, 1 or 2. STOP refuses lane-launch, lane-resume and --bare; opening the leader only warns. Override: --force-load, always logged.</p>`) +
  note("The same probe feeds lead-patrol. A load-hint hook adds context before lanes reuse and session resume; it never blocks.", 6.4, 0.4));

// 7 report back
contentSlide("2 · Report back", "Lanes report to the leader by themselves",
  arrowsSvg([0, 1, 2].map((k) => { const x = 0.7 + k * 3.1 + 2.6; return [x + 0.05, 2.9, x + 0.45, 2.9]; }), "r") +
  [
    ["Lane hooks", "Stop · SessionEnd · idle", ""], ["lane-events.jsonl", "DONE IDLE WAITING EXIT LIMIT", ""],
    ["Watcher", "about every 60 s, one per leader", "guard"], ["Leader", "inbox + lead-nudge hook", "lead"],
  ].map(([t, d, k], i) => { const x = 0.7 + i * 3.1, lead = k === "lead"; return box(x, 2.4, 2.6, 1.0, `background:${lead ? K.ink : "#fff"};border:${k === "guard" ? `2px solid ${K.blue}` : `1px solid ${lead ? K.ink : K.line}`};box-shadow:0 2px 8px rgba(10,38,48,.08);padding:0 .2in;box-sizing:border-box`, twoLine(t, d, 16, 12, lead ? "#fff" : K.ink, lead ? K.line : K.body)); }).join("") +
  card(0.7, 3.85, 5.85, 2.35) + box(1.0, 4.0, 5.3, 2.05, "", `<b style="font-size:18pt;color:${K.ink}">What the watcher flags</b><ul style="font-size:14pt;color:${K.body};margin:6pt 0 0;padding-left:.25in;line-height:1.45">${["A new READY PR line", "IDLE for more than 10 minutes", "Stuck, or WAITING on a prompt", "DEAD or orphan; usage limit or auth"].map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`) +
  darkCard(6.75, 3.85, 5.85, 2.35) + box(7.05, 4.0, 5.3, 2.05, "", `<b style="font-size:18pt;color:#fff">Escalation</b><p style="font-size:14pt;color:${K.line};margin:6pt 0 0;line-height:1.4">Stuck, DEAD or WAITING for 15 min and still unhandled 15 min after the alert: an alert message, a line in owner-alerts.log, and patrol shows the job until it is resolved.</p>`) +
  note("Messages are marked unverified, never the owner’s words. An idle leader gets at most one typed line every 5 minutes.", 6.4, 0.4), true);

// 8 reuse and clean up
contentSlide("3 · Reuse and clean up", "Reuse lanes; clean up only what is safe", [
  ["FaRecycle", "kit-tmux lanes reuse <lane> <brief>", "Same repo and account. Enter only when the input holds exactly /clear; waits for idle, then types the brief."],
  ["FaLayerGroup", "Lane pool", "Before a new lane, the kit looks for an idle one with no open PR. Cap lane_pool, default 3; --new skips the pool."],
  ["FaBroom", "kit-wt-clean --self --light", "Before READY the lane drops heavy build folders. Never tracked files, never outside its own worktree."],
  ["FaHardDrive", "Leader sweeps when disk is low", "--sweep only under the 40 GB line. Only clean, pushed, unlocked worktrees no process uses; closed PRs stay."],
].map(([i, t, d], k) => { const x = 0.7 + (k % 2) * 6.05, y = 2.4 + Math.floor(k / 2) * 1.95; return card(x, y, 5.85, 1.75) + iconCircle(x + 0.25, y + 0.3, 0.8, i) + box(x + 1.3, y, 4.35, 1.75, "", twoLine(t, d, 17, 13)); }).join("") +
  note("Any error while checking keeps the worktree. Orphan lanes are flagged and the close command is printed, never run.", 6.4, 0.4));

// 9 roles
contentSlide("4 · Roles in kit-context", "Lane and leader load different context", table(0.7, 2.4, [2.4, 6.2, 3.3], 0.64, 14, [
  ["", "Lane · KIT_ROLE=lane", "Leader"],
  ["Loads", "Safe core + the app’s rules; lead_only files left out", "Everything (also the default when no role is set)"],
  ["Safety floor", "Files named safety, secret, security, tenant or permission always load", "Same"],
  ["Hard denies", "Merge, push to main, force, tag, deploy, edit settings, hooks or manifest", "—"],
  ["Anti-escape", "No git remote/config edits, no tmux or new lanes, no gh api writes, no credential reads", "—"],
  ["Lead-only commands", "Refused: the guard walks the process tree and fails closed", "Allowed"],
], { cell: (j) => "background:#fff;" + (j === 0 ? `font-weight:700;color:${K.purple}` : "") }) +
  note("Manifest .claude/context-roles.json (lead_only, safety, lane_deny). A broken manifest stops the lane from opening. Denies are a second net; the real lock is hooks plus branch protection.", 6.3, 0.6), true);

// 10 epic merge
contentSlide("5 · Gated merge into epic branches", "The leader merges into epic branches, behind a gate", [
  ["FaCodeBranch", "Base is epic/<slug>-<issue>", "Never the integration or a release branch."],
  ["FaUserCheck", "The right PR", "Not a draft, not from a fork, the project’s author."],
  ["FaCircleCheck", "Gate and Review on the same head", "Gate PASS and Review High 0 · Critical 0 for that sha."],
  ["FaFileShield", "Sensitive paths go to the owner", "Dot-folders, CLAUDE.md, scripts, hooks, settings, deploy, lockfiles."],
  ["FaRocket", "No deploy trigger", "Workflow on: keys checked on every branch involved."],
  ["FaToggleOn", "On by default, fails closed", "Epic lead-merge: off in CLAUDE.md turns it off; read errors count as off."],
].map(([i, t, d], k) => {
  const x = 0.7 + (k % 2) * 6.05, y = 2.4 + Math.floor(k / 2) * 1.5, last = k === 5;
  return (last ? darkCard(x, y, 5.85, 1.3) : card(x, y, 5.85, 1.3)) + iconCircle(x + 0.25, y + 0.25, 0.8, i) +
    box(x + 1.3, y, 4.35, 1.3, "", twoLine(t, d, 17, 14, last ? "#fff" : K.ink, last ? K.line : K.body));
}).join(""));

// 11 spec by prototype
contentSlide("6 · Spec by prototype", "Spec by prototype, before any code",
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

// 12 AgiAgentKit this week
contentSlide("7 · In AgiAgentKit this week", "What landed in the downloadable kit", [
  ["FaShieldHalved", "Hooks synced (#9)", "In lanes owner-guard also stops force, delete and tag pushes, releases, API merges and gh api writes. Quoted prose no longer trips it."],
  ["FaClock", "Cron and review (#2)", "cron --install: patrol every 15 min, review 22:00, report 08:00. launchd logs now go to ~/Library/Logs."],
  ["FaBookOpen", "Talk kit (#5–#8)", "ak-render skill, handout, Q&A, cheat sheet, isometric diagrams and the demo video inside the deck."],
].map(([i, t, d], k) => { const x = 0.7 + k * 4.05, y = 2.45; return card(x, y, 3.75, 3.75) + iconCircle(x + 0.4, y + 0.4, 0.9, i) + text(x + 0.4, y + 1.5, 2.95, 0.5, 19, `font-weight:700;color:${K.ink}`, esc(t)) + text(x + 0.4, y + 2.05, 2.95, 1.55, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  note("Hook tests: 164 pass. A named builder or tester is now only reminded by turn-guard, never blocked; test-budget catches whole-suite runs behind timeout, nice or sudo.", 6.4, 0.5));

// 13 demo (video in the pptx)
contentSlide("Demo · sample project “Library loans”", "A six-card backlog, from small fixes to a hard bug",
  box(1.3, 3.14, 10.7, 0.02, `background:${K.line}`) + [
    ["FaPlay", "Start the leader", "superadvisor up; it shows on the phone"], ["FaMagnifyingGlass", "Size the backlog", "S, M or L; agents by tier"],
    ["FaCode", "Open two lanes", "Own brief and worktree each"], ["FaBell", "Patrol flags a lane", "Leader narrows the brief, reopens"],
    ["FaMobileScreen", "Approve on phone", "Owner approves; leader merges"], ["FaChartColumn", "Read the scorecard", "Tokens by model, main session"],
  ].map(([i, t, d], k) => { const cx = 0.7 + k * 2.0; return iconCircle(cx + 0.35, 2.6, 1.1, i) + box(cx + 1.15, 2.55, 0.4, 0.4, `background:${K.purple};color:#fff;font-size:14pt;font-weight:700;display:flex;align-items:center;justify-content:center`, k + 1) + text(cx, 3.95, 1.85, 0.75, 16, `font-weight:700;color:${K.ink}`, esc(t)) + text(cx, 4.7, 1.85, 1.1, 14, `color:${K.body};line-height:1.35`, esc(d)); }).join("") +
  `<img src="${poster}" style="position:absolute;left:.7in;top:5.85in;width:1.96in;height:1.1in;object-fit:cover;border:1px solid ${K.line};border-radius:4px" alt="Demo recording poster frame">` +
  box(.7, 5.85, 1.96, 1.1, "display:flex;align-items:center;justify-content:center", `<div style="width:.5in;height:.5in;border-radius:50%;background:rgba(10,38,48,.55);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:.14in solid #fff;border-top:.09in solid transparent;border-bottom:.09in solid transparent;margin-left:.04in"></div></div>`) +
  box(2.95, 5.85, 9.65, 1.1, "display:flex;flex-direction:column;justify-content:center", `<b style="font-size:16pt;color:${K.ink}">Demo recording (embedded in the PowerPoint)</b><p style="font-size:13pt;color:${K.body};margin:6pt 0 0;line-height:1.35">One minute: problem → architecture → init → up → lane → PR → merge → close (card C3) → benchmark. File: docs/talk/src/assets/agikit-demo.mp4</p>`));

// 14 try it
contentSlide("Try it", "Install in about ten minutes",
  box(0.7, 2.45, 7.9, 2.4, `background:${K.ink};color:#fff;font-family:'Courier New',monospace;font-size:13pt;padding:.25in .35in;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:6pt`,
    ["git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", "claude plugin marketplace add ./AgiAgentKit", "claude plugin install agi-agent-kit@agi-agent-kit", "AgiAgentKit/bin/superadvisor init /path/to/project", "AgiAgentKit/bin/superadvisor up /path/to/project"].map((l) => `<div>${l}</div>`).join("")) +
  card(9.0, 2.45, 3.6, 2.4) + box(9.3, 2.6, 3.0, 2.1, "", `<b style="font-size:18pt;color:${K.ink}">Includes</b><p style="font-size:14pt;color:${K.body};margin:6pt 0 0;line-height:1.35">Five tiered agents, six hooks (four deny, two log only), the superadvisor CLI with cron, a sample app with a six-card backlog, and a benchmark.</p>`) +
  text(0.7, 5.2, 11.9, 0.4, 15, `color:${K.body}`, "AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license") +
  text(0.7, 5.65, 11.9, 0.4, 15, `color:${K.body}`, "Read after the talk:  docs/talk/v2/handout.html  ·  cheatsheet.html  ·  qa.html") +
  text(0.7, 6.1, 11.9, 0.4, 13, `font-style:italic;color:${K.body}`, "Lane gate, watcher, reuse, roles and epic merge: AgentAutoKit (agent-brains plugin)."), true);

// 15 thanks
coverSlide("Thank you", "Questions?  Gate the machine, let lanes report, reuse and clean up — and measure everything.",
  `<a href="https://www.agilityio.com/" style="color:${K.purple};font-weight:700;text-decoration:none">agilityio.com</a>`, "");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Session Superadvisor V2</title><style>
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
