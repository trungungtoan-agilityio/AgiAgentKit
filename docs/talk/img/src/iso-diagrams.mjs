#!/usr/bin/env node
// Builds the static isometric SVG illustrations for docs/talk/*.html.
// Same projection and palette as docs/atlas.html (IsoKit): iso(x, y, z) with a true 30° axis.
// No dependencies, no DOM: the SVG is assembled as text. Run from the repository root:
//   node docs/talk/img/src/iso-diagrams.mjs
// Output: docs/talk/img/architecture.svg, docs/talk/img/stuck-lane.svg
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..");
const C30 = Math.cos(Math.PI / 6);

// Palette from docs/atlas.html (light, then dark). Each SVG follows prefers-color-scheme on its own.
const LIGHT = {
  surface: "#fbf9f4", ink: "#1a1e23", ink2: "#464e58", ground: "#ddd6c6", grid: "#cfc7b5",
  leader: "#2f6f8f", lane: "#8794a2", brains: "#7656a3", metrics: "#2a8768", owner: "#c4612c",
  gate: "#d29a22", clock: "#6b7a4c", sonnet: "#4a6bd0", opus: "#c8433a", dead: "#5d6168", bad: "#c2392f",
};
const DARK = {
  surface: "#171c21", ink: "#e8e5dd", ink2: "#b4b8bd", ground: "#232a30", grid: "#2d353c",
  leader: "#3f8bb0", lane: "#5f6d7b", brains: "#8a6cc0", metrics: "#2f9c78", owner: "#dd7840",
  gate: "#e0ab35", clock: "#8a9c62", sonnet: "#6b88e6", opus: "#e05a4f", dead: "#7b8089", bad: "#ff6a5e",
};
const vars = (p) => Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(";");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function scene({ width, height, ox, oy, k = 1 }) {
  // u runs across the screen, v runs down it: x = (v + u) / 2, y = (v - u) / 2.
  const iso = (x, y, z = 0) => [ox + (x - y) * C30 * k, oy + ((x + y) * 0.5 - z) * k];
  const at = (u, v, z = 0) => iso((v + u) / 2, (v - u) / 2, z);
  const layers = { ground: [], edges: [], nodes: [], labels: [] };
  const pts = (P) => P.map((p) => f(p[0]) + "," + f(p[1])).join(" ");

  function ground(u0, v0, u1, v1) {
    // ground as a diamond spanning the (u, v) bounds
    const c = [at(u0, (v0 + v1) / 2), at((u0 + u1) / 2, v0), at(u1, (v0 + v1) / 2), at((u0 + u1) / 2, v1)];
    layers.ground.push(`<polygon points="${pts(c)}" class="ground"/>`);
  }
  /** box centred on (u, v): size s in world units, height h */
  function box(u, v, s, h, color) {
    const x = (v + u) / 2 - s / 2, y = (v - u) / 2 - s / 2;
    const top = [iso(x, y, h), iso(x + s, y, h), iso(x + s, y + s, h), iso(x, y + s, h)];
    const left = [iso(x, y + s, 0), iso(x + s, y + s, 0), iso(x + s, y + s, h), iso(x, y + s, h)];
    const right = [iso(x + s, y + s, 0), iso(x + s, y, 0), iso(x + s, y, h), iso(x + s, y + s, h)];
    layers.nodes.push([v,
      `<g><polygon points="${pts(left)}" style="fill:color-mix(in srgb,var(--${color}) 74%,#000)"/>` +
      `<polygon points="${pts(right)}" style="fill:color-mix(in srgb,var(--${color}) 86%,#000)"/>` +
      `<polygon points="${pts(top)}" style="fill:var(--${color})"/></g>`]);
    return { u, v, s, h, bottom: iso(x + s, y + s, 0)[1], top: iso(x, y, h)[1] };
  }
  function cylinder(u, v, r, h, color) {
    const [bx, by] = at(u, v, 0), [, ty] = at(u, v, h);
    const rx = r * Math.SQRT2 * C30 * k, ry = r * Math.SQRT2 * 0.5 * k;
    layers.nodes.push([v,
      `<g><path d="M${f(bx - rx)},${f(ty)} L${f(bx - rx)},${f(by)} A${f(rx)},${f(ry)} 0 0 0 ${f(bx + rx)},${f(by)} L${f(bx + rx)},${f(ty)} Z" style="fill:color-mix(in srgb,var(--${color}) 78%,#000)"/>` +
      `<ellipse cx="${f(bx)}" cy="${f(ty)}" rx="${f(rx)}" ry="${f(ry)}" style="fill:var(--${color})"/></g>`]);
    return { u, v, bottom: by + ry, top: ty - ry };
  }
  function person(u, v, color) {
    const [px, py] = at(u, v, 0);
    layers.nodes.push([v,
      `<g><ellipse cx="${f(px)}" cy="${f(py + 1)}" rx="13" ry="6" fill="#000" fill-opacity="0.16"/>` +
      `<path d="M${f(px - 10)},${f(py)} Q${f(px - 11)},${f(py - 27)} ${f(px)},${f(py - 28)} Q${f(px + 11)},${f(py - 27)} ${f(px + 10)},${f(py)} Z" style="fill:var(--${color})"/>` +
      `<circle cx="${f(px)}" cy="${f(py - 37)}" r="8.5" style="fill:color-mix(in srgb,var(--${color}) 70%,#fff)"/>` +
      `<rect x="${f(px + 8)}" y="${f(py - 27)}" width="9" height="15" rx="2" transform="rotate(-14 ${f(px + 12)} ${f(py - 19)})" style="fill:var(--ink)"/></g>`]);
    return { u, v, bottom: py + 6, top: py - 46 };
  }
  /** edge along the ground between (u, v) points, with an arrow at the end */
  function edge(points, { dash = false, text = "", tu = 0, tv = 0, anchor = "middle" } = {}) {
    const d = "M" + points.map(([u, v]) => at(u, v, 1).map(f).join(",")).join(" L");
    layers.edges.push(`<path d="${d}" class="edge${dash ? " dash" : ""}" marker-end="url(#arrow)"/>`);
    if (text) {
      const [lx, ly] = at(tu, tv, 1);
      layers.labels.push(`<text x="${f(lx)}" y="${f(ly)}" class="elbl" text-anchor="${anchor}">${esc(text)}</text>`);
    }
  }
  /** one or two lines of node text below (or above) a shape */
  function label(node, lines, { above = false, mid = false, dx = 0, anchor = "middle" } = {}) {
    const [cx] = at(node.u, node.v, 0);
    let y = above ? node.top - 10 - (lines.length - 1) * 17
      : mid ? (node.top + node.bottom) / 2 + 5 - ((lines.length - 1) * 17) / 2
      : node.bottom + 20;
    for (const [i, line] of lines.entries()) {
      layers.labels.push(`<text x="${f(cx + dx)}" y="${f(y)}" class="${i === 0 ? "lbl" : "sub"}" text-anchor="${anchor}">${esc(line)}</text>`);
      y += 17;
    }
  }
  function text(u, v, t, { dx = 0, dy = 0, anchor = "middle" } = {}) {
    const [x, y] = at(u, v, 1);
    layers.labels.push(`<text x="${f(x + dx)}" y="${f(y + dy)}" class="elbl" text-anchor="${anchor}">${esc(t)}</text>`);
  }
  function render(title, desc, lang) {
    const nodes = layers.nodes.sort((a, b) => a[0] - b[0]).map((n) => n[1]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t d" lang="${lang}">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
svg{${vars(LIGHT)}}
@media (prefers-color-scheme: dark){svg{${vars(DARK)}}}
.ground{fill:var(--ground);stroke:var(--grid);stroke-width:1.5}
.edge{fill:none;stroke:var(--ink2);stroke-width:2.2;stroke-linejoin:round}
.dash{stroke-dasharray:6 5}
#arrow path{fill:var(--ink2)}
text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round}
.lbl{font-size:16px;font-weight:650;fill:var(--ink)}
.sub{font-size:13.5px;fill:var(--ink2)}
.elbl{font-size:13px;font-style:italic;fill:var(--ink2)}
</style>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z"/></marker></defs>
<g>${layers.ground.join("")}</g>
<g>${layers.edges.join("")}</g>
<g>${nodes.join("")}</g>
<g>${layers.labels.join("")}</g>
</svg>
`;
  }
  return { ground, box, cylinder, person, edge, label, text, render };
}

// ---------------------------------------------------------------- architecture (handout, English)
function architecture() {
  const S = scene({ width: 500, height: 680, ox: 250, oy: 40 });
  S.ground(-290, 60, 290, 1220);
  const owner = S.person(-150, 150, "owner");
  const brains = S.box(160, 150, 56, 34, "brains");
  const leader = S.box(0, 420, 70, 52, "leader");
  const lanes = [
    S.box(-170, 680, 52, 30, "sonnet"),
    S.box(0, 680, 52, 30, "sonnet"),
    S.box(170, 680, 52, 30, "opus"),
  ];
  const hooks = S.box(0, 980, 60, 14, "gate");
  const metrics = S.cylinder(0, 1130, 26, 34, "metrics");

  S.edge([[-150, 190], [-150, 420], [-46, 420]], { dash: true, text: "Remote Control", tu: -160, tv: 330, anchor: "end" });
  S.edge([[160, 190], [160, 420], [46, 420]], { text: "stuck? alert", tu: 170, tv: 330, anchor: "start" });
  for (const u of [-170, 0, 170]) S.edge([[0, 460], [0, 545], [u, 545], [u, 645]]);
  for (const u of [-170, 0, 170]) S.edge([[u, 805], [u, 900], [0, 900], [0, 945]]);
  S.edge([[0, 1000], [0, 1090]], { text: "token counts", tu: -10, tv: 1050, anchor: "end" });

  S.label(owner, ["Owner", "on the phone"], { above: true });
  S.label(brains, ["Brains", "patrol · review · report"], { above: true });
  S.label(leader, ["Leader", "tmux + Remote Control"], { above: true });
  S.label(lanes[0], ["Lane: medium", "sonnet + opus review"]);
  S.label(lanes[1], ["Lane: medium", "sonnet + opus review"]);
  S.label(lanes[2], ["Lane: hard bug", "opus"]);
  S.label(hooks, ["Hooks", "every tool call"], { dx: 64, anchor: "start" });
  S.label(metrics, ["Token metrics", "kit-stats"], { dx: 46, anchor: "start" });
  S.text(0, 545, "brief", { dx: 8, dy: -6, anchor: "start" });
  return S.render(
    "Superadvisor architecture",
    "The owner talks to the leader session from the phone over Remote Control. Brains (patrol, nightly review, morning report) alert the leader when a lane is stuck. The leader does small cards itself and opens a lane for each medium card and the hard bug, with a model chosen by how hard the card is: a medium lane is a sonnet builder plus one opus review round, a hard bug is opus. Every tool call in every lane goes through the hooks, which write token counts to the metrics read by kit-stats.",
    "en",
  );
}

// ---------------------------------------------------------------- stuck lane decision tree (qa, Vietnamese)
function stuckLane() {
  const S = scene({ width: 500, height: 640, ox: 250, oy: 40 });
  S.ground(-290, 60, 290, 1190);
  const flag = S.box(0, 150, 60, 36, "clock");
  const waiting = S.box(-170, 390, 50, 28, "gate");
  const dead = S.box(0, 390, 50, 28, "dead");
  const still = S.box(170, 390, 50, 28, "sonnet");
  const owner = S.person(-170, 760, "owner");
  const reopen = S.box(40, 760, 60, 40, "leader");
  const ask = S.box(40, 1040, 54, 30, "bad");

  for (const u of [-170, 0, 170]) S.edge([[0, 190], [0, 270], [u, 270], [u, 360]]);
  S.edge([[-170, 530], [-170, 730]], { text: "quyền của owner", tu: -160, tv: 650, anchor: "start" });
  S.edge([[-170, 580], [10, 580], [10, 725]], { text: "không phải quyền owner", tu: -140, tv: 572, anchor: "start" });
  S.edge([[0, 530], [0, 555], [40, 555], [40, 725]]);
  S.edge([[170, 530], [170, 555], [70, 555], [70, 725]]);
  S.edge([[40, 800], [40, 1008]], { text: "vẫn kẹt", tu: 30, tv: 910, anchor: "end" });

  S.label(flag, ["patrol gắn cờ KẸT", "chỉ báo, không hành động"], { above: true });
  S.label(waiting, ["WAITING", "≥ 5 phút"]);
  S.label(dead, ["DEAD", "pane chết"]);
  S.label(still, ["Không đổi", "≥ 20 phút"]);
  S.label(owner, ["Báo owner", "duyệt quyền"]);
  S.label(reopen, ["Đóng lane,", "brief hẹp hơn,", "mở lại cùng tên"], { dx: 60, anchor: "start", mid: true });
  S.label(ask, ["Kẹt lần hai", "dừng và hỏi owner"]);
  return S.render(
    "Lane bị kẹt thì làm gì",
    "Patrol gắn cờ KẸT nhưng không hành động. Ba trường hợp: WAITING một hộp hỏi quyền từ 5 phút, DEAD khi pane chết, hoặc màn hình không đổi từ 20 phút. Hộp hỏi quyền chỉ owner duyệt được thì leader báo owner. Các trường hợp còn lại leader đóng lane, viết brief hẹp hơn và mở lại cùng tên. Kẹt lần hai thì dừng và hỏi owner.",
    "vi",
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "architecture.svg"), architecture());
writeFileSync(join(OUT, "stuck-lane.svg"), stuckLane());
console.log("wrote architecture.svg, stuck-lane.svg");
