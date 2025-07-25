#!/usr/bin/env bun
/**
 * Example: MCP Preset Transport Configuration (v2.0.0)
 *
 * This example demonstrates how to configure preset MCP transports
 * using the new unified tool architecture.
 *
 * Usage:
 *   bun examples/mcp-preset-transports.ts process --input "Hello World"
 *   bun examples/mcp-preset-transports.ts --s-mcp-serve  # Uses preset transports
 *   bun examples/mcp-preset-transports.ts --s-mcp-serve --transport sse --port 4000  # Overrides presets
 */
import { ArgParser } from "../src";
import type { McpTransportConfig } from "../src";

// Define preset transport configurations
const defaultTransports: McpTransportConfig[] = [
  { type: "stdio" },
  { type: "sse", port: 3001, host: "0.0.0.0" },
  { type: "streamable-http", port: 3002, path: "/api/mcp" },
];

// Create CLI with preset MCP transports using unified tools
const cli = ArgParser.withMcp({
  appName: "MCP Preset Transport Example",
  appCommandName: "mcp-preset-example",
  description:
    "Demonstrates MCP preset transport configuration with unified tools",
  mcp: {
    serverInfo: {
      name: "preset-transport-mcp",
      version: "2.0.0",
      description: "MCP server with preset transport configuration",
    },
    defaultTransports, // Preset transports configuration
  },
})
  .addTool({
    name: "process",
    description: "Process input text with various options",
    flags: [
      {
        name: "input",
        description: "Input text to process",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
      {
        name: "verbose",
        description: "Enable verbose output",
        options: ["--verbose", "-v"],
        type: "boolean",
        flagOnly: true,
      },
    ],
    handler: async (ctx) => {
      // Console output automatically safe in MCP mode!
      console.log("🚀 Processing input:", ctx.args["input"]);
      console.log("📝 Verbose mode:", ctx.args["verbose"] ? "ON" : "OFF");

      return {
        message: "Input processed successfully",
        input: ctx.args["input"],
        verbose: ctx.args["verbose"],
        timestamp: new Date().toISOString(),
      };
    },
  })
  .addTool({
    name: "analyze",
    description: "Analyze the input text",
    flags: [
      {
        name: "input",
        description: "Text to analyze",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
      {
        name: "detailed",
        description: "Show detailed analysis",
        options: ["--detailed", "-d"],
        type: "boolean",
        flagOnly: true,
      },
    ],
    handler: async (ctx) => {
      const input = ctx.args["input"];
      const analysis = {
        length: input.length,
        words: input.split(/\s+/).length,
        characters: input.replace(/\s/g, "").length,
        uppercase: (input.match(/[A-Z]/g) || []).length,
        lowercase: (input.match(/[a-z]/g) || []).length,
      };

      // Console output automatically redirected in MCP mode
      console.log("📊 Text Analysis Results:");
      console.log(`   Length: ${analysis.length} characters`);
      console.log(`   Words: ${analysis.words}`);
      console.log(`   Non-space characters: ${analysis.characters}`);

      if (ctx.args["detailed"]) {
        console.log(`   Uppercase letters: ${analysis.uppercase}`);
        console.log(`   Lowercase letters: ${analysis.lowercase}`);
      }

      return {
        success: true,
        analysis,
        detailed: ctx.args["detailed"],
        timestamp: new Date().toISOString(),
      };
    },
  });

// Export for testing
export { cli, defaultTransports };

// Run if this file is executed directly
cli.parse(process.argv.slice(2));
