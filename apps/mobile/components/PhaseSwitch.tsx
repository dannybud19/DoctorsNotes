import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ADMITTED_ROUTE, RECOVERY_ROUTE } from "../app/lib/dischargeState";
import { font, HIT_SLOP, space } from "../app/lib/theme";
import { warm } from "./warm";

type Phase = "admitted" | "recovery";

/**
 * The discharge phase toggle: once discharged, the patient can move back and forth between the
 * admitted phase (Home) and the recovery dashboard. Rendered only when discharged, on both ends
 * (Home shows `current="admitted"`, Recovery shows `current="recovery"`). A plain 2-segment control
 * — elder-first, no swipe/pager dependency. Tapping the inactive segment navigates there.
 */
export function PhaseSwitch({ current }: { current: Phase }) {
  const router = useRouter();
  const go = (phase: Phase) => {
    if (phase === current) return;
    router.replace(phase === "recovery" ? RECOVERY_ROUTE : ADMITTED_ROUTE);
  };
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <Segment label="Hospital stay" active={current === "admitted"} onPress={() => go("admitted")} />
      <Segment label="Recovery" active={current === "recovery"} onPress={() => go("recovery")} />
    </View>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={active}
      hitSlop={HIT_SLOP}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `${label}, current view` : `Switch to ${label}`}
      style={[styles.segment, active ? styles.segmentActive : null]}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segment: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  segmentActive: { backgroundColor: warm.terracotta },
  segmentText: { fontSize: font.label, fontWeight: "700", color: warm.inkMuted },
  // White on terracotta ≈ 4.6:1 (AA). The inactive label stays ink-muted on cream.
  segmentTextActive: { color: "#ffffff" },
});
