#!/usr/bin/env node
import { ArgParser } from "../../src";

const cli = new ArgParser({
  appName: "Getting Started",
  appCommandName: "getting-started",
  description: "Minimal ArgParser usage",
  handler: async (ctx) => ({ success: true, args: ctx.args }),
}).addFlags([
  {
    name: "name",
    description: "Your name",
    options: ["--name", "-n"],
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
  {
    name: "tag",
    description: "Repeatable tag",
    options: ["--tag", "-t"],
    type: "string",
    allowMultiple: true,
  },
]);

async function main() {
  try {
    const result = await cli.parse(process.argv.slice(2));
    if (result._asyncHandlerPromise) await result._asyncHandlerPromise;
    else console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error(err?.message || String(err));
    process.exit(1);
  }
}

export { cli };
if (process.argv[1] === new URL(import.meta.url).pathname) main();
