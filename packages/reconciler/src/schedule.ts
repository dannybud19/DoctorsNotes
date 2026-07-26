/**
 * Pure frequency parsing for medication reminders.
 *
 * Reminders must be DATA-BACKED: the number of daily doses (and any time-of-day) is PARSED out of the
 * clinician's verbatim value (e.g. `Confirmation.confirmedValue` "500mg twice daily"), never invented.
 * A dose slot carries a `label` ONLY when the value states a time of day — "once daily" yields one
 * UNLABELLED slot; the app must not turn that into "morning". A value with no recognisable frequency
 * (or an "as needed" instruction with no fixed schedule) returns `{ unknown: true }` — the caller
 * turns that into a QUESTION, never a fabricated reminder (spec: knowledge-gap rule). No clock times
 * are produced here; the patient supplies those.
 *
 * Offline, deterministic, no AI — belongs in the reconciler alongside the other view builders.
 */

/** One dose in a day. `label` is present only when the verbatim value stated a time of day. */
export interface DoseSlot {
  label?: string;
}

/** Either a known set of dose slots, or an explicit "we can't tell" (a knowledge gap). */
export type DoseSlots = { slots: DoseSlot[] } | { unknown: true };

/** Canonical times of day, in day order, with the synonyms that map onto each. */
const TIMES_OF_DAY: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "morning", re: /\bmornings?\b/ },
  { label: "midday", re: /\b(midday|noon|lunchtime|lunch)\b/ },
  { label: "afternoon", re: /\bafternoons?\b/ },
  { label: "evening", re: /\bevenings?\b/ },
  { label: "night", re: /\b(night|nights|bedtime|before bed|at bedtime)\b/ },
];

const NAME_TO_NUM: Record<string, number> = {
  once: 1,
  one: 1,
  twice: 2,
  two: 2,
  thrice: 3,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const AS_NEEDED = /\b(as needed|as required|when required|when needed|prn)\b/;

/**
 * Parse a verbatim medication value into daily dose slots, or `{ unknown: true }` when no schedule can
 * be read from it. See the module doc for the invariant this upholds.
 */
export function deriveDoseSlots(value: string): DoseSlots {
  const v = value.toLowerCase();

  // "as needed" / PRN is not a fixed daily schedule → not a reminder.
  if (AS_NEEDED.test(v)) return { unknown: true };

  // Times of day the clinician actually stated, in canonical day order.
  const labels = TIMES_OF_DAY.filter((t) => t.re.test(v)).map((t) => t.label);

  const count = parseCount(v);

  if (count !== null) {
    // Stated times line up with the stated count → label every slot. Otherwise keep them unlabelled
    // (never invent a time of day the clinician didn't say).
    if (labels.length === count) return { slots: labels.map((label) => ({ label })) };
    return { slots: Array.from({ length: count }, () => ({})) };
  }

  // No explicit count, but stated time(s) of day → one labelled slot per stated time.
  if (labels.length > 0) return { slots: labels.map((label) => ({ label })) };

  return { unknown: true };
}

/** Number of daily doses stated in the value, or null when none is recognisable. */
function parseCount(v: string): number | null {
  const digitTimes = v.match(/\b(\d+)\s*times?\b/);
  if (digitTimes) return Number(digitTimes[1]);

  const nameTimes = v.match(/\b(one|two|three|four|five|six)\s*times?\b/);
  if (nameTimes) return NAME_TO_NUM[nameTimes[1]!]!;

  // "once/twice/… a day|daily|per day|each day".
  if (/\b(a day|daily|per day|each day)\b/.test(v)) {
    for (const word of ["once", "twice", "thrice", "one", "two", "three", "four", "five", "six"]) {
      if (new RegExp(`\\b${word}\\b`).test(v)) return NAME_TO_NUM[word]!;
    }
  }
  return null;
}
