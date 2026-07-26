import type { Claim } from "@medthread/domain";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { warm } from "../../components/warm";
import { WarmBack, WarmScreen } from "../../components/warmUi";
import { formatDate, getEntry, sourceKindLabel, sourceSummary, subjectLabel } from "../lib/data";
import { explainSubject } from "../lib/explain";
import { font, HIT_SLOP, MIN_TOUCH, space, STATUS_LABEL } from "../lib/theme";

// Subject detail — the drill-down. The clinician's VERBATIM words are the primary text; the
// plain-language explanation is opt-in and clearly marked; provenance is always shown.
export default function SubjectDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = id ? getEntry(id) : undefined;
  const [showExplain, setShowExplain] = useState(false);

  if (!entry) {
    return (
      <WarmScreen>
        <WarmBack onPress={() => router.back()} />
        <Text style={styles.h1}>We couldn't find that</Text>
        <Text style={styles.sub}>Go back and choose an item from the list.</Text>
      </WarmScreen>
    );
  }

  const explanation = explainSubject(entry.subject);

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
          onPress={() => setShowExplain((v) => !v)}
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
          <View style={styles.explainBox}>
            <Text style={styles.explainLabel}>Plain-language explanation — explains the words only</Text>
            <Text style={styles.explainText}>
              {explanation ?? "No plain-language explanation is available yet."}
            </Text>
          </View>
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
  },
  explainText: { fontSize: font.body, lineHeight: 30, color: warm.ink },
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
