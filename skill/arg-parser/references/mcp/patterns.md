# MCP Patterns

Multi-step implementations for MCP integration.

## Pattern: Basic MCP Server

### Step 1: Create Parser with Tools

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "My MCP Server",
  appCommandName: "my-server",
}).addTool({
  name: "greet",
  description: "Greet someone by name",
  flags: [
    { name: "name", options: ["--name"], type: "string", mandatory: true },
    { name: "enthusiastic", options: ["--enthusiastic"], type: Boolean },
  ],
  handler: async (ctx) => {
    const { name, enthusiastic } = ctx.args;
    return {
      greeting: enthusiastic
        ? `HELLO ${name.toUpperCase()}!!!`
        : `Hello ${name}!`,
    };
  },
});
```

### Step 2: Create and Connect Server

```typescript
const server = parser.createMcpServer({
  name: "greet-server",
  version: "1.0.0",
});

// For stdio transport (most common for local MCP)
await server.connect("stdio", { type: "stdio" });
```

## Pattern: Multiple Tools with Different Output Schemas

### Step 1: Define Tools with Output Schemas

```typescript
import { ArgParser, OutputSchemaPatterns, z } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Multi-Tool Server",
})
  .addTool({
    name: "getUser",
    description: "Get user by ID",
    outputSchema: "successWithData",
    flags: [{ name: "id", options: ["--id"], type: Number, mandatory: true }],
    handler: async (ctx) => {
      const user = await db.users.findUnique({ where: { id: ctx.args.id } });
      return { success: true, data: { user } };
    },
  })
  .addTool({
    name: "listUsers",
    description: "List all users",
    outputSchema: "list",
    flags: [
      { name: "limit", options: ["--limit"], type: Number, defaultValue: 10 },
      { name: "offset", options: ["--offset"], type: Number, defaultValue: 0 },
    ],
    handler: async (ctx) => {
      const users = await db.users.findMany({
        take: ctx.args.limit,
        skip: ctx.args.offset,
      });
      return {
        items: users,
        count: users.length,
        hasMore: users.length === ctx.args.limit,
      };
    },
  })
  .addTool({
    name: "executeCommand",
    description: "Execute a shell command",
    outputSchema: "processExecution",
    flags: [
      {
        name: "command",
        options: ["--command"],
        type: "string",
        mandatory: true,
      },
    ],
    handler: async (ctx) => {
      const { execSync } = await import("child_process");
      const start = Date.now();
      try {
        const stdout = execSync(ctx.args.command, { encoding: "utf-8" });
        return {
          exitCode: 0,
          stdout,
          duration: Date.now() - start,
          command: ctx.args.command,
        };
      } catch (error: any) {
        return {
          exitCode: error.status || 1,
          stderr: error.message,
          duration: Date.now() - start,
          command: ctx.args.command,
        };
      }
    },
  });
```

### Step 2: Start Server

```typescript
const server = parser.createMcpServer({ name: "multi-tool", version: "1.0.0" });
await server.connect("stdio", { type: "stdio" });
```

## Pattern: HTTP Streamable Transport

### Step 1: Configure Server with CORS and Auth

```typescript
const parser = new ArgParser({
  appName: "HTTP MCP Server",
}).addTool({
  name: "query",
  description: "Query the database",
  flags: [{ name: "sql", options: ["--sql"], type: "string", mandatory: true }],
  handler: async (ctx) => {
    const result = await db.query(ctx.args.sql);
    return { success: true, data: { rows: result } };
  },
});

const server = parser.createMcpServer(
  {
    name: "http-mcp",
    version: "1.0.0",
  },
  {
    validateInputSchemas: true,
    validateOutputSchemas: true,
  },
);

await server.connect("streamable-http", {
  type: "streamable-http",
  port: 3000,
  host: "0.0.0.0",
  cors: {
    origin: ["https://admin.example.com", "https://app.example.com"],
    credentials: true,
  },
  auth: {
    type: "bearer",
    credentials: { token: process.env.MCP_AUTH_TOKEN! },
  },
});
```

## Pattern: MCP with Resources

### Step 1: Add Resources

```typescript
const parser = new ArgParser({
  appName: "Resource Server",
}).addMcpResource({
  name: "config",
  uri: "config://app/settings",
  mimeType: "application/json",
  description: "Application configuration",
}).addMcpResource({
  name: "schema",
  uri: "config://app/schema",
  mimeType: "application/json",
  description: "Database schema",
});

