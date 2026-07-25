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

/** Look up a single subject entry by its id. Returns undefined if there is no such entry. */
export function getEntry(id: string): PictureEntry | undefined {
  return runningPicture.find((entry) => entry.id === id);
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

export type { Claim };
