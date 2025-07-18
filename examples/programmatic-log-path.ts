#!/usr/bin/env bun

/**
 * Example: Programmatic MCP Log Path Configuration
 *
 * This example demonstrates how to set the MCP log file path programmatically
 * using the mcp.logPath option in withMcp() configuration.
 *
 * Usage:
 *   bun examples/programmatic-log-path.ts --input "Hello" process
 *   bun examples/programmatic-log-path.ts --s-mcp-serve  # Uses programmatic log path
 *   bun examples/programmatic-log-path.ts --s-mcp-serve --s-mcp-log-path ./override.log  # CLI overrides programmatic
 */
import { ArgParser } from "../src/index";

const parser = ArgParser.withMcp({
  appName: "Programmatic Log Path Example",
  appCommandName: "prog-log-example",
  description: "Demonstrates programmatic MCP log path configuration",
  handler: async (ctx) => {
    console.log("Main handler executed:", ctx.args);
    return {
      success: true,
      message: "Command completed successfully",
      timestamp: new Date().toISOString(),
    };
  },
  mcp: {
    serverInfo: {
      name: "programmatic-log-example",
      version: "1.0.0",
      description: "Example showing programmatic log path configuration",
    },
    defaultTransport: { type: "stdio" },
    // Programmatic log path configuration
    logPath: "./examples/logs/programmatic-mcp.log",
  },
})
  .addFlags([
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
      defaultValue: false,
    },
  ])
  .addTool({
    name: "process",
    description: "Process input text with various operations",
    flags: [
      {
        name: "input",
        description: "Text to process",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
      {
        name: "operation",
        description: "Operation to perform",
        options: ["--operation", "-o"],
        type: "string",
        enum: ["uppercase", "lowercase", "reverse"],
        defaultValue: "uppercase",
      },
    ],
    handler: async (ctx) => {
      const { input, operation } = ctx.args;

      let result: string;
      switch (operation) {
        case "uppercase":
          result = input.toUpperCase();
          break;
        case "lowercase":
          result = input.toLowerCase();
          break;
        case "reverse":
          result = input.split("").reverse().join("");
          break;
        default:
          result = input;
      }

      console.log(`Processing "${input}" with operation "${operation}"`);
      console.log(`Result: ${result}`);

      return {
        input,
        operation,
        result,
        timestamp: new Date().toISOString(),
      };
    },
  });

async function main() {
  try {
    const result = await parser.parseAsync();

    if (result && typeof result === "object") {
      console.log("\n✅ Execution completed successfully!");
      console.log("Result:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// Display information about log path configuration
console.log("📝 Programmatic MCP Log Path Example\n");

const isMcpMode = process.argv.includes("--s-mcp-serve");
const hasCliLogPath = process.argv.includes("--s-mcp-log-path");

if (isMcpMode) {
  if (hasCliLogPath) {
    const logPathIndex = process.argv.indexOf("--s-mcp-log-path");
    const cliLogPath = process.argv[logPathIndex + 1];
    console.log("🔧 MCP Server Mode");
    console.log(`   Log path: ${cliLogPath} (CLI flag override)`);
    console.log("   Priority: CLI flag > programmatic config > default");
  } else {
    console.log("🔧 MCP Server Mode");
    console.log(
      "   Log path: ./examples/logs/programmatic-mcp.log (programmatic config)",
    );
    console.log("   Configured via: mcp.logPath in withMcp()");
  }
  console.log("   MCP server starting with configured log path...\n");
} else {
  console.log("ℹ️  Normal CLI Mode");
  console.log("   Programmatic log path: ./examples/logs/programmatic-mcp.log");
  console.log("   Run with --s-mcp-serve to start MCP server\n");

  console.log("📋 Configuration Priority:");
  console.log("   1. CLI flag:      --s-mcp-log-path <path>");
  console.log("   2. Programmatic:  mcp.logPath in withMcp()");
  console.log("   3. Default:       ./logs/mcp.log\n");
}

main().catch(console.error);
