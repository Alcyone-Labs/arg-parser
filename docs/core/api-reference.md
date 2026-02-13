# Core Package API Reference

## Overview

Complete API reference for `@alcyone-labs/arg-parser` core package. This document provides detailed information about all public classes, interfaces, and types.

**Prerequisites:**
- Understanding of TypeScript/JavaScript
- Familiarity with CLI application concepts

**Learning Outcomes:**
- Understand all available APIs and their signatures
- Know when to use each API method
- Understand type definitions and constraints

---

## Quickstart

```typescript
import { ArgParser, ArgParserError, type IFlag } from '@alcyone-labs/arg-parser';

// Create parser
const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => ctx.args
});

// Add flags
parser.addFlag({
  name: 'verbose',
  options: ['-v', '--verbose'],
  type: 'boolean',
  flagOnly: true
});

// Parse
const result = await parser.parse(['--verbose']);
```

---

## Deep Dive

### Classes

#### `ArgParser`

Main class for building CLI applications.

**Constructor:**

```typescript
new ArgParser<THandlerReturn>(params?: IArgParserParams<THandlerReturn>, initialFlags?: readonly IFlag[])
```

**Parameters:**
- `params` - Configuration options
- `initialFlags` - Optional initial flags array

**Methods:**

##### `use(plugin: IArgParserPlugin): this`

Install a plugin to extend parser functionality.

**Example:**
```typescript
const parser = new ArgParser({...})
  .use(mcpPlugin({ serverInfo: {...} }));
```

##### `addFlag(flag: IFlag): this`

Add a single flag definition.

**Example:**
```typescript
parser.addFlag({
  name: 'config',
  options: ['-c', '--config'],
  type: 'string',
  mandatory: true
});
```

##### `addFlags(flags: readonly IFlag[]): this`

Add multiple flags at once.

**Example:**
```typescript
parser.addFlags([
  { name: 'verbose', options: ['-v'], type: 'boolean' },
  { name: 'output', options: ['-o'], type: 'string' }
]);
```

##### `addSubCommand(subCommand: ISubCommand): this`

Add a subcommand to create hierarchical CLIs.

**Example:**
```typescript
const subParser = new ArgParser({...});
parser.addSubCommand({
  name: 'deploy',
  description: 'Deploy application',
  parser: subParser
});
```

##### `setHandler(handler: Function): this`

Set the handler function for this parser.

**Example:**
```typescript
parser.setHandler(async (ctx) => {
  console.log('Args:', ctx.args);
  return { success: true };
});
```

##### `parse(processArgs?: string[], options?: IParseOptions): Promise<THandlerReturn>`

Parse command line arguments and execute the handler.

**Parameters:**
- `processArgs` - Arguments to parse (defaults to process.argv.slice(2))
- `options` - Parse options

**Returns:** Promise resolving to handler return value

**Example:**
```typescript
const result = await parser.parse(['--verbose', 'input.txt']);
```

##### `helpText(): string`

Generate help text for the parser.

**Returns:** Formatted help string

**Example:**
```typescript
console.log(parser.helpText());
```

##### `hasFlag(name: string): boolean`

Check if a flag is defined.

##### `getFlagDefinition(name: string): ProcessedFlag | undefined`

Get flag definition by name.

##### `getAppName(): string`

Get the application name.

##### `getAppCommandName(): string | undefined`

Get the command name for help text.

##### `getDescription(): string | undefined`

Get the application description.

##### `getSubCommandName(): string`

Get the subcommand name (if this parser is a subcommand).

##### `getSubCommand(name: string): ISubCommand | undefined`

Get a subcommand by name.

##### `getSubCommands(): Map<string, ISubCommand>`

Get all subcommands.

##### `getHandler(): Function | undefined`

Get the handler function.

##### `getAutoExit(): boolean`

Get auto-exit setting.

##### `getPromptWhen(): PromptWhen`

Get prompt trigger setting.

##### `hasPlugin(name: string): boolean`

Check if a plugin is installed.

##### `getPlugin(name: string): IArgParserPlugin | undefined`

Get an installed plugin.

##### `listPlugins(): string[]`

List all installed plugin names.

