import { validatePetDraft } from '../lib/pets';

describe('pet validation', () => {
  it('accepts a complete pet profile', () => {
    expect(
      validatePetDraft(
        {
          name: 'Moka',
          species: 'Köpek',
          breed: 'Golden Retriever',
          birthDate: '2021-04-12',
          weight: 27.4,
        },
        new Date(2026, 7, 20),
      ),
    ).toBeNull();
  });

  it('rejects future birth dates', () => {
    expect(
      validatePetDraft(
        { name: 'Luna', species: 'Kedi', birthDate: '2026-08-21' },
        new Date(2026, 7, 20),
      ),
    ).toBe('Doğum tarihi gelecekte olamaz.');
  });

  it('rejects invalid weights', () => {
    expect(validatePetDraft({ name: 'Luna', species: 'Kedi', weight: 0 })).toBe(
      'Ağırlık 0 ile 500 kg arasında olmalı.',
    );
  });
});
