import { DEFAULT_VACCINE_REMINDER_OFFSETS_DAYS } from '@/constants/config';
import type { Database } from '@/types/database.types';
import type { VaccineReminder } from '@/types/reminder';

import { supabase } from './client';

type ReminderRow = Database['public']['Tables']['vaccine_reminders']['Row'];

function mapRowToReminder(row: ReminderRow): VaccineReminder {
  return {
    id: row.id,
    vaccineId: row.vaccine_id,
    offsetDays: row.offset_days,
    scheduledDate: row.scheduled_date,
    status: row.status,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function subtractDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function computeReminderDates(
  nextDueDate: string,
): { offsetDays: number; scheduledDate: string }[] {
  return DEFAULT_VACCINE_REMINDER_OFFSETS_DAYS.map((offsetDays) => ({
    offsetDays,
    scheduledDate: subtractDays(nextDueDate, offsetDays),
  }));
}

export async function listRemindersForVaccine(vaccineId: string): Promise<VaccineReminder[]> {
  const { data, error } = await supabase
    .from('vaccine_reminders')
    .select('*')
    .eq('vaccine_id', vaccineId)
    .order('offset_days', { ascending: false });
  if (error) throw error;
  return data.map(mapRowToReminder);
}

/**
 * Keeps a vaccine's reminder rows in sync with its `nextDueDate` /
 * `notificationEnabled` fields. Call this right after creating or updating a
 * vaccine record. This only maintains the database rows (status +
 * scheduled_date); actually scheduling a local/push notification for each
 * row is a separate, not-yet-built notification service that will write
 * back into `notification_id` via `markReminderNotificationId`.
 */
export async function syncVaccineReminders(
  vaccineId: string,
  nextDueDate: string | null,
  notificationEnabled: boolean,
): Promise<void> {
  if (!notificationEnabled || !nextDueDate) {
    const { error } = await supabase.from('vaccine_reminders').delete().eq('vaccine_id', vaccineId);
    if (error) throw error;
    return;
  }

  const reminders = computeReminderDates(nextDueDate);
  const { error } = await supabase.from('vaccine_reminders').upsert(
    reminders.map(({ offsetDays, scheduledDate }) => ({
      vaccine_id: vaccineId,
      offset_days: offsetDays,
      scheduled_date: scheduledDate,
      status: 'pending' as const,
      notification_id: null,
    })),
    { onConflict: 'vaccine_id,offset_days' },
  );
  if (error) throw error;
}

/** Records the id of a local/push notification once a future notification service schedules one. */
export async function markReminderNotificationId(
  reminderId: string,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('vaccine_reminders')
    .update({ notification_id: notificationId })
    .eq('id', reminderId);
  if (error) throw error;
}
