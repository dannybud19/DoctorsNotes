import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { Transcriber, TranscriptResult, TranscriptWord } from "../types";

/**
 * Keyterms primed to bias Scribe toward common BNF drug names and UK ward vocabulary. Kept under
 * 100 to avoid the extended-minimum billing tier (keyterms still incur a 20% surcharge).
 */
const KEYTERMS: readonly string[] = [
  // BNF drugs
  "aspirin", "metoprolol", "bisoprolol", "atorvastatin", "ramipril", "furosemide", "amlodipine",
  "clopidogrel", "ticagrelor", "warfarin", "apixaban", "rivaroxaban", "enoxaparin", "metformin",
  "gliclazide", "insulin", "omeprazole", "lansoprazole", "amoxicillin", "co-amoxiclav", "gentamicin",
  "paracetamol", "morphine", "codeine", "digoxin", "spironolactone", "levothyroxine", "prednisolone",
  "salbutamol", "doxycycline",
  // ward vocabulary
  "cannula", "obs", "bloods", "NBM", "TTO", "dosette", "ECG", "NSTEMI", "STEMI", "saturations",
  "catheter", "discharge",
];

/**
 * ElevenLabs Scribe v2 transcriber: word-level timestamps + diarization. Fails loudly if the API
 * key is missing (no silent fallback). The key is read from the environment by the caller and passed
 * in — never hardcoded.
 */
export function createScribeTranscriber(apiKey: string): Transcriber {
  if (!apiKey) {
    throw new Error("createScribeTranscriber: ELEVENLABS_API_KEY is required");
  }
  const client = new ElevenLabsClient({ apiKey });

  return {
    async transcribe({ recordingId, audio, languageHint }) {
      const file = new Blob([new Uint8Array(audio)]);
      const res = (await client.speechToText.convert({
        file,
        modelId: "scribe_v2",
        diarize: true,
        timestampsGranularity: "word",
        keyterms: [...KEYTERMS],
        ...(languageHint ? { languageCode: languageHint } : {}),
      })) as unknown as ScribeResponse;

      if (!res || typeof res.text !== "string" || !Array.isArray(res.words)) {
        throw new Error("Scribe returned an unexpected response shape");
      }

      const words: TranscriptWord[] = res.words
        .filter((w) => w.type === "word")
        .map((w) => ({
          text: w.text,
          startMs: Math.round((w.start ?? 0) * 1000),
          endMs: Math.round((w.end ?? w.start ?? 0) * 1000),
          ...(speakerOf(w) ? { speaker: speakerOf(w)! } : {}),
        }));

      return { recordingId, text: res.text, words } satisfies TranscriptResult;
    },
  };
}

// The JS SDK's field casing for diarization has varied; read either spelling defensively.
function speakerOf(w: ScribeWord): string | undefined {
  return w.speakerId ?? w.speaker_id ?? undefined;
}

interface ScribeWord {
  text: string;
  start: number | null;
  end: number | null;
  type: "word" | "spacing" | "audio_event";
  speakerId?: string | null;
  speaker_id?: string | null;
}
interface ScribeResponse {
  text: string;
  words: ScribeWord[];
}
