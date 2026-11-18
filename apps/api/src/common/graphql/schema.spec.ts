import { globSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Type } from "@nestjs/common";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { printSchema } from "graphql";

// Builds one schema from every context's resolvers: catches clashing type
// names and broken types that per-resolver specs (subsets) don't see
describe("GraphQL schema", () => {
  it("builds from all resolvers", async () => {
    const src = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const resolvers: Type[] = [];
    for (const file of globSync("*/graphql/*.resolver.ts", {
      cwd: src,
    })) {
      const mod = (await import(resolve(src, file))) as Record<string, unknown>;
      resolvers.push(
        ...Object.values(mod).filter(
          (v): v is Type =>
            typeof v === "function" && v.name.endsWith("Resolver"),
        ),
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLSchemaBuilderModule,
      ],
    }).compile();
    await moduleRef.init();
    const schema = await moduleRef.get(GraphQLSchemaFactory).create(resolvers);
    expect(resolvers.length).toBeGreaterThan(15);
    expect(printSchema(schema)).toContain("type Query");
  });
});
