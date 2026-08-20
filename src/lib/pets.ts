import type { PetDraft } from '../types';
import { parseIsoDate } from './vaccineReminders';

export function validatePetDraft(draft: PetDraft, today = new Date()) {
  if (draft.name.trim().length < 2) return 'Dostunuzun adı en az 2 karakter olmalı.';
  if (!['Kedi', 'Köpek', 'Diğer'].includes(draft.species)) return 'Lütfen geçerli bir tür seçin.';

  if (draft.birthDate) {
    const birthDate = parseIsoDate(draft.birthDate);
    if (!birthDate) return 'Doğum tarihini YYYY-AA-GG biçiminde girin.';

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    if (birthDate.getTime() > endOfToday.getTime()) return 'Doğum tarihi gelecekte olamaz.';
  }

  if (draft.weight !== undefined && (!Number.isFinite(draft.weight) || draft.weight <= 0 || draft.weight > 500)) {
    return 'Ağırlık 0 ile 500 kg arasında olmalı.';
  }

  return null;
}
