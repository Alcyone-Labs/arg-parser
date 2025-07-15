# ArgParser - Type-Safe Command Line Argument Parser

A powerful, type-safe TypeScript library for building command-line interfaces with automatic MCP (Model Context Protocol) integration, hierarchical sub-commands, and comprehensive tooling support.

---

## Features Overview

- **Unified Tool Architecture**: Define tools once with `addTool()` and they automatically function as both CLI subcommands and MCP tools.
- **Type-safe flag definitions** with full TypeScript support and autocompletion.
- **Automatic MCP Integration**: Transform any CLI into a compliant MCP server with a single command (`--s-mcp-serve`).
- **Console Safe**: `console.log` and other methods are automatically handled in MCP mode to prevent protocol contamination, requiring no changes to your code.
- **DXT Package Generation**: Generate complete, ready-to-install Claude Desktop Extension (`.dxt`) packages with the `--s-build-dxt` command.
- **Hierarchical Sub-commands**: Create complex, nested sub-command structures (e.g., `git commit`, `docker container ls`) with flag inheritance.
- **Configuration Management**: Easily load (`--s-with-env`) and save (`--s-save-to-env`) configurations from/to `.env`, `.json`, `.yaml`, and `.toml` files.
- **Automatic Help & Error Handling**: Context-aware help text and user-friendly error messages are generated automatically.
- **Debugging Tools**: Built-in system flags like `--s-debug` and `--s-debug-print` for easy troubleshooting.

---

## Installation

```bash
# Using PNPM (recommended)
pnpm add @alcyone-labs/arg-parser
```

---

## Quick Start: The Unified `addTool` API

The modern way to build with ArgParser is using the `.addTool()` method. It creates a single, self-contained unit that works as both a CLI subcommand and an MCP tool.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

// Use ArgParser.withMcp to enable MCP and DXT features
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
})
  // Define a tool that works everywhere
  .addTool({
    name: "greet",
    description: "A tool to greet someone",
    flags: [
      {
        name: "name",
        type: "string",
        mandatory: true,
        options: ["--name"],
        description: "Name to greet",
      },
      {
        name: "style",
        type: "string",
        enum: ["formal", "casual"],
        defaultValue: "casual",
        description: "Greeting style",
      },
    ],
    handler: async (ctx) => {
      // Use console.log freely - it's automatically safe in MCP mode!
      console.log(`Greeting ${ctx.args.name} in a ${ctx.args.style} style...`);

      const greeting =
        ctx.args.style === "formal"
          ? `Good day, ${ctx.args.name}.`
          : `Hey ${ctx.args.name}!`;

      console.log(greeting);
      return { success: true, greeting, name: ctx.args.name };
    },
  });

