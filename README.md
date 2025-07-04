# ArgParser - Type-Safe Command Line Argument Parser

ArgParser is a powerful and flexible library for building command-line interfaces (CLIs) in TypeScript and JavaScript. It helps you define, parse, validate, and handle command-line arguments and sub-commands in a structured, type-safe way.

Whether you're building a simple script, a complex nested CLI application, or an MCP (Model Context Protocol) server, ArgParser provides the tools to create robust and user-friendly interfaces with minimal boilerplate.

## What's New in v1.2.0

### **Critical MCP Fixes & Improvements**

- **Fixed MCP Output Schema Support**: Resolved the critical issue where MCP tools with output schemas failed with `"Tool has an output schema but no structured content was provided"` error
- **Enhanced Handler Context**: Added `isMcp` flag to handler context, enabling proper MCP mode detection in handlers
- **Improved Response Format**: MCP tools now correctly return both `content` and `structuredContent` fields as required by the JSON-RPC 2.0 specification
- **Better Integration**: Handlers can now reliably detect when they're being called from MCP mode vs CLI mode

### **What Was Fixed**

**Before v1.2.0**: MCP servers would fail when tools had output schemas defined:
```
MCP error -32602: Tool canny-search has an output schema but no structured content was provided
```

**After v1.2.0**: MCP tools with output schemas work correctly, returning proper JSON-RPC 2.0 responses:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{"type": "text", "text": "..."}],
    "structuredContent": { /* validated against output schema */ }
  }
}
```

### **Handler Context Enhancement**

Handlers now receive an `isMcp` flag to detect execution context:

```typescript
const cli = ArgParser.withMcp({
  handler: async (ctx) => {
    if (ctx.isMcp) {
      // Running in MCP mode - return structured data
      return { success: true, data: processedData };
    } else {
      // Running in CLI mode - can use console output
      console.log("Processing complete!");
      return processedData;
    }
  }
});
```

## What's New in v1.1.0

### **Major Features**

- **MCP (Model Context Protocol) Integration**: Transform any CLI into an MCP server with multiple transport support. Run MCP servers with stdio, SSE, and HTTP transports simultaneously, including streamable HTTP.
- **System Flags**: Built-in `--s-debug-print`, `--s-with-env`, `--s-save-to-env`, `--s-enable-fuzzy`, and `--s-save-DXT` for enhanced debugging, configuration, testing, and MCP distribution
- **Environment Loading**: Load configuration from `.env`, `.yaml`, `.json`, and `.toml` files
- **Enhanced Debugging**: Comprehensive runtime debugging and configuration export tools

### **Quick Start with MCP**

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "My CLI Tool",
  appCommandName: "my-tool",
  description: "A powerful CLI that can also run as an MCP server",
  handler: async (ctx) => ({ result: "success", args: ctx.args }),
})
.addFlags([
  { name: "input", options: ["--input", "-i"], type: "string", mandatory: true },
  { name: "verbose", options: ["--verbose", "-v"], type: "boolean", flagOnly: true },
])
.addMcpSubCommand("serve", {
  name: "my-mcp-server",
  version: "1.1.0",
  description: "Expose this CLI as an MCP server",
}, {
  // Optional: Configure default transports (CLI flags take precedence)
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001, host: "0.0.0.0" }
  ]
});

// Use as CLI: my-tool --input data.txt --verbose
// Use as MCP server with defaults: my-tool serve
// Use as MCP server with CLI override: my-tool serve --transport sse --port 3002
// Use with multiple transports: my-tool serve --transports '[{"type":"stdio"},{"type":"sse","port":3001}]'
```

## Features

### **Core CLI Features**
- **Type Safety:** Define expected argument types (string, number, boolean, array, custom functions) and get type-safe parsed results
- **Declarative API:** Configure your CLI structure, flags, and sub-commands using a clear, declarative syntax
- **Automatic Help Generation:** Generate comprehensive and contextual help text based on your parser configuration
- **Hierarchical Commands:** Easily define nested sub-commands to create complex command structures (e.g., `git commit`, `docker container ls`)
- **Handler Execution:** Associate handler functions with commands and have them executed automatically upon successful parsing
- **Validation:** Define custom validation rules for flag values with enum support and custom validators
- **Conditional Requirements:** Make flags mandatory based on the presence or values of other arguments
- **Default Values:** Specify default values for flags if they are not provided on the command line
- **Flag Inheritance:** Share common flags between parent and child commands with an intuitive inheritance mechanism
- **Error Handling:** Built-in, user-friendly error reporting for common parsing issues, with an option to handle errors manually

### **MCP Integration (v1.1.0+)**
- **Automatic MCP Server Creation:** Transform any CLI into an MCP server with a single method call
- **Multiple Transport Support:** Run stdio, SSE, and HTTP transports simultaneously on different ports
- **Type-Safe Tool Generation:** Automatically generate MCP tools with Zod schema validation from CLI definitions
- **Flexible Configuration:** Support for single transport or complex multi-transport JSON configurations

### **System & Configuration Features (v1.1.0+)**
- **Environment Loading:** Load configuration from `.env`, `.yaml`, `.json`, and `.toml` files with `--s-with-env`
- **Configuration Export:** Save current configuration to various formats with `--s-save-to-env`
- **Advanced Debugging:** Runtime debugging with `--s-debug` and configuration inspection with `--s-debug-print`
- **CLI Precedence:** Command line arguments always override file configuration

## Installation

You can install ArgParser using your preferred package manager:

```bash
pnpm add @alcyone-labs/arg-parser
# or
npm install @alcyone-labs/arg-parser
# or
yarn add @alcyone-labs/arg-parser
# or
bun add @alcyone-labs/arg-parser
# or
deno install npm:@alcyone-labs/arg-parser
```

### **For MCP Integration (Optional)**

If you plan to use MCP server features, install the additional dependencies:

```bash
pnpm add @modelcontextprotocol/sdk express
# or
npm install @modelcontextprotocol/sdk express
```

