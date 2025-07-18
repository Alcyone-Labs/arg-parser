#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { ArgParser } from "../dist/index.mjs";

// Example demonstrating async custom parser functions
const parser = new ArgParser({
  appName: "Async Parser Demo",
  appCommandName: "async-demo",
  handler: async (ctx) => {
    console.log("🎉 Async parsing completed successfully!");
    console.log("📊 Parsed results:");
    console.log(JSON.stringify(ctx.args, null, 2));
    return { success: true };
  },
}).addFlags([
  {
    name: "config",
    description: "Load configuration from JSON file",
    options: ["--config", "-c"],
    type: async (filePath) => {
      console.log(`📁 Reading config file: ${filePath}`);
      try {
        const content = await fs.readFile(filePath, "utf8");
        const config = JSON.parse(content);
        console.log(`✅ Config loaded: ${Object.keys(config).length} keys`);
        return config;
      } catch (error) {
        throw new Error(`Failed to load config: ${error.message}`);
      }
    },
  },
  {
    name: "user",
    description: "Fetch user data by ID (simulated API call)",
    options: ["--user", "-u"],
    type: async (userId) => {
      console.log(`🌐 Fetching user data for ID: ${userId}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulate API response
      const users = {
        123: { id: "123", name: "Alice Johnson", role: "admin" },
        456: { id: "456", name: "Bob Smith", role: "user" },
        789: { id: "789", name: "Carol Davis", role: "moderator" },
      };

      const user = users[userId];
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      console.log(`✅ User found: ${user.name} (${user.role})`);
      return user;
    },
  },
  {
    name: "delay",
    description: "Add artificial delay (in milliseconds)",
    options: ["--delay", "-d"],
    type: async (ms) => {
      const delay = parseInt(ms, 10);
      console.log(`⏱️  Adding ${delay}ms delay...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`✅ Delay completed`);
      return delay;
    },
  },
  {
    name: "sync",
    description: "Regular synchronous parser (for comparison)",
    options: ["--sync", "-s"],
    type: (value) => {
      console.log(`⚡ Sync processing: ${value}`);
      return value.toUpperCase();
    },
  },
]);

// Create a sample config file for testing
const sampleConfig = {
  appName: "My App",
  version: "1.0.0",
  features: ["auth", "logging", "metrics"],
  database: {
    host: "localhost",
    port: 5432,
  },
};

try {
  await fs.writeFile(
    "sample-config.json",
    JSON.stringify(sampleConfig, null, 2),
  );
  console.log("📝 Created sample-config.json for testing");
} catch (error) {
  console.warn("⚠️  Could not create sample config file:", error.message);
}

console.log(`
🚀 Async Custom Parser Demo

This example demonstrates async custom parser functions that can:
• Read and parse configuration files
• Make API calls to fetch data  
• Add artificial delays
• Mix with synchronous parsers

Try these commands:
  node examples/async-custom-parsers.mjs --config sample-config.json
  node examples/async-custom-parsers.mjs --user 123
  node examples/async-custom-parsers.mjs --delay 1000 --sync "hello world"
  node examples/async-custom-parsers.mjs --config sample-config.json --user 456 --delay 500

Available users: 123 (Alice), 456 (Bob), 789 (Carol)
`);

// Parse command line arguments
try {
  const result = await parser.parse(process.argv.slice(2));

  if (result.success) {
    console.log("\n🎯 Final result:", result);
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
