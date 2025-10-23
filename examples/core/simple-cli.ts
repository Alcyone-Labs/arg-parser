#!/usr/bin/env node
import { ArgParser } from "../../src";

const cli = new ArgParser({
  appName: "Simple CLI",
  appCommandName: "simple-cli",
  handler: async (ctx) => ({ ok: true, args: ctx.args }),
}).addFlags([
  {
    name: "input",
    description: "Input path",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "dryRun",
    description: "No changes",
    options: ["--dry-run"],
    type: "boolean",
    flagOnly: true,
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
