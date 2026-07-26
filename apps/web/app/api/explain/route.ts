import { NextResponse } from "next/server";
import { z } from "zod";
import { createClaudeExplainer } from "@medthread/ai";

// General, attributed "what this medicine is / does" for a subject — the ONE place the app surfaces
// information the patient's own care team didn't state. AI runs server-side only (AGENTS.md §1.3);
// the Explainer uses Claude + web search and returns plain-language text plus its cited sources. An
// empty result means no reliable general information was found — the client must say so, not invent one.
export const runtime = "nodejs";
export const maxDuration = 60;

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
  console.error(`/api/explain failed (${providerStatus ?? "n/a"}):`, message);
  return json({ error: "provider_failure", providerStatus, message }, 502);
}

const ExplainRequest = z.object({
  subject: z.string().trim().min(1),
  verbatimText: z.string().trim().default(""),
});

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof ExplainRequest>;
  try {
    body = ExplainRequest.parse(await req.json());
  } catch (err) {
    return json(
      { error: "bad_request", message: err instanceof Error ? err.message : "Invalid request body" },
      400,
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return json({ error: "server_misconfigured", message: "ANTHROPIC_API_KEY must be set" }, 500);
  }

  try {
    const result = await createClaudeExplainer(anthropicKey).explain({
      subject: body.subject,
      verbatimText: body.verbatimText,
    });
    return json(result, 200);
  } catch (err) {
    return providerError(err);
  }
}
