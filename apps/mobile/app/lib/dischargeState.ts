import type { Href } from "expo-router";

/**
 * In-memory "the patient has been discharged" flag — the trigger that forwards the app to the
 * post-discharge recovery dashboard. Deliberately simple, mirroring `liveSession.ts` (single demo
 * flow, no persistence).
 *
 * Set by the Update-medical-files flow when a discharge document is processed (see `upload.tsx`),
 * and exposed as a plain setter so a real discharge signal — or a teammate's screen — can flip it
 * later without touching the read side. The running-picture screen (`session.tsx`) reads
 * `isDischarged()` and redirects to `RECOVERY_ROUTE`.
 */
let discharged = false;

export function setDischarged(value: boolean): void {
  discharged = value;
}
export function isDischarged(): boolean {
  return discharged;
}
export function clearDischarge(): void {
  discharged = false;
}

/**
 * Where a discharged patient lands — the recovery dashboard a teammate is building. Kept as one
 * constant so re-pointing to a different route is a single-line change.
 */
export const RECOVERY_ROUTE = "/recovery" as Href;
