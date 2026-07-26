/**
 * Local, on-device store for the patient's OWN data — the "Yours" kind (spec: three-kinds principle).
 *
 * This is deliberately separate from `data.ts` (which surfaces the clinician's verbatim claims). Here
 * we persist only what the PATIENT generates: the clock times they set for their doses, the mood
 * check-ins they log, and the "I took it" intake records they confirm. None of it is a medical fact
 * the app authored — it is the patient's input, stored so the app can remind them and show it back.
 *
 * NO AI, NO network — just AsyncStorage (available in Expo Go). Reads never throw: a missing or
 * corrupt value falls back to empty rather than crashing the screen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Mood } from "../../components/recovery/icons";

/** A clock time the PATIENT set for a dose slot, "HH:mm" (24h). Never inferred by the app. */
export type ReminderTimes = Record<string, string>;

/** A neutral self-report the patient logged. Stored and shown back, never interpreted (no triage). */
export interface MoodCheckIn {
  id: string;
  mood: Mood;
  /** ISO timestamp of when the patient logged it. */
  notedAt: string;
}

/** A patient's "I took this dose" confirmation — an adherence record, distinct from a dose Confirmation. */
export interface IntakeRecord {
  id: string;
  subject: string;
  /** Which dose slot of the day (0-based), matching the parsed schedule. */
  slot: number;
  /** ISO timestamp of when the patient confirmed taking it. */
  takenAt: string;
}

/** Stable key for one dose slot of one medication (pure). */
export function slotKey(subject: string, slot: number): string {
  return `${subject}#${slot}`;
}

const KEYS = {
  reminderTimes: "medthread.reminderTimes",
  moodCheckIns: "medthread.moodCheckIns",
  intakeLog: "medthread.intakeLog",
} as const;

/** Read + parse a JSON value, falling back (never throwing) on absent/corrupt data. */
async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// --- Reminder times -------------------------------------------------------------------------------

export async function getReminderTimes(): Promise<ReminderTimes> {
  return readJson<ReminderTimes>(KEYS.reminderTimes, {});
}

/** Set the patient's clock time for a dose slot; returns the updated map. */
export async function setReminderTime(
  subject: string,
  slot: number,
  time: string,
): Promise<ReminderTimes> {
  const next = { ...(await getReminderTimes()), [slotKey(subject, slot)]: time };
  await writeJson(KEYS.reminderTimes, next);
  return next;
}

/** Remove a patient-set time for a dose slot; returns the updated map. */
export async function clearReminderTime(subject: string, slot: number): Promise<ReminderTimes> {
  const next = { ...(await getReminderTimes()) };
  delete next[slotKey(subject, slot)];
  await writeJson(KEYS.reminderTimes, next);
  return next;
}

// --- Mood check-ins -------------------------------------------------------------------------------

export async function getMoodCheckIns(): Promise<MoodCheckIn[]> {
  return readJson<MoodCheckIn[]>(KEYS.moodCheckIns, []);
}

/** Log a mood check-in (newest first); returns the updated list. */
export async function addMoodCheckIn(mood: Mood): Promise<MoodCheckIn[]> {
  const entry: MoodCheckIn = { id: `mood-${Date.now()}`, mood, notedAt: new Date().toISOString() };
  const next = [entry, ...(await getMoodCheckIns())];
  await writeJson(KEYS.moodCheckIns, next);
  return next;
}

// --- Intake log -----------------------------------------------------------------------------------

export async function getIntakeLog(): Promise<IntakeRecord[]> {
  return readJson<IntakeRecord[]>(KEYS.intakeLog, []);
}

/** Record that the patient took a dose (newest first); returns the updated log. */
export async function addIntake(subject: string, slot: number): Promise<IntakeRecord[]> {
  const entry: IntakeRecord = {
    id: `intake-${Date.now()}`,
    subject,
    slot,
    takenAt: new Date().toISOString(),
  };
  const next = [entry, ...(await getIntakeLog())];
  await writeJson(KEYS.intakeLog, next);
  return next;
}
