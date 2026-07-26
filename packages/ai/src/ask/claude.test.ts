import { describe, expect, it } from "vitest";
import { resolveAskResponse, type AskCandidate, type ClaimMeta } from "./claude";

// The product's core safety property (D18, widened by D19): retrieval only, and prose only where it is
// grounded. A question with no matching claim — OR an answer with no prose — MUST come back as
// `no_source`; it can never carry a claim id the model invented, and `citations` (who/when) are built
// from the claim map, never from the model. These run with NO network: `resolveAskResponse` is the pure
// guard the API boundary applies to every model response.
const CLAIMS = new Map<string, ClaimMeta>([
  ["a2", { speaker: "Dr Kelly", observedAt: "2024-11-01T09:10:00Z" }],
  ["a9", { speaker: "your discharge letter", observedAt: "2024-11-01T10:00:00Z" }],
]);

describe("resolveAskResponse — no answer without a real, grounded claim", () => {
  it("collapses an 'answered' with NO claim ids to no_source (prose dropped)", () => {
    const candidate: AskCandidate = { kind: "answered", claimIds: [], answerText: "You take aspirin." };
    const out = resolveAskResponse(candidate, CLAIMS, "Is my aspirin 75 or 150?");
    expect(out.kind).toBe("no_source");
    // no_source is strict — no claimIds, no answerText, no citations survive.
    expect(Object.keys(out).sort()).toEqual(["kind", "suggestedQuestion"]);
  });

  it("collapses an 'answered' that HAS a claim but NO answerText to no_source", () => {
    const candidate: AskCandidate = { kind: "answered", claimIds: ["a2"] };
    const out = resolveAskResponse(candidate, CLAIMS, "aspirin?");
    expect(out.kind).toBe("no_source");
  });

  it("collapses a 'partial' with NO claim ids to no_source", () => {
    const candidate: AskCandidate = { kind: "partial", claimIds: [], gap: "some gap", answerText: "x" };
    const out = resolveAskResponse(candidate, CLAIMS, "What about my water tablet?");
    expect(out.kind).toBe("no_source");
    expect(out).not.toHaveProperty("gap");
    expect(out).not.toHaveProperty("answerText");
  });

  it("collapses an 'answered' that cites only INVALID (invented) ids to no_source", () => {
    const candidate: AskCandidate = { kind: "answered", claimIds: ["made-up-1"], answerText: "x" };
    const out = resolveAskResponse(candidate, CLAIMS, "When do I go home?");
    expect(out.kind).toBe("no_source");
  });

  it("uses the model's suggestedQuestion when present, else derives one from the question", () => {
    const withSuggestion = resolveAskResponse(
      { kind: "no_source", claimIds: [], suggestedQuestion: "When can I restart my BP tablet?" },
      CLAIMS,
      "q",
    );
    expect(withSuggestion).toEqual({
      kind: "no_source",
      suggestedQuestion: "When can I restart my BP tablet?",
    });

    const derived = resolveAskResponse({ kind: "no_source", claimIds: [] }, CLAIMS, "Is that safe?");
    expect(derived.kind).toBe("no_source");
    if (derived.kind === "no_source") expect(derived.suggestedQuestion).toContain("Is that safe?");
  });
});

describe("resolveAskResponse — grounded answers carry server-built citations", () => {
  it("keeps an 'answered' with prose and builds a citation from the claim map", () => {
    const out = resolveAskResponse(
      { kind: "answered", claimIds: ["a2"], answerText: "You're on aspirin, one 75 mg tablet once a day." },
      CLAIMS,
      "aspirin?",
    );
    expect(out).toEqual({
      kind: "answered",
      claimIds: ["a2"],
      answerText: "You're on aspirin, one 75 mg tablet once a day.",
      citations: [{ claimId: "a2", speaker: "Dr Kelly", observedAt: "2024-11-01T09:10:00Z" }],
    });
  });

  it("drops invented ids, keeps the real ones, and cites who/when from the map (not the model)", () => {
    const out = resolveAskResponse(
      { kind: "answered", claimIds: ["a2", "ghost", "a9", "a2"], answerText: "Two doses were recorded." },
      CLAIMS,
      "aspirin dose?",
    );
    expect(out.kind).toBe("answered");
    if (out.kind === "answered") {
      expect(out.claimIds).toEqual(["a2", "a9"]);
      expect(out.citations.map((c) => c.claimId)).toEqual(["a2", "a9"]);
      expect(out.citations[0]!.speaker).toBe("Dr Kelly");
      expect(out.citations[1]!.speaker).toBe("your discharge letter");
    }
  });

  it("keeps a grounded 'partial' with prose, gap and citations", () => {
    const out = resolveAskResponse(
      {
        kind: "partial",
        claimIds: ["a2"],
        gap: "Which dose is current?",
        answerText: "You were told 75 mg.",
      },
      CLAIMS,
      "aspirin dose?",
    );
    expect(out).toEqual({
      kind: "partial",
      claimIds: ["a2"],
      gap: "Which dose is current?",
      answerText: "You were told 75 mg.",
      citations: [{ claimId: "a2", speaker: "Dr Kelly", observedAt: "2024-11-01T09:10:00Z" }],
    });
  });

  it("supplies a neutral gap if a grounded 'partial' arrives without one", () => {
    const out = resolveAskResponse(
      { kind: "partial", claimIds: ["a9"], answerText: "Your letter says 150 mg." },
      CLAIMS,
      "aspirin?",
    );
    expect(out.kind).toBe("partial");
    if (out.kind === "partial") expect(out.gap.length).toBeGreaterThan(0);
  });
});
