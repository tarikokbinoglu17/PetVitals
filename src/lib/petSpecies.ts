import type { Pet } from '../types';

export function petSpeciesIcon(species: Pet['species']) {
  return ({ Kedi: '🐱', Köpek: '🐶', Kuş: '🐦', Tavşan: '🐰', Sürüngen: '🦎', Balık: '🐠', Diğer: '🐾' } as const)[species];
}
