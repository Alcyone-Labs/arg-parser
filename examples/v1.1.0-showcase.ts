#!/usr/bin/env bun

/**
 * ArgParser v1.1.0 Feature Showcase - File Search & Processing Tool
 *
 * This example demonstrates all the new features in version 1.1.0 with REAL functionality:
 * 1. System flags (--s-*): --s-debug, --s-debug-print, --s-with-env, --s-save-to-env
 * 2. Environment variable loading from multiple file formats (.env, .yaml, .json, .toml)
 * 3. Configuration export to multiple file formats
 * 4. MCP server integration with multiple transport types
 * 5. Enhanced error handling and validation
 * 6. Real file search using fzf and file processing capabilities
 */

import { ArgParser } from "../src";
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename, resolve } from "node:path";
import { spawn } from "node:child_process";

// Create sample environment files for demonstration in examples directory
const examplesDir = "examples";
const envFiles = {
  ".env": "SEARCH_DIR=./src\nMAX_RESULTS=50\nDEFAULT_EXTENSIONS=ts,js,md",
  "config.yaml": "search_dir: ./src\nmax_results: 50\ndefault_extensions: ts,js,md",
  "config.json": '{"search_dir": "./src", "max_results": 50, "default_extensions": "ts,js,md"}',
  "config.toml": "search_dir = \"./src\"\nmax_results = 50\ndefault_extensions = \"ts,js,md\""
};

// Ensure examples directory exists and write sample files
if (!existsSync(examplesDir)) {
  mkdirSync(examplesDir, { recursive: true });
}

Object.entries(envFiles).forEach(([filename, content]) => {
  writeFileSync(join(examplesDir, filename), content);
});

// File search functionality using fzf
async function searchFiles(query: string, directory: string, extensions?: string, maxResults: number = 20): Promise<{
  files: string[];
  error?: string;
  commandExecuted?: string;
}> {
  const resolvedDir = resolve(directory);

  // Build find command
  const findArgs = [resolvedDir, "-type", "f"];

  if (extensions) {
    const exts = extensions.split(",").map(e => e.trim()).filter(e => e);
    if (exts.length > 0) {
      findArgs.push("(");
      exts.forEach((ext, i) => {
        if (i > 0) findArgs.push("-o");
        findArgs.push("-name", `*.${ext.replace(/^\./, "")}`);
      });
      findArgs.push(")");
    }
  }

  return new Promise((resolve) => {
    const findProcess = spawn("find", findArgs);
    const fzfProcess = spawn("fzf", [`--filter=${query}`, "--no-sort"]);

    let output = "";
    let error = "";

    findProcess.stdout?.pipe(fzfProcess.stdin);

    fzfProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });

    fzfProcess.stderr?.on("data", (data) => {
      error += data.toString();
    });

    fzfProcess.on("close", () => {
      const files = output.split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0)
        .slice(0, maxResults);

      resolve({
        files,
        error: error || undefined,
        commandExecuted: `find ${findArgs.join(" ")} | fzf --filter=${query}`
      });
    });

    fzfProcess.on("error", () => {
      resolve({
        files: [],
        error: "fzf not found. Please install fzf: brew install fzf",
        commandExecuted: `find ${findArgs.join(" ")} | fzf --filter=${query}`
      });
    });
  });
}

// File analysis functionality
function analyzeFiles(files: string[]): {
  totalFiles: number;
  byExtension: Record<string, number>;
  totalSize: number;
  largestFile: { path: string; size: number } | null;
} {
  let totalSize = 0;
  let largestFile: { path: string; size: number } | null = null;
  const byExtension: Record<string, number> = {};

  files.forEach(file => {
    try {
      const stats = statSync(file);
      const ext = extname(file).toLowerCase() || "no-extension";

      totalSize += stats.size;
      byExtension[ext] = (byExtension[ext] || 0) + 1;

      if (!largestFile || stats.size > largestFile.size) {
        largestFile = { path: file, size: stats.size };
      }
    } catch (err) {
      // File might not exist or be accessible
    }
  });

  return {
    totalFiles: files.length,
    byExtension,
    totalSize,
    largestFile
  };
}

