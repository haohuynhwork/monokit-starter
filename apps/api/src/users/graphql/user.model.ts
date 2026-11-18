import {
  Field,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import type { UserRole, UserStatus } from "../domain/user.js";

// GraphQL shapes of the users DTOs (http/users.dto.ts).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

export const UserRoleEnum = {
  admin: "admin",
  editor: "editor",
  author: "author",
} as const;
registerEnumType(UserRoleEnum, {
  name: "UserRole",
});

export const UserStatusEnum = {
  active: "active",
  disabled: "disabled",
} as const;
registerEnumType(UserStatusEnum, {
  name: "UserStatus",
});

@ObjectType("Phone", {
  description: "Contact number; never used to sign in",
})
export class PhoneModel {
  @Field(() => String, {
    description: "ISO 3166-1 alpha-2",
  })
  country!: string;

  @Field(() => String, {
    description: "Calling code, e.g. +84",
  })
  code!: string;

  @Field(() => String, {
    description: "National number without the trunk 0",
  })
  number!: string;

  @Field(() => String)
  e164!: string;
}

@InputType("PhoneInput", {
  description: "Number as typed, checked against the country's rules",
})
export class PhoneInput {
  @Field(() => String, {
    description: "ISO 3166-1 alpha-2",
  })
  country!: string;

  @Field(() => String)
  number!: string;
}

@ObjectType("User")
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: "ISO 8601 timestamp",
  })
  emailVerifiedAt!: string | null;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, {
    nullable: true,
  })
  shortName!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  givenName!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  familyName!: string | null;

  @Field(() => PhoneModel, {
    nullable: true,
  })
  phone!: PhoneModel | null;

  @Field(() => String, {
    nullable: true,
    description: "Ready-to-use URL",
  })
  avatarUrl!: string | null;

  @Field(() => UserStatusEnum)
  status!: UserStatus;

  @Field(() => UserRoleEnum)
  role!: UserRole;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  createdAt!: string;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  updatedAt!: string;
}

@ObjectType("UserPermission", {
  description: "Something a role may do",
})
export class UserPermissionModel {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  group!: string;

  @Field(() => String)
  label!: string;

  @Field(() => [
    UserRoleEnum,
  ])
  roles!: readonly UserRole[];
}

@ObjectType("UserPermissions", {
  description: "What each role may do",
})
export class UserPermissionsModel {
  @Field(() => [
    UserRoleEnum,
  ])
  roles!: UserRole[];

  @Field(() => [
    UserPermissionModel,
  ])
  permissions!: UserPermissionModel[];
}

@InputType("UpdateProfileInput", {
  description: "Fields left out stay as they are; null clears",
})
export class UpdateProfileInput {
  @Field(() => String, {
    nullable: true,
  })
  displayName?: string;

  @Field(() => String, {
    nullable: true,
  })
  shortName?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  givenName?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  familyName?: string | null;

  @Field(() => PhoneInput, {
    nullable: true,
  })
  phone?: PhoneInput | null;
}

@InputType("ChangePasswordInput")
export class ChangePasswordInput {
  @Field(() => String)
  currentPassword!: string;

  @Field(() => String)
  newPassword!: string;

  @Field(() => Boolean, {
    description: 'Whether to mail "your password was changed"',
  })
  notify!: boolean;
}

@InputType("CreateUserInput")
export class CreateUserInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  password!: string;

  @Field(() => UserRoleEnum, {
    nullable: true,
  })
  role?: UserRole;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, {
    nullable: true,
  })
  shortName?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  givenName?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  familyName?: string | null;

  @Field(() => PhoneInput, {
    nullable: true,
  })
  phone?: PhoneInput | null;
}