// Resource handler (implement readResource)
parser.handleMcpResourceRead(async (uri: string) => {
  if (uri === "config://app/settings") {
    return JSON.stringify({ debug: true, maxConnections: 100 });
  }
  if (uri === "config://app/schema") {
    return JSON.stringify({ tables: [...] });
  }
  throw new Error(`Unknown resource: ${uri}`);
});
```

### Step 2: Start Server

```typescript
const server = parser.createMcpServer({
  name: "resource-server",
  version: "1.0.0",
});
await server.connect("stdio", { type: "stdio" });
```

## Pattern: MCP with Prompts

### Step 1: Add Prompts

```typescript
const parser = new ArgParser({
  appName: "Prompt Server",
})
  .addMcpPrompt({
    name: "analyzeCode",
    description: "Analyze code for best practices",
    arguments: [
      { name: "language", description: "Programming language", required: true },
      { name: "level", description: "Analysis depth", required: false },
    ],
  })
  .addMcpPrompt({
    name: "generateReadme",
    description: "Generate README from project structure",
    arguments: [
      { name: "projectName", required: true },
      { name: "includeInstall", required: false },
    ],
  });

// Prompt handler (implement getPrompt)
parser.handleMcpPromptGet(
  async (name: string, args: Record<string, string>) => {
    if (name === "analyzeCode") {
      return `Analyze the following ${args.language} code for best practices:\n\n${args.code}`;
    }
    if (name === "generateReadme") {
      return `Generate a README for ${args.projectName} project.\nInclude: installation, usage, and examples.`;
    }
    throw new Error(`Unknown prompt: ${name}`);
  },
);
```

## Pattern: MCP Lifecycle Events

```typescript
const parser = new ArgParser({
  appName: "Lifecycle Server",
}).addTool({
  name: "status",
  description: "Check service status",
  handler: async () => ({ status: "healthy", uptime: process.uptime() }),
});

// Lifecycle handlers
parser.onMcpServerStart(() => {
  console.log("MCP Server started");
  // Initialize connections, load caches, etc.
});

parser.onMcpServerStop(() => {
  console.log("MCP Server stopped");
  // Cleanup, close connections, etc.
});

parser.onMcpSessionStart((sessionId) => {
  console.log(`Session started: ${sessionId}`);
  // Track active sessions
});

parser.onMcpSessionEnd((sessionId) => {
  console.log(`Session ended: ${sessionId}`);
  // Cleanup session resources
});

const server = parser.createMcpServer({
  name: "lifecycle-server",
  version: "1.0.0",
});
await server.connect("stdio", { type: "stdio" });
```

## Pattern: Auto Output Schema

```typescript
const parser = new ArgParser({
  appName: "Auto Schema Server",
}).enableAutoOutputSchema();

parser.addTool({
  name: "getData",
  flags: [{ name: "id", options: ["--id"], type: Number }],
  handler: async (ctx) => {
    // Output schema auto-generated from return value
    return {
      data: { id: ctx.args.id, name: "test", timestamp: new Date() },
      meta: { fetchedAt: new Date() },
    };
  },
});

// Auto-generates:
// {
//   success: boolean,
//   data: { ... },
//   meta: { ... },
//   message?: string,
//   error?: string
// }
```

## Pattern: Multiple Transports

```typescript
const parser = new ArgParser({
  appName: "Multi-Transport Server",
}).addTool({
  name: "echo",
  description: "Echo back the input",
  flags: [{ name: "message", options: ["--message"], type: "string" }],
  handler: async (ctx) => ({ echo: ctx.args.message.startMcpServer }),
});

await parserWithMultipleTransports(
  { name: "multi-transport", version: "1.0.0" },
  [
    // STDIO for local MCP clients
    { type: "stdio" },
    // HTTP for web-based clients
    {
      type: "streamable-http",
      port: 3000,
      cors: { origin: "*", credentials: true },
    },
  ],
  { validateInputSchemas: true },
);
```

## Pattern: Tool Validation and Testing

```typescript
const parser = new ArgParser({
  appName: "Validation Server",
}).addTool({
  name: "calculate",
  description: "Perform calculations",
  flags: [
    { name: "a", options: ["--a"], type: Number, mandatory: true },
    { name: "b", options: ["--b"], type: Number, mandatory: true },
  ],
  handler: async (ctx) => ({ result: ctx.args.a + ctx.args.b }),
});

// Validate all tools
const validation = parser.validateToolRouting();
if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
  process.exit(1);
}

// Test specific tool
const testResult = await parser.testMcpToolRouting("calculate", { a: 2, b: 3 });
console.log("Test result:", testResult);
// { success: true, result: { result: 5 } }
```

## Pattern: DXT Bundled MCP Server

```typescript
// CLI tool that can also run as MCP server
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "DXT CLI",
  appCommandName: "dxt-cli",
  mcp: {
    serverInfo: { name: "dxt-server", version: "1.0.0" },
  },
}).addTool({
  name: "process",
  description: "Process data",
  flags: [{ name: "input", options: ["--input"], type: "string" }],
  handler: async (ctx) => ({ processed: ctx.args.input }),
});

// Run as CLI
if (require.main === module) {
  await parser.parse();
}

// Export for MCP use
export const tools = parser.toMcpTools();
export const server = parser.createMcpServer({
  name: "dxt-server",
  version: "1.0.0",
});

// Run as MCP server (when bundled with DXT)
// User runs: dxt-cli --s-build-dxt
// MCP server is embedded in the executable
```
