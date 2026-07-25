import type { Claim } from "@doctorsnotes/domain";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDate, getEntry, sourceKindLabel, sourceSummary, subjectLabel } from "../lib/data";
import { explainSubject } from "../lib/explain";
import { colors, font, HIT_SLOP, MIN_TOUCH, space, STATUS_LABEL } from "../lib/theme";

// Subject detail — the drill-down. The clinician's VERBATIM words are the primary text; the
// plain-language explanation is opt-in and clearly marked; provenance is always shown.
export default function SubjectDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = id ? getEntry(id) : undefined;
  const [showExplain, setShowExplain] = useState(false);

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.h1}>We couldn't find that</Text>
          <Text style={styles.sub}>Go back and choose an item from the list.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const explanation = explainSubject(entry.subject);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton onPress={() => router.back()} />
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
      </ScrollView>
    </SafeAreaView>
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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.back}
    >
      <Text style={styles.backText}>‹ Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  back: { minHeight: MIN_TOUCH, justifyContent: "center" },
  backText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text, textTransform: "capitalize" },
  sub: { fontSize: font.body, color: colors.textMuted },
  status: { fontSize: font.body, fontWeight: "600", color: colors.textMuted },
  confirm: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  confirmText: { fontSize: font.body, fontWeight: "700", color: colors.text },
  explainToggle: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  explainToggleText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  explainBox: { borderRadius: 12, backgroundColor: colors.surface, padding: space.md, gap: space.xs },
  explainLabel: { fontSize: 14, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  explainText: { fontSize: font.body, lineHeight: 30, color: colors.text },
  trailHeading: { fontSize: font.heading, fontWeight: "700", color: colors.text, marginTop: space.sm },
  trailItem: { flexDirection: "row", gap: space.md },
  verbatimBar: { width: 4, borderRadius: 2, backgroundColor: colors.verbatimBar },
  trailBody: { flex: 1, gap: space.xs, paddingVertical: space.xs },
  verbatim: { fontSize: font.body, lineHeight: 30, color: colors.text },
  prov: { fontSize: font.label, color: colors.textMuted },
  provDate: { fontSize: 15, color: colors.textMuted },
});
