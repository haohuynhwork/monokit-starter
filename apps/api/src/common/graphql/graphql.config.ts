import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import type { Request, Response } from "express";
import { API_PREFIX } from "../http/setup/api-prefix.js";
import { docsEnabled } from "../http/setup/docs.js";

// One schema at [API_PREFIX]/graphql, built from each context's resolvers
// (<context>/graphql/). Resolvers call the same QueryBus as the controllers.
export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  path: "/graphql",
  useGlobalPrefix: true,
  // Code first; kept in memory. Pass a path to write schema.graphql (codegen).
  autoSchemaFile: true,
  sortSchema: true,
  // Explorer and introspection follow the REST docs switch
  // The explorer page doesn't add the global prefix to its endpoint URL
  graphiql: docsEnabled() && {
    url: `${API_PREFIX}/graphql`,
  },
  introspection: docsEnabled(),
  // Guards and requestOf() read the Express request from here
  context: ({ req, res }: { req: Request; res: Response }) => ({
    req,
    res,
  }),
};
