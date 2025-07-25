# ArgParser - Type-Safe Command Line Argument Parser

A modern, type-safe command line argument parser with built-in MCP (Model Context Protocol) integration, real-time MCP Resources, and automatic Claude Desktop Extension (DXT) generation.

## Table of Contents

- [Features Overview](#features-overview)
- [Installation](#installation)
- [Quick Start: The Unified `addTool` API](#quick-start-the-unified-addtool-api)
- [How to Run It](#how-to-run-it)
  - [Setting Up System-Wide CLI Access](#setting-up-system-wide-cli-access)
- [Parsing Command-Line Arguments](#parsing-command-line-arguments)
  - [Automatic Argument Detection](#automatic-argument-detection)
  - [Cannonical Usage Pattern](#cannonical-usage-pattern)
  - [Top-level await](#top-level-await)
  - [Promise-based parsing](#promise-based-parsing)
- [Migrating from v1.x to the v2.0 `addTool` API](#migrating-from-v1x-to-the-v20-addtool-api)
  - [Before v2.0: Separate Definitions](#before-v20-separate-definitions)
  - [After v2.0: The Unified `addTool()` Method](#after-v20-the-unified-addtool-method)
- [Core Concepts](#core-concepts)
  - [Defining Flags](#defining-flags)
  - [Type Handling and Validation](#type-handling-and-validation)
    - [Supported Type Formats](#supported-type-formats)
    - [Runtime Type Validation](#runtime-type-validation)
    - [Automatic Type Processing](#automatic-type-processing)
    - [Async Custom Parser Support](#async-custom-parser-support)
    - [Type Conversion Examples](#type-conversion-examples)
  - [Hierarchical CLIs (Sub-Commands)](#hierarchical-clis-sub-commands)
    - [MCP Exposure Control](#mcp-exposure-control)
  - [Flag Inheritance (`inheritParentFlags`)](#flag-inheritance-inheritparentflags)
- [MCP & Claude Desktop Integration](#mcp--claude-desktop-integration)
  - [Output Schema Support](#output-schema-support)
    - [Basic Usage](#basic-usage)
    - [Predefined Schema Patterns](#predefined-schema-patterns)
    - [Custom Zod Schemas](#custom-zod-schemas)
    - [MCP Version Compatibility](#mcp-version-compatibility)
    - [Automatic Error Handling](#automatic-error-handling)
  - [Writing Effective MCP Tool Descriptions](#writing-effective-mcp-tool-descriptions)
    - [Best Practices for Tool Descriptions](#best-practices-for-tool-descriptions)
    - [Complete Example: Well-Documented Tool](#complete-example-well-documented-tool)
    - [Parameter Description Guidelines](#parameter-description-guidelines)
    - [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
  - [Automatic MCP Server Mode (`--s-mcp-serve`)](#automatic-mcp-server-mode---s-mcp-serve)
  - [MCP Transports](#mcp-transports)
  - [MCP Log Path Configuration](#mcp-log-path-configuration)
  - [MCP Resources - Real-Time Data Feeds](#mcp-resources---real-time-data-feeds) ⭐
  - [Automatic Console Safety](#automatic-console-safety)
  - [Generating DXT Packages (`--s-build-dxt`)](#generating-dxt-packages---s-build-dxt)
  - [Logo Configuration](#logo-configuration)
    - [Supported Logo Sources](#supported-logo-sources)
  - [How DXT Generation Works](#how-dxt-generation-works)
  - [DXT Bundling Strategies](#dxt-bundling-strategies)
    - [Standard Approach (Recommended for Most Projects)](#standard-approach-recommended-for-most-projects)
    - [Native Dependencies Approach](#native-dependencies-approach)
- [Typical Errors](#typical-errors)
- [System Flags & Configuration](#system-flags--configuration)
- [Changelog](#changelog)
  - [v2.3.0](#v230)
  - [v2.2.1](#v221)
  - [v2.2.0](#v220)
  - [v2.1.1](#v211)
  - [v2.1.0](#v210)
  - [v2.0.0](#v200)
  - [v1.3.0](#v130)
  - [v1.2.0](#v120)
  - [v1.1.0](#v110)
- [Backlog](#backlog)
  - [(known) Bugs / DX improvement points](#known-bugs--dx-improvement-points)

## Features Overview

- **Unified Tool Architecture**: Define tools once with `addTool()` and they automatically function as both CLI subcommands and MCP tools.
- **Type-safe flag definitions** with full TypeScript support and autocompletion.
- **Automatic MCP Integration**: Transform any CLI into a compliant MCP server with a single command (`--s-mcp-serve`).
- **MCP Resources with Real-Time Feeds** ⭐: Create subscription-based data feeds with URI templates for live notifications to AI assistants.
- **Console Safe**: `console.log` and other methods
  are automatically handled in MCP mode to prevent protocol contamination, requiring no changes to your code.
- **DXT Package Generation**: Generate complete, ready-to-install Claude Desktop Extension (`.dxt`) packages with the `--s-build-dxt` command and `--s-with-node-modules` for platform-dependent builds.
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
import { z } from "zod";
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
    // Optional: Define output schema for MCP clients (Claude Desktop, etc.)
    // This only affects MCP mode - CLI mode works the same regardless
    outputSchema: {
      success: z.boolean().describe("Whether the greeting was successful"),
      greeting: z.string().describe("The formatted greeting message"),
      name: z.string().describe("The name that was greeted"),
    },
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

# If you use ML models or packages that include binaries such as Sqlite3 or sharp, etc...
# You need to bundle the node_modules folder with your DXT package
# In order to do this, you need to use the following flag:
# First hard-install all the packages
rm -rf node_moduels
pnpm install --prod --node-linker=hoisted
# Then bundle with node_modules
mycli --s-build-dxt ./my-dxt-package --s-with-node-modules
# then packages the dxt
npx @anthropic-ai/dxt pack ./my-dxt-package
# then upload the dxt bundle to Claude Desktop from the settings > extensions > advanced screen
```

Read more on generating the DXT package here: [Generating DXT Packages](#generating-dxt-packages---s-build-dxt)

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

### Automatic Argument Detection

`parse()` can now be called without arguments for improved developer experience:

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "my-cli",
  handler: async (ctx) => ({ success: true, data: ctx.args }),
});

// NEW: Call parse() without arguments
// Automatically detects Node.js environment and uses process.argv.slice(2)
async function main() {
  try {
    const result = await cli.parse(); // No arguments needed!
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
```

**How it works:**

- ✅ **Auto-detection**: When `parse()` is called without arguments, ArgParser automatically detects if it's running in Node.js
- ✅ **Smart fallback**: Uses `process.argv.slice(2)` automatically in Node.js environments
- ✅ **User-friendly warning**: Shows a helpful warning in CLI mode to inform users about the behavior
- ✅ **Error handling**: Throws a clear error in non-Node.js environments when arguments are required
- ✅ **Backward compatible**: Explicit arguments still work exactly as before

**When warnings are shown:**

- ✅ CLI mode (when `appCommandName` is set)
- ❌ Library/programmatic usage (no `appCommandName`)
- ❌ MCP mode (warnings suppressed for clean MCP output)

### Cannonical Usage Pattern

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  handler: async (ctx) => {
    // Works with both sync and async operations
    const result = await someAsyncOperation(ctx.args.input);
    return { success: true, result };
  },
});

// parse() is async and works with both sync and async handlers
async function main() {
  try {
    // Option 1: Auto-detection (NEW) - convenient for simple scripts
    const result = await cli.parse();

    // Option 2: Explicit arguments - full control
    // const result = await cli.parse(process.argv.slice(2));

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
  // Auto-detection approach (recommended for simple scripts)
  const result = await cli.parse();

  // Or explicit approach for full control
  // const result = await cli.parse(process.argv.slice(2));

  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
```

### Promise-based parsing

If you need synchronous contexts, you can simply rely on promise-based APIs

```javascript
// Auto-detection approach
cli
  .parse()
  .then((result) => {
    console.log("Success:", result);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });

// Or explicit approach
// cli
//   .parse(process.argv.slice(2))
//   .then((result) => {
//     console.log("Success:", result);
//   })
//   .catch((error) => {
//     console.error("Error:", error.message);
//     process.exit(1);
//   });
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
- **Optional Output Schemas**: Add `outputSchema` only if you want structured responses for MCP clients - CLI mode works perfectly without them.

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

ArgParser provides **strong typing** for flag definitions with comprehensive validation at both compile-time and runtime. The `type` property accepts multiple formats and ensures type safety throughout your application.

#### Supported Type Formats

You can define flag types using either **constructor functions** or **string literals**:

```typescript
const parser = new ArgParser({
  /* ... */
}).addFlags([
  // Constructor functions (recommended for TypeScript)
  { name: "count", options: ["--count"], type: Number },
  { name: "enabled", options: ["--enabled"], type: Boolean, flagOnly: true },
  { name: "files", options: ["--files"], type: Array, allowMultiple: true },

  // String literals (case-insensitive)
  { name: "name", options: ["--name"], type: "string" },
  { name: "port", options: ["--port"], type: "number" },
  { name: "verbose", options: ["-v"], type: "boolean", flagOnly: true },
  { name: "tags", options: ["--tags"], type: "array", allowMultiple: true },
  { name: "config", options: ["--config"], type: "object" },

  // Custom parser functions (sync)
  {
    name: "date",
    options: ["--date"],
    type: (value: string) => new Date(value),
  },

  // Async custom parser functions
  {
    name: "config",
    options: ["--config"],
    type: async (filePath: string) => {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    },
  },
  {
    name: "user",
    options: ["--user-id"],
    type: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
  },
]);
```

#### Runtime Type Validation

The type system validates flag definitions at runtime and throws descriptive errors for invalid configurations:

```typescript
// ✅ Valid - these work
{ name: "count", options: ["--count"], type: Number }
{ name: "count", options: ["--count"], type: "number" }
{ name: "count", options: ["--count"], type: "NUMBER" } // case-insensitive

// ❌ Invalid - these throw ZodError
{ name: "count", options: ["--count"], type: "invalid-type" }
{ name: "count", options: ["--count"], type: 42 } // primitive instead of constructor
{ name: "count", options: ["--count"], type: null }
```

#### Automatic Type Processing

- **String literals** are automatically converted to constructor functions internally
- **Constructor functions** are preserved as-is
- **Custom parser functions** (sync and async) allow complex transformations
- **undefined** falls back to the default `"string"` type

#### Async Custom Parser Support

Custom parser functions can be **asynchronous**, enabling powerful use cases like file I/O, API calls, and database lookups:

```typescript
const parser = new ArgParser({
  /* ... */
}).addFlags([
  {
    name: "config",
    options: ["--config"],
    type: async (filePath: string) => {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    },
  },
  {
    name: "user",
    options: ["--user-id"],
    type: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error(`User not found: ${userId}`);
      return response.json();
    },
  },
]);

// Usage: --config ./settings.json --user-id 123
const result = await parser.parse(process.argv.slice(2));
// result.config contains parsed JSON from file
// result.user contains user data from API
```

**Key Features:**

- ✅ **Backward compatible** - existing sync parsers continue to work
- ✅ **Automatic detection** - no configuration needed, just return a Promise
- ✅ **Error handling** - async errors are properly propagated
- ✅ **Performance** - parsers run concurrently when possible

#### Type Conversion Examples

```typescript
// String flags
--name value          → "value"
--name="quoted value" → "quoted value"

// Number flags
--count 42           → 42
--port=8080          → 8080

// Boolean flags (flagOnly: true)
--verbose            → true
(no flag)            → false

// Array flags (allowMultiple: true)
--tags tag1,tag2,tag3           → ["tag1", "tag2", "tag3"]
--file file1.txt --file file2.txt → ["file1.txt", "file2.txt"]

// Custom parser functions (sync)
--date "2023-01-01"  → Date object
--json '{"key":"val"}' → parsed JSON object

// Async custom parser functions
--config "./settings.json" → parsed JSON from file (async)
--user-id "123"            → user data from API (async)
```

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

### Output Schema Support

Output schemas are **completely optional** and **only affect MCP mode** (Claude Desktop, MCP clients). They have **zero impact** on CLI usage - your CLI will work exactly the same with or without them.

**When do I need output schemas?**

- ❌ **CLI-only usage**: Never needed - skip this section entirely
- ✅ **MCP integration**: Optional but recommended for better structured responses
- ✅ **Claude Desktop**: Helpful for Claude to understand your tool's output format

**Key Points:**

- ✅ **CLI works perfectly without them**: Your command-line interface is unaffected
- ✅ **MCP-only feature**: Only used when running with `--s-mcp-serve`
- ✅ **Version-aware**: Automatically included only for compatible MCP clients (v2025-06-18+)
- ✅ **Flexible**: Use predefined patterns or custom Zod schemas

#### Basic Usage

```typescript
import { z } from "zod";

.addTool({
  name: "process-file",
  description: "Process a file",
  flags: [
    { name: "path", options: ["--path"], type: "string", mandatory: true }
  ],
  // Optional: Only needed if you want structured MCP responses
  // CLI mode works exactly the same whether this is present or not
  outputSchema: {
    success: z.boolean().describe("Whether processing succeeded"),
    filePath: z.string().describe("Path to the processed file"),
    size: z.number().describe("File size in bytes"),
    lastModified: z.string().describe("Last modification timestamp")
  },
  handler: async (ctx) => {
    // Your logic here - same code for both CLI and MCP
    // The outputSchema doesn't change how this function works
    return {
      success: true,
      filePath: ctx.args.path,
      size: 1024,
      lastModified: new Date().toISOString()
    };
  }
})

// CLI usage (outputSchema ignored): mycli process-file --path /my/file.txt
// MCP usage (outputSchema provides structure): mycli --s-mcp-serve
```

#### Predefined Schema Patterns

For common use cases, use predefined patterns:

```typescript
// For simple success/error responses
outputSchema: "successError";

// For operations that return data
outputSchema: "successWithData";

// For file operations
outputSchema: "fileOperation";

// For process execution
outputSchema: "processExecution";

// For list operations
outputSchema: "list";
```

#### Custom Zod Schemas

For complex data structures:

```typescript
outputSchema: z.object({
  analysis: z.object({
    summary: z.string(),
    wordCount: z.number(),
    sentiment: z.enum(["positive", "negative", "neutral"]),
  }),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
  }),
});
```

#### MCP Version Compatibility

Output schemas are automatically handled based on MCP client version:

- **MCP v2025-06-18+**: Full output schema support with `structuredContent`
- **Earlier versions**: Schemas ignored, standard JSON text response only

To explicitly set the MCP version for testing:

```typescript
const cli = ArgParser.withMcp({
  // ... your config
}).setMcpProtocolVersion("2025-06-18"); // Enable output schema support
```

**Important**:

- **CLI users**: You can ignore MCP versions entirely - they don't affect command-line usage
- **MCP users**: ArgParser handles version detection automatically based on client capabilities

#### Automatic Error Handling

ArgParser automatically handles errors differently based on execution context, so your handlers can simply throw errors without worrying about CLI vs MCP mode:

```typescript
const cli = ArgParser.withMcp({
  // ... config
}).addTool({
  name: "process-data",
  handler: async (ctx) => {
    // Simply throw errors - ArgParser handles the rest automatically
    if (!ctx.args.apiKey) {
      throw new Error("API key is required");
    }

    // Do your work and return results
    return { success: true, data: processedData };
  },
});
```

**How it works:**

- **CLI mode**: Thrown errors cause the process to exit with error code 1
- **MCP mode**: Thrown errors are automatically converted to structured MCP error responses
- **No manual checks needed**: Handlers don't need to check `ctx.isMcp` or handle different response formats

### Writing Effective MCP Tool Descriptions

**Why descriptions matter**: When your tools are exposed to Claude Desktop or other MCP clients, the `description` field is the primary way LLMs understand what your tool does and when to use it. A well-written description significantly improves tool selection accuracy and user experience.

#### Best Practices for Tool Descriptions

**1. Start with the action** - Begin with a clear verb describing what the tool does:

```typescript
// ✅ Good: Action-first, specific
description: "Analyzes text files and returns detailed statistics including word count, character count, and sentiment analysis";

// ❌ Avoid: Vague or noun-heavy
description: "File analysis tool";
```

**2. Include context and use cases** - Explain when and why to use the tool:

```typescript
// ✅ Good: Provides context
description: "Converts image files between formats (PNG, JPEG, WebP). Use this when you need to change image format, resize images, or optimize file sizes. Supports batch processing of multiple files.";

// ❌ Avoid: No context
description: "Converts images";
```

**3. Mention key parameters and constraints** - Reference important inputs and limitations:

```typescript
// ✅ Good: Mentions key parameters and constraints
description: "Searches through project files using regex patterns. Specify the search pattern and optionally filter by file type. Supports JavaScript, TypeScript, Python, and text files up to 10MB.";

// ❌ Avoid: No parameter guidance
description: "Searches files";
```

**4. Be specific about outputs** - Describe what the tool returns:

```typescript
// ✅ Good: Clear output description
description: "Analyzes code complexity and returns metrics including cyclomatic complexity, lines of code, and maintainability index. Results include detailed breakdown by function and overall file scores.";

// ❌ Avoid: Unclear output
description: "Analyzes code";
```

#### Complete Example: Well-Documented Tool

```typescript
.addTool({
  name: "analyze-repository",
  description: "Analyzes a Git repository and generates comprehensive statistics including commit history, contributor activity, code quality metrics, and dependency analysis. Use this to understand project health, identify bottlenecks, or prepare reports. Supports Git repositories up to 1GB with history up to 5 years.",
  flags: [
    {
      name: "path",
      description: "Path to the Git repository root directory",
      options: ["--path", "-p"],
      type: "string",
      mandatory: true,
    },
    {
      name: "include-dependencies",
      description: "Include analysis of package.json dependencies and security vulnerabilities",
      options: ["--include-dependencies", "-d"],
      type: "boolean",
      flagOnly: true,
    },
    {
      name: "output-format",
      description: "Output format for the analysis report",
      options: ["--output-format", "-f"],
      type: "string",
      choices: ["json", "markdown", "html"],
      defaultValue: "json",
    }
  ],
  handler: async (ctx) => {
    // Implementation here
  }
})
```

#### Parameter Description Guidelines

Each flag should have a clear, concise description:

```typescript
// ✅ Good parameter descriptions
{
  name: "timeout",
  description: "Maximum execution time in seconds (default: 30, max: 300)",
  options: ["--timeout", "-t"],
  type: "number",
}

{
  name: "verbose",
  description: "Enable detailed logging output including debug information",
  options: ["--verbose", "-v"],
  type: "boolean",
  flagOnly: true,
}

{
  name: "format",
  description: "Output format for results (json: structured data, csv: spreadsheet-friendly, pretty: human-readable)",
  options: ["--format"],
  type: "string",
  choices: ["json", "csv", "pretty"],
}
```

#### Common Pitfalls to Avoid

- **Don't be overly technical**: Avoid jargon that doesn't help with tool selection
- **Don't repeat the tool name**: The name is already visible, focus on functionality
- **Don't use generic terms**: "Process data" or "handle files" are too vague
- **Don't forget constraints**: Mention important limitations or requirements
- **Don't ignore parameter descriptions**: Each flag should have a helpful description

**Remember**: A good description helps the LLM choose the right tool for the task and use it correctly. Invest time in writing clear, comprehensive descriptions - it directly impacts the user experience in Claude Desktop and other MCP clients.

### Automatic MCP Server Mode (`--s-mcp-serve`)

You don't need to write any server logic. Run your application with the `--s-mcp-serve` flag, and ArgParser will automatically start a compliant MCP server, exposing all tools defined with `.addTool()` and subcommands created with `.addSubCommand()` (unless `includeSubCommands: false` is set).

```bash
# This single command starts a fully compliant MCP server
my-cli-app --s-mcp-serve

# You can also override transports and ports using system flags
my-cli-app --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3001

# Configure custom log file path for MCP server logs
my-cli-app --s-mcp-serve --s-mcp-log-path ./custom-logs/mcp-server.log

# Or configure log path programmatically in withMcp()
const cli = ArgParser.withMcp({
  appName: 'My CLI App',
  appCommandName: 'my-cli-app',
  mcp: {
    serverInfo: { name: 'my-server', version: '1.0.0' },
    logPath: './my-logs/mcp-server.log'  // Programmatic log path
  }
});
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

# Custom log path via CLI flag (logs to specified file instead of ./logs/mcp.log)
my-tool --s-mcp-serve --s-mcp-log-path /var/log/my-mcp-server.log

# Custom log path via programmatic configuration
const parser = ArgParser.withMcp({
  mcp: {
    serverInfo: { name: 'my-tool', version: '1.0.0' },
    logPath: '/var/log/my-mcp-server.log'
  }
});

# Multiple transports and custom log path (configured via --s-mcp-serve system flag)
const cli = ArgParser.withMcp({
  appName: 'multi-tool',
  appCommandName: 'multi-tool',
  mcp: {
    logPath: './logs/multi-tool-mcp.log',  // Custom log path
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

### MCP Log Path Configuration

MCP server logs can be configured through multiple methods with the following priority order:

1. **CLI Flag (Highest Priority)**: `--s-mcp-log-path <path>`
2. **Programmatic Configuration**: `mcp.logPath` in `withMcp()`
3. **Default Path (Fallback)**: `./logs/mcp.log`

#### Path Resolution Options

Log paths are resolved with smart defaults for better DXT package compatibility:

```typescript
// Simple string paths (recommended)
const parser = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "my-cli",
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    logPath: "./logs/app.log", // Relative to entry point (default)
    // logPath: "/tmp/app.log",          // Absolute paths work too
    // logPath: "cwd:./logs/app.log",    // Explicit process.cwd() relative
  },
});

// Object configuration for advanced use cases
const parser = ArgParser.withMcp({
  // ... other config
  mcp: {
    // ... server info
    logPath: {
      path: "./logs/app.log",
      relativeTo: "entry", // "entry" | "cwd" | "absolute"
      basePath: "/custom/base", // Optional custom base path
    },
  },
});

// CLI flag overrides programmatic setting
// my-cli --s-mcp-serve --s-mcp-log-path ./override.log
```

The CLI flag always takes precedence, allowing users to override the developer's programmatic configuration when needed. By default, relative paths resolve relative to the application's entry point, making logs predictably located near DXT packages.

### MCP Resources - Real-Time Data Feeds

MCP Resources enable your CLI tools to provide **real-time, subscription-based data feeds** to AI assistants. Unlike tools (which are called once), resources can be subscribed to and provide live updates when data changes.

**Key Benefits:**
- **Real-time notifications**: AI assistants get notified when your data changes
- **Flexible URI templates**: Support dynamic parameters like `data://alerts/aged/gte:{threshold}`
- **Standard MCP pattern**: Full subscription lifecycle support
- **Zero CLI impact**: Resources only work in MCP mode, CLI usage unchanged

#### Basic Resource Setup

```typescript
const parser = ArgParser.withMcp({
  appName: "Data Monitor",
  appCommandName: "data-monitor",
  mcp: {
    serverInfo: { name: "data-monitor", version: "1.0.0" }
  }
})
.addMcpResource({
  name: "recent-data",
  uriTemplate: "data://recent",
  title: "Recent Data",
  description: "Get the most recent data entries",
  mimeType: "application/json",
  handler: async (uri) => {
    const recentData = await getRecentData();
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(recentData, null, 2),
        mimeType: "application/json"
      }]
    };
  }
});
```

#### URI Templates with Dynamic Parameters

Create flexible resources that accept parameters:

```typescript
.addMcpResource({
  name: "aged-data-alert",
  uriTemplate: "data://alerts/aged/gte:{threshold}",
  title: "Aged Data Alert",
  description: "Monitor data that has aged past a threshold (in milliseconds)",
  handler: async (uri, { threshold }) => {
    const thresholdMs = parseInt(threshold);
    const agedData = await getDataOlderThan(new Date(Date.now() - thresholdMs));

    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          threshold_ms: thresholdMs,
          query_time: new Date().toISOString(),
          aged_data: agedData,
          count: agedData.length
        }, null, 2),
        mimeType: "application/json"
      }]
    };
  }
});
```

#### MCP Subscription Lifecycle

Resources support the full MCP subscription pattern:

1. **Client subscribes**: `resources/subscribe` → `"data://alerts/aged/gte:10000"`
2. **Server monitors**: Your application detects data changes
3. **Server notifies**: `notifications/resources/updated` sent to subscribed clients
4. **Client reads fresh data**: `resources/read` → `"data://alerts/aged/gte:10000"`
5. **Client unsubscribes**: `resources/unsubscribe` when done

#### Usage Examples

**AI Assistant Integration:**
```typescript
// AI assistant can subscribe to real-time data
await client.request('resources/subscribe', {
  uri: 'data://alerts/aged/gte:60000' // 1 minute threshold
});

// Handle notifications
client.on('notifications/resources/updated', async (notification) => {
  const response = await client.request('resources/read', {
    uri: notification.uri
  });
  console.log('Fresh data:', JSON.parse(response.contents[0].text));
});
```

**Command Line Testing:**
```bash
# Start MCP server
data-monitor --s-mcp-serve

# Test resource (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"data://alerts/aged/gte:10000"}}' | data-monitor --s-mcp-serve
```

#### Design Patterns

**Static Resources**: Use simple URIs for data that changes content but not structure
```typescript
uriTemplate: "logs://recent"        // Always available, content updates
uriTemplate: "status://system"      // System status, updates in real-time
```

**Parameterized Resources**: Use URI templates for flexible filtering
```typescript
uriTemplate: "data://type/{type}"           // Filter by type
uriTemplate: "alerts/{severity}/gte:{age}"  // Multiple parameters
uriTemplate: "search/{query}/limit:{count}" // Search with limits
```

**Time-Based Resources**: Perfect for monitoring and alerting
```typescript
uriTemplate: "events/since:{timestamp}"     // Events since timestamp
uriTemplate: "metrics/aged/gte:{threshold}" // Metrics past threshold
uriTemplate: "logs/errors/last:{duration}"  // Recent errors
```

> **💡 Pro Tip**: Resources are perfect for monitoring, alerting, and real-time data feeds. They complement tools (one-time actions) by providing continuous data streams that AI assistants can subscribe to.

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
# (you can install the unpacked folder) directly in Claude Desktop > Settings > Extensions > Advanced
npx @anthropic-ai/dxt pack ./my-dxt-package

# 3. (Optional) Sign the DXT package - this has not been well tested yet
npx @anthropic-ai/dxt sign ./my-dxt-package.dxt

# Then drag & drop the .dxt file into Claude Desktop to install it, in the Settings > Extensions screen.

# **IMPORTANT**:
# If you use ML models or packages that include binaries such as Sqlite3 or sharp, etc...
# You need to bundle the node_modules folder with your DXT package
# In order to do this, you need to use the following flag:
# First hard-install all the packages
rm -rf node_moduels
pnpm install --prod --linker hoisted
# Then bundle with node_modules
mycli --s-build-dxt ./my-dxt-package --s-with-node-modules
# then build the dxt bundle
npx @anthropic-ai/dxt pack ./my-dxt-package
# then upload the dxt bundle to Claude Desktop from the settings > extensions > advanced
```

### Logo Configuration

The logo will appear in Claude Desktop's Extensions settings and when users interact with your MCP tools. Note that neither ArgParser nor Anthropic packer will modify the logo, so make sure to use a reasonable size, such as 256x256 pixels or 512x512 pixels maximum. Any image type that can display in a browser is supported.

You can customize the logo/icon that appears in Claude Desktop for your DXT package by configuring the `logo` property in your `serverInfo`:

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  mcp: {
    // This will appear in Claude Desktop's Extensions settings
    serverInfo: {
      name: "my-mcp-server",
      version: "1.0.0",
      description: "My CLI as an MCP server",
      logo: "./assets/my-logo.png", // Local file path
    },
  },
});
```

If no custom logo is provided or loading fails, a default ArgParser logo is included

#### Supported Logo Sources

**Local File Path:**

```typescript
logo: "./assets/my-logo.png"; // Relative to your project
logo: "/absolute/path/to/logo.jpg"; // Absolute path
```

**HTTP/HTTPS URL:**

```typescript
logo: "https://example.com/logo.png"; // Downloaded automatically
logo: "https://cdn.example.com/icon.svg";
```

### Including Additional Files in DXT Packages

You can include additional files and directories in your DXT package using the `dxt.include` configuration. This is useful for bundling database migrations, configuration files, assets, or any other files your MCP server needs at runtime.

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  mcp: {
    serverInfo: {
      name: "my-mcp-server",
      version: "1.0.0",
      description: "My CLI as an MCP server",
    },
    dxt: {
      include: [
        "migrations",                                    // Copy entire migrations folder
        "config/production.json",                       // Copy specific file
        { from: "assets/logo.png", to: "logo.png" },    // Copy and rename file
        { from: "scripts", to: "bin" },                 // Copy folder with new name
      ],
    },
  },
});
```

#### Include Options

**Simple string paths** - Copy files/directories to the same relative location:
```typescript
include: [
  "migrations",           // Copies ./migrations/ to dxt/migrations/
  "config/default.json",  // Copies ./config/default.json to dxt/config/default.json
]
```

**Object mapping** - Copy with custom destination paths:
```typescript
include: [
  { from: "config/prod.json", to: "config.json" },     // Rename during copy
  { from: "database/schema", to: "db/schema" },        // Copy to different path
]
```

**Path Resolution**: All paths in the `from` field are resolved relative to your project root (where `package.json` and `tsconfig.json` are located).

**Example Use Cases**:
- Database migration files for initialization
- Configuration templates or defaults
- Static assets like images or documents
- Scripts or utilities needed at runtime
- Documentation or help files

### How DXT Generation Works

When you run `--s-build-dxt`, ArgParser performs several steps to create a self-contained, autonomous package:

1.  **Introspection**: It analyzes all tools defined with `.addTool()`.
2.  **Manifest Generation**: It creates a `manifest.json` file.
    - Tool flags are converted into a JSON Schema for the `input_schema`.
    - Flags with an `env` property (e.g., `{ name: 'apiKey', env: 'API_KEY' }`) are automatically added to the `user_config` section, prompting the user for the value upon installation and making it available as an environment variable to your tool.
3.  **Autonomous Build**: It bundles your CLI's source code and its dependencies into a single entry point (e.g., `server.js`) that can run without `node_modules`. This ensures the DXT is portable and reliable. If you have properly setup your node_modules (via `pnpm install --prod --node-linker=hoisted`) and pass `--s-with-node-nodules` to the bundling process, the resulting DXT will include all necessary dependencies, this is useful for projects that require native dependencies or have complex dependency trees.
4.  **Packaging**: It assembles all necessary files (manifest, server bundle, logo, etc.) into the specified output directory, ready to be used by Claude Desktop or packed with `npx @anthropic-ai/dxt`.

### DXT Bundling Strategies

ArgParser offers two approaches for handling dependencies in DXT packages, depending on your project's needs.

#### Standard Approach (Recommended for Most Projects)

```bash
# For pure JavaScript/TypeScript projects
your-cli --s-build-dxt
```

- **Best for**: Pure JS/TS projects without native dependencies
- **Bundle size**: Small (5-10MB typical)
- **Build time**: Fast
- **Dependencies**: Bundled automatically by TSDown

#### Native Dependencies Approach

```bash
# For projects with native binaries (ONNX, Sharp, SQLite, etc.)
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
your-cli --s-build-dxt --s-with-node-modules
```

- **Best for**: Projects using ONNX Runtime, Sharp, Canvas, SQLite, or other packages with `.node` binaries
- **Bundle size**: Larger (50-200MB typical)
- **Build time**: Longer (copies entire node_modules)
- **Dependencies**: Complete autonomy - no installation needed by Claude

**When to use `--s-with-node-modules`:**

- ✅ Your project uses machine learning packages (ONNX Runtime, TensorFlow bindings)
- ✅ You need image processing (Sharp, Canvas)
- ✅ You use database packages with native binaries (better-sqlite3, sqlite3)
- ✅ You want guaranteed compatibility without runtime installation
- ✅ Bundle size is acceptable for your use case

**Required preparation steps:**

1. `rm -rf node_modules` - Clean slate for proper structure
2. `pnpm install --prod --node-linker=hoisted` - Creates flat, symlink-free structure
3. Add `--s-with-node-modules` flag to your build command

The system automatically validates your setup and provides guidance if issues are detected.

### Typical Errors

**Failed to run in Claude Desktop**:

Claude Desktop is pretty finicky (as of Claude 0.12.28), and the built-in Node.js does not work with extensions built with `--s-with-node-modules` and installed via ArgParser (and I have no idea why because there's no debug info).
To resolve this, simply go to `Claude Desktop > Settings > Extensions > Advanced Settings` and turn **OFF** `Use Built-in Node.js for MCP`.

Note that there are _many_ reasons for extensions not to work, if it does not work with Built-in or System Node.js, then something in your app is wrong. Feel free to join Alcyone Labs' discord for support: [Alcyone Labs' Discord](https://discord.gg/rRHhpz5nS5)

**Failed to attach to MCP when downloading external assets**

Sometimes, the MCP client needs to install external files, for example an ML model from HuggingFace or some task that takes more than 10 seconds to run. While it's working, Claude Desktop will display a `Cannot attach to MCP`, simply ignore it, Claude Desktop runs a ping every X seconds, and when it is running a long-running task, the ping will fail, but the task itself will still finish correctly.

**Failed to generate DXT package**:

If you encounter the following error running a command such as:

```bash
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
bun src/index.ts --s-build-dxt ./dxt --s-with-node-modules

-- Error generating DXT package: TSDown DXT build failed: EEXIST: file already exists, mkdir
```

Then run:

```bash
rm -rf ./dxt
bun src/index.ts --s-build-dxt ./dxt --s-with-node-modules
```

And it should work. TSDown is tasked to clean the outputDir first, but it won't if some files have been manually changed.

---

## System Flags & Configuration

ArgParser includes built-in `--s-*` flags for development, debugging, and configuration. They are processed before normal arguments and will cause the program to exit after their task is complete.

| Flag                        | Description                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **MCP & DXT**               |                                                                                                                |
| `--s-mcp-serve`             | Starts the application in MCP server mode, exposing all tools.                                                 |
| `--s-build-dxt [dir]`       | Generates a complete, autonomous DXT package for Claude Desktop in the specified directory.                    |
| `--s-with-node-modules`     | Use with `--s-build-dxt`. Includes complete node_modules in DXT package for projects with native dependencies. |
| `--s-mcp-transport <type>`  | Overrides the MCP transport (`stdio`, `sse`, `streamable-http`).                                               |
| `--s-mcp-transports <json>` | Overrides transports with a JSON array for multi-transport setups.                                             |
| `--s-mcp-port <number>`     | Sets the port for HTTP-based transports (`sse`, `streamable-http`).                                            |
| `--s-mcp-host <string>`     | Sets the host address for HTTP-based transports.                                                               |
| `--s-mcp-log-path <path>`   | Sets the file path for MCP server logs (default: `./logs/mcp.log`). Overrides programmatic setting.            |
| **Configuration**           |                                                                                                                |
| `--s-with-env <file>`       | Loads configuration from a file (`.env`, `.json`, `.yaml`, `.toml`). CLI args take precedence.                 |
| `--s-save-to-env <file>`    | Saves the current arguments to a configuration file, perfect for templates.                                    |
| **Debugging**               |                                                                                                                |
| `--s-debug`                 | Prints a detailed, step-by-step log of the argument parsing process.                                           |
| `--s-debug-print`           | Exports the entire parser configuration to a JSON file for inspection.                                         |
| `--s-enable-fuzzy`          | Enables fuzzy testing mode—a dry run that parses args but skips handler execution.                             |

---

## Changelog

### v2.3.0

The DXT bundling is working pretty well now, and we have had a lot of success building, bundling and running various extensions. If you see issues, feel free to open an Issue on GitHub with details, or ask about it on [Alcyone Labs' Discord](https://discord.gg/rRHhpz5nS5)

Make sure to clearly identify if you need to include the node_modules or not. In doubt, include them using `--s-with-node-modules`

**Feat**

- **New `--s-with-node-modules` flag**: Create fully autonomous DXT packages that include complete native dependencies. Perfect for projects using ONNX Runtime, Sharp, SQLite, or other packages with `.node` binaries. Use `rm -rf ./node_modules && pnpm install --prod --node-linker=hoisted` followed by `my-cli --s-build-dxt ./dxt --s-with-node-modules` to create self-contained packages that work without Claude needing to install dependencies.
  Note that when bundling with node_modules, it's likely that the built-in Node.js will not work with that extension, so go to `Claude Desktop > Settings > Extensions > Advanced Settings` and turn **OFF** `Use Built-in Node.js for MCP`.

### v2.2.1

**Feat**

- You can now specify logPath for the MCP output and easily disambiguate what the path is relative to (`__dirname` versus `process.cwd()` versus absolute)

**Fixes and changes**

- Fixes an issue where building a DXT package via `--s-build-dxt` would generate an invalid package if the entry_point was a TypeScript .ts file.

### v2.2.0

**Feat**

- IFlag function-based `type` now supports async methods such as `type: async () => Promise<string>`.

**Fixes and changes**

- `.parse()` can now work without arguments, it will try to infer that if you are in CLI mode and on a Node environment, it should use `process.argv` as the input. You can still pass parameters to control more granularly.
- `--s-build-dxt` now takes an optional path to specify where to prepare the assets prior to packing, the path you pass is in relation to process.cwd() (current working directory).
- `--s-build-dxt` logo detection now resolves paths more accurately...

### v2.1.1

**Fixes and changes**

- Fix missing missing types fr

### v2.1.0

**Feat**

- IFlag function-based `type` handling must now define the type it returns, this unlocks nice features such as providing nicer Intellisense, `output schemas` support and makes it easier to upgrade to Zod V4
- Add support for MCP output_schema field for clients that support it, CLI isn't impacted by it, this helps a lot the interactivity, self-documentation, and improves the API guarantees

**Fixes and changes**

- Improved MCP version compliance

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
- [x] Add support for async type function to enable more flexibility
- [ ] Add System flags to args.systemArgs
- [ ] Improve flag options collision prevention
- [ ] Add support for locales / translations
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
