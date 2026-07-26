import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Backdrop } from "../components/recovery/Backdrop";
import {
  AskIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  MoodFace,
  PillIcon,
  type Mood,
} from "../components/recovery/icons";
import { PhaseSwitch } from "../components/PhaseSwitch";
import { warm } from "../components/warm";
import {
  dueMedications,
  entryId,
  patientName,
  runningPicture,
  scheduleLabel,
  subjectLabel,
  type DueMedRow,
  type DueMedStatus,
} from "./lib/data";
import { font, HIT_SLOP, MIN_TOUCH, NEEDS_CONFIRMING, space } from "./lib/theme";
import {
  addMoodCheckIn,
  getMoodCheckIns,
  getReminderTimes,
  setReminderTime,
  slotKey,
  type MoodCheckIn,
  type ReminderTimes,
} from "./lib/patientData";

// Screen 5 — Recovery home. Post-discharge; the discharge trigger routes here (RECOVERY_ROUTE).
//
// Everything shown traces to a claim. In particular the medication cards render the clinician's
// VERBATIM words, never an app-written description of what a drug is for — that would be advice the
// app invented (AGENTS.md §1.1/§1.2). A dose is labelled "Confirmed" only when the reconciler found
// a patient Confirmation for it (D5); otherwise it says "Needs confirming", never a scheduled dose.
//
// The Hospital stay ⇄ Recovery toggle (PhaseSwitch) at the top lets a discharged patient move back
// to the admitted phase (Home) and back again — it replaces the old "Begin a hospital stay" button.
export default function Recovery() {
  const router = useRouter();

  // Subjects more than one person has described differently. Drives the banner's count.
  const worthConfirming = runningPicture.filter((e) => e.status === "worth_confirming").length;

  // The clock times the PATIENT has set for their doses — the only source of reminder times.
  const [reminderTimes, setReminderTimes] = useState<ReminderTimes>({});
  useEffect(() => {
    getReminderTimes()
      .then(setReminderTimes)
      .catch(() => {});
  }, []);
  function handleSetTime(subject: string, slot: number, time: string) {
    setReminderTime(subject, slot, time)
      .then(setReminderTimes)
      .catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <PhaseSwitch current="recovery" />

        <Text style={styles.hi} accessibilityRole="header">
          Hi, {patientName}
        </Text>
        <Text style={styles.ask}>How are you feeling today?</Text>
        <View style={styles.underline} />

        <MoodRow />

        {worthConfirming > 0 ? (
          <Pressable
            onPress={() => router.push("/questions")}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`This seems worth asking about. ${countLabel(worthConfirming)} to check. Tap to see your questions.`}
            style={styles.banner}
          >
            <View style={styles.bannerIcon}>
              <AskIcon size={24} color={NEEDS_CONFIRMING.text} />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>This seems worth asking about</Text>
              <Text style={styles.bannerSub}>{countLabel(worthConfirming)} to check</Text>
            </View>
            <ChevronDownIcon color={NEEDS_CONFIRMING.text} />
          </Pressable>
        ) : null}

        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <BellIcon size={24} color={warm.terracotta} />
          </View>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Today's reminders
          </Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.medColumn}>
            {dueMedications.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                onPress={() => router.push(`/subject/${entryId(med.claim.category, med.subject)}`)}
              />
            ))}
          </View>

          <View style={styles.tileColumn}>
            <Tile
              label={"More on\nyour meds"}
              icon={<PillIcon size={24} color={warm.terracotta} />}
              onPress={() => router.push("/meds")}
            />
            <Tile
              label={"Consultation\nhistory"}
              icon={<HistoryIcon size={24} color={warm.terracotta} />}
              onPress={() => router.push("/history")}
            />
            <Tile
              label="Ask again"
              icon={<AskIcon size={24} color={warm.terracotta} />}
              onPress={() => router.push("/ask")}
            />
            <Tile
              label={"Today's\nreminder"}
              icon={<BellIcon size={24} color={warm.terracotta} />}
              onPress={() => router.push("/reminder")}
            />
          </View>
        </View>

        <ReminderTimesSection meds={dueMedications} times={reminderTimes} onSet={handleSetTime} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** "1 thing" / "3 things" — keeps the banner readable without inventing urgency. */
function countLabel(count: number): string {
  return count === 1 ? "1 thing" : `${count} things`;
}

