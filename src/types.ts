export type Pet = {
  id: string;
  name: string;
  species: 'Kedi' | 'Köpek' | 'Diğer';
  breed: string;
  birthDate: string;
  weight: number;
};

export type HealthRecord = {
  id: string;
  petId: string;
  title: string;
  category: 'Aşı' | 'Kontrol' | 'İlaç';
  date: string;
  notes?: string;
};

export type TabName = 'home' | 'pets' | 'health' | 'profile';

