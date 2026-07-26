/**
 * Decorative backdrop for the recovery dashboard: scattered dotted rings behind the content, plus
 * the same wandering dotted line the home screen uses, so the two screens read as one family.
 *
 * Purely ornamental — no touches, hidden from screen readers, and it never encodes anything. The
 * positions are FIXED CONSTANTS expressed as fractions of the container, not `Math.random()`: a
 * random layout would reshuffle on every re-render and shimmer behind the text.
 */
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { DottedPath } from "../home/DottedPath";
import { warm } from "../warm";

/** x/y are fractions of the container; r is a fraction of its width. */
type Ring = { x: number; y: number; r: number; opacity: number; dash: [number, number] };

/**
 * Deliberately uneven — different sizes, some cropped by the edges, none concentric. Two are pushed
 * mostly off-screen so the eye reads them as fragments of something larger rather than as circles
 * placed on the page.
 */
const RINGS: readonly Ring[] = [
  { x: 0.86, y: 0.07, r: 0.34, opacity: 0.3, dash: [2, 11] },
  { x: 0.06, y: 0.23, r: 0.22, opacity: 0.22, dash: [2, 13] },
  { x: 0.94, y: 0.46, r: 0.42, opacity: 0.18, dash: [2, 15] },
  { x: 0.12, y: 0.66, r: 0.3, opacity: 0.24, dash: [2, 12] },
  { x: 0.72, y: 0.88, r: 0.26, opacity: 0.26, dash: [2, 10] },
];

const STROKE = 2.5;

export function Backdrop() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Only re-render when the box actually changes size, not on every layout pass.
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View
      style={styles.layer}
      onLayout={onLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {size && size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          {RINGS.map((ring, i) => (
            <Circle
              key={i}
              cx={ring.x * size.width}
              cy={ring.y * size.height}
              r={ring.r * size.width}
              stroke={warm.pathStroke}
              strokeOpacity={ring.opacity}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={ring.dash}
              fill="none"
            />
          ))}
        </Svg>
      ) : null}
      <DottedPath />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject },
});
