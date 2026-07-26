import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HoldToConfirm, PlainButton, Screen } from "../components/ui";
import { dueMedications, scheduleLabel, subjectLabel } from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 9 — Reminder (skeleton). Full screen, hold-to-confirm, visible "Not now" escape.
export default function Reminder() {
  const router = useRouter();
  const med = dueMedications[0];

  return (
    <Screen>
      <View style={styles.full}>
        <Text style={styles.time}>
          {med && med.status === "scheduled" ? scheduleLabel(med.slots) : "Now"}
        </Text>
        <Text style={styles.h1}>Time to take your {med ? subjectLabel(med.subject) : "medication"}</Text>
        {med ? <Text style={styles.verbatim}>"{med.claim.verbatimText}"</Text> : null}

        <View style={styles.actions}>
          <HoldToConfirm label="Hold to confirm you've taken it" onComplete={() => router.back()} />
          <PlainButton label="Not now" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, justifyContent: "center", gap: space.lg, paddingVertical: space.xl },
  time: { fontSize: font.title, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text, textAlign: "center", textTransform: "capitalize" },
  verbatim: { fontSize: font.body, color: colors.text, textAlign: "center", lineHeight: 30 },
  actions: { gap: space.md, marginTop: space.lg },
});
