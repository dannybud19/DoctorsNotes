import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAIM_CATEGORIES, ClaimCategory } from "@medthread/domain";
import type { BBox, Claim } from "@medthread/domain";
import type { DocumentExtractor } from "../types";

const MODEL = "claude-opus-4-8";

// Anthropic accepts these base64 image media types, plus PDFs (as a `document` block). Anything
// else is rejected loudly at the boundary (see documentContentBlock).
const IMAGE_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMedia = (typeof IMAGE_MEDIA)[number];
const PDF_MEDIA = "application/pdf";

/**
 * The Anthropic content block for a base64-encoded clinical document — pure, so it can be tested
 * with no network. Photos become an `image` block; a PDF becomes a `document` block (Claude renders
 * each page). Any other media type is rejected loudly at the boundary (fail-loudly, AGENTS.md §1.6).
 */
export function documentContentBlock(
  mediaType: string,
  base64: string,
): Anthropic.ContentBlockParam {
  if (mediaType === PDF_MEDIA) {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }
  if ((IMAGE_MEDIA as readonly string[]).includes(mediaType)) {
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType as ImageMedia, data: base64 },
    };
  }
  throw new Error(
    `createClaudeDocumentExtractor: unsupported document type "${mediaType}" (expected ${PDF_MEDIA} or one of ${IMAGE_MEDIA.join(", ")})`,
  );
}

/**
 * The 1-based page a claim sits on. For a multi-page PDF the model reports the page per claim; for a
 * single photo there is no page, so we fall back to the page passed to the extractor. Pure, so the
 * clamping is unit-tested with no network. NaN / <1 / absent collapse to the fallback.
 */
export function resolvePage(modelPage: number | undefined, fallback: number): number {
  if (typeof modelPage === "number" && Number.isFinite(modelPage) && modelPage >= 1) {
    return Math.floor(modelPage);
  }
  return fallback;
}

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
      /** 1-based page the statement sits on (multi-page PDFs). Absent/invalid → the passed page. */
      page: z.number().optional(),
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
            page: {
              type: "integer",
              description:
                "For a multi-page PDF only: the 1-based page number this statement appears on. Omit for a single image.",
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You read a clinical document (e.g. a discharge letter or medication chart), supplied as either a photo or a PDF, and record exactly what is WRITTEN on it — verbatim, with provenance. You never assess, diagnose, advise, or infer anything that is not printed on the page.

Extract discrete clinical statements about the patient (a medication + dose, a diagnosis, a test/result, a follow-up, an instruction). For each: a category, a normalized lowercase hyphenated subject (e.g. "aspirin", "cardiology-clinic"), a short value (e.g. "150mg once daily"), and verbatimText = the EXACT text as printed on the document, copied character-for-character — never reworded, summarized, corrected, or completed. Optionally include an approximate [0,1]-normalized region for where the text appears. For a multi-page PDF, include the 1-based page each statement appears on.

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
    async extractFromDocument({ patientId, observedAt, documentId, page = 1, image, mediaType }) {
      const base64 = Buffer.from(image).toString("base64");
      // Throws loudly on an unsupported media type, before any network call.
      const documentBlock = documentContentBlock(mediaType, base64);

      const res = await client.messages.create({
        model: MODEL,
        // Headroom for a multi-page PDF, which can yield many more claims than a single photo.
        max_tokens: 8192,
        system: SYSTEM,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              documentBlock,
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
          page: resolvePage(c.page, page),
          region: toRegion(c.region),
        },
        observedAt,
      }));

      return { claims };
    },
  };
}
