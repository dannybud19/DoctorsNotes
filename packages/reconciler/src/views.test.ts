import { describe, expect, it } from "vitest";
import { ReconcileInput, type Claim, type ClaimGroup } from "@doctorsnotes/domain";
import { reconcile } from "./reconcile.js";
import { buildQuestions, buildRunningPicture } from "./views.js";
import metoprololFixture from "./fixtures/metoprolol.json";
import admissionFixture from "./fixtures/admission-5day.json";

/**
 * Independent, contract-derived tests for the view builders (views.ts).
 *
 * Contract sources: AGENTS.md §1.1 (never assess/advise), PROJECT.md §2/§3 ("questions to ask" derive
 * strictly from worth_confirming + uncorroborated; latest is "the latest thing SAID", never "the
 * correct one"), and the JSDoc in views.ts. Offline & network-free: static JSON fixtures only.
 */

const metoprololGroups: ClaimGroup[] = reconcile(ReconcileInput.parse(metoprololFixture));
const admissionGroups: ClaimGroup[] = reconcile(ReconcileInput.parse(admissionFixture));

const RUNNING_ENTRY_KEYS = ["category", "confirmation", "latest", "status", "subject", "trail"];
const QUESTION_KEYS = ["category", "fromClaims", "id", "prompt", "status", "subject"];

function newest(claims: Claim[]): Claim {
  return [...claims].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt)).at(-1)!;
}

function sourceIsResolvable(claim: Claim): boolean {
  const s = claim.source;
  if (s.kind === "audio") {
    return s.recordingId.length > 0 && s.endMs >= s.startMs && s.speaker.role.length > 0;
  }
  if (s.kind === "document") {
    return s.documentId.length > 0 && s.page > 0 && s.region !== undefined;
  }
  return false;
}

describe("buildRunningPicture", () => {
  it("produces exactly one entry per group", () => {
    expect(buildRunningPicture(metoprololGroups).length).toBe(metoprololGroups.length);
    expect(buildRunningPicture(admissionGroups).length).toBe(admissionGroups.length);
  });

  it("'latest' is the NEWEST claim by observedAt (last of the ordered trail)", () => {
    for (const entry of buildRunningPicture(admissionGroups)) {
      expect(entry.latest.id).toBe(newest(entry.trail).id);
      expect(entry.latest.id).toBe(entry.trail[entry.trail.length - 1]!.id);
    }
  });

  it("'trail' equals the group's ordered claims", () => {
    const picture = buildRunningPicture(admissionGroups);
    picture.forEach((entry, i) => {
      expect(entry.trail).toEqual(admissionGroups[i]!.claims);
    });
  });

  it("passes the group's confirmation through unchanged", () => {
    const aspirin = buildRunningPicture(admissionGroups).find((e) => e.subject === "aspirin")!;
    expect(aspirin.confirmation).not.toBeNull();
    expect(aspirin.confirmation!.id).toBe("conf-aspirin");

    const metoprolol = buildRunningPicture(admissionGroups).find(
      (e) => e.subject === "metoprolol",
    )!;
    expect(metoprolol.confirmation).toBeNull();
  });

  it("has NO 'correct'/winner-style field — 'latest' is not treated as correct (§1.1)", () => {
    const forbidden = /winner|sever|rank|score|correct|priorit|advice|recommend/i;
    for (const entry of buildRunningPicture(admissionGroups)) {
      expect(Object.keys(entry).sort()).toEqual(RUNNING_ENTRY_KEYS);
      for (const key of Object.keys(entry)) {
        expect(key).not.toMatch(forbidden);
      }
    }
  });
});

describe("buildQuestions", () => {
  it("derives questions ONLY from worth_confirming and uncorroborated groups", () => {
    for (const q of buildQuestions(admissionGroups)) {
      expect(["worth_confirming", "uncorroborated"]).toContain(q.status);
    }
  });

  it("produces NO question for any 'agreed' group", () => {
    const agreedSubjects = admissionGroups
      .filter((g) => g.status === "agreed")
      .map((g) => g.subject);
    expect(agreedSubjects.length).toBeGreaterThan(0); // guard: the fixture actually has agreed groups
    const questionSubjects = new Set(buildQuestions(admissionGroups).map((q) => q.subject));
    for (const subject of agreedSubjects) {
      expect(questionSubjects.has(subject)).toBe(false);
    }
  });

  it("emits one question per non-agreed group (count matches)", () => {
    const nonAgreed = admissionGroups.filter((g) => g.status !== "agreed").length;
    expect(buildQuestions(admissionGroups).length).toBe(nonAgreed);
  });

  it("every prompt is phrased as a question and carries no imperative advice", () => {
    const advice = /\byou should\b|\bmake sure\b|\bstop\b|\bstart\b|\btake\b|\bavoid\b|\bdon't\b/i;
    const groups = [...admissionGroups, ...metoprololGroups];
    const questions = buildQuestions(groups);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.prompt.trim().endsWith("?")).toBe(true);
      expect(q.prompt).not.toMatch(advice);
    }
  });

  it("fromClaims links back to the group's claims with resolvable sources", () => {
    const nonAgreed = admissionGroups.filter((g) => g.status !== "agreed");
    const questions = buildQuestions(admissionGroups);
    questions.forEach((q) => {
      const group = nonAgreed.find((g) => g.category === q.category && g.subject === q.subject)!;
      expect(q.fromClaims).toEqual(group.claims);
      expect(q.fromClaims.length).toBeGreaterThan(0);
      for (const claim of q.fromClaims) {
        expect(sourceIsResolvable(claim)).toBe(true);
      }
    });
  });

  it("has NO advice/assessment-style field on a Question (§1.1)", () => {
    const forbidden = /winner|sever|rank|score|correct|priorit|advice|recommend/i;
    for (const q of buildQuestions(admissionGroups)) {
      expect(Object.keys(q).sort()).toEqual(QUESTION_KEYS);
      for (const key of Object.keys(q)) {
        expect(key).not.toMatch(forbidden);
      }
    }
  });
});
