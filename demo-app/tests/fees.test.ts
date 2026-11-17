import { describe, expect, it } from "vitest";
import { FEE_PER_DAY_CENTS, lateFeeCents } from "../src/fees";

const DAY = 24 * 60 * 60 * 1000;
const due = new Date("2026-03-15T12:00:00Z");

describe("lateFeeCents", () => {
  it("is free when returned before the due date", () => {
    expect(lateFeeCents(due, new Date(due.getTime() - DAY))).toBe(0);
  });

  it("is free when returned exactly at the due date", () => {
    expect(lateFeeCents(due, due)).toBe(0);
  });

  it("charges one day for a few hours late", () => {
    expect(lateFeeCents(due, new Date(due.getTime() + 3 * 60 * 60 * 1000))).toBe(
      FEE_PER_DAY_CENTS,
    );
  });

  it("charges per started day for a partial late return", () => {
    expect(lateFeeCents(due, new Date(due.getTime() + 2.5 * DAY))).toBe(3 * FEE_PER_DAY_CENTS);
  });
});
