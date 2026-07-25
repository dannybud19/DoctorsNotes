import { describe, expect, it } from "vitest";
import {
  InvariantError,
  ReconcileInput,
  type Claim,
  type ClaimGroup,
  type Confirmation,
} from "@doctorsnotes/domain";
import { reconcile } from "./reconcile.js";
import metoprololFixture from "./fixtures/metoprolol.json";
import admissionFixture from "./fixtures/admission-5day.json";

/**
 * Independent, contract-derived tests for reconcile().
 *
 * Every assertion is derived from the CONTRACT — AGENTS.md §1.1 (never adjudicate), PROJECT.md §3
 * (domain model), and the JSDoc in reconcile.ts — NOT from observed implementation behaviour.
 *
 * Offline & network-free: fixtures are imported as static JSON and validated with
 * ReconcileInput.parse; there is no fetch/fs/network anywhere in this file. reconcile() is a pure
 * function, so these tests run identically on server and on-device.
 */

// A minimal, valid Claim builder for hand-built edge cases. Defaults are valid; callers override
// only the fields under test. Inputs built from this are still run through ReconcileInput.parse so
// malformed test data fails loudly rather than silently exercising the wrong path.
function makeClaim(overrides: Partial<Claim> & Pick<Claim, "id">): Claim {
  return {
    patientId: "synthetic-patient-1",
    category: "medication-dose",
    subject: "metoprolol",
    verbatimText: "verbatim words",
    value: "25mg twice daily",
    source: {
      kind: "audio",
      recordingId: "rec-x",
      startMs: 0,
      endMs: 1000,
      speaker: { role: "consultant" },
    },
    observedAt: "2026-06-09T09:14:00Z",
    ...overrides,
  };
}

function parseInput(claims: Claim[], confirmations: Confirmation[] = []): ReconcileInput {
  return ReconcileInput.parse({ claims, confirmations });
}

const ALLOWED_GROUP_KEYS = ["category", "claims", "confirmation", "status", "subject"];

describe("reconcile — fixtures are valid, offline domain data", () => {
  it("metoprolol fixture parses and carries verbatim + resolvable provenance (§1.2)", () => {
    const input = ReconcileInput.parse(metoprololFixture);
    expect(input.claims.length).toBe(5);
    expect(input.confirmations).toEqual([]);
    for (const claim of input.claims) {
      expect(claim.verbatimText.length).toBeGreaterThan(0);
      expect(["audio", "document"]).toContain(claim.source.kind);
    }
  });

  it("admission-5day fixture parses and includes a populated Confirmation", () => {
    const input = ReconcileInput.parse(admissionFixture);
    expect(input.claims.length).toBe(13);
    expect(input.confirmations.length).toBe(1);
    expect(input.confirmations[0]!.fromClaimId).toBe("a2");
  });
});

describe("reconcile — grouping by (category, subject)", () => {
  it("puts claims sharing (category, subject) in one group; different subject/category split", () => {
    const input = parseInput([
      makeClaim({ id: "g1", category: "medication-dose", subject: "metoprolol" }),
      makeClaim({ id: "g2", category: "medication-dose", subject: "metoprolol" }),
      // Same category, different subject → separate group.
      makeClaim({ id: "g3", category: "medication-dose", subject: "aspirin" }),
      // Same subject, different category → separate group.
      makeClaim({ id: "g4", category: "medication-change", subject: "metoprolol" }),
    ]);

    const out = reconcile(input);
    expect(out.length).toBe(3);

    const doseMetoprolol = out.find(
      (g) => g.category === "medication-dose" && g.subject === "metoprolol",
    )!;
    expect(doseMetoprolol.claims.map((c) => c.id).sort()).toEqual(["g1", "g2"]);

    // The other two are singletons kept distinct by subject / category respectively.
    expect(
      out.find((g) => g.category === "medication-dose" && g.subject === "aspirin")!.claims.map(
        (c) => c.id,
      ),
    ).toEqual(["g3"]);
    expect(
      out.find((g) => g.category === "medication-change" && g.subject === "metoprolol")!.claims.map(
        (c) => c.id,
      ),
    ).toEqual(["g4"]);
  });

  it("real fixture yields the expected three subject groups", () => {
    const out = reconcile(ReconcileInput.parse(metoprololFixture));
    const keys = out.map((g) => `${g.category}/${g.subject}`).sort();
    expect(keys).toEqual([
      "follow-up/cardiology-clinic",
      "medication-change/furosemide",
      "medication-dose/metoprolol",
    ]);
  });
});

