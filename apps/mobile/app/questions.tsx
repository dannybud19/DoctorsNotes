import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, ClaimCard, Screen } from "../components/ui";
import { entryId, questions } from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 7 — Questions to clarify (skeleton). One merged list.
export default function Questions() {
  const router = useRouter();
  const open = (category: string, subject: string) => router.push(`/subject/${entryId(category, subject)}`);

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Questions to clarify</Text>
      {questions.length === 0 ? (
        <Text style={styles.body}>Nothing to ask about right now.</Text>
      ) : (
        questions.map((q) => (
          <View key={q.id} style={styles.block}>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {q.fromClaims.map((c) => (
              <ClaimCard key={c.id} claim={c} onPress={() => open(c.category, c.subject)} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  body: { fontSize: font.body, color: colors.textMuted },
  block: { gap: space.sm },
  prompt: { fontSize: font.body, fontWeight: "700", color: colors.text, lineHeight: 30 },
});
