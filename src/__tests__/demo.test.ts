import { demoPets, demoRecords } from '../data/demo';

describe('demo data integrity', () => {
  it('uses unique entity identifiers', () => {
    expect(new Set(demoPets.map(pet => pet.id)).size).toBe(demoPets.length);
    expect(new Set(demoRecords.map(record => record.id)).size).toBe(demoRecords.length);
  });

  it('links every health record to an existing pet', () => {
    const petIds = new Set(demoPets.map(pet => pet.id));
    expect(demoRecords.every(record => petIds.has(record.petId))).toBe(true);
  });
});