// parse() is async and works with both sync and async handlers
async function main() {
  try {
    await cli.parse(process.argv.slice(2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

// Export if you want to test, use the CLI programmatically
// or use the --s-enable-fuzzing system flag to run fuzzy tests on your CLI
export default cli;
```

## How to Run It

```bash
# This assumes `mycli` is your CLI's entry point

# 1. As a standard CLI subcommand
mycli greet --name Jane --style formal

# 2. As an MCP server, exposing the 'greet' tool
mycli --s-mcp-serve

# 3. Generate a DXT package for Claude Desktop (2-steps)
mycli --s-build-dxt ./my-dxt-package
npx @anthropic-ai/dxt pack ./my-dxt-package
```

### Setting Up System-Wide CLI Access

To make your CLI available system-wide as a binary command, you need to configure the `bin` field in your `package.json` and use package linking:

**1. Configure your package.json:**

```json
{
  "name": "my-cli-app",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./cli.js"
  }
}
```

**2. Make your CLI file executable:**

```bash
chmod +x cli.js
```

**3. Add a shebang to your CLI file:**

```javascript
#!/usr/bin/env node
# or #!/usr/bin/env bun for native typescript runtime

import { ArgParser } from '@alcyone-labs/arg-parser';

const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  // ... your configuration
});

// Parse command line arguments
await cli.parse(process.argv.slice(2));
```

**4. Link the package globally:**

```bash
# Using npm
npm link

# Using pnpm
pnpm link --global

# Using bun
bun link

# Using yarn
yarn link
```

**5. Use your CLI from anywhere:**

```bash
# Now you can run your CLI from any directory
mycli --help
mycli greet --name "World"

# Or use with npx/pnpx if you prefer
npx mycli --help
pnpx mycli greet --name "World"
```

**To unlink later:**

```bash
# Using npm
npm unlink --global my-cli-app

# Using pnpm
pnpm unlink --global

# Using bun
bun unlink

# Using yarn
yarn unlink
```

---

## Parsing Command-Line Arguments

ArgParser's `parse()` method is async and automatically handles both synchronous and asynchronous handlers:

### Cannonical Usage Pattern

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  handler: async (ctx) => {
    // Works with both sync and async operations
    const result = await someAsyncOperation(ctx.args.input);
    return { success: true, result };
  }
});

// parse() is async and works with both sync and async handlers
async function main() {
  try {
    const result = await cli.parse(process.argv.slice(2));
    // Handler results are automatically awaited and merged
    console.log(result.success); // true
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
```

### Top-level await 

Works in ES modules or Node.js >=18 with top-level await

```javascript
try {
  const result = await cli.parse(process.argv.slice(2));
  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
```

### Promise-based parsing

If you need synchronous contexts, you can simply rely on promise-based APIs

```javascript
cli.parse(process.argv.slice(2))
  .then((result) => {
    console.log("Success:", result);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
```


---

## Migrating from v1.x to the v2.0 `addTool` API

Version 2.0 introduces the `addTool()` method to unify CLI subcommand and MCP tool creation. This simplifies development by removing boilerplate and conditional logic.

### Before v2.0: Separate Definitions

Previously, you had to define CLI handlers and MCP tools separately, often with conditional logic inside the handler to manage different output formats.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// Old way: Separate CLI subcommands and MCP tools
cli
  .addSubCommand({
    name: "search",
    handler: async (ctx) => {
      // Manual MCP detection was required
      if (ctx.isMcp) {
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } else {
        console.log("Search results...");
        return result;
      }
    },
  })
  // And a separate command to start the server
  .addMcpSubCommand("serve", {
    /* MCP config */
  });
```

### After v2.0: The Unified `addTool()` Method

Now, a single `addTool()` definition creates both the CLI subcommand and the MCP tool. Console output is automatically managed, flags are converted to MCP schemas, and the server is started with a universal system flag.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// New way: A single tool definition for both CLI and MCP
cli.addTool({
  name: "search",
  description: "Search for items",
  flags: [
    { name: "query", type: "string", mandatory: true },
    { name: "apiKey", type: "string", env: "API_KEY" }, // For DXT integration
  ],
  handler: async (ctx) => {
    // No more MCP detection! Use console.log freely.
    console.log(`Searching for: ${ctx.args.query}`);
    const results = await performSearch(ctx.args.query, ctx.args.apiKey);
    console.log(`Found ${results.length} results`);
    return { success: true, results };
  },
});

// CLI usage: mycli search --query "test"
// MCP usage: mycli --s-mcp-serve
```

**Benefits of Migrating:**

- **Less Code**: A single definition replaces two or more complex ones.
- **Simpler Logic**: No more manual MCP mode detection or response formatting.
- **Automatic Schemas**: Flags are automatically converted into the `input_schema` for MCP tools.
- **Automatic Console Safety**: `console.log` is automatically redirected in MCP mode.

---

## Core Concepts

### Defining Flags

Flags are defined using the `IFlag` interface within the `flags` array of a tool or command.

```typescript
interface IFlag {
  name: string; // Internal name (e.g., 'verbose')
  options: string[]; // Command-line options (e.g., ['--verbose', '-v'])
  type: "string" | "number" | "boolean" | "array" | "object" | Function;
  description?: string; // Help text
  mandatory?: boolean | ((args: any) => boolean); // Whether the flag is required
  defaultValue?: any; // Default value if not provided
  flagOnly?: boolean; // A flag that doesn't consume a value (like --help)
  enum?: any[]; // An array of allowed values
  validate?: (value: any, parsedArgs?: any) => boolean | string | void; // Custom validation function
  allowMultiple?: boolean; // Allow the flag to be provided multiple times
  env?: string; // Links the flag to an environment variable for DXT packages, will automatically generate user_config entries in the DXT manifest and fill the flag value to the ENV value if found (process.env)
}
```

### Type Handling and Validation

ArgParser automatically handles type conversion and validation:

- **String flags**: `--name value` or `--name="quoted value"`
- **Number flags**: `--count 42` (automatically parsed)
- **Boolean flags**: `--verbose` (presence implies `true`)
- **Array flags**: `--tags tag1,tag2,tag3` or multiple `--tag value1 --tag value2` (requires `allowMultiple: true`)

### Hierarchical CLIs (Sub-Commands)

While `addTool()` is the recommended way to create subcommands that are also MCP-compatible, you can use `.addSubCommand()` for traditional CLI hierarchies.

> **Note**: By default, subcommands created with `.addSubCommand()` are exposed to MCP as tools. If you want to create CLI-only subcommands, set `includeSubCommands: false` when adding tools.

```typescript
// Create a parser for a nested command
const logsParser = new ArgParser().addFlags([
  { name: "follow", options: ["-f"], type: "boolean", flagOnly: true },
]);

// This creates a command group: `my-cli monitor`
const monitorParser = new ArgParser().addSubCommand({
  name: "logs",
  description: "Show application logs",
  parser: logsParser,
  handler: ({ args }) => console.log(`Following logs: ${args.follow}`),
});

// Attach the command group to the main CLI
const cli = new ArgParser().addSubCommand({
  name: "monitor",
  description: "Monitoring commands",
  parser: monitorParser,
});

// Usage: my-cli monitor logs -f
```

#### MCP Exposure Control

```typescript
// By default, subcommands are exposed to MCP
const mcpTools = parser.toMcpTools(); // Includes all subcommands

// To exclude subcommands from MCP (CLI-only)
const mcpToolsOnly = parser.toMcpTools({ includeSubCommands: false });

// Name conflicts: You cannot have both addSubCommand("name") and addTool({ name: "name" })
// This will throw an error:
parser.addSubCommand({ name: "process", parser: subParser });
parser.addTool({ name: "process", handler: async () => {} }); // ❌ Error: Sub-command 'process' already exists
```

### Flag Inheritance (`inheritParentFlags`)

To share common flags (like `--verbose` or `--config`) across sub-commands, set `inheritParentFlags: true` in the sub-command's parser.

```typescript
const parentParser = new ArgParser().addFlags([
  { name: "verbose", options: ["-v"], type: "boolean" },
]);

// This child parser will automatically have the --verbose flag
const childParser = new ArgParser({ inheritParentFlags: true }).addFlags([
  { name: "target", options: ["-t"], type: "string" },
]);

parentParser.addSubCommand({ name: "deploy", parser: childParser });
```

---

## MCP & Claude Desktop Integration

### Automatic MCP Server Mode (`--s-mcp-serve`)

You don't need to write any server logic. Run your application with the `--s-mcp-serve` flag, and ArgParser will automatically start a compliant MCP server, exposing all tools defined with `.addTool()` and subcommands created with `.addSubCommand()` (unless `includeSubCommands: false` is set).

```bash
# This single command starts a fully compliant MCP server
my-cli-app --s-mcp-serve

# You can also override transports and ports using system flags
my-cli-app --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3001
```

### MCP Transports

You can define the transports directly in the .withMcp() settings, or override them via the `--s-mcp-transport(s)` flags.

```bash
# Single transport
my-tool --s-mcp-serve --s-mcp-transport stdio

# Multiple transports via JSON
my-tool --s-mcp-serve --s-mcp-transports '[{"type":"stdio"},{"type":"sse","port":3001}]'

# Single transport with custom options
my-tool --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3000 --s-mcp-host 0.0.0.0

# Multiple transports (configured via --s-mcp-serve system flag)
const cli = ArgParser.withMcp({
  appName: 'multi-tool',
  appCommandName: 'multi-tool',
  mcp: {
    serverInfo: {
      name: 'multi-tool-mcp',
      version: '1.0.0'
    },
    transports: [
      // Can be a single string...
      "stdio",
      // or one of the other transport types supported by @modelcontextprotocol/sdk
      { type: "sse", port: 3000, host: "0.0.0.0" },
      { type: "websocket", port: 3001, path: "/ws" }
    ]
  }
});
```


### Automatic Console Safety

A major challenge in MCP is preventing `console.log` from corrupting the JSON-RPC communication over `STDOUT`. ArgParser solves this automatically.

- **How it works**: When `--s-mcp-serve` is active, ArgParser hijacks the global `console` object.
- **What it does**: It redirects `console.log`, `.info`, `.warn`, and `.debug` to `STDERR` with a prefix, making them visible for debugging without interfering with the protocol. `console.error` is preserved on `STDERR` as expected.
- **Your benefit**: You can write `console.log` statements freely in your handlers. They will work as expected in CLI mode and be safely handled in MCP mode with **zero code changes**.

### Generating DXT Packages (`--s-build-dxt`)

A Desktop Extension (`.dxt`) is a standardized package for installing your tools into Claude Desktop. ArgParser automates this process.

```bash
# 1. Generate the DXT package contents into a directory
my-cli-app --s-build-dxt ./my-dxt-package

# The output folder contains everything needed: manifest.json, entry point, etc.
# A default logo will be applied if you don't provide one.

# 2. (Optional) Pack the folder into a .dxt file for distribution
npx @anthropic-ai/dxt pack ./my-dxt-package

# Then drag & drop the .dxt file into Claude Desktop to install it, in the Settings > Extensions screen.
```

### How DXT Generation Works

When you run `--s-build-dxt`, ArgParser performs several steps to create a self-contained, autonomous package:

1.  **Introspection**: It analyzes all tools defined with `.addTool()`.
2.  **Manifest Generation**: It creates a `manifest.json` file.
    - Tool flags are converted into a JSON Schema for the `input_schema`.
    - Flags with an `env` property (e.g., `{ name: 'apiKey', env: 'API_KEY' }`) are automatically added to the `user_config` section, prompting the user for the value upon installation and making it available as an environment variable to your tool.
3.  **Autonomous Build**: It bundles your CLI's source code and its dependencies into a single entry point (e.g., `server.js`) that can run without `node_modules`. This ensures the DXT is portable and reliable.
4.  **Packaging**: It assembles all necessary files (manifest, server bundle, logo, etc.) into the specified output directory, ready to be used by Claude Desktop or packed with `npx @anthropic-ai/dxt`.

---

## System Flags & Configuration

ArgParser includes built-in `--s-*` flags for development, debugging, and configuration. They are processed before normal arguments and will cause the program to exit after their task is complete.

| Flag                        | Description                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| **MCP & DXT**               |                                                                                                |
| `--s-mcp-serve`             | Starts the application in MCP server mode, exposing all tools.                                 |
| `--s-build-dxt [dir]`       | Generates a complete, autonomous DXT package for Claude Desktop.                               |
| `--s-mcp-transport <type>`  | Overrides the MCP transport (`stdio`, `sse`, `streamable-http`).                               |
| `--s-mcp-transports <json>` | Overrides transports with a JSON array for multi-transport setups.                             |
| `--s-mcp-port <number>`     | Sets the port for HTTP-based transports (`sse`, `streamable-http`).                            |
| `--s-mcp-host <string>`     | Sets the host address for HTTP-based transports.                                               |
| **Configuration**           |                                                                                                |
| `--s-with-env <file>`       | Loads configuration from a file (`.env`, `.json`, `.yaml`, `.toml`). CLI args take precedence. |
| `--s-save-to-env <file>`    | Saves the current arguments to a configuration file, perfect for templates.                    |
| **Debugging**               |                                                                                                |
| `--s-debug`                 | Prints a detailed, step-by-step log of the argument parsing process.                           |
| `--s-debug-print`           | Exports the entire parser configuration to a JSON file for inspection.                         |
| `--s-enable-fuzzy`          | Enables fuzzy testing mode—a dry run that parses args but skips handler execution.             |

---

## Changelog

### v2.0.0

- **Unified Tool Architecture**: Introduced `.addTool()` to define CLI subcommands and MCP tools in a single declaration.
- **Environment Variables Support**: The `env` property on any IFlag now automatically pull value from the `process.env[${ENV}]` key and generates `user_config` entries in the DXT manifest and fills the flag value to the ENV value if found (process.env). 
- **Enhanced DXT Generation**: The `env` property on flags now automatically generates `user_config` entries in the DXT manifest.
- **Automatic Console Safety**: Console output is automatically and safely redirected in MCP mode to prevent protocol contamination.
- **Breaking Changes**: The `addMcpSubCommand()` and separate `addSubCommand()` for MCP tools are deprecated in favor of `addTool()` and `--s-mcp-serve`.

### v1.3.0

- **Plugin System & Architecture**: Refactored to a dependency-injection model, making the core library dependency-free. Optional plugins for TOML/YAML.
- **Global Console Replacement**: Implemented the first version of automatic console suppression for MCP compliance.
- **Autonomous Build Improvements**: Significantly reduced DXT bundle size and removed dynamic `require` issues.

### v1.2.0

- **Critical MCP Fixes**: Resolved issues where MCP tools with output schemas would fail. Ensured correct JSON-RPC 2.0 response formatting.
- **Enhanced Handler Context**: Added `isMcp` flag to the handler context for more reliable mode detection.

### v1.1.0

- **Major Features**: First release with MCP Integration, System Flags (`--s-debug`, `--s-with-env`, etc.), and environment loading from files.

---

## Backlog

- [x] Publish as an open-source library
- [x] Make ArgParser compatible with MCP out-of-the-box
- [x] Rename --LIB-\* flags to --s-\*
- [x] Make it possible to pass a `--s-save-to-env /path/to/file` parameter that saves all the parameters to a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Make it possible to pass a `--s-with-env /path/to/file` parameter that loads all the parameters from a file (works with Bash-style .env, JSON, YAML, TOML)
- [ ] Add System flags to args.systemArgs
- [ ] Improve flag options collision prevention
- [ ] Add support for locales / translations
- [ ] Add support for async type function to enable more flexibility
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
- [ ] When a flag with `allowMultiple: false` and `flagOnly: true` is passed multiple times (regardless of the options, for example "-1" and later "--one", both being valid), raise the correct error
