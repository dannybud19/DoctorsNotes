/**
 * Icons for the recovery (post-discharge) dashboard.
 *
 * Every icon here is DECORATIVE: it sits beside a word label that carries the meaning, and is hidden
 * from screen readers — so no icon-only controls are introduced. Same 24x24 stroked style as
 * `components/home/icons.tsx` and `components/upload/icons.tsx`, so the app reads as one set.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = { size?: number; color: string };

const STROKE = 1.9;

function Icon({ size = 26, color, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Svg>
  );
}

/** Bell — "Today's reminders". */
export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M18.4 16.2V10.6a6.4 6.4 0 1 0-12.8 0v5.6L4 18.4h16Z" />
      <Path d="M10 21.2a2.3 2.3 0 0 0 4 0" />
    </Icon>
  );
}

/** Capsule — "More on your meds". */
export function PillIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-40 12 12)" />
      <Path d="M9.1 8.4 15.6 15" />
    </Icon>
  );
}

/** Clock with a counter-clockwise arrow — "Consultation history". */
export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
      <Path d="M3.4 4.2v4.2h4.2" />
      <Path d="M12 7.6V12l3 1.8" />
    </Icon>
  );
}

/** Speech bubble with a question — "Ask again". */
export function AskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M20.4 11.6c0 4-3.75 7.2-8.4 7.2a9.6 9.6 0 0 1-2.5-.32L4.9 20.4l1.14-3.3A7 7 0 0 1 3.6 11.6c0-4 3.75-7.2 8.4-7.2s8.4 3.2 8.4 7.2Z" />
      <Path d="M10.3 9.6a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.3" />
      <Circle cx="12" cy="15.2" r="0.5" fill={props.color} stroke="none" />
    </Icon>
  );
}

/** Right arrow in a filled disc — the "begin a hospital stay" control. */
export function ArrowRightIcon({ size = 26, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M5 12h14m0 0-6.5-6.5M19 12l-6.5 6.5" />
    </Svg>
  );
}

/** Tick — the visual echo beside a "Confirmed" label. Never used alone; the word carries the meaning. */
export function CheckIcon({ size = 22, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="m5 12.5 4.8 4.8L19 7.4" />
    </Svg>
  );
}

/** Downward chevron — the disclosure cue on the "worth asking about" banner. */
export function ChevronDownIcon({ size = 22, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="m5 9 7 7 7-7" />
    </Svg>
  );
}

/**
 * A mood face. Five mouth shapes across the row; the eyes stay constant so only the mouth carries
 * the difference, which is easier to read at a glance than five different faces.
 */
export type Mood = "very-good" | "good" | "okay" | "not-great" | "poor";

const MOUTHS: Record<Mood, string> = {
  "very-good": "M7.6 13.4a4.9 4.9 0 0 0 8.8 0",
  good: "M8.2 14.2a4.4 4.4 0 0 0 7.6 0",
  okay: "M8.4 14.6h7.2",
  "not-great": "M8.2 15.6a4.4 4.4 0 0 1 7.6 0",
  poor: "M7.6 16.4a4.9 4.9 0 0 1 8.8 0",
};

export function MoodFace({ mood, size = 40, color }: { mood: Mood; size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx="12" cy="12" r="9.4" />
      <Circle cx="9" cy="9.8" r="0.9" fill={color} stroke="none" />
      <Circle cx="15" cy="9.8" r="0.9" fill={color} stroke="none" />
      <Path d={MOUTHS[mood]} />
    </Svg>
  );
}
