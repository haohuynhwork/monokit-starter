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
});
