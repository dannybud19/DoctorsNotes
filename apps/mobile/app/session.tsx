import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, ClaimCard, Screen, SectionTitle } from "../components/ui";
import {
  buildSession,
  entryId,
  questions as fixtureQuestions,
  runningPicture as fixturePicture,
  sessionClaims as fixtureWhatChanged,
  subjectLabel,
} from "./lib/data";
import { getLiveClaims } from "./lib/liveSession";
import { colors, font, space, STATUS_LABEL } from "./lib/theme";

// Screen 3 — Session result. Renders the LIVE extract response if present, else the sample fixture.
// Three sections, claim cards only. NO prose summary anywhere.
export default function Session() {
  const router = useRouter();
  const live = getLiveClaims();

  // Same three sections whether live or fixture — computed by the pure reconciler either way.
  const { whatChanged, picture, qs } = live
    ? buildSession(live)
    : { whatChanged: fixtureWhatChanged, picture: fixturePicture, qs: fixtureQuestions };

  const open = (category: string, subject: string) =>
    router.push(`/subject/${entryId(category, subject)}`);

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <View style={styles.headerRow}>
        <Text style={styles.h1} accessibilityRole="header">
          Your recording
        </Text>
        <View style={[styles.badge, live ? styles.badgeLive : styles.badgeSample]}>
          <Text style={styles.badgeText}>{live ? "Live" : "Sample"}</Text>
        </View>
      </View>

      <SectionTitle>What changed</SectionTitle>
      {whatChanged.length === 0 ? (
        <Text style={styles.empty}>Nothing new was captured.</Text>
      ) : (
        whatChanged.map((c) => (
          <ClaimCard key={c.id} claim={c} onPress={() => open(c.category, c.subject)} />
        ))
      )}

      <SectionTitle>Questions worth asking</SectionTitle>
      {qs.length === 0 ? (
        <Text style={styles.empty}>Nothing worth asking about right now.</Text>
      ) : (
        qs.map((q) => (
          <View key={q.id} style={styles.qBlock}>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {q.fromClaims.map((fc) => (
              <ClaimCard key={fc.id} claim={fc} onPress={() => open(fc.category, fc.subject)} />
            ))}
          </View>
        ))
      )}

      <SectionTitle>Running picture</SectionTitle>
      {picture.map((e) => (
        <View key={e.id} style={styles.pBlock}>
          <Text style={styles.status}>
            {subjectLabel(e.subject)} · {STATUS_LABEL[e.status]}
          </Text>
          <ClaimCard claim={e.latest} onPress={() => open(e.category, e.subject)} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLive: { backgroundColor: "#e6efe6" },
  badgeSample: { backgroundColor: colors.surface },
  badgeText: { fontSize: font.label, fontWeight: "700", color: colors.textMuted },
  empty: { fontSize: font.body, color: colors.textMuted },
  qBlock: { gap: space.sm },
  prompt: { fontSize: font.body, fontWeight: "700", color: colors.text, lineHeight: 30 },
  pBlock: { gap: space.xs },
  status: { fontSize: font.label, fontWeight: "600", color: colors.textMuted, textTransform: "capitalize" },
});
