import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  platform: "node",
  target: "node22.18",
  format: "esm",
  dts: true,
  clean: true,
  hash: false,
  // Apps provide Nest (peer) and the db client; bundling either would give
  // two copies and break dependency injection / the shared pool
  external: [
    /^@nestjs\//,
    /^@package\//,
  ],
});
