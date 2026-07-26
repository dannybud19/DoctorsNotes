import type { Claim } from "@medthread/domain";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { warm } from "../../components/warm";
import { WarmBack, WarmScreen } from "../../components/warmUi";
import { formatDate, getEntry, sourceKindLabel, sourceSummary, subjectLabel } from "../lib/data";
import { explainSubject } from "../lib/explain";
import { font, HIT_SLOP, MIN_TOUCH, space, STATUS_LABEL } from "../lib/theme";

// Subject detail — the drill-down. The clinician's VERBATIM words are the primary text; the
// plain-language explanation is opt-in and clearly marked; provenance is always shown.
//
// "What does this mean?" behaves in one of two ways, and the two are never blended:
//   - For a MEDICATION, it fetches GENERAL info from the web via /api/explain, shown under a hard
//     "not from your care team · not medical advice" label with its sources. Empty → we say we
//     couldn't find reliable info, never an invented one.
//   - For other jargon, it shows the local canned explanation ("explains the words only").
type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string; sources: Array<{ title: string; url: string }> }
  | { status: "empty" }
  | { status: "error" };

export default function SubjectDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = id ? getEntry(id) : undefined;
  const [showExplain, setShowExplain] = useState(false);
  const [live, setLive] = useState<ExplainState>({ status: "idle" });

  if (!entry) {
    return (
      <WarmScreen>
        <WarmBack onPress={() => router.back()} />
        <Text style={styles.h1}>We couldn't find that</Text>
        <Text style={styles.sub}>Go back and choose an item from the list.</Text>
      </WarmScreen>
    );
  }

  const isMedication = entry.category === "medication-dose" || entry.category === "medication-change";
  const canned = explainSubject(entry.subject);

  async function loadLiveExplain(): Promise<void> {
    if (!entry) return;
    setLive({ status: "loading" });
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");
      const res = await fetch(`${apiBase}/api/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: entry.subject, verbatimText: entry.latest.verbatimText }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        sources?: Array<{ title: string; url: string }>;
      };
      // No attributed source → treat as "no reliable info"; never show an unsourced medical statement.
      if (!res.ok || !data.explanation || !data.sources?.length) {
        setLive({ status: "empty" });
        return;
      }
      setLive({ status: "done", text: data.explanation, sources: data.sources });
    } catch {
      setLive({ status: "error" });
    }
  }

  function toggleExplain(): void {
    const next = !showExplain;
    setShowExplain(next);
    if (next && isMedication && live.status === "idle") void loadLiveExplain();
  }

  return (
    <WarmScreen scroll>
      <WarmBack onPress={() => router.back()} />
      <Text style={styles.h1} accessibilityRole="header">
        {subjectLabel(entry.subject)}
      </Text>
      <Text style={styles.status}>{STATUS_LABEL[entry.status]}</Text>

      {entry.confirmation ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>You confirmed: {entry.confirmation.confirmedValue}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={toggleExplain}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityState={{ expanded: showExplain }}
        accessibilityLabel="What does this mean?"
        style={styles.explainToggle}
      >
        <Text style={styles.explainToggleText}>
          {showExplain ? "Hide explanation" : "What does this mean?"}
        </Text>
      </Pressable>

      {showExplain ? (
        isMedication ? (
          <View style={styles.explainBox}>
            <Text style={styles.explainLabel}>
              General information from the web — not from your care team · not medical advice
            </Text>
            {live.status === "loading" ? (
              <Text style={styles.explainText}>Looking this up…</Text>
            ) : live.status === "done" ? (
              <>
                <Text style={styles.explainText}>{live.text}</Text>
                <Text style={styles.sourcesLabel}>Sources</Text>
                {live.sources.map((s) => (
                  <Pressable
                    key={s.url}
                    onPress={() => void Linking.openURL(s.url)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="link"
                    accessibilityLabel={`Open source: ${s.title}`}
                  >
                    <Text style={styles.sourceLink}>{s.title}</Text>
                  </Pressable>
                ))}
              </>
            ) : live.status === "empty" ? (
              <Text style={styles.explainText}>
                We couldn't find reliable general information about this medicine.
              </Text>
            ) : (
              <Text style={styles.explainText}>We couldn't load this right now. Please try again.</Text>
            )}
          </View>
        ) : (
          <View style={styles.explainBox}>
            <Text style={styles.explainLabel}>Plain-language explanation — explains the words only</Text>
            <Text style={styles.explainText}>
              {canned ?? "No plain-language explanation is available yet."}
            </Text>
          </View>
        )
      ) : null}

      <Text style={styles.trailHeading}>What was said, in order</Text>
      {entry.trail.map((claim) => (
        <TrailItem key={claim.id} claim={claim} />
      ))}
    </WarmScreen>
  );
}

function TrailItem({ claim }: { claim: Claim }) {
  return (
    <View style={styles.trailItem}>
      <View style={styles.verbatimBar} />
      <View style={styles.trailBody}>
        <Text style={styles.verbatim}>
          {"“"}
          {claim.verbatimText}
          {"”"}
        </Text>
        <Text style={styles.prov}>{sourceSummary(claim.source)}</Text>
        <Text style={styles.provDate}>
          {sourceKindLabel(claim.source)} · {formatDate(claim.observedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: font.huge,
    fontWeight: "800",
    color: warm.ink,
    textTransform: "capitalize",
    lineHeight: 42,
  },
  sub: { fontSize: font.body, color: warm.inkMuted, lineHeight: 30 },
  status: { fontSize: font.body, fontWeight: "600", color: warm.inkMuted },
  confirm: {
    borderRadius: 16,
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    padding: space.md,
  },
  confirmText: { fontSize: font.body, fontWeight: "700", color: warm.ink },
  explainToggle: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warm.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  explainToggleText: { fontSize: font.label, fontWeight: "700", color: warm.terracotta },
  explainBox: { borderRadius: 16, backgroundColor: warm.card, padding: space.lg, gap: space.xs },
  explainLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: warm.inkMuted,
    textTransform: "uppercase",
    lineHeight: 20,
  },
  explainText: { fontSize: font.body, lineHeight: 30, color: warm.ink },
  sourcesLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: warm.inkMuted,
    textTransform: "uppercase",
    marginTop: space.xs,
  },
  sourceLink: {
    fontSize: font.label,
    fontWeight: "700",
    color: warm.terracotta,
    minHeight: MIN_TOUCH,
    lineHeight: 30,
  },
  trailHeading: {
    fontSize: font.heading,
    fontWeight: "800",
    color: warm.ink,
    marginTop: space.sm,
  },
  trailItem: { flexDirection: "row", gap: space.md },
  verbatimBar: { width: 5, borderRadius: 3, backgroundColor: warm.terracotta },
  trailBody: { flex: 1, gap: space.xs, paddingVertical: space.xs },
  verbatim: { fontSize: font.body, lineHeight: 30, color: warm.ink },
  prov: { fontSize: font.label, color: warm.inkMuted },
  provDate: { fontSize: 15, color: warm.inkMuted },
});
