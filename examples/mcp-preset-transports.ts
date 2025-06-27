#!/usr/bin/env bun
/**
 * Example: MCP Preset Transport Configuration
 * 
 * This example demonstrates how to configure preset MCP transports
 * that will be used when no CLI transport flags are provided.
 * 
 * Usage:
 *   bun examples/mcp-preset-transports.ts --input "Hello World"
 *   bun examples/mcp-preset-transports.ts serve  # Uses preset transports
 *   bun examples/mcp-preset-transports.ts serve --transport sse --port 4000  # Overrides presets
 */

import { ArgParserWithMcp } from "../src";
import type { McpTransportConfig } from "../src";

// Define preset transport configurations
const defaultTransports: McpTransportConfig[] = [
  { type: "stdio" },
  { type: "sse", port: 3001, host: "0.0.0.0" },
  { type: "streamable-http", port: 3002, path: "/api/mcp" }
];

// Create CLI with preset MCP transports
const cli = ArgParserWithMcp.withMcp({
  appName: "MCP Preset Transport Example",
  appCommandName: "mcp-preset-example",
  description: "Demonstrates MCP preset transport configuration",
  handler: async (ctx) => {
    console.log("🚀 Processing input:", ctx.args.input);
    console.log("📝 Verbose mode:", ctx.args.verbose ? "ON" : "OFF");
    
    return {
      message: "Input processed successfully",
      input: ctx.args.input,
      verbose: ctx.args.verbose,
      timestamp: new Date().toISOString()
    };
  }
})
.addFlags([
  {
    name: "input",
    description: "Input text to process",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true
  },
  {
    name: "verbose",
    description: "Enable verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true
  }
])
.addSubCommand({
  name: "analyze",
  description: "Analyze the input text",
  handler: async (ctx) => {
    const input = String(ctx.parentArgs?.["input"] || "");
    const analysis = {
      length: input.length,
      words: input.split(/\s+/).length,
      characters: input.replace(/\s/g, "").length,
      uppercase: (input.match(/[A-Z]/g) || []).length,
      lowercase: (input.match(/[a-z]/g) || []).length
    };
    
    console.log("📊 Text Analysis Results:");
    console.log(`   Length: ${analysis.length} characters`);
    console.log(`   Words: ${analysis.words}`);
    console.log(`   Non-space characters: ${analysis.characters}`);
    console.log(`   Uppercase letters: ${analysis.uppercase}`);
    console.log(`   Lowercase letters: ${analysis.lowercase}`);
    
    return analysis;
  },
  parser: new ArgParserWithMcp({}, [
    {
      name: "detailed",
      description: "Show detailed analysis",
      options: ["--detailed", "-d"],
      type: "boolean",
      flagOnly: true
    }
  ])
})
.addMcpSubCommand("serve", {
  name: "mcp-preset-example-server",
  version: "1.0.0",
  description: "MCP server with preset transport configuration"
}, {
  // Configure preset transports - these will be used when no CLI flags are provided
  defaultTransports,
  toolOptions: {
    includeSubCommands: true,
    toolNamePrefix: "preset-example-"
  }
});

// Alternative example with single preset transport
const cliWithSinglePreset = ArgParserWithMcp.withMcp({
  appName: "Single Preset Example",
  appCommandName: "single-preset",
  handler: async (ctx) => ({ result: "Single preset example", args: ctx.args })
})
.addFlags([
  {
    name: "data",
    description: "Input data to process",
    options: ["--data"],
    type: "string",
    mandatory: true
  }
])
.addMcpSubCommand("serve", {
  name: "single-preset-server",
  version: "1.0.0"
}, {
  // Single preset transport configuration
  defaultTransport: {
    type: "sse",
    port: 3003,
    host: "localhost",
    path: "/single-preset-mcp"
  }
});

// Main execution
async function main() {
  try {
    console.log("🎯 MCP Preset Transport Configuration Example");
    console.log("=" .repeat(50));
    
    const result = await cli.parse(process.argv.slice(2));
    
    if (result.handlerResponse) {
      console.log("\n✅ Handler Response:");
      console.log(JSON.stringify(result.handlerResponse, null, 2));
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Export for testing
export { cli, cliWithSinglePreset, defaultTransports };

// Run if this file is executed directly
if ((import.meta as any).main) {
  main();
}
