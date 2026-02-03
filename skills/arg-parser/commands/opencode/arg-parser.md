# ArgParser Skill

Type-safe CLI argument parser with MCP integration, Zod validation, and interactive prompts.

## Usage

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-cli",
  handler: async (ctx) => console.log(ctx.args),
}).addFlags([{ name: "input", options: ["-i"], type: String, mandatory: true }]);

await cli.parse();
```

## Key Features

- **Type-safe flags** with Zod validation
- **MCP integration** for AI tools
- **Interactive prompts** via @clack/prompts
- **Subcommands** with inheritance
- **DXT generation** for distribution

## Examples

### Basic CLI

Create simple CLI with flags:

```typescript
const cli = new ArgParser({
  appName: "deploy",
  handler: async (ctx) => {
    console.log(`Deploying to ${ctx.args.env}`);
  },
}).addFlags([{ name: "env", options: ["--env"], type: String }]);
```

### Interactive Mode

Add prompts alongside flags:

```typescript
const cli = new ArgParser({
  appName: "setup",
  promptWhen: "interactive-flag",
}).addFlag({
  name: "name",
  options: ["--name"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Project name:",
  }),
} as IPromptableFlag);
```

### MCP Server

Add MCP capabilities:

```typescript
const parser = new ArgParser({...})
  .withMcp({
    serverInfo: { name: "my-mcp", version: "1.0.0" },
    defaultTransport: { type: "stdio" }
  });
```

## References

- `core-api/` - ArgParser class and handlers
- `flags/` - Flag definitions and validation
- `interactive-prompts/` - @clack/prompts integration
- `mcp-integration/` - MCP server setup
- `types/` - TypeScript types

## Rules

- Use `mandatory` not `required` for required flags
- Cast promptable flags: `as IPromptableFlag`
- Import types from `#/core/types`
- Use `--interactive` flag to trigger prompts
