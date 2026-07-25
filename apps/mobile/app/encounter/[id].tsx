import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, Row, Screen, SectionTitle } from "../../components/ui";
import { formatDateTime, getClaim, getEncounter, speakerLabel } from "../lib/data";
import { colors, font, space } from "../lib/theme";

// Encounter detail (skeleton). The extracted claims stand in as the transcript, highlighted.
export default function EncounterDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const enc = id ? getEncounter(id) : undefined;

  if (!enc) {
    return (
      <Screen>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.h1}>We couldn't find that consultation</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>{speakerLabel(enc.speaker)}</Text>
      <Row label="When" value={formatDateTime(enc.occurredAt)} />
      <Row label="Length" value={`${Math.round(enc.durationMs / 60000)} min`} />

      <SectionTitle>Transcript — extracted claims highlighted</SectionTitle>
      {enc.claimIds.map((cid) => {
        const c = getClaim(cid);
        return c ? (
          <View key={cid} style={styles.claim}>
            <Text style={styles.verbatim}>"{c.verbatimText}"</Text>
            <Text style={styles.meta}>
              {c.category} · {c.subject}
            </Text>
          </View>
        ) : null;
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text, textTransform: "capitalize" },
  claim: {
    gap: space.xs,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  verbatim: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  meta: { fontSize: font.label, color: colors.textMuted },
});
