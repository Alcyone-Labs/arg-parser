# ArgParser - Type-Safe Command Line Argument Parser

A powerful, type-safe TypeScript library for building command-line interfaces with automatic MCP (Model Context Protocol) integration, hierarchical sub-commands, and comprehensive tooling support.

## Installation

```bash
# Core library with built-in MCP support and DXT generation
pnpm add @alcyone-labs/arg-parser
```

## Quick Start

### Basic CLI in 30 Seconds

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-tool",
  appCommandName: "my-tool",
  description: "A sample CLI tool",
});

cli.addFlags([
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: "boolean",
    description: "Enable verbose output",
  },
  {
    name: "output",
    options: ["--output", "-o"],
    type: "string",
    description: "Output file path",
  },
  {
    name: "count",
    options: ["--count", "-c"],
    type: "number",
    defaultValue: 5,
    description: "Number of items",
  },
]);

cli.setHandler(async (ctx) => {
  console.log("Arguments:", ctx.args);
  console.log("Parsed flags:", ctx.args);
});

cli.parse(process.argv.slice(2));
```

### MCP-Ready CLI

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "search-tool",
  appCommandName: "search-tool",
  description: "Search and analyze data",
  mcp: {
    serverInfo: {
      name: "search-tool-mcp",
      version: "1.0.0",
      description: "Search and analyze data via MCP",
    },
  },
});

cli.addFlags([
  {
    name: "query",
    options: ["--query", "-q"],
    type: "string",
    mandatory: true,
    description: "Search query",
  },
  {
    name: "limit",
    options: ["--limit", "-l"],
    type: "number",
    defaultValue: 10,
    description: "Max results",
  },
]);

cli.setHandler(async (ctx) => {
  return await performSearch(ctx.args.query, ctx.args.limit);
});

cli.parse(process.argv.slice(2));
```

## Features Overview

### Core CLI Features

- **Type-safe flag definitions** with TypeScript support
- **Hierarchical sub-commands** with inheritance
- **Automatic help generation** with `--help` flag
- **Input validation** and type coercion
- **Environment variable export** in multiple formats (.env, json, toml, yaml)
- **Alias support** for flags and commands
- **Default values** and mandatory flag validation

### MCP and DXT Integration (v2.0.0+)

- **Automatic MCP server generation** from CLI definitions
- **Claude Desktop ready** with DXT package generation
- **Multiple transport support** (stdio, SSE, WebSocket)
- **Tool introspection** and automatic schema generation
- **Zero-configuration MCP compliance**

### System & Configuration Features (v1.2.0+)

- **Environment file management** (`--s-save-to-env`, `--s-with-env`)
- **Debug modes** (`--s-debug`, `--s-debug-print`)
- **Fuzzy testing** (`--s-enable-fuzzy`)
- **Console hijacking** for MCP compliance
- **DXT package building** (`--s-build-dxt`)

## Runtime Compatibility

### BunJS

```bash
# Direct execution with TypeScript support
bun run my-cli.ts --help

# Compiled execution
bun build my-cli.ts --outdir dist
bun dist/my-cli.js --help
```

### Node.js

```bash
# With tsx for TypeScript
npx tsx my-cli.ts --help

# Compiled JavaScript
node dist/my-cli.js --help
```

### Deno

```bash
# Direct TypeScript execution
deno run --allow-all my-cli.ts --help
```

### Using the Library in Your Projects

Import and use ArgParser in your TypeScript/JavaScript projects across all supported runtimes.

### Running Examples

```bash
# Clone and explore examples
git clone <repository>
pnpm install # or bun install or npm install, etc...
cd arg-parser/examples
bun run getting-started.ts
bun run simple-cli.ts
```

## Core Concepts

### Defining Flags

Flags are defined using the `IFlag` interface:

```typescript
interface IFlag {
  name: string; // Flag name (e.g., 'verbose' for --verbose)
  options: string[]; // Flag options (e.g., ['--verbose', '-v'])
  type: "string" | "number" | "boolean" | "array";
  description?: string; // Help text description
  mandatory?: boolean; // Required flag
  defaultValue?: any; // Default value
  default?: any; // Alias for defaultValue
  flagOnly?: boolean; // Flag without value (like --help)
  enum?: any[]; // Valid options for the flag
  choices?: string[]; // Alias for enum
  validate?: (value: any, parsedArgs?: any) => boolean | string | void;
  allowMultiple?: boolean; // Allow multiple values
  env?: string | string[]; // Environment variables, will auto-fill flag value if available in process.env or import.meta.env
}
```

