#!/usr/bin/env bun
/**
 * Example demonstrating the new auto-execution feature
 * This eliminates the need for boilerplate code to check if the script is being run directly
 */
import { ArgParser } from "../src/index.js";

// Create a simple CLI
const cli = ArgParser.withMcp({
  appName: "Auto Execution Demo",
  appCommandName: "auto-exec-demo",
  handler: async (ctx) => {
    console.log("🎉 CLI executed successfully!");
    console.log("Arguments received:", ctx.args);
    return { success: true, message: "Auto-execution works!" };
  },
})
  .addFlag({
    name: "name",
    description: "Your name",
    options: ["--name", "-n"],
    type: "string",
    defaultValue: "World",
  })
  .addFlag({
    name: "count",
    description: "Number of greetings",
    options: ["--count", "-c"],
    type: "number",
    defaultValue: 1,
  });

// 🚀 NEW FEATURE: Auto-execution with robust detection
// This replaces the brittle import.meta.url === `file://${process.argv[1]}` pattern
// with a more robust solution that works in sandboxes and different environments

console.log("📝 This script demonstrates auto-execution:");
console.log("   - Run directly: bun examples/auto-execution.ts --name Alice --count 3");
console.log("   - Import: import('./auto-execution.ts') - won't execute");
console.log("");

// 🚀 Canonical usage: parse with auto-execution detection via importMetaUrl
await cli.parse(undefined, { importMetaUrl: import.meta.url }).catch((error) => {
  console.error("Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

console.log(
  "✅ Script completed - if you see this, the script was imported, not executed directly",
);

// Export for potential importing
export { cli };

// ========================================
// Alternative usage patterns for reference:
// ========================================

// Pattern 1: Using the parse method directly with autoExecute option
// await cli.parse(undefined, {
//   autoExecute: true,
//   importMetaUrl: import.meta.url
// }).catch(handleError);

// Pattern 2: Manual detection (if you need more control)
// import { fileURLToPath } from "node:url";
// import { resolve } from "node:path";
//
// const currentFile = fileURLToPath(import.meta.url);
// const executedFile = resolve(process.argv[1]);
//
// if (currentFile === executedFile) {
//   await cli.parse().catch(handleError);
// }

// Pattern 3: The old brittle way (NOT recommended - breaks in sandboxes)
// if (import.meta.url === `file://${process.argv[1]}`) {
//   await cli.parse().catch(handleError);
// }
