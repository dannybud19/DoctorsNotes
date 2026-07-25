/**
 * Elder-first design tokens. High contrast, large type, generous spacing.
 *
 * Status colours are DELIBERATELY calm and non-alarming: no red "error", no green "correct". A
 * discrepancy is "worth asking about", never a fault (AGENTS.md §1.1). The meaning is carried by the
 * dignified wording in STATUS_LABEL — colour is only a gentle accent.
 */
import type { ClaimGroupStatus } from "@doctorsnotes/domain";

export const colors = {
  bg: "#ffffff",
  surface: "#f2f4f7",
  border: "#c4cbd6",
  text: "#0d1526",
  textMuted: "#4a5468",
  primary: "#1a3e8c",
  onPrimary: "#ffffff",
  disabled: "#98a2b3",
  verbatimBar: "#1a3e8c",
} as const;

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

/** Minimum interactive size — elder-first, shaky hands (>= 60dp). */
export const MIN_TOUCH = 60;

/** Symmetric hitSlop that expands any control to comfortably exceed the touch minimum. */
export const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export const font = {
  huge: 34,
  title: 28,
  heading: 24,
  body: 20,
  label: 18,
} as const;

/** Dignified, plain-language wording for each reconciler status. Never phrased as an error. */
export const STATUS_LABEL: Record<ClaimGroupStatus, string> = {
  agreed: "Everyone who mentioned this said the same thing",
  worth_confirming: "This seems worth asking about",
  uncorroborated: "Only one person has mentioned this",
};

/** Calm accent per status. Not severity — just a quiet visual cue beside the wording. */
export const STATUS_ACCENT: Record<ClaimGroupStatus, { bg: string; text: string }> = {
  agreed: { bg: "#eef2f6", text: "#344054" },
  worth_confirming: { bg: "#fdf3e7", text: "#8a4b0a" },
  uncorroborated: { bg: "#eef2f6", text: "#344054" },
};

/**
 * Record button tokens. `active` is a deep red (white text ≈ 8:1, AAA) — the universally understood
 * recording colour, unmistakably different from the calm blue idle state. This is a *state*, not an
 * error accent.
 */
export const record = {
  size: 140,
  idle: colors.primary,
  active: "#a01818",
  onRecord: "#ffffff",
  ringIdle: "#c9d6ef",
  ringActive: "#e7b3b0",
} as const;

/** Confirmation states for a due-medication row. Never shaming; "needs confirming" is neutral. */
export const NEEDS_CONFIRMING = { bg: "#fdf3e7", text: "#8a4b0a" } as const;