### Type Handling and Validation

ArgParser automatically handles type conversion and validation:

- **String flags**: `--name value` or `--name="quoted value"`
- **Number flags**: `--count 42` (automatically parsed)
- **Boolean flags**: `--verbose` (presence = true)
- **Array flags**: `--tags tag1,tag2,tag3` or multiple `--tag value1 --tag value2` (use `allowMultiple: true`)

There are many more ways to define flags, see the [examples](examples) for more.

### Mandatory Flags

Flags marked as `mandatory: true` must be provided:

```typescript
cli.addFlags([
  {
    name: "config",
    options: ["--config", "-c"],
    type: "string",
    mandatory: true,
    description: "Configuration file path",
  },
]);
```

### Default Values

Provide fallback values for optional flags:

```typescript
cli.addFlags([
  {
    name: "timeout",
    options: ["--timeout", "-t"],
    type: "number",
    defaultValue: 30,
    description: "Request timeout in seconds",
  },
]);
```

### Flag-Only Flags

Flags that don't accept values (like `--help`):

```typescript
cli.addFlags([
  {
    name: "dry-run",
    options: ["--dry-run"],
    type: "boolean",
    flagOnly: true,
    description: "Show what would be done without executing",
  },
]);
```

### Alias Properties

Short aliases for convenience:

```typescript
cli.addFlags([
  {
    name: "verbose",
    // Both aliases will trigger this flag
    options: ["--verbose", "-v"],
    type: "boolean",
    flagOnly: true,
    description: "Enable verbose logging",
  },
]);
// Usage: --verbose or -v
```

## Hierarchical CLIs (Sub-Commands)

### Defining Sub-Commands

Build complex CLIs with nested commands:

```typescript
// Create sub-parsers
const deployParser = new ArgParser({
  appName: "deploy",
  description: "Deploy application",
});
deployParser.addFlags([
  {
    name: "environment",
    options: ["--environment", "-e"],
    type: "string",
    mandatory: true,
  },
]);

const monitorLogsParser = new ArgParser({
  appName: "logs",
  description: "View logs",
});
const monitorParser = new ArgParser({
  appName: "monitor",
  description: "Monitoring commands",
});
monitorParser.addSubCommand({
  name: "logs",
  description: "View logs",
  parser: monitorLogsParser,
});

// Main CLI
const cli = new ArgParser({
  appName: "app-cli",
  appCommandName: "app-cli",
  description: "Application management CLI",
});
cli.addFlags([
  {
    name: "config",
    options: ["--config", "-c"],
    type: "string",
    description: "Config file",
  },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: "boolean",
    description: "Verbose output",
  },
]);

cli.addSubCommand({
  name: "deploy",
  description: "Deploy application",
  parser: deployParser,
});
cli.addSubCommand({
  name: "monitor",
  description: "Monitoring commands",
  parser: monitorParser,
});

cli.setHandler(async (ctx) => {
  if (!ctx.args.subCommand) {
    console.log("Please specify a command. Use --help for available commands.");
    return;
  }
});

cli.parse(process.argv.slice(2));
```

### Handler Execution

Access sub-command results in parent handlers:

```typescript
const args = await cli.parse(["deploy", "--environment", "prod"]);
// args.subCommand contains the executed sub-command result
```

### Handler Context

Handlers receive a context object with parsed data:

```typescript
type IHandlerContext = {
  args: Record<string, any>; // Parsed arguments and flags
  parentArgs?: Record<string, any>; // Parent command args (if subcommand)
  commandChain: string[]; // Array of command names from root to final
  parser: ArgParser; // Reference to the parser instance
  isMcp?: boolean; // Whether running in MCP mode
};
```

### Setting Handlers with `.setHandler()`

```typescript
const myCommandParser = new ArgParser({
  appName: "command",
  appCommandName: "command",
});

myCommandParser.setHandler(async (ctx) => {
  // Handle command execution
  return { success: true, data: ctx.args };
});

const subParser = new ArgParser({
  appName: "sub",
  appCommandName: "sub",
});
subParser.setHandler(async (ctx) => {
  // Sub-command handler
  return { result: ctx.args };
});
```

