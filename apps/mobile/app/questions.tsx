import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackButton } from "../components/ui";
import { WarmClaimCard, WarmScreen } from "../components/warmUi";
import { warm } from "../components/warm";
import { entryId, questions } from "./lib/data";
import { font, space } from "./lib/theme";

// Screen 7 — Questions to clarify (warm theme). One merged list.
export default function Questions() {
  const router = useRouter();
  const open = (category: string, subject: string) => router.push(`/subject/${entryId(category, subject)}`);

  return (
    <WarmScreen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Questions to clarify</Text>
      {questions.length === 0 ? (
        <Text style={styles.body}>Nothing to ask about right now.</Text>
      ) : (
        questions.map((q) => (
          <View key={q.id} style={styles.block}>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {q.fromClaims.map((c) => (
              <WarmClaimCard key={c.id} claim={c} onPress={() => open(c.category, c.subject)} />
            ))}
          </View>
        ))
      )}
    </WarmScreen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: warm.ink },
  body: { fontSize: font.body, color: warm.inkMuted },
  block: { gap: space.sm },
  prompt: { fontSize: font.body, fontWeight: "700", color: warm.ink, lineHeight: 30 },
});
