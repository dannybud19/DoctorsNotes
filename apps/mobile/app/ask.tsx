import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { AskResponse } from "@doctorsnotes/domain";
import { BackButton, ClaimCard, Field, PlainButton, Screen, SectionTitle } from "../components/ui";
import { askResponses, claimGroups, entryId, getClaim } from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 6 — Chat with BeSide (LIVE). Sends the question + the reconciled picture to /api/ask, which
// answers by RETRIEVAL over claims only (never a generated fact). On any failure it falls back to the
// sample fixture responses so the demo never shows a blank screen — same pattern as recording.
const FALLBACK_ORDER = ["answered", "partial", "no_source"] as const;

export default function Ask() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const fbIndex = useRef(0);

  const open = (category: string, subject: string) => router.push(`/subject/${entryId(category, subject)}`);

  function fixtureFallback(): AskResponse {
    const kind = FALLBACK_ORDER[fbIndex.current % FALLBACK_ORDER.length]!;
    fbIndex.current += 1;
    return askResponses[kind] as AskResponse;
  }

  async function ask() {
    const question = q.trim();
    if (!question) return;
    setPhase("loading");
    setResponse(null);
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");
      const res = await fetch(`${apiBase}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, groups: claimGroups }),
      });
      const data = (await res.json()) as AskResponse & { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
      }
      setResponse(data);
      setOffline(false);
    } catch {
      // Fail-safe for the demo: show a sample answer rather than a blank screen. Clearly labelled.
      setResponse(fixtureFallback());
      setOffline(true);
    } finally {
      setPhase("done");
    }
  }

  function cards(ids: readonly string[]) {
    return ids.map((id) => {
      const c = getClaim(id);
      return c ? <ClaimCard key={id} claim={c} onPress={() => open(c.category, c.subject)} /> : null;
    });
  }

  function renderResponse(r: AskResponse) {
    if (r.kind === "answered") {
      return (
        <View style={styles.block}>
          <SectionTitle>Here's what you were told</SectionTitle>
          {cards(r.claimIds)}
        </View>
      );
    }
    if (r.kind === "partial") {
      return (
        <View style={styles.block}>
          <SectionTitle>Part of the answer</SectionTitle>
          {cards(r.claimIds)}
          <Text style={styles.gap}>Still unclear — {r.gap}</Text>
        </View>
      );
    }
    return (
      <View style={styles.block}>
        <Text style={styles.noSource}>Nobody has told you this yet, and I won't guess.</Text>
        <Text style={styles.body}>{r.suggestedQuestion}</Text>
        <Text style={styles.saved}>Saved to ask tomorrow.</Text>
      </View>
    );
  }

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Chat with BeSide</Text>
      <Field label="Your question" value={q} onChangeText={setQ} placeholder="e.g. What is my aspirin dose?" />
      <PlainButton label="Ask" onPress={ask} disabled={phase === "loading"} />

      {phase === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.sub}>Looking through what you've been told…</Text>
        </View>
      ) : null}

      {phase === "done" && response ? (
        <>
          {offline ? <Text style={styles.offline}>Showing a sample answer — offline.</Text> : null}
          {renderResponse(response)}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  center: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
  sub: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
  offline: { fontSize: font.label, fontWeight: "700", color: colors.textMuted, marginTop: space.md },
  block: { gap: space.sm, marginTop: space.md },
  gap: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  noSource: { fontSize: font.heading, fontWeight: "800", color: colors.text, lineHeight: 32 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  saved: { fontSize: font.label, fontWeight: "700", color: colors.textMuted },
});
