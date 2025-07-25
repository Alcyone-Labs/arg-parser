#!/usr/bin/env bun
/**
 * Example demonstrating automatic argument detection when parse() is called without parameters
 *
 * This example shows how ArgParser can automatically detect and use process.argv.slice(2)
 * when parse() is called without arguments in a Node.js environment.
 *
 * Usage:
 *   bun examples/auto-argument-detection.ts --name "John" --age 30 --verbose
 *   npx tsx examples/auto-argument-detection.ts --name "Jane" --age 25
 */
import { ArgParser } from "../src";

const cli = ArgParser.withMcp({
  appName: "Auto Detection Demo",
  appCommandName: "auto-detect",
  description: "Demonstrates automatic argument detection",
  handler: async (ctx) => {
    console.log("\n🎉 Successfully parsed arguments!");
    console.log("📋 Parsed data:", {
      name: ctx.args.name,
      age: ctx.args.age,
      verbose: ctx.args.verbose,
      greeting: ctx.args.greeting,
    });

    if (ctx.args.verbose) {
      console.log("\n🔍 Verbose mode enabled - showing additional details:");
      console.log("  • Command chain:", ctx.commandChain);
      console.log("  • Is MCP mode:", ctx.isMcp);
    }

    return {
      success: true,
      message: `Hello ${ctx.args.name}! You are ${ctx.args.age} years old.`,
      data: {
        name: ctx.args.name,
        age: ctx.args.age,
        verbose: ctx.args.verbose,
      },
    };
  },
}).addFlags([
  {
    name: "name",
    description: "Your name",
    options: ["--name", "-n"],
    type: "string",
    mandatory: true,
  },
  {
    name: "age",
    description: "Your age",
    options: ["--age", "-a"],
    type: "number",
    mandatory: true,
  },
  {
    name: "verbose",
    description: "Enable verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
    defaultValue: false,
  },
  {
    name: "greeting",
    description: "Type of greeting",
    options: ["--greeting", "-g"],
    type: "string",
    enum: ["hello", "hi", "hey"],
    defaultValue: "hello",
  },
]);

// 🚀 NEW FEATURE: Call parse() without arguments!
// ArgParser will automatically detect Node.js environment and use process.argv.slice(2)
// A warning will be displayed to inform users about this behavior
async function main() {
  try {
    console.log("🔄 Calling parse() without arguments...");
    console.log("   ArgParser will auto-detect process.argv.slice(2)\n");

    // This is the new feature - parse() without arguments
    const result = await cli.parse();

    console.log("\n✅ Parse completed successfully!");

    if (result.success) {
      console.log("🎯 Result:", result.message);
    }
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// Alternative examples showing explicit argument passing (still works as before)
async function explicitExample() {
  console.log("\n📝 Example with explicit arguments:");

  try {
    // This still works as before - no warning will be shown
    const result = await cli.parse([
      "--name",
      "Alice",
      "--age",
      "28",
      "--verbose",
    ]);
    console.log("✅ Explicit parse result:", result.message);
  } catch (error) {
    console.error(
      "❌ Explicit parse error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Show both examples
// Check if this is the main module (Node.js/Bun compatible)
if (
  require.main === module ||
  (typeof process !== "undefined" && process.argv[1] === __filename)
) {
  console.log("🚀 ArgParser Auto-Detection Demo\n");
  console.log(
    "This example demonstrates the new automatic argument detection feature.",
  );
  console.log(
    "When parse() is called without arguments, ArgParser automatically uses process.argv.slice(2).\n",
  );

  await main();
  await explicitExample();

  console.log("\n💡 Tips:");
  console.log(
    "  • Use parse() without arguments for convenience in simple CLI scripts",
  );
  console.log("  • Use parse(process.argv.slice(2)) for explicit control");
  console.log(
    "  • The warning helps you understand what's happening under the hood",
  );
  console.log(
    "  • In non-Node.js environments, you must provide arguments explicitly",
  );
}