// ---------------------------------------------------------------------------------------------
// Mood check-in
//
// A neutral SELF-REPORT the patient logs (spec: the "Yours" kind of data). It is stored on-device and
// shown back to the patient — but the app NEVER interprets it: no wellbeing assessment, no urgency
// styling by value, no triage, no "see a doctor" prompt. Kept strictly as the patient's own record.
// ---------------------------------------------------------------------------------------------

const MOODS: ReadonlyArray<{ mood: Mood; label: string }> = [
  { mood: "very-good", label: "Very good" },
  { mood: "good", label: "Good" },
  { mood: "okay", label: "Okay" },
  { mood: "not-great", label: "Not great" },
  { mood: "poor", label: "Poor" },
];

const MOOD_LABEL = Object.fromEntries(MOODS.map(({ mood, label }) => [mood, label])) as Record<
  Mood,
  string
>;

/** "9:41 am" from an ISO timestamp — plain, for the patient's own record (never interpreted). */
function checkInTime(iso: string): string {
  const d = new Date(iso);
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = d.getHours() < 12 ? "am" : "pm";
  const hour = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${hour}:${minutes} ${suffix}`;
}

function MoodRow() {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [recent, setRecent] = useState<MoodCheckIn[]>([]);

  useEffect(() => {
    getMoodCheckIns()
      .then(setRecent)
      .catch(() => {});
  }, []);

  function log(mood: Mood) {
    setSelected(mood);
    // Persist the patient's own report. Fire-and-forget; a storage hiccup must never block the UI.
    addMoodCheckIn(mood)
      .then(setRecent)
      .catch(() => {});
  }

  return (
    <View>
      <View style={styles.moodRow} accessibilityRole="radiogroup">
        {MOODS.map(({ mood, label }) => {
          const isSelected = selected === mood;
          return (
            <Pressable
              key={mood}
              onPress={() => log(mood)}
              hitSlop={HIT_SLOP}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={label}
              style={[styles.mood, isSelected && styles.moodSelected]}
            >
              <MoodFace mood={mood} color={isSelected ? warm.terracotta : warm.ink} />
            </Pressable>
          );
        })}
      </View>

      {recent.length > 0 ? (
        <View style={styles.checkins} accessibilityRole="summary">
          <Text style={styles.checkinsTitle}>Your check-ins</Text>
          {recent.slice(0, 3).map((c) => (
            <Text key={c.id} style={styles.checkinRow}>
              {MOOD_LABEL[c.mood]} · {checkInTime(c.notedAt)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------

/** Card label per row state — plain, never an endorsement of the dose. */
const MED_STATUS_TEXT: Record<DueMedStatus, string> = {
  scheduled: "Confirmed",
  needs_confirming: "Needs confirming",
  ask_frequency: "Ask how often",
};

/**
 * One medication row. The clinician's exact words are the body of the card. A `scheduled` row shows
 * how often the dose is taken (parsed from the confirmed value — never a fabricated clock time); the
 * other states surface a knowledge gap to resolve, and are never presented as the app endorsing a dose.
 */
function MedCard({ med, onPress }: { med: DueMedRow; onPress: () => void }) {
  const scheduled = med.status === "scheduled";
  const statusText = MED_STATUS_TEXT[med.status];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${subjectLabel(med.subject)}${scheduled ? `, ${scheduleLabel(med.slots)}` : ""}. ${statusText}. Tap to see the exact words.`}
      style={styles.med}
    >
      {scheduled ? <Text style={styles.medTime}>{scheduleLabel(med.slots)}</Text> : null}
      <Text style={styles.medName}>{subjectLabel(med.subject)}</Text>
      <Text style={styles.medVerbatim} numberOfLines={4}>
        {"“"}
        {med.claim.verbatimText}
        {"”"}
      </Text>
      <View style={[styles.statusPill, scheduled ? styles.statusOk : styles.statusPending]}>
        {scheduled ? <CheckIcon size={16} color={warm.terracotta} /> : null}
        <Text style={[styles.statusText, { color: scheduled ? warm.terracotta : NEEDS_CONFIRMING.text }]}>
          {statusText}
        </Text>
      </View>
    </Pressable>
  );
}