**Note:** MCP dependencies are optional and only required if you use `ArgParser` with MCP features or MCP-related functionality.

## Runtime Compatibility

ArgParser is fully compatible with multiple JavaScript runtimes:

### **BunJS**
```bash
# Run TypeScript directly
bun your-cli.ts --flag value

# Or compile and run
bun build your-cli.ts --outdir ./dist
bun ./dist/your-cli.js --flag value
```

### **Node.js**
```bash
# Using tsx for TypeScript
npx tsx your-cli.ts --flag value

# Using ts-node
npx ts-node your-cli.ts --flag value

# Or compile and run
npx tsc your-cli.ts
node your-cli.js --flag value
```

### **Deno**
```bash
# Run with required permissions
deno run --unstable-sloppy-imports --allow-read --allow-write --allow-env your-cli.ts --flag value

# Or use the provided deno.json configuration for easier task management
deno task example:simple-cli --env production --port 8080
```

### **Using the Library in Your Projects**

Install the library and use it in your projects:

```bash
# Install the library
pnpm add @alcyone-labs/arg-parser

# Use in your project
import { ArgParser } from '@alcyone-labs/arg-parser';
// or
const { ArgParser } = require('@alcyone-labs/arg-parser');
```

### **Running Examples**

Examples are provided as TypeScript source files for educational purposes. Run them directly with your preferred runtime:

```bash
# BunJS (recommended)
bun examples/simple-cli.ts --env production --port 8080

# Node.js with tsx
npx tsx examples/simple-cli.ts --env production --port 8080

# Deno (use predefined tasks)
deno task example:simple-cli --env production --port 8080
```

All examples work seamlessly across all three runtimes, ensuring maximum compatibility for your CLI applications.

## Basic Usage

### **Standard CLI Usage**

Here's a simple example demonstrating how to define flags and parse arguments:

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Data Processor",
  appCommandName: "data-proc", // Used in help text and error messages
  description: "A tool for processing data phases",
  handler: async (ctx) => {
    console.log("Processing data with phase:", ctx.args.phase);
    return { success: true, phase: ctx.args.phase };
  },
}).addFlags([
  {
    name: "phase",
    options: ["--phase"],
    type: "string", // Use "string", "number", "boolean", or native types
    mandatory: true,
    enum: ["chunking", "pairing", "analysis"],
    description: "Processing phase to execute",
  },
  {
    name: "batch",
    options: ["-b", "--batch-number"],
    type: "number",
    mandatory: (args) => args.phase !== "analysis", // Conditional requirement
    defaultValue: 0,
    description: "Batch number (required except for analysis phase)",
  },
  {
    name: "verbose",
    options: ["-v", "--verbose"],
    flagOnly: true, // This flag does not expect a value
    description: "Enable verbose logging",
  },
]);

// Parse and execute
const result = parser.parse(process.argv.slice(2));
console.log("Result:", result);
```

### **MCP Server Usage (v1.1.0+)**

Transform your CLI into an MCP server with minimal changes:

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Data Processor",
  appCommandName: "data-proc",
  description: "A tool for processing data phases (CLI + MCP server)",
  handler: async (ctx) => {
    console.log("Processing data with phase:", ctx.args.phase);
    return { success: true, phase: ctx.args.phase, batch: ctx.args.batch };
  },
})
.addFlags([
  {
    name: "phase",
    options: ["--phase"],
    type: "string",
    mandatory: true,
    enum: ["chunking", "pairing", "analysis"],
    description: "Processing phase to execute",
  },
  {
    name: "batch",
    options: ["-b", "--batch-number"],
    type: "number",
    defaultValue: 0,
    description: "Batch number for processing",
  },
])
.addMcpSubCommand("serve", {
  name: "data-processor-mcp",
  version: "1.1.0",
  description: "Data Processor MCP Server",
});

// Use as CLI: data-proc --phase chunking --batch 5
// Use as MCP server: data-proc serve
// Use with custom transport: data-proc serve --transport sse --port 3001
```

## MCP Integration (v1.1.0+)

ArgParser v1.1.0 introduces powerful Model Context Protocol (MCP) integration, allowing you to expose any CLI as an MCP server with minimal code changes.

### **Quick MCP Setup**

1. **Import the MCP-enabled class:**
   ```typescript
   import { ArgParser } from "@alcyone-labs/arg-parser";
   ```

2. **Create your CLI with MCP support:**
   ```typescript
   const cli = ArgParser.withMcp({
     appName: "My Tool",
     appCommandName: "my-tool",
     handler: async (ctx) => ({ result: "success", args: ctx.args }),
   })
   .addFlags([/* your flags */])
   .addMcpSubCommand("serve", {
     name: "my-mcp-server",
     version: "1.0.0",
   });
   ```

3. **Use as CLI or MCP server:**
   ```bash
   # CLI usage
   my-tool --input data.txt --verbose

   # MCP server (stdio)
   my-tool serve

   # MCP server (HTTP)
   my-tool serve --transport sse --port 3001

   # Multiple transports
   my-tool serve --transports '[{"type":"stdio"},{"type":"sse","port":3001}]'
   ```

### **MCP Transport Options**

- **`stdio`** (default): Standard input/output for CLI tools
- **`sse`**: Server-Sent Events over HTTP for web applications
- **`streamable-http`**: HTTP with streaming support for advanced integrations

### **Multiple Transports Simultaneously**

Run multiple transport types at once for maximum flexibility:

```bash
my-tool serve --transports '[
  {"type":"stdio"},
  {"type":"sse","port":3001,"path":"/sse"},
  {"type":"streamable-http","port":3002,"path":"/mcp","host":"0.0.0.0"}
]'
```

### **Automatic Tool Generation**

Your CLI flags are automatically converted to MCP tools with:
- **Type-safe schemas** using Zod validation
- **Automatic documentation** from flag descriptions
- **Enum validation** for restricted values
- **Error handling** with detailed messages

## Core Concepts

### Defining Flags

Flags are defined using the `.addFlag(flag)` method or by passing an array of flags as the second argument to the `ArgParser` constructor. Each flag is an object conforming to the `IFlag` interface:

