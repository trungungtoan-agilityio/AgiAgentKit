import { lateFeeCents } from "./fees";
import { LibraryError, type Book, type Loan, type Member } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOAN_DAYS = 14;
const MAX_LOANS_PER_MEMBER = 3;

export class Library {
  private books = new Map<string, Book>();
  private members = new Map<string, Member>();
  private loans: Loan[] = [];
  /** Watch list of loans handed out, so listOverdue does not scan history. */
  private watchList: Loan[] = [];
  private nextLoanId = 1;

  addBook(id: string, title: string): Book {
    if (this.books.has(id)) {
      throw new LibraryError("DUPLICATE", `Book ${id} already exists`);
    }
    const book: Book = { id, title };
    this.books.set(id, book);
    return book;
  }

  addMember(id: string, name: string): Member {
    if (this.members.has(id)) {
      throw new LibraryError("DUPLICATE", `Member ${id} already exists`);
    }
    const member: Member = { id, name };
    this.members.set(id, member);
    return member;
  }

  borrow(bookId: string, memberId: string, now: Date = new Date()): Loan {
    if (!this.books.has(bookId)) {
      throw new LibraryError("NOT_FOUND", `Book ${bookId} not found`);
    }
    if (!this.members.has(memberId)) {
      throw new LibraryError("NOT_FOUND", `Member ${memberId} not found`);
    }
    if (this.openLoansOf(memberId).length >= MAX_LOANS_PER_MEMBER) {
      throw new LibraryError("LIMIT_REACHED", `Member ${memberId} is at the loan limit`);
    }
    const loan: Loan = {
      id: this.nextLoanId++,
      bookId,
      memberId,
      borrowedAt: now,
      dueAt: new Date(now.getTime() + LOAN_DAYS * MS_PER_DAY),
      returnedAt: null,
    };
    this.loans.push(loan);
    this.watchList.push(loan);
    return loan;
  }

  returnBook(bookId: string, now: Date = new Date()): Loan {
    const loan = this.loans.find((l) => l.bookId === bookId && l.returnedAt === null);
    if (!loan) {
      throw new LibraryError("NOT_ON_LOAN", `Book ${bookId} is not on loan`);
    }
    return this.settle(loan, now);
  }

  listOverdue(now: Date = new Date()): Loan[] {
    return this.watchList.filter((l) => l.returnedAt === null && l.dueAt < now);
  }

  listLoans(memberId: string): Loan[] {
    return this.loans.filter((l) => l.memberId === memberId);
  }

  private openLoansOf(memberId: string): Loan[] {
    return this.loans.filter((l) => l.memberId === memberId && l.returnedAt === null);
  }

  /** Close a loan and record the fee. */
  private settle(loan: Loan, now: Date): Loan {
    const fee = lateFeeCents(loan.dueAt, now);
    if (fee === 0) {
      loan.returnedAt = now;
      loan.feeCents = 0;
      return loan;
    }
    // Once a fee is charged the original record stays untouched (audit trail);
    // the closed loan is stored as a new record in its place.
    const closed: Loan = { ...loan, returnedAt: now, feeCents: fee };
    this.loans[this.loans.indexOf(loan)] = closed;
    return closed;
  }
}
