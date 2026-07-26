import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { Claim } from "@medthread/domain";
import { formatDate, sourceKindLabel, sourceSummary } from "../app/lib/data";
import { font, HIT_SLOP, MIN_TOUCH, space } from "../app/lib/theme";
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

// -------------------------------------------------------------------------------------------
// Additions for the remaining redesigned screens (history, encounter, reminder, subject).
// Everything above is unchanged; these are additive so existing callers are unaffected.
// -------------------------------------------------------------------------------------------

/** Left arrow / right chevron. Decorative — the labels beside them carry the meaning. */
function BackArrowGlyph() {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warm.terracotta}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M19 12H5m0 0 6.5-6.5M5 12l6.5 6.5" />
    </Svg>
  );
}

function ChevronGlyph() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warm.terracotta}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M9 4.5 16.5 12 9 19.5" />
    </Svg>
  );
}

/** Warm back control. Twin of `BackButton` in ui.tsx. */
export function WarmBack({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={s.back}
    >
      <BackArrowGlyph />
    </Pressable>
  );
}

/** Page heading. */
export function WarmTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Body copy on cream. Always ink — terracotta on cream is only 3.9:1, too low for sentences. */
export function WarmBody({ children }: { children: ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

/** A tappable row with a WORD label and a trailing chevron. Never icon-only. */
export function WarmListRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.listRow}
    >
      <Text style={s.listRowLabel}>{label}</Text>
      <ChevronGlyph />
    </Pressable>
  );
}

/** A label/value pair, e.g. "When · 8 Jun 2026, 09:12". */
export function WarmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.labelRow}>
      <Text style={s.labelRowLabel}>{label}</Text>
      <Text style={s.labelRowValue}>{value}</Text>
    </View>
  );
}

export function WarmButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.button, isPrimary ? s.buttonPrimary : s.buttonSecondary]}
    >
      <Text style={[s.buttonText, isPrimary ? s.buttonTextPrimary : s.buttonTextSecondary]}>
        {label}
      </Text>
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

  // --- Additions ---
  back: { width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: "center" },
  title: { fontSize: font.huge, fontWeight: "800", color: warm.ink, lineHeight: 42 },
  body: { fontSize: font.body, color: warm.ink, lineHeight: 30 },
  listRow: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  listRowLabel: {
    flex: 1,
    fontSize: font.label,
    fontWeight: "700",
    color: warm.ink,
    lineHeight: 26,
  },
  labelRow: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  labelRowLabel: { fontSize: font.label, color: warm.inkMuted },
  labelRowValue: {
    fontSize: font.label,
    fontWeight: "700",
    color: warm.ink,
    textAlign: "right",
    flexShrink: 1,
  },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  buttonPrimary: { backgroundColor: warm.terracotta },
  buttonSecondary: { backgroundColor: warm.card, borderWidth: 1, borderColor: warm.hairline },
  buttonText: { fontSize: font.label, fontWeight: "700" },
  buttonTextPrimary: { color: "#ffffff" },
  buttonTextSecondary: { color: warm.terracotta },
});
