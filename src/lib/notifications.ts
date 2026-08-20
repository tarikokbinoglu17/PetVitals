import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildVaccineReminderPlan, getVaccineReminderBody } from './vaccineReminders';

const VACCINE_CHANNEL_ID = 'vaccine-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function hasNotificationPermission(status: Notifications.NotificationPermissionsStatus) {
  if (status.granted) return true;
  if (Platform.OS !== 'ios') return false;

  const iosStatus = status.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(VACCINE_CHANNEL_ID, {
      name: 'Aşı hatırlatmaları',
      description: 'Yaklaşan aşılar için PetVitals hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (hasNotificationPermission(current)) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return hasNotificationPermission(requested);
}

export async function scheduleVaccineNotifications({
  recordId,
  petId,
  petName,
  vaccineName,
  nextDueDate,
  now,
}: {
  recordId: string;
  petId: string;
  petName: string;
  vaccineName: string;
  nextDueDate: string;
  now?: Date;
}) {
  const granted = await ensureNotificationPermission();
  if (!granted) return { granted: false, notificationIds: [] as string[] };

  const plan = buildVaccineReminderPlan(nextDueDate, now);
  const notificationIds: string[] = [];

  try {
    for (const reminder of plan) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.offsetDays === 0 ? 'Bugün aşı günü 💉' : 'Aşı zamanı yaklaşıyor 💉',
          body: getVaccineReminderBody(petName, vaccineName, reminder.offsetDays),
          sound: 'default',
          data: {
            screen: 'health',
            recordType: 'vaccine',
            recordId,
            petId,
            dueDate: nextDueDate,
            offsetDays: reminder.offsetDays,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.triggerDate,
          channelId: Platform.OS === 'android' ? VACCINE_CHANNEL_ID : undefined,
        },
      });
      notificationIds.push(notificationId);
    }
  } catch (error) {
    await cancelVaccineNotifications(notificationIds);
    throw error;
  }

  return { granted: true, notificationIds };
}

export async function cancelVaccineNotifications(notificationIds: string[]) {
  await Promise.all(
    notificationIds.map(async notificationId => {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // The notification may already have fired or been removed by the operating system.
      }
    }),
  );
}
