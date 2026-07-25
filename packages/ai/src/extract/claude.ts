import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAIM_CATEGORIES, ClaimCategory, RoleConfidence, SpeakerRole } from "@doctorsnotes/domain";
import type { Claim } from "@doctorsnotes/domain";
import type { ClaimExtractor, TranscriptResult, TranscriptWord } from "../types";

const MODEL = "claude-opus-4-8";

// zod validates the model's tool input into typed data (throws loudly on any drift). Enums come from
// the domain contract, so the output can only carry valid categories/roles.
const ExtractionSchema = z.object({
  turns: z.array(
    z.object({
      turnIndex: z.number().int(),
      role: SpeakerRole,
      roleConfidence: RoleConfidence,
    }),
  ),
  claims: z.array(
    z.object({
      turnIndex: z.number().int(),
      category: ClaimCategory,
      subject: z.string(),
      value: z.string(),
      verbatimText: z.string(),
    }),
  ),
});

// The tool's JSON schema mirrors ExtractionSchema; enum lists are the single source of truth.
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_extraction",
  description: "Record the per-turn speaker roles and the extracted verbatim claims.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["turns", "claims"],
    properties: {
      turns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["turnIndex", "role", "roleConfidence"],
          properties: {
            turnIndex: { type: "integer" },
            role: { type: "string", enum: [...SpeakerRole.options] },
            roleConfidence: { type: "string", enum: [...RoleConfidence.options] },
          },
        },
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["turnIndex", "category", "subject", "value", "verbatimText"],
          properties: {
            turnIndex: { type: "integer" },
            category: { type: "string", enum: [...CLAIM_CATEGORIES] },
            subject: { type: "string" },
            value: { type: "string" },
            verbatimText: { type: "string" },
          },
        },
      },
    },
  },
};

const SYSTEM = `You extract, from a diarized hospital-bedside transcript, exactly what clinicians SAID — verbatim, with provenance. You never assess, diagnose, advise, or infer facts that were not spoken.

For each turn: assign the speaker's clinical role and your confidence:
- "confirmed": the speaker names their role or it is unmistakable.
- "inferred": you can reasonably infer it from what they say.
- "unknown": you cannot tell.

Then extract claims — discrete clinical statements about the patient (a medication + dose, a diagnosis mentioned, a test/procedure, a follow-up, an instruction, a result stated, a symptom mentioned). For each claim provide turnIndex, category, a normalized lowercase hyphenated subject (e.g. "metoprolol", "cardiology-clinic"), a short value (e.g. "25mg twice daily"), and verbatimText = the EXACT words from that turn, copied character-for-character — never reworded, summarized, or corrected.

Only patient-relevant clinical statements become claims. Do not invent content. Record your answer by calling record_extraction.`;

export function createClaudeExtractor(apiKey: string): ClaimExtractor {
  if (!apiKey) {
    throw new Error("createClaudeExtractor: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async extractClaims({ patientId, observedAt, transcript }) {
      if (!transcript) {
        throw new Error("createClaudeExtractor: transcript is required (OCR path not implemented)");
      }
      const turns = buildTurns(transcript.words);
      if (turns.length === 0) {
        return { claims: [], pendingTurns: 0 };
      }

      const diarized = turns
        .map((t) => `[turn ${t.turnIndex}] (${t.speakerId}): ${t.text}`)
        .join("\n");

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
        messages: [{ role: "user", content: `Transcript:\n${diarized}` }],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Claude extraction did not return a record_extraction tool call");
      }
      const parsed = ExtractionSchema.parse(toolUse.input);

      const roleByTurn = new Map(parsed.turns.map((t) => [t.turnIndex, t]));
      const claims: Claim[] = [];
      let pendingTurns = 0;

      for (let i = 0; i < parsed.claims.length; i++) {
        const c = parsed.claims[i]!;
        const turn = turns[c.turnIndex];
        if (!turn) {
          throw new Error(`Extraction referenced a non-existent turn ${c.turnIndex}`);
        }
        const roleInfo = roleByTurn.get(c.turnIndex);
        if (!roleInfo) {
          throw new Error(`Claim for turn ${c.turnIndex} has no role assignment`);
        }
        // Provenance invariant (PROJECT.md D13): a turn whose role is unconfirmed never mints a Claim.
        if (roleInfo.roleConfidence === "unknown") {
          pendingTurns++;
          continue;
        }

        // Recover the EXACT transcript substring + its timing. If the quote isn't a real span of the
        // turn, the model fabricated it — fail loudly rather than store a paraphrase.
        const located = locate(turn.words, c.verbatimText);
        if (!located) {
          throw new Error(
            `Claim verbatim not found in turn ${c.turnIndex}; refusing to store unverifiable provenance`,
          );
        }

        claims.push({
          id: `${transcript.recordingId}-c${i}`,
          patientId,
          category: c.category,
          subject: c.subject,
          verbatimText: located.text,
          value: c.value,
          source: {
            kind: "audio",
            recordingId: transcript.recordingId,
            startMs: located.startMs,
            endMs: located.endMs,
            speaker: { role: roleInfo.role, roleConfidence: roleInfo.roleConfidence },
          },
          observedAt,
        });
      }

      return { claims, pendingTurns };
    },
  };
}

interface Turn {
  turnIndex: number;
  speakerId: string;
  words: TranscriptWord[];
  text: string;
}

function buildTurns(words: TranscriptWord[]): Turn[] {
  const turns: Turn[] = [];
  for (const w of words) {
    const speaker = w.speaker ?? "speaker_0";
    const last = turns[turns.length - 1];
    if (last && last.speakerId === speaker) {
      last.words.push(w);
    } else {
      turns.push({ turnIndex: turns.length, speakerId: speaker, words: [w], text: "" });
    }
  }
  for (const t of turns) t.text = t.words.map((w) => w.text).join(" ");
  return turns;
}

const norm = (s: string): string =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Find the contiguous word span whose normalized text equals the quote; return the EXACT tokens. */
function locate(
  words: TranscriptWord[],
  verbatim: string,
): { text: string; startMs: number; endMs: number } | null {
  const target = norm(verbatim);
  if (!target) return null;
  for (let i = 0; i < words.length; i++) {
    let acc = "";
    for (let j = i; j < words.length; j++) {
      const piece = norm(words[j]!.text);
      acc = acc ? `${acc} ${piece}` : piece;
      if (acc === target) {
        const span = words.slice(i, j + 1);
        return {
          text: span.map((w) => w.text).join(" "),
          startMs: span[0]!.startMs,
          endMs: span[span.length - 1]!.endMs,
        };
      }
      if (acc.length > target.length) break;
    }
  }
  return null;
}
