import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { BackButton, LabelledRow, Screen } from "../components/ui";
import { encounters, formatDateTime, speakerLabel } from "./lib/data";
import { colors, font } from "./lib/theme";

// Screen 8 — Consultation history (skeleton). Encounters by date; tap opens the transcript.
export default function History() {
  const router = useRouter();
  const byDate = [...encounters].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Consultation history</Text>
      {byDate.map((e) => (
        <LabelledRow
          key={e.id}
          label={`${formatDateTime(e.occurredAt)} · ${speakerLabel(e.speaker)} · ${Math.round(e.durationMs / 60000)} min`}
          onPress={() => router.push(`/encounter/${e.id}`)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
});
