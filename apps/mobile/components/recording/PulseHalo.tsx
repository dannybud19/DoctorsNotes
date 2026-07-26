/**
 * The pulsating gradient halo behind the capture control.
 *
 * Three concentric rings, each a radial terracotta gradient fading to transparent, scaling and
 * fading with the live amplitude. The rings use staggered scale ranges so louder speech pushes the
 * outer ring further than the inner one — the halo swells rather than simply resizing.
 *
 * Purely decorative: no touches, hidden from screen readers, and it never encodes information. A
 * silent room shows a small calm halo; that is ornament, not a reading of anything clinical.
 *
 * Each ring is an `Animated.View` wrapping a static `<Svg>`, so the animation drives a plain
 * transform rather than animated SVG attributes — cheaper, and it works with the native driver.
 */
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { warm } from "../warm";

type Ring = {
  /** Diameter in px at rest. */
  size: number;
  /** Scale at amplitude 0 and at amplitude 1. */
  scale: [number, number];
  /** Opacity at amplitude 0 and at amplitude 1. */
  opacity: [number, number];
  /** Gradient strength at the centre of this ring. */
  peak: number;
};

// Outer rings travel further and stay fainter, so the halo reads as a soft bloom.
const RINGS: readonly Ring[] = [
  { size: 300, scale: [0.86, 1.22], opacity: [0.1, 0.3], peak: 0.3 },
  { size: 232, scale: [0.9, 1.14], opacity: [0.16, 0.42], peak: 0.42 },
  { size: 176, scale: [0.94, 1.08], opacity: [0.22, 0.55], peak: 0.55 },
];

export function PulseHalo({ amplitude }: { amplitude: Animated.Value }) {
  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {RINGS.map((ring, i) => (
        <Animated.View
          key={ring.size}
          style={[
            styles.ring,
            {
              width: ring.size,
              height: ring.size,
              marginLeft: -ring.size / 2,
              marginTop: -ring.size / 2,
              opacity: amplitude.interpolate({ inputRange: [0, 1], outputRange: ring.opacity }),
              transform: [
                { scale: amplitude.interpolate({ inputRange: [0, 1], outputRange: ring.scale }) },
              ],
            },
          ]}
        >
          <Svg width={ring.size} height={ring.size}>
            <Defs>
              <RadialGradient id={`halo${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={warm.terracotta} stopOpacity={ring.peak} />
                <Stop offset="65%" stopColor={warm.terracotta} stopOpacity={ring.peak * 0.45} />
                <Stop offset="100%" stopColor={warm.terracotta} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={ring.size / 2} cy={ring.size / 2} r={ring.size / 2} fill={`url(#halo${i})`} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  // Centred on the container's midpoint; the negative margins offset each ring by half its size.
  ring: { position: "absolute", left: "50%", top: "50%" },
});
