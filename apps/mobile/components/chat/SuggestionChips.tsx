import { Pressable, StyleSheet, Text, View } from "react-native";
import { warm } from "../warm";
import { colors, font, HIT_SLOP } from "../../app/lib/theme";

export type Chip = { key: string; label: string };

/**
 * A vertical stack of one-tap suggested prompts that sits directly above the composer — all pills fit
 * on screen at once (no horizontal sliding). Full-width, compact pills. The parent fades this whole
 * strip out while a reply is pending and back in once the reply lands. `hitSlop` keeps the tap area
 * comfortably above the elder-first 56px minimum despite the compact 44px height.
 */
export function SuggestionChips({ chips, onPick }: { chips: Chip[]; onPick: (chip: Chip) => void }) {
  if (chips.length === 0) return null;
  return (
    <View style={styles.stack}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warm.terracotta,
    backgroundColor: warm.card,
    paddingHorizontal: 16,
  },
  text: { fontSize: font.label, fontWeight: "600", color: colors.text },
});
