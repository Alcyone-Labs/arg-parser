# Architecture Patterns

High-level architectural patterns for building applications with ArgParser.

## Pattern: Monorepo CLI Tool

Multi-package CLI with shared core functionality.

### Structure

```
my-cli/
├── packages/
│   ├── core/           # Shared logic
│   ├── cli/            # CLI entrypoint
│   └── mcp-server/     # MCP server
└── package.json
```

### Core Package

```typescript
// packages/core/src/index.ts
import { z } from "zod";
import { ArgParser } from "@alcyone-labs/arg-parser";

export const coreParser = new ArgParser({
  appName: "Core",
}).addFlags([
  {
    name: "output",
    options: ["--output", "-o"],
    type: "string",
    defaultValue: "json",
    enum: ["json", "yaml", "table"],
    description: "Output format",
  },
  {
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
    flagOnly: true,
    description: "Verbose output",
  },
]);

export function createProcessor() {
  return {
    process: async (input: string) => {
      // Shared processing logic
      return { result: input.toUpperCase() };
    },
  };
}
```

### CLI Package

```typescript
// packages/cli/src/index.ts
import { coreParser, createProcessor } from "@alcyone-labs/core";

const parser = new ArgParser({
  appName: "My CLI",
  appCommandName: "mycli",
  description: "My awesome CLI tool",
}).addFlags([
  {
    name: "input",
    options: ["--input", "-i"],
    type: "string",
    mandatory: true,
  },
]);

parser.setHandler(async (ctx) => {
  const { input, output, verbose } = ctx.args;
  const processor = createProcessor();
  const result = await processor.process(input);

  if (verbose) {
    console.log("Input:", input);
  }

  switch (output) {
    case "json":
      console.log(JSON.stringify(result, null, 2));
      break;
    case "yaml":
      console.log(toYaml(result));
      break;
    case "table":
      console.log(toTable(result));
      break;
  }
});

await parser.parse();
```

### MCP Server Package

```typescript
// packages/mcp-server/src/index.ts
import { coreParser, createProcessor } from "@alcyone-labs/core";

const parser = new ArgParser({
  appName: "My MCP Server",
  appCommandName: "mycli-mcp",
}).addTool({
  name: "process",
  description: "Process input string",
  outputSchema: "successWithData",
  flags: [
    { name: "input", options: ["--input"], type: "string", mandatory: true },
  ],
  handler: async (ctx) => {
    const processor = createProcessor();
    const result = await processor.process(ctx.args.input);
    return { success: true, data: result };
  },
});

const server = parser.createMcpServer({
  name: "mycli-server",
  version: "1.0.0",
});

await server.connect("stdio", { type: "stdio" });
```

## Pattern: Config-Driven CLI

CLI driven by configuration files.

### Configuration Schema

```typescript
// config/schema.ts
import { z } from "zod";

export const toolConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  flags: z.array(
    z.object({
      name: z.string(),
      options: z.array(z.string()),
      type: z.enum(["string", "number", "boolean"]),
      defaultValue: z.any().optional(),
      mandatory: z.boolean().optional(),
      env: z.string().optional(),
    }),
  ),
  handler: z.function().optional(), // Reference to handler function
});

export const cliConfigSchema = z.object({
  appName: z.string(),
  appCommandName: z.string(),
  description: z.string().optional(),
  version: z.string(),
  tools: z.array(toolConfigSchema),
  configFiles: z.array(z.string()).optional(),
});
```

### Config Loader

```typescript
// config/loader.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { cliConfigSchema } from "./schema";

export async function loadConfig(
  configPaths: string[],
): Promise<z.infer<typeof cliConfigSchema>> {
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const ext = path.extname(configPath);

      let data;
      switch (ext) {
        case ".json":
          data = JSON.parse(content);
          break;
        case ".yaml":
        case ".yml":
          data = (await import("js-yaml")).load(content);
          break;
        case ".toml":
          data = (await import("smol-toml")).parse(content);
          break;
      }

      const config = cliConfigSchema.parse(data);
      return config;
    }
  }

  throw new Error("No config file found");
}
```

### Dynamic Parser Creation

```typescript
// config/builder.ts
import { ArgParser } from "@alcyone-labs/arg-parser";
import type { CliConfig } from "./schema";

export function createParserFromConfig(config: CliConfig): ArgParser {
  const parser = new ArgParser({
    appName: config.appName,
    appCommandName: config.appCommandName,
    description: config.description,
  });

  for (const tool of config.tools) {
    parser.addTool({
      name: tool.name,
      description: tool.description,
      flags: tool.flags.map((f) => ({
        name: f.name,
        options: f.options,
        type: f.type,
        defaultValue: f.defaultValue,
        mandatory: f.mandatory,
        env: f.env,
      })),
      handler: tool.handler,
    });
  }

  return parser;
}
```

