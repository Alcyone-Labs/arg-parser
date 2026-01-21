# Core Patterns

Multi-step implementations and best practices for ArgParser core functionality.

## Pattern: Single Command CLI

Simple CLI with flags and a handler.

### Step 1: Create Parser with Options

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Greeter",
  appCommandName: "greet",
  description: "A simple greeting CLI",
  autoExit: true,
  handleErrors: true,
});
```

### Step 2: Define Flags

```typescript
parser.addFlags([
  {
    name: "name",
    options: ["--name", "-n"],
    type: "string",
    mandatory: true,
    description: "Name to greet",
    valueHint: "Alice",
  },
  {
    name: "enthusiastic",
    options: ["--enthusiastic", "-e"],
    type: Boolean,
    flagOnly: true,
    description: "Add extra enthusiasm",
  },
  {
    name: "count",
    options: ["--count", "-c"],
    type: Number,
    defaultValue: 1,
    validate: (value) => value >= 1 && value <= 10,
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    description: "Number of greetings (1-10)",
  },
]);
```

### Step 3: Set Handler

```typescript
parser.setHandler((ctx) => {
  const { name, enthusiastic, count } = ctx.args;
  const greeting = enthusiastic
    ? `HELLO ${name.toUpperCase()}!!!`
    : `Hello ${name}!`;

  for (let i = 0; i < count; i++) {
    console.log(greeting);
  }
});
```

### Step 4: Parse

```typescript
await parser.parse();
```

## Pattern: Multi-Level Subcommands

CLI with nested commands.

### Step 1: Create Root Parser

```typescript
const root = new ArgParser({
  appName: "Project CLI",
  appCommandName: "project",
  inheritParentFlags: FlagInheritance.AllParents,
}).addFlags([
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
    flagOnly: true,
    description: "Verbose output",
  },
  {
    name: "config",
    options: ["--config", "-c"],
    type: "string",
    env: "PROJECT_CONFIG",
    setWorkingDirectory: true,
    description: "Config file path",
  },
]);
```

### Step 2: Create Subcommand Parsers

```typescript
const buildParser = new ArgParser({
  appName: "Build Command",
  description: "Build the project",
}).addFlags([
  {
    name: "target",
    options: ["--target", "-t"],
    type: "string",
    defaultValue: "production",
    enum: ["development", "staging", "production"],
    description: "Build target",
  },
  {
    name: "watch",
    options: ["--watch", "-w"],
    type: Boolean,
    flagOnly: true,
    description: "Watch for changes",
  },
]);

const deployParser = new ArgParser({
  appName: "Deploy Command",
  description: "Deploy the project",
}).addFlags([
  {
    name: "environment",
    options: ["--environment", "-e"],
    type: "string",
    mandatory: true,
    description: "Target environment",
  },
  {
    name: "dryRun",
    options: ["--dry-run"],
    type: Boolean,
    flagOnly: true,
    description: "Show what would be deployed",
  },
]);
```

### Step 3: Attach Subcommands

```typescript
root.addSubCommand({
  name: "build",
  parser: buildParser,
  handler: (ctx) => {
    const { target, watch } = ctx.args;
    const { verbose, config } = ctx.parentArgs!;
    console.log(`Building for ${target} (verbose: ${verbose})`);
  },
});

root.addSubCommand({
  name: "deploy",
  parser: deployParser,
  handler: (ctx) => {
    const { environment, dryRun } = ctx.args;
    console.log(`Deploying to ${environment} (dry-run: ${dryRun})`);
  },
});
```

### Step 4: Parse

```typescript
await root.parse();
```

## Pattern: Unified CLI and MCP Tool

Single definition works as both CLI subcommand and MCP tool.

### Step 1: Define Tool with Full Options

```typescript
import { z } from "zod";
import { ArgParser, OutputSchemaPatterns } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Unified Tool",
  appCommandName: "unified-tool",
  mcp: {
    serverInfo: { name: "unified-server", version: "1.0.0" },
  },
});