### Accessing Sub-Parsers with `.getSubCommand()`

```typescript
const deploySubCommand = cli.getSubCommand("deploy");
if (deploySubCommand) {
  deploySubCommand.addFlags([
    {
      name: "force",
      options: ["--force"],
      type: "boolean",
    },
  ]);
}
```

### Flag Inheritance (`inheritParentFlags`)

Child commands can inherit parent flags:

```typescript
const parentParser = new ArgParser({
  appName: "parent",
  appCommandName: "parent",
});
parentParser.addFlags([
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: "boolean",
  },
]);

const childParser = new ArgParser({
  appName: "child",
  inheritParentFlags: true, // Inherits 'verbose' flag
});
```

## MCP Integration

### Overview

ArgParser provides seamless MCP (Model Context Protocol) integration, allowing your CLI tools to function as MCP servers that can be used with Claude Desktop and other MCP clients.

### Claude Desktop Ready MCP Setup

Create an MCP server that's immediately compatible with Claude Desktop:

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "web-search",
  appCommandName: "web-search",
  description: "Search the web for information",
  mcp: {
    serverInfo: {
      name: "web-search-mcp",
      version: "1.0.0",
      description: "Web search MCP server",
    },
  },
});

cli.addFlags([
  {
    name: "query",
    options: ["--query", "-q"],
    type: "string",
    mandatory: true,
    description: "Search query",
  },
  {
    name: "limit",
    options: ["--limit", "-l"],
    type: "number",
    defaultValue: 10,
    description: "Maximum number of results",
  },
  {
    name: "domain",
    options: ["--domain", "-d"],
    type: "string",
    description: "Restrict search to specific domain",
  },
]);

cli.setHandler(async (ctx) => {
  const results = await performWebSearch(ctx.args.query, {
    limit: ctx.args.limit,
    domain: ctx.args.domain,
  });

  return {
    results: results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    })),
    total: results.length,
  };
});

cli.parse(process.argv.slice(2));
```

### Key Features

- **Automatic tool generation** from CLI flag definitions
- **Type-safe MCP responses** with full TypeScript support
- **Multiple transport support** (stdio, SSE, WebSocket)
- **Zero-configuration setup** for Claude Desktop integration
- **Automatic schema introspection** for tool discovery

### Modern MCP Setup (Recommended)

The unified API approach (v2.0.0+) simplifies MCP integration with a compact, declarative syntax:

```javascript
// File: data-analyzer.js

const cli = ArgParser.withMcp({
  appName: "data-analyzer",
  appCommandName: "data-analyzer",
  description: "Analyze data files and generate insights",
  mcp: {
    serverInfo: {
      name: "data-analyzer-mcp",
      version: "1.0.0",
      description: "Data analysis MCP server",
    },
    transports: [
      "stdio",
      { type: "sse", port: 3000 },
      { type: "websocket", port: 3001 }
    ],
  },
  // Flags and handler defined inline for compact configuration
  flags: [
    {
      name: "file",
      options: ["--file", "-f"],
      type: "string",
      mandatory: true,
      description: "Path to data file",
    },
    {
      name: "format",
      options: ["--format"],
      type: "string",
      enum: ["json", "csv", "xml"],
      defaultValue: "json",
    },
    {
      name: "output-summary",
      options: ["--output-summary"],
      type: "boolean",
      description: "Include summary statistics",
    },
  ],
  handler: async (ctx) => {
    const analysis = await analyzeDataFile(ctx.args.file, ctx.args.format);
    return ctx.args["output-summary"]
      ? { ...analysis, summary: generateSummary(analysis) }
      : analysis;
  },
});

cli.parse(process.argv.slice(2));

// CLI: `node data-analyzer.js --file data.csv --format json --output-summary`
// MCP: Call with `node data-analyzer.js --s-mcp-serve`
//      Then connect to the MCP and use the tool "data-analyzer" with file, format, and output-summary parameters
```

### Legacy MCP Setup (Deprecated)

The older API patterns are deprecated in favor of the unified approach:

```typescript
// Deprecated: Manual transport configuration
const cli = new ArgParser({
  appName: "legacy-tool",
  appCommandName: "legacy-tool",
});
cli.addMcpTransport("stdio");
cli.addMcpTransport("sse", { port: 3000 });

