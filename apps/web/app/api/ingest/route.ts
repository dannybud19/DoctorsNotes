import { NextResponse } from "next/server";
import { NotImplementedError } from "@medthread/domain";
import type { ClaimExtractor, Ocr, Transcriber } from "@medthread/ai";

// Server-side capture ingest: a recording or document image → verbatim Claims with provenance.
export const runtime = "nodejs";

const transcriber: Transcriber = {
  async transcribe() {
    throw new NotImplementedError("Transcriber provider (e.g. Deepgram) not wired yet");
  },
};
const ocr: Ocr = {
  async extract() {
    throw new NotImplementedError("OCR provider (e.g. Azure/Mistral) not wired yet");
  },
};
const extractor: ClaimExtractor = {
  async extractClaims() {
    throw new NotImplementedError("ClaimExtractor not wired yet");
  },
};

export async function POST(_req: Request): Promise<Response> {
  // Pipeline (follow-on): store blob → transcribe/ocr → extractClaims → persist verbatim Claims.
  void transcriber;
  void ocr;
  void extractor;
  return NextResponse.json({ error: "ingest pipeline not implemented" }, { status: 501 });
}
