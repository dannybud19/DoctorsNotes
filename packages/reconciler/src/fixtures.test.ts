import { describe, expect, it } from "vitest";
import { AskResponse, PatientContext } from "@medthread/domain";
import { fixtures } from "./fixtures/index";

/**
 * Validates the 0e fixtures against the FROZEN domain schemas. Offline, no network — pure schema
 * parsing. If a fixture drifts from the contract, this fails loudly at CI time.
 */
describe("0e fixtures validate against frozen domain schemas", () => {
  it("each AskResponse variant parses to its kind", () => {
    expect(AskResponse.parse(fixtures.askResponses.answered).kind).toBe("answered");
    expect(AskResponse.parse(fixtures.askResponses.partial).kind).toBe("partial");
    expect(AskResponse.parse(fixtures.askResponses.no_source).kind).toBe("no_source");
  });

  it("inpatient + recovering PatientContext parse", () => {
    const inpatient = PatientContext.parse(fixtures.patientContexts.inpatient);
    expect(inpatient.phase).toBe("inpatient");
    expect(inpatient.encounters.length).toBeGreaterThan(0);

    const recovering = PatientContext.parse(fixtures.patientContexts.recovering);
    expect(recovering.phase).toBe("recovering");
    // Post-discharge due medication must trace to a claim (provenance), never be free-standing.
    expect(recovering.dueMedications[0]?.fromClaimId).toBeTruthy();
    expect(recovering.savedQuestions.length).toBeGreaterThan(0);
  });
});
