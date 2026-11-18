import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
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
      "**/*.spec.ts",
    ],
  },
});
