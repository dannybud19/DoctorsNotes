import { InvariantError } from "@medthread/domain";
import type {
  Claim,
  ClaimCategory,
  ClaimGroup,
  ClaimGroupStatus,
  Confirmation,
} from "@medthread/domain";
import { deriveDoseSlots, type DoseSlot } from "./schedule";

/**
 * Pure, derived VIEW builders over reconciled groups.
 *
 * These types are DERIVED display shapes and belong here in the reconciler, NOT in the domain
 * contract (the domain has no slot for derived text). Everything here is a rearrangement of
 * verbatim `Claim`s + their provenance — no interpretation, no ranking, no advice (AGENTS.md §1.1).
 */

// ---------------------------------------------------------------------------------------------
// buildRunningPicture — "what's happening to me now"
// ---------------------------------------------------------------------------------------------

/** One subject's line in the running picture. Plain, dignified, no interpretation. */
export interface RunningPictureEntry {
  category: ClaimCategory;
  subject: string;
  status: ClaimGroupStatus;
  /**
   * The most recently observed claim in the trail (newest `observedAt`). This is the latest thing
   * that was SAID — it is explicitly NOT "the correct one". The full trail is always present and the
   * status is always shown alongside it; the current value for a reminder comes only from a
   * patient `Confirmation` (D5), never from this field.
   */
  latest: Claim;
  /** The full chronological trail, oldest → newest. Verbatim is preserved for every entry. */
  trail: Claim[];
  /** The patient's confirmation for this subject, if any. */
  confirmation: Confirmation | null;
}

export type RunningPicture = RunningPictureEntry[];

/**
 * Build the running picture from reconciled groups. One entry per subject, in the same
 * deterministic order the reconciler produced (presentational only, never a ranking).
 */
