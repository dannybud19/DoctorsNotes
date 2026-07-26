import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { warm } from "../components/warm";
import { WarmBack, WarmScreen } from "../components/warmUi";
import {
  dueMedications,
  entryId,
  scheduleLabel,
  subjectLabel,
  type DueMedRow,
  type DueMedStatus,
} from "./lib/data";
import { getReminderTimes, slotKey, type ReminderTimes } from "./lib/patientData";
import { font, HIT_SLOP, NEEDS_CONFIRMING, space } from "./lib/theme";

// Screen — Your medicines. A recap of every medication the patient has been told about: the clinician's
// VERBATIM words (never an app-written description), how often (parsed from the confirmed value), the
// patient's own set reminder times, and confirm status. "What it is" is NOT shown here — tapping a card
// opens the subject detail, where the attributed, general web explanation lives (kept apart from the
// verbatim record on purpose).
const STATUS_TEXT: Record<DueMedStatus, string> = {
  scheduled: "Confirmed",
  needs_confirming: "Needs confirming",
  ask_frequency: "Ask how often",
};

export default function Meds() {
  const router = useRouter();
  const [times, setTimes] = useState<ReminderTimes>({});

  useEffect(() => {
    getReminderTimes()
      .then(setTimes)
      .catch(() => {});
  }, []);

  return (
    <WarmScreen scroll>
      <WarmBack onPress={() => router.back()} />
      <Text style={styles.h1} accessibilityRole="header">
        Your medicines
      </Text>
      <Text style={styles.sub}>
        Everything you've been told to take, in your clinicians' words. Tap one to see what it is.
      </Text>

      {dueMedications.map((med) => (
        <MedRecapCard
          key={med.id}
          med={med}
          times={times}
          onPress={() => router.push(`/subject/${entryId(med.claim.category, med.subject)}`)}
        />
      ))}
    </WarmScreen>
  );
}

function MedRecapCard({
  med,
  times,
  onPress,
}: {
  med: DueMedRow;
  times: ReminderTimes;
  onPress: () => void;
}) {
  const scheduled = med.status === "scheduled";
  const setTimes = scheduled
    ? med.slots.map((_, i) => times[slotKey(med.subject, i)]).filter((t): t is string => Boolean(t))
    : [];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${subjectLabel(med.subject)}. ${STATUS_TEXT[med.status]}. Tap to see what it is.`}
      style={styles.card}
    >
      <Text style={styles.name}>{subjectLabel(med.subject)}</Text>
      {scheduled ? <Text style={styles.freq}>{scheduleLabel(med.slots)}</Text> : null}
      <Text style={styles.verbatim} numberOfLines={4}>
        {"“"}
        {med.claim.verbatimText}
        {"”"}
      </Text>
      {scheduled ? (
        <Text style={styles.times}>
          {setTimes.length > 0 ? `Reminders: ${setTimes.join(", ")}` : "No reminder times set yet"}
        </Text>
      ) : null}
      <View style={[styles.pill, scheduled ? styles.pillOk : styles.pillPending]}>
        <Text style={[styles.pillText, { color: scheduled ? warm.terracotta : NEEDS_CONFIRMING.text }]}>
          {STATUS_TEXT[med.status]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: warm.ink, lineHeight: 42 },
  sub: { fontSize: font.body, color: warm.inkMuted, lineHeight: 30 },
  card: {
    borderRadius: 20,
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    padding: space.lg,
    gap: 6,
  },
  name: { fontSize: font.heading, fontWeight: "800", color: warm.ink, textTransform: "capitalize" },
  freq: { fontSize: 15, fontWeight: "600", color: warm.inkMuted },
  verbatim: { fontSize: font.body, color: warm.ink, lineHeight: 28 },
  times: { fontSize: font.label, fontWeight: "700", color: warm.ink },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  pillOk: { backgroundColor: "#f5e2d8" },
  pillPending: { backgroundColor: NEEDS_CONFIRMING.bg },
  pillText: { fontSize: 14, fontWeight: "700" },
});
