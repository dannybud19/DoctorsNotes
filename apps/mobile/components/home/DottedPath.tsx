/**
 * The decorative dotted line that weaves behind the home screen.
 *
 * Purely ornamental: it sits behind the content, never receives touches, and is hidden from screen
 * readers. It carries no meaning and must never be used to imply status, progress or urgency.
 *
 * Two deliberate properties:
 *
 *  - FLAT. Each segment travels ~1.3 screen-widths horizontally while dropping only 0.16–0.26 of the
 *    screen height, so the line sweeps sideways instead of plunging down the page.
 *  - IRREGULAR. The control points below are hand-tuned with uneven drops and asymmetric bowing, so
 *    the curve reads as a wandering line rather than a repeating wave. They are FIXED CONSTANTS, not
 *    `Math.random()` — a random path would reshuffle itself on every re-render and flicker.
 *
 * The path is defined in fractions of the measured container and converted to pixels, while the
 * stroke and dash gap stay in pixels. That is what keeps the dots perfectly round on any screen size
 * (a stretched viewBox with `preserveAspectRatio="none"` would squash them into ovals).
 */
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { warm } from "../warm";

/** A cubic segment: two control points and an end point, all as {x, y} fractions of the container. */
type Segment = { c1: [number, number]; c2: [number, number]; to: [number, number] };

/** Where the line begins — off the left edge, so it reads as passing through rather than starting. */
const START: [number, number] = [-0.18, 0.1];

/**
 * The meander. Tuning notes for iteration:
 *   - FLATTER  → shrink the `to[1]` gaps between segments, or widen the `to[0]` overshoot past 0/1.
 *   - STEEPER  → increase the vertical gaps.
 *   - WILDER   → push c1/c2 y-values further outside the range spanned by their segment's endpoints.
 */
const SEGMENTS: readonly Segment[] = [
  { c1: [0.1, -0.06], c2: [0.62, 0.4], to: [1.12, 0.26] },
  { c1: [0.72, 0.14], c2: [0.16, 0.66], to: [-0.14, 0.52] },
  { c1: [0.28, 0.38], c2: [0.74, 0.86], to: [1.16, 0.7] },
  { c1: [0.66, 0.6], c2: [0.22, 1.08], to: [-0.1, 0.96] },
];

/** Dot diameter in px. */
const DOT = 3.5;
/** Gap between dot centres in px. A larger gap reads calmer and more sparse. */
const GAP = 13;

function buildPath(width: number, height: number): string {
  const px = (point: [number, number]) => `${(point[0] * width).toFixed(2)},${(point[1] * height).toFixed(2)}`;
  const head = `M ${px(START)}`;
  const rest = SEGMENTS.map((seg) => `C ${px(seg.c1)} ${px(seg.c2)} ${px(seg.to)}`).join(" ");
  return `${head} ${rest}`;
}

export function DottedPath() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Only re-render when the box actually changes size, not on every layout pass.
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.layer} onLayout={onLayout} pointerEvents="none" accessibilityElementsHidden>
      {size && size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Path
            d={buildPath(size.width, size.height)}
            stroke={warm.pathStroke}
            strokeOpacity={warm.pathOpacity}
            strokeWidth={DOT}
            strokeLinecap="round"
            // A near-zero dash with a round cap renders as a dot; GAP sets the rhythm.
            strokeDasharray={[0.1, GAP]}
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject },
});
