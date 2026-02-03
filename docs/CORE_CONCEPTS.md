## Core Concepts

### Defining Flags

Flags are defined using the `IFlag` interface within the `flags` array of a tool or command.

```typescript
interface IFlag {
  name: string; // Internal name (e.g., 'verbose')
  options: string[]; // Command-line options (e.g., ['--verbose', '-v'])
  type: "string" | "number" | "boolean" | "array" | "object" | Function | ZodSchema;
  description?: string; // Help text
  mandatory?: boolean | ((args: any) => boolean); // Whether the flag is required
  defaultValue?: any; // Default value if not provided
  flagOnly?: boolean; // A flag that doesn't consume a value (like --help)
  enum?: any[]; // An array of allowed values
  validate?: (value: any, parsedArgs?: any) => boolean | string | void; // Custom validation function
  allowMultiple?: boolean; // Allow the flag to be provided multiple times
  env?: string | string[]; // Maps flag to environment variable(s). Logic: Fallback (Env -> Flag) and Sync (Flag -> Env). Precedence: Flag > Env > Default.
  positional?: number; // Captures Nth trailing positional argument (1-indexed). See Positional Arguments section.
  dxtOptions?: DxtOptions; // Customizes how this flag appears in DXT package user_config
}

interface DxtOptions {
  type?: "string" | "directory" | "file" | "boolean" | "number"; // UI input type in Claude Desktop
  title?: string; // Display name in Claude Desktop (defaults to formatted flag name)
  sensitive?: boolean; // Whether to hide the value in UI (defaults to true for security)
  default?: any; // Default value for the user_config entry
  min?: number; // Minimum value (for number types)
  max?: number; // Maximum value (for number types)
}
```

### Environment Variable Support

ArgParser provides universal support for environment variables across all commands.

**Features:**

1.  **Automatic Fallback**: If a flag is not provided via CLI, ArgParser looks for configured environment variables.
2.  **Priority Handling**: `CLI Flag` > `Environment Variable` > `Default Value`.
3.  **Reverse Sync**: Once a flag value is resolved (whether from CLI or Env), it is automatically written back to `process.env`. This ensures downstream code accessing `process.env` sees the consistent, final value.
4.  **Array Support**: You can specify multiple env vars for a single flag; the first one found is used.

**Example:**

```typescript
parser.addFlag({
  name: "apiKey",
  type: "string",
  env: ["MY_APP_API_KEY", "LEGACY_API_KEY"], // First match wins
  defaultValue: "dev-key",
});
```

- If passed `--api-key val`: `apiKey` is "val", and `process.env.MY_APP_API_KEY` becomes "val".
- If not passed, but `MY_APP_API_KEY` exists: `apiKey` uses the env value.
- If neither: `apiKey` is "dev-key", and `process.env.MY_APP_API_KEY` is set to "dev-key".

### DXT Package User Configuration & Path Handling

ArgParser v2.5.0 introduces comprehensive DXT (Desktop Extension Toolkit) support with rich user interfaces, automatic path resolution, and context-aware development tools.

#### Enhanced dxtOptions

When generating DXT packages with `--s-build-dxt`, you can create rich user configuration interfaces using `dxtOptions`:

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "file-processor",
    version: "1.0.0",
    logPath: "${HOME}/logs/file-processor.log", // DXT variables supported!
  })
  .addFlag({
    name: "input-file",
    description: "File to process",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      title: "Select Input File",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Output directory for processed files",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/processed-files", // Smart defaults with DXT variables
      title: "Output Directory",
    },
  })
  .addFlag({
    name: "api-key",
    description: "API authentication key",
    type: "string",
    env: "API_KEY",
    dxtOptions: {
      type: "string",
      sensitive: true, // Excluded from DXT manifest for security
      title: "API Key",
    },
  })
  .addFlag({
    name: "quality",
    description: "Processing quality (1-100)",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 100,
      localDefault: 85,
      title: "Quality (%)",
    },
  })
  .addFlag({
    name: "parallel",
    description: "Enable parallel processing",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: true,
      title: "Parallel Processing",
    },
  });
```

#### DXT Variables & Path Resolution

ArgParser automatically resolves paths based on your runtime environment:

```typescript
// DXT variables work everywhere - in flags, MCP config, and code
const logPath = "${HOME}/logs/app.log";
const configPath = "${DOCUMENTS}/myapp/config.json";
const resourcePath = "${__dirname}/templates/default.hbs";

// Helper functions for common patterns
const userDataPath = DxtPathResolver.createUserDataPath("cache.db");
const tempPath = DxtPathResolver.createTempPath("processing.tmp");
const configPath = DxtPathResolver.createConfigPath("settings.json");

