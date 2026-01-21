# Core API Reference

Complete reference for ArgParser core classes, types, and methods.

## Main Classes

### ArgParserBase

Base class for CLI argument parsing with full flag management, subcommands, and configuration.

```typescript
import { ArgParserBase } from "@alcyone-labs/arg-parser";

const parser = new ArgParserBase({
  appName: "My CLI",
  appCommandName: "mycli",
  description: "A sample CLI application",
  autoExit: true,
  handleErrors: true,
  inheritParentFlags: false,
  triggerAutoHelpIfNoHandler: false,
});
```

### ArgParser

Extends `ArgParserBase` with full MCP integration. Use this for unified CLI/MCP tools.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "My MCP CLI",
  // ... other options
});
```

### ArgParserMcp

MCP-optimized version that excludes all config plugins (for autonomous/DXT builds).

```typescript
import { ArgParserMcp } from "@alcyone-labs/arg-parser";

const parser = new ArgParserMcp({
  appName: "MCP-only CLI",
  // Config plugins NOT included by default
});
```

### FlagManager

Manages flag definitions and provides query methods.

```typescript
import { FlagManager } from "@alcyone-labs/arg-parser";

const manager = new FlagManager({ throwForDuplicateFlags: false });
manager.addFlag({ name: "verbose", options: ["--verbose"], type: Boolean });
const hasFlag = manager.hasFlag("verbose");
const flag = manager.getFlag("verbose");
```

## Constructor Options

### IArgParserParams

```typescript
interface IArgParserParams<THandlerReturn = any> {
  appName?: string;
  subCommands?: ISubCommand[];
  handler?: (ctx: IHandlerContext) => THandlerReturn | Promise<THandlerReturn>;
  extraNewLine?: boolean;
  wrapAtWidth?: number;
  blankSpaceWidth?: number;
  mandatoryCharacter?: string;
  throwForDuplicateFlags?: boolean;
  description?: string;
  handleErrors?: boolean;
  autoExit?: boolean;
  appCommandName?: string;
  inheritParentFlags?: TFlagInheritance;
  triggerAutoHelpIfNoHandler?: boolean;
  logger?: Logger;
}
```

## Flag Definition

### IFlag Interface

```typescript
interface IFlag {
  name: string; // Required, unique
  description?: string | string[];
  options: string[]; // Required, e.g., ["-f", "--flag"]
  type?: TParsedArgsTypeFromFlagDef;
  defaultValue?: any;
  mandatory?: boolean | ((parsedArgs: TParsedArgs) => boolean);
  allowLigature?: boolean;
  allowMultiple?: boolean;
  flagOnly?: boolean;
  validate?: (value: any, parsedArgs?: any) => boolean | string | void;
  enum?: any[];
  env?: string | string[];
  dxtOptions?: IDxtOptions;
  dynamicRegister?: DynamicRegisterFn;
  setWorkingDirectory?: boolean;
  positional?: number;
}
```

### Type Values

```typescript
// Zod schema
import { z } from "zod";

// Built-in constructors
type: String;
type: Number;
type: Boolean;
type: Array;
type: Object;

// String literals
type: "string" | "number" | "boolean" | "array" | "object";

// Custom parser
type: (value: string) => any;
type: (value: string) => Promise<any>;

type: z.object({ name: z.string() });
```

## Core Methods

### Flag Methods

```typescript
// Add single or multiple flags
parser.addFlag(flag: IFlag): this
parser.addFlags(flags: readonly IFlag[]): this

// Query flags
parser.hasFlag(name: string): boolean
parser.getFlag(name: string): ProcessedFlag | undefined
parser.flags: ProcessedFlag[]
parser.flagNames: string[]
```

### Subcommand Methods

```typescript
parser.addSubCommand(config: ISubCommand): this
parser.getSubCommand(name: string): ISubCommand | undefined
parser.getSubCommands(): Map<string, ISubCommand>
```

### Handler Methods

```typescript
parser.setHandler(
  handler: (ctx: IHandlerContext) => THandlerReturn | Promise<THandlerReturn>
): this
parser.getHandler(): ((ctx: IHandlerContext) => void) | undefined
```

### Parsing Methods

```typescript
// Main parsing entry point
await parser.parse(
  processArgs?: string[],
  options?: IParseOptions
): Promise<ParseResult | void>

