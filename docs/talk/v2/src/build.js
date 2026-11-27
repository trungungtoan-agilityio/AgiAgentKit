// Build "Session Superadvisor" (full talk, Agility IO internal) as a structured 16:9 PowerPoint deck.
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
const ASSETS = path.join(__dirname, "..", "..", "src", "assets"); // shared logo and demo recording
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
  const contentObjects = () => [
    { image: { x: 11.0, y: 0.45, w: 1.65, h: 1.65 * LOGO_RATIO, data: logo, altText: "Agility IO logo" } },
    { placeholder: { options: { name: "kicker", type: "body", x: 0.7, y: 0.45, w: 9.5, h: 0.35, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.85, w: 10.0, h: 1.25, fontSize: 34, bold: true, color: C.text1, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "agilityio.com", options: { x: 0.7, y: 7.0, w: 3, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ];
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });
  pres.defineSlideMaster({ title: "Content Mist", background: { color: C.background2 }, objects: contentObjects(), slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });

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
  const rowsOf = (rows, cell) => rows.map((r, i) => i === 0 ? r.map(hdr) : r.map((c, j) => ({ text: c, options: cell(j) })));

  // ---------- 1. Opening ----------
  pres.addSection({ title: "Opening" });
  let s = pres.addSlide({ masterName: "Cover", sectionTitle: "Opening" });
  s.addText("Session Superadvisor", { placeholder: "title" });
  s.addText("One leader session runs many Claude Code lanes — with guardrails, token telemetry and lanes that report back and clean up.", { placeholder: "body" });
  s.addText("Agility IO  ·  Sen Agi", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.text2, margin: 0, isTextBox: true, objectName: "byline" });
  s.addNotes("Today: how one person coordinates many Claude Code sessions at once. We go from the problem, to the architecture, to the life of one card and one lane, the guardrails, the token numbers, and a recorded demo on a sample project anyone can download.");

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
  s.addNotes("Three pains once you run three or more sessions. Ask the room: who has come back to a session that waited hours for an approval? A fourth pain shows up later: the machine runs out of RAM or disk when many lanes run at once.");

  s = pres.addSlide({ masterName: "Statement", sectionTitle: "Opening" });
  s.addText("You talk to one session. The others report to it.", { placeholder: "title" });
  s.addText("The leader assigns work, unblocks lanes and merges within the limits you set. You decide product, production and permissions.", { placeholder: "body" });
  s.addNotes("The key line of the talk. The superadvisor is not smarter than a normal session; it gives each session a clear role: one coordinates, many execute, and guardrails stop any session from doing the owner's job.");

  // ---------- 2. How it works ----------
  pres.addSection({ title: "How it works" });
  s = content("How it works", "Architecture", "Owner, leader, lanes, brains, hooks and metrics");
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
  arrow(5.9, 2.73, 0.8, 1.37, { up: true, name: "leader to lane c3" });
  arrow(5.9, 4.35, 0.8, 0, { name: "leader to lane c4" });
  arrow(5.9, 4.6, 0.8, 1.25, { name: "leader to lane c6" });
  arrow(9.2, 2.73, 0.8, 0.3, { name: "lane c3 to hooks" });
  arrow(9.2, 3.35, 0.8, 1.0, { up: true, name: "lane c4 to hooks" });
  arrow(9.2, 3.5, 0.8, 2.35, { up: true, name: "lane c6 to hooks" });
  arrow(11.3, 3.8, 0, 0.8, { name: "hooks to metrics" });
  arrow(11.3, 5.5, 0, 1.15, { dash: true, noHead: true, name: "metrics down" });
  arrow(4.65, 6.65, 6.65, 0, { dash: true, noHead: true, name: "metrics across" });
  arrow(4.65, 6.45, 0, 0.2, { dash: true, up: true, name: "metrics to brains" });
  lbl(6.5, 6.72, 1.5, "metrics");
  arrow(4.65, 4.85, 0, 0.75, { dash: true, up: true, name: "brains to leader" });
  lbl(4.75, 5.05, 1.5, "stuck? alert");
  s.addNotes("Left to right. The owner only talks to the leader through Remote Control, usually from the phone. The leader does small cards itself and opens a lane for each medium card and hard bug; a lane is a Claude Code session in its own git worktree and tmux session. The lane's model follows the card: a medium card runs a sonnet builder plus one opus review round, a hard bug runs opus. Every tool call passes through hooks; hooks log tokens and kit-stats sums them. Brains is the background patrol and memory that tells the leader when a lane is stuck.");

  s = content("How it works", "Roles", "Four roles, each knows what is not its job", true);
  tbl(s, rowsOf([
    ["Role", "Does", "Never does"],
    ["Owner", "Decides product; approves merges to the integration branch, production, permissions", "Hand-feed work to each lane"],
    ["Leader", "Sizes the backlog, writes briefs, opens and reuses lanes, unblocks, merges within limits", "Write large blocks of code itself"],
    ["Lane", "One card, one worktree, one PR; reports READY by itself", "Merge, push to main, release or change permissions — hooks block it"],
    ["Brains", "Patrol every 15 min, nightly review, morning report", "Become a second chat channel"],
  ], (j) => ({ bold: j === 0, color: j === 0 ? C.accent1 : C.text1, fill: { color: C.background1 } })),
  { x: 0.7, y: 2.45, w: 11.9, colW: [1.9, 5.7, 4.3], fontSize: 16, rowH: 0.75, margin: [0.08, 0.15, 0.08, 0.15], objectName: "roles table" });
  note(s, "Patrol, nightly review, morning report and auto-close of idle merged lanes run on the schedule set with superadvisor cron --install.", 6.45, 0.4, 13);
  s.addNotes("The key column is Never does. A lane cannot merge not because it promises not to, but because a hook blocks it. Brains is not a chat session; it is the leader's background memory and patrol.");

  s = content("How it works", "One card", "One card, from brief to merge");
  const cardSteps = [
    ["1", "Size it", "S (1–3 files): the leader does it. M or a hard bug: a lane."],
    ["2", "Write the brief", "Goal, files, the test command, what is out of scope."],
    ["3", "Open the lane", "Own worktree, branch lane/<card> and tmux session."],
    ["4", "Build and test", "Tiered agents; the brief's tests must be green."],
    ["5", "Open the PR", "Push, PR to the integration branch, a READY line, stop."],
    ["6", "Review", "One opus review round, two at most; no High or Critical left."],
    ["7", "Merge", "Owner says M 12, or the epic gate passes — same head only."],
    ["8", "Wrap up", "Lane reused or closed, worktree cleaned, five-line report."],
  ];
  for (let i = 0; i < 8; i++) {
    const x = 0.7 + (i % 4) * 3.025, y = 2.4 + Math.floor(i / 4) * 2.0, w = 2.825, h = 1.8;
    card(s, x, y, w, h, `card step ${i + 1}`, i === 6);
    s.addText(cardSteps[i][0], { x: x + 0.25, y: y + 0.25, w: 0.45, h: 0.45, fontSize: 15, bold: true, color: C.background1, fill: { color: C.accent1 }, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `card step number ${i + 1}` });
    s.addText(cardSteps[i][1], { x: x + 0.85, y: y + 0.25, w: w - 1.05, h: 0.45, fontSize: 17, bold: true, color: i === 6 ? C.background1 : C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `card step title ${i + 1}` });
    s.addText(cardSteps[i][2], { x: x + 0.25, y: y + 0.85, w: w - 0.5, h: 0.8, fontSize: 13, color: i === 6 ? C.accent6 : C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `card step text ${i + 1}` });
  }
  note(s, "Demo card C3: superadvisor lane open c3 --brief c3.md → PR → owner answers M 12 → merge → lane close c3 --rm-worktree.", 6.45, 0.4, 12);
  s.addNotes("The path every card takes. Size by difficulty, not by number of files: a two-file change with an unknown cause is still a hard bug. The lane stops after opening the PR; it cannot merge. The merge happens on the owner's word, or, inside an epic, when the leader's gate passes on the same head. The last step keeps the machine clean: the lane is reused for the next card or closed, and its worktree is removed only when that is safe.");

  s = content("How it works", "The leader", "The leader’s loop, after every event", true);
  const loop = [
    ["FaWrench", "1. Unblock first", "Rewrite the brief narrower, reopen the lane."],
    ["FaCircleCheck", "2. Merge ready PRs", "Only within the owner’s limits; ask the rest."],
    ["FaPaperPlane", "3. Assign idle lanes", "Reuse an idle lane; two lanes never edit the same files."],
    ["FaBroom", "4. Clean up", "Close or reuse the lane, drop worktrees that are safe to drop."],
    ["FaComments", "5. Report briefly", "Five lines at most, only when something changed."],
    ["FaClock", "Never just wait", "Waiting on review? Give another lane work."],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.7 + (i % 2) * 6.05, y = 2.4 + Math.floor(i / 2) * 1.5, w = 5.85, h = 1.3, last = i === 5;
    card(s, x, y, w, h, `loop card ${i + 1}`, last);
    await iconCircle(s, x + 0.25, y + 0.25, 0.8, loop[i][0], `loop ${i + 1}`);
    twoLine(s, x + 1.3, y, w - 1.5, h, loop[i][1], loop[i][2], 18, 14, `loop text ${i + 1}`, last);
  }
  s.addNotes("These are the leader’s priorities after each event. Order matters: unblock first, because a lane stuck for hours is the biggest cost. The last rule, never just wait, keeps progress moving.");

  // ---------- 3. Lanes ----------
  pres.addSection({ title: "Lanes" });
  s = content("Lanes", "Lane lifecycle · AgentAutoKit", "A lane’s life in five steps");
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
  s.addNotes("The five steps every lane goes through; the next slides take them one by one. The bottom box is for projects that open lanes with their own launcher: adopt writes the running lane into the leader's book the same way lane-launch does and starts the watcher. It refuses calls from a lane, unknown sessions and odd names.");

  s = content("Lanes", "1 · Load gate · AgentAutoKit", "Measure the machine before opening a lane", true);
  tbl(s, rowsOf([
    ["kit-load measures", "Why it matters"],
    ["Free RAM %", "Every lane is a Claude Code session plus its tools"],
    ["Swap", "STOP only when free RAM < 30% or memory pressure is high"],
    ["Load per core", "Builds and tests in several lanes at once"],
    ["Free disk", "Under 40 GB the leader is told to sweep worktrees"],
    ["Booted simulators", "One iOS simulator at a time, shut down after use"],
    ["Idle Colima", "A Docker VM with no container still holds RAM"],
  ], (j) => ({ bold: j === 0, color: C.text1, fill: { color: C.background1 } })),
  { x: 0.7, y: 2.4, w: 7.6, colW: [2.5, 5.1], fontSize: 14, rowH: 0.52, margin: [0.05, 0.15, 0.05, 0.15], objectName: "load table" });
  card(s, 8.8, 2.4, 3.8, 3.64, "gate callout");
  await iconCircle(s, 9.2, 2.75, 0.9, "FaTrafficLight", "gate");
  s.addText([{ text: "OK · WARN · STOP", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Exit 0, 1 or 2. STOP refuses lane-launch, lane-resume and --bare; opening the leader only warns. Override: --force-load, always logged.", options: { fontSize: 14, color: C.text2 } }],
    { x: 9.2, y: 3.8, w: 3.0, h: 2.1, margin: 0, valign: "top", isTextBox: true, objectName: "gate text" });
  note(s, "The same probe feeds lead-patrol. A load-hint hook adds context before lanes reuse and session resume; it never blocks.", 6.4, 0.4, 12);
  s.addNotes("kit-load is one probe used in three places: the lane launcher gate, the leader's patrol and a hint hook. It returns 0, 1 or 2 for OK, WARN, STOP, with --json for scripts. Swap alone does not stop lanes; swap stops them only when free RAM is under 30 percent or macOS reports memory pressure. --force-load exists for the owner and always writes a log line.");

  s = content("Lanes", "2 · Report back · AgentAutoKit", "Lanes report to the leader by themselves");
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
  s.addNotes("The lane's own Stop, SessionEnd and idle hooks write one structured line per event: lane, account, project, type and the PR and sha from the READY line, never free text. A watcher per leader, locked with flock, reads it about every minute and delivers to an inbox that the lead-nudge hook reads. The watcher starts with lane-launch or lanes reuse and stops when the leader has no lanes. The 15-minute patrol stays as a safety net.");

  s = content("Lanes", "3 · Reuse and clean up · AgentAutoKit", "Reuse lanes; clean up only what is safe", true);
  const reuse = [
    ["FaRecycle", "kit-tmux lanes reuse <lane> <brief>", "Same repo and account. Enter only when the input holds exactly /clear; waits for idle, then types the brief."],
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
  s.addNotes("Opening a fresh session and loading plugins costs time, so an idle lane takes the next brief. reuse re-checks the lane's state before typing, presses Enter only when the prompt holds exactly /clear, waits until the lane is idle again and checks for open prompts at every step. Pool size comes from lane_pool in machine.json. Cleanup is split: the lane cleans its own heavy build folders before READY; the leader sweeps all worktrees only when free disk drops under the kit-load warn line. Every safety check fails toward keeping the worktree.");

  // ---------- 4. Guardrails ----------
  pres.addSection({ title: "Guardrails" });
  s = content("Guardrails", "Roles in kit-context · AgentAutoKit", "Lane and leader load different context");
  tbl(s, rowsOf([
    ["", "Lane · KIT_ROLE=lane", "Leader"],
    ["Loads", "Safe core + the app’s rules; lead_only files left out", "Everything (also the default when no role is set)"],
    ["Safety floor", "Files named safety, secret, security, tenant or permission always load", "Same"],
    ["Hard denies", "Merge, push to main, force, tag, deploy, edit settings, hooks or manifest", "—"],
    ["Anti-escape", "No git remote/config edits, no tmux or new lanes, no gh api writes, no credential reads", "—"],
    ["Lead-only commands", "Refused: the guard walks the process tree and fails closed", "Allowed"],
  ], (j) => ({ bold: j === 0, color: j === 0 ? C.accent1 : C.text1, fill: { color: C.background1 } })),
  { x: 0.7, y: 2.4, w: 11.9, colW: [2.4, 6.2, 3.3], fontSize: 14, rowH: 0.64, margin: [0.05, 0.15, 0.05, 0.15], objectName: "roles context table" });
  note(s, "Manifest .claude/context-roles.json (lead_only, safety, lane_deny). A broken manifest stops the lane from opening. Denies are a second net; the real lock is hooks plus branch protection.", 6.3, 0.6, 12);
  s.addNotes("KIT_ROLE splits what each session loads. With no role set the session is treated as a leader and loads everything, which is the safe default. A lane loads the safe core and the app's rules; files the manifest marks lead_only are left out, which saves context on every lane turn. Any file whose name says safety, secret, security, tenant or permission always loads. The anti-escape denies close the ways a lane could act as a leader; lead-only commands check the real process tree, not just environment variables.");

  s = content("Guardrails", "Hooks", "Guardrails live in hooks, not in promises", true);
  tbl(s, rowsOf([
    ["Hook", "Does", "Threshold"],
    ["turn-guard", "Denies long builder/tester runs (Read, Grep still pass)", "Warn 60 & 90, deny from 130"],
    ["agent-routing", "Denies model overrides and generic agents", "Every Agent call"],
    ["test-budget", "Denies whole-suite test runs, also behind timeout, nice or sudo", "Unless FULL_SUITE_OK=1"],
    ["owner-guard", "Denies merges, protected-branch, force, delete and tag pushes, releases, gh api writes, settings and hook edits", "In lanes"],
    ["metrics-subagent", "Logs only — tokens per subagent run", "Each subagent stop"],
    ["metrics-main", "Logs only — main-session tokens per model", "Each Stop"],
  ], (j) => ({ bold: j === 0, color: C.text1, fill: { color: C.background1 } })),
  { x: 0.7, y: 2.4, w: 11.9, colW: [2.5, 6.6, 2.8], fontSize: 14, rowH: 0.52, margin: [0.05, 0.15, 0.05, 0.15], objectName: "guards table" });
  note(s, "AgiAgentKit ships six hooks: four deny (with guidance, never a prompt in auto mode), two only log. Quoted prose in commit messages does not trip owner-guard.", 6.45, 0.5, 13);
  s.addNotes("Six hook scripts: four guards that deny and two metrics hooks that only log. In auto mode a guard does not ask a human; it denies with guidance so the session changes course instead of waiting. owner-guard is the one that keeps a lane from doing the owner's job: it blocks merges, pushes to protected branches, force, mirror, delete and tag pushes, releases, API merges and gh api writes, and edits to settings and hooks. Every threshold is tunable with an environment variable.");

  // ---------- 5. Tokens ----------
  pres.addSection({ title: "Saving tokens" });
  s = content("Saving tokens", "Model routing", "Clear work goes to cheap models, hard work to strong ones");
  tbl(s, rowsOf([
    ["Agent", "Model", "When"],
    ["scout", "haiku", "Find files, look things up, summarize code"],
    ["builder", "sonnet", "Known-cause changes across 1–5 files"],
    ["tester", "sonnet", "Write and fix tests"],
    ["reviewer", "opus", "One review round before the PR"],
    ["debugger", "opus", "Unknown root cause, a test red twice"],
  ], (j) => ({ bold: j === 0, color: j === 1 ? C.accent2 : C.text1 })),
  { x: 0.7, y: 2.45, w: 7.6, colW: [1.7, 1.6, 4.3], fontSize: 16, rowH: 0.62, margin: [0.06, 0.15, 0.06, 0.15], objectName: "agents table" });
  card(s, 8.8, 2.45, 3.8, 3.72, "routing callout");
  await iconCircle(s, 9.2, 2.85, 0.9, "FaShieldHalved", "routing");
  s.addText([{ text: "Pinned, not chosen on the fly", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Each agent pins its model. The agent-routing hook rejects model overrides at call time.", options: { fontSize: 15, color: C.text2 } }],
    { x: 9.2, y: 3.95, w: 3.0, h: 2.0, margin: 0, valign: "top", isTextBox: true, objectName: "routing text" });
  s.addText("Kit price table (input/output, USD per 1M tokens): sonnet ≈ 2× haiku, opus ≈ 4× haiku.", { x: 0.7, y: 6.4, w: 8.0, h: 0.4, fontSize: 13, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "price ratio" });
  s.addNotes("Route by difficulty, not size: a two-file change with an unknown cause still goes to the debugger. When unsure, round up. Pinning the model in each agent, plus a hook that rejects a model parameter, means nobody accidentally runs opus to find a file.");

  s = content("Saving tokens", "Measure everything", "Measure the main session, not just subagents", true);
  const stats = [
    ["~70%", "of tokens are spent in the main session — the part nobody measured", "FaGaugeHigh"],
    ["153 → 0", "subagent runs over 100 turns per week, after turning on turn-guard", "FaChartColumn"],
    ["6/6 · 92%", "benchmark: same pass rate at 92% of the cost of one Opus session", "FaScaleBalanced"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.05;
    card(s, x, 2.45, 3.75, 3.5, `stat card ${i + 1}`);
    await iconCircle(s, x + 0.4, 2.8, 0.8, stats[i][2], `stat ${i + 1}`);
    s.addText(stats[i][0], { x: x + 0.4, y: 3.75, w: 3.1, h: 0.9, fontSize: 40, bold: true, color: C.accent1, margin: 0, valign: "middle", isTextBox: true, objectName: `stat number ${i + 1}` });
    s.addText(stats[i][1], { x: x + 0.4, y: 4.75, w: 3.0, h: 1.05, fontSize: 15, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: `stat label ${i + 1}` });
  }
  s.addText("How measured: events.jsonl token logs on one internal project, anonymized · API list prices. Benchmark: bench/results.md, six demo cards, N = 1 per card, Sonnet leader + tiered agents vs one Opus session; wall time about the same.", { x: 0.7, y: 6.15, w: 11.9, h: 0.6, fontSize: 12, italic: true, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "stats source" });
  s.addNotes("The biggest lesson from measuring ourselves: we tuned subagents carefully, yet the most expensive part was the coordinating session, because every turn re-reads a long context. So the kit logs main-session tokens every turn, reading the transcript with a byte cursor so it stays fast on very large transcripts. The benchmark is small, one run per card, so treat the spread as unknown; coordination pays off on long sessions and parallel lanes.");

  // ---------- 6. Shipping ----------
  pres.addSection({ title: "Shipping" });
  s = content("Shipping", "Gated merge into epic branches · AgentAutoKit", "The leader merges into epic branches, behind a gate");
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
  s.addNotes("Merges into the integration branch always wait for the owner. Inside an epic, slices merge into the epic branch without waiting, but only if every condition here holds on the exact head being merged. Anything that deploys still needs the owner. The switch is read from CLAUDE.md on the integration branch right after a fetch, and changing that line must be its own PR merged by the owner.");

  s = content("Shipping", "Spec by prototype · AgentAutoKit", "Spec by prototype, before any code", true);
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
  s.addNotes("The ui-prototype skill has a multi-screen template. Before any production code, the lane builds one throwaway HTML file with the project's design tokens and made-up domain data. Five linked views: Guide with the demo script and a self-ticking UAT checklist, a phone App, a responsive Web, a Staff or POS queue and an Admin with KPI and audit. Keep only the screens the feature needs. The prototype is linked in the GitHub issue and becomes the behavior spec. Mock data only.");

  // ---------- 7. Demo ----------
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
  s.addNotes("The demo runs on AgiAgentKit and a sample library-loans app, not a real project. The backlog has two small cards, three medium ones and one bug planted on purpose with a non-obvious cause. The one-minute recording is embedded on this slide (lower left); click it to play in PowerPoint. The PDF shows the poster frame. If a live run hits a network or quota problem, use the recording.");

  // ---------- 8. Closing ----------
  pres.addSection({ title: "Closing" });
  s = content("Closing", "Try it", "Install in about ten minutes", true);
  s.addText([
    { text: "git clone https://github.com/trungungtoan-agilityio/AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin marketplace add ./AgiAgentKit", options: { breakLine: true } },
    { text: "claude plugin install agi-agent-kit@agi-agent-kit", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor init /path/to/project", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor up /path/to/project", options: { breakLine: true } },
    { text: "AgiAgentKit/bin/superadvisor cron --install --project /path/to/project" },
  ], { x: 0.7, y: 2.45, w: 7.9, h: 2.6, fontFace: "Courier New", fontSize: 13, color: C.background1, fill: { color: C.text1 }, margin: [25.2, 25.2, 18, 18], valign: "middle", paraSpaceAfter: 6, isTextBox: true, objectName: "install commands" });
  card(s, 9.0, 2.45, 3.6, 2.6, "includes card");
  s.addText([{ text: "Includes", options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: "Five tiered agents, six hooks (four deny, two log only), the superadvisor CLI with cron, a sample app with a six-card backlog, and a benchmark.", options: { fontSize: 14, color: C.text2 } }],
    { x: 9.3, y: 2.6, w: 3.0, h: 2.3, margin: 0, valign: "top", isTextBox: true, objectName: "includes text" });
  s.addText("AgiAgentKit  ·  github.com/trungungtoan-agilityio/AgiAgentKit  ·  MIT license", { x: 0.7, y: 5.35, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "download line" });
  s.addText("Read after the talk:  docs/talk/v2/handout.html  ·  cheatsheet.html  ·  qa.html", { x: 0.7, y: 5.8, w: 11.9, h: 0.4, fontSize: 15, color: C.text2, margin: 0, isTextBox: true, objectName: "docs line" });
  s.addText("Load gate, watcher, lane reuse, roles, epic merge and the prototype template ship in AgentAutoKit (agent-brains plugin).", { x: 0.7, y: 6.25, w: 11.9, h: 0.4, fontSize: 13, italic: true, color: C.text2, margin: 0, isTextBox: true, objectName: "autokit line" });
  s.addNotes("AgiAgentKit gives you the leader, lanes, hooks, cron and the benchmark to try today. The lane lifecycle pieces from the Lanes section, the role-scoped context and the epic merge gate ship in AgentAutoKit with its agent-brains plugin. Needs Claude Code, tmux, jq, git, and Node 20 for the sample app.");

  s = pres.addSlide({ masterName: "Cover", sectionTitle: "Closing" });
  s.addText("Thank you", { placeholder: "title" });
  s.addText("Questions?  One leader, lanes that gate, report and clean up, guardrails in hooks — and measure everything.", { placeholder: "body" });
  s.addText("agilityio.com", { x: 0.7, y: 6.55, w: 7.4, h: 0.4, fontSize: 14, color: C.accent1, bold: true, margin: 0, isTextBox: true, hyperlink: { url: "https://www.agilityio.com/" }, objectName: "site link" });
  s.addNotes("Likely questions: does it work with one account (yes, lanes share the account); can a lane merge on its own (no, hooks block it; only the leader merges: a PR you name, such as M 12, or into an epic branch behind the gate); what if the machine is full (STOP refuses the lane, --force-load is logged); does reuse lose the old lane's context (yes, /clear first, on purpose); what does it cost (run the benchmark on your own backlog).");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
