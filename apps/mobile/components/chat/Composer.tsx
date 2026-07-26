import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { warm } from "../warm";
import { colors, font, HIT_SLOP, MIN_TOUCH, space } from "../../app/lib/theme";

/**
 * Bottom input bar: a multiline field + a round terracotta Send button. The Send glyph is decorative
 * (carries `accessibilityLabel="Send"`); all sentence text stays ink for AAA contrast.
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  disabled,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <View style={styles.bar}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask about your care…"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        accessibilityLabel="Your question"
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
        style={[styles.send, !canSend && styles.sendDisabled]}
      >
        <Text style={styles.glyph}>↑</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: 1,
    borderTopColor: warm.hairline,
    backgroundColor: warm.cream,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    maxHeight: 140,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    fontSize: font.body,
    color: colors.text,
  },
  send: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: warm.terracotta,
  },
  sendDisabled: { backgroundColor: warm.hairline },
  glyph: { fontSize: 28, fontWeight: "800", color: "#ffffff", lineHeight: 30 },
});
