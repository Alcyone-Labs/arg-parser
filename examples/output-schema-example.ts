#!/usr/bin/env bun
import { z } from "zod";
import { ArgParser, createOutputSchema, OutputSchemaPatterns } from "../src/index";

// Example 1: Using predefined output schema patterns (RECOMMENDED: via toMcpTools options)
const fileProcessorCli = new ArgParser({
  appName: "File Processor CLI",
  appCommandName: "file-processor",
  handler: async (ctx) => ({
    success: true,
    data: {
      processedFiles: [ctx.args["input"]],
      totalSize: 1024,
      timestamp: new Date().toISOString(),
    },
    message: `Successfully processed ${ctx.args["input"]}`,
  }),
}).addFlags([
  {
    name: "input",
    description: "Input file to process",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "format",
    description: "Output format",
    options: ["--format", "-f"],
    type: "string",
    enum: ["json", "csv", "xml"],
    defaultValue: "json",
  },
]);
// Note: Output schema will be set via toMcpTools() options below

// Example 2: Using custom output schemas (RECOMMENDED: via toMcpTools options)
const databaseCli = new ArgParser({
  appName: "Database CLI",
  appCommandName: "db-cli",
  handler: async (_ctx) => ({
    queryResult: {
      rows: [{ id: 1, name: "test" }],
      count: 1,
      executionTime: 150,
    },
    metadata: {
      database: "test_db",
      timestamp: new Date().toISOString(),
    },
  }),
}).addFlags([
  {
    name: "query",
    description: "SQL query to execute",
    options: ["--query", "-q"],
    type: "string",
    mandatory: true,
  },
]);
// Note: Custom Zod schema will be set via toMcpTools() options below

// Define the custom schema for later use
const customDatabaseSchema = z.object({
  queryResult: z.object({
    rows: z.array(z.any()).describe("Query result rows"),
    count: z.number().describe("Number of rows returned"),
    executionTime: z.number().describe("Query execution time in milliseconds"),
  }),
  metadata: z.object({
    database: z.string().describe("Database name"),
    timestamp: z.string().describe("Query execution timestamp"),
  }),
});

// Example 3: Tool-specific output schemas (RECOMMENDED: directly in addTool!)
const multiToolCli = new ArgParser({
  appName: "Multi-Tool CLI",
  appCommandName: "multi-tool",
  handler: async (_ctx) => ({
    success: true,
    message: "Main command executed",
  }),
})
  .addFlags([
    {
      name: "verbose",
      description: "Verbose output",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
    },
  ])
  // Note: Main command schema will be set via toMcpTools() options below
  .addTool({
    name: "process-file",
    description: "Process a file",
    flags: [
      {
        name: "file",
        description: "File to process",
        options: ["--file"],
        type: "string",
        mandatory: true,
      },
    ],
    // 🎉 NEW: Output schema directly in tool definition!
    outputSchema: "fileOperation",
    handler: async (ctx) => ({
      path: ctx.args["file"],
      size: 2048,
      created: false,
      modified: true,
      exists: true,
    }),
  })
  .addTool({
    name: "run-command",
    description: "Execute a system command",
    flags: [
      {
        name: "command",
        description: "Command to execute",
        options: ["--command", "-c"],
        type: "string",
        mandatory: true,
      },
    ],
    // 🎉 NEW: Output schema directly in tool definition!
    outputSchema: "processExecution",
    handler: async (ctx) => ({
      exitCode: 0,
      stdout: `Output from: ${ctx.args["command"]}`,
      stderr: "",
      duration: 1500,
      command: ctx.args["command"],
    }),
  });

// Example 4: Using schema definition objects (RECOMMENDED: via toMcpTools options)
const apiCli = new ArgParser({
  appName: "API CLI",
  appCommandName: "api-cli",
  handler: async (_ctx) => ({
    response: { status: "ok", data: [] },
    statusCode: 200,
    headers: { "content-type": "application/json" },
    timing: { total: 250, dns: 10, connect: 50, request: 190 },
  }),
}).addFlags([
  {
    name: "endpoint",
    description: "API endpoint to call",
    options: ["--endpoint", "-e"],
    type: "string",
    mandatory: true,
  },
]);
// Note: Schema definition object will be set via toMcpTools() options below

// Define the schema definition object for later use
const apiSchemaDefinition = {
  response: z.object({
    status: z.string().describe("Response status"),
    data: z.any().describe("Response data"),
  }),
  statusCode: z.number().describe("HTTP status code"),
  headers: z.record(z.string(), z.string()).describe("Response headers"),
  timing: z.object({
    total: z.number().describe("Total request time in ms"),
    dns: z.number().describe("DNS lookup time in ms"),
    connect: z.number().describe("Connection time in ms"),
    request: z.number().describe("Request time in ms"),
  }),
};

