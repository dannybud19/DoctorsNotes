import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { subjectLabel, type DueMedRow } from "./data";
import { slotKey, type ReminderTimes } from "./patientData";

// Local medication reminders (iOS-first, Time-Sensitive). Times come ONLY from what the patient set —
// a dose slot with no set time schedules nothing. No AI, no network. Guarded on web, where
// expo-notifications is a no-op (keeps the Expo-web preview working).

/** Show a reminder as a banner even in the foreground, so a set time never passes silently. */
export function configureNotifications(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Ask for notification permission once. Returns whether reminders may be shown. */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** "8:00 am" → { hour, minute } in 24-hour time, or null if it can't be parsed. */
export function parseClock(text: string): { hour: number; minute: number } | null {
  const m = text.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const pm = m[3] === "pm";
  if (hour === 12) hour = pm ? 12 : 0;
  else if (pm) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Reschedule ALL reminders from the current data: cancel everything, then for each SCHEDULED medication
 * and each dose slot the patient has given a clock time, schedule a daily, repeating, Time-Sensitive
 * notification that deep-links to the reminder screen. A slot with no patient-set time schedules
 * nothing — the app never invents a reminder time.
 */
export async function syncReminders(meds: readonly DueMedRow[], times: ReminderTimes): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const med of meds) {
    if (med.status !== "scheduled") continue;
    for (let slot = 0; slot < med.slots.length; slot++) {
      const clock = parseClock(times[slotKey(med.subject, slot)] ?? "");
      if (!clock) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for your ${subjectLabel(med.subject)}`,
          body: "Tap to confirm you've taken it.",
          data: { med: med.subject, slot },
          interruptionLevel: "timeSensitive",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: clock.hour,
          minute: clock.minute,
        },
      });
    }
  }
}

/**
 * Register a handler for when the patient taps a reminder — it fires with the dose that was tapped so
 * the app can open the reminder screen for it. Returns an unsubscribe function.
 */
export function onReminderTapped(handler: (med: string, slot: number) => void): () => void {
  if (Platform.OS === "web") return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res.notification.request.content.data as { med?: unknown; slot?: unknown };
    if (typeof data.med === "string" && typeof data.slot === "number") {
      handler(data.med, data.slot);
    }
  });
  return () => sub.remove();
}
