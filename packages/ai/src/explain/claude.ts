import Anthropic from "@anthropic-ai/sdk";
import type { Explainer, ExplainSource } from "../types";

const MODEL = "claude-opus-4-8";

// Web search is a SERVER-side tool: Claude runs the search on Anthropic's infrastructure and returns
// results with citations. SDK 0.68 types the basic variant `web_search_20250305` (no dynamic
// filtering, which is fine here). max_uses bounds the searches per request.
const WEB_SEARCH: Anthropic.WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 4,
};

// The safety contract for this feature. It surfaces GENERAL, attributed drug information — the one
// place the app shows something the patient's own care team didn't say — so the prompt forbids
// anything that would read as advice or as being about this specific patient.
const EXPLAIN_SYSTEM = `You explain, in plain language for an older hospital patient, what a named medicine IS and what it is generally used FOR. Use web search to find general information from reputable health sources (prefer official patient-facing ones such as the NHS).

Hard rules:
- GENERAL information only. NEVER give personalised advice, a dose, or tell the patient what to do, take, start, stop, or change. Never refer to this particular patient, their dose, or their situation.
- State only facts you can attribute to a reputable source you actually found, and let those sources be cited. If you cannot find reliable general information from a reputable source, reply with a single short sentence saying you couldn't find reliable general information about this medicine, and nothing else.
- Two to four short, plain sentences. Warm but factual. No jargon, no lists. Do not mention that you searched the web, and do not add disclaimers — the app adds its own.
- This is general education, not medical advice, and never a substitute for the patient's care team.`;

/** Turn a normalized subject key ("beta-blocker") into readable words for the query. */
function readableName(subject: string): string {
  return subject.replace(/-/g, " ").trim();
}

/** The shape of the response blocks this parser reads — a structural subset of Anthropic content blocks. */
type ExplainBlock = { type: string; text?: string; citations?: Array<{ url?: string; title?: string }> };

/**
 * Pure parse of the model's response into an attributed explanation (network-free, testable). Collects
 * text and the web-search citations that rode on it, deduped by URL. If nothing citable was found it
 * returns an EMPTY result — the app must never surface an unattributed medical statement.
 */
export function resolveExplanation(content: ReadonlyArray<ExplainBlock>): {
  explanation: string;
  sources: ExplainSource[];
} {
  let explanation = "";
  const sources: ExplainSource[] = [];
  const seen = new Set<string>();

  for (const block of content) {
    if (block.type !== "text") continue;
    explanation += block.text ?? "";
    for (const c of block.citations ?? []) {
      if (c.url && !seen.has(c.url)) {
        seen.add(c.url);
        sources.push({ url: c.url, title: c.title?.trim() || c.url });
      }
    }
  }

  if (sources.length === 0) return { explanation: "", sources: [] };
  return { explanation: explanation.trim(), sources };
}

/**
 * Explainer backed by Claude + the web-search server tool. Returns the model's plain-language summary
 * plus the sources it cited (deduped by URL). If nothing citable was found, `sources` is empty and the
 * caller should treat the result as "no reliable information" rather than surfacing an unattributed claim.
 */
export function createClaudeExplainer(apiKey: string): Explainer {
  if (!apiKey) {
    throw new Error("createClaudeExplainer: ANTHROPIC_API_KEY is required");
  }
  const client = new Anthropic({ apiKey });

  return {
    async explain({ subject, verbatimText }) {
      const name = readableName(subject);
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: EXPLAIN_SYSTEM,
        tools: [WEB_SEARCH],
        messages: [
          {
            role: "user",
            content:
              `Medicine: ${name}\n` +
              (verbatimText ? `A clinician referred to it like this: "${verbatimText}"\n` : "") +
              `In general terms, what is this medicine and what is it typically used for?`,
          },
        ],
      });

      // Web-search citations ride on the text blocks; `resolveExplanation` collects and dedupes them.
      return resolveExplanation(res.content as ReadonlyArray<ExplainBlock>);
    },
  };
}
