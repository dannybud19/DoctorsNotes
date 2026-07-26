/**
 * Home-screen icons, drawn with react-native-svg.
 *
 * Every icon here is DECORATIVE: it sits beside a word label that carries the meaning, and is hidden
 * from screen readers. That keeps the elder-first rule in `components/ui.tsx` intact — there are no
 * icon-only controls, the icon just gives the label a visual anchor.
 *
 * All icons share a 24x24 coordinate space and a stroked (not filled) style, so they read as one set.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { warm } from "../warm";

type IconProps = { size?: number; color?: string };

const DEFAULT_SIZE = 32;
const STROKE = 1.9;

/** Shared wrapper: fixes the viewBox, hides the icon from assistive tech, applies the stroke style. */
function Icon({ size, color, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size ?? DEFAULT_SIZE}
      height={size ?? DEFAULT_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? warm.terracotta}
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

/** Clipboard with ruled lines — "Consultation history". */
export function ClipboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="4.5" y="4" width="15" height="17" rx="2.5" />
      <Rect x="8.75" y="1.9" width="6.5" height="4.2" rx="1.6" />
      <Path d="M8.6 11h6.8M8.6 14.6h6.8M8.6 18.2h4.2" />
    </Icon>
  );
}

/** Microphone on a stand — "Record a consultation". */
export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="9" y="2" width="6" height="11.5" rx="3" />
      <Path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0" />
      <Path d="M12 17.6V21M9 21h6" />
    </Icon>
  );
}

/** Rounded speech bubble with a tail — "Chat with MedThread". */
export function ChatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M20.5 11.6c0 4.15-3.8 7.5-8.5 7.5a9.7 9.7 0 0 1-2.5-.32L4.8 20.6l1.16-3.34A7.16 7.16 0 0 1 3.5 11.6c0-4.14 3.8-7.5 8.5-7.5s8.5 3.36 8.5 7.5Z" />
    </Icon>
  );
}

/** Open folder — "Update medical files". */
export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M3 8.2V6.4A1.9 1.9 0 0 1 4.9 4.5h4.06c.6 0 1.17.28 1.53.76l1.06 1.4h5.55A1.9 1.9 0 0 1 19 8.56V9" />
      <Path d="M3 8.9h17.1a1 1 0 0 1 .97 1.25l-2.1 8.1a1.6 1.6 0 0 1-1.55 1.2H5.03a1.6 1.6 0 0 1-1.58-1.34L2.02 10.1A1 1 0 0 1 3 8.9Z" />
    </Icon>
  );
}

/** The trailing "go" chevron on each action button. Decorative — the label says where it goes. */
export function ChevronIcon({ size = 22, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? warm.terracotta}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M9 4.5 16.5 12 9 19.5" />
    </Svg>
  );
}
