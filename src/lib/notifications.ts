import * as Notifications from "expo-notifications";

/**
 * Local day-7/25/30 reminders for the deposit loop. Local scheduling works in
 * Expo Go; remote push comes later with a dev build. Web: silently no-op.
 */
export async function scheduleDepositReminders(
  moveInDate: string,
  strings: { day7Title: string; day7Body: string; day25Title: string; day25Body: string },
): Promise<void> {
  if (process.env.EXPO_OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const moveIn = new Date(`${moveInDate}T09:00:00`);
    const schedule = async (daysAfter: number, title: string, body: string) => {
      const fireDate = new Date(moveIn.getTime() + daysAfter * 24 * 60 * 60 * 1000);
      if (fireDate.getTime() <= Date.now()) return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    };

    await schedule(7, strings.day7Title, strings.day7Body);
    await schedule(25, strings.day25Title, strings.day25Body);
  } catch {
    // reminders are best-effort; the in-app checklist is the source of truth
  }
}
