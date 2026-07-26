import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { font, space } from "../../app/lib/theme";
import { warm } from "../warm";

/** Terracotta wash for the right-hand speaker, matching MessageBubble's patient pill (ink text is AAA). */
const RIGHT_TINT = "#f4e4d9";

/**
 * A two-sided consultation-transcript bubble. Unlike the Q&A `MessageBubble` (where the assistant is
 * borderless prose), BOTH speakers here are bubbles — a diarized conversation reads as a chat. The
 * left speaker gets a plain cream-card bubble, the right a terracotta wash; each carries a small
 * generic speaker label ("User 1" / "User 2"). Presentation only; the text is the verbatim turn.
 */
export function TranscriptBubble({
  speaker,
  side,
  children,
}: {
  speaker: string;
  side: "left" | "right";
  children: ReactNode;
}) {
  const right = side === "right";
  return (
    <View style={[styles.row, right ? styles.rowRight : styles.rowLeft]}>
      <View style={styles.column}>
        <Text style={[styles.label, right ? styles.labelRight : styles.labelLeft]}>{speaker}</Text>
        <View style={[styles.bubble, right ? styles.bubbleRight : styles.bubbleLeft]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", flexDirection: "row" },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  column: { maxWidth: "88%", gap: 4 },
  label: { fontSize: font.label, fontWeight: "700", color: warm.inkMuted },
  labelLeft: { marginLeft: space.sm },
  labelRight: { textAlign: "right", marginRight: space.sm },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bubbleLeft: {
    backgroundColor: warm.card,
    borderWidth: 1,
    borderColor: warm.hairline,
    borderTopLeftRadius: 6,
  },
  bubbleRight: {
    backgroundColor: RIGHT_TINT,
    borderTopRightRadius: 6,
  },
});
