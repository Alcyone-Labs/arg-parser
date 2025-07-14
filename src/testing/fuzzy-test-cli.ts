#!/usr/bin/env node

import { ArgParser } from "../core/ArgParser";
import { ArgParserFuzzyTester, type FuzzyTestOptions, type FuzzyTestReport } from "./fuzzy-tester";
import * as fs from "node:fs";
import * as path from "node:path";

interface FuzzyTestCliArgs {
  file: string;
  output?: string;
  maxDepth?: number;
  randomTests?: number;
  verbose?: boolean;
  skipErrors?: boolean;
  format?: 'json' | 'text' | 'markdown';
  performance?: boolean;
}

const fuzzyTestCli = new ArgParser<void>({
  appName: "ArgParser Fuzzy Tester",
  appCommandName: "fuzzy-test",
  description: "Comprehensive fuzzy testing utility for ArgParser configurations",
  handler: async (ctx) => {
    const args = ctx.args as FuzzyTestCliArgs;
    await runFuzzyTest(args);
  },
})
.addFlags([
  {
    name: "file",
    description: "Path to the TypeScript/JavaScript file containing the ArgParser instance",
    options: ["--file", "-f"],
    type: "string",
    mandatory: true,
  },
  {
    name: "output",
    description: "Output file for test results (default: stdout)",
    options: ["--output", "-o"],
    type: "string",
  },
  {
    name: "maxDepth",
    description: "Maximum depth for command path exploration",
    options: ["--max-depth", "-d"],
    type: "number",
    defaultValue: 5,
  },
  {
    name: "randomTests",
    description: "Number of random test cases per command path",
    options: ["--random-tests", "-r"],
    type: "number",
    defaultValue: 10,
  },
  {
    name: "verbose",
    description: "Enable verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "skipErrors",
    description: "Skip error case testing",
    options: ["--skip-errors"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "format",
    description: "Output format",
    options: ["--format"],
    type: "string",
    enum: ["json", "text", "markdown"],
    defaultValue: "text",
  },
  {
    name: "performance",
    description: "Include performance timing in results",
    options: ["--performance", "-p"],
    type: "boolean",
    flagOnly: true,
    defaultValue: true,
  },
]);

async function runFuzzyTest(args: FuzzyTestCliArgs): Promise<void> {
  try {
    // Load the ArgParser instance from the specified file
    const parser = await loadArgParserFromFile(args.file);

    if (args.verbose) {
      console.log(`Loaded ArgParser from: ${args.file}`);
    }

    // Enable fuzzy mode using the system flag
    // This automatically disables error handling and makes the parser fuzzy-test friendly
    parser.parse(["--s-enable-fuzzy"], { skipHelpHandling: true });

    if (args.verbose) {
      console.log("Enabled fuzzy testing mode (disabled error handling)");
    }

    // Configure fuzzy test options
    const options: FuzzyTestOptions = {
      maxDepth: args.maxDepth,
      randomTestCases: args.randomTests,
      includePerformance: args.performance,
      testErrorCases: !args.skipErrors,
      verbose: args.verbose,
    };

    // Run fuzzy testing
    const tester = new ArgParserFuzzyTester(parser, options);

    if (args.verbose) {
      console.log("Starting fuzzy testing...");
    }

    const report = await tester.runFuzzyTest();
    
    // Format and output results
    const formattedOutput = formatReport(report, args.format as 'json' | 'text' | 'markdown');
    
    if (args.output) {
      await fs.promises.writeFile(args.output, formattedOutput, 'utf-8');
      console.log(`Results written to: ${args.output}`);
    } else {
      console.log(formattedOutput);
    }
    
    // Exit with appropriate code
    const successRate = report.successfulTests / report.totalTests;
    if (successRate < 0.8) {
      console.error(`\nWarning: Low success rate (${(successRate * 100).toFixed(1)}%)`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error("Error running fuzzy test:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function loadArgParserFromFile(filePath: string): Promise<ArgParser> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  try {
    // Set environment variable to prevent CLI execution during import
    process.env['ARGPARSER_FUZZY_MODE'] = 'true';

    // Dynamic import to load the module
    const module = await import(absolutePath);

    // Clean up environment variable
    delete process.env['ARGPARSER_FUZZY_MODE'];
    
    // Look for exported ArgParser instances
    const possibleExports = [
      'default',
      'parser',
      'cli',
      'argParser',
      'mainParser',
    ];
    
    for (const exportName of possibleExports) {
      const exported = module[exportName];
      if (exported && exported instanceof ArgParser) {
        return exported;
      }
    }
    
    // If no direct instance found, look for factory functions
    for (const exportName of Object.keys(module)) {
      const exported = module[exportName];
      if (typeof exported === 'function') {
        try {
          const result = exported();
          if (result instanceof ArgParser) {
            return result;
          }
        } catch {
          // Ignore errors from function calls
        }
      }
    }
    
    throw new Error("No ArgParser instance found in the exported module");
    
  } catch (error) {
    throw new Error(`Failed to load ArgParser from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatReport(report: FuzzyTestReport, format: 'json' | 'text' | 'markdown'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
      
    case 'markdown':
      return formatMarkdownReport(report);
      
    case 'text':
    default:
      return formatTextReport(report);
  }
}

function formatTextReport(report: FuzzyTestReport): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("ArgParser Fuzzy Test Report");
  lines.push("=".repeat(60));
  lines.push("");
  
  // Summary
  lines.push("SUMMARY:");
  lines.push(`  Total Tests: ${report.totalTests}`);
  lines.push(`  Successful: ${report.successfulTests} (${((report.successfulTests / report.totalTests) * 100).toFixed(1)}%)`);
  lines.push(`  Failed: ${report.failedTests} (${((report.failedTests / report.totalTests) * 100).toFixed(1)}%)`);
  lines.push("");
  
  // Command paths
  lines.push("COMMAND PATHS TESTED:");
  for (const path of report.commandPaths) {
    const pathStr = path.join(' ') || '(root)';
    const coverage = report.summary.coverageByPath[pathStr];
    lines.push(`  ${pathStr}: ${coverage.passed}/${coverage.total} passed`);
  }
  lines.push("");
  
  // Error types
  if (Object.keys(report.summary.errorTypes).length > 0) {
    lines.push("ERROR TYPES:");
    for (const [errorType, count] of Object.entries(report.summary.errorTypes)) {
      lines.push(`  ${errorType}: ${count}`);
    }
    lines.push("");
  }
  
  // Failed tests
  const failedTests = report.results.filter(r => !r.success);
  if (failedTests.length > 0) {
    lines.push("FAILED TESTS:");
    for (const test of failedTests) { // Show all failures
      lines.push(`  Command: ${test.commandPath.join(' ') || '(root)'}`);
      lines.push(`  Args: ${test.args.join(' ')}`);
      lines.push(`  Error: ${test.error || 'Unknown error'}`);
      lines.push("");
    }
  }
  
  return lines.join('\n');
}

function formatMarkdownReport(report: FuzzyTestReport): string {
  const lines: string[] = [];
  
  lines.push("# ArgParser Fuzzy Test Report");
  lines.push("");
  
  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Tests**: ${report.totalTests}`);
  lines.push(`- **Successful**: ${report.successfulTests} (${((report.successfulTests / report.totalTests) * 100).toFixed(1)}%)`);
  lines.push(`- **Failed**: ${report.failedTests} (${((report.failedTests / report.totalTests) * 100).toFixed(1)}%)`);
  lines.push("");
  
  // Command paths
  lines.push("## Command Path Coverage");
  lines.push("");
  lines.push("| Command Path | Passed | Total | Success Rate |");
  lines.push("|--------------|--------|-------|--------------|");
  
  for (const path of report.commandPaths) {
    const pathStr = path.join(' ') || '(root)';
    const coverage = report.summary.coverageByPath[pathStr];
    const rate = ((coverage.passed / coverage.total) * 100).toFixed(1);
    lines.push(`| \`${pathStr}\` | ${coverage.passed} | ${coverage.total} | ${rate}% |`);
  }
  lines.push("");
  
  // Error types
  if (Object.keys(report.summary.errorTypes).length > 0) {
    lines.push("## Error Types");
    lines.push("");
    lines.push("| Error Type | Count |");
    lines.push("|------------|-------|");
    
    for (const [errorType, count] of Object.entries(report.summary.errorTypes)) {
      lines.push(`| ${errorType} | ${count} |`);
    }
    lines.push("");
  }
  
  // Failed tests
  const failedTests = report.results.filter(r => !r.success);
  if (failedTests.length > 0) {
    lines.push("## Failed Tests");
    lines.push("");

    for (const test of failedTests) { // Show all failures
      lines.push(`### ${test.commandPath.join(' ') || '(root)'}`);
      lines.push("");
      lines.push(`**Args**: \`${test.args.join(' ')}\``);
      lines.push(`**Error**: ${test.error || 'Unknown error'}`);
      lines.push("");
    }
  }
  
  return lines.join('\n');
}

// Run the CLI if this file is executed directly
// The --s-enable-fuzzy system flag automatically prevents execution during fuzzy testing
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('fuzzy-test-cli.ts')) {
  fuzzyTestCli.parse(process.argv.slice(2));
}

export { fuzzyTestCli };
