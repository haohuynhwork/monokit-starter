import { Logger } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import {
  type OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { VerifyWsTicketQuery } from "../../auth/application/queries/verify-ws-ticket.query.js";
import type { RealtimePublisher } from "../domain/notification.repository.js";

// socket.io on /realtime. A client connects with { auth: { ticket } } (from
// POST /auth/ws-ticket, valid a minute) and is put in its user's room; it
// only receives, it sends nothing: 'notification', 'notification:read', 'notification:unread',
// 'notification:read-all', 'notification:deleted', 'notification:cleared-read'. Origins: WEB_ORIGINS (comma separated),
// any in development; the ticket is what authorizes.
@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: process.env.WEB_ORIGINS?.split(",").map((o) => o.trim()) ?? true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, RealtimePublisher {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly queries: QueryBus) {}

  async handleConnection(socket: Socket): Promise<void> {
    const ticket: unknown = socket.handshake.auth?.ticket;
    const user =
      typeof ticket === "string"
        ? await this.queries.execute(new VerifyWsTicketQuery(ticket))
        : null;
    if (user === null) {
      socket.emit("error:auth", {
        message: "Invalid or expired ticket",
      });
      socket.disconnect(true);
      return;
    }
    await socket.join(room(user.id));
  }

  toUser(userId: bigint, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Realtime server not ready; dropped ${event}`);
      return;
    }
    this.server.to(room(userId)).emit(event, payload);
  }
}

const room = (userId: bigint) => `user:${userId}`;
