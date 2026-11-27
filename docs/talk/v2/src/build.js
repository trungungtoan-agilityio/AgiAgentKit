// Build "Session Superadvisor V2" (Agility IO internal talk) as a structured 16:9 PowerPoint deck.
// Run: NODE_PATH=./node_modules node build.js   (writes ../Session-Superadvisor-V2-AgilityIO.pptx)
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");
// Office theme writer from the Claude pptx skill; optional — without it the deck still builds
// but scheme colors fall back to Office defaults. Point APPLY_THEME at the skill's apply_theme.js.
const applyTheme = process.env.APPLY_THEME ? require(process.env.APPLY_THEME).applyTheme : async () => {};

const OUT = path.join(__dirname, "..", "Session-Superadvisor-V2-AgilityIO.pptx");
const ASSETS = path.join(__dirname, "..", "..", "src", "assets"); // shared with V1
const LOGO_SVG = path.join(ASSETS, "agility-logo.svg");

const THEME = {
  name: "Agility Superadvisor",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: "0A2630", lt1: "FFFFFF", dk2: "425466", lt2: "F4F5F8",
    accent1: "5D38AC", accent2: "3C78E8", accent3: "983DCF", accent4: "0A2630",
    accent5: "EFEAFB", accent6: "E1E5EC", hlink: "3C78E8", folHlink: "5D38AC",
  },
};
const HEX = THEME.colors; // for hex-only options (shadows, table borders)

