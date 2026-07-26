import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, HIT_SLOP, space } from "../../app/lib/theme";
import { warm } from "../warm";

/** A question to ask, with the ids of the claims it came from (for the tappable source link). */
export type QAItem = { id: string; prompt: string; claimIds: string[] };

function Item({ q, onOpenClaim }: { q: QAItem; onOpenClaim: (claimId: string) => void }) {
  const first = q.claimIds[0];
  return (
    <View style={styles.item}>
      <Text style={styles.prompt}>{q.prompt}</Text>
      {first ? (
        <Pressable
          onPress={() => onOpenClaim(first)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="See what was said"
        >
          <Text style={styles.src}>See what was said</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * "Questions to ask your doctor", two grounded sources: `generated` = AI-proposed knowledge-gap
 * questions (deeper, tied to the patient's conditions); `everyone` = the deterministic discrepancy
 * questions (buildQuestions). Both are framed as questions to ask, never advice; each links to its
 * source claim.
 */
export function QuestionsToAsk({
  generated,
  everyone,
  pending,
  onOpenClaim,
}: {
  generated: QAItem[];
  everyone: QAItem[];
  pending: boolean;
  onOpenClaim: (claimId: string) => void;
}) {
  const nothing = !pending && generated.length === 0 && everyone.length === 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>A few things seem worth raising with your doctor. You could ask:</Text>
      {generated.map((q) => (
        <Item key={q.id} q={q} onOpenClaim={onOpenClaim} />
      ))}
      {pending ? <Text style={styles.pending}>Thinking of a few more…</Text> : null}
      {everyone.length > 0 ? (
        <>
          <Text style={styles.section}>Also worth clarifying</Text>
          {everyone.map((q) => (
            <Item key={q.id} q={q} onOpenClaim={onOpenClaim} />
          ))}
        </>
      ) : null}
      {nothing ? <Text style={styles.prompt}>Nothing stands out right now — that's good news.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  intro: { fontSize: font.body, fontWeight: "700", color: colors.text, lineHeight: 28 },
  section: { fontSize: font.label, fontWeight: "700", color: colors.textMuted, marginTop: space.xs },
  item: { gap: 2 },
  prompt: { fontSize: font.body, color: colors.text, lineHeight: 28 },
  src: { fontSize: font.label, color: warm.inkMuted, textDecorationLine: "underline" },
  pending: { fontSize: font.label, color: colors.textMuted },
});
