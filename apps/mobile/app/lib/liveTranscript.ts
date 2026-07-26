import type { TranscriptTurn } from "./data";

/**
 * In-memory handoff of a live recording's diarized transcript turns from the Recording screen to the
 * Session screen, so a real recording renders its OWN conversation as chat bubbles. Mirrors
 * `liveSession.ts`. `null` means "use the sample transcript fixture".
 */
let liveTranscript: TranscriptTurn[] | null = null;

export function setLiveTranscript(turns: TranscriptTurn[]): void {
  liveTranscript = turns;
}
export function getLiveTranscript(): TranscriptTurn[] | null {
  return liveTranscript;
}
export function clearLiveTranscript(): void {
  liveTranscript = null;
}
