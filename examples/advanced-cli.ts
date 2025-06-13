#!/usr/bin/env node
/**
 * Advanced CLI Example - demonstrates sub-commands and handlers
 *
 * This example shows how to create a CLI tool with:
 * - Sub-commands with their own flags
 * - Handler functions for different commands
 * - Nested sub-commands
 * - Global flags that apply to all commands
 */
import chalk from "chalk";
import { ArgParser } from "../src";

// Create the main parser with global flags
const mainParser = new ArgParser(
  {
    appName: "Advanced CLI Example",
    appCommandName: "advanced-cli",
    description: "An advanced CLI tool demonstrating sub-commands and handlers",
    subCommands: [
      // Database management commands
      {
        name: "db",
        description: "Database management commands",
        parser: new ArgParser({
          subCommands: [
            {
              name: "migrate",
              description: "Run database migrations",
              handler: (ctx) => {
                console.log(chalk.blue("🔄 Running database migrations..."));
                console.log(
                  `Environment: ${ctx.parentArgs?.environment || "development"}`,
                );
                if (ctx.args.force) {
                  console.log(
                    chalk.yellow(
                      "⚠️  Force flag enabled - skipping safety checks",
                    ),
                  );
                }
                console.log(
                  chalk.green("✅ Migrations completed successfully"),
                );
              },
              parser: new ArgParser({}, [
                {
                  name: "force",
                  description: "Force migration without safety checks",
                  options: ["--force", "-f"],
                  type: "boolean",
                  flagOnly: true,
                  defaultValue: false,
                },
              ]),
            },
            {
              name: "seed",
              description: "Seed the database with sample data",
              handler: (ctx) => {
                console.log(chalk.blue("🌱 Seeding database..."));
                console.log(
                  `Environment: ${ctx.parentArgs?.environment || "development"}`,
                );
                console.log(`Records to create: ${ctx.args.count}`);
                console.log(chalk.green("✅ Database seeded successfully"));
              },
              parser: new ArgParser({}, [
                {
                  name: "count",
                  description: "Number of sample records to create",
                  options: ["--count", "-c"],
                  type: "number",
                  defaultValue: 100,
                },
              ]),
            },
          ],
        }),
      },

      // Server management commands
      {
        name: "server",
        description: "Server management commands",
        parser: new ArgParser({
          subCommands: [
            {
              name: "start",
              description: "Start the server",
              handler: (ctx) => {
                console.log(chalk.blue("🚀 Starting server..."));
                console.log(
                  `Environment: ${ctx.parentArgs?.environment || "development"}`,
                );
                console.log(`Port: ${ctx.args.port}`);
                if (ctx.args.watch) {
                  console.log(
                    chalk.cyan(
                      "👀 Watch mode enabled - will restart on file changes",
                    ),
                  );
                }
                console.log(
                  chalk.green(
                    `✅ Server started successfully on port ${ctx.args.port}`,
                  ),
                );
              },
              parser: new ArgParser({}, [
                {
                  name: "port",
                  description: "Port to start the server on",
                  options: ["--port", "-p"],
                  type: "number",
                  defaultValue: 3000,
                },
                {
                  name: "watch",
                  description: "Enable watch mode for development",
                  options: ["--watch", "-w"],
                  type: "boolean",
                  flagOnly: true,
                  defaultValue: false,
                },
              ]),
            },
          ],
        }),
      },
    ],
  },
  [
    // Global flags available to all commands
    {
      name: "environment",
      description: "Target environment",
      options: ["--env", "-e"],
      type: "string",
      enum: ["development", "staging", "production"],
      defaultValue: "development",
    },
    {
      name: "verbose",
      description: "Enable verbose logging",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
      defaultValue: false,
    },
  ],
);

// Parse and execute
const args = mainParser.parse(process.argv.slice(2));

// This will only run if no sub-command handlers were executed
if (!args.$commandChain) {
  console.log(
    chalk.yellow("No command specified. Use --help to see available commands."),
  );
}
