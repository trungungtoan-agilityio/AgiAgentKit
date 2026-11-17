import { beforeEach, describe, expect, it } from "vitest";
import { Library } from "../src/library";
import { LibraryError } from "../src/types";

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

describe("catalog", () => {
  it("rejects duplicate books and members", () => {
    expect(() => lib.addBook("b1", "Again")).toThrow(LibraryError);
    expect(() => lib.addMember("m1", "Again")).toThrow(LibraryError);
  });
});

describe("borrow", () => {
  it("creates a loan due in 14 days", () => {
    const loan = lib.borrow("b1", "m1", t0);
    expect(loan.returnedAt).toBeNull();
    expect(loan.dueAt.getTime()).toBe(after(14).getTime());
  });

  it("rejects unknown book or member", () => {
    expect(() => lib.borrow("nope", "m1", t0)).toThrow(/not found/);
    expect(() => lib.borrow("b1", "nope", t0)).toThrow(/not found/);
  });

  it("enforces the limit of 3 open loans per member", () => {
    lib.borrow("b1", "m1", t0);
    lib.borrow("b2", "m1", t0);
    lib.borrow("b3", "m1", t0);
    expect(() => lib.borrow("b4", "m1", t0)).toThrow(/limit/);
    expect(lib.borrow("b4", "m2", t0).memberId).toBe("m2");
  });
});

describe("returnBook", () => {
  it("closes an on-time loan with no fee", () => {
    lib.borrow("b1", "m1", t0);
    const closed = lib.returnBook("b1", after(10));
    expect(closed.returnedAt).toEqual(after(10));
    expect(closed.feeCents).toBe(0);
  });

  it("charges a fee for a late return", () => {
    lib.borrow("b1", "m1", t0);
    const closed = lib.returnBook("b1", new Date(after(14).getTime() + 2.5 * DAY));
    expect(closed.feeCents).toBe(75);
  });

  it("frees the member slot after a return", () => {
    for (const id of ["b1", "b2", "b3"]) lib.borrow(id, "m1", t0);
    lib.returnBook("b1", after(1));
    expect(lib.borrow("b4", "m1", after(1)).bookId).toBe("b4");
  });

  it("throws when the book is not on loan", () => {
    expect(() => lib.returnBook("b1", t0)).toThrow(/not on loan/);
  });
});

describe("listOverdue", () => {
  it("lists only loans past their due date", () => {
    lib.borrow("b1", "m1", t0);
    lib.borrow("b2", "m2", after(10));
    const overdue = lib.listOverdue(after(15));
    expect(overdue.map((l) => l.bookId)).toEqual(["b1"]);
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
});
