#!/usr/bin/env bun

import { ArgParser } from "../src/ArgParser";
import { ArgParserFuzzyTester } from "../src/fuzzy-tester";

// Create a complex ArgParser instance for testing
const exampleParser = new ArgParser({
  appName: "Example CLI",
  appCommandName: "example-cli",
  description: "A complex CLI for demonstrating fuzzy testing",
  handler: async (ctx) => {
    return { action: "main", args: ctx.args };
  },
})
.addFlags([
  {
    name: "input",
    description: "Input file path",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "output",
    description: "Output file path",
    options: ["--output", "-o"],
    type: "string",
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
    description: "Enable verbose logging",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "threads",
    description: "Number of processing threads",
    options: ["--threads", "-t"],
    type: "number",
    defaultValue: 1,
    validate: (value) => {
      const num = Number(value);
      return num > 0 && num <= 16 ? true : "Threads must be between 1 and 16";
    },
  },
  {
    name: "tags",
    description: "Processing tags (can be specified multiple times)",
    options: ["--tag"],
    type: "string",
    allowMultiple: true,
  },
])
.addSubCommand({
  name: "process",
  description: "Process data files",
  handler: async (ctx) => {
    return { action: "process", args: ctx.args, parentArgs: ctx.parentArgs };
  },
  parser: new ArgParser({}, [
    {
      name: "algorithm",
      description: "Processing algorithm",
      options: ["--algorithm", "-a"],
      type: "string",
      enum: ["fast", "accurate", "balanced"],
      mandatory: true,
    },
    {
      name: "batch-size",
      description: "Batch size for processing",
      options: ["--batch-size", "-b"],
      type: "number",
      defaultValue: 100,
    },
    {
      name: "parallel",
      description: "Enable parallel processing",
      options: ["--parallel", "-p"],
      type: "boolean",
      flagOnly: true,
    },
  ]),
})
.addSubCommand({
  name: "analyze",
  description: "Analyze processed data",
  handler: async (ctx) => {
    return { action: "analyze", args: ctx.args, parentArgs: ctx.parentArgs };
  },
  parser: new ArgParser({}, [
    {
      name: "type",
      description: "Analysis type",
      options: ["--type"],
      type: "string",
      enum: ["statistical", "visual", "comparative"],
      mandatory: true,
    },
    {
      name: "depth",
      description: "Analysis depth",
      options: ["--depth", "-d"],
      type: "number",
      enum: [1, 2, 3, 4, 5],
      defaultValue: 3,
    },
  ]),
})
.addSubCommand({
  name: "export",
  description: "Export results",
  parser: new ArgParser({
    subCommands: [
      {
        name: "database",
        description: "Export to database",
        handler: async (ctx) => {
          return { action: "export-db", args: ctx.args };
        },
        parser: new ArgParser({}, [
          {
            name: "connection",
            description: "Database connection string",
            options: ["--connection", "-c"],
            type: "string",
            mandatory: true,
          },
          {
            name: "table",
            description: "Target table name",
            options: ["--table", "-t"],
            type: "string",
            mandatory: true,
          },
          {
            name: "overwrite",
            description: "Overwrite existing data",
            options: ["--overwrite"],
            type: "boolean",
            flagOnly: true,
          },
        ]),
      },
      {
        name: "file",
        description: "Export to file",
        handler: async (ctx) => {
          return { action: "export-file", args: ctx.args };
        },
        parser: new ArgParser({}, [
          {
            name: "path",
            description: "Export file path",
            options: ["--path", "-p"],
            type: "string",
            mandatory: true,
          },
          {
            name: "compress",
            description: "Compress output file",
            options: ["--compress", "-z"],
            type: "boolean",
            flagOnly: true,
          },
          {
            name: "split-size",
            description: "Split file size in MB",
            options: ["--split-size"],
            type: "number",
            validate: (value) => {
              const num = Number(value);
              return num > 0 ? true : "Split size must be positive";
            },
          },
        ]),
      },
    ],
  }),
});

// Function to run fuzzy testing
async function runFuzzyTestExample() {
  console.log("Running fuzzy test on example ArgParser...\n");
  
  const tester = new ArgParserFuzzyTester(exampleParser, {
    maxDepth: 4,
    randomTestCases: 5,
    includePerformance: true,
    testErrorCases: true,
    verbose: true,
  });
  
  const report = await tester.runFuzzyTest();
  
  console.log("\n" + "=".repeat(60));
  console.log("FUZZY TEST RESULTS");
  console.log("=".repeat(60));
  
  console.log(`\nTotal Tests: ${report.totalTests}`);
  console.log(`Successful: ${report.successfulTests} (${((report.successfulTests / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${report.failedTests} (${((report.failedTests / report.totalTests) * 100).toFixed(1)}%)`);
  
  console.log("\nCommand Path Coverage:");
  for (const [path, coverage] of Object.entries(report.summary.coverageByPath)) {
    const rate = ((coverage.passed / coverage.total) * 100).toFixed(1);
    console.log(`  ${path}: ${coverage.passed}/${coverage.total} (${rate}%)`);
  }
  
  if (Object.keys(report.summary.errorTypes).length > 0) {
    console.log("\nError Types:");
    for (const [errorType, count] of Object.entries(report.summary.errorTypes)) {
      console.log(`  ${errorType}: ${count}`);
    }
  }
  
  // Show some example failed tests
  const failedTests = report.results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log("\nExample Failed Tests:");
    for (const test of failedTests.slice(0, 3)) {
      console.log(`  Command: ${test.commandPath.join(' ') || '(root)'}`);
      console.log(`  Args: ${test.args.join(' ')}`);
      console.log(`  Error: ${test.error}`);
      console.log("");
    }
  }
  
  // Performance analysis
  const testsWithTiming = report.results.filter(r => r.executionTime !== undefined);
  if (testsWithTiming.length > 0) {
    const avgTime = testsWithTiming.reduce((sum, r) => sum + (r.executionTime || 0), 0) / testsWithTiming.length;
    const maxTime = Math.max(...testsWithTiming.map(r => r.executionTime || 0));
    console.log(`\nPerformance Analysis:`);
    console.log(`  Average execution time: ${avgTime.toFixed(2)}ms`);
    console.log(`  Maximum execution time: ${maxTime}ms`);
  }
  
  return report;
}

// Export the parser for use with the CLI tool
export default exampleParser;

// Run the example if this file is executed directly
// The --s-enable-fuzzy system flag automatically prevents execution during fuzzy testing
runFuzzyTestExample().catch(console.error);