// Example 5: Advanced usage with custom schemas in tools
const advancedCli = new ArgParser({
  appName: "Advanced CLI",
  appCommandName: "advanced",
  handler: async (_ctx) => ({ success: true }),
})
  .addTool({
    name: "analyze-data",
    description: "Analyze data with detailed results",
    flags: [
      {
        name: "dataset",
        description: "Dataset to analyze",
        options: ["--dataset", "-d"],
        type: "string",
        mandatory: true,
      },
    ],
    // 🎉 Custom Zod schema directly in tool
    outputSchema: z.object({
      analysis: z.object({
        totalRecords: z.number().describe("Total number of records"),
        validRecords: z.number().describe("Number of valid records"),
        errors: z.array(z.string()).describe("List of validation errors"),
        summary: z.object({
          mean: z.number().optional(),
          median: z.number().optional(),
          mode: z.number().optional(),
        }),
      }),
      performance: z.object({
        processingTime: z.number().describe("Processing time in milliseconds"),
        memoryUsed: z.number().describe("Memory used in bytes"),
      }),
      metadata: z.object({
        timestamp: z.string().describe("Analysis timestamp"),
        version: z.string().describe("Analyzer version"),
      }),
    }),
    handler: async (_ctx) => ({
      analysis: {
        totalRecords: 1000,
        validRecords: 950,
        errors: ["Invalid date format in row 23", "Missing value in row 45"],
        summary: { mean: 42.5, median: 40.0, mode: 38.0 },
      },
      performance: {
        processingTime: 2500,
        memoryUsed: 1024000,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.1.0",
      },
    }),
  })
  .addTool({
    name: "generate-report",
    description: "Generate a report",
    flags: [
      {
        name: "format",
        description: "Report format",
        options: ["--format", "-f"],
        type: "string",
        enum: ["pdf", "html", "json"],
        defaultValue: "html",
      },
    ],
    // 🎉 Schema definition object directly in tool
    outputSchema: {
      report: z.object({
        id: z.string().describe("Report ID"),
        format: z.string().describe("Report format"),
        size: z.number().describe("Report size in bytes"),
        pages: z.number().optional().describe("Number of pages (for PDF)"),
      }),
      downloadUrl: z.string().describe("URL to download the report"),
      expiresAt: z.string().describe("When the download link expires"),
    },
    handler: async (ctx) => ({
      report: {
        id: "rpt_" + Math.random().toString(36).substr(2, 9),
        format: ctx.args["format"],
        size: 2048576,
        pages: ctx.args["format"] === "pdf" ? 15 : undefined,
      },
      downloadUrl: `https://example.com/reports/download/${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

// Demonstrate MCP tool generation with output schemas
async function demonstrateOutputSchemas() {
  console.log("🔧 Output Schema Examples\n");

  // Generate MCP tools with automatic output schemas (RECOMMENDED APPROACH)
  console.log("1. File Processor CLI - MCP Tools with predefined schema via toMcpTools():");
  const fileProcessorTools = fileProcessorCli.toMcpTools({
    autoGenerateOutputSchema: "successWithData",
  });
  fileProcessorTools.forEach((tool) => {
    console.log(`   Tool: ${tool.name}`);
    console.log(`   Description: ${tool.description}`);
    console.log(`   Has Output Schema: ${tool.outputSchema ? "✅" : "❌"}`);
    if (tool.outputSchema) {
      console.log(`   Schema Type: ${tool.outputSchema._def.type}`);
    }
  });

  console.log("\n2. Database CLI - MCP Tools with custom Zod schema via toMcpTools():");
  const databaseTools = databaseCli.toMcpTools({
    defaultOutputSchema: customDatabaseSchema,
  });
  databaseTools.forEach((tool) => {
    console.log(`   Tool: ${tool.name}`);
    console.log(`   Has Output Schema: ${tool.outputSchema ? "✅" : "❌"}`);
  });

  console.log("\n3. Multi-Tool CLI - Different schemas per tool (tools have their own schemas):");
  const multiTools = multiToolCli.toMcpTools({
    outputSchemaMap: {
      "multi-tool": createOutputSchema("successError"),
    },
  });
  multiTools.forEach((tool) => {
    console.log(`   Tool: ${tool.name}`);
    console.log(`   Has Output Schema: ${tool.outputSchema ? "✅" : "❌"}`);
  });

  console.log("\n4. API CLI - Schema from definition object via toMcpTools():");
  const apiTools = apiCli.toMcpTools({
    defaultOutputSchema: createOutputSchema(apiSchemaDefinition),
  });
  apiTools.forEach((tool) => {
    console.log(`   Tool: ${tool.name}`);
    console.log(`   Has Output Schema: ${tool.outputSchema ? "✅" : "❌"}`);
  });

  console.log("\n5. Advanced CLI - Tools with custom schemas (schemas defined directly in tools):");
  const advancedTools = advancedCli.toMcpTools();
  advancedTools.forEach((tool) => {
    console.log(`   Tool: ${tool.name}`);
    console.log(`   Has Output Schema: ${tool.outputSchema ? "✅" : "❌"}`);
  });

  console.log("\n6. Available predefined patterns:");
  Object.keys(OutputSchemaPatterns).forEach((pattern) => {
    console.log(`   - ${pattern}`);
  });

  console.log("\n7. Creating custom schemas:");
  const customSchema = createOutputSchema({
    result: z.string().describe("Operation result"),
    timestamp: z.string().describe("When completed"),
    metadata: z
      .object({
        version: z.string(),
        environment: z.string(),
      })
      .optional(),
  });
  console.log(`   Custom schema created: ${customSchema._def.type}`);

  console.log("\n🎉 RECOMMENDED API PATTERNS:");
  console.log("   ✨ BEST: Output schemas defined directly in .addTool() method");
  console.log("   ✨ GOOD: Output schemas via toMcpTools() options");
  console.log(
    "   ✨ LEGACY: setDefaultOutputSchema() and enableAutoOutputSchema() (still supported)",
  );
  console.log("   ✨ Auto-completion support for predefined pattern names");
}

// Run the demonstration
if (process.argv[1] === new URL(import.meta.url).pathname) {
  demonstrateOutputSchemas().catch(console.error);
}

export { fileProcessorCli, databaseCli, multiToolCli, apiCli, advancedCli };
