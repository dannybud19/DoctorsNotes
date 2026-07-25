/**
 * SERVER-ONLY AI interfaces. Imported ONLY by apps/web (dependency-cruiser, AGENTS.md §2).
 * Concrete providers (ElevenLabs Scribe, Claude) implement these; the interface keeps them swappable
 * and keeps provider SDKs out of the mobile bundle.
 */
import type { Claim } from "@doctorsnotes/domain";

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
