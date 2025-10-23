#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { ArgParser, type IFlag } from "../../src";

const cli = new ArgParser({
  appName: "Dynamic Flags Demo",
  appCommandName: "dynamic-flags-demo",
  handler: async (ctx) => ({ success: true, args: ctx.args }),
}).addFlags([
  {
    name: "manifest",
    description: "Path to manifest.json",
    options: ["--manifest", "-w"],
    type: "string",
    dynamicRegister: async ({ value, registerFlags }) => {
      try {
        const json = JSON.parse(await readFile(value, "utf8"));
        const flags: IFlag[] = Array.isArray(json.flags) ? json.flags : [];
        if (flags.length) registerFlags(flags);
      } catch {}
    },
  },
  {
    name: "tag",
    description: "Repeatable tag (help will show repeat syntax)",
    options: ["--tag", "-t"],
    type: "string",
    allowMultiple: true,
  },
  {
    name: "urls",
    description: "Repeatable urls (help will show repeat syntax)",
    options: ["--url", "-u"],
    valueHint: "https://example.com/robots.txt",
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
