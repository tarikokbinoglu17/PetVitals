import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { demoPets, demoRecords } from '../data/demo';
import { cancelVaccineNotifications, scheduleVaccineNotifications } from '../lib/notifications';
import { validatePetDraft } from '../lib/pets';
import { supabase } from '../lib/supabase';
import { getPetPhotoUrl, removePetPhoto, uploadPetPhoto } from '../lib/storage';
import { validateVaccineDraft } from '../lib/vaccineReminders';
import type { HealthRecord, Pet, PetDraft, SavePetResult, SaveVaccineResult, VaccineDraft, VaccineNotificationStatus } from '../types';

const DEMO_VACCINES_KEY = '@petvitals/demo-vaccines/v1';
const DEMO_PETS_KEY = '@petvitals/demo-pets/v1';
const VACCINE_SELECT = 'id,pet_id,vaccine_name,vaccine_type,administered_date,next_due_date,repeat_interval_months,veterinarian,notes,document_url,notifications_enabled,reminder_30_days_id,reminder_7_days_id,reminder_1_day_id,reminder_same_day_id,created_at';
type MutationResult = { error?: string; message?: string };

type PetRow = { id: string; name: string; species: string; breed: string | null; birth_date: string | null; weight: number | string | null; photo_url: string | null };
type VaccineRow = { id: string; pet_id: string; vaccine_name: string; vaccine_type: string | null; administered_date: string | null; next_due_date: string | null; repeat_interval_months: number | null; veterinarian: string | null; notes: string | null; document_url: string | null; notifications_enabled: boolean; reminder_30_days_id: string | null; reminder_7_days_id: string | null; reminder_1_day_id: string | null; reminder_same_day_id: string | null; created_at: string };
const petSpecies: Pet['species'][] = ['Kedi', 'Köpek', 'Diğer'];

