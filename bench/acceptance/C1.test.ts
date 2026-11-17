// @ts-nocheck
// Hidden acceptance test for card C1 (late fee off by one day at the boundary).
import { describe, expect, it } from "vitest";
import { FEE_PER_DAY_CENTS, lateFeeCents } from "../src/fees";
import { Library } from "../src/library";

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const due = new Date("2026-03-15T12:00:00Z");
const late = (ms: number) => lateFeeCents(due, new Date(due.getTime() + ms));

describe("C1 lateFeeCents boundaries", () => {
  it("exactly 1 day late costs 1 day", () => expect(late(DAY)).toBe(FEE_PER_DAY_CENTS));
  it("exactly 2 days late costs 2 days", () => expect(late(2 * DAY)).toBe(2 * FEE_PER_DAY_CENTS));
  it("exactly 3 days late costs 3 days", () => expect(late(3 * DAY)).toBe(3 * FEE_PER_DAY_CENTS));
  it("1 day + 1 minute costs 2 days", () => expect(late(DAY + MIN)).toBe(2 * FEE_PER_DAY_CENTS));
  it("1 ms late costs 1 day", () => expect(late(1)).toBe(FEE_PER_DAY_CENTS));
  it("2.5 days late costs 3 days", () => expect(late(2.5 * DAY)).toBe(3 * FEE_PER_DAY_CENTS));
  it("on time or early is free", () => {
    expect(late(0)).toBe(0);
    expect(late(-DAY)).toBe(0);
  });
  it("the per-day rate is still 25 cents", () => expect(FEE_PER_DAY_CENTS).toBe(25));
});

describe("C1 through the library", () => {
  it("returning exactly 1 day after the due date stores a 25 cent fee", () => {
    const lib = new Library();
    lib.addMember("m1", "Alice");
    lib.addBook("b1", "Book 1");
    const t0 = new Date("2026-03-01T09:00:00Z");
    const loan = lib.borrow("b1", "m1", t0);
    const closed = lib.returnBook("b1", new Date(loan.dueAt.getTime() + DAY));
    expect(closed.feeCents).toBe(25);
  });
});
