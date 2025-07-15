#!/usr/bin/env bun

/**
 * Getting Started with ArgParser v2.0.0
 *
 * This is a complete, executable CLI that demonstrates the new unified tool architecture.
 * It's a file processing tool that showcases:
 * - Unified tools that work as both CLI subcommands and MCP tools
 * - Automatic console hijacking for MCP safety
 * - Environment variable integration
 * - DXT package generation
 * - Modern best practices
 *
 * Usage:
 *   bun examples/getting-started.ts process --input file.txt --output result.txt
 *   bun examples/getting-started.ts convert --input file.txt --format json
 *   bun examples/getting-started.ts --s-mcp-serve  # Start MCP server
 *   bun examples/getting-started.ts --s-build-dxt getting-started.ts  # Generate DXT package
 *   bun examples/getting-started.ts --help
 */

import { ArgParser } from "../src";

// Create a complete CLI with unified tools (works as both CLI and MCP)
const cli = ArgParser.withMcp({
  appName: "File Processor",
  appCommandName: "file-proc",
  description: "A file processing tool demonstrating ArgParser v2.0.0 unified architecture",
  mcp: {
    serverInfo: {
      name: "file-processor-mcp",
      version: "2.0.0",
      description: "File Processing MCP Server"
    }
  }
})
.addTool({
  name: "process",
  description: "Process a file with various options",
  flags: [
    // String flag (mandatory)
    {
      name: "input",
      description: "Input file path",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true,
    },
    // String flag with default value
    {
      name: "output",
      description: "Output file path",
      options: ["--output", "-o"],
      type: "string",
      defaultValue: "output.txt",
    },
    // String flag with enum validation
    {
      name: "format",
      description: "Output format",
      options: ["--format", "-f"],
      type: "string",
      enum: ["json", "xml", "csv", "yaml"],
      defaultValue: "json",
    },
    // Boolean flag (flag-only)
    {
      name: "verbose",
      description: "Enable verbose output",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
    },
    // Array flag (multiple values)
    {
      name: "tags",
      description: "Tags to apply (can be used multiple times)",
      options: ["--tag"],
      type: "string",
      allowMultiple: true,
    },
  ],
  handler: async (ctx) => {
    // Console output is automatically safe in MCP mode!
    console.log("🔄 Processing file with configuration:");
    console.log(`   Input: ${ctx.args.input}`);
    console.log(`   Output: ${ctx.args.output || "stdout"}`);
    console.log(`   Format: ${ctx.args.format}`);
    console.log(`   Verbose: ${ctx.args.verbose ? "enabled" : "disabled"}`);

    if (ctx.args.tags && ctx.args.tags.length > 0) {
      console.log(`   Tags: ${ctx.args.tags.join(", ")}`);
    }

    // Simulate file processing
    console.log("✅ File processed successfully!");

    return {
      success: true,
      processed: ctx.args.input,
      output: ctx.args.output || "stdout",
      format: ctx.args.format,
      tags: ctx.args.tags || []
    };
  },
})
.addTool({
  name: "convert",
  description: "Convert file to different format",
  flags: [
    {
      name: "input",
      description: "Input file to convert",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true,
    },
    {
      name: "format",
      description: "Target format",
      options: ["--format", "-f"],
      type: "string",
      enum: ["json", "yaml", "xml", "csv"],
      defaultValue: "json",
    },
    {
      name: "compress",
      description: "Compress output",
      options: ["--compress", "-z"],
      type: "boolean",
      flagOnly: true,
    },
  ],
  handler: async (ctx) => {
    // Console output automatically redirected in MCP mode
    console.log("🔄 Converting file...");
    console.log(`   Input: ${ctx.args.input}`);
    console.log(`   Format: ${ctx.args.format}`);
    console.log(`   Compress: ${ctx.args.compress ? "enabled" : "disabled"}`);

    // Simulate conversion
    console.log("✅ File converted successfully!");

    return {
      action: "convert",
      input: ctx.args.input,
      format: ctx.args.format,
      compressed: ctx.args.compress
    };
  },
})
.addTool({
  name: "analyze",
  description: "Analyze file content",
  flags: [
    {
      name: "file",
      description: "File to analyze",
      options: ["--file"],
      type: "string",
      mandatory: true,
    },
    {
      name: "type",
      description: "Analysis type",
      options: ["--type", "-t"],
      type: "string",
      enum: ["basic", "detailed", "statistical"],
      defaultValue: "basic",
    },
  ],
  handler: async (ctx) => {
    // Console output automatically safe in MCP mode
    console.log("📊 Analyzing file...");
    console.log(`   File: ${ctx.args.file}`);
    console.log(`   Type: ${ctx.args.type}`);

    // Simulate analysis
    const stats = {
      lines: Math.floor(Math.random() * 1000) + 100,
      words: Math.floor(Math.random() * 5000) + 500,
      size: Math.floor(Math.random() * 10000) + 1000
    };

    console.log("✅ Analysis complete!");
    console.log(`   Lines: ${stats.lines}`);
    console.log(`   Words: ${stats.words}`);
    console.log(`   Size: ${stats.size} bytes`);

    return {
      action: "analyze",
      file: ctx.args.file,
      type: ctx.args.type,
      stats
    };
  },
});

// Export the CLI for testing
export default cli;

// Run the CLI when executed directly
// The --s-enable-fuzzy system flag automatically prevents execution during fuzzy testing
async function main() {
  try {
    await cli.parse(process.argv.slice(2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  main();
}
