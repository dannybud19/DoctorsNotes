import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AskResponse } from "@medthread/domain";
import type { Claim } from "@medthread/domain";
import type { Asker } from "../types";

const MODEL = "claude-opus-4-8";

/**
 * What the model is allowed to return. It selects claim ids and may write a short `answerText` — but
 * that prose must be drawn ONLY from the cited claims (it echoes their verbatim `value`, never a fact
 * of its own). The model does NOT author who-said-it or when — those are derived server-side (see
 * `resolveAskResponse`). Validated loudly; drift throws.
 */
const AskCandidate = z.object({
  kind: z.enum(["answered", "partial", "no_source"]),
  claimIds: z.array(z.string()).default([]),
  answerText: z.string().optional(),
  gap: z.string().optional(),
  suggestedQuestion: z.string().optional(),
});
export type AskCandidate = z.infer<typeof AskCandidate>;

/** The provenance a citation needs — copied from the real claim, never from the model. */
export interface ClaimMeta {
  speaker: string;
  observedAt: string;
}

const ASK_TOOL: Anthropic.Tool = {
  name: "answer_question",
  description:
    "Answer the patient's question using ONLY the claims they were actually told. Select the relevant " +
    "claim ids and write a short plain-language answer drawn only from those claims.",
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
      answerText: {
        type: "string",
        description:
          "For 'answered'/'partial': ONE or TWO short, plain sentences that restate the facts from the " +
          "cited claims (echo their value, e.g. \"You're on aspirin, one 75 mg tablet once a day.\"). " +
          "Use ONLY facts present in the cited claims. Do NOT add a fact, do NOT state who said it or " +
          "when (that is added automatically). If two claims disagree, say so plainly.",
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

const ASK_SYSTEM = `You help a hospital patient understand what they have ACTUALLY been told. You are given their question and a list of claims — verbatim things clinicians said or wrote, each with an id, a source (spoken or on-paper), and a value. You answer ONLY from these claims.

Absolute rules:
- You NEVER add a medical fact, dose, diagnosis, or instruction of your own. You never guess.
- If one or more claims answer the question, use kind "answered", the relevant claimIds, and an answerText: one or two short plain sentences that restate ONLY the facts in those claims (echo their value). Do not name who said it or when — that is added for you.
- If the claims answer it only in part, use kind "partial" with claimIds, an answerText for the part you can answer, and a "gap" phrased as a question to ask about what is still unanswered (the gap must NOT contain a medical fact).
- If two cited claims disagree (e.g. two different doses), state both plainly in answerText and add a gap inviting them to check which is current.
- If NO claim is relevant, use kind "no_source", empty claimIds, no answerText, and a "suggestedQuestion" the patient could ask a clinician. Never answer from your own knowledge.

Only ever reference the ids given to you. Record your answer by calling answer_question.`;

/**
 * The core safety property, as a pure function so it can be tested with no network. Given the model's
 * candidate and a map of the claim ids that actually exist (to their provenance), it returns a valid
 * `AskResponse` in which:
 *   - a response with no usable claim id can NEVER be `answered`/`partial` — it is always `no_source`;
 *   - invented claim ids are dropped (retrieval-only);
 *   - `citations` are built HERE from the claim map, so who/when can never be fabricated by the model;
 *   - `answerText` (prose) survives ONLY alongside >= 1 real citation — otherwise it is dropped with
 *     the collapse to `no_source`. Prose without a source is worthless and unsafe, so it never ships.
 */
export function resolveAskResponse(
  candidate: AskCandidate,
  claims: ReadonlyMap<string, ClaimMeta>,
  question: string,
): AskResponse {
  const filtered = [...new Set(candidate.claimIds.filter((id) => claims.has(id)))];
  const answerText = candidate.answerText?.trim();

  if ((candidate.kind === "answered" || candidate.kind === "partial") && filtered.length > 0 && answerText) {
    const citations = filtered.map((id) => {
      const meta = claims.get(id)!;
      return { claimId: id, speaker: meta.speaker, observedAt: meta.observedAt };
    });
    if (candidate.kind === "answered") {
      return AskResponse.parse({ kind: "answered", claimIds: filtered, answerText, citations });
    }
    const gap = candidate.gap?.trim();
    return AskResponse.parse({
      kind: "partial",
      claimIds: filtered,
      gap: gap && gap.length > 0 ? gap : "Part of your question hasn't been answered by anyone yet.",
      answerText,
      citations,
    });
  }

  // The hard guard: 'no_source', OR an 'answered'/'partial' missing a usable claim id or prose, collapses
  // to 'no_source'. No generated answer can survive here — the strict schema has no field for it.
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

/** Descriptive labels — kept in sync with the mobile UI so a citation reads the same as the drill-down. */
const ROLE_LABEL: Record<string, string> = {
  consultant: "your consultant",
  registrar: "your doctor",
  nurse: "your nurse",
  pharmacist: "your pharmacist",
  physio: "your physiotherapist",
  patient: "you",
  other: "someone at your bedside",
  unknown: "someone at your bedside",
};

/** Who said / wrote a claim, as a display label. Copied from the claim — never model-authored. */
export function claimSpeaker(claim: Claim): string {
  if (claim.source.kind === "audio") {
    return claim.source.speaker.label ?? ROLE_LABEL[claim.source.speaker.role] ?? "someone at your bedside";
  }
  return "your discharge letter";
}

export function createClaudeAsker(apiKey: string): Asker {
  if (!apiKey) {
    throw new Error("createClaudeAsker: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async ask({ question, groups }) {
      const claimMap = new Map<string, ClaimMeta>();
      const lines: string[] = [];
      for (const g of groups) {
        for (const c of g.claims) {
          claimMap.set(c.id, { speaker: claimSpeaker(c), observedAt: c.observedAt });
          const src = c.source.kind === "audio" ? "spoken" : "on-paper";
          lines.push(`id=${c.id} [${g.status}] ${src} ${c.category}/${c.subject}: "${c.verbatimText}" (value: ${c.value})`);
        }
      }

      // Nothing has been recorded at all — answer no_source without spending a model call.
      if (lines.length === 0) {
        return resolveAskResponse({ kind: "no_source", claimIds: [] }, claimMap, question);
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
            content: `Question:\n${question}\n\nClaims the patient has actually been told:\n${lines.join("\n")}`,
          },
        ],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Claude ask did not return an answer_question tool call");
      }
      const candidate = AskCandidate.parse(toolUse.input);
      return resolveAskResponse(candidate, claimMap, question);
    },
  };
}