## Pattern: Plugin Architecture

Extensible CLI with plugin system.

### Plugin Interface

```typescript
// plugins/interface.ts
import { ArgParser } from "@alcyone-labs/arg-parser";

export interface CliPlugin {
  name: string;
  version: string;

  // Called before parser is created
  beforeCreate?(config: PluginConfig): void;

  // Called after parser is created
  afterCreate?(parser: ArgParser): void;

  // Called when building DXT
  beforeBuild?(context: BuildContext): void;

  // Called when starting server
  beforeServerStart?(server: McpServer): void;
}

export interface PluginConfig {
  appName: string;
  appCommandName: string;
  plugins: string[];
  [key: string]: any;
}

export interface BuildContext {
  outputDir: string;
  includeNodeModules: boolean;
  [key: string]: any;
}
```

### Plugin Registry

```typescript
// plugins/registry.ts
import { CliPlugin } from "./interface";

class PluginRegistry {
  #plugins: Map<string, CliPlugin> = new Map();

  register(plugin: CliPlugin): void {
    if (this.#plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }
    this.#plugins.set(plugin.name, plugin);
  }

  unregister(name: string): void {
    this.#plugins.delete(name);
  }

  get(name: string): CliPlugin | undefined {
    return this.#plugins.get(name);
  }

  getAll(): CliPlugin[] {
    return Array.from(this.#plugins.values());
  }

  async loadPlugin(pluginPath: string): Promise<CliPlugin> {
    const module = await import(pluginPath);
    const plugin = module.default as CliPlugin;
    this.register(plugin);
    return plugin;
  }
}

export const pluginRegistry = new PluginRegistry();
```

### Plugin Implementation Example

```typescript
// plugins/auth-plugin/index.ts
import { ArgParser } from "@alcyone-labs/arg-parser";
import { CliPlugin } from "./interface";

export const authPlugin: CliPlugin = {
  name: "auth",
  version: "1.0.0",

  afterCreate(parser: ArgParser): void {
    parser.addFlags([
      {
        name: "apiKey",
        options: ["--api-key"],
        type: "string",
        env: "API_KEY",
        description: "API key for authentication",
      },
      {
        name: "token",
        options: ["--token"],
        type: "string",
        env: "AUTH_TOKEN",
        description: "Bearer token for authentication",
      },
    ]);

    parser.setHandler(async (ctx) => {
      const { apiKey, token } = ctx.args;
      if (!apiKey && !token) {
        throw new Error(
          "Authentication required. Provide --api-key or --token",
        );
      }
      // ... authentication logic
    });
  },
};

export default authPlugin;
```

## Pattern: Testing Strategy

Comprehensive testing for ArgParser applications.

### Unit Tests

```typescript
// tests/unit/parser.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ArgParser } from "@alcyone-labs/arg-parser";

describe("ArgParser", () => {
  let parser: ArgParser;
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(() => {
    parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handleErrors: true,
    });

    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  test("should parse string flag", async () => {
    parser.addFlags([{ name: "name", options: ["--name"], type: "string" }]);

    parser.setHandler((ctx) => {
      expect(ctx.args.name).toBe("Alice");
    });

    await parser.parse(["--name", "Alice"]);
  });

  test("should parse number flag", async () => {
    parser.addFlags([{ name: "count", options: ["--count"], type: Number }]);

    parser.setHandler((ctx) => {
      expect(ctx.args.count).toBe(42);
    });

    await parser.parse(["--count", "42"]);
  });

  test("should parse boolean flag", async () => {
    parser.addFlags([
      {
        name: "verbose",
        options: ["--verbose"],
        type: Boolean,
        flagOnly: true,
      },
    ]);

    let result = false;
    parser.setHandler((ctx) => {
      result = ctx.args.verbose;
    });

    await parser.parse(["--verbose"]);
    expect(result).toBe(true);
  });

  test("should throw for missing mandatory flag", async () => {
    parser.addFlags([
      {
        name: "required",
        options: ["--required"],
        type: "string",
        mandatory: true,
      },
    ]);

    parser.setHandler(() => {});

    await expect(parser.parse([])).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// tests/integration/cli.test.ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execAsync = promisify(exec);

describe("CLI Integration", () => {
  test("should display help", async () => {
    const { stdout } = await execAsync("node dist/cli.js --help");
    expect(stdout).toContain("My CLI");
    expect(stdout).toContain("--help");
  });

  test("should parse arguments correctly", async () => {
    const { stdout } = await execAsync('node dist/cli.js --name "Alice"');
    expect(stdout).toContain("Hello Alice");
  });

  test("should exit with error for missing required flag", async () => {
    try {
      await execAsync("node dist/cli.js");
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toContain("required");
    }
  });
});
```

