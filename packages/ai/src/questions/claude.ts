import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { GeneratedQuestions } from "@medthread/domain";
import type { QuestionGenerator } from "../types";

const MODEL = "claude-opus-4-8";

/**
 * The model's raw output. Each question must cite the claim ids that motivated it; the guard
 * (`resolveGeneratedQuestions`) drops anything ungrounded or non-interrogative before it ships.
 */
const QuestionCandidate = z.object({
  prompt: z.string(),
  fromClaimIds: z.array(z.string()).default([]),
});
const CandidatesSchema = z.object({ questions: z.array(QuestionCandidate) });
export type QuestionCandidate = z.infer<typeof QuestionCandidate>;

const TOOL: Anthropic.Tool = {
  name: "suggest_questions",
  description:
    "Suggest deeper questions the patient could ASK their clinician, each grounded in the claims that " +
    "motivated it. Never give advice or an answer — only questions.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "fromClaimIds"],
          properties: {
            prompt: {
              type: "string",
              description: "A single question to ask a clinician, ending in '?'. Never advice or an answer.",
            },
            fromClaimIds: {
              type: "array",
              items: { type: "string" },
              description: "Ids of the claims that motivate this question (>= 1).",
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You help a hospital patient think of good questions to ASK their clinicians. You are given the patient's claims — verbatim things clinicians said or wrote (diagnoses, medications, procedures, follow-ups), each with an id.

Propose deeper questions the patient may not think to ask, grounded in their ACTUAL claims — for example:
- a diagnosis (e.g. a heart attack) → how severe was it, what raised my risk, what warning signs to watch for, what does 'stable' mean for me;
- a new or lifelong medication → what side effects to watch for, interactions, what to do if I miss a dose;
- two claims that disagree (e.g. two different doses) → which one is current;
- a follow-up or referral → what happens if I'm not contacted, what will it check.

Absolute rules:
- Output QUESTIONS ONLY. Never give advice, an answer, a recommendation, or an instruction.
- Every question must end with '?' and must cite the claim id(s) that motivated it (fromClaimIds, >= 1).
- Ground every question in the provided claims. Do not invent conditions the claims don't mention.

Record your questions by calling suggest_questions.`;

/**
 * Pure guard, testable with no network. Keeps only questions that are grounded (>= 1 real claim id) and
 * phrased as questions (end with '?', which mechanically blocks imperative advice from slipping through).
 * Empty in → empty out is valid ("nothing to add" is an acceptable outcome).
 */
export function resolveGeneratedQuestions(
  candidates: QuestionCandidate[],
  validIds: ReadonlySet<string>,
): GeneratedQuestions {
  const questions = candidates
    .map((c, i) => {
      const prompt = c.prompt.trim();
      const fromClaimIds = [...new Set(c.fromClaimIds.filter((id) => validIds.has(id)))];
      return { id: `gq${i}`, prompt, fromClaimIds };
    })
    .filter((q) => q.fromClaimIds.length > 0 && q.prompt.endsWith("?"));
  return GeneratedQuestions.parse({ questions });
}

export function createClaudeQuestionGenerator(apiKey: string): QuestionGenerator {
  if (!apiKey) {
    throw new Error("createClaudeQuestionGenerator: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async generate({ groups }) {
      const lines: string[] = [];
      const validIds = new Set<string>();
      for (const g of groups) {
        for (const c of g.claims) {
          validIds.add(c.id);
          const src = c.source.kind === "audio" ? "spoken" : "on-paper";
          lines.push(`id=${c.id} [${g.status}] ${src} ${c.category}/${c.subject}: "${c.verbatimText}" (value: ${c.value})`);
        }
      }
      if (lines.length === 0) {
        return GeneratedQuestions.parse({ questions: [] });
      }

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: `The patient's claims:\n${lines.join("\n")}` }],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Claude question generation did not return a suggest_questions tool call");
      }
      const parsed = CandidatesSchema.parse(toolUse.input);
      return resolveGeneratedQuestions(parsed.questions, validIds);
    },
  };
}