```typescript
interface IFlag {
  name: string; // Internal name for accessing the value in parsed args
  options: string[]; // Array of command-line options (e.g., ["-v", "--verbose"])
  type:
    | "string"
    | "boolean"
    | "number"
    | "array"
    | "object"
    | ((value: string) => any)
    | Constructor; // Expected type or a parsing function
  description: string | string[]; // Text description for help output
  mandatory?: boolean | ((args: TParsedArgs) => boolean); // Whether the flag is required, or a function that determines this
  defaultValue?: any; // Default value if the flag is not provided
  default?: any; // Alias for defaultValue
  flagOnly?: boolean; // If true, the flag does not consume the next argument as its value (e.g., `--verbose`)
  allowMultiple?: boolean; // If true, the flag can be provided multiple times (values are collected in an array)
  enum?: any[]; // Array of allowed values. Parser validates input against this list.
  validate?: (value: any) => boolean | string | void; // Custom validation function
  required?: boolean | ((args: any) => boolean); // Alias for mandatory
}
```

### Type Handling and Validation

ArgParser handles type conversion automatically based on the `type` property. You can use standard string types (`"string"`, `"number"`, `"boolean"`, `"array"`, `"object`), native constructors (`String`, `Number`, `Boolean`, `Array`, `Object`), or provide a custom function:

```typescript
.addFlag({
  name: "count",
  options: ["--count"],
  type: Number, // Automatically converts value to a number
})
.addFlag({
  name: "data",
  options: ["--data"],
  type: JSON.parse, // Use a function to parse complex types like JSON strings
  description: "JSON data to process"
})
.addFlag({
  name: "environment",
  options: ["--env"],
  type: "string",
  enum: ["dev", "staging", "prod"], // Validate value against this list
  description: "Deployment environment",
})
.addFlag({
  name: "id",
  options: ["--id"],
  type: "string",
  validate: (value) => /^[a-f0-9]+$/.test(value), // Custom validation function
  description: "Hexadecimal ID",
})
.addFlag({
  name: "config",
  options: ["-c"],
  allowMultiple: true,
  type: path => require(path), // Load config from path (example)
  description: "Load multiple configuration files"
})
```

### Mandatory Flags

Flags can be made mandatory using the `mandatory` property, or its alias "required". This can be a boolean or a function that receives the currently parsed arguments and returns a boolean.

```typescript
.addFlag({
  name: "input",
  options: ["--in"],
  type: String,
  mandatory: true, // Always mandatory
  description: "Input file path",
})
.addFlag({
  name: "output",
  options: ["--out"],
  type: String,
  mandatory: (args) => args.format === "json", // Mandatory only if --format is "json"
  description: "Output file path (required for JSON output)",
})
```

If a mandatory flag is missing and default error handling is enabled (`handleErrors: true`), the parser will print an error and exit.

### Default Values

Set a `defaultValue` (or its alias `default`) for flags to provide a fallback value if the flag is not present in the arguments.

```typescript
.addFlag({
  name: "port",
  options: ["-p", "--port"],
  type: Number,
  defaultValue: 3000, // Default port is 3000 if -p or --port is not used
  description: "Server port",
})
```

### Flag-Only Flags

Flags that do not expect a value (like `--verbose` or `--force`) should have `flagOnly: true`. When `flagOnly` is false (the default), the parser expects the next argument to be the flag's value.

```typescript
.addFlag({
  name: "verbose",
  options: ["-v"],
  type: Boolean, // Typically boolean for flag-only flags
  flagOnly: true,
  description: "Enable verbose output",
})
```

### Alias Properties

For convenience, `ArgParser` supports aliases for some flag properties:

- `default` is an alias for `defaultValue`.
- `required` is an alias for `mandatory`.
  If both the original property and its alias are provided, the original property (`defaultValue`, `mandatory`) takes precedence.

## Hierarchical CLIs (Sub-Commands)

ArgParser excels at building CLIs with nested commands, like `git clone` or `docker build`.

### Defining Sub-Commands

Define sub-commands using the `subCommands` option in the `ArgParser` constructor or the `.addSubCommand(subCommand)` method. Each sub-command requires a `name`, `description`, and a dedicated `ArgParser` instance for its own flags and nested sub-commands.

Note that each flag name set is debounced to make sure there are no duplicates, but the flags are sandboxed within their respective sub-commands. So it's ok to use the same flag on different sub-commands.

```typescript
import {
  ArgParser,
  HandlerContext,
  ISubCommand,
} from "@alcyone-labs/arg-parser";

const deployParser = new ArgParser().addFlags([
  { name: "target", options: ["-t"], type: String, mandatory: true },
]);

const monitorLogsParser = new ArgParser().addFlags([
  { name: "follow", options: ["-f"], flagOnly: true, type: Boolean },
]);

const monitorParser = new ArgParser().addSubCommand({
  name: "logs",
  description: "Show logs",
  parser: monitorLogsParser,
  handler: ({ args }) => {
    console.log(`Showing logs... Follow: ${args.follow}`);
  },
});

const cli = new ArgParser({
  appName: "My CLI",
  appCommandName: "my-cli",
  description: "Manage application resources",
  subCommands: [
    {
      name: "deploy",
      description: "Deploy resources",
      parser: deployParser,
      handler: ({ args }) => {
        console.log(`Deploying to ${args.target}`);
      },
    },
    {
      name: "monitor",
      description: "Monitoring commands",
      parser: monitorParser,
    },
  ],
});

// Example usage:
// my-cli deploy -t production
// my-cli monitor logs -f
```

### Handler Execution

A core feature is associating handler functions with commands. Handlers are functions (`(ctx: HandlerContext) => void`) that contain the logic to be executed when a specific command (root or sub-command) is successfully parsed and matched.

Handlers can be defined in the `ISubCommand` object or set/updated later using the `.setHandler()` method on the command's parser instance.