// Context detection
const context = DxtPathResolver.detectContext();
if (context.isDxt) {
  console.log("Running in DXT environment");
} else {
  console.log("Running in development");
}
```

**Supported DXT Variables:**

- `${HOME}` - User's home directory
- `${DOCUMENTS}` - Documents folder
- `${DOWNLOADS}` - Downloads folder
- `${DESKTOP}` - Desktop folder
- `${__dirname}` - Entry point directory (DXT package root in DXT)
- `${pathSeparator}` - Platform-specific path separator
- `${DXT_DIR}` - DXT package directory (DXT only)
- `${EXTENSION_DIR}` - Extension root directory (DXT only)

#### dxtOptions Properties

| Property       | Type                                                         | Description                                      |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `type`         | `'string' \| 'file' \| 'directory' \| 'boolean' \| 'number'` | UI component type                                |
| `sensitive`    | `boolean`                                                    | Mark as sensitive (excluded from manifest)       |
| `localDefault` | `string \| number \| boolean`                                | Default for development (supports DXT variables) |
| `multiple`     | `boolean`                                                    | Allow multiple values                            |
| `min` / `max`  | `number`                                                     | Validation constraints                           |
| `title`        | `string`                                                     | Custom display name                              |

#### Security & Best Practices

- **Sensitive Data**: Use `sensitive: true` for passwords, API keys, tokens
- **Smart Defaults**: Use DXT variables in `localDefault` for portable paths
- **Type Safety**: Match `dxtOptions.type` with flag `type` for validation
- **Cross-Platform**: Use `${pathSeparator}` for platform-independent paths

#### Comprehensive Documentation

For detailed guides and examples:

- **[DXT Path Handling Guide](./DXT_PATH_HANDLING.md)** - Complete path resolution guide
- **[dxtOptions API Documentation](./DXT_OPTIONS_API.md)** - Full API reference with examples
- **[DXT Migration Guide](./DXT_MIGRATION.md)** - Migrate existing applications
- **[DXT Practical Examples](./DXT_EXAMPLES.md)** - Real-world usage patterns

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

// Zod schema validation (structured JSON)
--config '{"host":"localhost","port":5432}' → validated object
--deployment '{"env":"prod","region":"us-east-1"}' → validated object
```

#### Zod Schema Flags (Structured JSON Validation)

**Since v2.5.0** - You can now use Zod schemas as flag types for structured JSON input with automatic validation and proper MCP JSON Schema generation:

```typescript
import { z } from "zod";

const DatabaseConfigSchema = z.object({
  host: z.string().describe("Database host address"),
  port: z.number().min(1).max(65535).describe("Database port number"),
  credentials: z.object({
    username: z.string().describe("Database username"),
    password: z.string().describe("Database password"),
  }),
  ssl: z.boolean().optional().describe("Enable SSL connection"),
});

const cli = ArgParser.withMcp({
  appName: "Database CLI",
  appCommandName: "db-cli",
}).addTool({
  name: "connect",
  description: "Connect to database with structured configuration",
  flags: [
    {
      name: "config",
      options: ["--config", "-c"],
      type: DatabaseConfigSchema, // 🎉 Zod schema as type!
      description: "Database configuration as JSON object",
      mandatory: true,
    },
  ],
  handler: async (ctx) => {
    // ctx.args.config is fully typed and validated!
    const { host, port, credentials, ssl } = ctx.args.config;
    console.log(`Connecting to ${host}:${port} as ${credentials.username}`);
    return { success: true };
  },
});

// CLI usage with JSON validation:
// db-cli connect --config '{"host":"localhost","port":5432,"credentials":{"username":"admin","password":"secret"},"ssl":true}'

// MCP usage: Generates proper JSON Schema for MCP clients
// db-cli --s-mcp-serve
```

**Example with Complex Nested Schema:**

