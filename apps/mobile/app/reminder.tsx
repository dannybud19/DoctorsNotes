import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HoldToConfirm } from "../components/ui";
import { warm } from "../components/warm";
import { WarmButton, WarmScreen } from "../components/warmUi";
import { dueMedications, scheduleLabel, subjectLabel } from "./lib/data";
import { font, space } from "./lib/theme";

// Screen 9 — Reminder. Full screen, hold-to-confirm, visible "Not now" escape.
//
// `HoldToConfirm` is deliberately still the shared component from ui.tsx. It is the safety control
// that records the patient confirming they took a dose, and its behaviour must not be reimplemented
// for the sake of a colour change. It renders unmodified against the cream background.
export default function Reminder() {
  const router = useRouter();
  const med = dueMedications[0];

  return (
    <WarmScreen>
      <View style={styles.full}>
        <Text style={styles.time}>
          {med && med.status === "scheduled" ? scheduleLabel(med.slots) : "Now"}
        </Text>
        <Text style={styles.h1} accessibilityRole="header">
          Time to take your {med ? subjectLabel(med.subject) : "medication"}
        </Text>
        {med ? (
          <Text style={styles.verbatim}>
            {"“"}
            {med.claim.verbatimText}
            {"”"}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <HoldToConfirm label="Hold to confirm you've taken it" onComplete={() => router.back()} />
          <WarmButton label="Not now" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </WarmScreen>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, justifyContent: "center", gap: space.lg, paddingVertical: space.xl },
  time: { fontSize: font.title, fontWeight: "700", color: warm.inkMuted, textAlign: "center" },
  h1: {
    fontSize: font.huge,
    fontWeight: "800",
    color: warm.ink,
    textAlign: "center",
    textTransform: "capitalize",
    lineHeight: 42,
  },
  verbatim: { fontSize: font.body, color: warm.ink, textAlign: "center", lineHeight: 30 },
  actions: { gap: space.md, marginTop: space.lg },
});
