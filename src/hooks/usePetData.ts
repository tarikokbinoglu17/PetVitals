import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { demoPets, demoRecords } from '../data/demo';
import { cancelVaccineNotifications, scheduleVaccineNotifications } from '../lib/notifications';
import { validatePetDraft } from '../lib/pets';
import { supabase } from '../lib/supabase';
import { getPetPhotoUrl, removePetPhoto, uploadPetPhoto } from '../lib/storage';
import { validateVaccineDraft } from '../lib/vaccineReminders';
import type {
  HealthRecord,
  Pet,
  PetDraft,
  SavePetResult,
  SaveVaccineResult,
  VaccineDraft,
  VaccineNotificationStatus,
} from '../types';

const DEMO_VACCINES_KEY = '@petvitals/demo-vaccines/v1';
const DEMO_PETS_KEY = '@petvitals/demo-pets/v1';
const VACCINE_SELECT = 'id,pet_id,vaccine_name,vaccine_type,administered_date,next_due_date,repeat_interval_months,veterinarian,notes,document_url,notifications_enabled,reminder_30_days_id,reminder_7_days_id,reminder_1_day_id,reminder_same_day_id,created_at';

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | string | null;
  photo_url: string | null;
};

type VaccineRow = {
  id: string;
  pet_id: string;
  vaccine_name: string;
  vaccine_type: string | null;
  administered_date: string | null;
  next_due_date: string | null;
  repeat_interval_months: number | null;
  veterinarian: string | null;
  notes: string | null;
  document_url: string | null;
  notifications_enabled: boolean;
  reminder_30_days_id: string | null;
  reminder_7_days_id: string | null;
  reminder_1_day_id: string | null;
  reminder_same_day_id: string | null;
  created_at: string;
};

const petSpecies: Pet['species'][] = ['Kedi', 'Köpek', 'Diğer'];

function mapPet(row: PetRow, photoUrl?: string): Pet {
  const species = petSpecies.includes(row.species as Pet['species'])
    ? (row.species as Pet['species'])
    : 'Diğer';

  return {
    id: row.id,
    name: row.name,
    species,
    breed: row.breed ?? '',
    birthDate: row.birth_date ?? '',
    weight: Number(row.weight ?? 0),
    photoPath: row.photo_url ?? undefined,
    photoUrl,
  };
}

function mapVaccine(row: VaccineRow): HealthRecord {
  const notificationIds = [
    row.reminder_30_days_id,
    row.reminder_7_days_id,
    row.reminder_1_day_id,
    row.reminder_same_day_id,
  ].filter((value): value is string => Boolean(value));

  return {
    id: row.id,
    petId: row.pet_id,
    title: row.vaccine_name,
    category: 'Aşı',
    date: row.next_due_date ?? row.administered_date ?? row.created_at.slice(0, 10),
    notes: row.notes ?? undefined,
    vaccineType: row.vaccine_type ?? undefined,
    administeredDate: row.administered_date ?? undefined,
    nextDueDate: row.next_due_date ?? undefined,
    repeatIntervalMonths: row.repeat_interval_months ?? undefined,
    veterinarian: row.veterinarian ?? undefined,
    attachmentUrl: row.document_url ?? undefined,
    notificationEnabled: row.notifications_enabled,
    notificationStatus: row.notifications_enabled
      ? (notificationIds.length > 0 ? 'scheduled' : 'no_future_dates')
      : 'disabled',
    notificationIds,
  };
}

function sortRecords(records: HealthRecord[]) {
  return [...records].sort((left, right) => left.date.localeCompare(right.date));
}

