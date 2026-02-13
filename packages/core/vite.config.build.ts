import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  const buildFormat = process.env.VITE_BUILD_FORMAT || "es";
  const minifyBuild = process.env.VITE_MINIFY_BUILD === "true";

  let libFileName: string;

  if (buildFormat === "es") {
    libFileName = minifyBuild ? "index.min.mjs" : "index.mjs";
  } else if (buildFormat === "cjs") {
    libFileName = "index.cjs";
  } else {
    throw new Error(`Unsupported VITE_BUILD_FORMAT: ${buildFormat}. Expected 'es' or 'cjs'.`);
  }

  const config: UserConfig = {
    plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
    build: {
      outDir: "dist",
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: "src/index.ts",
        name: "ArgParser",
        formats: [buildFormat as "es" | "cjs"],
        fileName: () => libFileName,
      },
      rollupOptions: {
        external: [
          "@alcyone-labs/simple-chalk",
          "@clack/prompts",
          "magic-regexp",
          "zod",
          /^node:/,
          "path",
          "fs",
          "os",
          "crypto",
          "process",
          "events",
          "url",
          "util",
        ],
        output: {
          manualChunks: undefined,
          inlineDynamicImports: true,
        },
      },
      minify: buildFormat === "es" && minifyBuild ? "esbuild" : false,
    },
  };

  return config;
});
