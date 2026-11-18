import { Query } from "@nestjs/cqrs";
import type { AuthUser } from "../../../common/http/guards/auth.decorators.js";

// For realtime sockets: who a socket ticket was issued to (role read fresh),
// or null when it is invalid, expired, or the user can no longer sign in
export class VerifyWsTicketQuery extends Query<AuthUser | null> {
  constructor(readonly ticket: string) {
    super();
  }
}
