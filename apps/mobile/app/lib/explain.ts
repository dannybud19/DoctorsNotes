/**
 * Canned, plain-language explanations — a PURE local lookup. No AI, no network (AGENTS.md §1.3).
 *
 * These strings explain what a piece of jargon MEANS in general. They are:
 *   - derived, on-demand, and clearly marked as an explanation (not stored as a Claim — the domain
 *     has no slot for derived text, AGENTS.md §1.2);
 *   - NEVER a substitute for the verbatim quote (which is always shown as the primary text);
 *   - NEVER advice, a diagnosis, or a judgement about what the patient should do.
 *
 * A subject with no entry returns `null`; the UI states plainly that no explanation is available
 * yet, rather than inventing one (no silent fallback, AGENTS.md §1.6).
 */
const EXPLANATIONS: Record<string, string> = {
  "heart-attack":
    "A heart attack happens when the blood supply to part of the heart is reduced or blocked. “NSTEMI” is one medical name for a particular type of it. This explains the words only.",
  aspirin:
    "Aspirin is a very common medicine. In small daily doses it is often used to make blood less likely to form clots.",
  metoprolol:
    "Metoprolol is a type of medicine called a beta-blocker. It slows the heart down a little and can help lower blood pressure.",
  furosemide:
    "Furosemide is a “water tablet” (a diuretic). It helps the body get rid of extra fluid by making you pass more urine.",
  "chest-xray":
    "A chest X-ray is a quick, painless picture of the inside of your chest, including your heart and lungs.",
  potassium:
    "Potassium is a mineral in your blood. Doctors keep an eye on the level because it affects how the heart and muscles work. The number is a measurement.",
  "cardiology-clinic":
    "A cardiology clinic is a follow-up appointment with the heart team, usually as an outpatient after you go home.",
  lifting:
    "“Avoiding heavy lifting” means not carrying heavy things for a while, to give your body time to recover. This explains the phrase only.",
};

/** Return a plain-language explanation for a subject, or null if none is available yet. */
export function explainSubject(subject: string): string | null {
  return EXPLANATIONS[subject] ?? null;
}
