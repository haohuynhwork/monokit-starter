import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import { ChangeUserRoleCommand } from "../application/commands/change-user-role.command.js";
import { GetUserQuery } from "../application/queries/get-user.query.js";
import { ListUsersQuery } from "../application/queries/list-users.query.js";
import type { UserView } from "../application/queries/user.view.js";
import { UsersResolver } from "./users.resolver.js";

const user: UserView = {
  id: "5",
  email: "a@b.c",
  emailVerifiedAt: null,
  displayName: "Ann",
  shortName: null,
  givenName: null,
  familyName: null,
  phone: null,
  avatarUrl: null,
  status: "active",
  role: "editor",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("UsersResolver", () => {
  let app: INestApplication;
  const command = vi.fn();
  const query = vi.fn();
  const verifyAccess = vi.fn();

  beforeEach(async () => {
    command.mockReset();
    query.mockReset();
    verifyAccess.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        UsersResolver,
        {
          provide: CommandBus,
          useValue: {
            execute: command,
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: query,
          },
        },
        {
          provide: TOKEN_SERVICE,
          useValue: {
            verifyAccess,
          },
        },
        {
          provide: PermissionResolver,
          useValue: testPermissionResolver,
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_FILTER,
          useClass: ApiExceptionFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const as = (role: string) =>
    verifyAccess.mockResolvedValue({
      userId: 1n,
      role,
      sessionId: 2n,
    });
  const gql = (q: string, variables?: object) =>
    request(app.getHttpServer())
      .post("/graphql")
      .set("Authorization", "Bearer t")
      .send({
        query: q,
        variables,
      });

  it("returns the current user", async () => {
    as("author");
    query.mockResolvedValue(user);
    const res = await gql("{ me { id email role } }");
    expect(res.body).toEqual({
      data: {
        me: {
          id: "5",
          email: "a@b.c",
          role: "editor",
        },
      },
    });
    expect(query).toHaveBeenCalledWith(new GetUserQuery(1n));
  });

  it("lists users as a page for admins", async () => {
    as("admin");
    query.mockResolvedValue({
      items: [
        user,
      ],
      total: 1,
    });
    const res = await gql(
      "{ users(role: editor, limit: 5) { items { id } meta { total limit offset } } }",
    );
    expect(res.body.data.users).toEqual({
      items: [
        {
          id: "5",
        },
      ],
      meta: {
        total: 1,
        limit: 5,
        offset: 0,
      },
    });
    expect(query).toHaveBeenCalledWith(
      new ListUsersQuery(
        {
          role: "editor",
        },
        5,
        0,
      ),
    );
  });

  it("forbids admin queries to other roles", async () => {
    as("editor");
    const res = await gql("{ users { items { id } } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a bad limit with the REST error code", async () => {
    as("admin");
    const res = await gql("{ users(limit: 500) { items { id } } }");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
  });

  it("changes a role and returns the user", async () => {
    as("admin");
    query.mockResolvedValue(user);
    const res = await gql(
      'mutation { changeUserRole(id: "5", role: admin) { id } }',
    );
    expect(res.body).toEqual({
      data: {
        changeUserRole: {
          id: "5",
        },
      },
    });
    expect(command).toHaveBeenCalledWith(
      new ChangeUserRoleCommand(5n, "admin", {
        userId: 1n,
        ip: "127.0.0.1",
        userAgent: undefined,
      }),
    );
  });

  it("rejects an invalid id", async () => {
    as("admin");
    const res = await gql('mutation { deleteUser(id: "abc") }');
    expect(res.body.errors[0].extensions.status).toBe(400);
    expect(command).not.toHaveBeenCalled();
  });
});
