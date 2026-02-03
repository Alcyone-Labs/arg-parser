# ArgParser Skill

Type-safe CLI argument parser with MCP integration, Zod validation, auto-generated tools, and interactive prompts.

## Overview

This skill provides expert knowledge for building CLI tools with @alcyone-labs/arg-parser. It covers:

- **Core API**: ArgParser, flags, subcommands, handlers
- **Interactive Prompts**: @clack/prompts integration for dual-mode CLIs
- **MCP Integration**: Model Context Protocol server capabilities
- **Type System**: TypeScript types, Zod schemas, validation

## When to Use

- Building CLI tools with argument parsing
- Adding MCP server capabilities to CLIs
- Creating dual-mode tools (CLI + programmatic)
- Need type-safe flag definitions with validation
- Want interactive prompts alongside flags

## Quick Start

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-cli",
  handler: async (ctx) => console.log(ctx.args),
}).addFlags([
  { name: "input", options: ["-i"], type: String, mandatory: true },
]);

await cli.parse();
```

## References

- `core-api/` - ArgParser class, handlers, context
- `flags/` - Flag definitions, types, validation
- `interactive-prompts/` - @clack/prompts integration
- `mcp-integration/` - MCP server setup
- `types/` - TypeScript types and interfaces

## Installation

```bash
./install.sh --local   # Local install
./install.sh --global  # Global install
```
