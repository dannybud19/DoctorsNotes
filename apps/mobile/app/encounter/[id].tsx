import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { warm } from "../../components/warm";
import {
  WarmBack,
  WarmRow,
  WarmScreen,
  WarmSectionTitle,
  WarmTitle,
} from "../../components/warmUi";
import { formatDateTime, getClaim, getEncounter, speakerLabel } from "../lib/data";
import { font, space } from "../lib/theme";

// Encounter detail. The extracted claims stand in as the transcript, highlighted.
export default function EncounterDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const enc = id ? getEncounter(id) : undefined;

  if (!enc) {
    return (
      <WarmScreen>
        <WarmBack onPress={() => router.back()} />
        <WarmTitle>We couldn't find that consultation</WarmTitle>
      </WarmScreen>
    );
  }

  return (
    <WarmScreen scroll>
      <WarmBack onPress={() => router.back()} />
      <Text style={styles.h1} accessibilityRole="header">
        {speakerLabel(enc.speaker)}
      </Text>
      <WarmRow label="When" value={formatDateTime(enc.occurredAt)} />
      <WarmRow label="Length" value={`${Math.round(enc.durationMs / 60000)} min`} />

      <WarmSectionTitle>Transcript — extracted claims highlighted</WarmSectionTitle>
      {enc.claimIds.map((cid) => {
        const c = getClaim(cid);
        return c ? (
          <View key={cid} style={styles.claim}>
            <Text style={styles.verbatim}>
              {"“"}
              {c.verbatimText}
              {"”"}
            </Text>
            <Text style={styles.meta}>
              {c.category} · {c.subject}
            </Text>
          </View>
        ) : null;
      })}
    </WarmScreen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: font.huge,
    fontWeight: "800",
    color: warm.ink,
    textTransform: "capitalize",
    lineHeight: 42,
  },
  claim: {
    gap: space.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: warm.hairline,
    borderLeftWidth: 5,
    borderLeftColor: warm.terracotta,
    backgroundColor: warm.card,
    padding: space.lg,
  },
  verbatim: { fontSize: font.body, color: warm.ink, lineHeight: 30 },
  meta: { fontSize: font.label, color: warm.inkMuted },
});