---

#### `ArgParserError`

Error class for parser-related errors.

**Constructor:**

```typescript
new ArgParserError(message: string, cmdChain?: string[])
```

**Properties:**
- `message` - Error message
- `commandChain` - Command chain when error occurred
- `cmdChain` - Alias for commandChain

**Example:**
```typescript
try {
  await parser.parse(['invalid']);
} catch (error) {
  if (error instanceof ArgParserError) {
    console.error('Command chain:', error.commandChain);
  }
}
```

---

### Interfaces

#### `IArgParserParams<THandlerReturn>`

Configuration parameters for ArgParser constructor.

```typescript
interface IArgParserParams<THandlerReturn = any> {
  appName?: string;
  appCommandName?: string;
  description?: string;
  handler?: (ctx: IHandlerContext<any, any>) => THandlerReturn | Promise<THandlerReturn>;
  subCommands?: ISubCommand[];
  extraNewLine?: boolean;
  wrapAtWidth?: number;
  blankSpaceWidth?: number;
  mandatoryCharacter?: string;
  throwForDuplicateFlags?: boolean;
  handleErrors?: boolean;
  autoExit?: boolean;
  triggerAutoHelpIfNoHandler?: boolean;
  inheritParentFlags?: TFlagInheritance;
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `appName` | `string` | Display name of the application |
| `appCommandName` | `string` | Command name for help text |
| `description` | `string` | Application description |
| `handler` | `Function` | Handler function for the parser |
| `subCommands` | `ISubCommand[]` | Initial subcommands |
| `extraNewLine` | `boolean` | Add extra newlines in help text |
| `wrapAtWidth` | `number` | Width for wrapping help text |
| `blankSpaceWidth` | `number` | Space width for help formatting |
| `mandatoryCharacter` | `string` | Character for mandatory flags |
| `throwForDuplicateFlags` | `boolean` | Throw on duplicate flag names |
| `handleErrors` | `boolean` | Auto-handle errors |
| `autoExit` | `boolean` | Auto-exit process on completion |
| `triggerAutoHelpIfNoHandler` | `boolean` | Show help if no handler |
| `inheritParentFlags` | `TFlagInheritance` | Flag inheritance behavior |
| `promptWhen` | `PromptWhen` | When to trigger prompts |
| `onCancel` | `Function` | Cancel callback for prompts |

---

#### `IFlag`

Flag definition interface.

```typescript
interface IFlag {
  name: string;
  options: string[];
  type: TParsedArgsTypeFromFlagDef;
  description?: string | string[];
  valueHint?: string;
  defaultValue?: any;
  mandatory?: boolean | ((parsedArgs: any) => boolean);
  flagOnly?: boolean;
  validate?: (value: any, parsedArgs?: any) => boolean | string | void | Promise<boolean | string | void>;
  enum?: any[];
  env?: string | string[];
  allowMultiple?: boolean;
  dynamicRegister?: DynamicRegisterFn;
  setWorkingDirectory?: boolean;
  positional?: number;
  prompt?: (ctx: IHandlerContext) => PromptFieldConfig | Promise<PromptFieldConfig>;
  promptSequence?: number;
  dxtOptions?: IDxtOptions;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Internal flag name (required) |
| `options` | `string[]` | CLI options (e.g., ['-v', '--verbose']) |
| `type` | `TParsedArgsTypeFromFlagDef` | Flag type |
| `description` | `string \| string[]` | Help text description |
| `valueHint` | `string` | Hint for value in help |
| `defaultValue` | `any` | Default value |
| `mandatory` | `boolean \| Function` | Whether flag is required |
| `flagOnly` | `boolean` | Flag doesn't consume value |
| `validate` | `Function` | Custom validation function |
| `enum` | `any[]` | Allowed values |
| `env` | `string \| string[]` | Environment variable mapping |
| `allowMultiple` | `boolean` | Allow multiple values |
| `dynamicRegister` | `Function` | Dynamic flag registration |
| `setWorkingDirectory` | `boolean` | Use flag value as cwd |
| `positional` | `number` | Positional argument index |
| `prompt` | `Function` | Prompt configuration |
| `promptSequence` | `number` | Prompt order |
| `dxtOptions` | `IDxtOptions` | DXT-specific options |

---

#### `IHandlerContext<TCurrent, TParent>`

Context object passed to handler functions.

```typescript
interface IHandlerContext<TCurrentCommandArgs = any, TParentCommandArgs = any> {
  args: TCurrentCommandArgs;
  parentArgs?: TParentCommandArgs;
  commandChain: string[];
  parser: ArgParser;
  parentParser?: ArgParser;
  isMcp?: boolean;
  isInteractive?: boolean;
  getFlag?: (name: string) => any;
  displayHelp: () => void;
  rootPath?: string;
  systemArgs?: ISystemArgs;
  promptAnswers?: Record<string, any>;
  logger: any;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `args` | `TCurrentCommandArgs` | Parsed arguments for current command |
| `parentArgs` | `TParentCommandArgs` | Parent command arguments |
| `commandChain` | `string[]` | Chain of command names |
| `parser` | `ArgParser` | Current parser instance |
| `parentParser` | `ArgParser` | Parent parser instance |
| `isMcp` | `boolean` | Whether running in MCP mode |
| `isInteractive` | `boolean` | Whether prompts were shown |
| `getFlag` | `Function` | Get flag value with priority |
| `displayHelp` | `Function` | Display help text |
| `rootPath` | `string` | Original working directory |
| `systemArgs` | `ISystemArgs` | System flags detected |
| `promptAnswers` | `Record` | Answers from interactive prompts |
| `logger` | `any` | Logger instance |

---

#### `ISubCommand`

Subcommand definition interface.

```typescript
interface ISubCommand {
  name: string;
  description?: string;
  parser: ArgParser;
  handler?: (ctx: IHandlerContext) => any;
  isMcp?: boolean;
  mcpServerInfo?: {
    name: string;
    version: string;
    description?: string;
  };
  mcpToolOptions?: any;
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

---

#### `IArgParserPlugin`

Plugin interface for extending ArgParser.

```typescript
interface IArgParserPlugin {
  readonly name: string;
  readonly version?: string;
  install<T>(parser: ArgParser<T>): ArgParser<T> | void;
  destroy?(): void;
}
```

**Example:**
```typescript
const myPlugin: IArgParserPlugin = {
  name: 'com.example.my-plugin',
  version: '1.0.0',
  install(parser) {
    // Extend parser
    (parser as any).myMethod = () => 'works';
    return parser;
  }
};
```

---

### Types

#### `TParsedArgsTypeFromFlagDef`

Valid flag type definitions.

```typescript
type TParsedArgsTypeFromFlagDef =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor
  | ((value: string) => any)
  | ((value: string) => Promise<any>)
  | ZodTypeAny
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object';
```

---

#### `TFlagInheritance`

Flag inheritance behavior.

```typescript
type TFlagInheritance = 
  | 'none'
  | 'direct-parent-only'
  | 'all-parents'
  | boolean;
```

**Values:**
- `'none'` or `false` - No inheritance (default)
- `'direct-parent-only'` or `true` - Inherit from direct parent only
- `'all-parents'` - Inherit from all ancestors

---

#### `PromptWhen`

When to trigger interactive prompts.

```typescript
type PromptWhen = 'interactive-flag' | 'missing' | 'always';
```

**Values:**
- `'interactive-flag'` - Only with `--interactive` flag
- `'missing'` - When promptable flags are missing
- `'always'` - Always show prompts

---

### Type Aliases

#### `ProcessedFlag`

Processed flag with resolved types.

```typescript
type ProcessedFlag = Omit<ProcessedFlagCore, 'validate' | 'enum' | 'mandatory'> & {
  validate?: (value: any, parsedArgs?: TParsedArgs<ProcessedFlag[]>) => boolean | string | void | Promise<boolean | string | void>;
  enum?: any[];
  mandatory?: boolean | ((parsedArgs: TParsedArgs<ProcessedFlag[]>) => boolean);
  env?: string | string[];
  dynamicRegister?: DynamicRegisterFn;
  positional?: number;
};
```

---

## Examples

### Example 1: Complete API Usage

```typescript
import { 
  ArgParser, 
  ArgParserError,
  type IFlag,
  type IHandlerContext,
  type IArgParserParams 
} from '@alcyone-labs/arg-parser';

// Define flags
const flags: IFlag[] = [
  {
    name: 'input',
    options: ['-i', '--input'],
    type: 'string',
    mandatory: true,
    description: 'Input file'
  },
  {
    name: 'output',
    options: ['-o', '--output'],
    type: 'string',
    defaultValue: 'output.txt',
    description: 'Output file'
  },
  {
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Verbose output'
  }
];

// Create parser with params
const params: IArgParserParams = {
  appName: 'file-converter',
  appCommandName: 'convert',
  description: 'Convert files between formats',
  autoExit: false,
  handleErrors: true
};

const parser = new ArgParser(params, flags);

// Set handler
parser.setHandler(async (ctx: IHandlerContext) => {
  console.log('Input:', ctx.args.input);
  console.log('Output:', ctx.args.output);
  console.log('Verbose:', ctx.args.verbose);
  return { converted: true };
});

// Use the parser
try {
  const result = await parser.parse();
  console.log('Result:', result);
} catch (error) {
  if (error instanceof ArgParserError) {
    console.error('Parser error:', error.message);
  }
}
```

### Example 2: Plugin Development

```typescript
import { ArgParser, type IArgParserPlugin } from '@alcyone-labs/arg-parser';

// Define plugin interface
interface LoggerPlugin extends IArgParserPlugin {
  name: 'com.example.logger';
}

// Create plugin
const loggerPlugin: LoggerPlugin = {
  name: 'com.example.logger',
  version: '1.0.0',
  install(parser) {
    const logs: string[] = [];
    
    (parser as any).log = (message: string) => {
      logs.push(`[${new Date().toISOString()}] ${message}`);
      console.log(message);
    };
    
    (parser as any).getLogs = () => logs;
    
    return parser;
  }
};

// Use plugin
const parser = new ArgParser({...})
  .use(loggerPlugin);

(parser as any).log('Starting application');
```

### Example 3: Type-Safe Handlers

```typescript
import { ArgParser, type IHandlerContext } from '@alcyone-labs/arg-parser';

// Define argument types
interface MyArgs {
  name: string;
  count: number;
  verbose: boolean;
}

interface MyResult {
  success: boolean;
  message: string;
}

const parser = new ArgParser<MyResult>({
  handler: async (ctx: IHandlerContext<MyArgs>) => {
    // ctx.args is fully typed as MyArgs
    const { name, count, verbose } = ctx.args;
    
    if (verbose) {
      console.log(`Processing ${count} items for ${name}`);
    }
    
    return {
      success: true,
      message: `Processed ${count} items`
    };
  }
});

parser
  .addFlag({
    name: 'name',
    options: ['-n', '--name'],
    type: 'string',
    mandatory: true
  })
  .addFlag({
    name: 'count',
    options: ['-c', '--count'],
    type: 'number',
    defaultValue: 1
  })
  .addFlag({
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false
  });

// Result is typed as MyResult
const result = await parser.parse(['-n', 'test', '-c', '5']);
console.log(result.message); // Type-safe access
```

---

## References

### Internal Links

- [Core Package Guide](./index.md) - Main usage guide
- [Core Concepts](../CORE_CONCEPTS.md) - Conceptual documentation
- [Plugin Architecture](../specs/PLUGIN_ARCHITECTURE_PLAN.md) - Plugin system details

### External Links

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js Process API](https://nodejs.org/api/process.html)

### Related Packages

- `@alcyone-labs/arg-parser-mcp` - MCP plugin
- `@alcyone-labs/arg-parser-dxt` - DXT plugin
- `@alcyone-labs/arg-parser-tui` - TUI plugin

---

## Changelog

### v3.0.0

- Complete rewrite with plugin architecture
- New `use()` method for plugin installation
- Improved TypeScript types
- Better error handling with `ArgParserError`

---

## Quality Gates

- [x] All public APIs documented
- [x] Type definitions included
- [x] Examples provided for each major feature
- [x] Cross-references to related docs
- [x] Changelog maintained
