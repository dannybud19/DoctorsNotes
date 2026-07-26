import { NextResponse } from "next/server";
import { createClaudeDocumentExtractor } from "@medthread/ai";

// Document path: a clinical document (photo or PDF) → Claude vision → verbatim, document-sourced claims.
export const runtime = "nodejs";
// Multi-page PDFs take longer than a single photo; match the audio route's ceiling.
export const maxDuration = 300;

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

function providerError(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  const providerStatus =
    (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status ?? null;
  console.error(`/api/extract-document failed (${providerStatus ?? "n/a"}):`, message);
  return json({ error: "provider_failure", providerStatus, message }, 502);
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return json({ error: "multipart field 'image' (a file) is required" }, 400);
  }
  const patientId = String(form.get("patientId") ?? "");
  if (!patientId) {
    return json({ error: "patientId is required" }, 400);
  }
  const documentId = String(form.get("documentId") ?? `doc-${Date.now()}`);
  const page = Number(form.get("page") ?? 1);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return json({ error: "server_misconfigured", message: "ANTHROPIC_API_KEY must be set" }, 500);
  }

  const image = await file.arrayBuffer();
  const observedAt = new Date().toISOString();

  let claims;
  try {
    ({ claims } = await createClaudeDocumentExtractor(anthropicKey).extractFromDocument({
      patientId,
      observedAt,
      documentId,
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
      image,
      mediaType: file.type,
    }));
  } catch (err) {
    return providerError(err);
  }

  return json({ documentId, claims }, 200);
}
