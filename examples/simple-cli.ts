#!/usr/bin/env bun
/**
 * Simple CLI Example - demonstrates basic ArgParser usage
 *
 * This example shows how to create a simple CLI tool with:
 * - Basic flags with different types
 * - Mandatory and optional flags
 * - Default values
 * - Enum validation
 * - Help generation
 *
 * Usage:
 *   bun examples/simple-cli.ts --env production --port 8080 --verbose
 *   bun examples/simple-cli.ts --help
 */
import { ArgParser } from "../src";

// Create a new ArgParser instance with modern patterns
const parser = new ArgParser({
  appName: "Simple CLI Example",
  appCommandName: "simple-cli",
  description: "A simple CLI tool demonstrating ArgParser features",
  handler: async (ctx) => {
    console.log("🚀 Simple CLI Example");
    console.log("===================");
    console.log(`Environment: ${ctx.args.environment}`);
    console.log(`Port: ${ctx.args.port}`);
    console.log(`Verbose: ${ctx.args.verbose ? "enabled" : "disabled"}`);
    console.log(`Output: ${ctx.args.output}`);

    if (ctx.args.files && ctx.args.files.length > 0) {
      console.log(`Files to process: ${ctx.args.files.join(", ")}`);
    } else {
      console.log("No files specified");
    }

    if (ctx.args.verbose) {
      console.log("\n🔍 Verbose mode enabled - showing detailed information");
      console.log("All parsed arguments:", JSON.stringify(ctx.args, null, 2));
    }

    console.log("\n✅ CLI execution completed successfully!");

    return {
      success: true,
      environment: ctx.args.environment,
      port: ctx.args.port,
      verbose: ctx.args.verbose,
      files: ctx.args.files || [],
      output: ctx.args.output
    };
  },
})
.addFlags([
  // String flag with enum validation
  {
    name: "environment",
    description: "Target environment for deployment",
    options: ["--env", "-e"],
    type: "string",
    mandatory: true,
    enum: ["development", "staging", "production"],
  },
  // Number flag with default value
  {
    name: "port",
    description: "Port number to use",
    options: ["--port", "-p"],
    type: "number",
    defaultValue: 3000,
  },
  // Boolean flag (flag-only)
  {
    name: "verbose",
    description: "Enable verbose logging",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
  },
  // String flag that allows multiple values
  {
    name: "files",
    description: "Files to process",
    options: ["--file", "-f"],
    type: "string",
    allowMultiple: true,
  },
  // Optional string flag
  {
    name: "output",
    description: "Output directory",
    options: ["--output", "-o"],
    type: "string",
    defaultValue: "./dist",
  },
]);

// Export the CLI for testing
export default parser;

// Execute the CLI with command line arguments
// The --s-enable-fuzzy system flag automatically prevents execution during fuzzy testing
parser.parse(process.argv.slice(2));
