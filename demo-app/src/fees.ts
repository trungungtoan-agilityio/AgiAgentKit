const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Late fee per started day, in cents. */
export const FEE_PER_DAY_CENTS = 25;

/**
 * Late fee in cents. Intended rule: every started day after `dueAt` costs
 * FEE_PER_DAY_CENTS; returning at or before `dueAt` is free.
 */
export function lateFeeCents(dueAt: Date, returnedAt: Date): number {
  const diff = returnedAt.getTime() - dueAt.getTime();
  if (diff <= 0) return 0;
  const daysLate = Math.floor(diff / MS_PER_DAY) + 1;
  return daysLate * FEE_PER_DAY_CENTS;
}
