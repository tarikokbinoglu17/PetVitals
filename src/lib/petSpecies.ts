import type { Pet } from '../types';

export function petSpeciesIcon(species: Pet['species']) {
  return ({ Kedi: '🐱', Köpek: '🐶', Kuş: '🐦', Tavşan: '🐰', Sürüngen: '🦎', Balık: '🐠', Diğer: '🐾' } as const)[species];
}

export const speciesToDatabase: Record<Pet['species'], string> = {
  Kedi: 'cat', Köpek: 'dog', Kuş: 'bird', Tavşan: 'rabbit', Sürüngen: 'reptile', Balık: 'fish', Diğer: 'other',
};
export function petSpeciesFromDatabase(value: string): Pet['species'] {
  const entry = Object.entries(speciesToDatabase).find(([label, code]) => value === code || value === label);
  return entry ? entry[0] as Pet['species'] : 'Diğer';
}
