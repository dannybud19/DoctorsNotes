/**
 * Warm palette for the REDESIGNED SCREENS (home, recording).
 *
 * These live here rather than in `app/lib/theme.ts` on purpose: that file is imported by 13 files
 * across every screen, so changing it would restyle the whole app. Adopting this palette app-wide is
 * a separate, deliberate decision — until then only the redesigned screens use it, and every other
 * screen keeps the original navy/white theme untouched.
 *
 * Contrast: `terracotta` on `cream` measures ~3.9:1. That clears WCAG AA for large bold text
 * (>= 24px bold) and for decorative marks, but NOT the 4.5:1 needed for body copy. So terracotta is
 * used only for headings, icons and chevrons — never for a sentence. Sentences use `ink`, which is
 * the shared `colors.text` and measures ~15:1 on cream.
 */
import { colors } from "../app/lib/theme";

export const warm = {
  /** Page background — warm off-white. */
  cream: "#f2efe9",
  /** Card / control fill. */
  card: "#ffffff",
  /** Accent: icons, chevrons, the patient's name. Never body text (see contrast note above). */
  terracotta: "#c0562a",
  /** The decorative background path — terracotta at low opacity so it never competes with text. */
  pathStroke: "#c0562a",
  pathOpacity: 0.35,
  /** Hairline border, a shade of the cream rather than a grey. */
  hairline: "#e6e0d6",
  /** Headings and labels. Reuses the shared ink so type colour stays consistent app-wide. */
  ink: colors.text,
  /** Muted secondary text on cream. */
  inkMuted: colors.textMuted,
} as const;

/** Home action button geometry. `minHeight` comfortably exceeds the elder-first MIN_TOUCH of 60. */
export const actionSize = {
  minHeight: 92,
  radius: 999,
  iconSize: 32,
  gap: 18,
} as const;
