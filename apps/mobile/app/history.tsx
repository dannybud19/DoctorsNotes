import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Backdrop } from "../components/recovery/Backdrop";
import { warm } from "../components/warm";
import { WarmBack, WarmBody, WarmListRow, WarmScreen, WarmTitle } from "../components/warmUi";
import { encounters, formatDate, speakerLabel } from "./lib/data";
import { font, space } from "./lib/theme";

// Screen 8 — Consultation history. Grouped by day, newest first: a date header with a rule running
// right, then a row per consultation reading "09:10  Dr Kelly". Tap opens the transcript.
//
// Duration is deliberately off the row — it is shown on the encounter detail screen. Keeping each
// row to a time and a name makes the list scannable at a glance.
export default function History() {
  const router = useRouter();
  const days = groupByDay(encounters);

  return (
    <WarmScreen scroll>
      <Backdrop />
      <WarmBack onPress={() => router.back()} />
      <WarmTitle>Consultation history</WarmTitle>

      {days.length === 0 ? (
        <WarmBody>No consultations have been recorded yet.</WarmBody>
      ) : (
        days.map((day) => (
          <View key={day.label} style={styles.group}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel} accessibilityRole="header">
                {day.label}
              </Text>
              <View style={styles.rule} />
            </View>
            {day.items.map((e) => (
              <WarmListRow
                key={e.id}
                label={`${formatTime(e.occurredAt)}   ${speakerLabel(e.speaker)}`}
                onPress={() => router.push(`/encounter/${e.id}`)}
              />
            ))}
          </View>
        ))
      )}
    </WarmScreen>
  );
}

type Encounter = (typeof encounters)[number];

/**
 * Bucket consultations by calendar day — days newest first, and newest first within a day. Uses UTC
 * throughout, matching `formatDate`/`formatDateTime`, so the same fixture reads identically wherever
 * it runs.
 */
function groupByDay(list: readonly Encounter[]): { label: string; items: Encounter[] }[] {
  const buckets = new Map<string, Encounter[]>();
  for (const e of list) {
    const key = e.occurredAt.slice(0, 10); // YYYY-MM-DD — sortable as a plain string
    const bucket = buckets.get(key);
    if (bucket) bucket.push(e);
    else buckets.set(key, [e]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      label: formatDate(`${key}T00:00:00Z`),
      items: [...items].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    }));
}

/** "09:10" in UTC. Local to this screen — app/lib/data.ts is shared and needs no new export. */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
  dayLabel: { fontSize: font.heading, fontWeight: "800", color: warm.ink },
  // Fills the width to the right of the label, as drawn.
  rule: { flex: 1, height: 1, backgroundColor: warm.hairline },
});
