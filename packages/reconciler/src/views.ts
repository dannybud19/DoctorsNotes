import { InvariantError } from "@medthread/domain";
import type {
  Claim,
  ClaimCategory,
  ClaimGroup,
  ClaimGroupStatus,
  Confirmation,
} from "@medthread/domain";

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
    if (group.status === "agreed") {
      continue;
    }
    // After the guard, `group.status` narrows to "worth_confirming" | "uncorroborated".
    const status: QuestionStatus = group.status;
    const label = humanizeSubject(group.subject);
    const prompt =
      status === "worth_confirming"
        ? `I've heard more than one thing about ${label}. Can you tell me what the plan is now?`
        : `Only one person has mentioned ${label} so far. Can you go over it with me?`;

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