// Deprecated: Separate MCP subcommands (replaced by --s-mcp-serve)
cli.addMcpSubCommand({
  name: "serve",
  description: "Start MCP server",
  // This pattern is replaced by the centralized --s-mcp-serve system flag
});

// Use ArgParser.withMcp() and --s-mcp-serve instead
```

### MCP Transport Options

- **stdio**: Standard input/output transport (recommended for Claude Desktop)
- **SSE**: Server-Sent Events over HTTP
- **WebSocket**: Real-time bidirectional communication

### Multiple Transports Simultaneously

You can configure multiple transports in several ways:

```typescript
// Option 1: Using 'transports' array (recommended)
const cli = ArgParser.withMcp({
  appName: "multi-transport-tool",
  appCommandName: "multi-transport-tool",
  mcp: {
    serverInfo: {
      name: "multi-transport-mcp",
      version: "1.0.0",
    },
    transports: [
      "stdio",
      { type: "sse", port: 3000, host: "0.0.0.0" },
      { type: "websocket", port: 3001, path: "/ws" }
    ]
  },
});

// Option 2: Using 'transport' (singular) for single transport
const cliSingle = ArgParser.withMcp({
  appName: "single-transport-tool",
  appCommandName: "single-transport-tool",
  mcp: {
    serverInfo: { name: "single-mcp", version: "1.0.0" },
    transport: "stdio"  // or { type: "sse", port: 3000 }
  },
});
```

**Transport Precedence Rules:**
- CLI flags **always override** configuration: `--s-mcp-serve --mcp-transport sse`
- If no CLI transport specified, uses configured `transports` or `transport`
- Default fallback is `stdio` if nothing specified

### Automatic Tool Generation

Your CLI flags automatically become MCP tool parameters with proper JSON Schema generation for type validation and documentation.

## Plugin System & Dependency Injection

### Core Architecture

ArgParser uses a flexible plugin system with dependency injection for extensibility:

```typescript
interface IPlugin {
  name: string;
  initialize(parser: ArgParserBase): void | Promise<void>;
  execute?(context: IHandlerContext): any | Promise<any>;
}
```

### Plugin Usage Patterns

**Simple Plugin Registration:**

```typescript
const cli = new ArgParser({
  appName: "app",
  appCommandName: "app",
});
cli.addPlugin(myCustomPlugin);
```

**Plugin with Dependencies:**

```typescript
const cli = new ArgParser({
  appName: "app",
  appCommandName: "app",
  plugins: [loggingPlugin, metricsPlugin, customPlugin],
});
```

### Benefits

- **Modular architecture** for feature separation
- **Dependency injection** for testability
- **Plugin lifecycle management** with proper initialization
- **Extensible functionality** without core modifications

## System Features

### System Flags Overview

ArgParser includes built-in system flags (prefixed with `--s-`) that provide powerful debugging, configuration, and development features.

### Environment File Management

#### `--s-save-to-env <file>`

Export current flag values to environment files:

```bash
my-cli --verbose --output results.txt --count 42 --s-save-to-env .env
```

Generates:

```bash
# .env
VERBOSE=true
OUTPUT=results.txt
COUNT=42
```

**Supported Formats:**

- `.env` - Standard environment file
- `.json` - JSON configuration
- `.yaml`/`.yml` - YAML configuration
- `.toml` - TOML configuration

**Behavior:**

- Overwrites existing files
- Creates directories if they don't exist
- Converts flag names to UPPER_CASE for environment variables

#### `--s-with-env <file>`

Load flag values from environment files:

```bash
my-cli --s-with-env .env
# Equivalent to: my-cli --verbose --output results.txt --count 42
```

**Example with mixed usage:**

```bash
# Load from file and override specific flags
my-cli --s-with-env config.json --count 100
```

### Debug Features

#### `--s-debug-print`

Print detailed parsing information without executing handlers:

```bash
my-cli --verbose --output test.txt --s-debug-print
```

Output includes:

- Parsed arguments and flags
- Validation results
- Sub-command resolution
- Handler information

#### `--s-debug`

Enable comprehensive debug mode with detailed logging:

```bash
my-cli --s-debug --verbose --output test.txt
```

Provides:

- Step-by-step parsing process
- Flag resolution details
- Error context and stack traces
- Performance timing information

### Fuzzy Testing

#### `--s-enable-fuzzy`

Enable automatic fuzzy testing for CLI robustness:

```bash
my-cli --s-enable-fuzzy
```

**Quick Start:**

```typescript
import { ArgParserFuzzyTester } from "@alcyone-labs/arg-parser";

