import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AskResponse } from "@medthread/domain";
import type { Asker } from "../types";

const MODEL = "claude-opus-4-8";

/**
 * What the model is allowed to return. It may ONLY select claim ids and classify — it can phrase a
 * `gap` (what's still unanswered) or a `suggestedQuestion` (a question to ask a clinician), but it
 * has no field in which to state a medical fact. Validated loudly; drift throws.
 */
const AskCandidate = z.object({
  kind: z.enum(["answered", "partial", "no_source"]),
  claimIds: z.array(z.string()).default([]),
  gap: z.string().optional(),
  suggestedQuestion: z.string().optional(),
});
export type AskCandidate = z.infer<typeof AskCandidate>;

const ASK_TOOL: Anthropic.Tool = {
  name: "answer_question",
  description:
    "Answer the patient's question STRICTLY by selecting the ids of relevant claims they were " +
    "actually told. Never state a medical fact of your own.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["kind", "claimIds"],
    properties: {
      kind: { type: "string", enum: ["answered", "partial", "no_source"] },
      claimIds: {
        type: "array",
        items: { type: "string" },
        description: "Ids of the provided claims that answer the question. Empty if none are relevant.",
      },
      gap: {
        type: "string",
        description:
          "For 'partial' only: name — as a question to ask — what is still unanswered. Must NOT state a medical fact.",
      },
      suggestedQuestion: {
        type: "string",
        description:
          "For 'no_source' only: a short question the patient could ask a clinician (a rephrasing of their own question, never an answer).",
      },
    },
  },
};

const ASK_SYSTEM = `You help a hospital patient understand what they have ACTUALLY been told. You are given their question and a list of claims — verbatim things clinicians said, each with an id. You answer ONLY by selecting the ids of relevant claims.

Absolute rules:
- You NEVER add a medical fact, dose, diagnosis, or instruction of your own. You never guess.
- If one or more provided claims answer the question, call answer_question with kind "answered" and the relevant claimIds.
- If provided claims answer it only in part, use kind "partial", the relevant claimIds, and a "gap" that names — phrased as a question to ask — what is still unanswered. The gap must NOT contain a medical fact.
- If NO provided claim is relevant, use kind "no_source", an empty claimIds, and a "suggestedQuestion": a short question the patient could ask a clinician (a rephrasing of their own question). Never answer from your own knowledge.

Only ever reference the ids given to you. Record your answer by calling answer_question.`;

/**
 * The core safety property, as a pure function so it can be tested with no network. Given the model's
 * candidate, the set of claim ids that actually exist, and the patient's question, it returns a valid
 * `AskResponse` in which **a response with no usable claim ids can NEVER be `answered`/`partial` — it
 * is always `no_source`.** It also drops any claim id the model invented (retrieval-only), so an
 * `answered`/`partial` result can only cite ids that were really provided.
 */
export function resolveAskResponse(
  candidate: AskCandidate,
  validIds: ReadonlySet<string>,
  question: string,
): AskResponse {
  const filtered = [...new Set(candidate.claimIds.filter((id) => validIds.has(id)))];

  if ((candidate.kind === "answered" || candidate.kind === "partial") && filtered.length > 0) {
    if (candidate.kind === "answered") {
      return AskResponse.parse({ kind: "answered", claimIds: filtered });
    }
    const gap = candidate.gap?.trim();
    return AskResponse.parse({
      kind: "partial",
      claimIds: filtered,
      gap: gap && gap.length > 0 ? gap : "Part of your question hasn't been answered by anyone yet.",
    });
  }

  // The hard guard: 'no_source', OR an 'answered'/'partial' that has no usable claim id, collapses to
  // 'no_source'. No generated answer can survive here.
  const suggested = candidate.suggestedQuestion?.trim();
  const q = question.trim();
  return AskResponse.parse({
    kind: "no_source",
    suggestedQuestion:
      suggested && suggested.length > 0
        ? suggested
        : q.length > 0
          ? `No one has told you this yet. You could ask: "${q}"`
          : "No one has told you this yet — this is worth asking a member of your care team.",
  });
}

export function createClaudeAsker(apiKey: string): Asker {
  if (!apiKey) {
    throw new Error("createClaudeAsker: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async ask({ question, groups }) {
      const catalogue = groups.flatMap((g) =>
        g.claims.map(
          (c) =>
            `id=${c.id} [${g.status}] ${c.category}/${c.subject}: "${c.verbatimText}" (value: ${c.value})`,
        ),
      );
      const validIds = new Set(groups.flatMap((g) => g.claims.map((c) => c.id)));

      // Nothing has been recorded at all — answer no_source without spending a model call.
      if (catalogue.length === 0) {
        return resolveAskResponse({ kind: "no_source", claimIds: [] }, validIds, question);
      }

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: ASK_SYSTEM,
        tools: [ASK_TOOL],
        tool_choice: { type: "tool", name: ASK_TOOL.name },
        messages: [
          {
            role: "user",
            content: `Question:\n${question}\n\nClaims the patient has actually been told:\n${catalogue.join("\n")}`,
          },
        ],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Claude ask did not return an answer_question tool call");
      }
      const candidate = AskCandidate.parse(toolUse.input);
      return resolveAskResponse(candidate, validIds, question);
    },
  };
}
