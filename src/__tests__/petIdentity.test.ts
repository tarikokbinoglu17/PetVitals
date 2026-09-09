import { petSpeciesFromDatabase, speciesToDatabase } from '../lib/petSpecies';
import { buildPetTagUrl, isValidContactPhone, isValidMicrochip, normalizeMicrochip } from '../lib/petIdentity';
import { validatePetDraft } from '../lib/pets';
import { tagCopy } from '../lib/petTagCopy';

test('keeps leading zeroes and supports ISO and legacy chip numbers', () => {
  expect(normalizeMicrochip('000 123-456789012')).toBe('000123456789012');
  for (const chip of ['', '000123456789012', '123456789', 'AB01234567']) expect(isValidMicrochip(chip)).toBe(true);
  for (const chip of ['1234', '1234567890123456', 'ZZ01234567']) expect(isValidMicrochip(chip)).toBe(false);
});
test('rejects bad chip input with a message in each supported language', () => {
  for (const language of Object.keys(tagCopy) as (keyof typeof tagCopy)[]) {
    expect(validatePetDraft({ name: 'Moka', species: 'Köpek', microchipId: 'wrong' }, new Date(), language)).toBe(tagCopy[language].chipError);
    expect(tagCopy[language].steps).toHaveLength(4);
  }
});
test('requires international phone format and rejects URI injection', () => {
  expect(isValidContactPhone('+90 (555) 123-45-67')).toBe(true);
  for (const phone of ['05551234567', 'javascript:alert(1)', '+123;456789', '+00123456789']) expect(isValidContactPhone(phone)).toBe(false);
});
test('creates a tag-only HTTPS route without account tokens or demo flags', () => {
  const token = '9de80bd3-218c-42f5-b1c0-ea6a188d00b7';
  const url = new URL(buildPetTagUrl(token, 'https://example.com/PetVitals/?demo=1#access_token=secret'));
  expect(url.pathname).toBe('/PetVitals/');
  expect(url.search).toBe(`?tag=${token}`); expect(url.hash).toBe('');
  expect(() => buildPetTagUrl('guessable')).toThrow();
  expect(() => buildPetTagUrl(token, 'http://example.com')).toThrow();
});

test('all seven animal species round-trip through the real database codes', () => {
  for (const [label, code] of Object.entries(speciesToDatabase)) {
    expect(petSpeciesFromDatabase(code)).toBe(label);
    expect(petSpeciesFromDatabase(label)).toBe(label);
  }
});
