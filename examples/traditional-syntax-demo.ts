#!/usr/bin/env bun
/**
 * Traditional Syntax Demo - Confirms v2.0.0 Backward Compatibility
 *
 * This example demonstrates that all traditional ArgParser syntax
 * continues to work exactly as before in v2.0.0, without any MCP functionality.
 *
 * Usage:
 *   bun examples/traditional-syntax-demo.ts --file input.txt --format json --verbose
 *   bun examples/traditional-syntax-demo.ts process --input data.csv --output result.json
 *   bun examples/traditional-syntax-demo.ts --help
 */
import { ArgParser } from "../src";

// Traditional ArgParser constructor - works exactly as before
const cli = new ArgParser({
  appName: "Traditional CLI Demo",
  appCommandName: "traditional-demo",
  description:
    "Demonstrates that traditional ArgParser syntax still works in v2.0.0",
  handler: async (ctx) => {
    console.log("🔄 Processing with traditional ArgParser syntax");
    console.log(`   File: ${ctx.args.file}`);
    console.log(`   Format: ${ctx.args.format}`);
    console.log(`   Verbose: ${ctx.args.verbose ? "enabled" : "disabled"}`);

    return {
      success: true,
      file: ctx.args.file,
      format: ctx.args.format,
      verbose: ctx.args.verbose,
    };
  },
})
  // Traditional addFlags() method - works exactly as before
  .addFlags([
    {
      name: "file",
      description: "Input file to process",
      options: ["--file", "-f"],
      type: "string",
      mandatory: true,
    },
    {
      name: "format",
      description: "Output format",
      options: ["--format"],
      type: "string",
      enum: ["json", "xml", "csv"],
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
  // Traditional addSubCommand() method - works exactly as before
  .addSubCommand({
    name: "process",
    description: "Process data with specific options",
    handler: async (ctx) => {
      console.log("🔧 Processing data with subcommand");
      console.log(`   Input: ${ctx.args.input}`);
      console.log(`   Output: ${ctx.args.output}`);
      console.log(`   Compress: ${ctx.args.compress ? "enabled" : "disabled"}`);

      return {
        action: "process",
        input: ctx.args.input,
        output: ctx.args.output,
        compressed: ctx.args.compress,
      };
    },
    parser: new ArgParser({}, [
      {
        name: "input",
        description: "Input file",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
      {
        name: "output",
        description: "Output file",
        options: ["--output", "-o"],
        type: "string",
        defaultValue: "output.json",
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
  // Traditional addSubCommand() with nested hierarchy
  .addSubCommand({
    name: "analyze",
    description: "Analyze data files",
    parser: new ArgParser(
      {
        appName: "Data Analyzer",
        handler: async (ctx) => {
          console.log("📊 Analyzing data");
          console.log(`   Target: ${ctx.args.target}`);
          console.log(`   Type: ${ctx.args.type}`);

          return {
            action: "analyze",
            target: ctx.args.target,
            type: ctx.args.type,
            timestamp: new Date().toISOString(),
          };
        },
      },
      [
        {
          name: "target",
          description: "Target to analyze",
          options: ["--target", "-t"],
          type: "string",
          mandatory: true,
        },
        {
          name: "type",
          description: "Analysis type",
          options: ["--type"],
          type: "string",
          enum: ["basic", "detailed", "statistical"],
          defaultValue: "basic",
        },
      ],
    ).addSubCommand({
      name: "report",
      description: "Generate analysis report",
      handler: async (ctx) => {
        console.log("📋 Generating report");
        console.log(`   Format: ${ctx.args.reportFormat}`);

        return {
          action: "report",
          format: ctx.args.reportFormat,
        };
      },
      parser: new ArgParser({}, [
        {
          name: "reportFormat",
          description: "Report format",
          options: ["--format"],
          type: "string",
          enum: ["pdf", "html", "markdown"],
          defaultValue: "html",
        },
      ]),
    }),
  });

// Traditional parsing - works exactly as before
async function main() {
  try {
    console.log(
      "🎯 Traditional ArgParser Syntax Demo (v2.0.0 Backward Compatibility)",
    );
    console.log("=".repeat(70));

    const result = await cli.parse(process.argv.slice(2));

    if (result._asyncHandlerPromise) {
      const handlerResult = await result._asyncHandlerPromise;
      console.log("\n✅ Handler Response:");
      console.log(JSON.stringify(handlerResult, null, 2));
    } else {
      console.log("\n✅ Parsed Arguments:");
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Export for testing
export { cli };

// Run if this file is executed directly
if (import.meta.main) {
  main();
}