const tester = new ArgParserFuzzyTester(cli, {
  maxDepth: 5,
  randomTestCases: 10,
  includePerformance: true,
  testErrorCases: true,
});
const report = await tester.runFuzzyTest();
```

**System Flag Integration:**
Fuzzy testing integrates with system flags for comprehensive testing scenarios.

**Testing Capabilities:**

- **Boundary value testing** for numeric inputs
- **Invalid input injection** for error handling validation
- **Edge case generation** for robust CLI behavior
- **Performance profiling** under various input conditions

**Programmatic Usage:**

```typescript
const tester = new ArgParserFuzzyTester(parser, {
  maxDepth: 5,
  randomTestCases: 20,
  includePerformance: true,
  testErrorCases: true,
  verbose: false,
});

const report = await tester.runFuzzyTest();
console.log(`Tests passed: ${report.successfulTests}/${report.totalTests}`);
```

**Output Formats:**

- Console reporting with colored output
- JSON reports for CI/CD integration
- HTML reports for detailed analysis

### Console Handling & MCP Compliance

#### Automatic Global Console Replacement (v1.3.0+)

ArgParser automatically replaces global console methods to ensure MCP compliance without any code changes required.

**Zero Code Changes Required:**

Your existing code continues to work unchanged:

```typescript
const method = () => {
  console.log("This automatically becomes MCP-compliant");
  console.error("Error messages are properly routed");
  console.warn("Warnings are handled correctly");
};
```

**How It Works:**

ArgParser installs a global console replacement:

```typescript
const mcpLogger = {
  log: (...args) => sendToMcpClient("info", args.join(" ")),
  error: (...args) => sendToMcpClient("error", args.join(" ")),
  warn: (...args) => sendToMcpClient("warning", args.join(" ")),
  // ... other console methods
};
```

**Complete Coverage:**

- All standard console methods (log, error, warn, info, debug, trace)
- Proper message routing to MCP clients
- Maintains original console behavior for non-MCP usage
- No performance impact in non-MCP mode

**External Logging Libraries:**

Works seamlessly with popular logging libraries:

```typescript
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(), // Automatically MCP-compliant
  ],
});

const cli = ArgParser.withMcp({
  appName: "logging-tool",
  appCommandName: "logging-tool",
  mcp: {
    serverInfo: {
      name: "logging-tool-mcp",
      version: "1.0.0",
    },
  },
});
```

#### `--s-mcp-serve` - Centralized MCP Server Management

Start your CLI as an MCP server with custom configuration:

```bash
my-cli --s-mcp-serve --mcp-transport stdio
my-cli --s-mcp-serve --mcp-transport sse --mcp-port 3000
```

Usage in code:

```typescript
const result = await cli.parse(["--s-mcp-serve", "--mcp-transport", "stdio"]);
// CLI automatically starts as MCP server
```

#### `--s-build-dxt [directory]` - Claude Desktop Ready Packages

Generate complete DXT (Desktop Extension Tool) packages for Claude Desktop integration:

```bash
my-cli --s-build-dxt ./dist/my-tool-dxt
```

**v2.0.0 Features:**

- **Autonomous package generation** with zero configuration
- **Complete Claude Desktop compatibility** out of the box
- **Automatic dependency resolution** and bundling
- **Logo and branding support** with custom assets
- **Environment variable management** for API keys and configuration

**Generated Package Structure:**

```
my-tool-dxt/
├── manifest.json          # DXT package manifest
├── server.js              # Bundled MCP server (and other chunked files bundled by tsdown)
├── package.json           # Node.js package configuration
├── logo.png               # Tool logo (if provided)
└── README.md              # Generated documentation
```

**Autonomous Build Process:**

- Analyzes your CLI structure automatically
- Generates proper MCP tool schemas
- Bundles all dependencies
- Creates installation scripts
- Validates package integrity

**Custom Logo Support:**

```bash
# Specify custom logo
my-cli --s-build-dxt ./dist --logo ./assets/my-logo.png

