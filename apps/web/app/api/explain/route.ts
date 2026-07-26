import { NextResponse } from "next/server";
import { NotImplementedError } from "@medthread/domain";
import type { Explainer } from "@medthread/ai";

// AI runs server-side only (AGENTS.md §1.3). Node runtime for the (future) provider SDKs.
export const runtime = "nodejs";

// Swapped for a concrete provider (AI SDK via AI Gateway) in a follow-on. Fails loudly until then.
const explainer: Explainer = {
  async explain() {
    throw new NotImplementedError("Explainer provider not wired yet");
  },
};

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { verbatimText?: string; question?: string };
  if (!body.verbatimText) {
    return NextResponse.json({ error: "verbatimText is required" }, { status: 400 });
  }
  const result = await explainer.explain({
    verbatimText: body.verbatimText,
    ...(body.question ? { question: body.question } : {}),
  });
  return NextResponse.json(result);
}
