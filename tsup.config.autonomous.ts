// tsup configuration for autonomous DXT builds
// This creates a completely self-contained server file

import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['server/index.ts'], // Use TypeScript entry point
  outDir: 'server',
  format: ['esm'], // Use ESM for .mjs output
  outExtension: () => ({ js: '.autonomous.mjs' }),
  target: 'node18',
  bundle: true,
  splitting: false, // Disable code splitting for single autonomous file
  noExternal: ['@alcyone-labs/arg-parser', '@modelcontextprotocol/sdk', 'zod', 'js-yaml', 'smol-toml', 'dotenv'],
  minify: false,
  sourcemap: false,
  clean: false, // Don't clean server directory
  // Alias chalk to SimpleChalk for autonomous builds
  alias: {
    'chalk': path.resolve(process.cwd(), 'node_modules/@alcyone-labs/arg-parser/dist/SimpleChalk.mjs')
  },
  external: [
    // Node.js built-ins only - everything else should be bundled for true autonomy
    'stream', 'fs', 'path', 'url', 'util', 'events', 'child_process', 'os', 'tty', 'process', 'crypto', 'http', 'https', 'net', 'zlib'
    // All npm packages are now bundled via noExternal for true autonomous builds
  ],
  platform: 'node',
  esbuildOptions: (options) => {
    // Don't add banner here - we'll add it manually after build
    // Handle dynamic requires and ensure proper ESM handling
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"production"'
    };
    // Ensure proper ESM format
    options.format = 'esm';
  },
  // Custom plugin to remove duplicate shebangs from source files
  esbuildPlugins: [
    {
      name: 'remove-duplicate-shebang',
      setup(build) {
        build.onLoad({ filter: /\.(js|mjs|ts)$/ }, async (args) => {
          const fs = await import('fs');
          const contents = await fs.promises.readFile(args.path, 'utf8');

          // If file starts with shebang, remove it since we'll add it via banner
          if (contents.startsWith('#!/usr/bin/env node')) {
            return {
              contents: contents.replace(/^#!\/usr\/bin\/env node\n?/, ''),
              loader: args.path.endsWith('.ts') ? 'ts' : 'js'
            };
          }

          return null; // Let esbuild handle normally
        });
      }
    }
  ]
});
