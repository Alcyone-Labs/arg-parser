import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.dev.json"] })],
  test: {
    globals: true,
    testTimeout: 10000,
    fileParallelism: true,
    pool: "forks",
    execArgv: ["--expose-gc"],
    isolate: false,
    maxWorkers: 1,
    vmMemoryLimit: "300Mb",
    include: ["./tests/**/*.test.ts"],
    exclude: (() => {
      const base = [
        "**/node_modules/**",
        "**/dist/**",
        "**/examples/**",
        "**/fixtures/**",
        "**/bun/**", // TUI tests require Bun runtime (see tests/tui/bun/)
      ];
      if (!process.env.VITEST_INCLUDE_INTEGRATION) base.push("**/integration/**");
      return base;
    })(),
    name: "Alcyone Labs ArgParser",
    teardownTimeout: 3000,
    retry: 1,
    watch: false,
    ...(process.env.VITEST_INCLUDE_INTEGRATION
      ? {
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        }
      : {}),
  },
});
