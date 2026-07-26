import { describe, expect, it } from "vitest";
import { resolveAskResponse, type AskCandidate } from "./claude";

// The product's core safety property (PROJECT.md invariant / AGENTS.md §1.1): retrieval only, never a
// generated answer. A question with no matching claims MUST come back as `no_source` — it can never be
// `answered` or `partial`, and it can never carry a claim id the model invented. These run with NO
// network: `resolveAskResponse` is the pure guard the API boundary applies to every model response.
const VALID = new Set(["a2", "a9"]);

describe("resolveAskResponse — no answer without a real claim", () => {
  it("collapses an 'answered' with NO claim ids to no_source", () => {
    const candidate: AskCandidate = { kind: "answered", claimIds: [] };
    const out = resolveAskResponse(candidate, VALID, "Is my aspirin 75 or 150?");
    expect(out.kind).toBe("no_source");
    // no_source has ONLY suggestedQuestion — no claimIds, no free-text answer field.
    expect(out).not.toHaveProperty("claimIds");
    expect(Object.keys(out).sort()).toEqual(["kind", "suggestedQuestion"]);
  });

  it("collapses a 'partial' with NO claim ids to no_source", () => {
    const candidate: AskCandidate = { kind: "partial", claimIds: [], gap: "some gap" };
    const out = resolveAskResponse(candidate, VALID, "What about my water tablet?");
    expect(out.kind).toBe("no_source");
    expect(out).not.toHaveProperty("gap");
  });

  it("collapses an 'answered' that cites only INVALID (invented) ids to no_source", () => {
    const candidate: AskCandidate = { kind: "answered", claimIds: ["made-up-1", "made-up-2"] };
    const out = resolveAskResponse(candidate, VALID, "When do I go home?");
    expect(out.kind).toBe("no_source");
  });

  it("uses the model's suggestedQuestion when present, else derives one from the question", () => {
    const withSuggestion = resolveAskResponse(
      { kind: "no_source", claimIds: [], suggestedQuestion: "When can I restart my BP tablet?" },
      VALID,
      "q",
    );
    expect(withSuggestion).toEqual({
      kind: "no_source",
      suggestedQuestion: "When can I restart my BP tablet?",
    });

    const derived = resolveAskResponse({ kind: "no_source", claimIds: [] }, VALID, "Is that safe?");
    expect(derived.kind).toBe("no_source");
    if (derived.kind === "no_source") {
      expect(derived.suggestedQuestion).toContain("Is that safe?");
    }
  });
});

describe("resolveAskResponse — valid retrieval passes through, invented ids dropped", () => {
  it("keeps an 'answered' that cites a real claim", () => {
    const out = resolveAskResponse({ kind: "answered", claimIds: ["a2"] }, VALID, "aspirin?");
    expect(out).toEqual({ kind: "answered", claimIds: ["a2"] });
  });

  it("drops invented ids but keeps the real ones (retrieval-only)", () => {
    const out = resolveAskResponse(
      { kind: "answered", claimIds: ["a2", "ghost", "a9", "a2"] },
      VALID,
      "aspirin?",
    );
    expect(out).toEqual({ kind: "answered", claimIds: ["a2", "a9"] });
  });

  it("keeps a 'partial' with a real claim and preserves the gap", () => {
    const out = resolveAskResponse(
      { kind: "partial", claimIds: ["a2"], gap: "It's not clear which dose is current." },
      VALID,
      "aspirin dose?",
    );
    expect(out).toEqual({
      kind: "partial",
      claimIds: ["a2"],
      gap: "It's not clear which dose is current.",
    });
  });

  it("supplies a neutral gap if 'partial' arrives without one (never a medical fact)", () => {
    const out = resolveAskResponse({ kind: "partial", claimIds: ["a9"] }, VALID, "aspirin?");
    expect(out.kind).toBe("partial");
    if (out.kind === "partial") expect(out.gap.length).toBeGreaterThan(0);
  });
});
