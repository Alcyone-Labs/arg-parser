#!/usr/bin/env node

/**
 * Simple validation script for @alcyone-labs/arg-parser v2.0.0
 * Tests the core functionality that users actually use
 */
import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "@alcyone-labs/arg-parser";

console.log("🚀 Validating @alcyone-labs/arg-parser v2.0.0");
console.log("==============================================\n");

// Create temporary test directory
const tempDir = join(tmpdir(), `arg-parser-v2-validation-${randomUUID()}`);
console.log("📁 Test directory:", tempDir);
fs.mkdirSync(tempDir, { recursive: true });

process.on("exit", () => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

async function runCommand(command, cwd = tempDir, options = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, {
      cwd,
      stdio: options.silent ? "pipe" : "inherit",
      shell: true,
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
  let passed = 0;
  let total = 0;

  // Setup
  const packageJson = {
    name: "test-validation",
    version: "1.0.0",
    type: "module",
  };
  fs.writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  console.log("📦 Installing package...");
  await runCommand(`npm install ${PACKAGE_NAME}@latest`, tempDir, {
    silent: true,
  });

  // Test 1: Basic ESM import and parsing
  total++;
  if (
    await test("Basic ESM import and parsing", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

async function test() {
  const parser = new ArgParser({
    appName: "Test CLI",
    appCommandName: "test-cli",
    description: "Testing basic functionality"
  }).addFlags([
    {
      name: "input",
      description: "Input file",
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

  const result = await parser.parse(['--input', 'test.txt', '--verbose']);
  console.log(JSON.stringify({
    success: result.input === 'test.txt' && result.verbose === true
  }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-basic.mjs"), testCode);
      const result = await runCommand("node test-basic.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("Basic parsing failed");
      }
    })
  ) {
    passed++;
  }

  // Test 2: MCP integration with ArgParser.withMcp
  total++;
  if (
    await test("MCP integration with ArgParser.withMcp", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

async function test() {
  const parser = ArgParser.withMcp({
    appName: "MCP Test CLI",
    appCommandName: "mcp-test",
    description: "Testing MCP integration",
    mcp: {
      serverInfo: { name: "test-server", version: "1.0.0" }
    },
    handler: async (ctx) => ({ result: "success", args: ctx.args })
  }).addFlags([
    {
      name: "data",
      description: "Data to process",
      options: ["--data", "-d"],
      type: "string",
      mandatory: true
    }
  ]);

  const result = await parser.parse(['--data', 'test-data']);
  console.log(JSON.stringify({
    success: result.data === 'test-data' && typeof parser.toMcpTools === 'function'
  }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-mcp.mjs"), testCode);
      const result = await runCommand("node test-mcp.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("MCP integration failed");
      }
    })
  ) {
    passed++;
  }

  // Test 3: CommonJS compatibility
  total++;
  if (
    await test("CommonJS compatibility", async () => {
      const testCode = `
const { ArgParser } = require('${PACKAGE_NAME}');

async function test() {
  const parser = new ArgParser({
    appName: "CJS Test",
    appCommandName: "cjs-test",
    description: "Testing CommonJS"
  }).addFlags([
    {
      name: "output",
      description: "Output file",
      options: ["--output", "-o"],
      type: "string",
      defaultValue: "output.txt"
    }
  ]);

  const result = await parser.parse(['--output', 'result.txt']);
  console.log(JSON.stringify({
    success: result.output === 'result.txt'
  }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-cjs.cjs"), testCode);
      const result = await runCommand("node test-cjs.cjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("CommonJS compatibility failed");
      }
    })
  ) {
    passed++;
  }

  // Test 4: TypeScript definitions
  total++;
  if (
    await test("TypeScript definitions", async () => {
      await runCommand("npm install typescript --save-dev", tempDir, {
        silent: true,
      });

      const testCode = `
import { ArgParser, type IFlag } from '${PACKAGE_NAME}';

const flags: IFlag[] = [
  {
    name: "verbose",
    description: "Verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true
  }
];

const parser = new ArgParser({
  appName: "TS Test",
  appCommandName: "ts-test",
  description: "Testing TypeScript definitions"
}).addFlags(flags);

console.log('TypeScript compilation successful');
`;

      fs.writeFileSync(join(tempDir, "test-types.ts"), testCode);

      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
        },
      };
      fs.writeFileSync(
        join(tempDir, "tsconfig.json"),
        JSON.stringify(tsConfig, null, 2),
      );

      await runCommand("npx tsc --noEmit test-types.ts", tempDir, {
        silent: true,
      });
    })
  ) {
    passed++;
  }

  // Summary
  console.log("\n📊 Validation Results");
  console.log("====================");
  console.log(`✅ Passed: ${passed}/${total} tests`);

  if (passed === total) {
    console.log("\n🎉 All tests passed! Version 2.0.0 is working correctly.");
    process.exit(0);
  } else {
    console.log(`\n❌ ${total - passed} test(s) failed.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n💥 Validation failed:", error.message);
  process.exit(1);
});
