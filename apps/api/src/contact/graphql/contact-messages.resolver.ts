import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import { RequirePermission } from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ChangeContactMessageStatusCommand } from "../application/commands/change-contact-message-status.command.js";
import { CreateContactMessageCommand } from "../application/commands/create-contact-message.command.js";
import { DeleteContactMessageCommand } from "../application/commands/delete-contact-message.command.js";
import { OpenContactMessageCommand } from "../application/commands/open-contact-message.command.js";
import type {
  ContactMessageDetail,
  ContactMessageView,
} from "../application/queries/contact-message.view.js";
import { CountContactMessagesQuery } from "../application/queries/count-contact-messages.query.js";
import { GetContactMessageQuery } from "../application/queries/get-contact-message.query.js";
import { ListContactMessagesQuery } from "../application/queries/list-contact-messages.query.js";
import { ContactMessageNotFoundError } from "../domain/contact.errors.js";
import type { ContactMessageStatus } from "../domain/contact-message.js";
import {
  type CreateContactMessageDto,
  contactMessageStatusSchema,
  createContactMessageSchema,
  listContactMessagesSchema,
} from "../http/contact.dto.js";
import {
  ContactMessageCountsModel,
  ContactMessageDetailModel,
  ContactMessagePage,
  CreateContactMessageInput,
} from "./contact-message.model.js";

const idArg = {
  type: () => ID,
} as const;
const listArgs = new ZodValidationPipe(listContactMessagesSchema);
const statusArgs = new ZodValidationPipe(contactMessageStatusSchema);

// Same as ContactMessagesController: the panel inbox, staff only
@RequirePermission("contact:manage")
@Resolver(() => ContactMessageDetailModel)
export class ContactMessagesResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => ContactMessagePage, {
    description: "Messages, newest first",
  })
  async contactMessages(
    @Args("status", {
      type: () => String,
      nullable: true,
    })
    status?: string,
    @Args("limit", {
      type: () => Int,
      nullable: true,
    })
    limit?: number,
    @Args("offset", {
      type: () => Int,
      nullable: true,
    })
    offset?: number,
  ) {
    const query = listArgs.transform({
      status: status ?? undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { items, total } = (await this.queries.execute(
      new ListContactMessagesQuery(
        query.status ?? null,
        query.limit,
        query.offset,
      ),
    )) as {
      items: ContactMessageView[];
      total: number;
    };
    return page(
      new Paginated(items, {
        total,
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }

  @Query(() => ContactMessageCountsModel, {
    description: "How many messages per status",
  })
  contactMessageCounts(): Promise<Record<ContactMessageStatus, number>> {
    return this.queries.execute(new CountContactMessagesQuery());
  }

  @Query(() => ContactMessageDetailModel, {
    description: "One message",
  })
  contactMessage(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<ContactMessageDetail> {
    return this.get(id);
  }

  @Mutation(() => ContactMessageDetailModel, {
    description: "Add a message by hand (rich text); nothing is mailed",
  })
  async createContactMessage(
    @Args(
      "input",
      {
        type: () => CreateContactMessageInput,
      },
      new ZodValidationPipe(createContactMessageSchema),
    )
    input: CreateContactMessageDto,
  ): Promise<ContactMessageDetail> {
    const { status, ...fields } = input;
    const id = await this.commands.execute(
      new CreateContactMessageCommand(fields, status),
    );
    return this.get(id);
  }

  @Mutation(() => Boolean, {
    description: "Opened in the panel: new becomes read",
  })
  async openContactMessage(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new OpenContactMessageCommand(id));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Set the status (read, replied, spam, ...)",
  })
  async changeContactMessageStatus(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("status", {
      type: () => String,
    })
    status: string,
  ): Promise<boolean> {
    const body = statusArgs.transform({
      status,
    });
    await this.commands.execute(
      new ChangeContactMessageStatusCommand(id, body.status),
    );
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Delete a message",
  })
  async deleteContactMessage(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteContactMessageCommand(id));
    return true;
  }

  private async get(id: bigint): Promise<ContactMessageDetail> {
    const message = await this.queries.execute(new GetContactMessageQuery(id));
    if (!message) {
      throw new ContactMessageNotFoundError();
    }
    return message;
  }
}
