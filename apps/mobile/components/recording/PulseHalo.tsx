/**
 * The pulsating gradient halo behind the capture control.
 *
 * Three concentric ELLIPSES — wider than they are tall — so the halo hugs the horizontal row of
 * controls instead of forcing a tall square of empty space above and below it. Each is a radial
 * terracotta gradient fading to transparent, scaling and fading with the live amplitude. Outer rings
 * travel further than inner ones, so loud speech makes the halo bloom rather than merely resize.
 *
 * Purely decorative: no touches, hidden from screen readers, and it never encodes information. A
 * silent room shows a small calm halo; that is ornament, not a reading of anything clinical.
 *
 * Each ring is an `Animated.View` wrapping a static `<Svg>`, so the animation drives a plain
 * transform rather than animated SVG attributes — cheaper, and it works with the native driver.
 */
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { warm } from "../warm";

type Ring = {
  /** Width and height in px at rest. Wider than tall to match the control row. */
  w: number;
  h: number;
  /** Scale at amplitude 0 and at amplitude 1. */
  scale: [number, number];
  /** Opacity at amplitude 0 and at amplitude 1. */
  opacity: [number, number];
  /** Gradient strength at the centre of this ring. */
  peak: number;
};

const RINGS: readonly Ring[] = [
  { w: 340, h: 196, scale: [0.78, 1.32], opacity: [0.16, 0.5], peak: 0.55 },
  { w: 268, h: 156, scale: [0.84, 1.22], opacity: [0.24, 0.66], peak: 0.7 },
  { w: 202, h: 120, scale: [0.9, 1.13], opacity: [0.32, 0.82], peak: 0.85 },
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
          key={ring.w}
          style={[
            styles.ring,
            {
              width: ring.w,
              height: ring.h,
              marginLeft: -ring.w / 2,
              marginTop: -ring.h / 2,
              opacity: amplitude.interpolate({ inputRange: [0, 1], outputRange: ring.opacity }),
              transform: [
                { scale: amplitude.interpolate({ inputRange: [0, 1], outputRange: ring.scale }) },
              ],
            },
          ]}
        >
          <Svg width={ring.w} height={ring.h}>
            <Defs>
              <RadialGradient id={`halo${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={warm.terracotta} stopOpacity={ring.peak} />
                <Stop offset="55%" stopColor={warm.terracotta} stopOpacity={ring.peak * 0.6} />
                <Stop offset="100%" stopColor={warm.terracotta} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={ring.w / 2}
              cy={ring.h / 2}
              rx={ring.w / 2}
              ry={ring.h / 2}
              fill={`url(#halo${i})`}
            />
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
