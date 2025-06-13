# ArgParser - Type-Safe Command Line Argument Parser

ArgParser is a powerful and flexible library for building command-line interfaces (CLIs) in TypeScript and JavaScript. It helps you define, parse, validate, and handle command-line arguments and sub-commands in a structured, type-safe way.

Whether you're building a simple script or a complex nested CLI application, ArgParser provides the tools to create robust and user-friendly interfaces.

## TODOs

### Changelog

- 1.0.1: Reorganize the examples, replace toSorted that's only NodeJS 20+

### Features

- [x] Publish as an open-source library
- [ ] Improve flag options collision prevention
- [ ] Make it possible to pass a `--load-from` parameter that loads all the parameters from a JSON file instead of command line
- [ ] Add support for locales / translations
- [ ] (potentially) support for async type function to enable more flexibility (but at the cost of a potentially much larger issue surface, would need to see if there's a need for it)
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
- [ ] When a flag with `allowMultiple: false` and `flagOnly: true` is passed multiple times (regardless of the options, for example "-1" and later "--one", both being valid), raise the correct error

## Features

- **Type Safety:** Define expected argument types (string, number, boolean, array, custom functions) and get type-safe parsed results.
- **Optionally Complex Dynamic Types** Provide a method to trigger arbitrary logic when a flag is encountered and return the output to the parsed flag.
- **Declarative API:** Configure your CLI structure, flags, and sub-commands using a clear, declarative syntax.
- **Automatic Help Generation:** Generate comprehensive and contextual help text based on your parser configuration.
- **Hierarchical Commands:** Easily define nested sub-commands to create complex command structures (e.g., `git commit`, `docker container ls`).
- **Handler Execution:** Associate handler functions with commands and have them executed automatically upon successful parsing (or manually control execution).
- **Validation:** Define custom validation rules for flag values.
- **Conditional Requirements:** Make flags mandatory based on the presence or values of other arguments.
- **Default Values:** Specify default values for flags if they are not provided on the command line.
- **Flag Inheritance:** Share common flags between parent and child commands with an intuitive inheritance mechanism.
- **Error Handling:** Built-in, user-friendly error reporting for common parsing issues, with an option to handle errors manually.
- **Debugging Tools:** Easily inspect your parser's configuration for complex setups.

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

## Basic Usage

Here's a simple example demonstrating how to define flags and parse arguments:

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Data Processor",
  appCommandName: "data-proc", // Used in help text and error messages
  description: "A tool for processing data phases",
  // By default, if a handler is set, it will be executed after successful parsing.
  // Set handler: () => { ... } here for a root command handler.
}).addFlags([
  {
    name: "phase",
    options: ["--phase"],
    type: String, // Use native types or typeof string equivalents ("string", "number", "boolean", etc.)
    mandatory: true,
    enum: ["chunking", "pairing", "analysis"],
    description: "Processing phase to execute",
  },
  {
    name: "batch",
    options: ["-b", "--batch-number"],
    type: "number",
    mandatory: (args) => args.phase !== "analysis", // Mandatory based on another flag's value
    defaultValue: 0,
    description: "Batch number (required except for analysis phase)",
  },
  {
    name: "verbose",
    options: ["-v"],
    flagOnly: true, // This flag does not expect a value
    description: "Enable verbose logging",
  },
]);

// Parse command line arguments (excluding 'node' and script path)
// If parsing fails (e.g., missing mandatory flag), ArgParser handles the error
// by printing a message and exiting (process.exit(1)) by default.
const args = parser.parse(process.argv.slice(2));

// If parsing succeeds and no command handler was executed,
// execution continues here with the parsed args.
console.log("Parsing successful! Arguments:", args);

// Example of using parsed arguments:
if (args.phase === "chunking") {
  if (args.verbose) {
    console.debug("Starting the chunking phase...");
  }
  // Perform chunking logic...
}
```

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

## Debugging

The `printAll(filePath?: string)` method is useful for debugging complex parser configurations. It recursively outputs the structure, options, flags, and handlers of a parser instance and its sub-commands.

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

## API Reference

This section provides a quick overview of the main components. See the sections above for detailed explanations and examples.

### `new ArgParser(options?, initialFlags?)`

Constructor for creating a parser instance.

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
