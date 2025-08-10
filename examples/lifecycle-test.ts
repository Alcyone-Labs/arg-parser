#!/usr/bin/env node
import { ArgParser } from "../src";

// Simple test to demonstrate MCP lifecycle events
const cli = ArgParser.withMcp({
  appName: "Lifecycle Test CLI",
  appCommandName: "lifecycle-test",
  description: "Testing MCP lifecycle events",
  mcp: {
    serverInfo: {
      name: "lifecycle-test-mcp",
      version: "1.0.0",
      description: "Test server for lifecycle events",
    },
    lifecycle: {
      onInitialize: async (ctx) => {
        console.log("🚀 LIFECYCLE: onInitialize called");
        console.log(
          `   Client: ${ctx.clientInfo.name} v${ctx.clientInfo.version}`,
        );
        console.log(`   Protocol: ${ctx.protocolVersion}`);
        console.log(
          `   Server: ${ctx.serverInfo.name} v${ctx.serverInfo.version}`,
        );

        // Test flag access
        const testFlag = ctx.getFlag("test-flag");
        console.log(`   Test flag value: ${testFlag || "not set"}`);

        // Simulate some initialization work
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("   ✅ Initialization complete");
      },

      onInitialized: async (ctx) => {
        console.log("🎯 LIFECYCLE: onInitialized called");
        console.log(`   Client ready: ${ctx.clientInfo.name}`);
        console.log("   ✅ Server ready for operations");
      },

      onShutdown: async (ctx) => {
        console.log("🛑 LIFECYCLE: onShutdown called");
        console.log(`   Reason: ${ctx.reason}`);
        if (ctx.error) {
          console.log(`   Error: ${ctx.error.message}`);
        }
        console.log("   ✅ Cleanup complete");
      },
    },
  },
})
  .addFlag({
    name: "test-flag",
    description: "A test flag for lifecycle events",
    options: ["--test-flag"],
    type: "string",
    defaultValue: "default-value",
  })
  .addTool({
    name: "test.hello",
    description: "Simple test tool",
    flags: [
      {
        name: "name",
        description: "Name to greet",
        options: ["--name"],
        type: "string",
        defaultValue: "World",
      },
    ],
    handler: async (ctx) => {
      return {
        success: true,
        message: `Hello, ${ctx.args["name"]}!`,
        timestamp: new Date().toISOString(),
      };
    },
  });

// Export for testing
export { cli };

// Auto-execute only when run directly
await cli.parse(undefined, { importMetaUrl: import.meta.url }).catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