function createDemoRecordId() {
  return `demo-vaccine-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDemoPetId() {
  return `demo-pet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getNotificationMessage(status: VaccineNotificationStatus, count: number) {
  if (status === 'scheduled') return `Aşı kaydedildi ve ${count} hatırlatma planlandı.`;
  if (status === 'denied') return 'Aşı kaydedildi; bildirim izni verilmedi.';
  if (status === 'failed') return 'Aşı kaydedildi; bildirimler planlanamadı.';
  if (status === 'no_future_dates') {
    return 'Aşı kaydedildi; gelecekte bir hatırlatma zamanı kalmadığı için bildirim oluşturulmadı.';
  }
  return 'Aşı kaydı başarıyla eklendi.';
}

function getReminderNotificationColumns(
  notifications: { offsetDays: number; notificationId: string }[],
) {
  const getId = (offsetDays: number) =>
    notifications.find(notification => notification.offsetDays === offsetDays)?.notificationId ?? null;

  return {
    reminder_30_days_id: getId(30),
    reminder_7_days_id: getId(7),
    reminder_1_day_id: getId(1),
    reminder_same_day_id: getId(0),
  };
}

async function scheduleForRecord(recordId: string, pet: Pet, draft: VaccineDraft) {
  if (!draft.notificationEnabled) {
    return {
      notificationIds: [] as string[],
      notificationStatus: 'disabled' as const,
      notifications: [] as { offsetDays: number; notificationId: string }[],
    };
  }

  try {
    const result = await scheduleVaccineNotifications({
      recordId,
      petId: pet.id,
      petName: pet.name,
      vaccineName: draft.vaccineName.trim(),
      nextDueDate: draft.nextDueDate,
    });

    if (!result.granted) {
      return {
        notificationIds: [],
        notificationStatus: 'denied' as const,
        notifications: [] as { offsetDays: number; notificationId: string }[],
      };
    }

    return {
      notificationIds: result.notificationIds,
      notificationStatus: result.notificationIds.length > 0 ? ('scheduled' as const) : ('no_future_dates' as const),
      notifications: result.notifications,
    };
  } catch {
    return {
      notificationIds: [],
      notificationStatus: 'failed' as const,
      notifications: [] as { offsetDays: number; notificationId: string }[],
    };
  }
}

export function usePetData({ demoMode, userId }: { demoMode: boolean; userId?: string }) {
  const [pets, setPets] = useState<Pet[]>(demoMode ? demoPets : []);
  const [records, setRecords] = useState<HealthRecord[]>(demoMode ? demoRecords : []);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState<string | null>(null);
  const [savingPet, setSavingPet] = useState(false);
  const [savingVaccine, setSavingVaccine] = useState(false);

  useEffect(() => {
    let active = true;

    if (demoMode) {
      setLoading(true);
      Promise.all([AsyncStorage.getItem(DEMO_PETS_KEY), AsyncStorage.getItem(DEMO_VACCINES_KEY)])
        .then(([petsValue, vaccinesValue]) => {
          if (!active) return;
          const storedPets = petsValue ? JSON.parse(petsValue) : [];
          const storedVaccines = vaccinesValue ? JSON.parse(vaccinesValue) : [];
          const customPets = Array.isArray(storedPets) ? (storedPets as Pet[]) : [];
          const customRecords = Array.isArray(storedVaccines) ? (storedVaccines as HealthRecord[]) : [];
          setPets([...demoPets, ...customPets]);
          setRecords(sortRecords([...demoRecords, ...customRecords]));
          setError(null);
        })
        .catch(() => {
          if (!active) return;
          setPets(demoPets);
          setRecords(demoRecords);
          // Demo verisi okunamazsa uygulamayı kilitlemek yerine yerleşik kayıtlarla devam et.
          setError(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }

    const client = supabase;
    if (!client || !userId) {
      setPets([]);
      setRecords([]);
      setError('Kullanıcı verileri yüklenemedi. Lütfen yeniden giriş yapın.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const [petsResult, recordsResult] = await Promise.all([
        client
          .from('pets')
          .select('id,name,species,breed,birth_date,weight,photo_url')
          .eq('owner_id', userId)
          .order('created_at', { ascending: true }),
        client
          .from('vaccines')
          .select(VACCINE_SELECT)
          .eq('owner_id', userId)
          .order('next_due_date', { ascending: true, nullsFirst: false }),
      ]);

      if (!active) return;

      const queryError = petsResult.error ?? recordsResult.error;
      if (queryError) {
        setPets([]);
        setRecords([]);
        setError('Sağlık bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } else {
        const petRows = (petsResult.data ?? []) as PetRow[];
        const mappedPets = await Promise.all(
          petRows.map(async row => mapPet(row, await getPetPhotoUrl(client, row.photo_url))),
        );
        if (!active) return;
        setPets(mappedPets);
        setRecords(((recordsResult.data ?? []) as VaccineRow[]).map(mapVaccine));
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [demoMode, userId]);

  const addPet = async (draft: PetDraft): Promise<SavePetResult> => {
    const validationError = validatePetDraft(draft);
    if (validationError) return { error: validationError };

    setSavingPet(true);
    try {
      if (demoMode) {
        const pet: Pet = {
          id: createDemoPetId(),
          name: draft.name.trim(),
          species: draft.species,
          breed: draft.breed?.trim() || '',
          birthDate: draft.birthDate || '',
          weight: draft.weight ?? 0,
          photoUrl: draft.photo?.uri,
        };
        const customPets = [...pets.filter(item => item.id.startsWith('demo-pet-')), pet];
        try {
          await AsyncStorage.setItem(DEMO_PETS_KEY, JSON.stringify(customPets));
        } catch {
          return { error: 'Dost profili bu cihazda saklanamadı. Lütfen tekrar deneyin.' };
        }
        setPets([...demoPets, ...customPets]);
        return { message: `${pet.name} başarıyla eklendi.` };
      }

      const client = supabase;
      if (!client || !userId) return { error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' };
      let uploadedPhotoPath: string | undefined;

      try {
        if (draft.photo) {
          uploadedPhotoPath = await uploadPetPhoto(client, userId, draft.photo);
        }

        const result = await client
          .from('pets')
          .insert({
            owner_id: userId,
            name: draft.name.trim(),
            species: draft.species,
            breed: draft.breed?.trim() || null,
            birth_date: draft.birthDate || null,
            weight: draft.weight ?? null,
            photo_url: uploadedPhotoPath ?? null,
          })
          .select('id,name,species,breed,birth_date,weight,photo_url')
          .single();

        if (result.error || !result.data) {
          await removePetPhoto(client, uploadedPhotoPath);
          return { error: 'Dost profili eklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.' };
        }

        const signedPhotoUrl = draft.photo?.uri ?? await getPetPhotoUrl(client, uploadedPhotoPath);
        const pet = mapPet(result.data as PetRow, signedPhotoUrl);
        setPets(previous => [...previous, pet]);
        return { message: `${pet.name} başarıyla eklendi.` };
      } catch (uploadError) {
        await removePetPhoto(client, uploadedPhotoPath);
        if (uploadError instanceof Error && uploadError.message === 'PHOTO_TOO_LARGE') {
          return { error: 'Fotoğraf 10 MB’den küçük olmalı.' };
        }
        return {
          error: draft.photo
            ? 'Fotoğraf yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
            : 'Dost profili eklenemedi. Lütfen tekrar deneyin.',
        };
      }
    } finally {
      setSavingPet(false);
    }
  };

  const addVaccine = async (draft: VaccineDraft): Promise<SaveVaccineResult> => {
    const validationError = validateVaccineDraft(draft);
    if (validationError) return { error: validationError };

    const pet = pets.find(item => item.id === draft.petId);
    if (!pet) return { error: 'Seçilen dost bulunamadı.' };

    setSavingVaccine(true);
    try {
      if (demoMode) {
        const recordId = createDemoRecordId();
        const schedule = await scheduleForRecord(recordId, pet, draft);
        const record: HealthRecord = {
          id: recordId,
          petId: draft.petId,
          title: draft.vaccineName.trim(),
          category: 'Aşı',
          date: draft.nextDueDate,
          notes: draft.notes?.trim() || undefined,
          vaccineType: draft.vaccineType?.trim() || undefined,
          administeredDate: draft.administeredDate,
          nextDueDate: draft.nextDueDate,
          repeatIntervalMonths: draft.repeatIntervalMonths,
          veterinarian: draft.veterinarian?.trim() || undefined,
          attachmentUrl: draft.attachmentUrl?.trim() || undefined,
          notificationEnabled: draft.notificationEnabled,
          notificationStatus: schedule.notificationStatus,
          notificationIds: schedule.notificationIds,
        };
        const customRecords = [...records.filter(item => item.id.startsWith('demo-vaccine-')), record];
        try {
          await AsyncStorage.setItem(DEMO_VACCINES_KEY, JSON.stringify(customRecords));
        } catch {
          await cancelVaccineNotifications(schedule.notificationIds);
          return { error: 'Aşı kaydı bu cihazda saklanamadı. Lütfen tekrar deneyin.' };
        }
        setRecords(sortRecords([...demoRecords, ...customRecords]));
        return {
          message: getNotificationMessage(schedule.notificationStatus, schedule.notificationIds.length),
        };
      }

      const client = supabase;
      if (!client || !userId) return { error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' };

      const insertResult = await client
        .from('vaccines')
        .insert({
          owner_id: userId,
          pet_id: draft.petId,
          vaccine_name: draft.vaccineName.trim(),
          vaccine_type: draft.vaccineType?.trim() || null,
          administered_date: draft.administeredDate,
          next_due_date: draft.nextDueDate,
          repeat_interval_months: draft.repeatIntervalMonths ?? null,
          veterinarian: draft.veterinarian?.trim() || null,
          notes: draft.notes?.trim() || null,
          document_url: draft.attachmentUrl?.trim() || null,
          notifications_enabled: draft.notificationEnabled,
        })
        .select(VACCINE_SELECT)
        .single();

      if (insertResult.error || !insertResult.data) {
        return { error: 'Aşı kaydı eklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.' };
      }

      const insertedRecord = mapVaccine(insertResult.data as VaccineRow);
      const schedule = await scheduleForRecord(insertedRecord.id, pet, draft);
      const updateResult = await client
        .from('vaccines')
        .update(getReminderNotificationColumns(schedule.notifications))
        .eq('id', insertedRecord.id)
        .eq('owner_id', userId);

      if (updateResult.error) {
        await cancelVaccineNotifications(schedule.notificationIds);
        const record = {
          ...insertedRecord,
          notificationStatus: 'failed' as const,
          notificationIds: [],
        };
        setRecords(previous => sortRecords([...previous, record]));
        return { message: 'Aşı kaydedildi; bildirim bilgileri veritabanına yazılamadı.' };
      }

      const record = {
        ...insertedRecord,
        notificationStatus: schedule.notificationStatus,
        notificationIds: schedule.notificationIds,
      };
      setRecords(previous => sortRecords([...previous, record]));
      return {
        message: getNotificationMessage(schedule.notificationStatus, schedule.notificationIds.length),
      };
    } finally {
      setSavingVaccine(false);
    }
  };

  return { pets, records, loading, error, addPet, addVaccine, savingPet, savingVaccine };
}
