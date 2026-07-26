import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackButton } from "../components/ui";
import { TranscriptBubble } from "../components/chat/TranscriptBubble";
import { WarmClaimCard, WarmScreen, WarmSectionTitle } from "../components/warmUi";
import { warm } from "../components/warm";
import {
  buildSession,
  entryId,
  questions as fixtureQuestions,
  runningPicture as fixturePicture,
  sessionClaims as fixtureWhatChanged,
  sessionTranscript,
  subjectLabel,
  transcriptView,
} from "./lib/data";
import { getLiveClaims } from "./lib/liveSession";
import { getLiveTranscript } from "./lib/liveTranscript";
import { font, space, STATUS_LABEL } from "./lib/theme";

// Screen 3 — Session result, warm theme. The consultation is shown as a two-speaker chat transcript
// (User 1 / User 2), followed by the reconciled "Questions worth asking" and "Running picture".
// The transcript is verbatim display only; claims still come from the pure reconciler.
export default function Session() {
  const router = useRouter();
  const live = getLiveClaims();

  // Same three reconciled sections whether live or fixture — computed by the pure reconciler.
  const { whatChanged, picture, qs } = live
    ? buildSession(live)
    : { whatChanged: fixtureWhatChanged, picture: fixturePicture, qs: fixtureQuestions };

  // The conversation as bubbles: the live recording's own turns when present, else the sample.
  const bubbles = transcriptView(getLiveTranscript() ?? sessionTranscript);

  const open = (category: string, subject: string) =>
    router.push(`/subject/${entryId(category, subject)}`);

  return (
    <WarmScreen scroll>
      <BackButton onPress={() => router.back()} />
      <View style={styles.headerRow}>
        <Text style={styles.h1} accessibilityRole="header">
          Your recording
        </Text>
        <View style={[styles.badge, live ? styles.badgeLive : styles.badgeSample]}>
          <Text style={styles.badgeText}>{live ? "Live" : "Sample"}</Text>
        </View>
      </View>

      <WarmSectionTitle>What was said</WarmSectionTitle>
      <View style={styles.transcript}>
        {bubbles.map((b) => (
          <TranscriptBubble key={b.id} speaker={b.speaker} side={b.side}>
            <Text style={styles.turnText}>{b.text}</Text>
          </TranscriptBubble>
        ))}
      </View>

      <WarmSectionTitle>Questions worth asking</WarmSectionTitle>
      {qs.length === 0 ? (
        <Text style={styles.empty}>Nothing worth asking about right now.</Text>
      ) : (
        qs.map((q) => (
          <View key={q.id} style={styles.qBlock}>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {q.fromClaims.map((fc) => (
              <WarmClaimCard key={fc.id} claim={fc} onPress={() => open(fc.category, fc.subject)} />
            ))}
          </View>
        ))
      )}

      <WarmSectionTitle>Running picture</WarmSectionTitle>
      {picture.map((e) => (
        <View key={e.id} style={styles.pBlock}>
          <Text style={styles.status}>
            {subjectLabel(e.subject)} · {STATUS_LABEL[e.status]}
          </Text>
          <WarmClaimCard claim={e.latest} onPress={() => open(e.category, e.subject)} />
        </View>
      ))}
    </WarmScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h1: { fontSize: font.huge, fontWeight: "800", color: warm.ink },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLive: { backgroundColor: "#e6efe6" },
  badgeSample: { backgroundColor: warm.card, borderWidth: 1, borderColor: warm.hairline },
  badgeText: { fontSize: font.label, fontWeight: "700", color: warm.inkMuted },
  transcript: { gap: space.md },
  turnText: { fontSize: font.body, lineHeight: 30, color: warm.ink },
  empty: { fontSize: font.body, color: warm.inkMuted },
  qBlock: { gap: space.sm },
  prompt: { fontSize: font.body, fontWeight: "700", color: warm.ink, lineHeight: 30 },
  pBlock: { gap: space.xs },
  status: { fontSize: font.label, fontWeight: "600", color: warm.inkMuted, textTransform: "capitalize" },
});
