import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildVaccineReminderPlan, getVaccineReminderBody } from './vaccineReminders';

const VACCINE_CHANNEL_ID = 'vaccine-reminders';
const SMART_CHANNEL_ID = 'smart-reminders';
const INTELLIGENCE_CHANNEL_ID = 'intelligence-alerts';

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
  return iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

async function ensureNotificationPermission(channelId = VACCINE_CHANNEL_ID, channelName = 'Faunvia hatırlatmaları') {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: channelName,
      description: 'Faunvia tarafından planlanan hatırlatmalar',
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

export async function sendIntelligenceAlertNotification(petName: string, title: string, message: string, severity: string) {
  const granted = await ensureNotificationPermission(INTELLIGENCE_CHANNEL_ID, 'Faunvia Intelligence');
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Faunvia Intelligence · ${petName}`,
      body: `${title}: ${message}`,
      sound: 'default',
      data: { screen: 'home', recordType: 'faunvia-intelligence', severity, petName },
    },
    trigger: null,
  });
}

export async function scheduleSmartReminderNotification(remindAt: string) {
  const date = new Date(remindAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  const granted = await ensureNotificationPermission(SMART_CHANNEL_ID, 'Akıllı hatırlatmalar');
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Faunvia hatırlatması 🐾',
      body: 'Dostunuz için planladığınız bir hatırlatma var.',
      sound: 'default',
      data: { screen: 'home', recordType: 'smart-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? SMART_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelSmartReminderNotification(notificationId?: string | null) {
  if (!notificationId) return;
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch { /* already fired/removed */ }
}

export async function scheduleVaccineNotifications({ recordId, petId, petName, vaccineName, nextDueDate, now }: { recordId:string; petId:string; petName:string; vaccineName:string; nextDueDate:string; now?:Date }) {
  const granted = await ensureNotificationPermission();
  if (!granted) return { granted:false, notificationIds:[] as string[], notifications:[] as {offsetDays:number;notificationId:string}[] };
  const plan = buildVaccineReminderPlan(nextDueDate, now);
  const notificationIds:string[]=[]; const notifications:{offsetDays:number;notificationId:string}[]=[];
  try {
    for (const reminder of plan) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: { title: reminder.offsetDays===0?'Bugün aşı günü 💉':'Aşı zamanı yaklaşıyor 💉', body:getVaccineReminderBody(petName,vaccineName,reminder.offsetDays), sound:'default', data:{screen:'health',recordType:'vaccine',recordId,petId,dueDate:nextDueDate,offsetDays:reminder.offsetDays} },
        trigger: { type:Notifications.SchedulableTriggerInputTypes.DATE, date:reminder.triggerDate, channelId:Platform.OS==='android'?VACCINE_CHANNEL_ID:undefined },
      });
      notificationIds.push(notificationId); notifications.push({offsetDays:reminder.offsetDays,notificationId});
    }
  } catch (error) { await cancelVaccineNotifications(notificationIds); throw error; }
  return {granted:true,notificationIds,notifications};
}

export async function cancelVaccineNotifications(notificationIds:string[]) {
  await Promise.all(notificationIds.map(async notificationId=>{try{await Notifications.cancelScheduledNotificationAsync(notificationId);}catch{/* fired/removed */}}));
}