// Parse options
interface IParseOptions {
  skipHelpHandling?: boolean;
  skipHandlers?: boolean;
  deep?: boolean;           // Auto-await handlers, default: true
  isMcp?: boolean;
  autoExecute?: boolean;
  importMetaUrl?: string;
}
```

### Help Methods

```typescript
parser.helpText(): string
parser.printAll(filePath?: string): void
parser.getCommandChain(): string[]
```

### Metadata Getters

```typescript
parser.getAppName(): string | undefined
parser.getAppCommandName(): string | undefined
parser.getDescription(): string | undefined
parser.getAutoExit(): boolean
parser.getSubCommandName(): string
```

## Handler Context

### IHandlerContext

```typescript
interface IHandlerContext<TCurrentCommandArgs = any, TParentCommandArgs = any> {
  args: TCurrentCommandArgs; // Parsed args for current command
  parentArgs?: TParentCommandArgs; // Parent command args if subcommand
  commandChain: string[]; // Command name sequence
  parser: ArgParserInstance; // Current parser instance
  parentParser?: ArgParserInstance; // Parent parser if subcommand
  isMcp?: boolean; // MCP mode flag
  getFlag?: (name: string) => any; // Flag getter in MCP mode
  displayHelp: () => void; // Show help
  rootPath?: string; // Original cwd from user
  logger: Logger; // Data-safe logger
}
```

## ParseResult Interface

```typescript
interface ParseResult<T = any> {
  success: boolean;
  exitCode: number;
  data?: T;
  message?: string;
  shouldExit?: boolean;
  type?: "success" | "error" | "help" | "version" | "debug";
}
```

## Flag Inheritance

```typescript
const FlagInheritance = {
  NONE: "none", // No inheritance
  DirectParentOnly: "direct-parent-only", // Direct parent only
  AllParents: "all-parents", // Full parent chain
} as const;

type TFlagInheritance = keyof typeof FlagInheritance | boolean;
```

## Error Handling

```typescript
class ArgParserError extends Error {
  commandChain: string[];
  constructor(message: string, cmdChain: string[] = []);
}

// Error modes
new ArgParser({ handleErrors: true, autoExit: true }); // Default: print + exit
new ArgParser({ handleErrors: true, autoExit: false }); // Return ParseResult
new ArgParser({ handleErrors: false }); // Throw errors
```

## Usage Examples

### Basic Flag Parsing

```typescript
const parser = new ArgParser({
  appName: "My CLI",
  appCommandName: "mycli",
}).addFlags([
  { name: "name", options: ["--name", "-n"], type: "string", mandatory: true },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
    flagOnly: true,
  },
]);

parser.setHandler((ctx) => {
  console.log(`Hello ${ctx.args.name}! Verbose: ${ctx.args.verbose}`);
});

await parser.parse();
```

### Subcommands with Inheritance

```typescript
const root = new ArgParser({
  appName: "My CLI",
  inheritParentFlags: FlagInheritance.AllParents,
}).addFlags([{ name: "debug", options: ["--debug"], type: Boolean }]);

const subParser = new ArgParser({
  appName: "Subcommand",
}).addFlags([{ name: "input", options: ["--input"], type: "string" }]);

root.addSubCommand({
  name: "deploy",
  parser: subParser,
  handler: (ctx) => {
    // ctx.args.debug exists from parent
    // ctx.args.input is subcommand-specific
  },
});

await root.parse();
```

### Dynamic Flag Registration

```typescript
const parser = new ArgParser({
  appName: "Dynamic CLI",
}).addFlags([
  {
    name: "mode",
    options: ["--mode"],
    type: "string",
    dynamicRegister: async (ctx) => {
      if (ctx.value === "advanced") {
        return [
          { name: "advanced-option", options: ["--adv"], type: "string" },
        ];
      }
      return [];
    },
  },
]);

await parser.parse();
```

### Working Directory Management

```typescript
const parser = new ArgParser({
  appName: "Config Loader",
}).addFlags([
  {
    name: "workspace",
    options: ["--workspace", "-w"],
    type: "string",
    setWorkingDirectory: true,
  },
  {
    name: "config",
    options: ["--config"],
    type: "string",
    env: "APP_CONFIG",
  },
]);

// User runs: mycli --workspace ./packages/app --config settings.json
// cwd changes to ./packages/app for .env loading and file ops
// ctx.rootPath preserves original user cwd
```

### Custom Type Parsers

```typescript
const parser = new ArgParser({
  appName: "Custom Types",
}).addFlags([
  {
    name: "port",
    options: ["--port"],
    type: (value: string) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error("Invalid port number");
      }
      return port;
    },
  },
  {
    name: "json",
    options: ["--json"],
    type: z.object({
      name: z.string(),
      value: z.number(),
    }),
  },
]);
```
