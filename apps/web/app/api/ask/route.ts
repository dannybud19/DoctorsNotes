import { NextResponse } from "next/server";
import { z } from "zod";
import { AskResponse, ClaimGroup } from "@medthread/domain";
import { createClaudeAsker } from "@medthread/ai";

// Chat with MedThread: retrieval over the patient's reconciled ClaimGroup[] ONLY. The model selects
// relevant claims; it never generates a medical fact. The empty-claimIds → no_source guard is the
// product's core safety property and is enforced here at the boundary.
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
  console.error(`/api/ask failed (${providerStatus ?? "n/a"}):`, message);
  return json({ error: "provider_failure", providerStatus, message }, 502);
}

const AskRequest = z.object({
  question: z.string().trim().min(1),
  groups: z.array(ClaimGroup),
});

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof AskRequest>;
  try {
    body = AskRequest.parse(await req.json());
  } catch (err) {
    return json(
      { error: "bad_request", message: err instanceof Error ? err.message : "Invalid request body" },
      400,
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return json(
      { error: "server_misconfigured", message: "ANTHROPIC_API_KEY must be set" },
      500,
    );
  }

  let response: AskResponse;
  try {
    response = await createClaudeAsker(anthropicKey).ask({
      question: body.question,
      groups: body.groups,
    });
  } catch (err) {
    return providerError(err);
  }

  // Hard guard at the boundary: an 'answered'/'partial' with no claim ids is invalid by contract and
  // AskResponse.parse throws before it could ever be returned as a generated answer. The asker's
  // resolveAskResponse already guarantees this; re-validating here makes the boundary itself enforce
  // the core safety property.
  const safe = AskResponse.parse(response);
  return json(safe, 200);
}
