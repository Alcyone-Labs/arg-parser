/// <reference types="tsdown" />

import { defineConfig } from "tsdown/config";

export default defineConfig({
  outDir: "dxt",
  format: ["esm", "module"],
  target: "node22",
  // unbundle: true,
  noExternal: () => true,
  minify: false,
  sourcemap: false,
  clean: false,
  alias: {
    chalk: "@alcyone-labs/simple-chalk",
  },
  external: [
    // Node.js built-ins only - everything else should be bundled for true autonomy
    "stream",
    "fs",
    "path",
    "url",
    "util",
    "events",
    "child_process",
    "os",
    "tty",
    "process",
    "crypto",
    "http",
    "https",
    "net",
    "zlib",
  ],
  platform: "node",
  plugins: [],
});
