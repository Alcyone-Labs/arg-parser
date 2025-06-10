#!/usr/bin/env node
/**
 * Simple CLI Example - demonstrates basic ArgParser usage
 * 
 * This example shows how to create a simple CLI tool with:
 * - Basic flags with different types
 * - Mandatory and optional flags
 * - Default values
 * - Enum validation
 * - Help generation
 */

import { ArgParser } from "../dist/index.js";

// Create a new ArgParser instance
const parser = new ArgParser(
  {
    appName: "Simple CLI Example",
    appCommandName: "simple-cli",
    description: "A simple CLI tool demonstrating ArgParser features",
  },
  [
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
      defaultValue: false,
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
  ]
);

// Parse command line arguments
const args = parser.parse(process.argv.slice(2));

// Use the parsed arguments
console.log("🚀 Simple CLI Example");
console.log("===================");
console.log(`Environment: ${args.environment}`);
console.log(`Port: ${args.port}`);
console.log(`Verbose: ${args.verbose ? "enabled" : "disabled"}`);
console.log(`Output: ${args.output}`);

if (args.files && args.files.length > 0) {
  console.log(`Files to process: ${args.files.join(", ")}`);
} else {
  console.log("No files specified");
}

if (args.verbose) {
  console.log("\n📝 Verbose mode enabled - showing detailed information");
  console.log("All parsed arguments:", JSON.stringify(args, null, 2));
}

console.log("\n✅ CLI execution completed successfully!");
