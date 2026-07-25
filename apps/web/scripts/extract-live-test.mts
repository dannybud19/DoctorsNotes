/**
 * Live end-to-end test of the extract pipeline: a real audio file → Scribe → Claude → Claim[].
 * Synthetic audio only. Run: tsx apps/web/scripts/extract-live-test.mts <path-to-audio>
 */
import { readFileSync } from "node:fs";
import { createClaudeExtractor, createScribeTranscriber } from "@doctorsnotes/ai";

// Load ELEVENLABS_API_KEY / ANTHROPIC_API_KEY from apps/web/.env.local (no secrets printed).
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[1] && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const audioPath = process.argv[2];
if (!audioPath) throw new Error("usage: extract-live-test.mts <path-to-audio>");

const buf = readFileSync(audioPath);
const audio = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const transcript = await createScribeTranscriber(process.env.ELEVENLABS_API_KEY!).transcribe({
  recordingId: "live-test-ward-round",
  audio,
});
console.log("=== TRANSCRIPT ===");
console.log(transcript.text);
console.log(`words: ${transcript.words.length}, speakers: ${new Set(transcript.words.map((w) => w.speaker)).size}`);

const { claims, pendingTurns } = await createClaudeExtractor(
  process.env.ANTHROPIC_API_KEY!,
).extractClaims({
  patientId: "synthetic-patient-1",
  observedAt: new Date().toISOString(),
  transcript,
});

console.log(`\n=== CLAIMS (${claims.length}), pending turns: ${pendingTurns} ===`);
console.log(JSON.stringify(claims, null, 2));
