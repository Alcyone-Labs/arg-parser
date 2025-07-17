# ArgParser - Type-Safe Command Line Argument Parser

A modern, type-safe command line argument parser with built-in MCP (Model Context Protocol) integration and automatic Claude Desktop Extension (DXT) generation.

## Table of Contents

- [Features Overview](#features-overview)
- [Installation](#installation)
- [Quick Start: The Unified `addTool` API](#quick-start-the-unified-addtool-api)
- [How to Run It](#how-to-run-it)
  - [Setting Up System-Wide CLI Access](#setting-up-system-wide-cli-access)
- [Parsing Command-Line Arguments](#parsing-command-line-arguments)
  - [Cannonical Usage Pattern](#cannonical-usage-pattern)
  - [Top-level await](#top-level-await)
  - [Promise-based parsing](#promise-based-parsing)
- [Migrating from v1.x to the v2.0 `addTool` API](#migrating-from-v1x-to-the-v20-addtool-api)
  - [Before v2.0: Separate Definitions](#before-v20-separate-definitions)
  - [After v2.0: The Unified `addTool()` Method](#after-v20-the-unified-addtool-method)
- [Core Concepts](#core-concepts)
  - [Defining Flags](#defining-flags)
  - [Type Handling and Validation](#type-handling-and-validation)
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
  - [Automatic Console Safety](#automatic-console-safety)
  - [Generating DXT Packages (`--s-build-dxt`)](#generating-dxt-packages---s-build-dxt)
  - [Logo Configuration](#logo-configuration)
    - [Supported Logo Sources](#supported-logo-sources)
  - [How DXT Generation Works](#how-dxt-generation-works)
- [System Flags & Configuration](#system-flags--configuration)
- [Changelog](#changelog)
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
- **Console Safe**: `console.log` and other methods
  are automatically handled in MCP mode to prevent protocol contamination, requiring no changes to your code.
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

# 3. (Optional) Sign the DXT package
npx @anthropic-ai/dxt sign ./my-dxt-package.dxt

# Then drag & drop the .dxt file into Claude Desktop to install it, in the Settings > Extensions screen.
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
| `--s-build-dxt [dir]`       | Generates a complete, autonomous DXT package for Claude Desktop in the specified directory.    |
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
