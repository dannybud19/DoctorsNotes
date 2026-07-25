import { NextResponse } from "next/server";
import { createClaudeExtractor, createScribeTranscriber } from "@doctorsnotes/ai";
import { createServiceClient } from "@doctorsnotes/supabase";

// The one path that must work live: audio → transcribe (Scribe) → extract (Claude) → claims.
export const runtime = "nodejs";
export const maxDuration = 300;

// Permissive CORS so the Expo web demo (localhost:8081) can call this (localhost:3000). Native
// phones don't hit CORS. Fine for a demo; tighten to the app origin for production.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status: number): Response {
  return NextResponse.json(data, { status, headers: CORS });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Surface a provider (or persistence) failure as a structured 502 — loud and legible, never
 * swallowed. Provider error messages do not contain the API key, so this is safe to return.
 */
function providerError(stage: "transcription" | "extraction" | "persistence", err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  const providerStatus =
    (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status ?? null;
  console.error(`/api/extract ${stage} failed (${providerStatus ?? "n/a"}):`, message);
  return json({ error: "provider_failure", stage, providerStatus, message }, 502);
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return json({ error: "multipart field 'audio' (a file) is required" }, 400);
  }
  const patientId = String(form.get("patientId") ?? "");
  if (!patientId) {
    return json({ error: "patientId is required" }, 400);
  }
  const recordingId = String(form.get("recordingId") ?? `rec-${Date.now()}`);

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!elevenKey || !anthropicKey) {
    return json(
      { error: "server_misconfigured", message: "ELEVENLABS_API_KEY and ANTHROPIC_API_KEY must be set" },
      500,
    );
  }

  const audio = await file.arrayBuffer();

  let transcript;
  try {
    transcript = await createScribeTranscriber(elevenKey).transcribe({ recordingId, audio });
  } catch (err) {
    return providerError("transcription", err);
  }

  const observedAt = new Date().toISOString();
  let claims;
  let pendingTurns;
  try {
    ({ claims, pendingTurns } = await createClaudeExtractor(anthropicKey).extractClaims({
      patientId,
      observedAt,
      transcript,
    }));
  } catch (err) {
    return providerError("extraction", err);
  }

  // Persist only when Supabase is configured. Reported transparently (never a silent skip).
  let persisted = false;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey && claims.length > 0) {
    try {
      const rows = claims.map((c) => ({
        patient_id: c.patientId,
        category: c.category,
        subject: c.subject,
        verbatim_text: c.verbatimText,
        value: c.value,
        source: c.source,
        observed_at: c.observedAt,
      }));
      const db = createServiceClient(supabaseUrl, serviceKey) as unknown as {
        from: (t: string) => { insert: (r: unknown) => Promise<{ error: { message: string } | null }> };
      };
      const { error } = await db.from("claims").insert(rows);
      if (error) throw new Error(error.message);
      persisted = true;
    } catch (err) {
      return providerError("persistence", err);
    }
  }

  return json({ recordingId, transcriptText: transcript.text, pendingTurns, persisted, claims }, 200);
}
