import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    alias: {
      "@alcyone-labs/arg-parser": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
});
