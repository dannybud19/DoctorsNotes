import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { questions, runningPicture, sourceKindLabel, subjectLabel, type PictureEntry } from "./lib/data";
import { colors, font, HIT_SLOP, MIN_TOUCH, space, STATUS_ACCENT, STATUS_LABEL } from "./lib/theme";

// Home — "What's happening to you". A calm, dignified list in the clinicians' exact words.
// Everything here renders from pure, offline fixture data (no AI, no network).
export default function Home() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={runningPicture}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.h1} accessibilityRole="header">
              What's happening to you
            </Text>
            <Text style={styles.sub}>In the exact words the clinicians used.</Text>
            <Pressable
              onPress={() => router.push("/questions")}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Questions to ask tomorrow. ${questions.length} questions.`}
              style={styles.questionsBtn}
            >
              <Text style={styles.questionsBtnText}>Questions to ask tomorrow ({questions.length})</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Entry entry={item} onPress={() => router.push(`/subject/${item.id}`)} />
        )}
        ListFooterComponent={<CaptureBar />}
      />
    </SafeAreaView>
  );
}

function Entry({ entry, onPress }: { entry: PictureEntry; onPress: () => void }) {
  const accent = STATUS_ACCENT[entry.status];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${subjectLabel(entry.subject)}. ${STATUS_LABEL[entry.status]}. Tap to see more.`}
      style={styles.card}
    >
      <Text style={styles.cardTitle}>{subjectLabel(entry.subject)}</Text>
      <View style={[styles.badge, { backgroundColor: accent.bg }]}>
        <Text style={[styles.badgeText, { color: accent.text }]}>{STATUS_LABEL[entry.status]}</Text>
      </View>
      <Text style={styles.verbatim} numberOfLines={3}>
        {"“"}
        {entry.latest.verbatimText}
        {"”"}
      </Text>
      <Text style={styles.meta}>{sourceKindLabel(entry.latest.source)} · tap to see more</Text>
    </Pressable>
  );
}

// Capture is the real product's core action; disabled here until the capture feature lands.
function CaptureBar() {
  return (
    <View style={styles.captureBar}>
      {(["Record", "Photograph"] as const).map((label) => (
        <View
          key={label}
          style={styles.captureBtn}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`${label}. Coming soon.`}
        >
          <Text style={styles.captureText}>{label}</Text>
          <Text style={styles.captureSoon}>coming soon</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, gap: space.md },
  header: { gap: space.sm, marginBottom: space.sm },
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted },
  questionsBtn: {
    marginTop: space.sm,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  questionsBtnText: { fontSize: font.label, fontWeight: "700", color: colors.onPrimary },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.sm,
  },
  cardTitle: { fontSize: font.heading, fontWeight: "700", color: colors.text, textTransform: "capitalize" },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  badgeText: { fontSize: font.label, fontWeight: "600" },
  verbatim: { fontSize: font.body, lineHeight: 30, color: colors.text },
  meta: { fontSize: font.label, color: colors.textMuted },
  captureBar: { flexDirection: "row", gap: space.md, marginTop: space.lg },
  captureBtn: {
    flex: 1,
    minHeight: MIN_TOUCH + 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  captureText: { fontSize: font.label, fontWeight: "700", color: colors.disabled },
  captureSoon: { fontSize: 14, color: colors.disabled },
});