parser.addTool({
  name: "calculate",
  description: "Perform arithmetic operations",
  outputSchema: "successWithData",
  flags: [
    {
      name: "a",
      options: ["--a"],
      type: Number,
      mandatory: true,
      description: "First operand",
    },
    {
      name: "b",
      options: ["--b"],
      type: Number,
      mandatory: true,
      description: "Second operand",
    },
    {
      name: "operation",
      options: ["--operation", "--op"],
      type: "string",
      defaultValue: "add",
      enum: ["add", "subtract", "multiply", "divide"],
      description: "Operation to perform",
    },
  ],
  handler: async (ctx) => {
    const { a, b, operation } = ctx.args;
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          throw new Error("Cannot divide by zero");
        }
        result = a / b;
        break;
    }

    return { success: true, data: { result, operation } };
  },
});
```

### Step 2: Use as CLI

```typescript
await parser.parse();
```

### Step 3: Convert to MCP Tools

```typescript
const tools = parser.toMcpTools({
  includeDescription: true,
  includeExamples: true,
});
```

## Pattern: Async Handler with Deep Option

Handling async operations with proper promise management.

### Default Behavior (deep: true)

```typescript
const parser = new ArgParser({
  appName: "Async CLI",
  autoExit: true,
}).addFlags([
  { name: "file", options: ["--file", "-f"], type: "string", mandatory: true },
]);

parser.setHandler(async (ctx) => {
  const content = await readFile(ctx.args.file);
  const processed = await processContent(content);
  return { content: processed };
});

// deep: true is default, handler promise is awaited automatically
await parser.parse();
```

### Manual Handling (deep: false)

```typescript
const parser = new ArgParser({
  appName: "Async CLI",
  autoExit: false,
}).addFlags([
  { name: "file", options: ["--file", "-f"], type: "string", mandatory: true },
]);

const result = await parser.parse([], { deep: false });

if (result && result.data?._asyncHandlerPromise) {
  // Handle promise manually
  const handlerResult = await result.data._asyncHandlerPromise;
  await writeResult(handlerResult);
}
```

## Pattern: Error Handling Strategies

### Strategy 1: Default (Exit on Error)

```typescript
const parser = new ArgParser({
  appName: "CLI",
  handleErrors: true,
  autoExit: true,
});
// Errors are printed with nice formatting and process.exit(1)
```

### Strategy 2: Programmatic (Return ParseResult)

```typescript
const parser = new ArgParser({
  appName: "CLI",
  handleErrors: true,
  autoExit: false,
});

const result = await parser.parse();
if (!result.success) {
  console.error(`Error: ${result.message}`);
  process.exit(result.exitCode);
}
```

### Strategy 3: Manual (Throw Errors)

```typescript
const parser = new ArgParser({
  appName: "CLI",
  handleErrors: false,
});

try {
  await parser.parse();
} catch (error) {
  if (error instanceof ArgParserError) {
    console.error("Command chain:", error.commandChain);
    console.error("Error:", error.message);
  }
  process.exit(1);
}
```

## Pattern: Dynamic Flag Registration

Adding flags conditionally based on other flag values.

### Basic Dynamic Registration

```typescript
const parser = new ArgParser({
  appName: "Dynamic CLI",
}).addFlags([
  {
    name: "mode",
    options: ["--mode", "-m"],
    type: "string",
    defaultValue: "basic",
    enum: ["basic", "advanced", "expert"],
    description: "Operation mode",
    dynamicRegister: async (ctx) => {
      const mode = ctx.value || "basic";

      if (mode === "advanced" || mode === "expert") {
        return [
          {
            name: "advancedOption",
            options: ["--advanced-option"],
            type: "string",
            description: "Advanced option for expert mode",
          },
          {
            name: "timeout",
            options: ["--timeout"],
            type: Number,
            defaultValue: 30000,
            description: "Timeout in milliseconds",
          },
        ];
      }

      return [];
    },
  },
]);

parser.setHandler((ctx) => {
  const { mode, advancedOption, timeout } = ctx.args;
  console.log(`Mode: ${mode}, Option: ${advancedOption}, Timeout: ${timeout}`);
});
```

### Dynamic Registration with Validation

```typescript
{
  name: "outputFormat",
  options: ["--format", "-f"],
  type: "string",
  dynamicRegister: async (ctx) => {
    if (ctx.value === "json") {
      return [
        {
          name: "pretty",
          options: ["--pretty"],
          type: Boolean,
          flagOnly: true,
          description: "Pretty-print JSON output",
        },
        {
          name: "includeMetadata",
          options: ["--include-metadata"],
          type: Boolean,
          flagOnly: true,
          description: "Include metadata in output",
        },
      ];
    }
    if (ctx.value === "csv") {
      return [
        {
          name: "delimiter",
          options: ["--delimiter", "-d"],
          type: "string",
          defaultValue: ",",
          validate: (value) => value.length === 1,
          description: "CSV delimiter character",
        },
      ];
    }
    return [];
  },
}
```

## Pattern: Working Directory Management

Controlling the effective working directory for file operations.

### Basic setWorkingDirectory

```typescript
const parser = new ArgParser({
  appName: "File CLI",
}).addFlags([
  {
    name: "workspace",
    options: ["--workspace", "-w"],
    type: "string",
    setWorkingDirectory: true,
    description: "Working directory for operations",
  },
  {
    name: "input",
    options: ["--input", "-i"],
    type: "string",
    description: "Input file (relative to workspace)",
  },
  {
    name: "output",
    options: ["--output", "-o"],
    type: "string",
    description: "Output file (relative to workspace)",
  },
]);

