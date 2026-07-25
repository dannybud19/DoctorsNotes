/**
 * Live test of the Claude extraction half only (bypasses Scribe): a hand-built synthetic transcript
 * → Claude → Claim[]. Proves step 3 while the ElevenLabs key is missing the speech_to_text scope.
 */
import { readFileSync } from "node:fs";
import { createClaudeExtractor } from "@doctorsnotes/ai";
import type { TranscriptResult } from "@doctorsnotes/ai";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[1] && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const sentence =
  "Good morning. It looks like you've had a small heart attack, what we call an NSTEMI. We're starting you on aspirin, 75 milligrams once a day. We'll also start metoprolol, 25 milligrams twice daily.";
const tokens = sentence.split(/\s+/);
const words = tokens.map((text, i) => ({
  text,
  startMs: i * 400,
  endMs: i * 400 + 380,
  speaker: "speaker_0",
}));
const transcript: TranscriptResult = { recordingId: "synthetic-ward-round", text: sentence, words };

const { claims, pendingTurns } = await createClaudeExtractor(
  process.env.ANTHROPIC_API_KEY!,
).extractClaims({
  patientId: "synthetic-patient-1",
  observedAt: new Date().toISOString(),
  transcript,
});

console.log(`=== CLAIMS (${claims.length}), pending turns: ${pendingTurns} ===`);
console.log(JSON.stringify(claims, null, 2));
