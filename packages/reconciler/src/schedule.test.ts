import { describe, expect, it } from "vitest";
import { deriveDoseSlots } from "./schedule";

/**
 * Contract-derived tests for deriveDoseSlots (schedule.ts).
 *
 * Invariant (spec: three-kinds principle + knowledge-gap rule): frequency is PARSED from the
 * clinician's verbatim value, never generated. A dose slot carries a time-of-day `label` ONLY when
 * the value states one; "once daily" yields one UNLABELLED slot (the app must not invent "morning").
 * A value with no recognisable frequency is a knowledge gap → `{ unknown: true }` (becomes a
 * question, never a fabricated reminder). Pure + offline.
 */
describe("deriveDoseSlots", () => {
  it("'once daily' → one unlabelled slot (never invents a time of day)", () => {
    expect(deriveDoseSlots("75mg once daily")).toEqual({ slots: [{}] });
  });

  it("'twice daily' → two unlabelled slots", () => {
    expect(deriveDoseSlots("500mg twice daily")).toEqual({ slots: [{}, {}] });
  });

  it("labels a slot only when the value states the time of day", () => {
    expect(deriveDoseSlots("twice a day, morning and evening")).toEqual({
      slots: [{ label: "morning" }, { label: "evening" }],
    });
  });

  it("'three times a day' → three unlabelled slots", () => {
    expect(deriveDoseSlots("three times a day")).toEqual({ slots: [{}, {}, {}] });
  });

  it("a lone stated time of day → one labelled slot", () => {
    expect(deriveDoseSlots("at night")).toEqual({ slots: [{ label: "night" }] });
  });

  it("'as needed' has no fixed schedule → unknown (knowledge gap)", () => {
    expect(deriveDoseSlots("as needed")).toEqual({ unknown: true });
  });

  it("a dose with no stated frequency → unknown (knowledge gap)", () => {
    expect(deriveDoseSlots("500mg")).toEqual({ unknown: true });
  });
});
