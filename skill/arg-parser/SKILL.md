---
name: arg-parser
description: Build type-safe CLI tools with unified CLI/MCP support, config management, DXT bundling, and modern TUI
references:
  - core-api
  - mcp
  - config
  - tui
  - dxt
  - patterns
---

# ArgParser Skill

Expert knowledge for building type-safe CLI applications with unified CLI/MCP tool support, configuration management, DXT executable bundling, and OpenTUI-based terminal interfaces.

## When to Apply

Use this skill when building or modifying:

- CLI applications with flag/argument parsing (`new ArgParser({})`)
- MCP servers exposing CLI tools (`toMcpTools()`, `createMcpServer()`)
- Config-driven applications (JSON, ENV, TOML, YAML plugins)
- Executable CLI tools with `--s-build-dxt` bundling
- TUI interfaces with OpenTUI components
- Multi-command CLIs with subcommands
- Type-safe argument validation with Zod schemas
- Applications requiring environment variable configuration

## Non-Negotiable Rules

1. **Use `addTool()` for unified CLI/MCP** - Single definition works as both CLI subcommand and MCP tool. Never use `addMcpTool()` for new code.

2. **Export all public APIs from `src/index.ts`** - Never import from internal paths like `src/core/ArgParser.ts`.

3. **Use `ctx.logger` in MCP mode** - `console.log` is hijacked; `ctx.logger` routes to STDERR safely.

4. **Default to `autoExit: true`** - CLI tools should exit by default. Set `false` for programmatic usage.

5. **Use Zod v4 syntax** - `z.url()` not `z.string().url()`. Zod v4 required.

6. **Async handlers use `deep: true` by default** - Automatic promise unwrapping. Set `false` to handle manually.

7. **Configure `inheritParentFlags`** - Default is `FlagInheritance.AllParents` for subcommands.

8. **Use `setWorkingDirectory` for config files** - Changes cwd for `.env` loading and file operations.

## Workflow Decision Tree

```
START: Building an ArgParser application?
│
├─► NEW CLI TOOL?
│   │
│   ├─► Basic CLI with flags only?
│   │   └─► Use `new ArgParserBase({}).addFlags([...])`
│   │
│   ├─► CLI with subcommands?
│   │   └─► Use `new ArgParser({}).addSubCommand({...})`
│   │
│   └─► CLI + MCP unified tools?
│       └─► Use `new ArgParser({}).addTool({...})`
│
├─► MCP SERVER?
│   │
│   ├─► Expose CLI tools as MCP?
│   │   └─► `parser.toMcpTools()` → `createMcpServer()`
│   │
│   ├─► Standalone MCP server?
│   │   └─► `createMcpArgParser()` factory
│   │
│   └─► Transport type?
│       ├─► Local IPC?
│       │   └─► `type: "stdio"`
│       ├─► HTTP SSE?
│       │   └─► `type: "sse"`
│       └─► HTTP Streamable?
│           └─► `type: "streamable-http"`
│
├─► CONFIG MANAGEMENT?
│   │
│   ├─► JSON config?
│   │   └─► `JsonConfigPlugin` (built-in)
│   │
│   ├─► ENV variables?
│   │   └─► `EnvConfigPlugin` (built-in)
│   │
│   ├─► TOML/YAML?
│   │   └─► Optional plugins (requires peer deps)
│   │
│   └─► Multiple sources?
│       └─► `ConfigPluginRegistry` with priority ordering
│
├─► BUILD DXT EXECUTABLE?
│   │
│   ├─► Basic DXT?
│   │   └─► `tsdown` bundler (auto-enabled with `--s-build-dxt`)
│   │
│   ├─► With node_modules?
│   │   └─► `--s-with-node-modules`
│   │
│   └─► Custom include/exclude?
│       └─► DxtPathResolver + dxtOptions in flags
│
└─► TUI INTERFACE?
    │
    ├─► Simple legacy UI?
    │   └─► `src/ui/` components (Component, Layout, Input)
    │
    └─► Modern OpenTUI v2?
        └─► `src/tui/` with SolidJS reconciler
```

## Quick Examples

### Example 1: Basic CLI with Flags

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "My CLI",
  appCommandName: "mycli",
}).addFlags([
  { name: "name", options: ["--name", "-n"], type: "string", mandatory: true },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
  },
]);

parser.setHandler(async (ctx) => {
  const name = ctx.args.name;
  const verbose = ctx.args.verbose;
  return { greeting: `Hello ${name}!`, verbose };
});

await parser.parse();
```

### Example 2: Unified CLI/MCP Tool

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Unified Tool",
  appCommandName: "unified",
}).addTool({
  name: "greet",
  description: "Greet someone by name",
  flags: [
    { name: "name", options: ["--name"], type: "string", mandatory: true },
  ],
  handler: async (ctx) => {
    return { success: true, greeting: `Hello ${ctx.args.name}!` };
  },
});

await parser.parse();
```

### Example 3: MCP Server with CLI Definitions

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "MCP Server",
}).addTool({
  name: "calculate",
  description: "Perform calculations",
  flags: [
    { name: "a", options: ["--a"], type: "number", mandatory: true },
    { name: "b", options: ["--b"], type: "number", mandatory: true },
    {
      name: "op",
      options: ["--op"],
      type: "string",
      enum: ["add", "subtract", "multiply"],
    },
  ],
  handler: async (ctx) => {
    const { a, b, op = "add" } = ctx.args;
    const result = op === "add" ? a + b : op === "subtract" ? a - b : a * b;
    return { success: true, result };
  },
});

const tools = parser.toMcpTools();
const server = parser.createMcpServer({
  name: "calc-server",
  version: "1.0.0",
});
await server.connect(tools);
```

### Example 4: Config Plugin Usage

```typescript
import {
  ArgParser,
  ConfigPluginRegistry,
  EnvConfigPlugin,
} from "@alcyone-labs/arg-parser";

const registry = new ConfigPluginRegistry();
registry.register(new EnvConfigPlugin());

const parser = new ArgParser({
  appName: "Config App",
}).addFlags([
  { name: "config", options: ["--config"], type: "string", env: "APP_CONFIG" },
]);

await parser.parse();
```

## Error Handling

- **`autoExit: true`** (default): Calls `process.exit()` on errors
- **`autoExit: false`**: Returns `ParseResult` object with `{ success, exitCode, data, message }`
- **`handleErrors: false`**: Throws errors for try/catch handling

```typescript
const result = await parser.parse([], { autoExit: false });
if (!result.success) {
  console.error(result.message);
  process.exit(result.exitCode);
}
```

## Import Patterns

```typescript
// Main export for all public APIs
import {
  ArgParser,
  ArgParserBase,
  ArgParserFuzzyTester,
  ArgParserMcp,
  ConfigPlugin,
  ConfigurationManager,
  createMcpArgParser,
  EnvConfigPlugin,
  FlagManager,
  generateMcpToolsFromArgParser,
  JsonConfigPlugin,
} from "@alcyone-labs/arg-parser";
// TUI exports
import {
  MasterDetail,
  TuiProvider,
  VirtualList,
} from "@alcyone-labs/arg-parser/tui";
// Internal aliases (for internal module imports only)
import { debug } from "#/utils/debug-utils";
```
