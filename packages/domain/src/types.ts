/**
 * The DoctorsNotes domain contract.
 *
 * Each schema below is the single source of truth; the exported TypeScript type is inferred from it,
 * so runtime validation and static types can never drift. `Claim` and `Confirmation` are `.strict()`
 * — an object carrying an extra field (e.g. a stored paraphrase/explanation) fails validation. That
 * is intentional: provenance is a hard invariant (AGENTS.md §1.2) and there is deliberately NO place
 * to store derived text as ground truth.
 */
import { z } from "zod";

/** ISO-8601 timestamp with timezone offset, e.g. "2026-06-09T09:14:00Z". */
export const IsoTimestamp = z.string().datetime({ offset: true });
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

/**
 * What kind of thing a clinician stated. Deliberately descriptive, never a clinical judgement:
 * "diagnosis-mention" means a diagnosis was *mentioned by a clinician*, NOT that the app diagnoses.
 */
export const ClaimCategory = z.enum([
  "medication-dose",
  "medication-change",
  "diagnosis-mention",
  "procedure-test",
  "result-finding",
  "follow-up",
  "instruction",
  "symptom-mention",
]);
export type ClaimCategory = z.infer<typeof ClaimCategory>;
export const CLAIM_CATEGORIES = ClaimCategory.options;

/** Speaker role for audio provenance. Descriptive only — it never ranks authority. */
export const SpeakerRole = z.enum([
  "consultant",
  "registrar",
  "nurse",
  "pharmacist",
  "physio",
  "patient",
  "other",
  "unknown",
]);
export type SpeakerRole = z.infer<typeof SpeakerRole>;

/**
 * How the speaker's role was determined from diarization. FROZEN.
 * A turn with `roleConfidence: "unknown"` MUST NOT mint a Claim (PROJECT.md D13) — attributing
 * words to a clinician who may not have said them breaks provenance. Such turns are held as pending.
 */
export const RoleConfidence = z.enum(["confirmed", "inferred", "unknown"]);
export type RoleConfidence = z.infer<typeof RoleConfidence>;

export const SpeakerRef = z.object({
  role: SpeakerRole,
  /** How `role` was determined. A minted Claim's speaker is never "unknown" (see RoleConfidence). */
  roleConfidence: RoleConfidence,
  /** Free-text label as heard/seen, e.g. "Dr Adeyemi". Never an inferred identity. */
  label: z.string().min(1).optional(),
});
export type SpeakerRef = z.infer<typeof SpeakerRef>;

/** Normalized rectangle on a document page; every coordinate is in [0, 1] relative to the page. */
export const BBox = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});
export type BBox = z.infer<typeof BBox>;

/** Provenance for a claim. Discriminated on `kind`; every claim has exactly one, always resolvable. */
export const ClaimSource = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("audio"),
    recordingId: z.string().min(1),
    /** Milliseconds from the start of the recording. */
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    speaker: SpeakerRef,
  }),
  z.object({
    kind: z.literal("document"),
    documentId: z.string().min(1),
    /** 1-based page number. */
    page: z.number().int().positive(),
    region: BBox,
  }),
]);
export type ClaimSource = z.infer<typeof ClaimSource>;

/**
 * GROUND TRUTH: exactly what a clinician said or wrote, verbatim, with provenance.
 * `.strict()` forbids any extra field — there is no slot for a paraphrase/summary/explanation.
 */
export const Claim = z
  .object({
    id: z.string().min(1),
    patientId: z.string().min(1),
    category: ClaimCategory,
    /** Normalized grouping key, e.g. "metoprolol". Lets the reconciler group without judgement. */
    subject: z.string().min(1),
    /** The exact words. Never paraphrased. */
    verbatimText: z.string().min(1),
    /** The salient value, drawn verbatim from the source, e.g. "25mg twice daily". */
    value: z.string().min(1),
    source: ClaimSource,
    /** When the clinician actually said/wrote it — drives the time-ordered trail. */
    observedAt: IsoTimestamp,
  })
  .strict();
export type Claim = z.infer<typeof Claim>;

/**
 * A patient's explicit confirmation of the current value for a (category, subject).
 * Medication reminders may fire ONLY from a Confirmation — never from inference (AGENTS.md §1, D5).
 */
export const Confirmation = z
  .object({
    id: z.string().min(1),
    patientId: z.string().min(1),
    category: ClaimCategory,
    subject: z.string().min(1),
    /** The value the patient confirmed; must equal the referenced claim's value. */
    confirmedValue: z.string().min(1),
    /** The claim whose value was confirmed — keeps provenance intact. */
    fromClaimId: z.string().min(1),
    confirmedAt: IsoTimestamp,
  })
  .strict();
export type Confirmation = z.infer<typeof Confirmation>;

/** The reconciler's classification of a group. It NEVER ranks or says who is right. */
export const ClaimGroupStatus = z.enum(["agreed", "worth_confirming", "uncorroborated"]);
export type ClaimGroupStatus = z.infer<typeof ClaimGroupStatus>;

