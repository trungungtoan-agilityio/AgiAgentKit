// @ts-nocheck
// Hidden acceptance test for card C5 (extract date helpers into src/dates.ts, behaviour unchanged).
// Assumed exports of src/dates.ts: MS_PER_DAY, addDays(date, n), diffMs(a, b) (sign convention not checked).
// Behaviour checks are bug-compatible on purpose: a pure refactor must not change any result.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lateFeeCents } from "../src/fees";
import { Library } from "../src/library";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-03-01T09:00:00Z");
const after = (d: number) => new Date(t0.getTime() + d * DAY);
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

describe("C5 src/dates.ts helpers", () => {
  it("exports MS_PER_DAY = 86400000", async () => {
    const d = await import("../src/dates");
    expect(d.MS_PER_DAY).toBe(DAY);
  });

  it("addDays adds whole days without mutating the input", async () => {
    const { addDays } = await import("../src/dates");
    const input = new Date(t0.getTime());
    expect(addDays(input, 14).getTime()).toBe(after(14).getTime());
    expect(addDays(input, -1).getTime()).toBe(after(-1).getTime());
    expect(addDays(input, 0).getTime()).toBe(t0.getTime());
    expect(input.getTime()).toBe(t0.getTime());
  });

  it("diffMs returns the millisecond distance between two dates", async () => {
    const { diffMs } = await import("../src/dates");
    expect(Math.abs(diffMs(after(1), t0))).toBe(DAY);
    expect(Math.abs(diffMs(t0, after(2.5)))).toBe(2.5 * DAY);
    expect(diffMs(t0, t0)).toBe(0);
  });

  it("has its own tests in tests/dates.test.ts", () => {
    const p = new URL("./dates.test.ts", import.meta.url);
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, "utf8")).toMatch(/\b(it|test)\(/);
  });
});

describe("C5 no scattered date arithmetic", () => {
  const files = ["library.ts", "fees.ts", "types.ts"];
  it("MS_PER_DAY is not defined outside dates.ts", () => {
    for (const f of files) expect(src(f), f).not.toMatch(/(const|let|var)\s+MS_PER_DAY\b/);
  });
  it("no 24 * 60 * 60 * 1000 or 86400000 outside dates.ts", () => {
    for (const f of files) {
      expect(src(f), f).not.toMatch(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
      expect(src(f), f).not.toMatch(/86_?400_?000/);
    }
  });
  it("library.ts and fees.ts import from ./dates", () => {
    for (const f of ["library.ts", "fees.ts"]) expect(src(f), f).toMatch(/from\s+["']\.\/dates(\.js|\.ts)?["']/);
  });
});

describe("C5 behaviour unchanged", () => {
  it("borrow still sets a 14 day due date", () => {
    const lib = new Library();
    lib.addMember("m1", "Alice");
    lib.addBook("b1", "Book 1");
    expect(lib.borrow("b1", "m1", t0).dueAt.getTime()).toBe(after(14).getTime());
  });

  it("lateFeeCents is unchanged (bug-compatible)", () => {
    const due = new Date("2026-03-15T12:00:00Z");
    expect(lateFeeCents(due, due)).toBe(0);
    expect(lateFeeCents(due, new Date(due.getTime() - DAY))).toBe(0);
    expect(lateFeeCents(due, new Date(due.getTime() + 3 * 60 * 60 * 1000))).toBe(25);
    expect(lateFeeCents(due, new Date(due.getTime() + 2.5 * DAY))).toBe(75);
    expect(lateFeeCents(due, new Date(due.getTime() + DAY))).toBe(50);
  });

  it("returnBook and listOverdue are unchanged", () => {
    const lib = new Library();
    lib.addMember("m1", "Alice");
    lib.addMember("m2", "Bob");
    for (const n of [1, 2, 3]) lib.addBook(`b${n}`, `Book ${n}`);
    lib.borrow("b1", "m1", t0);
    lib.borrow("b2", "m2", after(10));
    lib.borrow("b3", "m2", t0);
    expect(lib.returnBook("b1", after(10)).feeCents).toBe(0);
    expect(lib.returnBook("b3", new Date(after(14).getTime() + 2.5 * DAY)).feeCents).toBe(75);
    expect(lib.listOverdue(after(30)).map((l) => l.bookId)).toContain("b2");
    expect(lib.listOverdue(after(15)).map((l) => l.bookId)).not.toContain("b1");
    expect(lib.listOverdue(after(3))).toEqual([]);
  });
});
