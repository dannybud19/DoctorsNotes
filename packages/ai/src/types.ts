/**
 * SERVER-ONLY AI interfaces. Imported ONLY by apps/web (dependency-cruiser, AGENTS.md §2).
 * Concrete providers (ElevenLabs Scribe, Claude) implement these; the interface keeps them swappable
 * and keeps provider SDKs out of the mobile bundle.
 */
import type { AskResponse, Claim, ClaimGroup, GeneratedQuestions } from "@medthread/domain";

export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
  /** Diarization speaker id, e.g. "speaker_0". */
  speaker?: string;
}

export interface TranscriptResult {
  recordingId: string;
  /** Full verbatim transcript text. */
  text: string;
  words: TranscriptWord[];
}

export interface Transcriber {
  transcribe(input: {
    recordingId: string;
    audio: ArrayBuffer;
    languageHint?: string;
  }): Promise<TranscriptResult>;
}

export interface OcrBlock {
  text: string;
  page: number;
  region: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

export interface OcrResult {
  documentId: string;
  blocks: OcrBlock[];
}

export interface Ocr {
  extract(input: { documentId: string; image: ArrayBuffer }): Promise<OcrResult>;
}

export interface ClaimExtractor {
  /**
   * Turns a transcript into verbatim Claims with provenance. `verbatimText` is copied EXACTLY from
   * the transcript (never reworded); `source` carries recordingId + startMs + endMs. A turn whose
   * speaker `roleConfidence` is "unknown" MUST NOT produce a Claim (held as a pending turn).
   */
  extractClaims(input: {
    patientId: string;
    observedAt: string;
    transcript?: TranscriptResult;
    ocr?: OcrResult;
  }): Promise<{ claims: Claim[]; pendingTurns: number }>;
}

/** One reputable source backing an explanation — shown to the patient as attribution. */
export interface ExplainSource {
  title: string;
  url: string;
}

export interface Explainer {
  /**
   * General, plain-language "what this medicine is / what it's for" for a named subject, drawn from
   * reputable web sources via search. This is the app's ONE place that surfaces information the
   * patient's own clinicians didn't state — so it is strictly GENERAL education: never personalised
   * advice, dosing, or a judgement about this patient. `explanation` states only facts the model could
   * attribute; `sources` carries the citations shown alongside it. An empty `explanation`/`sources`
   * means no reliable general information was found — the UI must say so, never invent one.
   */
  explain(input: { subject: string; verbatimText: string }): Promise<{
    explanation: string;
    sources: ExplainSource[];
  }>;
}

export interface DocumentExtractor {
  /**
   * Turns a clinical document — a photo (image/*) or a PDF — into verbatim, document-sourced Claims
   * via Claude vision (no OCR library). `verbatimText` is copied EXACTLY from the document (never
   * reworded); `source` carries documentId + 1-based page + a normalized region. For a multi-page
   * PDF the page is reported per claim; for a single photo it falls back to `page`. With no OCR text
   * to cross-check against, the model's transcription IS the provenance — it is instructed to copy
   * character-for-character.
   *
   * `mediaType` is the file's MIME: one of image/jpeg|png|gif|webp, or application/pdf. Anything
   * else is rejected loudly.
   */
  extractFromDocument(input: {
    patientId: string;
    observedAt: string;
    documentId: string;
    /** 1-based fallback page used when the model reports none (e.g. a single photo). */
    page?: number;
    image: ArrayBuffer;
    mediaType: string;
  }): Promise<{ claims: Claim[] }>;
}

export interface Asker {
  /**
   * Answers a patient's question by RETRIEVAL over the provided `groups` (reconciled ClaimGroup[])
   * ONLY. The model selects which existing claims are relevant and writes a short plain-language answer
   * drawn only from them; provenance (who/when) is derived server-side. If no provided claim is relevant
   * — or the model returns no usable claim ids / no prose — the result is `no_source`. See
   * `resolveAskResponse`.
   */
  ask(input: { question: string; groups: ClaimGroup[] }): Promise<AskResponse>;
}

export interface QuestionGenerator {
  /**
   * Proposes deeper questions the patient could ASK a clinician, GROUNDED in their claims (each cites
   * >= 1 real claim id). Framed strictly as questions, never advice. See `resolveGeneratedQuestions`.
   */
  generate(input: { groups: ClaimGroup[] }): Promise<GeneratedQuestions>;
}
