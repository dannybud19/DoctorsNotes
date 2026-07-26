/**
 * Warm palette for the HOME SCREEN ONLY.
 *
 * These live here rather than in `app/lib/theme.ts` on purpose: that file is imported by 13 files
 * across every screen, so changing it would restyle the whole app. Adopting this palette app-wide is
 * a separate, deliberate decision — until then the home is the only screen that uses it.
 *
 * Contrast: `terracotta` on `cream` measures ~3.9:1. That clears WCAG AA for large bold text
 * (>= 24px bold) and for decorative marks, but NOT the 4.5:1 needed for body copy. So terracotta is
 * used only for the name in the greeting, the icons, and the chevrons — never for a sentence.
 * Sentences use `ink`, which is the shared `colors.text` and measures ~15:1 on cream.
 */
import { colors } from "../../app/lib/theme";

export const home = {
  /** Page background — warm off-white. */
  cream: "#f2efe9",
  /** Action button fill. */
  card: "#ffffff",
  /** Accent: icons, chevrons, the patient's name. Never body text (see contrast note above). */
  terracotta: "#c0562a",
  /** The decorative background path — terracotta at low opacity so it never competes with text. */
  pathStroke: "#c0562a",
  pathOpacity: 0.35,
  /** Hairline card border, a shade of the cream rather than a grey. */
  hairline: "#e6e0d6",
  /** Headings and labels. Reuses the shared ink so type colour stays consistent app-wide. */
  ink: colors.text,
} as const;

/** Action button geometry. `minHeight` comfortably exceeds the elder-first MIN_TOUCH of 60. */
export const actionSize = {
  minHeight: 92,
  radius: 999,
  iconSize: 32,
  gap: 18,
} as const;
