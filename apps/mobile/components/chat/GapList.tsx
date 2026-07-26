import { StyleSheet, Text, View } from "react-native";
import type { Claim } from "@medthread/domain";
import type { Question } from "@medthread/reconciler";
import { ClaimCard } from "../ui";
import { colors, font, space } from "../../app/lib/theme";

/**
 * The "questions worth asking your doctor" view. Every question is DERIVED (buildQuestions) from
 * worth_confirming / uncorroborated groups — never model-generated, never advice. Each is phrased as a
 * question to ask and links back to the verbatim claims it came from.
 */
export function GapList({
  questions,
  onOpenClaim,
}: {
  questions: Question[];
  onOpenClaim: (claim: Claim) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>
        A few things seem worth double-checking with your doctor. You could ask:
      </Text>
      {questions.length === 0 ? (
        <Text style={styles.body}>Nothing stands out right now — that's good news.</Text>
      ) : (
        questions.map((q) => (
          <View key={q.id} style={styles.qBlock}>
            <Text style={styles.prompt}>“{q.prompt}”</Text>
            {q.fromClaims.map((c) => (
              <ClaimCard key={c.id} claim={c} onPress={() => onOpenClaim(c)} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  intro: { fontSize: font.body, fontWeight: "700", color: colors.text, lineHeight: 30 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  qBlock: { gap: space.xs, marginTop: space.xs },
  prompt: { fontSize: font.body, color: colors.text, lineHeight: 30 },
});
