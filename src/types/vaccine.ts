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
  /** Whether reminders should be generated for this vaccine's `nextDueDate`. See VaccineReminder. */
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateVaccineInput = Omit<VaccineRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateVaccineInput = Partial<CreateVaccineInput>;
