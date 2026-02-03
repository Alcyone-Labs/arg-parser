---
name: arg-parser
description: Type-safe CLI argument parser with MCP integration Zod validation auto-generated tools and interactive prompts
references:
  - core-api
  - flags
  - interactive-prompts
  - mcp-integration
  - types
---

# When Apply

Use this skill when user needs to:

- Build type-safe CLI tools with argument parsing
- Add MCP (Model Context Protocol) server capabilities to existing CLIs
- Define flags with Zod schemas for runtime validation
- Create unified tools that work in both CLI and MCP modes
- Generate DXTs (Distributed Extensions) from CLI code
- Handle subcommands, flag inheritance, and dynamic flag registration
- Add interactive prompts to CLIs using @clack/prompts
- Build dual-mode CLIs (programmatic flags + interactive prompts)
- Create sequential prompts with dependencies between answers

# Rules

## Core Flag Rules
- ALWAYS use `zodFlagSchema` for flag definitions with Zod v4 syntax
- Import from `#/core/types` for interfaces IFlag IHandlerContext TParsedArgs
- For internal imports use `#/*` alias e.g. `#/mcp/mcp-integration`
- For local imports use `./` e.g. `./FlagManager`
- Default flag type is `string` if not specified
- Mandate flags use `mandatory` property not `required`
- Environment variables: Flag > Env > Default priority

## MCP Rules
- MCP tool names auto-sanitized to `^[a-zA-Z0-9_-]{1,64}$`
- Console hijacking in MCP mode prevents STDOUT contamination
- Use `createMcpLogger` for data-safe logging in MCP context
- Output schemas supported in MCP protocol >= 2025-06-18

## Interactive Prompt Rules
- Add `prompt` property to flags for interactive mode support
- Use `promptSequence` for explicit ordering (1 = first, 2 = second)
- Fallback to array order when `promptSequence` not specified
- Use `--interactive` or `-i` flag to trigger interactive mode (default `promptWhen`)
- Available prompt types: `text`, `password`, `confirm`, `select`, `multiselect`
- Prompt factory function receives `IHandlerContext` with `promptAnswers` from previous prompts
- Validation in prompts returns `true` for valid or `string` for error message
- TTY detection auto-falls back to flag-only mode in CI/pipes
- Cancel handler (Ctrl+C) calls `onCancel` callback or exits gracefully
- Subcommands with prompts need `--interactive` on BOTH root AND sub-parser

# Workflow

## 1. Create CLI with flags

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "My CLI",
  appCommandName: "my-cli",
  handler: async (ctx) => {
    console.log("Running with:", ctx.args);
  },
}).addFlags([
  {
    name: "input",
    options: ["--input", "-i"],
    type: String,
    description: "Input file",
  },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
    defaultValue: false,
  },
]);

parser.parse(process.argv);
```

## 2. Add MCP server

```typescript
const parser = new ArgParser({...})
  .addFlags([...])
  .withMcp({
    serverInfo: { name: "my-cli-mcp", version: "1.0.0" },
    defaultTransport: { type: "stdio" }
  })

await parser.parse(process.argv)
```

## 3. Define flags with Zod schemas

```typescript
.addFlag({
  name: "config",
  options: ["--config", "-c"],
  type: z.object({
    host: z.string(),
    port: z.number()
  }),
  description: "Configuration object"
})
```

## 4. Create unified tool (CLI + MCP)

```typescript
parser.addTool({
  name: "process",
  description: "Process data",
  flags: [
    { name: "input", options: ["--input"], type: String, mandatory: true },
    { name: "output", options: ["--output"], type: String },
  ],
  handler: async (ctx) => ({ processed: true, input: ctx.args.input }),
  outputSchema: "successWithData",
});
```

## 5. Handle subcommands

```typescript
const subParser = new ArgParser({
  appName: "My CLI",
  handler: async (ctx) => {
    /* subcommand logic */
  },
}).addFlags([
  /* subcommand flags */
]);

parser.addSubCommand({
  name: "sub",
  description: "Subcommand description",
  parser: subParser,
});
```

## 6. Use flag inheritance

```typescript
new ArgParser({...}, undefined, FlagInheritance.AllParents)
```

## 7. Add interactive prompts

```typescript
const parser = new ArgParser({
  appName: "deploy-tool",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    if (ctx.isInteractive) {
      console.log("Interactive answers:", ctx.promptAnswers);
    }
    const env = ctx.args.environment || ctx.promptAnswers?.environment;
    console.log(`Deploying to ${env}...`);
  },
});