function Tile({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label.replace(/\n/g, " ")}
      style={styles.tile}
    >
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

/** Preset reminder times the patient can pick from — big, tappable, and always editable. */
const PRESET_TIMES = ["6:00 am", "8:00 am", "12:00 pm", "6:00 pm", "9:00 pm"] as const;

/**
 * "Your reminder times" — the patient sets a clock time for each confirmed dose. The app NEVER picks a
 * time; it only offers presets and remembers the patient's choice (spec: clock times are the patient's,
 * never inferred). Shown full-width so the choices stay large and readable for older eyes.
 */
function ReminderTimesSection({
  meds,
  times,
  onSet,
}: {
  meds: DueMedRow[];
  times: ReminderTimes;
  onSet: (subject: string, slot: number, time: string) => void;
}) {
  const scheduled = meds.filter((m) => m.status === "scheduled");
  if (scheduled.length === 0) return null;
  return (
    <View style={styles.timesSection}>
      <Text style={styles.timesTitle} accessibilityRole="header">
        Your reminder times
      </Text>
      <Text style={styles.timesHint}>You choose when — we'll remind you at the times you pick.</Text>
      {scheduled.flatMap((med) =>
        med.slots.map((slot, i) => {
          const key = slotKey(med.subject, i);
          const current = times[key];
          const doseLabel =
            med.slots.length > 1
              ? `${subjectLabel(med.subject)} · ${slot.label ?? `dose ${i + 1}`}`
              : subjectLabel(med.subject);
          return (
            <View key={key} style={styles.doseRow}>
              <Text style={styles.doseLabel}>{doseLabel}</Text>
              <View style={styles.chips}>
                {PRESET_TIMES.map((t) => {
                  const selected = current === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => onSet(med.subject, i, t)}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Remind me at ${t} for ${doseLabel}`}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: warm.cream },
  content: { padding: space.lg, gap: space.md },

  hi: { fontSize: 38, fontWeight: "800", color: warm.ink },
  ask: { fontSize: font.heading, fontWeight: "700", color: warm.inkMuted, lineHeight: 34 },
  underline: { width: 76, height: 5, borderRadius: 3, backgroundColor: warm.terracotta },

  moodRow: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  mood: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 72,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: warm.card,
    backgroundColor: warm.card,
    alignItems: "center",
    justifyContent: "center",
  },
  moodSelected: { borderColor: warm.terracotta },

  checkins: { marginTop: space.sm, gap: 2 },
  checkinsTitle: { fontSize: 14, fontWeight: "700", color: warm.inkMuted },
  checkinRow: { fontSize: 15, color: warm.ink },

  timesSection: { gap: space.sm, marginTop: space.sm },
  timesTitle: { fontSize: font.title, fontWeight: "800", color: warm.ink },
  timesHint: { fontSize: 15, color: warm.inkMuted, lineHeight: 22 },
  doseRow: { gap: 8, paddingVertical: space.xs },
  doseLabel: { fontSize: font.label, fontWeight: "700", color: warm.ink, textTransform: "capitalize" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: warm.terracotta, borderColor: warm.terracotta },
  chipText: { fontSize: font.label, fontWeight: "700", color: warm.ink },
  chipTextSelected: { color: "#ffffff" },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TOUCH,
    borderRadius: 22,
    backgroundColor: NEEDS_CONFIRMING.bg,
    padding: space.lg,
    marginTop: space.xs,
  },
  bannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#00000010",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCopy: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: font.label, fontWeight: "800", color: NEEDS_CONFIRMING.text, lineHeight: 26 },
  bannerSub: { fontSize: 15, color: NEEDS_CONFIRMING.text },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: warm.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { flex: 1, fontSize: font.title, fontWeight: "800", color: warm.ink },

  // Two columns, as drawn. The medication side is given the larger share because the verbatim quote
  // is the most important text on the screen and must stay readable.
  columns: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  medColumn: { flex: 1.75, gap: space.sm },
  tileColumn: { flex: 1, gap: space.sm },

  med: {
    borderRadius: 20,
    backgroundColor: warm.card,
    padding: space.md,
    gap: 6,
    borderWidth: 1,
    borderColor: warm.hairline,
  },
  medTime: { fontSize: 15, fontWeight: "600", color: warm.inkMuted },
  medName: { fontSize: font.label, fontWeight: "800", color: warm.ink, textTransform: "capitalize" },
  medVerbatim: { fontSize: 16, color: warm.ink, lineHeight: 24 },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusOk: { backgroundColor: "#f5e2d8" },
  statusPending: { backgroundColor: NEEDS_CONFIRMING.bg },
  statusText: { fontSize: 14, fontWeight: "700" },

  tile: {
    minHeight: 104,
    borderRadius: 20,
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: space.md,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: warm.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontSize: 15, fontWeight: "700", color: warm.ink, textAlign: "center", lineHeight: 20 },
});