parser.setHandler((ctx) => {
  // process.cwd() is now ctx.args.workspace
  // All file paths are resolved relative to workspace
  const inputPath = path.resolve(process.cwd(), ctx.args.input);
  const outputPath = path.resolve(process.cwd(), ctx.args.output);

  // ctx.rootPath preserves original user cwd
  const userRelativePath = path.resolve(ctx.rootPath!, ctx.args.input);
});
```

### Multiple setWorkingDirectory Flags

```typescript
.addFlags([
  {
    name: "projectDir",
    options: ["--project-dir"],
    type: "string",
    setWorkingDirectory: true,
  },
  {
    name: "outputDir",
    options: ["--output-dir"],
    type: "string",
    setWorkingDirectory: true,
  },
  {
    name: "configFile",
    options: ["--config"],
    type: "string",
    env: "APP_CONFIG",
    description: "Config file (relative to projectDir)",
  },
]);

// Last setWorkingDirectory flag wins
// If both --project-dir and --output-dir are provided,
// effective cwd is outputDir
```

## Pattern: Custom Type Parsers

### Sync Parser Function

```typescript
.addFlags([
  {
    name: "port",
    options: ["--port", "-p"],
    type: (value: string) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port number: ${value}`);
      }
      return port;
    },
    description: "Port number (1-65535)",
  },
  {
    name: "size",
    options: ["--size", "-s"],
    type: (value: string) => {
      const match = value.match(/^(\d+)(KB|MB|GB|TB)?$/i);
      if (!match) {
        throw new Error("Invalid size format (e.g., 500MB)");
      }
      const size = parseInt(match[1], 10);
      const unit = match[2]?.toUpperCase() || "B";
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
      };
      return size * multipliers[unit];
    },
    description: "Size with unit (e.g., 500MB)",
  },
])
```

### Async Parser Function

```typescript
.addFlags([
  {
    name: "config",
    options: ["--config", "-c"],
    type: async (value: string) => {
      const response = await fetch(`https://api.example.com/config/${value}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      return response.json();
    },
    description: "Config ID to fetch from API",
  },
])
```

### Zod Schema Parser

```typescript
import { z } from "zod";

.addFlags([
  {
    name: "user",
    options: ["--user", "-u"],
    type: z.object({
      id: z.number(),
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin", "user", "guest"]),
    }),
    description: "User object as JSON",
  },
  {
    name: "range",
    options: ["--range", "-r"],
    type: z.object({
      start: z.number(),
      end: z.number(),
    }).refine((data) => data.start <= data.end),
    description: "Range as JSON (e.g., '{\"start\":0,\"end\":100}')",
  },
])
```

## Pattern: Configuration from Multiple Sources

### ENV + JSON + CLI Priority

```typescript
import {
  ConfigurationManager,
  EnvConfigPlugin,
  JsonConfigPlugin,
} from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Config CLI",
}).addFlags([
  {
    name: "apiUrl",
    options: ["--api-url"],
    type: "string",
    env: "API_URL",
    description: "API endpoint URL",
  },
  {
    name: "debug",
    options: ["--debug", "-d"],
    type: Boolean,
    env: "DEBUG_MODE",
    description: "Enable debug mode",
  },
]);

const configManager = new ConfigurationManager(parser);

// Load config files
await configManager.loadConfig("/etc/app.json");
await configManager.loadEnvFile(".env");

// Priority: CLI > ENV > config file > defaults
await parser.parse();
```

### Custom Config Plugin

```typescript
import { ConfigPlugin } from "@alcyone-labs/arg-parser";

class CustomConfigPlugin extends ConfigPlugin {
  name = "custom";
  extensions = [".custom"];

  async load(configPath: string): Promise<Record<string, any>> {
    const content = await fs.readFile(configPath, "utf-8");
    return parseCustomFormat(content);
  }
}

const registry = new ConfigPluginRegistry();
registry.register(new CustomConfigPlugin());
```
