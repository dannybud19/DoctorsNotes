import { useRouter } from "expo-router";
import { WarmBack, WarmBody, WarmListRow, WarmScreen, WarmTitle } from "../components/warmUi";
import { encounters, formatDateTime, speakerLabel } from "./lib/data";

// Screen 8 — Consultation history. Encounters by date; tap opens the transcript.
export default function History() {
  const router = useRouter();
  const byDate = [...encounters].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return (
    <WarmScreen scroll>
      <WarmBack onPress={() => router.back()} />
      <WarmTitle>Consultation history</WarmTitle>
      {byDate.length === 0 ? (
        <WarmBody>No consultations have been recorded yet.</WarmBody>
      ) : (
        byDate.map((e) => (
          <WarmListRow
            key={e.id}
            label={`${formatDateTime(e.occurredAt)} · ${speakerLabel(e.speaker)} · ${Math.round(e.durationMs / 60000)} min`}
            onPress={() => router.push(`/encounter/${e.id}`)}
          />
        ))
      )}
    </WarmScreen>
  );
}
