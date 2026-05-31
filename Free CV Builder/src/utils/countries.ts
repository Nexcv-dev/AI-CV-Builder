import worldCountries from 'world-countries';

export const COUNTRIES = [
  ...worldCountries
    .filter((country) => country.cca2 && country.name?.common)
    .map((country) => ({
      code: country.cca2,
      name: country.name.common,
      flag: country.flag || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  { code: 'OTHER', name: 'Other country', flag: '' },
];

export function countryNameFromCode(code: string) {
  return COUNTRIES.find((country) => country.code === code)?.name || 'Other country';
}

export function countryFromCode(code: string) {
  return COUNTRIES.find((country) => country.code === code) || COUNTRIES[COUNTRIES.length - 1];
}

export function detectClientBillingCountry() {
  if (typeof Intl === 'undefined') return '';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone === 'Asia/Colombo' ? 'LK' : '';
}
