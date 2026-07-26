import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { home } from "../home/palette";
import { colors, font, HIT_SLOP, space } from "../../app/lib/theme";

export type Chip = { key: string; label: string };

/** One-tap suggested prompts. Ink text on white (AAA); terracotta only as the pill border. */
export function SuggestionChips({ chips, onPick }: { chips: Chip[]; onPick: (chip: Chip) => void }) {
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={() => onPick(chip)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
          style={styles.chip}
        >
          <Text style={styles.text} numberOfLines={1}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: home.terracotta,
    backgroundColor: home.card,
    paddingHorizontal: space.md,
  },
  text: { fontSize: font.label, fontWeight: "700", color: colors.text },
});
