import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HoldToConfirm } from "../components/ui";
import { warm } from "../components/warm";
import { WarmButton, WarmScreen } from "../components/warmUi";
import { dueMedications, scheduleLabel, subjectLabel } from "./lib/data";
import { addIntake } from "./lib/patientData";
import { font, space } from "./lib/theme";

// Screen 9 — Reminder. Full screen, hold-to-confirm, visible "Not now" escape. Opened by a tapped
// notification (which passes the dose via ?med=&slot=) or from the dashboard.
//
// `HoldToConfirm` is the safety control: holding records that the patient took THIS dose — an
// adherence record they generate (patientData.addIntake), never a change to what the clinician said.
// The clinician's verbatim words are the primary text.
export default function Reminder() {
  const router = useRouter();
  const params = useLocalSearchParams<{ med?: string; slot?: string }>();
  const med = dueMedications.find((m) => m.subject === params.med) ?? dueMedications[0];
  const slot = params.slot ? Number(params.slot) : 0;

  function confirmTaken() {
    // Record the patient's "I took it" (fire-and-forget — a storage hiccup must not block dismissal).
    if (med) void addIntake(med.subject, slot);
    router.back();
  }

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
          <HoldToConfirm label="Hold to confirm you've taken it" onComplete={confirmTaken} />
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
