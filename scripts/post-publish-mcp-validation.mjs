#!/usr/bin/env node

/**
 * Post-publish MCP integration validation script
 * Tests MCP functionality with the published package
 */
import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PACKAGE_NAME = "@alcyone-labs/arg-parser";
const TEST_TIMEOUT = 60000; // 60 seconds

console.log("🔌 Post-Publish MCP Validation for", PACKAGE_NAME);
console.log("==========================================\n");

// Create temporary test directory
const tempDir = join(tmpdir(), `arg-parser-mcp-validation-${randomUUID()}`);
console.log("📁 Creating temporary test directory:", tempDir);
fs.mkdirSync(tempDir, { recursive: true });

process.on("exit", () => {
  // Cleanup
  if (fs.existsSync(tempDir)) {
    console.log("\n🧹 Cleaning up temporary directory...");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

process.on("SIGINT", () => {
  console.log("\n⚠️  Interrupted by user");
  process.exit(1);
});

async function runCommand(command, cwd = tempDir, options = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, {
      cwd,
      stdio: options.silent ? "pipe" : "inherit",
      shell: true,
      timeout: TEST_TIMEOUT,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (options.silent) {
      child.stdout?.on("data", (data) => (stdout += data.toString()));
      child.stderr?.on("data", (data) => (stderr += data.toString()));
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(
          new Error(`Command failed with code ${code}: ${stderr || stdout}`),
        );
      }
    });

    child.on("error", reject);
  });
}

