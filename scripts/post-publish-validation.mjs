#!/usr/bin/env node

/**
 * Post-publish validation script
 * Tests the latest published version from npm registry to ensure it works correctly
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

console.log("🚀 Post-Publish Validation for", PACKAGE_NAME);
console.log("=====================================\n");

// Create temporary test directory
const tempDir = join(tmpdir(), `arg-parser-validation-${randomUUID()}`);
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

  // Test 1: Install latest version from npm
  totalTests++;
  if (
    await test("Installing latest version from npm", async () => {
      // Create package.json
      const packageJson = {
        name: "test-validation",
        version: "1.0.0",
        type: "module",
        dependencies: {},
      };
      fs.writeFileSync(
        join(tempDir, "package.json"),
        JSON.stringify(packageJson, null, 2),
      );

      // Install the package
      await runCommand(`npm install ${PACKAGE_NAME}@latest`, tempDir, {
        silent: true,
      });

      // Verify installation
      const nodeModulesPath = join(
        tempDir,
        "node_modules",
        PACKAGE_NAME.replace("@", "").replace("/", "-"),
      );
      if (
        !fs.existsSync(
          join(tempDir, "node_modules", "@alcyone-labs", "arg-parser"),
        )
      ) {
        throw new Error("Package not installed correctly");
      }
    })
  ) {
    passedTests++;
  }

  // Test 2: Check package size
  totalTests++;
  if (
    await test("Verifying package size is reasonable", async () => {
      const result = await runCommand(
        `npm list ${PACKAGE_NAME} --depth=0 --json`,
        tempDir,
        { silent: true },
      );
      const packageInfo = JSON.parse(result.stdout);

      // Get package tarball info
      const infoResult = await runCommand(
        `npm info ${PACKAGE_NAME} --json`,
        tempDir,
        { silent: true },
      );
      const info = JSON.parse(infoResult.stdout);

      const unpackedSize = info.dist?.unpackedSize || 0;
      const tarballSize = info.dist?.tarballSize || 0;

      console.log(
        `\n   📦 Package size: ${Math.round(tarballSize / 1024)}KB compressed, ${Math.round(unpackedSize / 1024)}KB unpacked`,
      );

      // Warn if package is larger than expected (should be much smaller after fixing externals)
      if (tarballSize > 1000000) {
        // 1MB
        console.log(
          "   ⚠️  Package size is larger than expected - check if dependencies are properly externalized",
        );
      }
    })
  ) {
    passedTests++;
  }

  // Test 3: Test ESM import
  totalTests++;
  if (
    await test("Testing ESM import", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

async function test() {
  const parser = new ArgParser({
    appName: "Test CLI",
    appCommandName: "test-cli",
    description: "Testing ESM import",
    handleErrors: false
  }).addFlags([
    {
      name: "input",
      description: "Input file",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true
    }
  ]);

  const result = await parser.parse(['--input', 'test.txt']);
  console.log(JSON.stringify({ success: result.input === 'test.txt' }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-esm.mjs"), testCode);
      const result = await runCommand("node test-esm.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("ESM import test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 4: Test CommonJS import
  totalTests++;
  if (
    await test("Testing CommonJS import", async () => {
      const testCode = `
const { ArgParser } = require('${PACKAGE_NAME}');

async function test() {
  const parser = new ArgParser({
    appName: "CJS Test CLI",
    appCommandName: "cjs-test",
    description: "Testing CJS import",
    handleErrors: false
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
  console.log(JSON.stringify({ success: result.output === 'result.txt' }));
}

test().catch(console.error);
`;

      fs.writeFileSync(join(tempDir, "test-cjs.cjs"), testCode);
      const result = await runCommand("node test-cjs.cjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("CommonJS import test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Test 5: Test TypeScript definitions
  totalTests++;
  if (
    await test("Testing TypeScript definitions", async () => {
      // Install TypeScript
      await runCommand("npm install typescript --save-dev", tempDir, {
        silent: true,
      });

      const testCode = `
import { ArgParser, type IFlag, type TParsedArgs } from '${PACKAGE_NAME}';

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

// This should compile without errors if types are correct
const result: TParsedArgs<typeof flags> = parser.parse(['--verbose']);
console.log('TypeScript compilation successful');
`;

      fs.writeFileSync(join(tempDir, "test-types.ts"), testCode);

      // Create tsconfig.json
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

      // Compile TypeScript
      await runCommand("npx tsc --noEmit test-types.ts", tempDir, {
        silent: true,
      });
    })
  ) {
    passedTests++;
  }

  // Test 6: Test MCP integration
  totalTests++;
  if (
    await test("Testing MCP integration", async () => {
      const testCode = `
import { ArgParser } from '${PACKAGE_NAME}';

const mcpParser = ArgParser.withMcp({
  appName: "MCP Test CLI",
  appCommandName: "mcp-test",
  description: "Testing MCP integration",
  handler: async (ctx) => {
    return { message: "MCP test successful", args: ctx.args };
  }
}).addFlags([
  {
    name: "data",
    description: "Data to process",
    options: ["--data", "-d"],
    type: "string",
    mandatory: true
  }
]);

// Test that MCP parser has the mcp subcommand
const hasAddMcpSubCommand = typeof mcpParser.addMcpSubCommand === 'function';
console.log(JSON.stringify({ success: hasAddMcpSubCommand }));
`;

      fs.writeFileSync(join(tempDir, "test-mcp.mjs"), testCode);
      const result = await runCommand("node test-mcp.mjs", tempDir, {
        silent: true,
      });
      const output = JSON.parse(result.stdout.trim());

      if (!output.success) {
        throw new Error("MCP integration test failed");
      }
    })
  ) {
    passedTests++;
  }

  // Summary
  console.log("\n📊 Validation Summary");
  console.log("====================");
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);

  if (passedTests === totalTests) {
    console.log(
      "\n🎉 All validation tests passed! The published package is working correctly.",
    );
    process.exit(0);
  } else {
    console.log(
      `\n❌ ${totalTests - passedTests} test(s) failed. Please investigate the issues above.`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n💥 Validation script failed:", error.message);
  process.exit(1);
});