**By default, after successful parsing, ArgParser will execute the handler associated with the _final command_ matched in the argument chain.** For example, running `my-cli service start` will execute the handler for the `start` command, not `my-cli` or `service`.

If you need to parse arguments but _prevent_ handler execution, you can pass the `skipHandlers: true` option to the `parse()` method:

```typescript
const args = parser.parse(process.argv.slice(2), { skipHandlers: true });
// Handlers will NOT be executed, you can inspect 'args' and decide what to do
```

### Handler Context

Handler functions receive a single argument, a `HandlerContext` object, containing information about the parsing result and the command chain:

```typescript
type HandlerContext = {
  args: TParsedArgs<any>; // Arguments parsed by and defined for the FINAL command's parser
  parentArgs?: TParsedArgs<any>; // Combined arguments from PARENT parsers (less relevant with inheritParentFlags)
  commandChain: string[]; // Array of command names from root to final command
};
```

The `args` property is the most commonly used, containing flags and their values relevant to the handler's specific command. If `inheritParentFlags` is used, inherited flags appear directly in `args`.

### Setting Handlers with `.setHandler()`

You can define or override a parser instance's handler after its creation:

```typescript
const myCommandParser = new ArgParser().addFlags(/* ... */);

myCommandParser.setHandler((ctx) => {
  console.log(`Executing handler for ${ctx.commandChain.join(" -> ")}`);
  // ... command logic ...
});

// You can also retrieve a sub-parser and set its handler:
const subParser = cli.getSubCommand("deploy")?.parser;
if (subParser) {
  subParser.setHandler((ctx) => {
    console.log("Overridden deploy handler!");
    // ... new deploy logic ...
  });
}
```

### Accessing Sub-Parsers with `.getSubCommand()`

Use the `.getSubCommand(name)` method on a parser instance to retrieve the `ISubCommand` definition for a specific sub-command by name. This allows you to access its parser instance to set handlers, add flags dynamically, or inspect its configuration.

```typescript
const deploySubCommand = cli.getSubCommand("deploy");
if (deploySubCommand) {
  console.log(`Description of deploy command: ${deploySubCommand.description}`);
  // Access the parser instance:
  const deployParserInstance = deploySubCommand.parser;
  // Add a flag specifically to the deploy command after initial setup:
  deployParserInstance.addFlag({
    name: "force",
    options: ["--force"],
    flagOnly: true,
    type: Boolean,
  });
}
```

### Flag Inheritance (`inheritParentFlags`)

Enable `inheritParentFlags: true` in a child parser's constructor options to automatically copy flags from its direct parent when added as a sub-command. This is useful for sharing common flags like `--verbose` across your CLI.

If a flag with the same name exists in both the parent and the child, the child's definition takes precedence. The built-in `--help` flag is never inherited.

```typescript
const parentParser = new ArgParser().addFlags([
  { name: "verbose", options: ["-v"], type: Boolean, flagOnly: true },
  { name: "config", options: ["-c"], type: String }, // Common config flag
]);

const childParser = new ArgParser({ inheritParentFlags: true }).addFlags([
  { name: "local", options: ["-l"], type: String }, // Child-specific flag
  { name: "config", options: ["--child-config"], type: Number }, // Override config flag
]);

parentParser.addSubCommand({
  name: "child",
  description: "A child command",
  parser: childParser,
});

// The 'child' parser now effectively has flags: --help, -v, -l, --child-config
// Running `parent child -v -l value --child-config 123` will parse all these flags.
```

## Automatic Help

ArgParser provides robust automatic help generation.

### Global Help Flag (`--help`, `-h`)

A `--help` (and `-h`) flag is automatically added to every parser instance (root and sub-commands). When this flag is encountered during parsing:

1.  ArgParser stops processing arguments.
2.  Generates and prints the help text relevant to the current command/sub-command context.
3.  Exits the process with code 0.

This behavior is triggered automatically unless `skipHelpHandling: true` is passed to the `parse()` method.

```bash
# Shows help for the root command
my-cli --help

# Shows help for the 'deploy' sub-command
my-cli deploy --help
```

### `helpText()` Method

You can manually generate the help text for any parser instance at any time using the `helpText()` method. This returns a string containing the formatted help output.

```typescript
console.log(parser.helpText());
```

### Auto-Help on Empty Invocation

For the root command, if you invoke the script **without any arguments** and the root parser **does not have a handler defined**, ArgParser will automatically display the root help text and exit cleanly (code 0). This provides immediate guidance for users who just type the script name.

If the root parser _does_ have a handler, it's assumed that the handler will manage the empty invocation case, and auto-help will not trigger.

## Error Handling

ArgParser includes built-in error handling for common parsing errors like missing mandatory flags, invalid types, or unknown commands.

By default (`handleErrors: true`):

1.  A descriptive, colored error message is printed to `stderr`.
2.  A suggestion to use `--help` is included, showing the correct command path.
3.  The process exits with status code 1.

```typescript
// Example (assuming 'data-proc' is appCommandName and 'phase' is mandatory)
// Running `data-proc` would output:

// Error: Missing mandatory flags: phase
//
// Try 'data-proc --help' for usage details.
```

You can disable this behavior by setting `handleErrors: false` in the `ArgParser` constructor options. When disabled, ArgParser will throw an `ArgParserError` exception on parsing errors, allowing you to catch and handle them programmatically.

```typescript
import { ArgParser, ArgParserError } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appCommandName: "my-app",
  handleErrors: false, // Disable default handling
});

try {
  const args = parser.parse(process.argv.slice(2));
  // Process args if parsing succeeded
} catch (error) {
  if (error instanceof ArgParserError) {
    console.error(`\nCustom Parse Error: ${error.message}`);
    // Implement custom logic (e.g., logging, different exit codes)
    process.exit(1);
  } else {
    // Handle unexpected errors
    console.error("An unexpected error occurred:", error);
    process.exit(1);
  }
}
```

## Environment Configuration Export

ArgParser includes a built-in system flag `--s-save-to-env` that allows you to export the current parser's configuration and parsed arguments to various file formats. This is useful for creating configuration templates, documenting CLI usage, or generating environment files for deployment.

