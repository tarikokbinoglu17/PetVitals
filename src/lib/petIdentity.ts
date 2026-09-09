export function normalizeMicrochip(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidMicrochip(value: string) {
  return !value || /^(?:[0-9]{9}|[0-9]{15}|[0-9A-F]{10})$/.test(value);
}

export function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}
export function isValidContactPhone(value: string) {
  return /^\+[1-9][0-9]{6,14}$/.test(normalizePhone(value));
}

export const TAG_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function buildPetTagUrl(token: string, base = "https://tarikokbinoglu17.github.io/PetVitals/") {
  if (!TAG_TOKEN_PATTERN.test(token)) throw new Error("INVALID_TAG_TOKEN");
  const url = new URL(base);
  if (url.protocol !== "https:") throw new Error("INVALID_TAG_ORIGIN");
  url.search = "";
  url.hash = "";
  url.searchParams.set("tag", token);
  return url.toString();
}
