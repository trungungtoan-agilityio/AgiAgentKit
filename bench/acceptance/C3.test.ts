// @ts-nocheck
// Hidden acceptance test for card C3 (reservation queue). Assumed API: lib.reserve(bookId, memberId),
// errors NOT_ON_LOAN / NOT_FOUND / DUPLICATE, returnBook returns the closed loan and opens a new loan
// (borrowedAt = return time) for the first eligible reserver. New loans are read via listLoans(memberId).
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
const openLoan = (member: string, book: string) =>
  lib.listLoans(member).find((l) => l.bookId === book && l.returnedAt === null);

beforeEach(() => {
  lib = new Library();
  for (const m of ["m1", "m2", "m3"]) lib.addMember(m, `Member ${m}`);
  for (const n of [1, 2, 3, 4, 5]) lib.addBook(`b${n}`, `Book ${n}`);
});

describe("C3 reserve validation", () => {
  it("rejects a book that is not on loan with NOT_ON_LOAN", () => {
    expect(codeOf(() => lib.reserve("b1", "m2"))).toBe("NOT_ON_LOAN");
  });

  it("rejects unknown book or member with NOT_FOUND", () => {
    lib.borrow("b1", "m1", t0);
    expect(codeOf(() => lib.reserve("nope", "m2"))).toBe("NOT_FOUND");
    expect(codeOf(() => lib.reserve("b1", "nope"))).toBe("NOT_FOUND");
  });

  it("rejects the same member reserving the same book twice with DUPLICATE", () => {
    lib.borrow("b1", "m1", t0);
    lib.reserve("b1", "m2");
    expect(codeOf(() => lib.reserve("b1", "m2"))).toBe("DUPLICATE");
  });
});

describe("C3 return hands the book to the first reserver", () => {
  it("one reserver: gets a new loan at return time", () => {
    lib.borrow("b1", "m1", t0);
    lib.reserve("b1", "m2");
    const closed = lib.returnBook("b1", after(3));
    expect(closed.memberId).toBe("m1");
    expect(closed.returnedAt).toEqual(after(3));
    const next = openLoan("m2", "b1");
    expect(next).toBeDefined();
    expect(next?.borrowedAt).toEqual(after(3));
    expect(next?.dueAt.getTime()).toBe(after(17).getTime());
    expect(openLoan("m1", "b1")).toBeUndefined();
  });

  it("several reservers: FIFO order across successive returns", () => {
    lib.borrow("b1", "m1", t0);
    lib.reserve("b1", "m2");
    lib.reserve("b1", "m3");
    lib.returnBook("b1", after(3));
    expect(openLoan("m2", "b1")).toBeDefined();
    expect(openLoan("m3", "b1")).toBeUndefined();
    lib.returnBook("b1", after(5));
    expect(openLoan("m3", "b1")).toBeDefined();
    expect(openLoan("m2", "b1")).toBeUndefined();
  });

  it("a reserver at the loan limit is skipped in favour of the next one", () => {
    lib.borrow("b1", "m1", t0);
    lib.reserve("b1", "m2");
    lib.reserve("b1", "m3");
    for (const b of ["b2", "b3", "b4"]) lib.borrow(b, "m2", t0);
    lib.returnBook("b1", after(2));
    expect(openLoan("m2", "b1")).toBeUndefined();
    expect(openLoan("m3", "b1")).toBeDefined();
  });

  it("a late return (with fee) still hands the book over", () => {
    lib.borrow("b1", "m1", t0);
    lib.reserve("b1", "m2");
    const closed = lib.returnBook("b1", new Date(after(14).getTime() + 2.5 * DAY));
    expect(closed.feeCents).toBe(75);
    expect(openLoan("m2", "b1")).toBeDefined();
  });

  it("no reservation: behaves as before", () => {
    lib.borrow("b1", "m1", t0);
    const closed = lib.returnBook("b1", after(3));
    expect(closed.returnedAt).toEqual(after(3));
    expect(closed.feeCents).toBe(0);
    expect(lib.listLoans("m1")).toHaveLength(1);
    expect(lib.listLoans("m2")).toEqual([]);
    expect(lib.borrow("b1", "m2", after(4)).memberId).toBe("m2");
  });

  it("existing behaviour: not-on-loan return and limit still enforced", () => {
    expect(codeOf(() => lib.returnBook("b1", t0))).toBe("NOT_ON_LOAN");
    for (const b of ["b1", "b2", "b3"]) lib.borrow(b, "m1", t0);
    expect(codeOf(() => lib.borrow("b4", "m1", t0))).toBe("LIMIT_REACHED");
  });
});