### Usage

```bash
# Export to .env format (default for no extension)
your-cli --flag1 value1 --flag2 --s-save-to-env config.env

# Export to YAML format
your-cli --flag1 value1 --flag2 --s-save-to-env config.yaml

# Export to JSON format
your-cli --flag1 value1 --flag2 --s-save-to-env config.json

# Export to TOML format
your-cli --flag1 value1 --flag2 --s-save-to-env config.toml
```

### Supported Formats

The format is automatically detected based on the file extension:

- **`.env`** (or no extension): Bash environment variable format
- **`.yaml` / `.yml`**: YAML format
- **`.json` / `.jsonc`**: JSON format with metadata
- **`.toml` / `.tml`**: TOML format

### Behavior

- **Works at any parser level**: Can be used with root commands or sub-commands
- **Includes inherited flags**: Shows flags from the current parser and all parent parsers in the chain
- **Comments optional flags**: Flags that are optional and not set are commented out but still documented
- **Preserves values**: Set flags show their actual values, unset flags show default values or are commented out
- **Rich documentation**: Each flag includes its description, options, type, and constraints

### Example Output

For a CLI with flags `--verbose`, `--output file.txt`, and `--count 5`:

**`.env` format:**
```bash
# Environment configuration generated by ArgParser
# Format: Bash .env style

# verbose: Enable verbose output
# Options: -v, --verbose
# Type: Boolean
# Default: false
VERBOSE="true"

# output: Output file path
# Options: -o, --output
# Type: String
OUTPUT="file.txt"

# count: Number of items to process
# Options: -c, --count
# Type: Number
# Default: 10
COUNT="5"
```

**`.yaml` format:**
```yaml
# Environment configuration generated by ArgParser
# Format: YAML

# verbose: Enable verbose output
# Options: -v, --verbose
# Type: Boolean
# Default: false

verbose: true
output: "file.txt"
count: 5
```

## System Flags (v1.1.0+)

ArgParser includes several built-in system flags that provide debugging, configuration management, and introspection capabilities. These flags are processed before normal argument parsing and will cause the program to exit after execution.

### **Overview**

System flags use the `--s-*` pattern and provide powerful development and deployment tools:

- **`--s-debug`**: Runtime debugging with step-by-step parsing analysis
- **`--s-with-env <file>`**: Load configuration from files (`.env`, `.yaml`, `.json`, `.toml`)
- **`--s-save-to-env <file>`**: Export current configuration to various formats
- **`--s-debug-print`**: Export complete parser configuration for inspection
- **`--s-enable-fuzzy`**: Enable fuzzy testing mode (dry-run with no side effects)
- **`--s-save-DXT [dir]`**: Generate DXT packages for MCP servers (Desktop Extensions)

### `--s-save-to-env <file>`

Exports the current parser's configuration and parsed arguments to various file formats.

```bash
# Export to .env format (default for no extension)
your-cli --flag1 value1 --flag2 --s-save-to-env config.env

# Export to YAML format
your-cli --flag1 value1 --flag2 --s-save-to-env config.yaml

# Export to JSON format
your-cli --flag1 value1 --flag2 --s-save-to-env config.json

# Export to TOML format
your-cli --flag1 value1 --flag2 --s-save-to-env config.toml
```

**Features:**
- Works at any parser level (root command or sub-commands)
- Includes inherited flags from parent parsers in the chain
- Comments out optional flags that are not set
- Rich documentation for each flag (description, options, type, constraints)
- Automatic format detection based on file extension

### `--s-with-env <file>`

Loads configuration from a file and merges it with command line arguments. CLI arguments take precedence over file configuration.

```bash
# Load from .env format (default for no extension)
your-cli --s-with-env config.env

# Load from YAML format
your-cli --s-with-env config.yaml

# Load from JSON format
your-cli --s-with-env config.json

# Load from TOML format
your-cli --s-with-env config.toml

# Combine with CLI arguments (CLI args override file config)
your-cli --s-with-env config.yaml --verbose --output override.txt
```

**Supported Formats:**

The format is automatically detected based on the file extension:

- **`.env`** (or no extension): Dotenv format with `KEY=value` pairs
- **`.yaml` / `.yml`**: YAML format
- **`.json` / `.jsonc`**: JSON format (metadata is ignored if present)
- **`.toml` / `.tml`**: TOML format

**Behavior:**

- **File validation**: Checks if the file exists and can be parsed
- **Type conversion**: Automatically converts values to match flag types (boolean, number, string, array)
- **Enum validation**: Validates values against allowed enum options
- **CLI precedence**: Command line arguments override file configuration
- **Error handling**: Exits with error code 1 if file cannot be loaded or parsed
- **Flag matching**: Only loads values for flags that exist in the current parser chain

**Example Configuration Files:**

**.env format:**
```bash
VERBOSE=true
OUTPUT=file.txt
COUNT=5
TAGS=tag1,tag2,tag3
```

**YAML format:**
```yaml
verbose: true
output: file.txt
count: 5
tags:
  - tag1
  - tag2
  - tag3
```

**JSON format:**
```json
{
  "verbose": true,
  "output": "file.txt",
  "count": 5,
  "tags": ["tag1", "tag2", "tag3"]
}
```

### `--s-debug-print`

Prints the complete parser configuration to a JSON file and console for debugging complex parser setups.

```bash
your-cli --s-debug-print
```

**Output:**
- Creates `ArgParser.full.json` with the complete parser structure
- Shows all flags, sub-commands, handlers, and configuration
- Useful for debugging complex parser hierarchies
- Human-readable console output with syntax highlighting

### `--s-debug`

Provides detailed runtime debugging information showing how arguments are parsed step-by-step.

```bash
your-cli --flag1 value1 sub-command --flag2 value2 --s-debug
```

**Output:**
- Shows command chain identification process
- Step-by-step argument parsing simulation
- Final parser identification
- Accumulated arguments at each level
- Remaining arguments after parsing
- Complete static configuration of the final parser

