/**
 * Shared error types. We fail loudly (AGENTS.md §1.6): stubs throw NotImplementedError, and broken
 * invariants throw InvariantError — never a silent default or swallowed exception.
 */
export class DoctorsNotesError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class NotImplementedError extends DoctorsNotesError {
  constructor(what: string) {
    super(`Not implemented: ${what}`);
  }
}

/** Thrown when a hard invariant is violated (e.g. a claim missing resolvable provenance). */
export class InvariantError extends DoctorsNotesError {}