### Fuzzy Testing

```typescript
// tests/fuzzy/parser.test.ts
import { describe, expect, test } from "vitest";
import { ArgParserFuzzyTester } from "@alcyone-labs/arg-parser";

describe("Fuzzy Testing", () => {
  test("should handle random inputs", async () => {
    const parser = new ArgParser({
      appName: "Fuzzy Test",
    }).addFlags([
      { name: "name", options: ["--name"], type: "string" },
      { name: "count", options: ["--count"], type: Number },
      {
        name: "verbose",
        options: ["--verbose"],
        type: Boolean,
        flagOnly: true,
      },
    ]);

    parser.setHandler(() => {});

    const tester = new ArgParserFuzzyTester(parser, {
      maxDepth: 5,
      randomTestCases: 100,
      testErrorCases: true,
    });

    const report = await tester.runFuzzyTest();

    if (report.failed.length > 0) {
      console.error("Failed test cases:", report.failed);
    }

    expect(report.failed.length).toBe(0);
  });
});
```

## Pattern: Migration from v1 to v2

Upgrading from legacy ArgParser to v2.

### Key Changes

| v1                         | v2                                         |
| -------------------------- | ------------------------------------------ |
| `ArgParser` (old)          | `ArgParserBase`                            |
| `addMcpTool()`             | `addTool()`                                |
| `toMcpTool()`              | `toMcpTools()`                             |
| `inheritParentFlags: true` | `inheritParentFlags: "direct-parent-only"` |
| Zod v3                     | Zod v4                                     |

### Migration Steps

```typescript
// v1 (legacy)
import { ArgParser as OldArgParser } from "@alcyone-labs/arg-parser";

const parser = new OldArgParser({
  appName: "Legacy CLI",
});

// v2 (current)
import { ArgParser, ArgParserBase, FlagInheritance } from "@alcyone-labs/arg-parser";

// For CLI-only
const parser = new ArgParserBase({
  appName: "Modern CLI",
  inheritParentFlags: FlagInheritance.AllParents,  // Was true in v1
});

// For CLI + MCP
const parser = new ArgParser({
  appName: "Modern CLI",
});

// v1: addMcpTool() - DEPRECATED
parser.addMcpTool({
  name: "oldTool",
  flags: [...],
});

// v2: addTool() - RECOMMENDED
parser.addTool({
  name: "newTool",
  description: "New unified tool",
  flags: [...],
  outputSchema: "successWithData",
});

// v1: toMcpTool() - DEPRECATED
const oldTool = parser.toMcpTool("toolName");

// v2: toMcpTools() - RECOMMENDED
const tools = parser.toMcpTools();

// v1: Zod v3 syntax
type: z.string().url()
type: z.string().email()

// v2: Zod v4 syntax
type: z.url()
type: z.email()
```

## Pattern: Production Deployment

Best practices for production CLI tools.

### Build Pipeline

```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm

      - run: pnpm install

      - run: pnpm check:types

      - run: pnpm test:fast

      - run: pnpm build

      - name: Build DXT
        run: |
          cd dist
          ./my-cli --s-build-dxt ./dxt --s-with-node-modules

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### Docker Support

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --prod

# Copy source
COPY . .

# Build
RUN pnpm build

# Build DXT
RUN ./dist/my-cli --s-build-dxt /app/dxt --s-with-node-modules

# Use DXT as entrypoint
FROM node:20-alpine

WORKDIR /app

COPY --from=0 /app/dxt .

ENTRYPOINT ["./my-cli"]
```

### Environment Configuration

```typescript
// config/production.ts
import {
  ArgParser,
  ConfigurationManager,
  EnvConfigPlugin,
} from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Production CLI",
  appCommandName: "prod-cli",
  description: "Production CLI tool",
  autoExit: true,
  handleErrors: true,
});

const configManager = new ConfigurationManager(parser);
configManager.loadEnvFile("/etc/prod-cli.env");
configManager.loadConfigFile("/etc/prod-cli.json");

parser.addFlags([
  {
    name: "environment",
    options: ["--environment", "-e"],
    type: "string",
    env: "NODE_ENV",
    defaultValue: "production",
    description: "Deployment environment",
  },
]);

parser.setHandler((ctx) => {
  const isProduction = ctx.args.environment === "production";
  // ...
});

await parser.parse();
```
