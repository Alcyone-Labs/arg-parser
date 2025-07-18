import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Test MCP Server",
  appCommandName: "test-server",
  description: "A test MCP server for integration testing",
  handler: async (ctx) => {
    return {
      message: "Hello from test server",
      input: ctx.args.input,
      timestamp: new Date().toISOString(),
    };
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
      flagOnly: true,
    },
  ])
  .addSubCommand({
    name: "analyze",
    description: "Analyze input data",
    handler: async (ctx) => {
      return {
        analysis: "Data analyzed successfully",
        input: ctx.args.data,
        method: ctx.args.method || "default",
      };
    },
    parser: new ArgParser({}, [
      {
        name: "data",
        description: "Data to analyze",
        options: ["--data", "-d"],
        type: "string",
        mandatory: true,
      },
      {
        name: "method",
        description: "Analysis method",
        options: ["--method", "-m"],
        type: "string",
        enum: ["basic", "advanced", "statistical"],
        defaultValue: "basic",
      },
    ]),
  })
  .addMcpSubCommand("serve", {
    name: "test-mcp-server",
    version: "1.0.0",
    description: "Test MCP server for integration testing",
  });

// Handle MCP server mode
if (process.argv.includes("serve")) {
  cli.parse(process.argv.slice(2));
} else {
  // Regular CLI mode for testing
  cli.parse(process.argv.slice(2));
}
