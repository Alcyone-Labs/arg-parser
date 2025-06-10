/// <reference types="vitest" />
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig as defineTestConfig } from "vitest/config";

export default defineConfig(({ command }) => {
  const root = "./";

  if (command === "build") {
    // Configuration for library builds (`vite build`)

    const buildFormat = process.env.VITE_BUILD_FORMAT || "es"; // Expect 'es' or 'cjs'
    const minifyBuild = process.env.VITE_MINIFY_BUILD === "true";

    let libFileName: string;

    if (buildFormat === "es") {
      libFileName = minifyBuild ? "index.min.mjs" : "index.mjs";
    } else if (buildFormat === "cjs") {
      // Typically, CJS builds for libraries are not minified.
      // The VITE_MINIFY_BUILD flag will be ignored for CJS.
      libFileName = "index.cjs";
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

    const buildConfig: UserConfig = {
      root,
      plugins: [
        tsconfigPaths({ projects: ["./tsconfig.json"] }), // Use main tsconfig.json for builds
      ],
      build: {
        outDir: "dist",
        // Set to false because we run `pnpm clean` first, and then multiple vite build commands.
        // If true, each vite build would wipe the output of the previous one.
        emptyOutDir: false,
        sourcemap: true,
        lib: {
          entry: "src/index.ts",
          name: "ArgParser", // A global variable name for UMD/IIFE, not critical for ESM/CJS
          formats: [buildFormat as "es" | "cjs"],
          fileName: () => libFileName,
        },
        rollupOptions: {
          external: ["chalk", "magic-regexp", "zod"],
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
        include: ["./tests/**/*.test.ts"],
        name: "Alcyone Labs ArgParser",
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
