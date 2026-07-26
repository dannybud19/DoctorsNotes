import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Claim } from "@medthread/domain";
import { formatDate, sourceKindLabel, sourceSummary } from "../app/lib/data";
import { colors, font, HIT_SLOP, MIN_TOUCH, record, space } from "../app/lib/theme";
import { ChevronIcon } from "./home/icons";
import { actionSize, warm } from "./warm";

/** Screen shell with safe-area insets. Set `scroll` for long content. */
export function Screen({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
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

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/**
 * The record affordance: a big circular button with concentric rings and a WORD label (no icon).
 * Idle = calm blue and tappable; active = deep red, shown as state (pass no `onPress`).
 */
export function MicButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const bg = active ? record.active : record.idle;
  const ring = active ? record.ringActive : record.ringIdle;
  return (
    <View style={s.micWrap}>
      <View style={[s.ring, s.ringOuter, { borderColor: ring }]} />
      <View style={[s.ring, s.ringInner, { borderColor: ring }]} />
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityState={{ disabled: !onPress, busy: !!active }}
        accessibilityLabel={label}
        style={[s.mic, { backgroundColor: bg }]}
      >
        <Text style={s.micLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

/** Static waveform pill — a calm visual cue that this is about audio. Decorative. */
export function WaveformPill({ active }: { active?: boolean }) {
  const heights = [10, 20, 32, 16, 26, 12, 22, 30, 14, 24, 18, 28];
  return (
    <View style={s.pill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {heights.map((h, i) => (
        <View
          key={i}
          style={{ width: 4, height: h, borderRadius: 2, backgroundColor: active ? record.active : colors.border }}
        />
      ))}
    </View>
  );
}

/** A tappable row with a WORD label (no icon-only controls). Secondary to the screen's primary action. */
export function LabelledRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.row}
    >
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowMore}>›</Text>
    </Pressable>
  );
}

/**
 * Home greeting: a warm "Hi, {name}" header + the plain-language prompt beneath it.
 *
 * Centred, with the name larger than the surrounding words and in the home accent. The name is a
 * nested <Text> so the two sizes share a baseline. Used by `app/index.tsx` only, which is why it
 * carries the home palette rather than the shared theme.
 */
export function Greeting({ name }: { name: string }) {
  return (
    <View style={s.greeting}>
      <Text style={s.greetingHi} accessibilityRole="header">
        Hi, <Text style={s.greetingName}>{name}</Text>
      </Text>
      <Text style={s.greetingSub}>What would you like to do today?</Text>
    </View>
  );
}

/**
 * A large, full-width home action: optional decorative icon, a WORD label, and a trailing chevron.
 * The label alone carries the meaning — the icon is hidden from assistive tech — so this is never an
 * icon-only control. Comfortably exceeds the elder-first touch minimum.
 *
 * `primary` is accepted but no longer changes the fill: the approved design gives all four home
 * actions equal visual weight. Kept in the signature so existing callers keep compiling.
 */
export function ActionButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.action}
    >
      {icon ? <View style={s.actionIcon}>{icon}</View> : null}
      <Text style={s.actionText}>{label}</Text>
      <ChevronIcon />
    </Pressable>
  );
}

/**
 * A claim card: the clinician's VERBATIM words are the primary text, with speaker + time beneath.
 * No summary, no interpretation. Tappable to open the drill-down.
 */
export function ClaimCard({ claim, onPress }: { claim: Claim; onPress?: () => void }) {
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

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={s.back}
    >
      <Text style={s.backText}>‹ Back</Text>
    </Pressable>
  );
}

