# Types

TypeScript types and interfaces.

## Core Types

- `IFlag` - Flag definition input
- `ProcessedFlag` - Flag after processing
- `TParsedArgs` - Parsed arguments type
- `IHandlerContext` - Handler context
- `IArgParserParams` - Constructor options

## Interactive Prompts Types

- `IPromptableFlag` - Flag with prompt support
- `IInteractiveSubCommand` - Subcommand with prompts
- `PromptFieldConfig` - Prompt configuration
- `PromptType` - Prompt type union
- `PromptWhen` - When to trigger prompts

## MCP Types

- `IMcpServerMethods` - MCP server interface
- `McpTransportConfig` - Transport configuration
- `ToolConfig` - Tool definition

## Usage

```typescript
import type { IFlag, IHandlerContext, IPromptableFlag } from "@alcyone-labs/arg-parser";
```

See main SKILL.md for type examples.