# Or place logo.png in your project root for automatic detection
```

**📋 Manifest Features:**

Generated `manifest.json` includes:

```json
{
  "dxt_version": "1.0.0",
  "id": "my-tool",
  "name": "My Tool",
  "version": "1.0.0",
  "server": {
    "type": "mcp",
    "entry_point": "server.js",
    "mcp_config": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  },
  "tools": [
    {
      "name": "my-tool",
      "description": "Tool description from CLI",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" },
          "limit": { "type": "number", "default": 10 }
        },
        "required": ["query"]
      }
    }
  ],
  "user_config": {
    "apiKey": {
      "type": "string",
      "title": "API Key",
      "description": "Your API key for the service",
      "sensitive": true
    }
  }
}
```

**Environment Variable Integration:**
The build process automatically detects environment variables used in your CLI and includes them in the DXT configuration for easy Claude Desktop setup.

**Example Output:**

```bash
✅ DXT package built successfully!
📦 Package: ./dist/my-tool-dxt
🔧 Manifest: manifest.json
🚀 Server: server.js
📖 Documentation: README.md
💾 Size: 2.3MB

📋 Next Steps:
1. Test locally: cd ./dist/my-tool-dxt && npm test
2. Install in Claude Desktop: Copy to MCP tools directory
3. Configure API keys in Claude Desktop settings
```

**Use Cases:**

- **Rapid prototyping** of Claude Desktop tools
- **Distribution** of CLI tools as MCP packages
- **Enterprise deployment** with standardized packaging
- **Development workflow** integration

**Validation & Quality:**

- **Schema validation** for all generated files
- **Dependency verification** and conflict resolution
- **Performance optimization** of bundled packages
- **Security scanning** of included dependencies

### Usage Notes

- System flags are processed before regular CLI execution
- They can be combined with regular flags and sub-commands
- Some system flags (like `--s-debug-print`) prevent normal handler execution
- Environment file loading happens before flag parsing for proper override behavior

## Automatic Help

### Global Help Flag (`--help`, `-h`)

ArgParser automatically adds help functionality:

```bash
my-cli --help
my-cli sub-command --help
```

### `helpText()` Method

Generate help text programmatically:

```typescript
const parser = new ArgParser({
  appName: "example",
  appCommandName: "example",
});
console.log(parser.helpText());
```

### Auto-Help on Empty Invocation

When no arguments are provided, help is displayed automatically for better user experience.

## Error Handling

ArgParser provides comprehensive error handling with detailed context:

```typescript
const parser = new ArgParser({
  appName: "example",
  appCommandName: "example",
});
parser.addFlags([
  {
    name: "count",
    options: ["--count", "-c"],
    type: "number",
    mandatory: true,
  },
]);

try {
  parser.parse(["--invalid-flag"]);
} catch (error) {
  console.error("Parsing failed:", error.message);
  // Detailed error information with suggestions
}
```

Common error scenarios:

- Missing mandatory flags
- Invalid flag types
- Unknown flags or sub-commands
- Validation failures
- Handler execution errors

## API Reference

### Core Classes

#### `ArgParserBase`

The foundational parser class with core CLI functionality.

#### `ArgParser` (v1.1.0+)

Extended parser with MCP integration and advanced features.

**Example usage:**

```typescript
const cli = ArgParser.withMcp({
  appName: "advanced-tool",
  appCommandName: "advanced-tool",
  description: "Advanced CLI with MCP support",
  mcp: {
    serverInfo: {
      name: "advanced-tool-mcp",
      version: "1.0.0",
      description: "Advanced CLI with MCP support",
    },
  },
});
```

**Unified tool architecture:**

```typescript
const cli = ArgParser.withMcp({
  appName: "unified-tool",
  appCommandName: "unified-tool",
  mcp: {
    serverInfo: {
      name: "unified-tool-mcp",
      version: "1.0.0",
    },
  },
  handler: async (ctx) => {
    return processInput(ctx.args.input, ctx.args.format);
  },
});

