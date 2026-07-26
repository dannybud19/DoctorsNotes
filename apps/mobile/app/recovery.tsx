import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, LabelledRow, PlainButton, Row, Screen, SectionTitle } from "../components/ui";
import { PhaseSwitch } from "../components/PhaseSwitch";
import { dueMedications, encouragement, entryId, patientAge, patientName, subjectLabel } from "./lib/data";
import { colors, font, NEEDS_CONFIRMING, space } from "./lib/theme";

// Screen 5 — Recovery home (skeleton). Post-discharge.
export default function Recovery() {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const firstMed = dueMedications[0];

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      {/* Discharge phase toggle: move back to the admitted phase (Home) and back again. */}
      <PhaseSwitch current="recovery" />
      <Text style={styles.h1}>Good morning, {patientName}</Text>
      <Text style={styles.sub}>{patientName}, {patientAge}</Text>

      <SectionTitle>How are you feeling today?</SectionTitle>
      <PlainButton
        label={listening ? "Listening… tap to stop" : "Tap to answer with your voice"}
        onPress={() => setListening((v) => !v)}
      />

      <SectionTitle>What to take today</SectionTitle>
      {dueMedications.map((m) => (
        <View key={m.id} style={styles.med}>
          <Row label={subjectLabel(m.subject)} value={m.time} />
          <Text style={styles.verbatim}>"{m.claim.verbatimText}"</Text>
          {m.confirmed ? (
            <Text style={styles.confirmed}>Confirmed dose</Text>
          ) : (
            <Text style={[styles.needs, { backgroundColor: NEEDS_CONFIRMING.bg, color: NEEDS_CONFIRMING.text }]}>
              needs confirming
            </Text>
          )}
        </View>
      ))}

      <SectionTitle>More</SectionTitle>
      <LabelledRow
        label="More info on your meds"
        onPress={() =>
          firstMed && router.push(`/subject/${entryId(firstMed.claim.category, firstMed.subject)}`)
        }
      />
      <LabelledRow label="Consultation history" onPress={() => router.push("/history")} />
      <LabelledRow label="Ask" onPress={() => router.push("/ask")} />
      <PlainButton label="Show today's reminder" onPress={() => router.push("/reminder")} />

      <Text style={styles.encourage}>{encouragement}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted },
  med: {
    gap: space.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  verbatim: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  confirmed: { fontSize: font.label, fontWeight: "700", color: colors.text },
  needs: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, fontSize: font.label, fontWeight: "700" },
  encourage: { fontSize: font.body, color: colors.textMuted, lineHeight: 30, marginTop: space.md },
});