/** Plain default button — presentation only. */
export function PlainButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
      style={[s.plainBtn, disabled ? s.plainBtnDisabled : null]}
    >
      <Text style={s.plainBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Reusable hold-to-confirm control; calls onComplete after being held `ms`. Visible fill. */
export function HoldToConfirm({
  label,
  onComplete,
  ms = 1500,
}: {
  label: string;
  onComplete: () => void;
  ms?: number;
}) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  // Clear the interval if the component unmounts mid-hold, so it can't setState after unmount.
  useEffect(() => () => {
    if (ref.current) clearInterval(ref.current);
  }, []);
  function stop() {
    if (ref.current) clearInterval(ref.current);
    ref.current = null;
    setProgress(0);
  }
  function start() {
    const t0 = Date.now();
    ref.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setProgress(p);
      if (p >= 1) {
        stop();
        onComplete();
      }
    }, 30);
  }
  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.holdBtn}
    >
      <View style={[s.holdFill, { width: `${Math.round(progress * 100)}%` }]} />
      <Text style={s.holdText}>{label}</Text>
    </Pressable>
  );
}

/** Labeled text input. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        style={s.input}
      />
    </View>
  );
}

/** Plain key/value row. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  sectionTitle: { fontSize: font.heading, fontWeight: "800", color: colors.text, marginTop: space.md },
  micWrap: { alignItems: "center", justifyContent: "center", height: record.size + 56, marginVertical: space.md },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 2 },
  ringOuter: { width: record.size + 48, height: record.size + 48 },
  ringInner: { width: record.size + 24, height: record.size + 24 },
  mic: {
    width: record.size,
    height: record.size,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  micLabel: { fontSize: font.heading, fontWeight: "800", color: record.onRecord },
  pill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
  },
  rowLabel: { fontSize: font.label, fontWeight: "700", color: colors.text },
  rowMore: { fontSize: font.title, color: colors.textMuted },
  // --- Home-only styles (Greeting + ActionButton). Both components are used by app/index.tsx alone,
  // so the warm home palette lives here without affecting any other screen.
  // No marginBottom here on purpose: the gap down to the buttons is owned solely by `content.gap`
  // in app/index.tsx. Setting both made that gap 56px (32 + 24) when it read as 32.
  greeting: { gap: space.xs, marginBottom: 0, alignItems: "center" },
  // The name is larger than the words around it. Because it is a NESTED <Text>, React Native aligns
  // the two sizes on their shared BASELINE — bottoms level — rather than centring them. That is the
  // intended look; do not add alignItems or a manual offset to "fix" it.
  greetingHi: { fontSize: font.title, fontWeight: "700", color: warm.ink, textAlign: "center" },
  greetingName: { fontSize: 40, color: warm.terracotta, fontWeight: "800" },
  greetingSub: {
    fontSize: font.huge,
    fontWeight: "800",
    color: warm.ink,
    textAlign: "center",
    lineHeight: 44,
  },
  action: {
    // Roomier than the shared `actionSize` default: taller, with the contents further from the
    // pill's edges. Set locally rather than by editing warm.ts, which Danny's chat components import.
    minHeight: 104,
    borderRadius: actionSize.radius,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    // Soft lift off the cream background. `elevation` is the Android equivalent.
    shadowColor: "#8a7f6d",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionIcon: { width: actionSize.iconSize, alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1, fontSize: font.heading, fontWeight: "800", color: warm.ink, lineHeight: 30 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.xs,
  },
  verbatim: { fontSize: font.body, lineHeight: 30, color: colors.text },
  cardMeta: { fontSize: font.label, color: colors.textMuted, marginTop: space.xs },
  cardMetaSmall: { fontSize: 15, color: colors.textMuted },
  back: { minHeight: MIN_TOUCH, justifyContent: "center" },
  backText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  plainBtn: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  plainBtnDisabled: { borderColor: colors.disabled },
  plainBtnText: { fontSize: font.label, fontWeight: "700", color: colors.text },
  holdBtn: {
    minHeight: MIN_TOUCH + 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#dfe7f5" },
  holdText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  field: { gap: space.xs },
  fieldLabel: { fontSize: font.label, fontWeight: "700", color: colors.text },
  input: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    fontSize: font.body,
    color: colors.text,
  },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: space.md, paddingVertical: space.xs },
  kvLabel: { fontSize: font.label, color: colors.textMuted, flexShrink: 1 },
  kvValue: { fontSize: font.label, fontWeight: "700", color: colors.text, flexShrink: 1, textAlign: "right" },
});
