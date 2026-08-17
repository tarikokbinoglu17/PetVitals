export type VaccineType = 'core' | 'non_core' | 'other';

export interface VaccineRecord {
  id: string;
  petId: string;
  vaccineName: string;
  vaccineType: VaccineType;
  administeredDate: string;
  nextDueDate: string | null;
  /** Reminder cycle length in days, e.g. 365 for an annual booster. Null = one-off. */
  repeatIntervalDays: number | null;
  veterinarian: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  notificationEnabled: boolean;
  /** Scheduled local-notification ids for this record, tracked to avoid duplicate reminders. */
  notificationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreateVaccineInput = Omit<
  VaccineRecord,
  'id' | 'createdAt' | 'updatedAt' | 'notificationIds'
>;
export type UpdateVaccineInput = Partial<CreateVaccineInput>;
