/**
 * SERVER-ONLY AI interfaces. Imported ONLY by apps/web (enforced by dependency-cruiser, AGENTS.md
 * §2). Concrete providers (Deepgram, Azure/Mistral OCR, an AI-SDK explainer) implement these behind
 * the interface so they are swappable and so no provider SDK ever reaches the mobile bundle.
 *
 * Provenance rule: extraction produces verbatim Claims with a resolvable ClaimSource. Explanation is
 * derived, on-demand, and NEVER returned as a Claim (AGENTS.md §1.2).
 */
import type { Claim } from "@doctorsnotes/domain";

/** A verbatim word with timing — the basis for audio-anchored provenance. */
export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

export interface TranscriptResult {
  recordingId: string;
  /** Full verbatim transcript text. */
  text: string;
  words: TranscriptWord[];
}

export interface Transcriber {
  /** Verbatim speech-to-text with word-level timing + diarization. Never paraphrases. */
  transcribe(input: {
    recordingId: string;
    audio: ArrayBuffer;
    languageHint?: string;
  }): Promise<TranscriptResult>;
}

/** A recognized block of text with its page region — the basis for document-anchored provenance. */
export interface OcrBlock {
  text: string;
  /** 1-based page number. */
  page: number;
  region: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

export interface OcrResult {
  documentId: string;
  blocks: OcrBlock[];
}

export interface Ocr {
  /** Layout-aware OCR returning per-block bounding boxes. Never paraphrases. */
  extract(input: { documentId: string; image: ArrayBuffer }): Promise<OcrResult>;
}

export interface ClaimExtractor {
  /**
   * Turns a transcript and/or OCR result into verbatim Claims with provenance. Must copy source
   * text verbatim into `verbatimText`/`value` and set a resolvable `ClaimSource`; must never invent
   * or paraphrase content.
   */
  extractClaims(input: {
    patientId: string;
    transcript?: TranscriptResult;
    ocr?: OcrResult;
  }): Promise<Claim[]>;
}

export interface Explainer {
  /**
   * On-demand plain-language explanation of a verbatim claim. The result is derived and for display
   * only — it is NEVER stored as a Claim and never travels without its verbatim anchor.
   */
  explain(input: { verbatimText: string; question?: string }): Promise<{ explanation: string }>;
}