```typescript
const DeploymentSchema = z.object({
  environment: z.enum(["dev", "staging", "prod"]),
  region: z.string(),
  scaling: z.object({
    minInstances: z.number().min(1),
    maxInstances: z.number().min(1),
    targetCpu: z.number().min(10).max(100),
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    alertEmail: z.string().email().optional(),
    metrics: z.array(z.string()),
  }),
});

// This generates comprehensive JSON Schema for MCP clients
// while providing full validation and type safety for CLI usage
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

ArgParser supports flag inheritance for CLI hierarchies. By default, sub-commands do not inherit flags from their parents. You can control this behavior using the `inheritParentFlags` option, using either a boolean (for basic/legacy behavior) or the `FlagInheritance` configuration object (for advanced control).

#### Basic Inheritance (Snapshot)

Set `inheritParentFlags: true` (or `FlagInheritance.DirectParentOnly`) to inherit flags from the _direct parent_ at the moment the sub-command is attached.

> **Note**: This is a snapshot of the parent's flags at the time `.addSubCommand()` is called. If the parent acquires new flags later (e.g., by inheriting from a grandparent), the child will NOT see them unless `FlagInheritance.AllParents` is used.

```typescript
// Child inherits current flags from parent
const childParser = new ArgParser({ inheritParentFlags: true });
```

#### Full Chain Inheritance

For complex hierarchies (e.g. `root -> mid -> leaf`), especially when constructing parsers bottom-up, use `FlagInheritance.AllParents`. This ensures that flags propagate down the entire chain, even if the intermediate parent inherits them _after_ the leaf was attached.

```typescript
import { ArgParser, FlagInheritance } from "@alcyone-labs/arg-parser";

const root = new ArgParser().addFlag({
  name: "root-flag",
  options: ["--root"],
});
const mid = new ArgParser({ inheritParentFlags: FlagInheritance.AllParents });
const leaf = new ArgParser({ inheritParentFlags: FlagInheritance.AllParents });

// Even if you link bottom-up:
mid.addSubCommand({ name: "leaf", parser: leaf });
root.addSubCommand({ name: "mid", parser: mid });

// 'leaf' will correctly have 'root-flag' thanks to deep propagation
```

#### Inheritance Options Reference

| Value                              | Legacy Boolean | Behavior                                                    |
| ---------------------------------- | -------------- | ----------------------------------------------------------- |
| `FlagInheritance.NONE`             | `false`        | No flags are inherited (Default)                            |
| `FlagInheritance.DirectParentOnly` | `true`         | Inherits from direct parent only (Snapshot)                 |
| `FlagInheritance.AllParents`       | N/A            | Inherits from entire ancestor chain (Recursive Propagation) |

### Dynamic Flags (`dynamicRegister`)

Register flags at runtime from another flag's value (e.g., load a manifest and add flags programmatically). This works in normal runs and when showing `--help`.

- Two-phase parsing: loader flags run first, can register more flags, then parsing continues with the full set
- Help preload: when `--help` is present, dynamic loaders run to show complete help (no command handlers execute)
- Cleanup: dynamic flags are removed between parses (no accumulation)
- Async-friendly: loaders can be async (e.g., `fs.readFile`)

```ts
import { readFile } from "node:fs/promises";
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser().addFlags([
  {
    name: "manifest",
    options: ["-w", "--manifest"],
    type: "string",
    description: "Path to manifest.json that defines extra flags",
    dynamicRegister: async ({ value, registerFlags }) => {
      const json = JSON.parse(await readFile(value, "utf8"));
      if (Array.isArray(json.flags)) {
        // Each entry should be a valid IFlag
        registerFlags(json.flags);
      }
    },
  },
]);

// Examples:
// my-cli -w manifest.json --help     → help includes dynamic flags
// my-cli -w manifest.json --foo bar  → dynamic flag "--foo" parsed/validated normally
```

Notes:

- Inherited behavior works normally: if loader lives on a parent parser and children use `inheritParentFlags`, dynamic flags will be visible to children
- For heavy loaders, implement app-level caching inside your `dynamicRegister` (e.g., memoize by absolute path + mtime); library-level caching may be added later

### Positional Arguments

ArgParser supports positional (trailing) arguments for a more natural CLI syntax. Instead of requiring flags for every value, you can capture trailing arguments by position.

**Before:**

```bash
workflow show --id 8fadf090-xxx
```

**After:**

```bash
workflow show 8fadf090-xxx
```

#### Basic Usage

Add the `positional` property to a flag definition. The value is 1-indexed (first trailing arg = 1, second = 2, etc.):

```typescript
const cli = new ArgParser()
  .addFlag({
    name: "id",
    type: "string",
    mandatory: true,
    options: ["--id"], // Fallback syntax: --id <value>
    positional: 1, // Primary: captures first trailing arg
    description: "Resource ID to show",
    valueHint: "ID", // Used in help text: <ID>
  })
  .setHandler((ctx) => {
    console.log(`Showing: ${ctx.args.id}`);
  });

