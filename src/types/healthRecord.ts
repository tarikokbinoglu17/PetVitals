export type HealthRecordType = 'vet_visit' | 'treatment' | 'medication' | 'allergy' | 'other';

export interface HealthRecord {
  id: string;
  petId: string;
  type: HealthRecordType;
  title: string;
  description: string | null;
  recordDate: string;
  veterinarian: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateHealthRecordInput = Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateHealthRecordInput = Partial<CreateHealthRecordInput>;
