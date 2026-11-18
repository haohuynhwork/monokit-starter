import {
  type CountryCode,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min";

export type ParsedPhone = {
  // ISO 3166-1 alpha-2, e.g. 'VN'
  country: string;
  // National number, digits only, no trunk 0: '901234567'
  number: string;
  // '+84901234567'
  e164: string;
};

// Calling code without '+' ('VN' -> '84'); null for an unknown country
export function callingCode(country: string): string | null {
  return isSupportedCountry(country)
    ? getCountryCallingCode(country as CountryCode)
    : null;
}

// A number as typed ('0901 234 567', '+84 90 123 4567') checked against the
// country's rules; null when invalid or when it belongs to another country
export function parsePhone(country: string, input: string): ParsedPhone | null {
  if (!isSupportedCountry(country)) {
    return null;
  }
  const phone = parsePhoneNumberFromString(input, country as CountryCode);
  if (!phone?.isValid() || phone.countryCallingCode !== callingCode(country)) {
    return null;
  }
  return {
    country,
    number: phone.nationalNumber,
    e164: phone.number,
  };
}

// E.164 from stored parts; null for an unknown country
export function phoneE164(country: string, number: string): string | null {
  const code = callingCode(country);
  return code ? `+${code}${number}` : null;
}
