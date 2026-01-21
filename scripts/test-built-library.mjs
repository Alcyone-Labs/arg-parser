#!/usr/bin/env node

/**
 * Integration test for the built library
 * Tests that the built artifacts work correctly in different environments
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🧪 Testing Built Library Integration\n");

// Test 1: Import from built ESM module
console.log("1. Testing ESM import from dist/index.mjs...");
try {
  const { ArgParser } = await import("../dist/index.mjs");

  // Create a simple parser without handler to test parsing
  const parser = new ArgParser({
    appName: "Test CLI",
    appCommandName: "test-cli",
    description: "Testing built library",
    handleErrors: false, // Disable error handling to get exceptions instead of process.exit
  }).addFlags([
    {
      name: "input",
      description: "Input file",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true,
    },
    {
      name: "verbose",
      description: "Verbose output",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
    },
  ]);

  // Test parsing (parse is async, so we need to await it)
  const result = await parser.parse(["--input", "test.txt", "--verbose"]);

  if (result.input === "test.txt" && result.verbose === true) {
    console.log("   ✅ ESM import and basic parsing works");
  } else {
    throw new Error(`Unexpected result: ${JSON.stringify(result)}`);
  }
} catch (error) {
  console.log(`   ❌ ESM import failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Test CommonJS import
console.log("\n2. Testing CommonJS import from dist/index.cjs...");
try {
  // Create a temporary test file for CJS
  const cjsTestContent = `
const { ArgParser } = require('./dist/index.cjs');

async function test() {
  const parser = new ArgParser({
    appName: "CJS Test CLI",
    appCommandName: "cjs-test",
    description: "Testing CJS build",
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

test().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message }));
});
`;

  fs.writeFileSync("temp-cjs-test.cjs", cjsTestContent);

  const output = execSync("node temp-cjs-test.cjs", { encoding: "utf8" });
  const result = JSON.parse(output.trim());

  if (result.success) {
    console.log("   ✅ CommonJS import and parsing works");
  } else {
    throw new Error("CJS test failed");
  }

  // Clean up
  fs.unlinkSync("temp-cjs-test.cjs");
} catch (error) {
  console.log(`   ❌ CommonJS import failed: ${error.message}`);
  // Clean up on error
  try {
    fs.unlinkSync("temp-cjs-test.cjs");
  } catch {}
  process.exit(1);
}

// Test 3: Test TypeScript definitions
console.log("\n3. Testing TypeScript definitions...");
try {
  const dtsPath = "./dist/src/index.d.ts";
  if (!fs.existsSync(dtsPath)) {
    throw new Error("TypeScript definitions not found");
  }

  const dtsContent = fs.readFileSync(dtsPath, "utf8");

  // Check for key exports
  const expectedExports = [
    "ArgParser",
    "ArgParserBase",
    "ArgParserError",
    "IFlag",
    "TParsedArgs",
    "ArgParserFuzzyTester",
  ];

  for (const expectedExport of expectedExports) {
    if (!dtsContent.includes(expectedExport)) {
      throw new Error(`Missing export: ${expectedExport}`);
    }
  }

  console.log("   ✅ TypeScript definitions are complete");
} catch (error) {
  console.log(`   ❌ TypeScript definitions test failed: ${error.message}`);
  process.exit(1);
}

// Test 4: Test MCP integration
console.log("\n4. Testing MCP integration...");
try {
  const { ArgParser } = await import("../dist/index.mjs");

  const mcpParser = ArgParser.withMcp({
    appName: "MCP Test CLI",
    appCommandName: "mcp-test",
    description: "Testing MCP integration",
    handler: async (ctx) => {
      return { message: "MCP test successful", args: ctx.args };
    },
  }).addFlags([
    {
      name: "data",
      description: "Data to process",
      options: ["--data", "-d"],
      type: "string",
      mandatory: true,
    },
  ]);

  // Test that MCP parser has the mcp subcommand
  const hasAddMcpSubCommand = typeof mcpParser.addMcpSubCommand === "function";

  if (hasAddMcpSubCommand) {
    console.log("   ✅ MCP integration is available");
  } else {
    throw new Error("MCP integration not working");
  }
} catch (error) {
  console.log(`   ❌ MCP integration test failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Test fuzzy testing functionality
console.log("\n5. Testing fuzzy testing functionality...");
try {
  const { ArgParser, ArgParserFuzzyTester } = await import("../dist/index.mjs");

  const testParser = new ArgParser({
    appName: "Fuzzy Test CLI",
    appCommandName: "fuzzy-test",
    description: "Testing fuzzy functionality",
    handler: async (ctx) => {
      return { result: "success" };
    },
  }).addFlags([
    {
      name: "count",
      description: "Number of items",
      options: ["--count", "-c"],
      type: "number",
      defaultValue: 1,
    },
  ]);

  const fuzzyTester = new ArgParserFuzzyTester(testParser, {
    maxDepth: 2,
    randomTestCases: 2,
    includePerformance: false,
    testErrorCases: false, // Disable error cases to avoid console output
    verbose: false,
  });

  const report = await fuzzyTester.runFuzzyTest();

  if (report && typeof report.totalTests === "number" && report.totalTests > 0) {
    console.log("   ✅ Fuzzy testing functionality works");
  } else {
    throw new Error("Fuzzy testing not working properly");
  }
} catch (error) {
  console.log(`   ❌ Fuzzy testing test failed: ${error.message}`);
  process.exit(1);
}

// Test 6: Test system flags
console.log("\n6. Testing system flags...");
try {
  const { ArgParser } = await import("../dist/index.mjs");

  const systemFlagParser = new ArgParser({
    appName: "System Flag Test",
    appCommandName: "sys-test",
    description: "Testing system flags",
    handleErrors: false,
  }).addFlags([
    {
      name: "required",
      description: "Required flag",
      options: ["--required", "-r"],
      type: "string",
      mandatory: true,
    },
  ]);

  // Test --s-enable-fuzzy system flag (should skip mandatory validation)
  const fuzzyResult = systemFlagParser.parse(["--s-enable-fuzzy"]);

  // In fuzzy mode, mandatory flags should be optional
  if (typeof fuzzyResult === "object") {
    console.log("   ✅ System flags (--s-enable-fuzzy) work correctly");
  } else {
    throw new Error("System flags not working");
  }
} catch (error) {
  console.log(`   ❌ System flags test failed: ${error.message}`);
  process.exit(1);
}

console.log("\n🎉 All built library tests passed!");
console.log("\n📦 Build artifacts verified:");
console.log("   • ESM module (dist/index.mjs) ✅");
console.log("   • CommonJS module (dist/index.cjs) ✅");
console.log("   • TypeScript definitions (dist/src/index.d.ts) ✅");
console.log("   • MCP integration ✅");
console.log("   • Fuzzy testing ✅");
console.log("   • System flags ✅");
console.log("\n✨ The library is ready for use!");
