#!/usr/bin/env bun

// Demonstration of the --s-enable-fuzzy system flag with logging
import { ArgParser } from "../src/index";

const demoParser = new ArgParser({
  appName: "Demo CLI",
  appCommandName: "demo",
  description: "Demonstration CLI for fuzzy testing with logging",
  handler: async (ctx) => {
    console.log("🚨 ROOT HANDLER - This would perform some action!");
    console.log("   Args received:", ctx.args);
    return { action: "root", processed: true };
  },
})
  .addFlags([
    {
      name: "input",
      description: "Input file path",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true,
    },
    {
      name: "format",
      description: "Output format",
      options: ["--format", "-f"],
      type: "string",
      enum: ["json", "xml", "yaml"],
      defaultValue: "json",
    },
  ])
  .addSubCommand({
    name: "process",
    description: "Process the input",
    handler: async (ctx) => {
      console.log("🚨 PROCESS HANDLER - This would process data!");
      console.log("   Args received:", ctx.args);
      console.log("   Parent args:", ctx.parentArgs);
      return { action: "process", processed: true };
    },
    parser: new ArgParser({}, [
      {
        name: "algorithm",
        description: "Processing algorithm",
        options: ["--algorithm", "-a"],
        type: "string",
        enum: ["fast", "accurate"],
        defaultValue: "fast",
      },
    ]),
  });

console.log("🎯 Demo: --s-enable-fuzzy System Flag\n");

console.log("1. Normal execution (handlers will execute):");
console.log("   Command: demo --input test.txt process --algorithm accurate\n");

try {
  demoParser.parse([
    "--input",
    "test.txt",
    "process",
    "--algorithm",
    "accurate",
  ]);
} catch (error) {
  console.log(
    `   Error: ${error instanceof Error ? error.message : String(error)}`,
  );
}

console.log("\n" + "=".repeat(60));
console.log("2. With --s-enable-fuzzy (dry-run mode):");
console.log(
  "   Command: demo --s-enable-fuzzy --input test.txt process --algorithm accurate\n",
);

try {
  demoParser.parse([
    "--s-enable-fuzzy",
    "--input",
    "test.txt",
    "process",
    "--algorithm",
    "accurate",
  ]);
} catch (error) {
  console.log(
    `   Error: ${error instanceof Error ? error.message : String(error)}`,
  );
}

console.log("\n" + "=".repeat(60));
console.log("3. Testing without mandatory flags (only works in fuzzy mode):");
console.log("   Command: demo --s-enable-fuzzy process\n");

try {
  demoParser.parse(["--s-enable-fuzzy", "process"]);
} catch (error) {
  console.log(
    `   Error: ${error instanceof Error ? error.message : String(error)}`,
  );
}

console.log("\n🎉 Demo completed!");
console.log("\nKey observations:");
console.log("• Normal mode: Handlers execute and perform actions");
console.log(
  "• Fuzzy mode: Handlers are skipped but we see what args they would receive",
);
console.log(
  "• Fuzzy mode: Mandatory flags are optional for comprehensive testing",
);
console.log("• Fuzzy mode: Perfect for testing without side effects");

export default demoParser;
