// @ts-nocheck
// Hidden acceptance test for card C2 (cannot borrow a book that is already on loan).
import { beforeEach, describe, expect, it } from "vitest";
import { Library } from "../src/library";
import { LibraryError } from "../src/types";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-03-01T09:00:00Z");
const after = (days: number) => new Date(t0.getTime() + days * DAY);

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof LibraryError ? e.code : `non-LibraryError:${String(e)}`;
  }
  return undefined;
}

let lib: Library;
beforeEach(() => {
  lib = new Library();
  lib.addMember("m1", "Alice");
  lib.addMember("m2", "Bob");
  for (const n of [1, 2, 3]) lib.addBook(`b${n}`, `Book ${n}`);
});

describe("C2 borrow a book already on loan", () => {
  it("another member gets ALREADY_ON_LOAN", () => {
    lib.borrow("b1", "m1", t0);
    expect(codeOf(() => lib.borrow("b1", "m2", after(1)))).toBe("ALREADY_ON_LOAN");
  });

  it("the same member gets ALREADY_ON_LOAN", () => {
    lib.borrow("b1", "m1", t0);
    expect(codeOf(() => lib.borrow("b1", "m1", after(1)))).toBe("ALREADY_ON_LOAN");
  });

  it("the old loan is unchanged and no new loan is created", () => {
    const first = lib.borrow("b1", "m1", t0);
    expect(codeOf(() => lib.borrow("b1", "m2", after(1)))).toBe("ALREADY_ON_LOAN");
    expect(lib.listLoans("m2")).toEqual([]);
    expect(lib.listLoans("m1")).toHaveLength(1);
    expect(lib.listLoans("m1")[0]?.id).toBe(first.id);
    expect(lib.listLoans("m1")[0]?.returnedAt).toBeNull();
    expect(lib.listLoans("m1")[0]?.borrowedAt).toEqual(t0);
  });

  it("can be borrowed again after an on-time return", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(3));
    expect(lib.borrow("b1", "m2", after(4)).memberId).toBe("m2");
  });

  it("can be borrowed again after a late return", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(20));
    expect(lib.borrow("b1", "m1", after(21)).bookId).toBe("b1");
    expect(codeOf(() => lib.borrow("b1", "m2", after(22)))).toBe("ALREADY_ON_LOAN");
  });

  it("unknown book or member still reports NOT_FOUND", () => {
    expect(codeOf(() => lib.borrow("nope", "m1", t0))).toBe("NOT_FOUND");
    expect(codeOf(() => lib.borrow("b1", "nope", t0))).toBe("NOT_FOUND");
  });

  it("different books are unaffected", () => {
    lib.borrow("b1", "m1", t0);
    expect(lib.borrow("b2", "m2", t0).bookId).toBe("b2");
  });
});
