import { describe, expect, it } from 'vitest';
import { resolveSearchCountries, toggleSearchCountry } from './searchCountries';

describe('country search rules', () => {
  it('requires an explicit country on Global', () => {
    expect(resolveSearchCountries('')).toEqual([]);
    expect(resolveSearchCountries('all')).toEqual([]);
  });
  it('locks country instances to their home country', () => {
    expect(resolveSearchCountries('gb,gr', 'CY')).toEqual(['cy']);
  });
  it('caps URL searches at five distinct countries', () => {
    expect(resolveSearchCountries('CY,GB,GR,MT,RO,AE')).toEqual(['cy', 'gb', 'gr', 'mt', 'ro']);
  });
  it('rejects a sixth selection but allows removal and replacement', () => {
    const selected = ['cy', 'gb', 'gr', 'mt', 'ro'];
    expect(toggleSearchCountry(selected, 'ae')).toEqual(selected);
    expect(toggleSearchCountry(toggleSearchCountry(selected, 'ro'), 'ae')).toEqual(['cy', 'gb', 'gr', 'mt', 'ae']);
  });
});