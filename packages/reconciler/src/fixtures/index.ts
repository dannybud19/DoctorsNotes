import metoprolol from "./metoprolol.json";
import admission5day from "./admission-5day.json";
import askResponses from "./ask-responses.json";
import patientContexts from "./patient-contexts.json";

/**
 * Synthetic, offline fixtures (AGENTS.md D10). Exported so consumers — including the mobile app —
 * can drive screens with no backend and no network. This is NOT real patient data.
 *
 * The shapes are plain JSON; validate with `ReconcileInput.parse(...)` from `@doctorsnotes/domain`
 * at the point of use so malformed fixtures fail loudly.
 */
export const fixtures = {
  metoprolol,
  admission5day,
  askResponses,
  patientContexts,
} as const;
