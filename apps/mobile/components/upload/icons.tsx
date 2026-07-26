/**
 * Icons for the Update Medical Files screen.
 *
 * Every icon here is DECORATIVE: it sits beside a word label that carries the meaning, and is hidden
 * from screen readers — so there are no icon-only controls. Same 24x24 stroked style as
 * `components/home/icons.tsx`, so the app reads as one set.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = { size?: number; color: string };

const STROKE = 1.9;

function Icon({ size = 28, color, children }: IconProps & { children: React.ReactNode }) {
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

/**
 * The hero mark: a page with a folded corner and ruled lines, overlapped by a filled upload badge.
 * Drawn filled rather than stroked so it reads at large sizes on the colour panel.
 */
export function DocumentUploadIcon({ size = 132, color }: { size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Page with a folded top-right corner. */}
      <Path d="M12 6h26l14 14v34a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" fill={color} />
      <Path d="M38 6l14 14H42a4 4 0 0 1-4-4V6Z" fill={color} fillOpacity={0.55} />
      {/* Ruled lines. Colour-on-colour, so they read as inset rather than as separate marks. */}
      <Rect x="16" y="24" width="24" height="3" rx="1.5" fill="#00000022" />
      <Rect x="16" y="31" width="24" height="3" rx="1.5" fill="#00000022" />
      <Rect x="16" y="38" width="16" height="3" rx="1.5" fill="#00000022" />
      {/* Upload badge, bottom-right. The ring is the panel colour so it cuts a gap out of the page. */}
      <Circle cx="45" cy="45" r="15" fill={color} />
      <Circle cx="45" cy="45" r="11.5" fill="#00000022" />
      <Path
        d="M45 51.5V39m0 0-5.5 5.5M45 39l5.5 5.5"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Camera body with a lens — "Use camera". */
export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M3 8.8a2 2 0 0 1 2-2h2.7l1.5-2.2h5.6l1.5 2.2H19a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <Circle cx="12" cy="12.8" r="4" />
    </Icon>
  );
}

/** Framed picture with a hill and sun — "Choose from your photos". */
export function GalleryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="3" y="4.5" width="18" height="15" rx="2.6" />
      <Circle cx="8.6" cy="10" r="1.8" />
      <Path d="m4.2 17.4 4.9-4.9 4.2 4.2 2.6-2.6 4.1 4.1" />
    </Icon>
  );
}

/** Left-pointing chevron — the back control on the colour panel. */
export function BackArrowIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M19 12H5m0 0 6.5-6.5M5 12l6.5 6.5" />
    </Svg>
  );
}