cli.addFlags([
  {
    name: "input",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "format",
    options: ["--format", "-f"],
    type: "string",
    enum: ["json", "xml"],
  },
]);
```

### Constructors

#### `new ArgParserBase(options?, initialFlags?)`

Creates a basic parser instance.

#### `new ArgParser(options?, initialFlags?)`

Creates an advanced parser with MCP capabilities.

**Options interface:**

```typescript
interface IArgParserParams {
  appName?: string;
  appCommandName?: string;
  description?: string;
  version?: string;
  handler?: HandlerFunction;
  inheritParentFlags?: boolean;
  handleErrors?: boolean;
  autoExit?: boolean;
  subCommands?: ISubCommand[];
}

interface WithMcpOptions extends IArgParserParams {
  mcp?: {
    serverInfo: {
      name: string;
      version: string;
      description?: string;
      author?: {
        name: string;
        email?: string;
      };
    };
  };
}
```

### `parse(args, options?)`

Parse command-line arguments and return structured results.

**Returns:** Promise resolving to parsed arguments, flags, and sub-command results.

### `.addFlag(flag)`

Add a single flag definition to the parser.

### `.addFlags(flags)`

Add multiple flag definitions at once.

### `.addSubCommand(subCommand)`

Add a sub-command parser to create hierarchical CLIs.

### `.setHandler(handler)`

Set the execution handler for this parser or sub-command.

### `.getSubCommand(name)`

Retrieve a specific sub-command parser by name.

### `.hasFlag(name)`

Check if a flag is defined in this parser.

### `helpText()`

Generate formatted help text for the current parser and its sub-commands.

### `printAll(filePath?)`

Export complete configuration to a file (useful for documentation).

### Interfaces

**Core interfaces used throughout the API:**

- `IFlag` - Flag definition interface
- `IHandlerContext` - Handler execution context
- `IArgParserParams` - Parser configuration options
- `WithMcpOptions` - MCP integration configuration

## Quick Reference

### Basic CLI Setup

```typescript
const cli = new ArgParser({
  appName: "my-tool",
  appCommandName: "my-tool",
  description: "Description of my tool",
});

cli.addFlags([
  {
    name: "input",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
  {
    name: "output",
    options: ["--output", "-o"],
    type: "string",
    defaultValue: "output.txt",
  },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: "boolean",
  },
]);

cli.setHandler(async (ctx) => {
  if (ctx.args.verbose) console.log("Processing...", ctx.args);
  return processFiles(ctx.args.input, ctx.args.output);
});

cli.parse(process.argv.slice(2));
```

### Unified Tool Architecture (New!)

#### Key Benefits

- **Single configuration object** for complete tool definition
- **Integrated MCP support** without separate setup
- **Simplified maintenance** with consolidated options
- **Better TypeScript inference** and IDE support

#### Basic Usage

```typescript
const cli = ArgParser.withMcp({
  appName: "search-engine",
  appCommandName: "search-engine",
  description: "Search across multiple data sources",
  mcp: {
    serverInfo: {
      name: "search-engine-mcp",
      version: "1.0.0",
      description: "Search engine MCP server",
    },
  },
});

cli.addFlags([
  {
    name: "query",
    options: ["--query", "-q"],
    type: "string",
    mandatory: true,
    description: "Search term",
  },
  {
    name: "source",
    options: ["--source", "-s"],
    type: "string",
    enum: ["web", "docs", "code"],
    defaultValue: "web",
  },
  {
    name: "limit",
    options: ["--limit", "-l"],
    type: "number",
    defaultValue: 10,
    description: "Max results",
  },
]);

cli.setHandler(async (ctx) => {
  const results = await searchEngine.search(ctx.args.query, {
    source: ctx.args.source,
    limit: ctx.args.limit,
  });

  return {
    query: ctx.args.query,
    source: ctx.args.source,
    results: results,
    count: results.length,
  };
});

cli.parse(process.argv.slice(2));
```

### MCP Integration

```typescript
const mcpCli = ArgParser.withMcp({
  appName: "file-processor",
  appCommandName: "file-processor",
  description: "Process files with various transformations",
  mcp: {
    serverInfo: {
      name: "file-processor-mcp",
      version: "1.0.0",
      description: "File processing MCP server",
    },
  },
});

