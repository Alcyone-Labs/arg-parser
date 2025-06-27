#!/usr/bin/env bun

/**
 * Getting Started with ArgParser
 * 
 * This is a complete, executable CLI that demonstrates the most common ArgParser patterns.
 * It's a file processing tool that showcases:
 * - Basic flags (string, number, boolean, array)
 * - Sub-commands with their own flags
 * - MCP server integration
 * - Modern best practices
 * 
 * Usage:
 *   bun examples/getting-started.ts --input file.txt --output result.txt
 *   bun examples/getting-started.ts convert --input file.txt --format json
 *   bun examples/getting-started.ts serve  # Start MCP server
 *   bun examples/getting-started.ts --help
 */

import { ArgParserWithMcp } from "../src";

// Create a complete CLI with main functionality and sub-commands
const cli = new ArgParserWithMcp({
  appName: "File Processor",
  appCommandName: "file-proc",
  description: "A simple file processing tool demonstrating ArgParser features",
  handler: async (ctx) => {
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
.addFlags([
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
])
.addSubCommand({
  name: "convert",
  description: "Convert file to different format",
  handler: async (ctx) => {
    console.log("🔄 Converting file...");
    console.log(`   Input: ${ctx.args['input']}`);
    console.log(`   Format: ${ctx.args['format']}`);
    console.log(`   Compress: ${ctx.args['compress'] ? "enabled" : "disabled"}`);

    // Simulate conversion
    console.log("✅ File converted successfully!");

    return {
      action: "convert",
      input: ctx.args['input'],
      format: ctx.args['format'],
      compressed: ctx.args['compress']
    };
  },
  parser: new ArgParserWithMcp({}, [
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
  ]),
})
.addSubCommand({
  name: "analyze",
  description: "Analyze file content",
  handler: async (ctx) => {
    console.log("📊 Analyzing file...");
    console.log(`   File: ${ctx.args['file']}`);
    console.log(`   Type: ${ctx.args['type']}`);
    
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
      file: ctx.args['file'],
      type: ctx.args['type'],
      stats
    };
  },
  parser: new ArgParserWithMcp({}, [
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
  ]),
})
// Add MCP server support with one line!
.addMcpSubCommand("serve", {
  name: "file-processor-mcp",
  version: "1.0.0",
  description: "File Processing MCP Server",
});

// Execute the CLI with command line arguments
cli.parse(process.argv.slice(2));
