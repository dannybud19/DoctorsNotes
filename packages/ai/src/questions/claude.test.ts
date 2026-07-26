import { describe, expect, it } from "vitest";
import { resolveGeneratedQuestions, type QuestionCandidate } from "./claude";

// AI-generated doctor-questions must be GROUNDED (>= 1 real claim id) and phrased as QUESTIONS (end with
// '?'). The pure guard drops anything ungrounded or non-interrogative before it ships — mechanically
// blocking advice/instructions. Network-free.
const VALID = new Set(["a1", "a3"]);

describe("resolveGeneratedQuestions", () => {
  it("keeps grounded questions and stamps ids + valid fromClaimIds", () => {
    const cands: QuestionCandidate[] = [
      { prompt: "How severe was my heart attack?", fromClaimIds: ["a1"] },
      { prompt: "What side effects should I watch for with lisinopril?", fromClaimIds: ["a3"] },
    ];
    const out = resolveGeneratedQuestions(cands, VALID);
    expect(out.questions).toEqual([
      { id: "gq0", prompt: "How severe was my heart attack?", fromClaimIds: ["a1"] },
      { id: "gq1", prompt: "What side effects should I watch for with lisinopril?", fromClaimIds: ["a3"] },
    ]);
  });

  it("drops questions with no valid claim id (ungrounded)", () => {
    const out = resolveGeneratedQuestions(
      [{ prompt: "What is my prognosis?", fromClaimIds: ["ghost"] }],
      VALID,
    );
    expect(out.questions).toEqual([]);
  });

  it("drops non-interrogative prompts (blocks advice/instructions)", () => {
    const out = resolveGeneratedQuestions(
      [{ prompt: "You should stop taking aspirin.", fromClaimIds: ["a1"] }],
      VALID,
    );
    expect(out.questions).toEqual([]);
  });

  it("filters invented ids but keeps a question if >= 1 real id remains", () => {
    const out = resolveGeneratedQuestions(
      [{ prompt: "What raised my risk?", fromClaimIds: ["ghost", "a1", "a1"] }],
      VALID,
    );
    expect(out.questions).toEqual([{ id: "gq0", prompt: "What raised my risk?", fromClaimIds: ["a1"] }]);
  });

  it("empty in → empty out", () => {
    expect(resolveGeneratedQuestions([], VALID).questions).toEqual([]);
  });
});
