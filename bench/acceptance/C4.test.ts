// @ts-nocheck
// Hidden acceptance test for card C4 (configurable loan limit). Assumed API: new Library({ maxLoansPerMember }),
// addMember(id, name, { maxLoans }); the over-limit code stays LIMIT_REACHED; invalid values throw a plain Error.
import { describe, expect, it } from "vitest";
import { Library } from "../src/library";
import { LibraryError } from "../src/types";

const t0 = new Date("2026-03-01T09:00:00Z");

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof LibraryError ? e.code : `non-LibraryError:${String(e)}`;
  }
  return undefined;
}

function setup(opts?: unknown, memberOpts?: unknown) {
  const lib = new Library(opts);
  lib.addMember("m1", "Alice", memberOpts);
  lib.addMember("m2", "Bob");
  for (let n = 1; n <= 8; n++) lib.addBook(`b${n}`, `Book ${n}`);
  return lib;
}

/** How many books m1 can borrow before LIMIT_REACHED (capped at 8). */
function capacity(lib: Library, member = "m1"): number {
  let n = 0;
  for (let i = 1; i <= 8; i++) {
    if (codeOf(() => lib.borrow(`b${i}`, member, t0)) === "LIMIT_REACHED") return n;
    n++;
  }
  return n;
}

describe("C4 library-wide limit", () => {
  it("default is still 3", () => expect(capacity(setup())).toBe(3));
  it("empty options keep the default", () => expect(capacity(setup({}))).toBe(3));
  it("maxLoansPerMember 1 blocks the 2nd loan", () => expect(capacity(setup({ maxLoansPerMember: 1 }))).toBe(1));
  it("maxLoansPerMember 5 allows 5", () => expect(capacity(setup({ maxLoansPerMember: 5 }))).toBe(5));
  it("a return frees a slot under a custom limit", () => {
    const lib = setup({ maxLoansPerMember: 1 });
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", t0);
    expect(lib.borrow("b2", "m1", t0).bookId).toBe("b2");
  });
});

describe("C4 per-member override", () => {
  it("override above the default wins", () => expect(capacity(setup(undefined, { maxLoans: 5 }))).toBe(5));
  it("override below the library value wins", () =>
    expect(capacity(setup({ maxLoansPerMember: 5 }, { maxLoans: 1 }))).toBe(1));
  it("override above a custom library value wins", () =>
    expect(capacity(setup({ maxLoansPerMember: 1 }, { maxLoans: 2 }))).toBe(2));
  it("members without an override use the library default", () => {
    const lib = setup({ maxLoansPerMember: 2 }, { maxLoans: 5 });
    expect(capacity(lib, "m2")).toBe(2);
  });
});

describe("C4 invalid values throw an Error", () => {
  for (const bad of [0, -2, 2.5, Number.NaN]) {
    it(`new Library({ maxLoansPerMember: ${bad} })`, () => {
      expect(() => new Library({ maxLoansPerMember: bad })).toThrow(Error);
    });
    it(`addMember(..., { maxLoans: ${bad} })`, () => {
      const lib = new Library();
      expect(() => lib.addMember("m1", "Alice", { maxLoans: bad })).toThrow(Error);
    });
  }
});