**Useful for:**
- Understanding complex command chains
- Debugging argument parsing issues
- Seeing how flags are inherited between parsers
- Troubleshooting sub-command resolution

### Usage Notes

- System flags are processed before normal argument parsing
- They cause the program to exit after execution (exit code 0 for success)
- Can be used with any combination of regular flags and sub-commands
- Particularly useful during development and debugging

## Debugging

### Programmatic Debugging

The `printAll(filePath?: string)` method is useful for debugging complex parser configurations programmatically. It recursively outputs the structure, options, flags, and handlers of a parser instance and its sub-commands.

- `parser.printAll()`: Prints a colored, human-readable output to the console.
- `parser.printAll('./config.json')`: Writes the configuration as a pretty-printed JSON file.
- `parser.printAll('./config.log')`: Writes a plain text version to a file.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({ appName: "Debug App" })
  .addFlags([
    /* ... */
  ])
  .addSubCommand(/* ... */);

parser.printAll(); // Output to console
```

### Runtime Debugging

For runtime debugging, use the system flags documented above:

- `--s-debug-print`: Export complete parser configuration
- `--s-debug`: Show step-by-step argument parsing process
- `--s-save-to-env <file>`: Export current configuration to various formats
- `--s-with-env <file>`: Load configuration from file and merge with CLI arguments

### `--s-enable-fuzzy`

Enables fuzzy testing mode, which acts as a dry-run mode for safe testing without side effects. **No boilerplate code required** - the system automatically prevents CLI execution during fuzzy testing.

```bash
# Enable fuzzy mode for testing
your-cli --s-enable-fuzzy --input test.txt --format json
```

**Features:**
- **Automatic execution prevention**: No need for complex conditional logic in your CLI code
- **Zero boilerplate**: Simply export your CLI with `export default cli` and call `cli.parse()`
- Disables error handling to allow error collection
- Skips mandatory flag validation for comprehensive testing
- **Prevents handler function execution** (no side effects)
- **Logs what each handler would receive** for testing visibility
- Recursively applies to all subcommand parsers
- Safe for testing production CLIs with database operations, file modifications, or API calls

**Example Output:**
```
[--s-enable-fuzzy] handler() skipped for command chain: (root)
  Input args: [--s-enable-fuzzy --input test.txt --format json]
  Parsed args: {"input":"test.txt","format":"json"}
```

**Use Cases:**
- Fuzzy testing CLI argument parsing
- Validating CLI configuration without executing business logic
- Testing complex command hierarchies safely
- Automated testing of CLI interfaces

These system flags are particularly useful when you need to debug a CLI application without modifying the source code.

## Fuzzy Testing

ArgParser includes comprehensive fuzzy testing capabilities to automatically test CLI configurations and catch edge cases that manual testing might miss. The fuzzy testing utility systematically explores command paths and generates various flag combinations to ensure robustness.

### **Quick Start**

Test any ArgParser configuration using the built-in fuzzy testing CLI:

```bash
# Test an ArgParser file
bun src/fuzzy-test-cli.ts --file examples/getting-started.ts

# Test with custom options and save results
bun src/fuzzy-test-cli.ts \
  --file examples/getting-started.ts \
  --output test-results.json \
  --format json \
  --max-depth 3 \
  --random-tests 20 \
  --verbose
```

**Important Note**: Make sure that the `examples/getting-started.ts` file exports the parser instance using `export default` for the fuzzy testing CLI to work correctly.

### **System Flag Integration**

The `--s-enable-fuzzy` system flag makes any CLI fuzzy-test compatible **without any code modifications or boilerplate**:

```bash
# Enable fuzzy mode for safe testing (dry-run with no side effects)
your-cli --s-enable-fuzzy --input test.txt --format json

# The fuzzy testing CLI automatically uses this flag
bun src/fuzzy-test-cli.ts --file your-cli.ts
```

**Fuzzy mode features:**
- **Zero boilerplate**: No conditional logic needed - just `export default cli` and `cli.parse()`
- **Automatic prevention**: System automatically prevents CLI execution during fuzzy testing
- **Dry-run execution**: Prevents handler function execution (no side effects)
- **Error collection**: Disables error handling to collect all parsing errors
- **Argument logging**: Shows what each handler would receive for testing visibility
- **Safe testing**: Test production CLIs with database operations, file modifications, or API calls

### **Testing Capabilities**

The fuzzy tester automatically tests:

- **Valid combinations**: Proper flag usage with correct types and values
- **Invalid combinations**: Wrong inputs to verify error handling
- **Random combinations**: Pseudo-random flag combinations for edge cases
- **Command paths**: All subcommand combinations up to configurable depth
- **Performance**: Execution timing for different input complexities

### **Programmatic Usage**

```typescript
import { ArgParserFuzzyTester } from "@alcyone-labs/arg-parser/fuzzy-tester";
import { myArgParser } from "./my-cli";

const tester = new ArgParserFuzzyTester(myArgParser, {
  maxDepth: 5,
  randomTestCases: 10,
  includePerformance: true,
  testErrorCases: true,
  verbose: false,
});

const report = await tester.runFuzzyTest();
console.log(`Success rate: ${(report.successfulTests / report.totalTests * 100).toFixed(1)}%`);
```

### **Output Formats**

Generate reports in multiple formats:

```bash
# Human-readable console output
bun src/fuzzy-test-cli.ts --file my-cli.ts --format text

# Machine-readable JSON
bun src/fuzzy-test-cli.ts --file my-cli.ts --format json --output results.json

# Documentation-friendly Markdown
bun src/fuzzy-test-cli.ts --file my-cli.ts --format markdown --output report.md
```

For complete documentation, examples, and advanced usage patterns, see the [Fuzzy Testing Documentation](docs/fuzzy-testing.md).

### `--s-save-DXT [directory]`

Generates Desktop Extension (DXT) packages for all MCP servers defined in your ArgParser instance. DXT files are zip archives containing a manifest.json and server files, enabling single-click installation of MCP servers in compatible applications like Claude Desktop.

```bash
# Generate DXT packages in current directory
your-cli --s-save-DXT