// Create the main CLI with MCP support
const cli = ArgParser.withMcp({
  appName: "File Search & Analysis Tool",
  appCommandName: "file-tool",
  description: "A practical file search and analysis tool showcasing ArgParser v1.1.0 features",
  handler: async () => {
    // Show help and examples when no sub-command is provided
    console.log(`
🔍 File Search & Analysis Tool - ArgParser v1.1.0 Showcase
===========================================================

This is a REAL, functional CLI tool that demonstrates ArgParser v1.1.0 features:

📋 System Flags (available on any command):
  --s-debug          Enable debug mode for detailed logging
  --s-debug-print    Export complete parser configuration to JSON file
  --s-with-env FILE  Load configuration from file (supports .env, .yaml, .json, .toml)
  --s-save-to-env FILE  Export current configuration to file (supports .env, .yaml, .json, .toml)

🔍 Commands:
  search    - Search for files using fuzzy matching (requires fzf)
  analyze   - Analyze files and show statistics
  serve     - Start as MCP server for AI assistants

📝 Example Usage:

1. Search for TypeScript files:
   bun examples/v1.1.0-showcase.ts search --query "parser" --extensions "ts,js"

2. Analyze files in src directory:
   bun examples/v1.1.0-showcase.ts analyze --directory ./src

3. Load search config from file:
   bun examples/v1.1.0-showcase.ts search --query "test" --s-with-env examples/config.yaml

4. Save current search config:
   bun examples/v1.1.0-showcase.ts search --query "example" --s-save-to-env examples/my-search.yaml

5. Start MCP server for AI assistants (uses default multiple transports):
   bun examples/v1.1.0-showcase.ts serve

6. Start MCP server with custom transports (overrides defaults):
   bun examples/v1.1.0-showcase.ts serve --transports '[{"type":"sse","port":4000}]'

7. Start MCP server with multiple custom transports:
   bun examples/v1.1.0-showcase.ts serve --transports '[{"type":"stdio"},{"type":"sse","port":4001}]'

8. Debug search process:
   bun examples/v1.1.0-showcase.ts search --query "showcase" --s-debug

Use --help with any command for detailed information!
`);

    return { success: true, message: "Use a sub-command or --help for more information" };
  },
})
// No flags at root level - each sub-command has its own flags
.addSubCommand({
  name: "search",
  description: "Search for files using fuzzy matching (requires fzf)",
  handler: async (ctx) => {
    console.log("🔍 Searching for files...");

    const query = String(ctx.args["query"]);
    const directory = String(ctx.args["directory"] || process.env["SEARCH_DIR"] || ".");
    const extensions = ctx.args["extensions"] ? String(ctx.args["extensions"]) : process.env["DEFAULT_EXTENSIONS"];
    const maxResults = Number(ctx.args["max-results"]) || parseInt(process.env["MAX_RESULTS"] || "20");

    console.log(`Query: "${query}"`);
    console.log(`Directory: ${directory}`);
    if (extensions) console.log(`Extensions: ${extensions}`);
    console.log(`Max results: ${maxResults}`);

    const result = await searchFiles(query, directory, extensions, maxResults);

    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
      return { success: false, error: result.error };
    }

    if (result.files.length === 0) {
      console.log("📭 No files found matching your query.");
      return { success: true, files: [], count: 0 };
    }

    console.log(`\n📁 Found ${result.files.length} files:`);
    result.files.forEach((file, i) => {
      console.log(`${i + 1}. ${file}`);
    });

    if (ctx.args["verbose"]) {
      console.log(`\n🔧 Command executed: ${result.commandExecuted}`);
    }

    return {
      success: true,
      files: result.files,
      count: result.files.length,
      query,
      directory,
      extensions
    };
  },
  parser: new ArgParser({}, [
    {
      name: "query",
      description: "Search query for fuzzy matching",
      options: ["--query", "-q"],
      type: "string",
      mandatory: true,
    },
    {
      name: "directory",
      description: "Directory to search in (can be set via SEARCH_DIR env var)",
      options: ["--directory", "-d"],
      type: "string",
      defaultValue: ".",
    },
    {
      name: "extensions",
      description: "Comma-separated file extensions to include (e.g., ts,js,md)",
      options: ["--extensions", "-e"],
      type: "string",
    },
    {
      name: "max-results",
      description: "Maximum number of results to return",
      options: ["--max-results", "-m"],
      type: "number",
      defaultValue: 20,
    },
    {
      name: "verbose",
      description: "Show detailed output including command executed",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
    },
  ]),
})
.addSubCommand({
  name: "analyze",
  description: "Analyze files and show statistics",
  handler: async (ctx) => {
    console.log("📊 Analyzing files...");

    const directory = String(ctx.args["directory"] || process.env["SEARCH_DIR"] || ".");
    const extensions = ctx.args["extensions"] ? String(ctx.args["extensions"]) : process.env["DEFAULT_EXTENSIONS"];
    const includeHidden = Boolean(ctx.args["include-hidden"]);

    console.log(`Directory: ${directory}`);
    if (extensions) console.log(`Extensions: ${extensions}`);
    console.log(`Include hidden: ${includeHidden}`);

    // First, get all files in directory
    const allFiles: string[] = [];

    try {
      const scanDirectory = (dir: string) => {
        const items = readdirSync(dir);
        items.forEach(item => {
          if (!includeHidden && item.startsWith('.')) return;

          const fullPath = join(dir, item);
          try {
            const stats = statSync(fullPath);
            if (stats.isDirectory()) {
              scanDirectory(fullPath);
            } else if (stats.isFile()) {
              if (extensions) {
                const ext = extname(item).slice(1);
                const allowedExts = extensions.split(',').map(e => e.trim());
                if (allowedExts.includes(ext)) {
                  allFiles.push(fullPath);
                }
              } else {
                allFiles.push(fullPath);
              }
            }
          } catch (err) {
            // Skip files we can't access
          }
        });
      };

      scanDirectory(resolve(directory));

      if (allFiles.length === 0) {
        console.log("📭 No files found to analyze.");
        return { success: true, files: [], analysis: null };
      }

      const analysis = analyzeFiles(allFiles);

      console.log(`\n📈 Analysis Results:`);
      console.log(`Total files: ${analysis.totalFiles}`);
      console.log(`Total size: ${(analysis.totalSize / 1024).toFixed(2)} KB`);

      console.log(`\n📋 Files by extension:`);
      Object.entries(analysis.byExtension)
        .sort(([,a], [,b]) => b - a)
        .forEach(([ext, count]) => {
          console.log(`  ${ext}: ${count} files`);
        });

      if (analysis.largestFile) {
        console.log(`\n📏 Largest file: ${basename(analysis.largestFile.path)} (${(analysis.largestFile.size / 1024).toFixed(2)} KB)`);
      }

      return {
        success: true,
        files: allFiles,
        analysis,
        directory,
        extensions
      };

    } catch (error: any) {
      console.error(`❌ Error analyzing directory: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
  parser: new ArgParser({}, [
    {
      name: "directory",
      description: "Directory to analyze (can be set via SEARCH_DIR env var)",
      options: ["--directory", "-d"],
      type: "string",
      defaultValue: ".",
    },
    {
      name: "extensions",
      description: "Comma-separated file extensions to include (e.g., ts,js,md)",
      options: ["--extensions", "-e"],
      type: "string",
    },
    {
      name: "include-hidden",
      description: "Include hidden files and directories",
      options: ["--include-hidden", "-h"],
      type: "boolean",
      flagOnly: true,
    },
  ]),
})
// Add MCP server sub-command with multiple transport support
.addMcpSubCommand("serve", {
  name: "file-search-mcp-server",
  version: "1.1.0",
  description: "File search and analysis tools for AI assistants. Provides fuzzy file search and directory analysis capabilities.",
}, {
  // Configure default transports - used when no CLI flags are provided
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001, path: "/search" },
    { type: "streamable-http", port: 3002, path: "/mcp", host: "localhost" }
  ],
  toolOptions: {
    includeSubCommands: true,
    toolNamePrefix: "file-"
  }
})
// MCP server is now configured with elegant default transports above

// Export the CLI for testing
export default cli;

// Execute the CLI
// The --s-enable-fuzzy system flag automatically prevents execution during fuzzy testing
async function main() {
  try {
    const result = await cli.parse(process.argv.slice(2));

    if (result.$error) {
      console.error(`❌ Error: ${result.$error.message}`);
      process.exit(1);
    }

    // Don't print result for MCP server commands
    if (result.$commandChain?.includes("serve")) {
      return;
    }

    if (result.handlerResponse && typeof result.handlerResponse === 'object') {
      console.log("\n✅ Command completed successfully");
      if (process.env["NODE_ENV"] === "development" || process.env["DEBUG"]) {
        console.log("📋 Full result:", JSON.stringify(result.handlerResponse, null, 2));
      }
    }
  } catch (error: any) {
    console.error(`💥 Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
