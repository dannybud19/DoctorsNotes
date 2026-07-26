/**
 * SERVER-ONLY AI interfaces. Imported ONLY by apps/web (dependency-cruiser, AGENTS.md §2).
 * Concrete providers (ElevenLabs Scribe, Claude) implement these; the interface keeps them swappable
 * and keeps provider SDKs out of the mobile bundle.
 */
import type { AskResponse, Claim, ClaimGroup } from "@doctorsnotes/domain";

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

export interface Explainer {
  explain(input: { verbatimText: string; question?: string }): Promise<{ explanation: string }>;
}

export interface Asker {
  /**
   * Answers a patient's question by RETRIEVAL over the provided `groups` (reconciled ClaimGroup[])
   * ONLY. The model selects which existing claims are relevant and phrases the gap; it NEVER
   * generates a medical fact. If no provided claim is relevant — or the model returns no usable claim
   * ids — the result is `no_source` (never `answered`/`partial`). See `resolveAskResponse`.
   */
  ask(input: { question: string; groups: ClaimGroup[] }): Promise<AskResponse>;
}