async function png(svg, width) {
  const buf = await sharp(Buffer.from(svg)).resize({ width }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
async function icon(name, color = "#5D38AC") {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color, size: 256 }));
  return png(svg, 256);
}
function gradientSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#983DCF"/><stop offset="1" stop-color="#3C78E8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pres.title = "Session Superadvisor V2";
  pres.company = "Agility IO";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  const logo = await png(fs.readFileSync(LOGO_SVG), 1200);
  const gradTall = await png(gradientSvg(800, 1200), 800);
  const LOGO_RATIO = 27 / 111;

  // ---------- layouts ----------
  pres.defineSlideMaster({
    title: "Cover",
    background: { color: C.background1 },
    objects: [
      { image: { x: 8.6, y: 0, w: 4.733, h: 7.5, data: gradTall, sizing: { type: "cover", w: 4.733, h: 7.5 } } },
      { image: { x: 0.7, y: 0.6, w: 2.4, h: 2.4 * LOGO_RATIO, data: logo, altText: "Agility IO logo" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.1, w: 7.6, h: 1.5, fontSize: 54, bold: true, color: C.text1, valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 3.85, w: 7.4, h: 1.5, fontSize: 22, color: C.text2, valign: "top", margin: 0 }, text: "" } },
    ],
  });
  const contentObjects = () => [
    { image: { x: 11.0, y: 0.45, w: 1.65, h: 1.65 * LOGO_RATIO, data: logo, altText: "Agility IO logo" } },
    { placeholder: { options: { name: "kicker", type: "body", x: 0.7, y: 0.45, w: 9.5, h: 0.35, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.85, w: 10.0, h: 1.25, fontSize: 34, bold: true, color: C.text1, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "agilityio.com", options: { x: 0.7, y: 7.0, w: 3, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ];
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2 } });
  pres.defineSlideMaster({ title: "Content Mist", background: { color: C.background2 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2 } });

  const shadow = () => ({ type: "outer", color: HEX.dk1, opacity: 0.08, blur: 8, offset: 2, angle: 90 });
  const card = (s, x, y, w, h, name, dark = false) =>
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: dark ? C.text1 : C.background1 }, line: { color: dark ? C.text1 : C.accent6, width: 1 }, shadow: shadow(), objectName: name });
  const iconCircle = async (s, x, y, d, iconName, name) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent5 }, line: { type: "none" }, objectName: name + " circle" });
    const pad = d * 0.26;
    s.addImage({ data: await icon(iconName), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, altText: "", objectName: name + " icon" });
  };
  const content = (sec, kicker, title, mist = false) => {
    const s = pres.addSlide({ masterName: mist ? "Content Mist" : "Content", sectionTitle: sec });
    s.addText(kicker.toUpperCase(), { placeholder: "kicker" });
    s.addText(title, { placeholder: "title" });
    return s;
  };
  const note = (s, t, y = 6.4, h = 0.5, pt = 12) =>
    s.addText(t, { x: 0.7, y, w: 11.9, h, fontSize: pt, italic: true, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "footnote" });
  const twoLine = (s, x, y, w, h, t, sub, tp, sp, name, dark = false) =>
    s.addText([{ text: t, options: { fontSize: tp, bold: true, color: dark ? C.background1 : C.text1, breakLine: true } }, { text: sub, options: { fontSize: sp, color: dark ? C.accent6 : C.text2 } }],
      { x, y, w, h, margin: 0, valign: "middle", isTextBox: true, objectName: name });
  const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.accent1 } } });
  const tbl = (s, rows, opts) => s.addTable(rows, { fontFace: THEME.bodyFontFace, color: C.text1, border: { type: "solid", pt: 1, color: HEX.accent6 }, valign: "middle", ...opts });

  // ---------- 1. Opening (recap of V1) ----------
  pres.addSection({ title: "Opening" });
  let s = pres.addSlide({ masterName: "Cover", sectionTitle: "Opening" });
  s.addText("Session Superadvisor V2", { placeholder: "title" });
  s.addText("Lanes that open safely, report back by themselves and clean up after the card.", { placeholder: "body" });
  s.addText("Agility IO  ·  Sen Agi  ·  kit updates 25–27 Nov", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.text2, margin: 0, isTextBox: true, objectName: "byline" });
  s.addNotes("V2 of the Superadvisor talk. The first three slides recap V1 quickly; the rest is what changed between 25 and 27 November: how a lane opens, reports, gets reused and cleans up, plus role-scoped context, gated epic merges and specs written as prototypes.");

  s = content("Opening", "Recap from V1", "Many sessions in parallel, one person watching them all");
  const probs = [
    ["FaUsers", "You are the bottleneck", "Every session asks for approval or direction. Step away and everything stops."],
    ["FaTriangleExclamation", "Stuck sessions go unseen", "A permission prompt open since noon, a lane looping on one error — unnoticed until evening."],
    ["FaFire", "Long sessions burn tokens", "Each turn re-reads the whole context. The longer the session, the pricier every question."],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.05, y = 2.55, w = 3.75, h = 3.9;
    card(s, x, y, w, h, `problem card ${i + 1}`);
    await iconCircle(s, x + 0.4, y + 0.4, 0.95, probs[i][0], `problem ${i + 1}`);
    s.addText(probs[i][1], { x: x + 0.4, y: y + 1.6, w: w - 0.8, h: 0.8, fontSize: 20, bold: true, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `problem title ${i + 1}` });
    s.addText(probs[i][2], { x: x + 0.4, y: y + 2.45, w: w - 0.8, h: 1.25, fontSize: 15, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `problem text ${i + 1}` });
  }
  s.addNotes("Same three pains as V1. V1 answered them with one leader, many lanes and guardrails in hooks. V2 is about the second-order pains: the machine running out of RAM, lanes that finish without anyone noticing, and worktrees piling up on disk.");

  s = content("Opening", "Recap from V1", "You talk to one leader; lanes report to it");
  const node = (x, y, w, h, t, sub, kind, name) => {
    const fill = kind === "owner" ? C.accent1 : kind === "lead" ? C.text1 : C.background1;
    const line = kind === "guard" ? C.accent2 : kind ? fill : C.accent6;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: kind === "guard" ? 2 : 1 }, shadow: shadow(), objectName: name + " box" });
    const dark = kind === "owner" || kind === "lead";
    twoLine(s, x + 0.2, y, w - 0.4, h, t, sub, 16, 12, name + " label", dark);
  };
  const arrow = (x, y, w, h, opts = {}) =>
    s.addShape(pres.shapes.LINE, { x, y, w, h, flipV: !!opts.up, line: { color: C.text2, width: 1.5, endArrowType: opts.noHead ? undefined : "triangle", dashType: opts.dash ? "dash" : "solid" }, objectName: opts.name || "connector" });
  const lbl = (x, y, w, t) => s.addText(t, { x, y, w, h: 0.3, fontSize: 11, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "label " + t });
  node(0.7, 3.85, 2.0, 1.0, "Owner", "on the phone", "owner", "owner");
  node(3.4, 3.85, 2.5, 1.0, "Leader session", "tmux + Remote Control", "lead", "leader");
  node(6.7, 2.3, 2.5, 0.85, "Lane: C3 (medium)", "sonnet + opus review", "", "lane c3");
  node(6.7, 3.93, 2.5, 0.85, "Lane: C4 (medium)", "sonnet + opus review", "", "lane c4");
  node(6.7, 5.45, 2.5, 0.8, "Lane: C6 (hard)", "opus", "", "lane c6");
  node(10.0, 2.9, 2.6, 0.9, "Hooks", "every tool call", "guard", "hooks");
  node(10.0, 4.6, 2.6, 0.9, "Token metrics", "kit-stats", "guard", "metrics");
  node(3.4, 5.6, 2.5, 0.85, "Brains", "patrol · reports", "", "brains");
  arrow(2.7, 4.35, 0.7, 0, { name: "owner to leader" }); lbl(2.72, 4.45, 0.7, "Remote");
  arrow(5.9, 2.73, 0.8, 1.37, { up: true, name: "leader to small" });
  arrow(5.9, 4.35, 0.8, 0, { name: "leader to medium" });
  arrow(5.9, 4.6, 0.8, 1.25, { name: "leader to hard" });
  arrow(9.2, 2.73, 0.8, 0.3, { name: "small to hooks" });
  arrow(9.2, 3.35, 0.8, 1.0, { up: true, name: "medium to hooks" });
  arrow(9.2, 3.5, 0.8, 2.35, { up: true, name: "hard to hooks" });
  arrow(11.3, 3.8, 0, 0.8, { name: "hooks to metrics" });
  arrow(11.3, 5.5, 0, 1.15, { dash: true, noHead: true, name: "metrics down" });
  arrow(4.65, 6.65, 6.65, 0, { dash: true, noHead: true, name: "metrics across" });
  arrow(4.65, 6.45, 0, 0.2, { dash: true, up: true, name: "metrics to brains" });
  lbl(6.5, 6.72, 1.5, "metrics");
  arrow(4.65, 4.85, 0, 0.75, { dash: true, up: true, name: "brains to leader" });
  lbl(4.75, 5.05, 1.5, "stuck? alert");
  s.addNotes("The V1 picture, unchanged: the owner talks only to the leader; the leader opens one lane per medium card or hard bug; every lane tool call passes through hooks; Brains patrols in the background. V2 changes what happens around each lane box on the right.");

  // ---------- 2. What's new ----------
  pres.addSection({ title: "What's new" });
  s = content("What's new", "What's new", "V1 → V2: what changed", true);
  const diffRows = [
    [hdr("Topic"), hdr("V1"), hdr("V2")],
    ["Opening a lane", "Opens whenever the leader asks", "Load gate first: kit-load says OK, WARN or STOP"],
    ["Done or stuck?", "15-minute patrol reads the screen", "Lane hooks push events; a 60 s watcher tells the leader, then escalates"],
    ["After the card", "Close the lane, remove the merged worktree", "Reuse the idle lane (pool of 3); worktrees removed only when safe"],
    ["What a lane loads", "Same context as the leader", "Lane role: safe context only, hard denies against role escape"],
    ["Merging", "Owner approves every merge", "Leader merges into epic/* when the gate passes and review shows High 0"],
    ["The spec", "A written brief", "Brief plus a clickable prototype with mock data"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? C.accent1 : j === 1 ? C.text2 : C.text1, fill: { color: C.background1 } } })));
  tbl(s, diffRows, { x: 0.7, y: 2.35, w: 11.9, colW: [2.4, 4.0, 5.5], fontSize: 14, rowH: 0.56, margin: [0.05, 0.15, 0.05, 0.15], objectName: "v1 v2 table" });
  note(s, "The lane features ship in AgentAutoKit (agent-brains 0.11–0.14, kit 2.35–2.37). AgiAgentKit, the kit you can download for this talk, got the hook and cron fixes (slide 12).", 6.45, 0.5, 12);
  s.addNotes("The whole talk on one slide. Left column is how V1 behaved, right column is V2. Each row gets its own slide next. Be clear about where the code lives: the lane features are in AgentAutoKit's agent-brains plugin; AgiAgentKit, the small downloadable kit, got hook and cron fixes this week.");

  s = content("What's new", "Lane lifecycle", "A lane’s life in five steps");
  const life = [
    ["FaGaugeHigh", "1. Gate", "kit-load measures the machine before a lane opens."],
    ["FaUserShield", "2. Run in role", "Safe context only; hard denies against role escape."],
    ["FaBell", "3. Report back", "Hooks log events; a watcher tells the leader."],
    ["FaRecycle", "4. Reuse", "An idle lane takes the next brief; pool of 3."],
    ["FaBroom", "5. Clean up", "Heavy build folders go first; worktrees only when safe."],
  ];
  s.addShape(pres.shapes.LINE, { x: 1.3, y: 3.15, w: 10.5, h: 0, line: { color: C.accent6, width: 2 }, objectName: "timeline" });
  for (let i = 0; i < 5; i++) {
    const cx = 0.7 + i * 2.44;
    await iconCircle(s, cx + 0.35, 2.6, 1.1, life[i][0], `life ${i + 1}`);
    s.addText(life[i][1], { x: cx, y: 3.95, w: 2.2, h: 0.45, fontSize: 18, bold: true, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `life title ${i + 1}` });
    s.addText(life[i][2], { x: cx, y: 4.45, w: 2.1, h: 1.1, fontSize: 14, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `life text ${i + 1}` });
  }
  card(s, 0.7, 5.8, 11.9, 0.85, "adopt card");
  await iconCircle(s, 0.9, 5.92, 0.6, "FaLink", "adopt");
  twoLine(s, 1.75, 5.8, 10.6, 0.85, "Lanes from your own scripts: kit-tmux lanes adopt", "Registers a running tmux lane in the leader’s book so the watcher sees it. Leader only; checks name, socket and that the session is real.", 15, 12, "adopt text");
  s.addNotes("The five steps one lane goes through in V2, each detailed on the next slides. The bottom box covers projects that open lanes with their own launcher: before adopt, the watcher saw zero lanes there. adopt writes the lane into the leader's book the same way lane-launch does and starts the watcher; it refuses calls from a lane, unknown sessions and odd names.");

  s = content("What's new", "1 · Load gate", "Measure the machine before opening a lane");
  const loadRows = [
    [hdr("kit-load measures"), hdr("Why it matters")],
    ["Free RAM %", "Every lane is a Claude Code session plus its tools"],
    ["Swap", "STOP only when free RAM < 30% or memory pressure is high"],
    ["Load per core", "Builds and tests in several lanes at once"],
    ["Free disk", "Under 40 GB the leader is told to sweep worktrees"],
    ["Booted simulators", "One iOS simulator at a time, shut down after use"],
    ["Idle Colima", "A Docker VM with no container still holds RAM"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: C.text1 } })));
  tbl(s, loadRows, { x: 0.7, y: 2.4, w: 7.6, colW: [2.5, 5.1], fontSize: 14, rowH: 0.52, margin: [0.05, 0.15, 0.05, 0.15], objectName: "load table" });
  card(s, 8.8, 2.4, 3.8, 3.64, "gate callout");
  await iconCircle(s, 9.2, 2.75, 0.9, "FaTrafficLight", "gate");
  s.addText([{ text: "OK · WARN · STOP", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Exit 0, 1 or 2. STOP refuses lane-launch, lane-resume and --bare; opening the leader only warns. Override: --force-load, always logged.", options: { fontSize: 14, color: C.text2 } }],
    { x: 9.2, y: 3.8, w: 3.0, h: 2.1, margin: 0, valign: "top", isTextBox: true, objectName: "gate text" });
  note(s, "The same probe feeds lead-patrol. A load-hint hook adds context before lanes reuse and session resume; it never blocks.", 6.4, 0.4, 12);
  s.addNotes("kit-load is one probe used in three places: the lane launcher gate, the leader's patrol and a hint hook. It returns 0, 1 or 2 for OK, WARN, STOP, with --json for scripts. Swap alone used to stop lanes too often, so swap now only stops when free RAM is under 30 percent or macOS reports memory pressure. --force-load exists for the owner and always writes a log line.");

  s = content("What's new", "2 · Report back", "Lanes report to the leader by themselves", true);
  const flow = [
    ["Lane hooks", "Stop · SessionEnd · idle", ""],
    ["lane-events.jsonl", "DONE IDLE WAITING EXIT LIMIT", ""],
    ["Watcher", "about every 60 s, one per leader", "guard"],
    ["Leader", "inbox + lead-nudge hook", "lead"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.7 + i * 3.1, y = 2.4, w = 2.6, h = 1.0, k = flow[i][2];
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: k === "lead" ? C.text1 : C.background1 }, line: { color: k === "guard" ? C.accent2 : k === "lead" ? C.text1 : C.accent6, width: k === "guard" ? 2 : 1 }, shadow: shadow(), objectName: `flow box ${i + 1}` });
    twoLine(s, x + 0.2, y, w - 0.4, h, flow[i][0], flow[i][1], 16, 12, `flow label ${i + 1}`, k === "lead");
    if (i < 3) s.addShape(pres.shapes.LINE, { x: x + w + 0.05, y: y + h / 2, w: 0.4, h: 0, line: { color: C.text2, width: 1.5, endArrowType: "triangle" }, objectName: `flow arrow ${i + 1}` });
  }
  card(s, 0.7, 3.85, 5.85, 2.35, "flags card");
  s.addText([
    { text: "What the watcher flags", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } },
    { text: "A new READY PR line", options: { fontSize: 14, color: C.text2, bullet: true, breakLine: true } },
    { text: "IDLE for more than 10 minutes", options: { fontSize: 14, color: C.text2, bullet: true, breakLine: true } },
    { text: "Stuck, or WAITING on a prompt", options: { fontSize: 14, color: C.text2, bullet: true, breakLine: true } },
    { text: "DEAD or orphan; usage limit or auth", options: { fontSize: 14, color: C.text2, bullet: true } },
  ], { x: 1.0, y: 4.0, w: 5.3, h: 2.05, margin: 0, valign: "top", paraSpaceAfter: 3, isTextBox: true, objectName: "flags text" });
  card(s, 6.75, 3.85, 5.85, 2.35, "escalation card", true);
  s.addText([
    { text: "Escalation", options: { fontSize: 18, bold: true, color: C.background1, breakLine: true } },
    { text: "Stuck, DEAD or WAITING for 15 min and still unhandled 15 min after the alert: an alert message, a line in owner-alerts.log, and patrol shows the job until it is resolved.", options: { fontSize: 14, color: C.accent6 } },
  ], { x: 7.05, y: 4.0, w: 5.3, h: 2.05, margin: 0, valign: "top", isTextBox: true, objectName: "escalation text" });
  note(s, "Messages are marked unverified, never the owner’s words. An idle leader gets at most one typed line every 5 minutes.", 6.4, 0.4, 12);
  s.addNotes("In V1 the leader learned about a lane from the 15-minute patrol or by running Monitor itself. In V2 the lane's own Stop, SessionEnd and idle hooks write one structured line per event: lane, account, project, type and the PR and sha from the READY line, never free text. A watcher per leader, locked with flock, reads it about every minute and delivers to an inbox that the lead-nudge hook reads. The watcher starts with lane-launch or lanes reuse and stops when the leader has no lanes.");

  s = content("What's new", "3 · Reuse and clean up", "Reuse lanes; clean up only what is safe");
  const reuse = [
    ["FaRecycle", "kit-tmux lanes reuse <lane> <brief>","Same repo and account. Enter only when the input holds exactly /clear; waits for idle, then types the brief."],
    ["FaLayerGroup", "Lane pool", "Before a new lane, the kit looks for an idle one with no open PR. Cap lane_pool, default 3; --new skips the pool."],
    ["FaBroom", "kit-wt-clean --self --light", "Before READY the lane drops heavy build folders. Never tracked files, never outside its own worktree."],
    ["FaHardDrive", "Leader sweeps when disk is low", "--sweep only under the 40 GB line. Only clean, pushed, unlocked worktrees no process uses; closed PRs stay."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.7 + (i % 2) * 6.05, y = 2.4 + Math.floor(i / 2) * 1.95, w = 5.85, h = 1.75;
    card(s, x, y, w, h, `reuse card ${i + 1}`);
    await iconCircle(s, x + 0.25, y + 0.3, 0.8, reuse[i][0], `reuse ${i + 1}`);
    twoLine(s, x + 1.3, y, w - 1.5, h, reuse[i][1], reuse[i][2], 17, 13, `reuse text ${i + 1}`);
  }
  note(s, "Any error while checking keeps the worktree. Orphan lanes are flagged and the close command is printed, never run.", 6.4, 0.4, 12);
  s.addNotes("One card, one lane was the V1 rule; V2 changes it to reuse an idle lane. reuse re-checks the lane's state before typing, presses Enter only when the prompt holds exactly /clear, waits until the lane is idle again and checks for open prompts at every step. Pool size comes from lane_pool in machine.json. Cleanup is split: the lane cleans its own heavy build folders before READY; the leader sweeps all worktrees only when free disk drops under the kit-load warn line. Every safety check fails toward keeping the worktree.");

  s = content("What's new", "4 · Roles in kit-context", "Lane and leader load different context", true);
  const roleRows = [
    [hdr(""), hdr("Lane · KIT_ROLE=lane"), hdr("Leader")],
    ["Loads", "Safe core + the app’s rules; lead_only files left out", "Everything (also the default when no role is set)"],
    ["Safety floor", "Files named safety, secret, security, tenant or permission always load", "Same"],
    ["Hard denies", "Merge, push to main, force, tag, deploy, edit settings, hooks or manifest", "—"],
    ["Anti-escape", "No git remote/config edits, no tmux or new lanes, no gh api writes, no credential reads", "—"],
    ["Lead-only commands", "Refused: the guard walks the process tree and fails closed", "Allowed"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? C.accent1 : C.text1, fill: { color: C.background1 } } })));
  tbl(s, roleRows, { x: 0.7, y: 2.4, w: 11.9, colW: [2.4, 6.2, 3.3], fontSize: 14, rowH: 0.64, margin: [0.05, 0.15, 0.05, 0.15], objectName: "roles table" });
  note(s, "Manifest .claude/context-roles.json (lead_only, safety, lane_deny). A broken manifest stops the lane from opening. Denies are a second net; the real lock is hooks plus branch protection.", 6.3, 0.6, 12);
  s.addNotes("KIT_ROLE splits what each session loads. With no role set the session is treated as a leader and loads everything, which is the safe default. A lane loads the safe core and the app's rules; files the manifest marks lead_only are left out, which saves context on every lane turn. Any file whose name says safety, secret, security, tenant or permission always loads. The anti-escape denies came from a review that found five ways a lane could act as a leader; lead-only commands now check the real process tree, not just environment variables.");

  s = content("What's new", "5 · Gated merge into epic branches", "The leader merges into epic branches, behind a gate");
  const merge = [
    ["FaCodeBranch", "Base is epic/<slug>-<issue>", "Never the integration or a release branch."],
    ["FaUserCheck", "The right PR", "Not a draft, not from a fork, the project’s author."],
    ["FaCircleCheck", "Gate and Review on the same head", "Gate PASS and Review High 0 · Critical 0 for that sha."],
    ["FaFileShield", "Sensitive paths go to the owner", "Dot-folders, CLAUDE.md, scripts, hooks, settings, deploy, lockfiles."],
    ["FaRocket", "No deploy trigger", "Workflow on: keys checked on every branch involved."],
    ["FaToggleOn", "On by default, fails closed", "Epic lead-merge: off in CLAUDE.md turns it off; read errors count as off."],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.7 + (i % 2) * 6.05, y = 2.4 + Math.floor(i / 2) * 1.5, w = 5.85, h = 1.3, last = i === 5;
    card(s, x, y, w, h, `merge card ${i + 1}`, last);
    await iconCircle(s, x + 0.25, y + 0.25, 0.8, merge[i][0], `merge ${i + 1}`);
    twoLine(s, x + 1.3, y, w - 1.5, h, merge[i][1], merge[i][2], 17, 14, `merge text ${i + 1}`, last);
  }
  s.addNotes("V1: the owner approves every merge. V2: inside an epic, slices merge into the epic branch without waiting for the owner, but only if every condition here holds on the exact head being merged. The integration branch and anything that deploys still need the owner. The switch is read from CLAUDE.md on the integration branch right after a fetch, and changing that line must be its own PR merged by the owner.");

  s = content("What's new", "6 · Spec by prototype", "Spec by prototype, before any code", true);
  const screens = [
    ["FaBookOpen", "Guide", "Demo script + UAT"],
    ["FaMobileScreen", "App", "Phone frame, tabs"],
    ["FaDesktop", "Web", "Responsive, cart"],
    ["FaCashRegister", "Staff / POS", "Queue + scan"],
    ["FaChartLine", "Admin", "KPI, orders, audit"],
  ];
  for (let i = 0; i < 5; i++) {
    const x = 0.7 + i * 2.44, y = 2.45, w = 2.15, h = 1.55;
    card(s, x, y, w, h, `screen card ${i + 1}`);
    await iconCircle(s, x + 0.2, y + 0.2, 0.6, screens[i][0], `screen ${i + 1}`);
    s.addText([{ text: screens[i][1], options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } }, { text: screens[i][2], options: { fontSize: 12, color: C.text2 } }],
      { x: x + 0.2, y: y + 0.85, w: w - 0.4, h: 0.6, margin: 0, valign: "top", isTextBox: true, objectName: `screen label ${i + 1}` });
    if (i < 4) s.addShape(pres.shapes.LINE, { x: x + w + 0.03, y: y + h / 2, w: 0.23, h: 0, line: { color: C.text2, width: 1.5, endArrowType: "triangle" }, objectName: `screen arrow ${i + 1}` });
  }
  s.addText("Sample flow in the template: order in App or Web → Staff queue → complete → Admin KPI and audit update.", { x: 0.7, y: 4.15, w: 11.9, h: 0.35, fontSize: 13, italic: true, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "prototype flow caption" });
  const proto = [
    ["FaFileCode", "One HTML file", "Copy the template, keep only the screens the feature needs, fill the TODO domain markers."],
    ["FaListCheck", "UAT checklist built in", "The Guide screen walks the demo script and ticks each acceptance step as you click."],
    ["FaMask", "Mock data only", "Made-up names and orders, never real data. Linked in the issue as the behavior spec."],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.025, y = 4.75, w = 3.85, h = 1.75;
    card(s, x, y, w, h, `prototype card ${i + 1}`);
    await iconCircle(s, x + 0.25, y + 0.25, 0.7, proto[i][0], `prototype ${i + 1}`);
    s.addText([{ text: proto[i][1], options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } }, { text: proto[i][2], options: { fontSize: 12, color: C.text2 } }],
      { x: x + 1.15, y: y + 0.2, w: w - 1.35, h: h - 0.4, margin: 0, valign: "top", isTextBox: true, objectName: `prototype text ${i + 1}` });
  }
  s.addNotes("New in the ui-prototype skill (AgentAutoKit 2.37.0): a multi-screen template. Before any production code, the lane builds one throwaway HTML file with the project's design tokens and made-up domain data. Five linked views: Guide with the demo script and a self-ticking UAT checklist, a phone App, a responsive Web, a Staff or POS queue and an Admin with KPI and audit. Keep only the screens the feature needs. The prototype is linked in the GitHub issue and becomes the behavior spec. Mock data only.");

  s = content("What's new", "7 · In AgiAgentKit this week", "What landed in the downloadable kit");
  const agi = [
    ["FaShieldHalved", "Hooks synced (#9)", "In lanes owner-guard also stops force, delete and tag pushes, releases, API merges and gh api writes. Quoted prose no longer trips it."],
    ["FaClock", "Cron and review (#2)", "cron --install: patrol every 15 min, review 22:00, report 08:00. launchd logs now go to ~/Library/Logs."],
    ["FaBookOpen", "Talk kit (#5–#8)", "ak-render skill, handout, Q&A, cheat sheet, isometric diagrams and the demo video inside the deck."],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.05, y = 2.45, w = 3.75, h = 3.75;
    card(s, x, y, w, h, `agi card ${i + 1}`);
    await iconCircle(s, x + 0.4, y + 0.4, 0.9, agi[i][0], `agi ${i + 1}`);
    s.addText(agi[i][1], { x: x + 0.4, y: y + 1.5, w: w - 0.8, h: 0.5, fontSize: 19, bold: true, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `agi title ${i + 1}` });
    s.addText(agi[i][2], { x: x + 0.4, y: y + 2.05, w: w - 0.8, h: 1.55, fontSize: 14, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `agi text ${i + 1}` });
  }
  note(s, "Hook tests: 164 pass. turn-guard now matches a named agent by its real type and only reminds; test-budget catches whole-suite runs behind timeout, nice or sudo.", 6.4, 0.5, 12);
  s.addNotes("AgiAgentKit is the small kit behind the demo; it does not include the AgentAutoKit lane features from the previous slides. This week it got the guard fixes ported from the big kit: owner-guard is stricter in lanes yet stops tripping on commit messages, the integration branch is protected through KIT_PROTECTED_BRANCHES set by lane open, and gh api in a lane is read-only. superadvisor cron installs patrol, nightly review and morning report; launchd logs moved out of protected folders because a log there made the job exit silently.");

  // ---------- 3. Demo ----------
  pres.addSection({ title: "Demo" });
  s = content("Demo", "Demo · sample project “Library loans”", "A six-card backlog, from small fixes to a hard bug");
  const steps = [
    ["FaPlay", "Start the leader", "superadvisor up; it shows on the phone"],
    ["FaMagnifyingGlass", "Size the backlog", "S, M or L; agents by tier"],
    ["FaCode", "Open two lanes", "Own brief and worktree each"],
    ["FaBell", "Patrol flags a lane", "Leader narrows the brief, reopens"],
    ["FaMobileScreen", "Approve on phone", "Owner approves; leader merges"],
    ["FaChartColumn", "Read the scorecard", "Tokens by model, main session"],
  ];
  s.addShape(pres.shapes.LINE, { x: 1.3, y: 3.15, w: 10.7, h: 0, line: { color: C.accent6, width: 2 }, objectName: "timeline" });
  for (let i = 0; i < 6; i++) {
    const cx = 0.7 + i * 2.0;
    await iconCircle(s, cx + 0.35, 2.6, 1.1, steps[i][0], `step ${i + 1}`);
    s.addText(`${i + 1}`, { x: cx + 1.15, y: 2.55, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: C.background1, fill: { color: C.accent1 }, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `step number ${i + 1}` });
    s.addText(steps[i][1], { x: cx, y: 3.95, w: 1.85, h: 0.75, fontSize: 16, bold: true, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `step title ${i + 1}` });
    s.addText(steps[i][2], { x: cx, y: 4.7, w: 1.85, h: 1.1, fontSize: 14, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `step text ${i + 1}` });
  }
  const posterData = "image/png;base64," + fs.readFileSync(path.join(ASSETS, "demo-poster.png")).toString("base64");
  s.addMedia({ type: "video", path: path.join(ASSETS, "agikit-demo.mp4"), cover: posterData, x: 0.7, y: 5.85, w: 1.96, h: 1.1, objectName: "demo video" });
  s.addText([
    { text: "Demo recording (embedded)", options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } },
    { text: "One minute: problem → architecture → init → up → lane → PR → merge → close (card C3) → benchmark. Plays in PowerPoint; file at docs/talk/src/assets/agikit-demo.mp4.", options: { fontSize: 13, color: C.text2 } },
  ], { x: 2.95, y: 5.85, w: 9.65, h: 1.1, margin: 0, valign: "middle", isTextBox: true, objectName: "demo caption" });
  s.addNotes("Same demo as V1, on AgiAgentKit and the sample library-loans app. The one-minute recording is embedded on this slide (lower left); click it to play in PowerPoint. The PDF shows the poster frame. The V2 lane features are not in this demo; they run in AgentAutoKit projects.");

  // ---------- 4. Closing ----------
  pres.addSection({ title: "Closing" });
  s = content("Closing", "Try it", "Install in about ten minutes", true);
  s.addText([
    { text: "git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin marketplace add ./AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin install agi-agent-kit@agi-agent-kit", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor init /path/to/project", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor up /path/to/project" },
  ], { x: 0.7, y: 2.45, w: 7.9, h: 2.4, fontFace: "Courier New", fontSize: 13, color: C.background1, fill: { color: C.text1 }, margin: [0.25, 0.35, 0.25, 0.35], valign: "middle", paraSpaceAfter: 6, isTextBox: true, objectName: "install commands" });
  card(s, 9.0, 2.45, 3.6, 2.4, "includes card");
  s.addText([{ text: "Includes", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Five tiered agents, six hooks (four deny, two log only), the superadvisor CLI with cron, a sample app with a six-card backlog, and a benchmark.", options: { fontSize: 14, color: C.text2 } }],
    { x: 9.3, y: 2.6, w: 3.0, h: 2.1, margin: 0, valign: "top", isTextBox: true, objectName: "includes text" });
  s.addText("AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license", { x: 0.7, y: 5.2, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "download line" });
  s.addText("Read after the talk:  docs/talk/v2/handout.html  ·  cheatsheet.html  ·  qa.html", { x: 0.7, y: 5.65, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "docs line" });
  s.addText("Lane gate, watcher, reuse, roles and epic merge: AgentAutoKit (agent-brains plugin).", { x: 0.7, y: 6.1, w: 11.9, h: 0.4, fontSize: 13, italic: true, color: C.text2, margin: 0, isTextBox: true, objectName: "autokit line" });
  s.addNotes("Install AgiAgentKit to try the leader, lanes, hooks and cron. The V2 lane features need AgentAutoKit with its agent-brains plugin. Needs Claude Code, tmux, jq, git, and Node 20 for the sample app.");

  s = pres.addSlide({ masterName: "Cover", sectionTitle: "Closing" });
  s.addText("Thank you", { placeholder: "title" });
  s.addText("Questions?  Gate the machine, let lanes report, reuse and clean up — and measure everything.", { placeholder: "body" });
  s.addText("agilityio.com", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.accent1, bold: true, margin: 0, isTextBox: true, hyperlink: { url: "https://www.agilityio.com/" }, objectName: "site link" });
  s.addNotes("Likely questions: can a lane merge into an epic branch by itself (no, the leader does, behind the gate); what if the machine is full (STOP refuses the lane, --force-load is logged); does reuse lose the old lane's context (yes, /clear first, on purpose).");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
