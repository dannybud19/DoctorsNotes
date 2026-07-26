/**
 * The live bars inside the capture pill.
 *
 * Each bar scales vertically with the amplitude, but with a different weight, so the shape reads as
 * a moving waveform rather than a row of bars rising in lockstep. Weights are fixed constants — not
 * random — so the pattern is stable across re-renders instead of reshuffling every frame.
 *
 * Bars are scaled with `scaleY` rather than by animating `height`: the amplitude value is driven by
 * the native driver, which supports `transform` and `opacity` only. Animating a layout property from
 * the same value would throw at runtime.
 *
 * Decorative: hidden from assistive tech, and it never represents anything that was said.
 */
import { Animated, StyleSheet, View } from "react-native";
import { warm } from "../warm";

/** Per-bar response weight. The uneven middle-heavy shape reads as a natural voice envelope. */
const WEIGHTS = [0.35, 0.55, 0.8, 0.45, 1, 0.7, 0.9, 0.5, 0.95, 0.6, 0.85, 0.4, 0.65, 0.3];

const BAR_WIDTH = 4;
/** Full height of a bar at rest; `scaleY` shrinks it from here. */
const BAR_HEIGHT = 34;
/** Scale at silence — a thin resting line rather than a collapsed, invisible bar. */
const QUIET_SCALE = 0.14;

export function WaveformBars({ amplitude }: { amplitude: Animated.Value }) {
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {WEIGHTS.map((weight, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              transform: [
                {
                  scaleY: amplitude.interpolate({
                    inputRange: [0, 1],
                    outputRange: [QUIET_SCALE, weight],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, height: BAR_HEIGHT },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: warm.terracotta,
  },
});
