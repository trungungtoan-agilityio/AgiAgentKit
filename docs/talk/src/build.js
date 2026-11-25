// Build "Session Superadvisor" (Agility IO internal talk) as a structured 16:9 PowerPoint deck.
// Run: NODE_PATH=./node_modules node build.js
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

const OUT = path.join(__dirname, "Session-Superadvisor-AgilityIO.pptx");
const LOGO_SVG = path.join(__dirname, "assets", "agility-logo.svg");

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
  pres.title = "Session Superadvisor";
  pres.company = "Agility IO";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  const logo = await png(fs.readFileSync(LOGO_SVG), 1200);
  const gradWide = await png(gradientSvg(1600, 900), 1600);
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
  pres.defineSlideMaster({
    title: "Statement",
    background: { color: C.accent1 },
    objects: [
      { image: { x: 0, y: 0, w: 13.333, h: 7.5, data: gradWide, sizing: { type: "cover", w: 13.333, h: 7.5 } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 1.6, w: 11.5, h: 2.6, fontSize: 48, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.9, y: 4.5, w: 10.8, h: 1.6, fontSize: 22, color: C.background1, valign: "top", margin: 0 }, text: "" } },
    ],
  });
  const contentObjects = (bg) => [
    { image: { x: 11.0, y: 0.45, w: 1.65, h: 1.65 * LOGO_RATIO, data: logo, altText: "Agility IO logo" } },
    { placeholder: { options: { name: "kicker", type: "body", x: 0.7, y: 0.45, w: 9.5, h: 0.35, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.85, w: 10.0, h: 1.25, fontSize: 34, bold: true, color: C.text1, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "agilityio.com", options: { x: 0.7, y: 7.0, w: 3, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ];
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2 } });
  pres.defineSlideMaster({ title: "Content Mist", background: { color: C.background2 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2 } });

  const shadow = () => ({ type: "outer", color: HEX.dk1, opacity: 0.08, blur: 8, offset: 2, angle: 90 });
  const card = (s, x, y, w, h, name) =>
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.background1 }, line: { color: C.accent6, width: 1 }, shadow: shadow(), objectName: name });
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

  // ---------- 1. Opening ----------
  pres.addSection({ title: "Opening" });
  let s = pres.addSlide({ masterName: "Cover", sectionTitle: "Opening" });
  s.addText("Session Superadvisor", { placeholder: "title" });
  s.addText("One leader session runs many Claude Code sessions, with guardrails and token telemetry built in.", { placeholder: "body" });
  s.addText("Agility IO  ·  Sen Agi", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.text2, margin: 0, isTextBox: true, objectName: "byline" });
  s.addNotes("Opening: today is about how to coordinate several Claude Code sessions at once. Every demo runs on a sample project that anyone can download and run again.");

  s = content("Opening", "The problem", "Many sessions in parallel, one person watching them all");
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
  s.addNotes("Three pains once you run three or more sessions. Ask the room: who has come back to a session that waited hours for an approval?");

  s = pres.addSlide({ masterName: "Statement", sectionTitle: "Opening" });
  s.addText("You talk to one session. The others report to it.", { placeholder: "title" });
  s.addText("The leader assigns work, unblocks lanes and merges within the limits you set. You decide product, production and permissions.", { placeholder: "body" });
  s.addNotes("The key line of the talk. The superadvisor is not smarter than a normal session; it gives each session a clear role: one coordinates, many execute, and guardrails stop any session from doing the owner’s job.");

  // ---------- 2. How it works ----------
  pres.addSection({ title: "How it works" });
  s = content("How it works", "How it works", "Leader, lanes, brains and guardrails");
  const node = (x, y, w, h, t, sub, kind, name) => {
    const fill = kind === "owner" ? C.accent1 : kind === "lead" ? C.text1 : C.background1;
    const line = kind === "guard" ? C.accent2 : kind ? fill : C.accent6;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: kind === "guard" ? 2 : 1 }, shadow: shadow(), objectName: name + " box" });
    const tc = kind === "owner" || kind === "lead" ? C.background1 : C.text1;
    const sc = kind === "owner" || kind === "lead" ? C.accent6 : C.text2;
    s.addText([{ text: t, options: { fontSize: 16, bold: true, color: tc, breakLine: true } }, { text: sub, options: { fontSize: 12, color: sc } }],
      { x: x + 0.2, y, w: w - 0.4, h, margin: 0, valign: "middle", isTextBox: true, objectName: name + " label" });
  };
  const arrow = (x, y, w, h, opts = {}) =>
    s.addShape(pres.shapes.LINE, { x, y, w, h, flipV: !!opts.up, line: { color: C.text2, width: 1.5, endArrowType: opts.noHead ? undefined : "triangle", dashType: opts.dash ? "dash" : "solid" }, objectName: opts.name || "connector" });
  const lbl = (x, y, w, t) => s.addText(t, { x, y, w, h: 0.3, fontSize: 11, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "label " + t });
  node(0.7, 3.85, 2.0, 1.0, "Owner", "on the phone", "owner", "owner");
  node(3.4, 3.85, 2.5, 1.0, "Leader session", "tmux + Remote Control", "lead", "leader");
  node(6.7, 2.3, 2.5, 0.85, "Lane: small", "sonnet", "", "lane small");
  node(6.7, 3.93, 2.5, 0.85, "Lane: medium", "sonnet + opus review", "", "lane medium");
  node(6.7, 5.45, 2.5, 0.8, "Lane: hard bug", "opus", "", "lane hard");
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
  s.addNotes("Left to right. The owner only talks to the leader through Remote Control. The leader opens lanes from a brief: one card, one worktree, and a model chosen by task size (--model) — sonnet for most work, opus for a hard bug. A medium card adds one opus review round; the reviewer is opus, not sonnet. Every tool call a lane makes passes through hooks that cap long runs, block model overrides and stop lanes from doing the owner’s job. Hooks log tokens; kit-stats sums them. Brains runs in the background: a 15-minute patrol that flags stuck lanes to the leader.");

  s = content("How it works", "How it works", "Four roles, each knows what is not its job");
  const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.accent1 } } });
  const roleRows = [
    [hdr("Role"), hdr("Does"), hdr("Never does")],
    ["Owner", "Decides product; approves merges, production, permissions", "Hand-feed work to each lane"],
    ["Leader", "Splits the backlog, writes briefs, opens lanes, unblocks, merges within limits", "Write large blocks of code itself"],
    ["Lane", "One card, one worktree, one PR", "Merge or change permissions — the owner-guard hook blocks it"],
    ["Brains", "15-minute patrol, nightly review, morning report", "Become a second chat channel"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? C.accent1 : C.text1 } })));
  s.addTable(roleRows, { x: 0.7, y: 2.45, w: 11.9, colW: [1.9, 5.6, 4.4], fontSize: 16, fontFace: THEME.bodyFontFace, color: C.text1, border: { type: "solid", pt: 1, color: HEX.accent6 }, rowH: 0.75, valign: "middle", margin: [0.08, 0.15, 0.08, 0.15], objectName: "roles table" });
  s.addNotes("The key column is “Never does”. A lane cannot merge not because it promises not to, but because the owner-guard hook blocks it. Brains is not a chat session; it is the leader’s background memory and patrol.");

  s = content("How it works", "How it works", "The leader’s loop, after every event");
  const loop = [
    ["FaWrench", "1. Unblock first", "Rewrite the brief narrower, reopen the lane."],
    ["FaCircleCheck", "2. Merge ready PRs", "Only within the owner’s limits; ask the rest."],
    ["FaPaperPlane", "3. Assign idle lanes", "Two lanes never edit the same files."],
    ["FaBroom", "4. Clean up", "Close the lane, drop the merged worktree."],
    ["FaComments", "5. Report briefly", "Five lines at most, only when something changed."],
    ["FaClock", "Never just wait", "Waiting on review? Give another lane work."],
  ];
  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.7 + col * 6.05, y = 2.4 + row * 1.5, w = 5.85, h = 1.3;
    const last = i === 5;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: last ? C.text1 : C.background1 }, line: { color: last ? C.text1 : C.accent6, width: 1 }, shadow: shadow(), objectName: `loop card ${i + 1}` });
    await iconCircle(s, x + 0.25, y + 0.25, 0.8, loop[i][0], `loop ${i + 1}`);
    s.addText([{ text: loop[i][1], options: { fontSize: 18, bold: true, color: last ? C.background1 : C.text1, breakLine: true } }, { text: loop[i][2], options: { fontSize: 14, color: last ? C.accent6 : C.text2 } }],
      { x: x + 1.3, y, w: w - 1.5, h, margin: 0, valign: "middle", isTextBox: true, objectName: `loop text ${i + 1}` });
  }
  s.addNotes("This is the lead skill. Order matters: unblock first, because a lane stuck for hours is the biggest cost. The last rule, never just wait, keeps progress moving.");

  // ---------- 3. Saving tokens ----------
  pres.addSection({ title: "Saving tokens" });
  s = content("Saving tokens", "Saving tokens", "Clear work goes to cheap models, hard work to strong ones");
  const agentRows = [
    [hdr("Agent"), hdr("Model"), hdr("When")],
    ["scout", "haiku", "Find files, look things up, summarize code"],
    ["builder", "sonnet", "Known-cause changes across 1–5 files"],
    ["tester", "sonnet", "Write and fix tests"],
    ["reviewer", "opus", "One review round before the PR"],
    ["debugger", "opus", "Unknown root cause, a test red twice"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 1 ? C.accent2 : C.text1 } })));
  s.addTable(agentRows, { x: 0.7, y: 2.45, w: 7.6, colW: [1.7, 1.6, 4.3], fontSize: 16, fontFace: THEME.bodyFontFace, color: C.text1, border: { type: "solid", pt: 1, color: HEX.accent6 }, rowH: 0.62, valign: "middle", margin: [0.06, 0.15, 0.06, 0.15], objectName: "agents table" });
  card(s, 8.8, 2.45, 3.8, 3.72, "routing callout");
  await iconCircle(s, 9.2, 2.85, 0.9, "FaShieldHalved", "routing");
  s.addText([{ text: "Pinned, not chosen on the fly", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Each agent pins its model. The agent-routing hook rejects model overrides at call time.", options: { fontSize: 15, color: C.text2 } }],
    { x: 9.2, y: 3.95, w: 3.0, h: 2.0, margin: 0, valign: "top", isTextBox: true, objectName: "routing text" });
  s.addText("Kit price table (input/output, USD per 1M tokens): sonnet ≈ 2× haiku, opus ≈ 4× haiku.", { x: 0.7, y: 6.4, w: 8.0, h: 0.4, fontSize: 13, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "price ratio" });
  s.addNotes("Route by difficulty, not size: a two-file change with an unknown cause still goes to the debugger. When unsure, round up. Pinning the model in each agent, plus a hook that rejects a model parameter, means nobody accidentally runs opus to find a file.");

  s = content("Saving tokens", "Saving tokens", "Guardrails live in hooks, not in promises", true);
  const guardRows = [
    [hdr("Hook"), hdr("Does"), hdr("Threshold")],
    ["turn-guard", "Denies long builder/tester runs (Read, Grep still pass)", "Warn 60 & 90, deny from 130"],
    ["agent-routing", "Denies model overrides and generic agents", "Every Agent call"],
    ["test-budget", "Denies whole-suite test runs", "Unless FULL_SUITE_OK=1"],
    ["owner-guard", "Denies lane merges, shared-branch pushes, settings writes", "In lanes (KIT_LANE=1)"],
    ["metrics-subagent", "Logs only — tokens per subagent run", "Each subagent stop"],
    ["metrics-main", "Logs only — main-session tokens per model", "Each Stop"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0, color: C.text1, fill: { color: C.background1 } } })));
  s.addTable(guardRows, { x: 0.7, y: 2.4, w: 11.9, colW: [2.9, 5.6, 3.4], fontSize: 15, fontFace: THEME.bodyFontFace, color: C.text1, border: { type: "solid", pt: 1, color: HEX.accent6 }, rowH: 0.52, valign: "middle", margin: [0.05, 0.15, 0.05, 0.15], objectName: "guards table" });
  s.addText("Six hooks: four deny (in auto mode, with guidance instead of a prompt), two only log. Lanes compact at 200k tokens and close after each card.", { x: 0.7, y: 6.45, w: 11.9, h: 0.5, fontSize: 14, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "guards footnote" });
  s.addNotes("The count matches the install slide: six hook scripts — four guards that deny and two metrics hooks that only log. In auto mode a guard does not ask a human; it denies with guidance so the session changes course instead of waiting. Every threshold is tunable with an environment variable.");

  s = content("Saving tokens", "Saving tokens", "Measure the main session, not just subagents");
  const stats = [["~70%", "of tokens are spent in the main session — the part nobody measured before", "FaGaugeHigh"], ["153 → 0", "subagent runs over 100 turns per week, after turning on turn-guard", "FaChartColumn"]];
  for (let i = 0; i < 2; i++) {
    const x = 0.7 + i * 6.05;
    card(s, x, 2.45, 5.85, 3.5, `stat card ${i + 1}`);
    await iconCircle(s, x + 0.45, 2.85, 0.8, stats[i][2], `stat ${i + 1}`);
    s.addText(stats[i][0], { x: x + 0.45, y: 3.75, w: 5.0, h: 1.1, fontSize: 60, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: `stat number ${i + 1}` });
    s.addText(stats[i][1], { x: x + 0.45, y: 4.85, w: 5.0, h: 0.9, fontSize: 16, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `stat label ${i + 1}` });
  }
  s.addText("How measured: events.jsonl token logs over several weeks on one internal project, anonymized · API list prices. Demo bench (bench/results.md, N=1, six cards): same pass rate, about 8% cheaper than a single Opus session.", { x: 0.7, y: 6.2, w: 11.9, h: 0.5, fontSize: 12, italic: true, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "stats source" });
  s.addNotes("The biggest lesson from measuring ourselves: we tuned subagents carefully, yet the most expensive part was the coordinating session, because every turn re-reads a long context. So the kit logs main-session tokens every turn, reading the transcript with a byte cursor so it stays fast on very large transcripts.");

  // ---------- 4. Demo ----------
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
  // Embedded recording in the lower band: poster frame + playable video (PowerPoint), caption to the right.
  const posterData = "image/png;base64," + fs.readFileSync(path.join(__dirname, "assets", "demo-poster.png")).toString("base64");
  s.addMedia({ type: "video", path: path.join(__dirname, "assets", "agikit-demo.mp4"), cover: posterData, x: 0.7, y: 5.85, w: 1.96, h: 1.1, objectName: "demo video" });
  s.addText([
    { text: "Demo recording (embedded)", options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } },
    { text: "One minute: problem → architecture → init → up → lane → PR → merge → close (card C3) → benchmark. Plays in PowerPoint; file at docs/talk/src/assets/agikit-demo.mp4.", options: { fontSize: 13, color: C.text2 } },
  ], { x: 2.95, y: 5.85, w: 9.65, h: 1.1, margin: 0, valign: "middle", isTextBox: true, objectName: "demo caption" });
  s.addNotes("The demo runs on a sample library-loans app, not a real project. The backlog has two small cards, three medium ones and one bug planted on purpose with a non-obvious cause. The one-minute recording is embedded on this slide (lower left); click it to play in PowerPoint. The PDF export shows the poster frame and the file path. If the live run hits a network or quota problem, switch to the recording.");

  // ---------- 5. Closing ----------
  pres.addSection({ title: "Closing" });
  s = content("Closing", "Try it", "Install in five minutes", true);
  s.addText([
    { text: "git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin marketplace add ./AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin install agi-agent-kit@agi-agent-kit", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor init /path/to/project", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor up /path/to/project" },
  ], { x: 0.7, y: 2.45, w: 7.9, h: 2.4, fontFace: "Courier New", fontSize: 13, color: C.background1, fill: { color: C.text1 }, margin: [0.25, 0.35, 0.25, 0.35], valign: "middle", paraSpaceAfter: 6, isTextBox: true, objectName: "install commands" });
  card(s, 9.0, 2.45, 3.6, 2.4, "includes card");
  s.addText([{ text: "Includes", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Five tiered agents, six hooks, the superadvisor CLI, a sample app with a six-card backlog, and a benchmark.", options: { fontSize: 14, color: C.text2 } }],
    { x: 9.3, y: 2.6, w: 3.0, h: 2.1, margin: 0, valign: "top", isTextBox: true, objectName: "includes text" });
  s.addText("AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license", { x: 0.7, y: 5.2, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "download line" });
  s.addText("Read after the talk:  docs/talk/handout.html  ·  cheatsheet.html  ·  qa.html", { x: 0.7, y: 5.65, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "docs line" });
  s.addNotes("Needs Claude Code, tmux, jq, git, and Node 20 for the sample app. To try it without installing the plugin, run claude with the --plugin-dir flag pointing at the plugin folder.");

  s = pres.addSlide({ masterName: "Cover", sectionTitle: "Closing" });
  s.addText("Thank you", { placeholder: "title" });
  s.addText("Questions?  One leader, many lanes, guardrails in hooks — and measure everything.", { placeholder: "body" });
  s.addText("agilityio.com", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.accent1, bold: true, margin: 0, isTextBox: true, hyperlink: { url: "https://www.agilityio.com/" }, objectName: "site link" });
  s.addNotes("Likely questions: does it work with one account (yes, lanes share the account); can a lane merge on its own (no, owner-guard blocks it); what does it cost over long runs (run the benchmark on your own backlog and compare).");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
