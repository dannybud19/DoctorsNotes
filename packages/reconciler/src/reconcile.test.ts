import { describe, expect, it } from "vitest";
import { NotImplementedError, ReconcileInput } from "@doctorsnotes/domain";
import { reconcile } from "./reconcile.js";
import fixture from "./fixtures/metoprolol.json";

/**
 * Offline, fixture-driven. No network, no I/O — the fixture is imported as JSON and validated
 * against the domain schema. This proves the harness runs network-free (plan verification) and
 * that our synthetic data is well-formed. The behavioural assertions are `it.todo` until the
 * reconciler is implemented; the stub is expected to fail loudly in the meantime.
 */
describe("reconcile (offline, fixture-driven)", () => {
  const input = ReconcileInput.parse(fixture);

  it("synthetic fixture is valid domain data", () => {
    expect(input.claims.length).toBe(5);
    expect(input.confirmations).toEqual([]);
    // Every claim carries verbatim text and resolvable provenance (invariant §1.2).
    for (const claim of input.claims) {
      expect(claim.verbatimText.length).toBeGreaterThan(0);
      expect(["audio", "document"]).toContain(claim.source.kind);
    }
  });

  it("fails loudly until implemented (fail-loudly invariant §1.6)", () => {
    expect(() => reconcile(input)).toThrow(NotImplementedError);
  });

  // --- Behavioural contract, to be implemented against this fixture ---
  it.todo("groups metoprolol (c1 vs c2) as 'worth_confirming' — two differing values");
  it.todo("marks furosemide (c3) 'uncorroborated' — a single source");
  it.todo("marks cardiology-clinic (c4 + c5) 'agreed' — identical value");
  it.todo("orders each group's claims oldest → newest by observedAt");
  it.todo("never emits a winner, severity, or advice field");
});
