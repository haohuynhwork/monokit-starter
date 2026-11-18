import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";

// GraphQL shapes of the auth DTOs (http/auth.dto.ts).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("TokenPair", {
  description: "Tokens of a session (also set as HttpOnly cookies)",
})
export class TokenPairModel {
  @Field(() => String)
  accessToken!: string;

  @Field(() => String)
  refreshToken!: string;

  @Field(() => Int, {
    description: "Seconds",
  })
  expiresIn!: number;

  @Field(() => Int, {
    description: "Seconds",
  })
  refreshExpiresIn!: number;
}

@ObjectType("WsTicket", {
  description: "One-minute ticket to open the realtime socket",
})
export class WsTicketModel {
  @Field(() => String)
  ticket!: string;
}

@ObjectType("AuthSession", {
  description: "A device signed in to my account",
})
export class AuthSessionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    nullable: true,
  })
  userAgent!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  ip!: string | null;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  createdAt!: string;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  lastUsedAt!: string;

  @Field(() => Boolean, {
    description: "The device making the request",
  })
  current!: boolean;
}

@InputType("RegisterInput")
export class RegisterInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  password!: string;

  @Field(() => String)
  displayName!: string;
}

@InputType("LoginInput")
export class LoginInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  password!: string;
}

@InputType("RefreshInput")
export class RefreshInput {
  @Field(() => String, {
    nullable: true,
    description: "Browsers send the refresh_token cookie instead",
  })
  refreshToken?: string;
}

@InputType("ForgotPasswordInput")
export class ForgotPasswordInput {
  @Field(() => String)
  email!: string;
}

@InputType("ResetPasswordInput")
export class ResetPasswordInput {
  @Field(() => String)
  token!: string;

  @Field(() => String)
  password!: string;

  @Field(() => Boolean, {
    description: 'Whether to mail "your password was changed"',
  })
  notify!: boolean;
}
