import { describe, expect, it } from "vitest";
import { documentContentBlock, resolvePage } from "./document";

// Pure, network-free coverage of the two bits of logic added for PDF support. The Claude call
// itself is not mocked (that path stays a live-only concern); these helpers ARE the branch points.

describe("documentContentBlock", () => {
  it("emits a base64 image block for each supported image type", () => {
    for (const mediaType of ["image/jpeg", "image/png", "image/gif", "image/webp"]) {
      const block = documentContentBlock(mediaType, "AAAA");
      expect(block).toEqual({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: "AAAA" },
      });
    }
  });

  it("emits a base64 document block for a PDF", () => {
    expect(documentContentBlock("application/pdf", "JVBERi0=")).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "JVBERi0=" },
    });
  });

  it("throws loudly on an unsupported media type", () => {
    expect(() => documentContentBlock("image/tiff", "AAAA")).toThrow(/unsupported document type/);
    expect(() => documentContentBlock("text/plain", "AAAA")).toThrow(/unsupported document type/);
  });
});

describe("resolvePage", () => {
  it("uses the model's 1-based page when valid", () => {
    expect(resolvePage(3, 1)).toBe(3);
    expect(resolvePage(1, 5)).toBe(1);
  });

  it("floors a fractional page", () => {
    expect(resolvePage(2.9, 1)).toBe(2);
  });

  it("falls back when the page is absent, zero, negative, or NaN", () => {
    expect(resolvePage(undefined, 1)).toBe(1);
    expect(resolvePage(0, 1)).toBe(1);
    expect(resolvePage(-4, 7)).toBe(7);
    expect(resolvePage(Number.NaN, 2)).toBe(2);
  });
});
