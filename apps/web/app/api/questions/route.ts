import { NextResponse } from "next/server";
import { z } from "zod";
import { ClaimGroup, GeneratedQuestions } from "@medthread/domain";
import { createClaudeQuestionGenerator } from "@medthread/ai";

// Deeper "questions to ask your doctor": grounded in the patient's reconciled ClaimGroup[]. The model
// proposes questions only, each tied to >= 1 real claim; the guard drops anything ungrounded or
// non-interrogative. Never advice, never an answer.
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
  console.error(`/api/questions failed (${providerStatus ?? "n/a"}):`, message);
  return json({ error: "provider_failure", providerStatus, message }, 502);
}

const QuestionsRequest = z.object({ groups: z.array(ClaimGroup) });

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof QuestionsRequest>;
  try {
    body = QuestionsRequest.parse(await req.json());
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

  let result: GeneratedQuestions;
  try {
    result = await createClaudeQuestionGenerator(anthropicKey).generate({ groups: body.groups });
  } catch (err) {
    return providerError(err);
  }

  // Re-assert the grounded/interrogative guarantee at the boundary.
  return json(GeneratedQuestions.parse(result), 200);
}