# Generate DXT packages in specific directory
your-cli --s-save-DXT ./dxt-packages

# Example with multiple MCP servers
my-tool --s-save-DXT ./extensions
```

**Features:**
- **Automatic detection**: Finds all MCP servers added via `addMcpSubCommand()`
- **Multiple servers**: Generates separate DXT files for each MCP server
- **Complete tool listing**: Includes all MCP tools in the manifest
- **Proper metadata**: Uses actual server names, versions, and descriptions
- **Ready to install**: Generated DXT files work with DXT-compatible applications

**Generated Structure:**
```
your-server.dxt (ZIP file)
├── manifest.json         # Server metadata and tool definitions
└── server/
    └── index.js          # Server entry point
```

**Example Output:**
```
🔧 Generating DXT packages for 2 MCP server(s)...
  ✓ Generated: primary-server.dxt
    Server: primary-server v1.0.0
    Tools: 3 tool(s)
  ✓ Generated: analytics-server.dxt
    Server: analytics-server v2.1.0
    Tools: 5 tool(s)

✅ DXT package generation completed!
Output directory: /path/to/dxt-packages
```

**Use Cases:**
- **Distribution**: Package MCP servers for easy sharing and installation
- **Development**: Create test packages during MCP server development
- **Deployment**: Generate production-ready DXT files for distribution
- **Integration**: Prepare MCP servers for Claude Desktop or other DXT-compatible applications

## Changelog

### v1.2.0 (2025-01-02)

**🔧 Critical MCP Fixes & Improvements**

- **Fixed MCP Output Schema Support**: Resolved the critical issue where MCP tools with output schemas failed with `"Tool has an output schema but no structured content was provided"` error
- **Enhanced Handler Context**: Added `isMcp` flag to handler context for proper MCP mode detection
- **Improved Response Format**: MCP tools now correctly return both `content` and `structuredContent` fields as required by JSON-RPC 2.0
- **Better Integration**: Handlers can reliably detect when they're being called from MCP mode vs CLI mode

**What was broken before v1.2.0:**
- MCP servers would fail when tools had output schemas defined
- Handlers couldn't reliably detect MCP execution context
- Response format didn't comply with MCP specification for structured content

**What works now:**
- ✅ MCP tools with output schemas work correctly
- ✅ Proper JSON-RPC 2.0 response format with both `content` and `structuredContent`
- ✅ Handler context includes `isMcp` flag for mode detection
- ✅ Full compatibility with MCP clients and the Model Context Protocol specification

### v1.1.0 (2024-12-XX)

**Major Features**
- MCP (Model Context Protocol) Integration with multiple transport support
- System Flags: `--s-debug-print`, `--s-with-env`, `--s-save-to-env`, `--s-enable-fuzzy`, `--s-save-DXT`
- Environment Loading from `.env`, `.yaml`, `.json`, and `.toml` files
- Enhanced Debugging and configuration export tools

## API Reference

This section provides a quick overview of the main components. See the sections above for detailed explanations and examples.

### **Core Classes**

#### `ArgParserBase`

Base class providing core CLI parsing functionality without MCP features. Use this for lightweight CLIs that don't need MCP server capabilities.

**Constructor:**
- `new ArgParserBase(options?, initialFlags?)`: Create basic parser instance

#### `ArgParser` (v1.1.0+)

Main class with built-in MCP server capabilities. Extends `ArgParserBase` with MCP integration.

**Constructors:**
- `new ArgParser(options?, initialFlags?)`: Create parser with MCP capabilities
- `ArgParser.withMcp(options?, initialFlags?)`: Factory method for MCP-enabled parser (same as constructor)
- `ArgParser.fromArgParser(parser)`: Convert existing ArgParserBase to MCP-enabled

**MCP Methods:**
- `toMcpTools(options?)`: Generate MCP tool structures from CLI definition
- `createMcpServer(serverInfo, toolOptions?)`: Create MCP server instance
- `startMcpServer(serverInfo, toolOptions?)`: Start MCP server with stdio transport
- `startMcpServerWithTransport(serverInfo, transportType, transportOptions?, toolOptions?)`: Start with specific transport
- `startMcpServerWithMultipleTransports(serverInfo, transports, toolOptions?)`: Start with multiple transports (manual approach)
- `addMcpSubCommand(name, serverInfo, options?)`: Add MCP server sub-command with optional preset transports (recommended approach)
- `parse(args, options?)`: Async version supporting async handlers

**MCP Types:**
- `McpTransportConfig`: Configuration for a single transport (`{ type, port?, host?, path?, sessionIdGenerator? }`)
- `McpSubCommandOptions`: Options for MCP sub-command (`{ defaultTransport?, defaultTransports?, toolOptions? }`)

**Transport Types:**
- `"stdio"`: Standard input/output
- `"sse"`: Server-Sent Events over HTTP
- `"streamable-http"`: HTTP with streaming support

**Example:**
```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  handler: async (ctx) => ({ result: ctx.args }),
})
.addFlags([/* flags */])
.addMcpSubCommand("serve", {
  name: "my-mcp-server",
  version: "1.0.0",
});

// Elegant approach: Configure default transports in addMcpSubCommand
const cli = ArgParser.withMcp({
  appName: "My Tool",
  handler: async (ctx) => ({ result: ctx.args }),
})
.addFlags([/* your flags */])
.addMcpSubCommand("serve", {
  name: "my-server",
  version: "1.0.0",
}, {
  // Default multiple transports - used when no CLI flags provided
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001 },
    { type: "streamable-http", port: 3002 }
  ]
});

