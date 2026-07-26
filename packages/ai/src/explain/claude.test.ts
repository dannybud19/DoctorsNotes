import { describe, expect, it } from "vitest";
import { resolveExplanation } from "./claude";

// Network-free tests for the response parser. The invariant (spec: attributed general info, never an
// app-authored medical fact): an explanation ships ONLY with at least one real source; text with no
// citable source collapses to an empty result so the UI can say "no reliable information found" rather
// than surface an unattributed medical statement.
describe("resolveExplanation", () => {
  it("returns the text plus deduped sources when the model cited web results", () => {
    const out = resolveExplanation([
      { type: "server_tool_use" },
      { type: "web_search_tool_result" },
      {
        type: "text",
        text: "Aspirin is a common medicine. ",
        citations: [{ url: "https://www.nhs.uk/medicines/aspirin/", title: "Aspirin - NHS" }],
      },
      {
        type: "text",
        text: "In low doses it helps stop blood clots forming.",
        // Same source cited again — must not duplicate.
        citations: [{ url: "https://www.nhs.uk/medicines/aspirin/", title: "Aspirin - NHS" }],
      },
    ]);
    expect(out.explanation).toBe(
      "Aspirin is a common medicine. In low doses it helps stop blood clots forming.",
    );
    expect(out.sources).toEqual([{ url: "https://www.nhs.uk/medicines/aspirin/", title: "Aspirin - NHS" }]);
  });

  it("collapses to EMPTY when the model produced text but cited nothing (no unattributed claim)", () => {
    const out = resolveExplanation([
      { type: "text", text: "I couldn't find reliable general information about this medicine." },
    ]);
    expect(out).toEqual({ explanation: "", sources: [] });
  });

  it("falls back to the URL as the title when a citation has none", () => {
    const out = resolveExplanation([
      { type: "text", text: "Metformin lowers blood sugar.", citations: [{ url: "https://example.org/metformin" }] },
    ]);
    expect(out.sources).toEqual([{ url: "https://example.org/metformin", title: "https://example.org/metformin" }]);
  });

  it("ignores non-text blocks entirely", () => {
    const out = resolveExplanation([{ type: "web_search_tool_result" }, { type: "server_tool_use" }]);
    expect(out).toEqual({ explanation: "", sources: [] });
  });
});
