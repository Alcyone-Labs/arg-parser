#!/usr/bin/env bun

import { ArgParser } from "../src";

// Example demonstrating the --s-with-env system flag:
// 1. Call with --s-save-to-env to generate config file ("ScriptName.env" if you don't pass a file name)
// 2. Then fill in the file, and then use --s-with-env ScriptName.env (or the file name you passed) to load them
const parser = new ArgParser({
  appName: "Config Example",
  appCommandName: "script-name",
  description: "Demonstrates loading configuration from files",
  handler: (ctx) => {
    console.log("Configuration loaded:");
    console.log(JSON.stringify(ctx.args, null, 2));
    return ctx.args;
  },
})
.addFlags([
  {
    name: "verbose",
    description: "Enable verbose output",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
    defaultValue: false,
  },
  {
    name: "output",
    description: "Output file path",
    options: ["--output", "-o"],
    type: "string",
    mandatory: true,
  },
  {
    name: "count",
    description: "Number of items to process",
    options: ["--count", "-c"],
    type: "number",
    defaultValue: 1,
  },
  {
    name: "tags",
    description: "List of tags",
    options: ["--tags", "-t"],
    type: "string",
    allowMultiple: true,
  },
  {
    name: "format",
    description: "Output format",
    options: ["--format", "-f"],
    type: "string",
    enum: ["json", "yaml", "xml"],
    defaultValue: "json",
  },
]);

// Parse arguments
const result = parser.parse(process.argv.slice(2));
console.log("Final result:", result);
