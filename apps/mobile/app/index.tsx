import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LabelledRow, MicButton, Screen, WaveformPill } from "../components/ui";
import { todayLabel } from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 1 — Home (inpatient). One primary action: the mic. Everything else is a labelled row.
export default function Home() {
  const router = useRouter();
  return (
    <Screen scroll>
      <Text style={styles.date} accessibilityRole="header">
        {todayLabel}
      </Text>

      <View style={styles.hero}>
        <MicButton label="Record" onPress={() => router.push("/recording")} />
        <Text style={styles.heroHint}>Tap to record what's said at your bedside.</Text>
        <WaveformPill />
      </View>

      <View style={styles.list}>
        <LabelledRow label="Consultation history" onPress={() => router.push("/history")} />
        <LabelledRow label="Ask" onPress={() => router.push("/ask")} />
        <LabelledRow label="Questions to clarify" onPress={() => router.push("/questions")} />
        <LabelledRow label="Upload medical files" onPress={() => router.push("/upload")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { fontSize: font.label, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
  hero: { alignItems: "center", gap: space.md },
  heroHint: { fontSize: font.body, color: colors.text, textAlign: "center", lineHeight: 30 },
  list: { gap: space.md, marginTop: space.md },
});
