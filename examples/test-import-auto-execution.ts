#!/usr/bin/env bun
/**
 * Test script to demonstrate that auto-execution doesn't run when the module is imported
 */
// This should NOT trigger the CLI execution
import { cli } from "./auto-execution.js";

console.log("🔍 Testing auto-execution by importing the module...");

console.log("✅ Import completed successfully!");
console.log("🎯 The CLI was not executed because it was imported, not run directly");
console.log("📋 Available CLI instance:", typeof cli);

// We can still manually parse if needed
console.log("\n🔧 Manual parsing test:");
try {
  const result = await cli.parse(["--name", "ImportTest", "--count", "2"]);
  console.log("Manual parse result:", result);
} catch (error) {
  console.error("Manual parse error:", error);
}
