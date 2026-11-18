import type { QueryBus } from "@nestjs/cqrs";
import { callingCode } from "@packages/geo";
import { GetAssetUsagesQuery } from "../../../storage/application/queries/get-asset-usages.query.js";
import type { UserRole, UserStatus } from "../../domain/user.js";

// Response shape for one user; bigint ids go out as strings
export interface UserView {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  displayName: string;
  shortName: string | null;
  givenName: string | null;
  familyName: string | null;
  phone: PhoneView | null;
  // Where to load the avatar image; null without one
  avatarUrl: string | null;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneView {
  // ISO 3166-1 alpha-2: 'VN'
  country: string;
  // Calling code: '+84'
  code: string;
  // National number, no trunk 0: '901234567'
  number: string;
  // '+84901234567'
  e164: string;
}

export const USER_VIEW_FIELDS = [
  "id",
  "email",
  "emailVerifiedAt",
  "displayName",
  "shortName",
  "givenName",
  "familyName",
  "phoneCountry",
  "phoneNumber",
  "status",
  "roleId",
  "createdAt",
  "updatedAt",
] as const;

type UserRow = {
  [K in Exclude<
    (typeof USER_VIEW_FIELDS)[number],
    "phoneCountry" | "phoneNumber" | "roleId"
  >]: K extends "id" ? bigint : UserView[K];
} & {
  roleId: bigint;
  phoneCountry: string | null;
  phoneNumber: string | null;
};

// Avatars are asset usages in the storage context (ownerType 'user', slot
// 'avatar'), fetched for all rows in one query through the QueryBus
export async function toUserViews(
  rows: UserRow[],
  queries: QueryBus,
  roleKeys: ReadonlyMap<bigint, string>,
): Promise<UserView[]> {
  const avatars = await queries.execute(
    new GetAssetUsagesQuery(
      "user",
      rows.map((r) => r.id),
      "avatar",
    ),
  );
  return rows.map(({ phoneCountry, phoneNumber, roleId, ...row }) => ({
    ...row,
    id: String(row.id),
    role: roleKeys.get(roleId) ?? "",
    phone: toPhoneView(phoneCountry, phoneNumber),
    avatarUrl: avatars.get(String(row.id))?.[0]?.url ?? null,
  }));
}

function toPhoneView(
  country: string | null,
  number: string | null,
): PhoneView | null {
  const code = country ? callingCode(country) : null;
  if (!country || !number || !code) {
    return null;
  }
  return {
    country,
    code: `+${code}`,
    number,
    e164: `+${code}${number}`,
  };
}
