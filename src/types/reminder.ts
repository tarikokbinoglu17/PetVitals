export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface VaccineReminder {
  id: string;
  vaccineId: string;
  offsetDays: number;
  scheduledDate: string;
  status: ReminderStatus;
  /** Set once a local/push notification service actually schedules this reminder. */
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}