mcpCli.addFlags([
  {
    name: "file",
    options: ["--file", "-f"],
    type: "string",
    mandatory: true,
    description: "Path to input file",
    validate: (path) => fs.existsSync(path) || "File does not exist",
  },
  {
    name: "operation",
    options: ["--operation", "-op"],
    type: "string",
    enum: ["compress", "encrypt", "convert"],
    mandatory: true,
    description: "Operation to perform on the file",
  },
  {
    name: "output-format",
    options: ["--output-format"],
    type: "string",
    enum: ["json", "xml", "csv"],
    defaultValue: "json",
    description: "Output format for results",
  },
  {
    name: "preserve-metadata",
    options: ["--preserve-metadata"],
    type: "boolean",
    defaultValue: true,
    description: "Keep original file metadata",
  },
]);

mcpCli.setHandler(async (ctx) => {
  const result = await fileProcessor.process(ctx.args.file, {
    operation: ctx.args.operation,
    outputFormat: ctx.args["output-format"],
    preserveMetadata: ctx.args["preserve-metadata"],
  });

  return {
    originalFile: ctx.args.file,
    operation: ctx.args.operation,
    outputFormat: ctx.args["output-format"],
    result: result,
    metadata: ctx.args["preserve-metadata"] ? result.metadata : null,
    timestamp: new Date().toISOString(),
  };
});

mcpCli.parse(process.argv.slice(2));
```

### Migration from Legacy MCP API

#### Before (Legacy)

```typescript
const cli = new ArgParser({
  appName: 'tool',
  appCommandName: 'tool'
});
cli.addMcpTransport('stdio');
cli.addMcpTransport('sse', { port: 3000 });
cli.addFlags([...]);
cli.setHandler(...);
```

#### After (Unified)

```typescript
const cli = ArgParser.withMcp({
  appName: 'tool',
  appCommandName: 'tool',
  mcp: {
    serverInfo: {
      name: 'tool-mcp',
      version: '1.0.0'
    }
  },
});
cli.addFlags([...]);
cli.setHandler(...);
```

#### Migration Benefits

- **Reduced boilerplate** with consolidated configuration
- **Better type safety** with unified options interface
- **Clearer intent** with declarative configuration style

### MCP Preset Transport Configuration

```typescript
// Single preset transport
const cliWithPreset = ArgParser.withMcp({
  appName: "preset-tool",
  appCommandName: "preset-tool",
  mcp: {
    serverInfo: {
      name: "preset-tool-mcp",
      version: "1.0.0",
    },
  },
});

// Multiple preset transports (configured via --s-mcp-serve)
const cliWithMultiplePresets = ArgParser.withMcp({
  appName: "multi-transport-tool",
  appCommandName: "multi-transport-tool",
  mcp: {
    serverInfo: {
      name: "multi-transport-mcp",
      version: "1.0.0",
    },
  },
});

// CLI flags control MCP server behavior
// my-tool --s-mcp-serve                    -> Starts MCP server with default transport
// my-tool --s-mcp-serve --mcp-transport sse -> Starts with SSE transport
```

### System Flags

```bash
# Debug parsing
my-tool --s-debug --input data.txt

# Load configuration
my-tool --s-with-env config.yaml --input override.txt

# Save configuration
my-tool --input data.txt --s-save-to-env template.yaml

# Start MCP server
my-tool --s-mcp-serve

# Generate DXT package for Claude Desktop
my-tool --s-build-dxt ./dxt-package

# Enable fuzzy testing
my-tool --s-enable-fuzzy
```

### Multiple MCP Transports

```bash
# Single transport
my-tool --s-mcp-serve --mcp-transport stdio

# Multiple transports (configured via --s-mcp-serve system flag)
const cli = ArgParser.withMcp({
  appName: 'multi-tool',
  appCommandName: 'multi-tool',
  mcp: {
    serverInfo: {
      name: 'multi-tool-mcp',
      version: '1.0.0'
    }
  }
});
```

---

**📖 For complete examples and tutorials, see the [`examples/`](./examples/) directory.**

## Technical Documentation

### Architecture & Implementation

- **[DXT Tutorial](docs/DXT-TUTORIAL.md)** - Step-by-step Claude Desktop integration with console best practices
- **[Fuzzy Testing](docs/fuzzy-testing.md)** - Comprehensive CLI testing utilities

---
