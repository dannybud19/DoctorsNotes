import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Claim } from "@medthread/domain";
import { formatDate, sourceKindLabel, sourceSummary } from "../app/lib/data";
import { font, HIT_SLOP, space } from "../app/lib/theme";
import { warm } from "./warm";

/**
 * Warm-palette equivalents of the shared `components/ui.tsx` primitives, for the redesigned
 * results screens (session, questions). Kept separate on purpose: `ui.tsx`'s `Screen`/`ClaimCard`/
 * `SectionTitle` are consumed by 6-7 old-theme screens, so reskinning them in place would restyle
 * the whole app. These warm variants let a screen adopt the cream/terracotta look on its own.
 *
 * Contrast rule (see warm.ts): terracotta is for headings/accents only; sentences stay `warm.ink`.
 */

/** Cream screen shell with safe-area insets. Set `scroll` for long content. */
export function WarmScreen({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  const inner = scroll ? (
    <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
  ) : (
    <View style={s.content}>{children}</View>
  );
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {inner}
    </SafeAreaView>
  );
}

export function WarmSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/**
 * A claim card: the clinician's VERBATIM words are the primary text, with source + time beneath.
 * No summary, no interpretation. Tappable to open the drill-down. Warm-palette twin of `ClaimCard`.
 */
export function WarmClaimCard({ claim, onPress }: { claim: Claim; onPress?: () => void }) {
  const body = (
    <>
      <Text style={s.verbatim}>
        {"“"}
        {claim.verbatimText}
        {"”"}
      </Text>
      <Text style={s.cardMeta}>{sourceSummary(claim.source)}</Text>
      <Text style={s.cardMetaSmall}>
        {sourceKindLabel(claim.source)} · {formatDate(claim.observedAt)}
      </Text>
    </>
  );
  if (!onPress) return <View style={s.card}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${claim.verbatimText}. Tap to see where this came from.`}
      style={s.card}
    >
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: warm.cream },
  content: { padding: space.lg, gap: space.md },
  sectionTitle: { fontSize: font.heading, fontWeight: "800", color: warm.ink, marginTop: space.md },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    padding: space.lg,
    gap: space.xs,
  },
  verbatim: { fontSize: font.body, lineHeight: 30, color: warm.ink },
  cardMeta: { fontSize: font.label, color: warm.inkMuted, marginTop: space.xs },
  cardMetaSmall: { fontSize: 15, color: warm.inkMuted },
});
