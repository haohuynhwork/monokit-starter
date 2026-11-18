import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // One copy of graphql: Nest loads the CommonJS build, so files compiled by
    // Vite must too, or scalars like JSONScalar fail its instanceof checks
    alias: [
      {
        find: /^graphql$/,
        replacement: require.resolve("graphql"),
      },
    ],
  },
  test: {
    globals: true,
    root: "./",
    include: [
      "**/*.e2e-spec.ts",
    ],
  },
});
