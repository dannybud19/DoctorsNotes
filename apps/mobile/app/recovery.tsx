import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Backdrop } from "../components/recovery/Backdrop";
import {
  ArrowRightIcon,
  AskIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  MoodFace,
  PillIcon,
  type Mood,
} from "../components/recovery/icons";
import { warm } from "../components/warm";
import {
  dueMedications,
  entryId,
  patientName,
  runningPicture,
  subjectLabel,
  type DueMedRow,
} from "./lib/data";
import { font, HIT_SLOP, MIN_TOUCH, NEEDS_CONFIRMING, space } from "./lib/theme";

// Screen 5 — Recovery home. Post-discharge; Danny's discharge trigger routes here (RECOVERY_ROUTE).
//
// Everything shown traces to a claim. In particular the medication cards render the clinician's
// VERBATIM words, never an app-written description of what a drug is for — that would be advice the
// app invented (AGENTS.md §1.1/§1.2). A dose is labelled "Confirmed" only when the reconciler found
// a patient Confirmation for it (D5); otherwise it says "Needs confirming", never a scheduled dose.
export default function Recovery() {
  const router = useRouter();
  const firstMed = dueMedications[0];

  // Subjects more than one person has described differently. Drives the banner's count.
  const worthConfirming = runningPicture.filter((e) => e.status === "worth_confirming").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.content}>
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
              onPress={() =>
                firstMed &&
                router.push(`/subject/${entryId(firstMed.claim.category, firstMed.subject)}`)
              }
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
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/")}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Begin a hospital stay"
          style={styles.stayRow}
        >
          <View style={styles.stayDisc}>
            <ArrowRightIcon color="#ffffff" />
          </View>
          <Text style={styles.stayText}>Begin a hospital stay</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** "1 thing" / "3 things" — keeps the banner readable without inventing urgency. */
function countLabel(count: number): string {
  return count === 1 ? "1 thing" : `${count} things`;
}

// ---------------------------------------------------------------------------------------------
// Mood row
//
// DELIBERATELY INERT. It shows the tap it received and nothing else: no storage, no network, no
// effect on any claim, question or reminder. PROJECT.md D2 commits to only two real inputs (record
// audio, photograph paper), and the domain has no type for a self-reported mood — so treating this
// as data would mean inventing one. Kept as a warm greeting until it earns a place in the model.
// ---------------------------------------------------------------------------------------------

const MOODS: ReadonlyArray<{ mood: Mood; label: string }> = [
  { mood: "very-good", label: "Very good" },
  { mood: "good", label: "Good" },
  { mood: "okay", label: "Okay" },
  { mood: "not-great", label: "Not great" },
  { mood: "poor", label: "Poor" },
];

function MoodRow() {
  const [selected, setSelected] = useState<Mood | null>(null);
  return (
    <View style={styles.moodRow} accessibilityRole="radiogroup">
      {MOODS.map(({ mood, label }) => {
        const isSelected = selected === mood;
        return (
          <Pressable
            key={mood}
            onPress={() => setSelected(mood)}
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
  );
}

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------

/**
 * One due medication. The clinician's exact words are the body of the card; the status says whether
 * the patient has confirmed this dose, and is never presented as the app endorsing it.
 */
function MedCard({ med, onPress }: { med: DueMedRow; onPress: () => void }) {
  const status = med.confirmed ? "Confirmed" : "Needs confirming";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${subjectLabel(med.subject)}, ${med.time}. ${status}. Tap to see the exact words.`}
      style={styles.med}
    >
      <Text style={styles.medTime}>{med.time}</Text>
      <Text style={styles.medName}>{subjectLabel(med.subject)}</Text>
      <Text style={styles.medVerbatim} numberOfLines={4}>
        {"“"}
        {med.claim.verbatimText}
        {"”"}
      </Text>
      <View style={[styles.statusPill, med.confirmed ? styles.statusOk : styles.statusPending]}>
        {med.confirmed ? <CheckIcon size={16} color={warm.terracotta} /> : null}
        <Text style={[styles.statusText, { color: med.confirmed ? warm.terracotta : NEEDS_CONFIRMING.text }]}>
          {status}
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

  stayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 84,
    borderRadius: 999,
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    paddingRight: space.lg,
    paddingLeft: 6,
    marginTop: space.sm,
  },
  stayDisc: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: warm.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  stayText: { flex: 1, fontSize: font.label, fontWeight: "700", color: warm.ink },
});
