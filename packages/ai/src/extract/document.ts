import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAIM_CATEGORIES, ClaimCategory } from "@doctorsnotes/domain";
import type { BBox, Claim } from "@doctorsnotes/domain";
import type { DocumentExtractor } from "../types";

const MODEL = "claude-opus-4-8";

// Anthropic accepts these base64 image media types. Anything else is rejected loudly at the boundary.
const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];

// A normalized [0,1] box the model may estimate for where the text sits on the page. Optional — when
// absent or malformed we fall back to the whole page. The precise anchor is always the verbatim text.
const RegionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  })
  .optional();

const ExtractionSchema = z.object({
  claims: z.array(
    z.object({
      category: ClaimCategory,
      subject: z.string(),
      value: z.string(),
      verbatimText: z.string(),
      region: RegionSchema,
    }),
  ),
});

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_document_claims",
  description: "Record the verbatim clinical statements written on the document, with provenance.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["claims"],
    properties: {
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "subject", "value", "verbatimText"],
          properties: {
            category: { type: "string", enum: [...CLAIM_CATEGORIES] },
            subject: { type: "string" },
            value: { type: "string" },
            verbatimText: { type: "string" },
            region: {
              type: "object",
              additionalProperties: false,
              description: "Optional [0,1]-normalized box of where the text sits on the page.",
              required: ["x", "y", "width", "height"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You read a photographed clinical document (e.g. a discharge letter or medication chart) and record exactly what is WRITTEN on it — verbatim, with provenance. You never assess, diagnose, advise, or infer anything that is not printed on the page.

Extract discrete clinical statements about the patient (a medication + dose, a diagnosis, a test/result, a follow-up, an instruction). For each: a category, a normalized lowercase hyphenated subject (e.g. "aspirin", "cardiology-clinic"), a short value (e.g. "150mg once daily"), and verbatimText = the EXACT text as printed on the document, copied character-for-character — never reworded, summarized, corrected, or completed. Optionally include an approximate [0,1]-normalized region for where the text appears.

Only record statements actually written on the document. Do not invent content. Record your answer by calling record_document_claims.`;

/** Clamp a coordinate into [0,1]; NaN/undefined collapse to the fallback. */
const unit = (n: number | undefined, fallback: number): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

/** A model region estimate → a valid BBox; whole page when absent/malformed. */
function toRegion(region: { x: number; y: number; width: number; height: number } | undefined): BBox {
  if (!region) return { x: 0, y: 0, width: 1, height: 1 };
  const x = unit(region.x, 0);
  const y = unit(region.y, 0);
  return {
    x,
    y,
    width: unit(region.width, 1 - x),
    height: unit(region.height, 1 - y),
  };
}

export function createClaudeDocumentExtractor(apiKey: string): DocumentExtractor {
  if (!apiKey) {
    throw new Error("createClaudeDocumentExtractor: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async extractFromImage({ patientId, observedAt, documentId, page = 1, image, mediaType }) {
      if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
        throw new Error(
          `createClaudeDocumentExtractor: unsupported image type "${mediaType}" (expected one of ${SUPPORTED_MEDIA.join(", ")})`,
        );
      }
      const base64 = Buffer.from(image).toString("base64");

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType as SupportedMedia, data: base64 },
              },
              { type: "text", text: "Record the clinical statements written on this document." },
            ],
          },
        ],
      });

      const toolUse = res.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Claude document extraction did not return a record_document_claims tool call");
      }
      const parsed = ExtractionSchema.parse(toolUse.input);

      const claims: Claim[] = parsed.claims.map((c, i) => ({
        id: `${documentId}-c${i}`,
        patientId,
        category: c.category,
        subject: c.subject,
        verbatimText: c.verbatimText,
        value: c.value,
        source: {
          kind: "document",
          documentId,
          page,
          region: toRegion(c.region),
        },
        observedAt,
      }));

      return { claims };
    },
  };
}
