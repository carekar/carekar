import { defineConfig } from "tsup";

// Bundles src/ plus the shared ../lib files (plans, validation, types) into dist/index.js.
// npm packages stay external and are loaded from node_modules at runtime.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,
});
