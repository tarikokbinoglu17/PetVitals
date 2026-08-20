import { HealthRecord, Pet } from '../types';

export const demoPets: Pet[] = [
  { id: '1', name: 'Moka', species: 'Köpek', breed: 'Golden Retriever', birthDate: '2021-04-12', weight: 27.4 },
  { id: '2', name: 'Luna', species: 'Kedi', breed: 'British Shorthair', birthDate: '2023-01-08', weight: 4.6 },
];

export const demoRecords: HealthRecord[] = [
  { id: '1', petId: '1', title: 'Karma aşı tekrarı', category: 'Aşı', date: '2026-09-02' },
  { id: '2', petId: '2', title: 'Rutin veteriner kontrolü', category: 'Kontrol', date: '2026-09-18' },
  { id: '3', petId: '1', title: 'Parazit tablet uygulaması', category: 'İlaç', date: '2026-08-12', notes: 'Aylık doz tamamlandı.' },
];

