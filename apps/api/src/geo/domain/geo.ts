import { GeoForbiddenError, InvalidGeoInputError } from "./geo.errors.js";

// Shared rules of the geo context: countries and their regions, the
// reference data addresses pick from

export type Actor = {
  id: bigint;
  permissions: ReadonlySet<string>;
};

// Whoever may manage regions
export function checkStaff(actor: Actor): void {
  if (!actor.permissions.has("geo:manage")) {
    throw new GeoForbiddenError();
  }
}

export function checkName(name: string): string {
  const s = name.trim();
  if (!s || s.length > 255) {
    throw new InvalidGeoInputError("Name is required (max 255 characters)");
  }
  return s;
}
