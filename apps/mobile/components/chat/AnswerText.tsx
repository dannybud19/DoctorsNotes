import { StyleSheet, Text, View } from "react-native";
import type { AskResponse } from "@medthread/domain";
import { Citation } from "./Citation";
import { colors, font, space } from "../../app/lib/theme";

type GroundedAnswer = Extract<AskResponse, { kind: "answered" | "partial" }>;

/**
 * Renders a grounded answer as clean prose (`answerText`) followed by its inline citations. For a
 * `partial`, a muted "Worth checking — {gap}" line is appended. The prose is the D3 derived layer; it
 * only ever appears alongside its citations (guaranteed by the domain contract), and every citation
 * taps through to the verbatim source.
 */
export function AnswerText({
  response,
  onOpenClaim,
}: {
  response: GroundedAnswer;
  onOpenClaim: (claimId: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>{response.answerText}</Text>
      {response.kind === "partial" ? (
        <Text style={styles.gap}>Worth checking — {response.gap}</Text>
      ) : null}
      <View style={styles.cites}>
        {response.citations.map((c) => (
          <Citation key={c.claimId} citation={c} onPress={() => onOpenClaim(c.claimId)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  body: { fontSize: font.body, color: colors.text, lineHeight: 28 },
  gap: { fontSize: font.body, color: colors.text, lineHeight: 28 },
  cites: { gap: 2, marginTop: space.xs },
});