export function buildRunningPicture(groups: ClaimGroup[]): RunningPicture {
  return groups.map((group) => {
    const latest = group.claims[group.claims.length - 1];
    if (!latest) {
      // reconcile() never emits an empty group; guard loudly rather than paper over it.
      throw new InvariantError(
        `buildRunningPicture(): group ${group.category}/${group.subject} has no claims`,
      );
    }
    return {
      category: group.category,
      subject: group.subject,
      status: group.status,
      latest,
      trail: group.claims,
      confirmation: group.confirmation,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// buildQuestions — "questions to ask tomorrow"
// ---------------------------------------------------------------------------------------------

/** The statuses a question can be derived from. `agreed` groups never produce a question. */
export type QuestionStatus = Extract<ClaimGroupStatus, "worth_confirming" | "uncorroborated">;

/**
 * A question the patient can ASK a clinician. Never advice, never a recommendation — it only
 * surfaces that a subject is worth raising, and links back to the exact claims/sources it came from.
 */
export interface Question {
  id: string;
  category: ClaimCategory;
  subject: string;
  status: QuestionStatus;
  /** Phrased as a question to ask out loud. Never an instruction or an assessment. */
  prompt: string;
  /**
   * The claims this question was derived from, oldest → newest. Each carries a resolvable
   * `ClaimSource`, so the UI can link every question straight back to the verbatim source.
   */
  fromClaims: Claim[];
}

export type QuestionList = Question[];

/**
 * Derive questions STRICTLY from `worth_confirming` and `uncorroborated` groups. `agreed` groups
 * produce nothing. Order follows the reconciler's deterministic group order.
 */
export function buildQuestions(groups: ClaimGroup[]): QuestionList {
  const questions: QuestionList = [];
  for (const group of groups) {
    // Only a genuine disagreement (>=2 sources with differing values → `worth_confirming`) becomes a
    // question. A single-source (`uncorroborated`) claim is NOT raised: a lone mention isn't a
    // discrepancy to ask about, and surfacing every one drowned the real conflicts. (Resolves the
    // PROJECT.md §4 open decision on uncorroborated → question volume.)
    if (group.status !== "worth_confirming") {
      continue;
    }
    const status: QuestionStatus = group.status; // narrowed to "worth_confirming"
    const label = humanizeSubject(group.subject);
    const prompt = conflictPrompt(label, group.claims);

    questions.push({
      id: `q-${group.category}-${group.subject}`,
      category: group.category,
      subject: group.subject,
      status,
      prompt,
      fromClaims: group.claims,
    });
  }
  return questions;
}

/** Turn a normalized subject key ("cardiology-clinic") into readable words ("cardiology clinic"). */
function humanizeSubject(subject: string): string {
  return subject.replace(/-/g, " ").trim();
}

// ---------------------------------------------------------------------------------------------
// buildMedicationSchedule — the data-backed basis for reminders
// ---------------------------------------------------------------------------------------------

/** The categories that describe a medication the patient takes. */
const MEDICATION_CATEGORIES: ReadonlyArray<ClaimCategory> = ["medication-dose", "medication-change"];

/**
 * A medication we CAN remind about: it has a patient `Confirmation` (D5 — reminders never fire from
 * inference) and a frequency we could parse from the confirmed value. Carries the confirmed claim's
 * verbatim words (primary card text) and the parsed dose slots. No clock times — the patient sets
 * those; a slot is only labelled when the confirmed value stated a time of day.
 */
export interface MedReminder {
  subject: string;
  /** The confirmed claim this reminder is anchored to (`Confirmation.fromClaimId`). */
  fromClaimId: string;
  /** Verbatim words of the confirmed claim — shown as the primary text, never reworded. */
  verbatimInstruction: string;
  /** The confirmed value the slots were parsed from (e.g. "500mg twice daily"). */
  confirmedValue: string;
  slots: DoseSlot[];
}

/** Why a medication cannot (yet) become a reminder — a knowledge gap to raise, never a guess. */
export type MedicationGapReason = "unconfirmed" | "no_frequency";

/**
 * A medication that is NOT turned into a reminder because the information isn't there — either the
 * patient hasn't confirmed which dose is current (`unconfirmed`), or the confirmed value states no
 * recognisable frequency (`no_frequency`). Surfaced as a question, phrased to ask (never advice),
 * linking back to the verbatim claims.
 */
export interface MedicationGap {
  subject: string;
  category: ClaimCategory;
  reason: MedicationGapReason;
  /** Phrased as a question to ask a clinician. Never an instruction or assessment. */
  prompt: string;
  fromClaims: Claim[];
}

/**
 * Split the medication groups into reminders we can back with data and gaps we must ask about. A
 * medication becomes a reminder ONLY when it has a `Confirmation` AND `deriveDoseSlots` can read a
 * frequency from the confirmed value; everything else is a gap (the knowledge-gap rule). Non-medication
 * groups are ignored. Order follows the reconciler's deterministic group order.
 */
export function buildMedicationSchedule(groups: ClaimGroup[]): {
  reminders: MedReminder[];
  gaps: MedicationGap[];
} {
  const reminders: MedReminder[] = [];
  const gaps: MedicationGap[] = [];

  for (const group of groups) {
    if (!MEDICATION_CATEGORIES.includes(group.category)) continue;
    const label = humanizeSubject(group.subject);

    // D5: without a patient Confirmation we may not fire a reminder — ask which dose is current.
    if (!group.confirmation) {
      gaps.push({
        subject: group.subject,
        category: group.category,
        reason: "unconfirmed",
        prompt: `Which dose of my ${label} is current for me now?`,
        fromClaims: group.claims,
      });
      continue;
    }

    const confirmedValue = group.confirmation.confirmedValue;
    const parsed = deriveDoseSlots(confirmedValue);

    // Confirmed, but the value states no frequency we can schedule — ask how often, don't guess.
    if ("unknown" in parsed) {
      gaps.push({
        subject: group.subject,
        category: group.category,
        reason: "no_frequency",
        prompt: `How often is my ${label} meant to be taken?`,
        fromClaims: group.claims,
      });
      continue;
    }

    const anchor =
      group.claims.find((c) => c.id === group.confirmation!.fromClaimId) ??
      group.claims[group.claims.length - 1];
    if (!anchor) {
      throw new InvariantError(
        `buildMedicationSchedule(): group ${group.category}/${group.subject} has no claims`,
      );
    }

    reminders.push({
      subject: group.subject,
      fromClaimId: group.confirmation.fromClaimId,
      verbatimInstruction: anchor.verbatimText,
      confirmedValue,
      slots: parsed.slots,
    });
  }

  return { reminders, gaps };
}

// A prompt must never read as advice: the safety test forbids these verbs (views.test.ts). When a
// claim's own value contains one (e.g. "avoid strenuous activity"), we phrase around it rather than
// quote it into a question.
const ADVICE = /\byou should\b|\bmake sure\b|\bstop\b|\bstart\b|\btake\b|\bavoid\b|\bdon't\b/i;

/** Distinct claim values, oldest→newest, deduped by canonical form (keeps the original strings). */
function distinctValues(claims: readonly Claim[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of claims) {
    const key = c.value.toLowerCase().replace(/\s+/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c.value);
    }
  }
  return out;
}

/**
 * A genuine, gap-focused question for a `worth_confirming` group — value-aware where it's safe. It
 * surfaces the two versions ("one source says 75mg once daily and another says 150mg once daily"),
 * falling back to a value-free phrasing when a value would read as advice. Never implies who is right
 * — it asks which value is *current* (the domain's time-ordered framing, D5). Ends in "?" and avoids
 * the advice verbs above.
 */
function conflictPrompt(label: string, claims: readonly Claim[]): string {
  const [v1, v2] = distinctValues(claims);
  if (v1 && v2 && !ADVICE.test(v1) && !ADVICE.test(v2)) {
    return `For my ${label}, one source says ${v1} and another says ${v2} — which one is current for me now?`;
  }
  return `I've been told more than one thing about my ${label} — which one is current for me now?`;
}
