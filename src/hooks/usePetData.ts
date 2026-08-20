import { useEffect, useState } from 'react';
import { demoPets, demoRecords } from '../data/demo';
import { supabase } from '../lib/supabase';
import type { HealthRecord, Pet } from '../types';

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | string | null;
};

type HealthRecordRow = {
  id: string;
  pet_id: string;
  title: string;
  category: string;
  date: string;
  notes: string | null;
};

const petSpecies: Pet['species'][] = ['Kedi', 'Köpek', 'Diğer'];
const recordCategories: HealthRecord['category'][] = ['Aşı', 'Kontrol', 'İlaç'];

function mapPet(row: PetRow): Pet {
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
  };
}

function mapRecord(row: HealthRecordRow): HealthRecord {
  const category = recordCategories.includes(row.category as HealthRecord['category'])
    ? (row.category as HealthRecord['category'])
    : 'Kontrol';

  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    category,
    date: row.date,
    notes: row.notes ?? undefined,
  };
}

export function usePetData({ demoMode, userId }: { demoMode: boolean; userId?: string }) {
  const [pets, setPets] = useState<Pet[]>(demoMode ? demoPets : []);
  const [records, setRecords] = useState<HealthRecord[]>(demoMode ? demoRecords : []);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (demoMode) {
      setPets(demoPets);
      setRecords(demoRecords);
      setError(null);
      setLoading(false);
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
          .select('id,name,species,breed,birth_date,weight')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        client
          .from('health_records')
          .select('id,pet_id,title,category,date,notes')
          .eq('user_id', userId)
          .order('date', { ascending: true }),
      ]);

      if (!active) return;

      const queryError = petsResult.error ?? recordsResult.error;
      if (queryError) {
        setPets([]);
        setRecords([]);
        setError('Sağlık bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } else {
        setPets(((petsResult.data ?? []) as PetRow[]).map(mapPet));
        setRecords(((recordsResult.data ?? []) as HealthRecordRow[]).map(mapRecord));
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [demoMode, userId]);

  return { pets, records, loading, error };
}
