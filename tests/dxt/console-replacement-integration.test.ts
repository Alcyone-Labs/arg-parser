import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { ArgParser } from "../../src/core/ArgParser";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";

describe("DXT Console Replacement Integration", () => {
  let tempDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = path.join(__dirname, "temp-integration-test");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Store original LOCAL_BUILD env var
    originalEnv = process.env["LOCAL_BUILD"];
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore original env var
    if (originalEnv !== undefined) {
      process.env["LOCAL_BUILD"] = originalEnv;
    } else {
      delete process.env["LOCAL_BUILD"];
    }
  });

  it("should test console replacement with LOCAL_BUILD environment variable", () => {
    // Set LOCAL_BUILD for testing
    process.env["LOCAL_BUILD"] = "1";

    // Test the DxtGenerator directly
    const mockArgParser = new ArgParser({ appName: "test-app" });
    const dxtGenerator = new DxtGenerator(mockArgParser);

    // Test package.json generation with LOCAL_BUILD=1
    const serverInfo = {
      name: "test-console-mcp",
      version: "1.0.0",
      description: "Test MCP server with console replacement",
    };

    const packageJson = (dxtGenerator as any)["createDxtPackageJson"](
      serverInfo,
    );
    expect(packageJson.dependencies["@alcyone-labs/arg-parser"]).toBe(
      "file:../../arg-parser-local.tgz",
    );

    // Test console replacement
    const testCliContent = `
import { ArgParser } from '@alcyone-labs/arg-parser';
import chalk from 'chalk';

function handler() {
  console.log(chalk.green('Starting test...'));
  console.warn('This is a warning');
  console.info('Info message');
  console.debug('Debug message');
  console.error('Error message should remain');
  return { success: true };
}
`;

    const processedContent = (dxtGenerator as any)["processCliSourceForMcp"](
      testCliContent,
    );

    // Verify global console replacement setup
    expect(processedContent).toContain(
      "import { createMcpLogger } from '@alcyone-labs/arg-parser';",
    );
    expect(processedContent).toContain(
      "const mcpLogger = createMcpLogger('[CLI]');",
    );
    expect(processedContent).toContain("globalThis.console = {");
    expect(processedContent).toContain(
      "log: (...args) => mcpLogger.info(...args)",
    );
    expect(processedContent).toContain(
      "warn: (...args) => mcpLogger.warn(...args)",
    );
    expect(processedContent).toContain(
      "info: (...args) => mcpLogger.info(...args)",
    );
    expect(processedContent).toContain(
      "debug: (...args) => mcpLogger.debug(...args)",
    );
    expect(processedContent).toContain("error: originalConsole.error");

    // Verify original console calls remain unchanged (handled by global replacement)
    expect(processedContent).toContain(
      "console.log(chalk.green('Starting test...'));",
    );
    expect(processedContent).toContain("console.warn('This is a warning');");
    expect(processedContent).toContain("console.info('Info message');");
    expect(processedContent).toContain("console.debug('Debug message');");
    expect(processedContent).toContain(
      "console.error('Error message should remain');",
    );
  });

  it("should use version dependency when LOCAL_BUILD is not set", () => {
    // Ensure LOCAL_BUILD is not set
    delete process.env["LOCAL_BUILD"];

    // Test the DxtGenerator directly
    const mockArgParser = new ArgParser({ appName: "test-app" });
    const dxtGenerator = new DxtGenerator(mockArgParser);

    const serverInfo = {
      name: "test-version-mcp",
      version: "1.0.0",
      description: "Test MCP server with version dependency",
    };

    const packageJson = (dxtGenerator as any)["createDxtPackageJson"](
      serverInfo,
    );
    expect(packageJson.dependencies["@alcyone-labs/arg-parser"]).toBe("^1.3.0");
  });

  it("should handle CLI files without imports correctly", () => {
    process.env["LOCAL_BUILD"] = "1";

    // Test the DxtGenerator directly
    const mockArgParser = new ArgParser({ appName: "test-app" });
    const dxtGenerator = new DxtGenerator(mockArgParser);

    // Create a CLI file without imports (edge case)
    const testCliContent = `
// No imports here
const config = { apiUrl: 'https://api.example.com' };

function processData() {
  console.log('Processing data...');
  console.warn('Warning: deprecated API');
  return { success: true };
}

console.log('Application started');
`;

    const processedContent = (dxtGenerator as any)["processCliSourceForMcp"](
      testCliContent,
    );

    // Should start with logger import
    expect(
      processedContent.trim().startsWith("import { createMcpLogger }"),
    ).toBe(true);

    // Should have global console replacement setup
    expect(processedContent).toContain("globalThis.console = {");
    expect(processedContent).toContain(
      "log: (...args) => mcpLogger.info(...args)",
    );
    expect(processedContent).toContain(
      "warn: (...args) => mcpLogger.warn(...args)",
    );

    // Original console calls should remain unchanged
    expect(processedContent).toContain("console.log('Processing data...');");
    expect(processedContent).toContain(
      "console.warn('Warning: deprecated API');",
    );
    expect(processedContent).toContain("console.log('Application started');");
  });
});