// Usage: my-tool serve (uses all default transports)
// Usage: my-tool serve --transports '[{"type":"sse","port":4000}]' (overrides defaults)
```

### Constructors

#### `new ArgParserBase(options?, initialFlags?)`

Constructor for creating a basic parser instance without MCP capabilities.

#### `new ArgParser(options?, initialFlags?)`

Constructor for creating a parser instance with MCP capabilities.

- `options`: An object (`IArgParserParams`) configuring the parser.
  - `appName?: string`: Display name.
  - `appCommandName?: string`: Command name for help/errors.
  - `description?: string`: Parser description.
  - `handler?: (ctx: HandlerContext) => void`: Handler function for this parser.
  - `subCommands?: ISubCommand[]`: Array of sub-command definitions.
  - `handleErrors?: boolean`: Enable/disable default error handling (default: `true`).
  - `throwForDuplicateFlags?: boolean`: Throw error for duplicate flags (default: `false`).
  - `inheritParentFlags?: boolean`: Enable flag inheritance when this parser is a sub-command (default: `false`).
- `initialFlags`: Optional array of `IFlag` objects to add during initialization.

### `parse(args, options?)`

Parses an array of command-line arguments.

- `args`: `string[]` - Array of arguments (usually `process.argv.slice(2)`).
- `options`: Optional object (`IParseOptions`).
  - `skipHelpHandling?: boolean`: Prevents automatic help display/exit on `--help` (default: `false`).
  - `skipHandlers?: boolean`: Prevents execution of any matched command handlers (default: `false`).
- Returns: `TParsedArgs & { $commandChain?: string[] }` - An object containing the parsed arguments and optionally the `$commandChain`. Throws `ArgParserError` if `handleErrors` is `false`.

### `.addFlag(flag)`

Adds a single flag definition.

- `flag`: `IFlag` - The flag object.
- Returns: `this` for chaining.

### `.addFlags(flags)`

Adds multiple flag definitions.

- `flags`: `IFlag[]` - Array of flag objects.
- Returns: `this` for chaining.

### `.addSubCommand(subCommand)`

Adds a sub-command definition.

- `subCommand`: `ISubCommand` - The sub-command object.
- Returns: `this` for chaining.

### `.setHandler(handler)`

Sets or overrides the handler function for this parser instance.

- `handler`: `(ctx: HandlerContext) => void` - The handler function.
- Returns: `this` for chaining.

### `.getSubCommand(name)`

Retrieves a defined sub-command by name.

- `name`: `string` - The name of the sub-command.
- Returns: `ISubCommand | undefined` - The sub-command definition or `undefined` if not found.

### `.hasFlag(name)`

Checks if a flag with the given name exists on this parser instance.

- `name`: `string` - The name of the flag.
- Returns: `boolean`.

### `helpText()`

Generates the formatted help text for this parser instance.

- Returns: `string` - The generated help text.

### `printAll(filePath?)`

Recursively prints the parser configuration.

- `filePath`: `string?` - Optional path to write output to file. `.json` extension saves as JSON.

### Interfaces

- `IFlag`: Defines the structure of a command-line flag.
- `ISubCommand`: Defines the structure of a sub-command.
- `HandlerContext`: The object passed to handler functions.
- `IParseOptions`: Options for the `parse()` method.
- `IArgParserParams`: Options for the `ArgParser` constructor.
- `ArgParserError`: Custom error class thrown on parsing failures when `handleErrors` is `false`.

## Quick Reference

### **Basic CLI Setup**
```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "My Tool",
  appCommandName: "my-tool",
  handler: async (ctx) => ({ result: ctx.args }),
})
.addFlags([
  { name: "input", options: ["--input", "-i"], type: "string", mandatory: true },
  { name: "verbose", options: ["--verbose", "-v"], type: "boolean", flagOnly: true },
])
.addSubCommand({
  name: "process",
  description: "Process data",
  handler: async (ctx) => ({ processed: true }),
  parser: new ArgParser({}, [
    { name: "format", options: ["--format"], type: "string", enum: ["json", "xml"] },
  ]),
});
```

### **MCP Integration**
```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const mcpCli = ArgParser.withMcp({ /* same options */ })
  .addFlags([/* same flags */])
  .addMcpSubCommand("serve", {
    name: "my-mcp-server",
    version: "1.0.0",
  });

// CLI: my-tool --input data.txt process --format json
// MCP: my-tool serve --transport sse --port 3001
```

### **MCP Preset Transport Configuration**
Configure default transports that will be used when no CLI transport flags are provided:

```typescript
import { ArgParser, McpTransportConfig } from "@alcyone-labs/arg-parser";

// Single preset transport
const cliWithPreset = ArgParser.withMcp({
  appName: "My Tool",
  handler: async (ctx) => ({ result: ctx.args }),
})
.addMcpSubCommand("serve", {
  name: "my-server",
  version: "1.0.0",
}, {
  defaultTransport: {
    type: "sse",
    port: 3001,
    host: "0.0.0.0"
  }
});

// Multiple preset transports
const cliWithMultiplePresets = ArgParser.withMcp({
  appName: "Multi-Transport Tool",
  handler: async (ctx) => ({ result: ctx.args }),
})
.addMcpSubCommand("serve", {
  name: "multi-server",
  version: "1.0.0",
}, {
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001 },
    { type: "streamable-http", port: 3002, path: "/api/mcp" }
  ],
  toolOptions: {
    includeSubCommands: true
  }
});

// CLI flags always take precedence over presets
// my-tool serve                    -> Uses preset transports
// my-tool serve --transport sse    -> Overrides preset with CLI flags
```

### **System Flags**
```bash
# Debug parsing
my-tool --s-debug --input data.txt process

# Load configuration
my-tool --s-with-env config.yaml --input override.txt

# Save configuration
my-tool --input data.txt --s-save-to-env template.yaml
```

### **Multiple MCP Transports**
```bash
# Single transport
my-tool serve --transport sse --port 3001

# Multiple transports
my-tool serve --transports '[
  {"type":"stdio"},
  {"type":"sse","port":3001},
  {"type":"streamable-http","port":3002}
]'
```

---

**📖 For complete examples and tutorials, see the [`examples/`](./examples/) directory.**

--- 

## Backlog

- [x] Publish as an open-source library
- [x] Make ArgParser compatible with MCP out-of-the-box
- [x] Rename --LIB-* flags to --s-*
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