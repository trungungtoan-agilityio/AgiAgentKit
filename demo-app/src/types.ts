export interface Book {
  id: string;
  title: string;
}

export interface Member {
  id: string;
  name: string;
}

export interface Loan {
  id: number;
  bookId: string;
  memberId: string;
  borrowedAt: Date;
  dueAt: Date;
  /** null while the book is still out. */
  returnedAt: Date | null;
  /** Late fee in cents, set when the loan is closed. */
  feeCents?: number;
}

export type LibraryErrorCode =
  | "DUPLICATE"
  | "NOT_FOUND"
  | "LIMIT_REACHED"
  | "NOT_ON_LOAN";

export class LibraryError extends Error {
  constructor(
    public readonly code: LibraryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LibraryError";
  }
}
