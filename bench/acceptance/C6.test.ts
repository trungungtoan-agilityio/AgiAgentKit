// @ts-nocheck
// Hidden acceptance test for card C6 (listOverdue returns a loan that was already returned late).
// Only behaviour is checked here; whether the root cause was fixed (not just filtered at read time)
// is judged by reading the diff against demo-app/.answers/C6.md.
import { beforeEach, describe, expect, it } from "vitest";
import { Library } from "../src/library";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-03-01T09:00:00Z");
const after = (days: number) => new Date(t0.getTime() + days * DAY);

let lib: Library;
beforeEach(() => {
  lib = new Library();
  lib.addMember("m1", "Alice");
  lib.addMember("m2", "Bob");
  for (const n of [1, 2, 3, 4, 5]) lib.addBook(`b${n}`, `Book ${n}`);
});

describe("C6 late return must leave the overdue list", () => {
  it("a loan returned late is not listed afterwards", () => {
    lib.borrow("b1", "m1", t0);
    const closed = lib.returnBook("b1", after(16));
    expect(closed.feeCents).toBeGreaterThan(0);
    expect(lib.listOverdue(after(30))).toEqual([]);
  });

  it("is also gone right after the late return", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(20));
    expect(lib.listOverdue(after(20))).toEqual([]);
  });

  it("mixed returns: only the still-open overdue loan remains, once", () => {
    lib.borrow("b1", "m1", t0);
    lib.borrow("b2", "m1", t0);
    lib.borrow("b3", "m2", t0);
    lib.borrow("b4", "m2", t0);
    lib.returnBook("b1", after(16));
    lib.returnBook("b2", after(5));
    lib.returnBook("b3", after(40));
    expect(lib.listOverdue(after(60)).map((l) => l.bookId)).toEqual(["b4"]);
  });

  it("a book borrowed again after a late return is listed only for the new loan", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(16));
    const again = lib.borrow("b1", "m2", after(17));
    const overdue = lib.listOverdue(after(40));
    expect(overdue.map((l) => l.id)).toEqual([again.id]);
  });

  it("the ledger agrees: the late loan is closed with its fee", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(16));
    const [loan] = lib.listLoans("m1");
    expect(loan?.returnedAt).toEqual(after(16));
    expect(loan?.feeCents).toBeGreaterThan(0);
  });
});

describe("C6 no regression", () => {
  it("lists only loans past their due date", () => {
    lib.borrow("b1", "m1", t0);
    lib.borrow("b2", "m2", after(10));
    expect(lib.listOverdue(after(15)).map((l) => l.bookId)).toEqual(["b1"]);
  });

  it("does not list a loan returned on time", () => {
    lib.borrow("b1", "m1", t0);
    lib.returnBook("b1", after(5));
    expect(lib.listOverdue(after(30))).toEqual([]);
  });

  it("is empty when nothing is overdue", () => {
    lib.borrow("b1", "m1", t0);
    expect(lib.listOverdue(after(3))).toEqual([]);
  });

  it("a late return still frees the member slot", () => {
    for (const b of ["b1", "b2", "b3"]) lib.borrow(b, "m1", t0);
    lib.returnBook("b1", after(20));
    expect(lib.borrow("b4", "m1", after(20)).bookId).toBe("b4");
  });

  it("late fee value is unchanged for a 2.5 day late return", () => {
    lib.borrow("b1", "m1", t0);
    expect(lib.returnBook("b1", new Date(after(14).getTime() + 2.5 * DAY)).feeCents).toBe(75);
  });
});