async function test(name, testFn) {
  process.stdout.write(`${name}... `);
  try {
    await testFn();
    console.log("✅");
    return true;
  } catch (error) {
    console.log("❌");
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  let passedTests = 0;
  let totalTests = 0;

  // Setup: Install package and MCP SDK
  console.log("🔧 Setting up test environment...");

  // Create package.json
  const packageJson = {
    name: "test-mcp-validation",
    version: "1.0.0",
    type: "module",
    dependencies: {},
  };
  fs.writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  // Install the package and MCP SDK
  await runCommand(
    `npm install ${PACKAGE_NAME}@latest @modelcontextprotocol/sdk`,
    tempDir,
    { silent: true },
  );

  // Test 1: MCP Tool Generation
  totalTests++;
  if (
    await test("Testing MCP tool generation from ArgParser", async () => {
      const testCode = `
import { ArgParser, generateMcpToolsFromArgParser } from '${PACKAGE_NAME}';

const parser = new ArgParser({
  appName: "Test MCP CLI",
  appCommandName: "test-mcp",
  description: "Testing MCP tool generation",
  handler: async (ctx) => ({ result: "success", args: ctx.args })
}).addFlags([
  {
    name: "input",
    description: "Input data",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true
  },
  {
    name: "verbose",
    description: "Verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true
  }
]);

const tools = generateMcpToolsFromArgParser(parser);

if (tools.length === 0) {
  throw new Error('No tools generated');
}

const tool = tools[0];
if (!tool.name || !tool.inputSchema || !tool.execute) {
  throw new Error('Tool structure is invalid');
}

console.log(JSON.stringify({ 
  success: true, 
  toolName: tool.name,
  hasInputSchema: !!tool.inputSchema,
  hasExecute: typeof tool.execute === 'function'
}));
`;

      fs.writeFileSync(join(tempDir, "test-mcp-tools.mjs"), testCode);
      const result = await runCommand("node test-mcp-tools.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("MCP tool generation failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 2: MCP Tool Execution
  totalTests++;
  if (
    await test("Testing MCP tool execution", async () => {
      const testCode = `
import { ArgParser, generateMcpToolsFromArgParser } from '${PACKAGE_NAME}';

const parser = new ArgParser({
  appName: "Execute Test CLI",
  appCommandName: "execute-test",
  description: "Testing MCP tool execution",
  handler: async (ctx) => ({ 
    processed: true, 
    input: ctx.args.input,
    timestamp: new Date().toISOString()
  })
}).addFlags([
  {
    name: "input",
    description: "Input data to process",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true
  }
]);

const tools = generateMcpToolsFromArgParser(parser);
const tool = tools[0];

// Execute the tool
const result = await tool.executeForTesting({ input: "test-data" });

if (!result.success || !result.data || !result.data.processed) {
  throw new Error('Tool execution failed or returned unexpected result');
}

console.log(JSON.stringify({ 
  success: true,
  executionResult: result.data.processed,
  inputProcessed: result.data.input === "test-data"
}));
`;

      fs.writeFileSync(join(tempDir, "test-mcp-execution.mjs"), testCode);
      const result = await runCommand("node test-mcp-execution.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (
        !output.success ||
        !output.executionResult ||
        !output.inputProcessed
      ) {
        throw new Error("MCP tool execution test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 3: MCP Server Creation
  totalTests++;
  if (
    await test("Testing MCP server creation with ArgParser.withMcp", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

const mcpParser = ArgParser.withMcp({
  appName: "MCP Server Test",
  appCommandName: "mcp-server-test",
  description: "Testing MCP server creation",
  handler: async (ctx) => ({ serverResponse: "working" })
}).addFlags([
  {
    name: "port",
    description: "Server port",
    options: ["--port", "-p"],
    type: "number",
    defaultValue: 3000
  }
]);

// Verify MCP-specific methods are available
const hasWithMcp = typeof ArgParser.withMcp === 'function';
const hasToMcpTools = typeof mcpParser.toMcpTools === 'function';
const hasCreateMcpServer = typeof mcpParser.createMcpServer === 'function';

if (!hasWithMcp || !hasToMcpTools || !hasCreateMcpServer) {
  throw new Error('MCP methods not available');
}

console.log(JSON.stringify({
  success: true,
  hasWithMcp,
  hasToMcpTools,
  hasCreateMcpServer
}));
`;

      fs.writeFileSync(join(tempDir, "test-mcp-server.mjs"), testCode);
      const result = await runCommand("node test-mcp-server.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (
        !output.success ||
        !output.hasWithMcp ||
        !output.hasToMcpTools ||
        !output.hasCreateMcpServer
      ) {
        throw new Error("MCP server creation test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 4: MCP System Flag Integration
  totalTests++;
  if (
    await test("Testing MCP system flag integration", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

async function test() {
  const parser = ArgParser.withMcp({
    appName: "MCP Integration Test",
    appCommandName: "mcp-integration",
    description: "Testing MCP system flag integration",
    mcp: {
      serverInfo: { name: "test-mcp-server", version: "1.0.0" },
      transports: [
        { type: 'stdio' },
        { type: 'sse', port: 3001 }
      ]
    },
    handler: async (ctx) => ({ mainCommand: true, args: ctx.args })
  }).addFlags([
    {
      name: "config",
      description: "Configuration file",
      options: ["--config", "-c"],
      type: "string",
      defaultValue: "config.json"
    }
  ]);

  // Test that the parser can handle normal parsing
  const result = await parser.parse(['--config', 'test.json']);

  console.log(JSON.stringify({
    success: true,
    hasConfig: result.config === 'test.json'
  }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-mcp-subcommand.mjs"), testCode);
      const result = await runCommand("node test-mcp-subcommand.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success || !output.hasConfig) {
        throw new Error("MCP system flag integration test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 5: MCP Error Handling
  totalTests++;
  if (
    await test("Testing MCP error handling", async () => {
      const testCode = `
import { ArgParser, generateMcpToolsFromArgParser } from '${PACKAGE_NAME}';

async function test() {
  const parser = new ArgParser({
    appName: "Error Test CLI",
    appCommandName: "error-test",
    description: "Testing MCP error handling",
    handleErrors: false, // Important for testing error handling
    handler: async (ctx) => {
      if (ctx.args.shouldFail) {
        throw new Error("Intentional test error");
      }
      return { success: true };
    }
  }).addFlags([
    {
      name: "shouldFail",
      description: "Whether to trigger an error",
      options: ["--should-fail"],
      type: "boolean",
      flagOnly: true
    }
  ]);

  const tools = generateMcpToolsFromArgParser(parser);
  const tool = tools[0];

  // Test successful execution
  try {
    const successResult = await tool.execute({ shouldFail: false });
    if (!successResult || !successResult.success) {
      throw new Error('Successful execution test failed');
    }
  } catch (error) {
    throw new Error('Successful execution test failed: ' + error.message);
  }

  // Test error handling
  try {
    const errorResult = await tool.execute({ shouldFail: true });
    if (errorResult && errorResult.success) {
      throw new Error('Error handling test failed - should have failed');
    }
  } catch (error) {
    // Expected to throw an error
  }

  console.log(JSON.stringify({
    success: true,
    successfulExecution: true,
    errorHandling: true
  }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-mcp-errors.mjs"), testCode);
      const result = await runCommand("node test-mcp-errors.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (
        !output.success ||
        !output.successfulExecution ||
        !output.errorHandling
      ) {
        throw new Error("MCP error handling test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Summary
  console.log("\n📊 MCP Validation Summary");
  console.log("=========================");
  console.log(`✅ Passed: ${passedTests}/${totalTests} MCP tests`);

  if (passedTests === totalTests) {
    console.log(
      "\n🎉 All MCP validation tests passed! MCP integration is working correctly.",
    );
    process.exit(0);
  } else {
    console.log(
      `\n❌ ${totalTests - passedTests} MCP test(s) failed. Please investigate the issues above.`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n💥 MCP validation script failed:", error.message);
  process.exit(1);
});
