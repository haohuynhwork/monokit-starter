import { InvalidPhoneError } from "./user.errors.js";

// Contact number: ISO 3166-1 alpha-2 country plus the national number,
// digits only, without the trunk 0. Never used to sign in.
export interface Phone {
  country: string;
  number: string;
}

// Checks a number as typed against its country's rules (infrastructure:
// libphonenumber-js through @packages/geo)
export interface PhoneParser {
  // null when invalid
  parse(country: string, input: string): Phone | null;
}

export const PHONE_PARSER = Symbol("PHONE_PARSER");

// A blank number clears the phone
export function parsePhone(
  parser: PhoneParser,
  input: Phone | null,
): Phone | null {
  if (input === null || input.number.trim() === "") {
    return null;
  }
  const phone = parser.parse(input.country.trim().toUpperCase(), input.number);
  if (!phone) {
    throw new InvalidPhoneError();
  }
  return phone;
}