function mapPet(row: PetRow, photoUrl?: string): Pet {
  const species = petSpecies.includes(row.species as Pet['species']) ? (row.species as Pet['species']) : 'Diğer';
  return { id: row.id, name: row.name, species, breed: row.breed ?? '', birthDate: row.birth_date ?? '', weight: Number(row.weight ?? 0), photoPath: row.photo_url ?? undefined, photoUrl };
}
function mapVaccine(row: VaccineRow): HealthRecord {
  const notificationIds = [row.reminder_30_days_id,row.reminder_7_days_id,row.reminder_1_day_id,row.reminder_same_day_id].filter((value): value is string => Boolean(value));
  return { id: row.id, petId: row.pet_id, title: row.vaccine_name, category: 'Aşı', date: row.next_due_date ?? row.administered_date ?? row.created_at.slice(0,10), notes: row.notes ?? undefined, vaccineType: row.vaccine_type ?? undefined, administeredDate: row.administered_date ?? undefined, nextDueDate: row.next_due_date ?? undefined, repeatIntervalMonths: row.repeat_interval_months ?? undefined, veterinarian: row.veterinarian ?? undefined, attachmentUrl: row.document_url ?? undefined, notificationEnabled: row.notifications_enabled, notificationStatus: row.notifications_enabled ? (notificationIds.length > 0 ? 'scheduled' : 'no_future_dates') : 'disabled', notificationIds };
}
function sortRecords(records: HealthRecord[]) { return [...records].sort((a,b) => a.date.localeCompare(b.date)); }
function createDemoRecordId() { return `demo-vaccine-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
function createDemoPetId() { return `demo-pet-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
function getNotificationMessage(status: VaccineNotificationStatus, count: number) {
  if (status === 'scheduled') return `Aşı kaydedildi ve ${count} hatırlatma planlandı.`;
  if (status === 'denied') return 'Aşı kaydedildi; bildirim izni verilmedi.';
  if (status === 'failed') return 'Aşı kaydedildi; bildirimler planlanamadı.';
  if (status === 'no_future_dates') return 'Aşı kaydedildi; gelecekte bir hatırlatma zamanı kalmadığı için bildirim oluşturulmadı.';
  return 'Aşı kaydı başarıyla eklendi.';
}
function getReminderNotificationColumns(notifications: { offsetDays: number; notificationId: string }[]) {
  const getId = (offsetDays: number) => notifications.find(n => n.offsetDays === offsetDays)?.notificationId ?? null;
  return { reminder_30_days_id:getId(30), reminder_7_days_id:getId(7), reminder_1_day_id:getId(1), reminder_same_day_id:getId(0) };
}
async function scheduleForRecord(recordId: string, pet: Pet, draft: VaccineDraft) {
  if (!draft.notificationEnabled) return { notificationIds: [] as string[], notificationStatus:'disabled' as const, notifications:[] as {offsetDays:number;notificationId:string}[] };
  try {
    const result = await scheduleVaccineNotifications({ recordId, petId:pet.id, petName:pet.name, vaccineName:draft.vaccineName.trim(), nextDueDate:draft.nextDueDate });
    if (!result.granted) return { notificationIds:[], notificationStatus:'denied' as const, notifications:[] };
    return { notificationIds:result.notificationIds, notificationStatus:result.notificationIds.length ? 'scheduled' as const : 'no_future_dates' as const, notifications:result.notifications };
  } catch { return { notificationIds:[], notificationStatus:'failed' as const, notifications:[] }; }
}

export function usePetData({ demoMode, userId }: { demoMode: boolean; userId?: string }) {
  const [pets,setPets] = useState<Pet[]>(demoMode ? demoPets : []);
  const [records,setRecords] = useState<HealthRecord[]>(demoMode ? demoRecords : []);
  const [loading,setLoading] = useState(!demoMode);
  const [error,setError] = useState<string|null>(null);
  const [savingPet,setSavingPet] = useState(false);
  const [savingVaccine,setSavingVaccine] = useState(false);

  useEffect(() => {
    let active = true;
    if (demoMode) {
      setLoading(true);
      Promise.all([AsyncStorage.getItem(DEMO_PETS_KEY),AsyncStorage.getItem(DEMO_VACCINES_KEY)]).then(([petsValue,vaccinesValue]) => {
        if (!active) return;
        const storedPets = petsValue ? JSON.parse(petsValue) : [];
        const storedVaccines = vaccinesValue ? JSON.parse(vaccinesValue) : [];
        setPets([...demoPets,...(Array.isArray(storedPets)?storedPets:[])]);
        setRecords(sortRecords([...demoRecords,...(Array.isArray(storedVaccines)?storedVaccines:[])]));
        setError(null);
      }).catch(() => { if(active){setPets(demoPets);setRecords(demoRecords);setError(null);} }).finally(() => { if(active)setLoading(false); });
      return () => { active=false; };
    }
    const client=supabase;
    if (!client || !userId) { setPets([]);setRecords([]);setError('Kullanıcı verileri yüklenemedi. Lütfen yeniden giriş yapın.');setLoading(false);return () => {active=false;}; }
    const load=async()=>{
      setLoading(true);setError(null);
      const [petsResult,recordsResult]=await Promise.all([
        client.from('pets').select('id,name,species,breed,birth_date,weight,photo_url').eq('owner_id',userId).order('created_at',{ascending:true}),
        client.from('vaccines').select(VACCINE_SELECT).eq('owner_id',userId).order('next_due_date',{ascending:true,nullsFirst:false}),
      ]);
      if(!active)return;
      const queryError=petsResult.error??recordsResult.error;
      if(queryError){setPets([]);setRecords([]);setError('Sağlık bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');}
      else { const rows=(petsResult.data??[]) as PetRow[]; const mapped=await Promise.all(rows.map(async row=>mapPet(row,await getPetPhotoUrl(client,row.photo_url)))); if(!active)return; setPets(mapped);setRecords(((recordsResult.data??[]) as VaccineRow[]).map(mapVaccine)); }
      setLoading(false);
    };
    void load(); return()=>{active=false;};
  },[demoMode,userId]);

  const addPet=async(draft:PetDraft):Promise<SavePetResult>=>{
    const validationError=validatePetDraft(draft);if(validationError)return{error:validationError};setSavingPet(true);
    try{
      if(demoMode){const pet:Pet={id:createDemoPetId(),name:draft.name.trim(),species:draft.species,breed:draft.breed?.trim()||'',birthDate:draft.birthDate||'',weight:draft.weight??0,photoUrl:draft.photo?.uri};const custom=[...pets.filter(p=>p.id.startsWith('demo-pet-')),pet];await AsyncStorage.setItem(DEMO_PETS_KEY,JSON.stringify(custom));setPets([...demoPets,...custom]);return{message:`${pet.name} başarıyla eklendi.`};}
      const client=supabase;if(!client||!userId)return{error:'Oturum bulunamadı. Lütfen yeniden giriş yapın.'};let uploaded:string|undefined;
      try{if(draft.photo)uploaded=await uploadPetPhoto(client,userId,draft.photo);const result=await client.from('pets').insert({owner_id:userId,name:draft.name.trim(),species:draft.species,breed:draft.breed?.trim()||null,birth_date:draft.birthDate||null,weight:draft.weight??null,photo_url:uploaded??null}).select('id,name,species,breed,birth_date,weight,photo_url').single();if(result.error||!result.data){await removePetPhoto(client,uploaded);return{error:'Dost profili eklenemedi. Lütfen tekrar deneyin.'};}const pet=mapPet(result.data as PetRow,draft.photo?.uri??await getPetPhotoUrl(client,uploaded));setPets(prev=>[...prev,pet]);return{message:`${pet.name} başarıyla eklendi.`};}catch(e){await removePetPhoto(client,uploaded);return{error:e instanceof Error&&e.message==='PHOTO_TOO_LARGE'?'Fotoğraf 10 MB’den küçük olmalı.':'Dost profili eklenemedi. Lütfen tekrar deneyin.'};}
    }finally{setSavingPet(false);}
  };

  const updatePet=async(petId:string,draft:PetDraft):Promise<MutationResult>=>{
    const validationError=validatePetDraft(draft);if(validationError)return{error:validationError};setSavingPet(true);
    try{
      if(demoMode){if(!petId.startsWith('demo-pet-'))return{error:'Yerleşik demo profilleri düzenlenemez.'};const updated:Pet={id:petId,name:draft.name.trim(),species:draft.species,breed:draft.breed?.trim()||'',birthDate:draft.birthDate||'',weight:draft.weight??0,photoUrl:draft.photo?.uri??pets.find(p=>p.id===petId)?.photoUrl};const custom=pets.filter(p=>p.id.startsWith('demo-pet-')).map(p=>p.id===petId?updated:p);await AsyncStorage.setItem(DEMO_PETS_KEY,JSON.stringify(custom));setPets([...demoPets,...custom]);return{message:'Dost profili güncellendi.'};}
      const client=supabase;if(!client||!userId)return{error:'Oturum bulunamadı.'};const result=await client.from('pets').update({name:draft.name.trim(),species:draft.species,breed:draft.breed?.trim()||null,birth_date:draft.birthDate||null,weight:draft.weight??null}).eq('id',petId).eq('owner_id',userId).select('id,name,species,breed,birth_date,weight,photo_url').single();if(result.error||!result.data)return{error:'Dost profili güncellenemedi.'};const updated=mapPet(result.data as PetRow,await getPetPhotoUrl(client,(result.data as PetRow).photo_url));setPets(prev=>prev.map(p=>p.id===petId?updated:p));return{message:'Dost profili güncellendi.'};
    }finally{setSavingPet(false);}
  };

  const deletePet=async(petId:string):Promise<MutationResult>=>{
    const pet=pets.find(p=>p.id===petId);if(!pet)return{error:'Dost bulunamadı.'};
    if(demoMode){if(!petId.startsWith('demo-pet-'))return{error:'Yerleşik demo profilleri silinemez.'};const customPets=pets.filter(p=>p.id.startsWith('demo-pet-')&&p.id!==petId);const customRecords=records.filter(r=>r.id.startsWith('demo-vaccine-')&&r.petId!==petId);await Promise.all([AsyncStorage.setItem(DEMO_PETS_KEY,JSON.stringify(customPets)),AsyncStorage.setItem(DEMO_VACCINES_KEY,JSON.stringify(customRecords))]);setPets([...demoPets,...customPets]);setRecords(sortRecords([...demoRecords,...customRecords]));return{message:'Dost profili silindi.'};}
    const client=supabase;if(!client||!userId)return{error:'Oturum bulunamadı.'};const related=records.filter(r=>r.petId===petId);await cancelVaccineNotifications(related.flatMap(r=>r.notificationIds??[]));const vaccineDelete=await client.from('vaccines').delete().eq('pet_id',petId).eq('owner_id',userId);if(vaccineDelete.error)return{error:'Sağlık kayıtları silinemedi.'};const result=await client.from('pets').delete().eq('id',petId).eq('owner_id',userId);if(result.error)return{error:'Dost profili silinemedi.'};await removePetPhoto(client,pet.photoPath);setPets(prev=>prev.filter(p=>p.id!==petId));setRecords(prev=>prev.filter(r=>r.petId!==petId));return{message:'Dost profili silindi.'};
  };

  const addVaccine=async(draft:VaccineDraft):Promise<SaveVaccineResult>=>{
    const validationError=validateVaccineDraft(draft);if(validationError)return{error:validationError};const pet=pets.find(p=>p.id===draft.petId);if(!pet)return{error:'Seçilen dost bulunamadı.'};setSavingVaccine(true);
    try{
      if(demoMode){const recordId=createDemoRecordId();const schedule=await scheduleForRecord(recordId,pet,draft);const record:HealthRecord={id:recordId,petId:draft.petId,title:draft.vaccineName.trim(),category:'Aşı',date:draft.nextDueDate,notes:draft.notes?.trim()||undefined,vaccineType:draft.vaccineType?.trim()||undefined,administeredDate:draft.administeredDate,nextDueDate:draft.nextDueDate,repeatIntervalMonths:draft.repeatIntervalMonths,veterinarian:draft.veterinarian?.trim()||undefined,attachmentUrl:draft.attachmentUrl?.trim()||undefined,notificationEnabled:draft.notificationEnabled,notificationStatus:schedule.notificationStatus,notificationIds:schedule.notificationIds};const custom=[...records.filter(r=>r.id.startsWith('demo-vaccine-')),record];await AsyncStorage.setItem(DEMO_VACCINES_KEY,JSON.stringify(custom));setRecords(sortRecords([...demoRecords,...custom]));return{message:getNotificationMessage(schedule.notificationStatus,schedule.notificationIds.length)};}
      const client=supabase;if(!client||!userId)return{error:'Oturum bulunamadı.'};const inserted=await client.from('vaccines').insert({owner_id:userId,pet_id:draft.petId,vaccine_name:draft.vaccineName.trim(),vaccine_type:draft.vaccineType?.trim()||null,administered_date:draft.administeredDate,next_due_date:draft.nextDueDate,repeat_interval_months:draft.repeatIntervalMonths??null,veterinarian:draft.veterinarian?.trim()||null,notes:draft.notes?.trim()||null,document_url:draft.attachmentUrl?.trim()||null,notifications_enabled:draft.notificationEnabled}).select(VACCINE_SELECT).single();if(inserted.error||!inserted.data)return{error:'Aşı kaydı eklenemedi.'};const insertedRecord=mapVaccine(inserted.data as VaccineRow);const schedule=await scheduleForRecord(insertedRecord.id,pet,draft);const update=await client.from('vaccines').update(getReminderNotificationColumns(schedule.notifications)).eq('id',insertedRecord.id).eq('owner_id',userId);if(update.error){await cancelVaccineNotifications(schedule.notificationIds);const record={...insertedRecord,notificationStatus:'failed' as const,notificationIds:[]};setRecords(prev=>sortRecords([...prev,record]));return{message:'Aşı kaydedildi; bildirim bilgileri veritabanına yazılamadı.'};}const record={...insertedRecord,notificationStatus:schedule.notificationStatus,notificationIds:schedule.notificationIds};setRecords(prev=>sortRecords([...prev,record]));return{message:getNotificationMessage(schedule.notificationStatus,schedule.notificationIds.length)};
    }finally{setSavingVaccine(false);}
  };

  const deleteRecord=async(recordId:string):Promise<MutationResult>=>{
    const record=records.find(r=>r.id===recordId);if(!record)return{error:'Sağlık kaydı bulunamadı.'};await cancelVaccineNotifications(record.notificationIds??[]);
    if(demoMode){if(!recordId.startsWith('demo-vaccine-'))return{error:'Yerleşik demo kayıtları silinemez.'};const custom=records.filter(r=>r.id.startsWith('demo-vaccine-')&&r.id!==recordId);await AsyncStorage.setItem(DEMO_VACCINES_KEY,JSON.stringify(custom));setRecords(sortRecords([...demoRecords,...custom]));return{message:'Sağlık kaydı silindi.'};}
    const client=supabase;if(!client||!userId)return{error:'Oturum bulunamadı.'};const result=await client.from('vaccines').delete().eq('id',recordId).eq('owner_id',userId);if(result.error)return{error:'Sağlık kaydı silinemedi.'};setRecords(prev=>prev.filter(r=>r.id!==recordId));return{message:'Sağlık kaydı silindi.'};
  };

  return {pets,records,loading,error,addPet,updatePet,deletePet,addVaccine,deleteRecord,savingPet,savingVaccine};
}
