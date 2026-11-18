import { defineConfig } from "tsdown";

// Types only, shared by the api and web
export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  platform: "neutral",
  target: "es2022",
  format: "esm",
  dts: true,
  clean: true,
  hash: false,
});
