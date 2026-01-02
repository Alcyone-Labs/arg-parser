#!/usr/bin/env tsx
import { ArgParser, autoHelpHandler } from "../src";

/**
 * This example demonstrates the different ways to handle help display
 * automatically when commands are invoked without enough information.
 */

const cli = new ArgParser({
  appName: "auto-help-demo",
  description: "A demo of automatic help display features",
  // 1. Framework-level auto-help:
  // When true, any command/subcommand without a handler will show help.
  triggerAutoHelpIfNoHandler: true,
});

// A subcommand that uses autoHelpHandler explicitly
// (Useful if you want to be explicit or if triggerAutoHelpIfNoHandler is false)
const configCmd = new ArgParser({
  appName: "config",
  description: "Configuration management",
  handler: autoHelpHandler,
}).addTool({
  name: "set",
  description: "Set a config value",
  flags: [
    { name: "key", type: "string", mandatory: true, options: ["--key"] },
    { name: "val", type: "string", mandatory: true, options: ["--val"] },
  ],
  handler: async (ctx) => {
    console.log(`Setting ${ctx.args.key} to ${ctx.args.val}`);
  },
});

// A subcommand that relies on triggerAutoHelpIfNoHandler (inherited)
const utilCmd = new ArgParser({
  appName: "utils",
  description: "Utility tools",
  // No handler here! Help will be shown automatically because of the parent setting.
}).addTool({
  name: "ping",
  description: "Ping something",
  flags: [],
  handler: async () => {
    console.log("Pong!");
  },
});

// A subcommand with a manual help trigger
cli.addSubCommand({
  name: "manual",
  parser: new ArgParser({
    appName: "manual",
    handler: async (ctx) => {
      const realArgs = Object.keys(ctx.args).filter(
        (k) => k !== "help" && ctx.args[k] !== undefined,
      );
      if (realArgs.length === 0) {
        console.log(
          "No flags provided to 'manual'. Try providing flags or see help:",
        );
        // 2. Explicit help trigger from handler
        ctx.displayHelp();
        return;
      }
      console.log("Manual command executed with args:", ctx.args);
    },
  }),
});

cli.addSubCommand({ name: "config", parser: configCmd });
cli.addSubCommand({ name: "utils", parser: utilCmd });

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx examples/auto-help-demo.ts <command>");
    console.log("Try: config, utils, or manual\n");
  }

  await cli.parse(args);
}

main().catch(console.error);
