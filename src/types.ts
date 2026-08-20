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

export type HealthRecord = {
  id: string;
  petId: string;
  title: string;
  category: 'Aşı' | 'Kontrol' | 'İlaç';
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

export type TabName = 'home' | 'pets' | 'health' | 'profile';
