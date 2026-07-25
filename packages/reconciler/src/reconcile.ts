import { NotImplementedError } from "@doctorsnotes/domain";
import type { ReconcileInput, ReconcileOutput } from "@doctorsnotes/domain";

/**
 * Pure, deterministic, network-free reconciliation.
 *
 * Contract (to be implemented — see the `it.todo`s in reconcile.test.ts):
 *   - Group claims by (category, subject).
 *   - Order each group's claims oldest → newest by `observedAt`.
 *   - Classify each group:
 *       agreed          — every claim shares the same `value`
 *       worth_confirming — claims disagree on `value`
 *       uncorroborated   — only a single claim exists for the subject
 *   - Attach the patient's Confirmation for the subject, if any.
 *   - NEVER adjudicate: no winner, no severity, no advice (AGENTS.md §1.1).
 *
 * This function is intentionally free of I/O so it runs identically on the server and on-device,
 * and so its tests need no network. It is not yet implemented and therefore throws loudly.
 */
export function reconcile(_input: ReconcileInput): ReconcileOutput {
  throw new NotImplementedError(
    "reconcile(): grouping and classification is a follow-on task (see reconcile.test.ts todos)",
  );
}
