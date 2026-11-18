import { defineConfig } from "tsdown";

// Countries and subdivisions, shared by the api and web; the data is bundled
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
