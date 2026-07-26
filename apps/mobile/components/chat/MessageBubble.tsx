import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { home } from "../home/palette";
import { space } from "../../app/lib/theme";

/** Warm terracotta wash for the patient's own messages. Ink text on it measures AAA. */
const USER_TINT = "#f4e4d9";

/**
 * A chat bubble. `user` messages are a warm tint, right-aligned; `assistant` messages are a white
 * card with a hairline border, left-aligned. Presentation only — content is passed as children so
 * answers (claim cards), gap lists, and plain text all share the same bubble.
 */
export function MessageBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", flexDirection: "row" },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "92%", borderRadius: 20, padding: space.md, gap: space.sm },
  user: { backgroundColor: USER_TINT, borderTopRightRadius: 6 },
  assistant: {
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.hairline,
    borderTopLeftRadius: 6,
  },
});