describe("reconcile — status classification (never adjudicates)", () => {
  const out = reconcile(ReconcileInput.parse(metoprololFixture));
  const group = (subject: string): ClaimGroup => out.find((g) => g.subject === subject)!;

  it("'worth_confirming' when >=2 genuinely different values (25mg twice vs 50mg once)", () => {
    expect(group("metoprolol").status).toBe("worth_confirming");
  });

  it("'uncorroborated' for a single claim", () => {
    expect(group("furosemide").status).toBe("uncorroborated");
  });

  it("'agreed' when all values are identical", () => {
    expect(group("cardiology-clinic").status).toBe("agreed");
  });

  it("'agreed' when values differ ONLY by whitespace ('25mg' vs '25 mg')", () => {
    const input = parseInput([
      makeClaim({ id: "w1", value: "25mg", observedAt: "2026-06-09T09:00:00Z" }),
      makeClaim({ id: "w2", value: "25 mg", observedAt: "2026-06-10T09:00:00Z" }),
    ]);
    expect(reconcile(input)[0]!.status).toBe("agreed");
  });

  it("'agreed' when values differ ONLY by case", () => {
    const input = parseInput([
      makeClaim({ id: "c1", value: "Cardiology Clinic in 6 Weeks", subject: "clinic" }),
      makeClaim({
        id: "c2",
        value: "cardiology clinic in 6 weeks",
        subject: "clinic",
        observedAt: "2026-06-10T09:00:00Z",
      }),
    ]);
    expect(reconcile(input)[0]!.status).toBe("agreed");
  });

  it("'worth_confirming' for a 3+ claim group with a genuine divergence", () => {
    // Two identical-after-canonicalization values plus one genuinely different value.
    const input = parseInput([
      makeClaim({ id: "m1", value: "25mg twice daily", observedAt: "2026-06-08T09:00:00Z" }),
      makeClaim({ id: "m2", value: "25 mg twice daily", observedAt: "2026-06-11T09:00:00Z" }),
      makeClaim({ id: "m3", value: "50mg once daily", observedAt: "2026-06-12T09:00:00Z" }),
    ]);
    const g = reconcile(input)[0]!;
    expect(g.claims.length).toBe(3);
    expect(g.status).toBe("worth_confirming");
  });
});