// Add --interactive flag
parser.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
  description: "Run in interactive mode",
});

// Add promptable flag
parser.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

await parser.parse();
```

## 8. Sequential prompts with dependencies

```typescript
parser.addFlag({
  name: "environment",
  options: ["--env"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

parser.addFlag({
  name: "version",
  options: ["--version"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => {
    // Access previous answer
    const env = ctx.promptAnswers?.environment;
    const versions = await fetchVersions(env);
    return {
      type: "select",
      message: `Select version for ${env}:`,
      options: versions,
    };
  },
} as IPromptableFlag);
```

## 9. Prompt when values are missing

```typescript
parser.addSubCommand({
  name: "init",
  description: "Initialize repository",
  promptWhen: "missing", // Prompt if required flags missing
  parser: initParser,
  onCancel: () => console.log("Init cancelled"),
});
```

# Examples

## Example 1: Basic CLI

Input: `my-cli --input ./data.json --verbose`

```typescript
// src/cli.ts
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Data Processor",
  appCommandName: "data-proc",
  handler: async (ctx) => {
    const { input, verbose } = ctx.args;
    console.log(`Processing: ${input}, verbose: ${verbose}`);
  },
}).addFlags([
  { name: "input", options: ["--input", "-i"], type: String, mandatory: true },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
    defaultValue: false,
  },
]);

parser.parse(process.argv);
```

## Example 2: MCP Server with tools

Input: `my-cli --s-mcp-serve`

```typescript
import { ArgParser, ArgParserError } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Search CLI",
  appCommandName: "search",
  handler: async (ctx) => ({ query: ctx.args.query }),
})
  .addFlags([
    {
      name: "query",
      options: ["--query", "-q"],
      type: String,
      mandatory: true,
    },
  ])
  .addTool({
    name: "search",
    description: "Search for items",
    flags: [
      { name: "term", options: ["--term"], type: String, mandatory: true },
      { name: "limit", options: ["--limit"], type: Number, defaultValue: 10 },
    ],
    handler: async (ctx) => ({ results: [`result for ${ctx.args.term}`] }),
    outputSchema: "successWithData",
  })
  .withMcp({
    serverInfo: { name: "search-cli", version: "1.0.0" },
    defaultTransport: { type: "stdio" },
  });

await parser.parse(process.argv);
```

## Example 3: DXT bundling with config plugins

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";
import { YamlConfigPlugin, globalConfigPluginRegistry } from "@alcyone-labs/arg-parser/config";

globalConfigPluginRegistry.register(new YamlConfigPlugin());

const parser = new ArgParser({
  appName: "Config App",
  appCommandName: "config-app",
})
  .addFlags([
    {
      name: "config",
      options: ["--config"],
      type: "string",
      env: "APP_CONFIG",
    },
  ])
  .withMcp({
    serverInfo: { name: "config-app", version: "1.0.0" },
    dxt: { include: ["config/", "assets/"] },
  });

await parser.parse(process.argv);
```

## Example 4: Interactive CLI with prompts

Input: `my-cli --interactive`

```typescript
import { ArgParser, type IPromptableFlag } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Deploy Tool",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    if (ctx.isInteractive) {
      console.log("Deploying with:", ctx.promptAnswers);
    }
    const env = ctx.args.environment || ctx.promptAnswers?.environment;
    console.log(`Deploying to ${env}...`);
  },
});

parser.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
});

parser.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: [
      { label: "Staging", value: "staging", hint: "Safe for testing" },
      { label: "Production", value: "production", hint: "Careful!" },
    ],
  }),
} as IPromptableFlag);

parser.addFlag({
  name: "version",
  options: ["--version", "-v"],
  type: "string",
  prompt: async (ctx) => {
    const env = ctx.promptAnswers?.environment;
    return {
      type: "select",
      message: `Select version for ${env}:`,
      options: ["1.0.0", "1.1.0", "2.0.0"],
    };
  },
} as IPromptableFlag);

await parser.parse();
```

## Example 5: Password prompt with validation

```typescript
parser.addFlag({
  name: "password",
  options: ["--password", "-p"],
  type: "string",
  prompt: async () => ({
    type: "password",
    message: "Enter password:",
  }),
} as IPromptableFlag);

parser.addFlag({
  name: "email",
  options: ["--email"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Enter email:",
    validate: (val) => {
      if (!val.includes("@")) return "Invalid email address";
      return true;
    },
  }),
} as IPromptableFlag);
```
