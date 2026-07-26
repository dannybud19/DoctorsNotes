import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { warm } from "../warm";
import { space } from "../../app/lib/theme";

/** Warm terracotta wash for the patient's own messages. Ink text on it measures AAA. */
const USER_TINT = "#f4e4d9";

/**
 * ChatGPT-style rows. The assistant reply is **borderless, full-width plain text** (no card chrome) so
 * answers read as clean prose, not stacked panels. The patient's own turns are a small right-aligned
 * tinted pill. Presentation only — content is passed as children.
 */
export function MessageBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  if (role === "assistant") {
    return <View style={styles.assistant}>{children}</View>;
  }
  return (
    <View style={styles.userRow}>
      <View style={styles.userPill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  assistant: { width: "100%", paddingVertical: space.xs, gap: space.xs },
  userRow: { width: "100%", flexDirection: "row", justifyContent: "flex-end" },
  userPill: {
    maxWidth: "85%",
    backgroundColor: USER_TINT,
    borderRadius: 18,
    borderTopRightRadius: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