describe("reconcile — ordering oldest → newest by observedAt", () => {
  it("orders a shuffled group chronologically, independent of input order", () => {
    const input = parseInput([
      makeClaim({ id: "late", observedAt: "2026-06-12T16:05:00Z" }),
      makeClaim({ id: "early", observedAt: "2026-06-08T09:00:00Z" }),
      makeClaim({ id: "middle", observedAt: "2026-06-10T11:30:00Z" }),
    ]);
    const g = reconcile(input)[0]!;
    expect(g.claims.map((c) => c.id)).toEqual(["early", "middle", "late"]);
  });

  it("real fixture group is ordered oldest → newest", () => {
    const out = reconcile(ReconcileInput.parse(metoprololFixture));
    const metoprolol = out.find((g) => g.subject === "metoprolol")!;
    // c1 observed 2026-06-09, c2 observed 2026-06-12.
    expect(metoprolol.claims.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("reconcile — confirmation attachment", () => {
  it("attaches a matching (category, subject) Confirmation", () => {
    const out = reconcile(ReconcileInput.parse(admissionFixture));
    const aspirin = out.find(
      (g) => g.category === "medication-dose" && g.subject === "aspirin",
    )!;
    expect(aspirin.confirmation).not.toBeNull();
    expect(aspirin.confirmation!.id).toBe("conf-aspirin");
    expect(aspirin.confirmation!.subject).toBe("aspirin");
  });

  it("yields null confirmation for a non-matching subject", () => {
    const out = reconcile(ReconcileInput.parse(admissionFixture));
    const metoprolol = out.find(
      (g) => g.category === "medication-dose" && g.subject === "metoprolol",
    )!;
    expect(metoprolol.confirmation).toBeNull();
  });

  it("throws InvariantError when >1 Confirmation matches (must NOT silently pick one)", () => {
    const claims = [makeClaim({ id: "x1", category: "medication-dose", subject: "metoprolol" })];
    const conf = (id: string): Confirmation => ({
      id,
      patientId: "synthetic-patient-1",
      category: "medication-dose",
      subject: "metoprolol",
      confirmedValue: "25mg twice daily",
      fromClaimId: "x1",
      confirmedAt: "2026-06-12T18:00:00Z",
    });
    const input = parseInput(claims, [conf("conf-a"), conf("conf-b")]);
    expect(() => reconcile(input)).toThrow(InvariantError);
  });
});

describe("reconcile — fail loudly (§1.6)", () => {
  // These hand-build inputs directly (NOT via ReconcileInput.parse): the IsoTimestamp zod schema
  // would reject a bad timestamp at the boundary, so to exercise reconcile()'s OWN guard we must
  // pass a malformed observedAt straight through. The contract is that reconcile fails loudly on an
  // unparseable observedAt regardless of group size — no silent fallback.
  it("throws InvariantError on an unparseable observedAt in a MULTI-claim group", () => {
    const good: Claim = makeClaim({ id: "ok", observedAt: "2026-06-09T09:00:00Z" });
    const bad: Claim = { ...makeClaim({ id: "bad" }), observedAt: "not-a-timestamp" };
    const input: ReconcileInput = { claims: [good, bad], confirmations: [] };
    expect(() => reconcile(input)).toThrow(InvariantError);
  });

  it("throws InvariantError on an unparseable observedAt in a SINGLE-claim group (§1.6)", () => {
    // Regression guard for the singleton silent-fallback gap: a single (uncorroborated) claim with
    // a garbage timestamp must ALSO fail loudly, not slip through because a 1-element sort skips its
    // comparator.
    const bad: Claim = { ...makeClaim({ id: "solo" }), observedAt: "not-a-timestamp" };
    const input: ReconcileInput = { claims: [bad], confirmations: [] };
    expect(() => reconcile(input)).toThrow(InvariantError);
  });
});

describe("reconcile — never adjudicate (invariant §1.1)", () => {
  it("emits ONLY {category, subject, status, claims, confirmation} — no winner/severity/rank/score/correct", () => {
    const out = reconcile(ReconcileInput.parse(admissionFixture));
    const forbidden = /winner|sever|rank|score|correct|priorit|advice|recommend|triage|risk/i;
    for (const group of out) {
      expect(Object.keys(group).sort()).toEqual(ALLOWED_GROUP_KEYS);
      for (const key of Object.keys(group)) {
        expect(key).not.toMatch(forbidden);
      }
    }
  });

  it("preserves every claim's verbatimText unchanged (no paraphrase, §1.2)", () => {
    const input = ReconcileInput.parse(admissionFixture);
    const verbatimById = new Map(input.claims.map((c) => [c.id, c.verbatimText]));
    const out = reconcile(input);
    for (const group of out) {
      for (const claim of group.claims) {
        expect(claim.verbatimText).toBe(verbatimById.get(claim.id));
      }
    }
  });
});

describe("reconcile — determinism (pure function)", () => {
  it("same input → deeply equal output across two calls", () => {
    const input = ReconcileInput.parse(metoprololFixture);
    expect(reconcile(input)).toEqual(reconcile(input));
  });

  it("different input ORDER → identical output", () => {
    const input = ReconcileInput.parse(metoprololFixture);
    const baseline = reconcile(input);

    const shuffled: ReconcileInput = {
      claims: [...input.claims].reverse(),
      confirmations: input.confirmations,
    };
    expect(reconcile(shuffled)).toEqual(baseline);
  });
});
