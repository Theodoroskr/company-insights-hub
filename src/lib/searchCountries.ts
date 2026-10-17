export const MAX_SEARCH_COUNTRIES = 5;

export function resolveSearchCountries(value: string, homeCountry?: string | null): string[] {
  if (homeCountry && /^[a-z]{2}$/i.test(homeCountry)) return [homeCountry.toLowerCase()];
  return [...new Set(value.toLowerCase().split(',').filter((code) => /^[a-z]{2}$/.test(code)))].slice(0, MAX_SEARCH_COUNTRIES);
}

export function toggleSearchCountry(selected: string[], code: string): string[] {
  const normalized = code.toLowerCase();
  if (selected.includes(normalized)) return selected.filter((value) => value !== normalized);
  return selected.length < MAX_SEARCH_COUNTRIES ? [...selected, normalized] : selected;
}