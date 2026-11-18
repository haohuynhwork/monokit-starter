import { Injectable } from "@nestjs/common";
import { parsePhone } from "@packages/geo";
import type { Phone, PhoneParser } from "../domain/phone.js";

@Injectable()
export class GeoPhoneParser implements PhoneParser {
  parse(country: string, input: string): Phone | null {
    const phone = parsePhone(country, input);
    return phone
      ? {
          country: phone.country,
          number: phone.number,
        }
      : null;
  }
}