/** A time-ordered group of claims about the same (category, subject). */
export const ClaimGroup = z.object({
  category: ClaimCategory,
  subject: z.string().min(1),
  status: ClaimGroupStatus,
  /** Claims about this subject, ordered oldest → newest by `observedAt`. */
  claims: z.array(Claim),
  /** The patient's confirmation for this subject, if any. Drives reminders. */
  confirmation: Confirmation.nullable(),
});
export type ClaimGroup = z.infer<typeof ClaimGroup>;

export const ReconcileInput = z.object({
  claims: z.array(Claim),
  confirmations: z.array(Confirmation),
});
export type ReconcileInput = z.infer<typeof ReconcileInput>;

export type ReconcileOutput = ClaimGroup[];

// ---------------------------------------------------------------------------------------------
// Admission lifecycle + Ask + post-discharge state (FROZEN contract for Wave 1 agents).
// ---------------------------------------------------------------------------------------------

/** Where the patient is in their journey. A discharge letter flips 'inpatient' → 'recovering'. */
export const AdmissionPhase = z.enum(["inpatient", "recovering", "recovered"]);
export type AdmissionPhase = z.infer<typeof AdmissionPhase>;

/**
 * One provenance anchor for a sentence of `answerText`. `speaker` + `observedAt` are DERIVED
 * server-side from the cited claim — never authored by the model — so a citation cannot be fabricated.
 */
export const Citation = z
  .object({
    claimId: z.string().min(1),
    /** Display label of who said it, e.g. "Dr Kelly" (copied from the claim's speaker). */
    speaker: z.string().min(1),
    observedAt: IsoTimestamp,
  })
  .strict();
export type Citation = z.infer<typeof Citation>;

/**
 * The result of asking a question. Retrieval runs over ClaimGroup[] ONLY. Empty/irrelevant `claimIds`
 * can NEVER be 'answered'/'partial' — it is 'no_source' (the product's core safety property, D18).
 *
 * D19: 'answered'/'partial' also carry `answerText` (a plain-language restatement) + `citations`.
 * `answerText` is the D3 derived layer — drawn ONLY from the cited claims, always shown with its
 * verbatim anchor, never stored as a Claim. `.strict()` on every member (esp. `no_source`) guarantees
 * prose can only exist where `citations.length >= 1`; the guard drops it otherwise.
 */
export const AskResponse = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("answered"),
      claimIds: z.array(z.string().min(1)).min(1),
      answerText: z.string().min(1),
      citations: z.array(Citation).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("partial"),
      claimIds: z.array(z.string().min(1)).min(1),
      gap: z.string().min(1),
      answerText: z.string().min(1),
      citations: z.array(Citation).min(1),
    })
    .strict(),
  z.object({ kind: z.literal("no_source"), suggestedQuestion: z.string().min(1) }).strict(),
]);
export type AskResponse = z.infer<typeof AskResponse>;

/**
 * A question the AI proposes for the patient to ASK a clinician — grounded in the claims that motivated
 * it (`fromClaimIds` >= 1). Framed strictly as a question, never advice. Distinct from the reconciler's
 * discrepancy-based `buildQuestions`; this adds knowledge-gap depth (severity, side effects, warning signs).
 */
export const GeneratedQuestion = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    fromClaimIds: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type GeneratedQuestion = z.infer<typeof GeneratedQuestion>;

export const GeneratedQuestions = z.object({ questions: z.array(GeneratedQuestion) }).strict();
export type GeneratedQuestions = z.infer<typeof GeneratedQuestions>;

/** A question the patient saved to raise later. */
export const SavedQuestion = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  subject: z.string().min(1),
  savedAt: IsoTimestamp,
});
export type SavedQuestion = z.infer<typeof SavedQuestion>;

/**
 * A medication due post-discharge. Its instruction is verbatim from a claim the patient CONFIRMED
 * (D5) — a reminder never fires on an inferred/latest value. `fromClaimId` keeps provenance intact.
 */
export const DueMedication = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  /** Verbatim instruction copied from the confirmed claim, e.g. "Metoprolol 25 mg twice daily". */
  verbatimInstruction: z.string().min(1),
  fromClaimId: z.string().min(1),
  nextDueAt: IsoTimestamp,
});
export type DueMedication = z.infer<typeof DueMedication>;

/** One bedside encounter (consultation history). Links to the claims extracted from it. */
export const Encounter = z.object({
  id: z.string().min(1),
  recordingId: z.string().min(1),
  occurredAt: IsoTimestamp,
  durationMs: z.number().int().nonnegative(),
  speaker: SpeakerRef,
  claimIds: z.array(z.string().min(1)),
});
export type Encounter = z.infer<typeof Encounter>;

/** Patient-scoped app state that drives home screens ("what's changed", post-discharge, history). */
export const PatientContext = z.object({
  patientId: z.string().min(1),
  phase: AdmissionPhase,
  /** When the patient last opened the app — "what's changed" shows claims observed since this. */
  lastOpenedAt: IsoTimestamp,
  savedQuestions: z.array(SavedQuestion),
  dueMedications: z.array(DueMedication),
  encounters: z.array(Encounter),
});
export type PatientContext = z.infer<typeof PatientContext>;
