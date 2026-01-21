#!/usr/bin/env bun
/**
 * MCP Integration Test Runner
 *
 * This script runs all MCP integration tests and provides a comprehensive
 * report of the test results. It can be used for CI/CD or manual testing.
 *
 * Usage:
 *   bun tests/mcp/integration/run-integration-tests.ts
 *   bun tests/mcp/integration/run-integration-tests.ts --suite end-to-end
 *   bun tests/mcp/integration/run-integration-tests.ts --verbose
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

interface TestSuite {
  name: string;
  description: string;
  file: string;
  timeout: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: "end-to-end",
    description: "End-to-end MCP server functionality tests",
    file: "end-to-end.test.ts",
    timeout: 60000,
    critical: true,
  },
  {
    name: "protocol-compliance",
    description: "MCP protocol compliance validation tests",
    file: "protocol-compliance.test.ts",
    timeout: 45000,
    critical: true,
  },
  {
    name: "tool-execution",
    description: "MCP tool execution integration tests",
    file: "tool-execution.test.ts",
    timeout: 60000,
    critical: true,
  },

  {
    name: "performance",
    description: "Performance and reliability tests",
    file: "performance.test.ts",
    timeout: 120000,
    critical: false,
  },
  {
    name: "canny-cli",
    description: "Canny CLI real-world integration tests",
    file: "canny-cli.test.ts",
    timeout: 90000,
    critical: false,
  },
];

class IntegrationTestRunner {
  private verbose: boolean = false;
  private selectedSuite: string | null = null;
  private results: TestResult[] = [];

  constructor(args: string[]) {
    this.parseArgs(args);
  }

  private parseArgs(args: string[]) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--verbose" || arg === "-v") {
        this.verbose = true;
      } else if (arg === "--suite" || arg === "-s") {
        this.selectedSuite = args[i + 1];
        i++; // Skip next argument
      } else if (arg === "--help" || arg === "-h") {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp() {
    console.log(`
MCP Integration Test Runner

Usage:
  bun tests/mcp/integration/run-integration-tests.ts [options]

Options:
  --suite, -s <name>    Run specific test suite
  --verbose, -v         Enable verbose output
  --help, -h           Show this help message

Available test suites:
${TEST_SUITES.map((suite) => `  ${suite.name.padEnd(20)} ${suite.description}`).join("\n")}

Examples:
  bun tests/mcp/integration/run-integration-tests.ts
  bun tests/mcp/integration/run-integration-tests.ts --suite end-to-end
  bun tests/mcp/integration/run-integration-tests.ts --verbose
`);
  }

  private log(message: string, force: boolean = false) {
    if (this.verbose || force) {
      console.log(message);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const testFile = resolve(__dirname, suite.file);

    if (!existsSync(testFile)) {
      return {
        suite: suite.name,
        passed: false,
        duration: 0,
        output: "",
        error: `Test file not found: ${testFile}`,
      };
    }

    this.log(`\n🧪 Running ${suite.name} tests...`, true);
    this.log(`   Description: ${suite.description}`);
    this.log(`   File: ${suite.file}`);
    this.log(`   Timeout: ${suite.timeout}ms`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn("pnpm", ["vitest", "run", testFile], {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: suite.timeout,
        env: { ...process.env, VITEST_INCLUDE_INTEGRATION: "1" },
      });

      let output = "";
      let errorOutput = "";

      child.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        if (this.verbose) {
          process.stdout.write(text);
        }
      });

      child.stderr?.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.verbose) {
          process.stderr.write(text);
        }
      });

      child.on("close", (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const result: TestResult = {
          suite: suite.name,
          passed: code === 0,
          duration,
          output: output + errorOutput,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        };

        if (result.passed) {
          this.log(`PASS ${suite.name} tests passed (${duration}ms)`, true);
        } else {
          this.log(`FAIL ${suite.name} tests failed (${duration}ms)`, true);
          if (!this.verbose && result.error) {
            this.log(`   Error: ${result.error}`, true);
          }
        }

        resolve(result);
      });

      child.on("error", (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          suite: suite.name,
          passed: false,
          duration,
          output: errorOutput,
          error: error.message,
        });
      });
    });
  }

  private generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`
${"=".repeat(60)}
MCP INTEGRATION TEST RESULTS
${"=".repeat(60)}

Summary:
  Total Suites: ${totalTests}
  Passed: ${passedTests}
  Failed: ${failedTests}
  Total Duration: ${(totalDuration / 1000).toFixed(2)}s

Test Results:
${this.results
  .map((result) => {
    const status = result.passed ? "PASS" : "FAIL";
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    return `  ${status} ${result.suite.padEnd(20)} ${duration.padStart(8)}`;
  })
  .join("\n")}
`);

    // Show failed test details
    const failedResults = this.results.filter((r) => !r.passed);
    if (failedResults.length > 0) {
      console.log(`
Failed Test Details:
${"-".repeat(40)}`);

      failedResults.forEach((result) => {
        console.log(`
FAIL ${result.suite}:
   Error: ${result.error || "Unknown error"}
   Duration: ${(result.duration / 1000).toFixed(2)}s`);

        if (this.verbose && result.output) {
          console.log(
            `   Output:\n${result.output
              .split("\n")
              .map((line) => `     ${line}`)
              .join("\n")}`,
          );
        }
      });
    }

    // Check critical test failures
    const criticalFailures = this.results.filter(
      (r) => !r.passed && TEST_SUITES.find((s) => s.name === r.suite)?.critical,
    );

    if (criticalFailures.length > 0) {
      console.log(`
⚠️  CRITICAL TEST FAILURES DETECTED!
The following critical tests failed:
${criticalFailures.map((r) => `  - ${r.suite}`).join("\n")}

These failures indicate serious issues with core MCP functionality.
`);
    }

    console.log(`${"=".repeat(60)}\n`);

    return failedTests === 0;
  }

  public async run(): Promise<boolean> {
    console.log("🚀 Starting MCP Integration Tests...\n");

    // Determine which suites to run
    let suitesToRun = TEST_SUITES;

    if (this.selectedSuite) {
      const selectedSuite = TEST_SUITES.find((s) => s.name === this.selectedSuite);
      if (!selectedSuite) {
        console.error(`❌ Unknown test suite: ${this.selectedSuite}`);
        console.error(`Available suites: ${TEST_SUITES.map((s) => s.name).join(", ")}`);
        return false;
      }
      suitesToRun = [selectedSuite];
      this.log(`Running selected suite: ${selectedSuite.name}`, true);
    } else {
      this.log(`Running all ${TEST_SUITES.length} test suites`, true);
    }

    // Run test suites
    for (const suite of suitesToRun) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);
    }

    // Generate and display report
    const allPassed = this.generateReport();

    return allPassed;
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner(process.argv.slice(2));

  try {
    const success = await runner.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ Integration test runner failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default IntegrationTestRunner;
