#!/usr/bin/env bun

/**
 * Example: DXT Package Generation
 * 
 * This example demonstrates how to use the --s-save-DXT system flag
 * to generate Desktop Extension (DXT) packages for MCP servers.
 * 
 * DXT files are zip archives that can be installed in compatible
 * applications like Claude Desktop for single-click MCP server setup.
 */

import { ArgParser } from '../src/ArgParser';

// Create a CLI with MCP server capabilities
const cli = ArgParser.withMcp({
  appName: "File Processor",
  appCommandName: "file-processor",
  description: "A powerful file processing tool with MCP server capabilities",
  handler: async (ctx) => {
    console.log(`Processing file: ${ctx.args.input}`);
    console.log(`Output format: ${ctx.args.format}`);
    
    return {
      success: true,
      processed: ctx.args.input,
      format: ctx.args.format,
      timestamp: new Date().toISOString()
    };
  },
})
.addFlags([
  {
    name: "input",
    description: "Input file path to process",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "format",
    description: "Output format",
    options: ["--format", "-f"],
    type: "string",
    enum: ["json", "xml", "yaml", "csv"],
    defaultValue: "json",
  },
  {
    name: "verbose",
    description: "Enable verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
  },
])
.addSubCommand({
  name: "validate",
  description: "Validate file format and structure",
  handler: async (ctx) => {
    return {
      action: "validate",
      file: ctx.args['file'],
      valid: true,
      issues: []
    };
  },
  parser: new ArgParser({}, [
    {
      name: "file",
      description: "File to validate",
      options: ["--file"],
      type: "string",
      mandatory: true,
    },
    {
      name: "strict",
      description: "Enable strict validation",
      options: ["--strict"],
      type: "boolean",
      flagOnly: true,
    },
  ]),
})
.addSubCommand({
  name: "convert",
  description: "Convert between different file formats",
  handler: async (ctx) => {
    return {
      action: "convert",
      source: ctx.args['source'],
      target: ctx.args['target'],
      format: ctx.args['to']
    };
  },
  parser: new ArgParser({}, [
    {
      name: "source",
      description: "Source file path",
      options: ["--source", "-s"],
      type: "string",
      mandatory: true,
    },
    {
      name: "target",
      description: "Target file path",
      options: ["--target", "-t"],
      type: "string",
      mandatory: true,
    },
    {
      name: "to",
      description: "Target format",
      options: ["--to"],
      type: "string",
      enum: ["json", "xml", "yaml", "csv"],
      mandatory: true,
    },
  ]),
})
.addMcpSubCommand("serve", {
  name: "file-processor-mcp",
  version: "1.2.0",
  description: "File Processor MCP Server - Process and convert files via MCP protocol",
}, {
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001 }
  ]
});

// Show usage examples
console.log("🔧 File Processor CLI with DXT Generation");
console.log("==========================================\n");

console.log("📋 Usage Examples:");
console.log("  # Process a file");
console.log("  file-processor --input data.json --format yaml --verbose\n");

console.log("  # Validate a file");
console.log("  file-processor validate --file config.json --strict\n");

console.log("  # Convert between formats");
console.log("  file-processor convert --source data.csv --target output.json --to json\n");

console.log("  # Start as MCP server");
console.log("  file-processor serve\n");

console.log("  # Generate DXT package for distribution");
console.log("  file-processor --s-save-DXT ./dxt-packages\n");

console.log("🎯 To generate DXT package:");
console.log("  Run: bun examples/dxt-generation-example.ts --s-save-DXT ./my-dxt-packages");
console.log("  This will create a 'file-processor-mcp.dxt' file ready for installation\n");

console.log("📦 DXT Package Contents:");
console.log("  • manifest.json - Server metadata and tool definitions");
console.log("  • server/index.js - MCP server entry point");
console.log("  • All tools from this CLI are included automatically\n");

console.log("🚀 Installation:");
console.log("  Open the generated .dxt file with Claude Desktop or other");
console.log("  DXT-compatible applications for single-click installation.\n");

// Parse command line arguments
cli.parse(process.argv.slice(2));
