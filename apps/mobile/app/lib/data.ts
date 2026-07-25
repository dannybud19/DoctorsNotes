/**
 * Local, fully-offline data adapter.
 *
 * Imports the SYNTHETIC fixture JSON, validates it against the domain contract (fails loudly on
 * malformed data), runs the pure reconciler + view builders, and hands plain POJOs to the screens.
 * There is NO network and NO AI here — reconcile() and the view builders are pure functions
 * (AGENTS.md §1.3, §1.4). Everything below runs once, at module load.
 */
import { ReconcileInput } from "@doctorsnotes/domain";
import type { Claim, ClaimSource } from "@doctorsnotes/domain";
import {
  buildQuestions,
  buildRunningPicture,
  fixtures,
  reconcile,
  type Question,
  type RunningPictureEntry,
} from "@doctorsnotes/reconciler";
import sessionTranscriptRaw from "./fixtures/session-transcript.json";
import recoveryRaw from "./fixtures/recovery.json";
import { getLiveClaims } from "./liveSession";

// Validate up front. A malformed fixture throws here rather than surfacing a half-built screen.
const input = ReconcileInput.parse(fixtures.admission5day);
const groups = reconcile(input);

/** Stable, URL-safe id for a subject entry — used for navigation and lookups. */
export function entryId(category: string, subject: string): string {
  return `${category}__${subject}`;
}

/** Turn a normalized subject key ("cardiology-clinic") into readable words ("cardiology clinic"). */
export function subjectLabel(subject: string): string {
  return subject.replace(/-/g, " ");
}

/** A running-picture entry plus a stable id the router can address. */
export type PictureEntry = RunningPictureEntry & { id: string };

export const runningPicture: PictureEntry[] = buildRunningPicture(groups).map((entry) => ({
  ...entry,
  id: entryId(entry.category, entry.subject),
}));

export const questions: Question[] = buildQuestions(groups);

/**
 * Look up a subject entry by id. If a live session is active, resolve against its computed picture
 * so drill-downs work for live claims too; otherwise use the fixture picture.
 */
export function getEntry(id: string): PictureEntry | undefined {
  const live = getLiveClaims();
  const source = live ? buildSession(live).picture : runningPicture;
  return source.find((entry) => entry.id === id);
}

// ---------------------------------------------------------------------------------------------
// Presentation helpers (pure formatting of verbatim provenance — never interpretation).
// ---------------------------------------------------------------------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ROLE_LABEL: Record<string, string> = {
  consultant: "Consultant",
  registrar: "Registrar",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  physio: "Physiotherapist",
  patient: "You",
  other: "Someone at the bedside",
  unknown: "Someone at the bedside",
};

/** e.g. "8 Jun 2026". Uses UTC so the same fixture reads identically everywhere. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = MONTHS[d.getUTCMonth()] ?? "";
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** One-line provenance summary. Audio → who + timestamp; document → "Photograph · page N". */
export function sourceSummary(source: ClaimSource): string {
  if (source.kind === "audio") {
    const who = source.speaker.label ?? ROLE_LABEL[source.speaker.role] ?? "Someone at the bedside";
    return `Recording · ${who} · at ${formatClock(source.startMs)}`;
  }
  return `Photograph · page ${source.page}`;
}

/** Short "kind" label for a source, for a badge. */
export function sourceKindLabel(source: ClaimSource): string {
  return source.kind === "audio" ? "Heard" : "On paper";
}

/** "8 Jun 2026, 09:12" (UTC) for encounter/consultation timestamps. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const month = MONTHS[d.getUTCMonth()] ?? "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${hh}:${mm}`;
}

/** Readable speaker for a claim/turn ("Dr Adeyemi" or the role label). */
export function speakerLabel(speaker: { role: string; label?: string }): string {
  return speaker.label ?? ROLE_LABEL[speaker.role] ?? "Someone at the bedside";
}

/** Today's date for the Home header. */
export const todayLabel: string = formatDate(new Date().toISOString());

// ---------------------------------------------------------------------------------------------
// Claim lookup + session / recovery / consultation-history selectors (all fixture-driven).
// ---------------------------------------------------------------------------------------------

const claimsById: Record<string, Claim> = Object.fromEntries(input.claims.map((c) => [c.id, c]));

/** Look up a claim by id. Returns undefined if unknown. */
export function getClaim(id: string): Claim | undefined {
  return claimsById[id];
}

/** A streamed transcript turn (for the Recording screen simulation). */
export type TranscriptTurn = {
  atMs: number;
  speaker: { role: string; roleConfidence: string; label?: string };
  verbatimText: string;
};

/** Turns for the simulated recording session, in arrival order. */
export const sessionTranscript: TranscriptTurn[] = sessionTranscriptRaw.turns;

/** Claims produced by this session ("What changed"), newest first. */
export const sessionClaims: Claim[] = sessionTranscriptRaw.claimIds
  .map((id) => claimsById[id])
  .filter((c): c is Claim => Boolean(c))
  .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));

/** Consultation history: encounters (who, when, how long) with their claim ids. */
export const encounters = fixtures.patientContexts.inpatient.encounters;

/** One consultation encounter by id, or undefined. */
export function getEncounter(id: string) {
  return encounters.find((e) => e.id === id);
}

/** The three AskResponse fixture variants (answered | partial | no_source). */
export const askResponses = fixtures.askResponses;

export const patientName: string = recoveryRaw.patientName;
export const patientAge: number = recoveryRaw.patientAge;
export const encouragement: string = recoveryRaw.encouragement;

/**
 * A "What to take today" row. `confirmed` is DERIVED from the reconciled Confirmation — never
 * assumed. An unconfirmed row must render as "needs confirming", never as a scheduled dose (D5).
 */
export type DueMedRow = {
  id: string;
  subject: string;
  claim: Claim;
  confirmed: boolean;
  time: string;
};

export const dueMedications: DueMedRow[] = recoveryRaw.dueMedications.map((dm) => {
  const claim = claimsById[dm.fromClaimId];
  if (!claim) {
    // Fail loudly — a due-med row must always trace to a real claim (provenance).
    throw new Error(`recovery.json: dueMedication "${dm.id}" references unknown claim "${dm.fromClaimId}"`);
  }
  const entry = runningPicture.find((g) => g.subject === dm.subject);
  return { id: dm.id, subject: dm.subject, claim, confirmed: Boolean(entry?.confirmation), time: dm.time };
});

/**
 * Compute the three Session sections from an arbitrary claim set (live response OR fixture), using
 * the same pure reconciler. Fails loudly if the claims aren't valid domain data.
 */
export function buildSession(claimsIn: Claim[]): {
  whatChanged: Claim[];
  picture: PictureEntry[];
  qs: Question[];
} {
  const validated = ReconcileInput.parse({ claims: claimsIn, confirmations: [] });
  const groups = reconcile(validated);
  const picture: PictureEntry[] = buildRunningPicture(groups).map((entry) => ({
    ...entry,
    id: entryId(entry.category, entry.subject),
  }));
  const qs = buildQuestions(groups);
  const whatChanged = [...validated.claims].sort(
    (a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt),
  );
  return { whatChanged, picture, qs };
}

export type { Claim, Question };
