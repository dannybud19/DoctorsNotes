import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { entryId, questions, subjectLabel } from "./lib/data";
import { colors, font, HIT_SLOP, MIN_TOUCH, space } from "./lib/theme";

// Questions to ask tomorrow — derived strictly from the data (disagreements + single-source items).
// Each is phrased as a question the patient can ASK. Never advice. Tap to see the exact words.
export default function Questions() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={questions}
        keyExtractor={(q) => q.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.back}
            >
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
            <Text style={styles.h1} accessibilityRole="header">
              Questions to ask tomorrow
            </Text>
            <Text style={styles.sub}>Things worth raising with the team. Tap one to see the exact words.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.sub}>Nothing to ask about right now.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/subject/${entryId(item.category, item.subject)}`)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={item.prompt}
            style={styles.card}
          >
            <Text style={styles.prompt}>{item.prompt}</Text>
            <Text style={styles.link}>About {subjectLabel(item.subject)} · tap to see the exact words</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, gap: space.md },
  header: { gap: space.sm, marginBottom: space.sm },
  back: { minHeight: MIN_TOUCH, justifyContent: "center" },
  backText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.sm,
  },
  prompt: { fontSize: font.heading, fontWeight: "700", color: colors.text, lineHeight: 32 },
  link: { fontSize: font.label, color: colors.primary, textTransform: "capitalize" },
});