// Both work:
// cli.parse(["abc123"])           → id = "abc123"
// cli.parse(["--id", "abc123"])   → id = "abc123"
```

#### Multiple Positional Arguments

Capture multiple trailing arguments using different positional indices:

```typescript
const cli = new ArgParser().addFlags([
  {
    name: "source",
    type: "string",
    mandatory: true,
    options: ["--source", "-s"],
    positional: 1, // First trailing arg
    valueHint: "SOURCE",
  },
  {
    name: "dest",
    type: "string",
    mandatory: true,
    options: ["--dest", "-d"],
    positional: 2, // Second trailing arg
    valueHint: "DEST",
  },
]);

// Usage: copy file.txt backup/
// Result: source = "file.txt", dest = "backup/"
```

#### Precedence Rules

- **Flag syntax takes priority**: If both `--flag value` AND a positional arg are provided, the flag value is used
- **Either satisfies mandatory**: A mandatory flag is satisfied by EITHER positional or flag syntax
- **Order matters**: Positional args are assigned in index order (1, 2, 3...)
- **Type coercion applies**: Positional values go through the same type coercion as flag values

#### Help Text

When positional arguments are defined, help text automatically shows a usage pattern:

```
Usage: workflow show [OPTIONS] <ID>

Flags:
  --id       Resource ID to show
               Type: string
               Example: --id value
               Positional argument #1
```

Mandatory positional args appear as `<NAME>`, optional as `[NAME]`.

### Automatic Help Display

ArgParser provides features to automatically show help messages when a command is invoked incorrectly or as a "container" command.

- **`ctx.displayHelp()`**: Programmatically trigger help for the current command from within its handler.
- **`autoHelpHandler`**: A pre-built handler for container commands (e.g., `git remote`) that simply displays the help text.
- **`triggerAutoHelpIfNoHandler`**: A setting that, when enabled, automatically triggers the help display for any command or sub-command that does not have an explicit handler defined.

For more details, see the [Automatic Help Display Guide](./DISPLAY_HELP.md) and the [example demo](../examples/auto-help-demo.ts).

### Interactive Prompts

ArgParser integrates with `@clack/prompts` to provide interactive prompts alongside traditional CLI flags. This allows you to build dual-mode CLIs that work both programmatically (via flags) and interactively (via prompts).

#### Basic Setup

Enable interactive mode by setting `promptWhen` and adding a `--interactive` flag:

```typescript
import { ArgParser, type IPromptableFlag } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "deploy-tool",
  promptWhen: "interactive-flag", // Trigger with --interactive
  handler: async (ctx) => {
    // Access answers from either CLI flags or interactive prompts
    const env = ctx.args.environment || ctx.promptAnswers?.["environment"];
    console.log(`Deploying to ${env}...`);
  },
});

// Required: Add --interactive flag
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
  description: "Run in interactive mode",
});

// Add promptable flag
cli.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);
```

#### promptWhen Modes

- **`"interactive-flag"` (default)**: Show prompts only when `--interactive` or `-i` flag is present
- **`"missing"`**: Show prompts when any promptable flag is missing a value
- **`"always"`**: Always show prompts (overrides CLI args)

#### Prompt Types

- **`text`**: Free text input
- **`password`**: Hidden input
- **`confirm`**: Yes/no prompt
- **`select`**: Single choice from list
- **`multiselect`**: Multiple choices

#### Sequential Prompts

Use `promptSequence` to order prompts and access previous answers:

```typescript
cli.addFlag({
  name: "region",
  options: ["--region"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Region:",
    options: ["us-east", "us-west"],
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "datacenter",
  options: ["--datacenter"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => {
    const region = ctx.promptAnswers?.["region"];
    return {
      type: "select",
      message: `Datacenter in ${region}:`,
      options: region === "us-east" ? ["dc1", "dc2"] : ["dc3", "dc4"],
    };
  },
} as IPromptableFlag);
```

#### Validation

Add validation that automatically re-prompts on failure:

```typescript
cli.addFlag({
  name: "email",
  options: ["--email"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Email:",
    validate: (val) => val.includes("@") || "Invalid email",
  }),
} as IPromptableFlag);
```

#### Subcommands with Prompts

For subcommands with prompts, add `--interactive` to the root CLI:

```typescript
const root = new ArgParser({ appName: "root" });

// Required for subcommand prompts
root.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

const child = new ArgParser({
  appName: "deploy",
  promptWhen: "always",
  handler: async (ctx) => {
    console.log("Deploying to:", ctx.promptAnswers?.["env"]);
  },
});

child.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

root.addSubCommand({
  name: "deploy",
  parser: child,
  onCancel: () => console.log("Cancelled"),
});
```

For complete documentation, see the [Interactive Prompts Specification](./specs/INTERACTIVE_PROMPTS.md) and the [example file](../examples/interactive-prompts-examples.ts).
