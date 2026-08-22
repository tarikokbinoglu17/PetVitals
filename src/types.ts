export type Pet = {
  id: string;
  name: string;
  species: 'Kedi' | 'Köpek' | 'Diğer';
  breed: string;
  birthDate: string;
  weight: number;
  photoPath?: string;
  photoUrl?: string;
};

export type LocalImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

export type PetDraft = {
  name: string;
  species: Pet['species'];
  breed?: string;
  birthDate?: string;
  weight?: number;
  photo?: LocalImage;
};

export type SavePetResult = {
  error?: string;
  message?: string;
};

export type HealthRecordCategory = 'Aşı' | 'Kontrol' | 'İlaç' | 'Tedavi' | 'Alerji' | 'Laboratuvar' | 'Operasyon';

export type HealthRecord = {
  id: string;
  petId: string;
  title: string;
  category: HealthRecordCategory;
  date: string;
  notes?: string;
  vaccineType?: string;
  administeredDate?: string;
  nextDueDate?: string;
  repeatIntervalMonths?: number;
  veterinarian?: string;
  attachmentUrl?: string;
  notificationEnabled?: boolean;
  notificationStatus?: VaccineNotificationStatus;
  notificationIds?: string[];
};

export type WeightEntry = {
  id: string;
  petId: string;
  weight: number;
  measuredAt: string;
  notes?: string;
};

export type PetMemberRole = 'caregiver' | 'veterinarian' | 'viewer';

export type PetShare = {
  id: string;
  petId: string;
  role: PetMemberRole;
  displayName?: string;
  expiresAt?: string;
  canEdit: boolean;
  revokedAt?: string;
};

export type PassportShare = {
  id: string;
  petId: string;
  token: string;
  expiresAt?: string;
  lostMode: boolean;
  includeVaccines: boolean;
  includeAllergies: boolean;
  includeMedications: boolean;
  includeOwnerContact: boolean;
};

export type ProEntitlement = {
  plan: 'free' | 'pro';
  provider?: string;
  productId?: string;
  expiresAt?: string;
};

export type VaccineNotificationStatus =
  | 'disabled'
  | 'pending'
  | 'scheduled'
  | 'denied'
  | 'failed'
  | 'no_future_dates';

export type VaccineDraft = {
  petId: string;
  vaccineName: string;
  vaccineType?: string;
  administeredDate: string;
  nextDueDate: string;
  repeatIntervalMonths?: number;
  veterinarian?: string;
  notes?: string;
  attachmentUrl?: string;
  notificationEnabled: boolean;
};

export type SaveVaccineResult = {
  error?: string;
  message?: string;
};

export type TabName = 'home' | 'pets' | 'health' | 'platform' | 'profile';
