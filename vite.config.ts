/// <reference types="vitest" />
import { defineConfig, type UserConfig } from "vite";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig as defineTestConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => {
  const root = "./";

  if (command === "build") {
    // Configuration for library builds (`vite build`)

    const buildFormat = process.env.VITE_BUILD_FORMAT || "es"; // Expect 'es' or 'cjs'
    const minifyBuild = process.env.VITE_MINIFY_BUILD === "true";
    const buildEntry = process.env.VITE_BUILD_ENTRY || "index"; // "index" or "tui"

    // Determine entry point
    const entryPath = buildEntry === "tui" ? "src/tui/index.ts" : "src/index.ts";
    const libraryName = buildEntry === "tui" ? "ArgParserTui" : "ArgParser";

    let libFileName: string;

    if (buildFormat === "es") {
      if (buildEntry === "tui") {
        libFileName = "tui.mjs";
      } else {
        libFileName = minifyBuild ? "index.min.mjs" : "index.mjs";
      }
    } else if (buildFormat === "cjs") {
      // Typically, CJS builds for libraries are not minified.
      // The VITE_MINIFY_BUILD flag will be ignored for CJS.
      libFileName = buildEntry === "tui" ? "tui.cjs" : "index.cjs";
    } else {
      throw new Error(
        `Unsupported VITE_BUILD_FORMAT: ${buildFormat}. Expected 'es' or 'cjs'.`,
      );
    }

    const esbuildMinifyOptions =
      buildFormat === "es" && minifyBuild
        ? {
            legalComments: "none" as const, // Remove all comments
            minifyIdentifiers: true,
            minifySyntax: true,
            minifyWhitespace: true,
            // treeShaking: true, // esbuild enables this by default for builds
          }
        : undefined;

    // Use vite-plugin-solid for TUI builds to properly compile SolidJS JSX
    const plugins =
      buildEntry === "tui"
        ? [
            solid({ solid: { generate: "ssr", hydratable: false } }),
            tsconfigPaths({ projects: ["./tsconfig.json"] }),
          ]
        : [tsconfigPaths({ projects: ["./tsconfig.json"] })];

    const buildConfig: UserConfig = {
      root,
      plugins,
      build: {
        outDir: "dist",
        // Set to false because we run `pnpm clean` first, and then multiple vite build commands.
        // If true, each vite build would wipe the output of the previous one.
        emptyOutDir: false,
        sourcemap: true,
        lib: {
          entry: entryPath,
          name: libraryName, // A global variable name for UMD/IIFE, not critical for ESM/CJS
          formats: [buildFormat as "es" | "cjs"],
          fileName: () => libFileName,
        },
        rollupOptions: {
          external: [
            // Third-party dependencies
            "chalk",
            "magic-regexp",
            "zod",
            "dotenv",
            "js-yaml",
            "@iarna/toml",
            "adm-zip",
            // MCP SDK and all its subpaths + transitive deps
            /^@modelcontextprotocol\/sdk/,
            /^@hono\//,
            /^hono/,
            "express",
            "tsdown",
            "get-tsconfig",
            "@alcyone-labs/simple-mcp-logger",
            // TUI dependencies - externalize to avoid bundling WASM
            /^@opentui\//,
            /^solid-js/,
            // Node.js built-in modules
            "node:fs",
            "node:path",
            "node:crypto",
            "node:process",
            "node:events",
            "node:http",
            "node:http2",
            "node:net",
            "node:zlib",
            "node:stream",
            "node:os",
            "node:readline",
            "node:tty",
            "http2",
            "path",
            "fs",
            "os",
            "tty",
            "readline",
            "crypto",
            "process",
            "events",
            "http",
            "net",
            "zlib",
            "url",
            "node:url",
            "querystring",
            "stream",
            "util",
            "async_hooks",
          ],
          output: {
            // Prevent code splitting for library builds
            manualChunks: undefined,
            inlineDynamicImports: true,
          },
        },
        minify: buildFormat === "es" && minifyBuild ? "esbuild" : false,
        ...(esbuildMinifyOptions && { esbuild: esbuildMinifyOptions }),
      },
    };
    return buildConfig;
  } else {
    // Configuration for Vitest (`vitest` or `vite serve` in test mode)
    const vitestSpecificConfig = defineTestConfig({
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
          ];
          // Exclude slow integration tests by default unless explicitly enabled
          if (!process.env.VITEST_INCLUDE_INTEGRATION)
            base.push("**/integration/**");
          return base;
        })(),
        name: "Alcyone Labs ArgParser",
        // Add teardown timeout to ensure processes are cleaned up
        teardownTimeout: 3000, // Reduced teardown timeout
        // Retry failed tests once in case of flaky issues
        retry: 1,
        // Handle @opentui packages (they have .scm tree-sitter files that Node.js can't load)
        deps: {
          // Process @opentui packages as ESM with special handling
          inline: [/@opentui\/.*/],
        },
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

    const mergedTestConfig: UserConfig = {
      root,
      plugins: vitestSpecificConfig.plugins,
      test: vitestSpecificConfig.test,
    };
    return mergedTestConfig;
  }
});
