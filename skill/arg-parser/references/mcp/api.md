# MCP API Reference

Complete reference for MCP integration in ArgParser.

## Main Classes

### ArgParser (with MCP)

Extends `ArgParserBase` with full MCP integration.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "MCP CLI",
  appCommandName: "mcp-cli",
});
```

### ArgParserMcp

MCP-optimized version that excludes all config plugins.

```typescript
import { ArgParserMcp, createMcpArgParser } from "@alcyone-labs/arg-parser";

// Using constructor
const parser = new ArgParserMcp({ appName: "MCP Server" });

// Using factory
const parser = createMcpArgParser({ appName: "MCP Server" });
```

## Tool Methods

### addTool

Unified CLI/MCP tool registration. Single definition works as both.

```typescript
interface ToolConfig {
  name: string;
  description?: string;
  flags: IFlag[];
  handler: (ctx: IHandlerContext) => THandlerReturn | Promise<THandlerReturn>;
  outputSchema?: OutputSchemaConfig;
  mcpToolOptions?: McpToolOptions;
}

parser.addTool(config: ToolConfig): this
```

### addMcpTool

Legacy MCP-only tool (deprecated, use `addTool`).

```typescript
parser.addMcpTool(config: McpToolConfig): this
```

### toMcpTools

Generate MCP tool structures from CLI definitions.

```typescript
interface GenerateMcpToolsOptions {
  includeDescription?: boolean;
  includeExamples?: boolean;
  validateInputSchemas?: boolean;
  validateOutputSchemas?: boolean;
}

const tools = parser.toMcpTools(options?: GenerateMcpToolsOptions): McpTool[]
```

### getMcpTools

Get registered MCP tools.

```typescript
parser.getMcpTools(): McpTool[]
parser.getMcpToolInfo(): McpToolInfo[]
```

## MCP Server Methods

### createMcpServer

Create an MCP server instance.

```typescript
interface McpServerInfo {
  name: string;
  version: string;
  description?: string;
}

interface McpToolOptions {
  maxRecursionDepth?: number;
  validateInputSchemas?: boolean;
  validateOutputSchemas?: boolean;
}

parser.createMcpServer(
  serverInfo?: McpServerInfo,
  toolOptions?: McpToolOptions,
  logPath?: string
): McpServer
```

### startMcpServerWithTransport

Start MCP server with specific transport.

```typescript
interface TransportOptions {
  type: "stdio" | "sse" | "streamable-http";
  port?: number;
  host?: string;
  path?: string;
  sessionIdGenerator?: () => string;
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  auth?: {
    type: "bearer" | "apikey";
    credentials: Record<string, string>;
  };
}

parser.startMcpServerWithTransport(
  serverInfo: McpServerInfo,
  transportType: string,
  transportOptions: TransportOptions,
  toolOptions?: McpToolOptions,
  logPath?: string
): Promise<void>
```

### getMcpServerConfig

Get current MCP server configuration.

```typescript
parser.getMcpServerConfig(): McpServerConfig
```

## Output Schema Configuration

```typescript
type OutputSchemaConfig =
  | "successError"
  | "successWithData"
  | "list"
  | "fileOperation"
  | "processExecution"
  | z.ZodTypeAny
  | Record<string, z.ZodTypeAny>;

// Set default output schema for all tools
parser.setDefaultOutputSchema(schema: OutputSchemaConfig): this

// Set output schema for specific tool
parser.setOutputSchema(toolName: string, schema: OutputSchemaConfig): this

// Enable auto-generation of output schemas
parser.enableAutoOutputSchema(pattern?: string): this
```

## Protocol Version

```typescript
// Set MCP protocol version
parser.setMcpProtocolVersion(version: string): this

// Supported versions:
const MCP_PROTOCOL_V1 = "2024-11-05";
const MCP_PROTOCOL_V2 = "2025-06-18";
```

## Tool Validation

```typescript
// Validate all tool routing
parser.validateToolRouting(): ValidationResult

// Test tool execution
parser.testMcpToolRouting(
  toolName: string,
  args: Record<string, any>
): Promise<TestResult>
```

## MCP Resources

```typescript
interface McpResourceConfig {
  name: string;
  uri: string;
  mimeType?: string;
  description?: string;
}

parser.addMcpResource(config: McpResourceConfig): this
parser.removeMcpResource(name: string): this
parser.getMcpResources(): McpResourceConfig[]
```

## MCP Prompts

```typescript
interface McpPromptConfig {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

parser.addMcpPrompt(config: McpPromptConfig): this
parser.removeMcpPrompt(name: string): this
parser.getMcpPrompts(): McpPromptConfig[]
```

## MCP Notifications

```typescript
interface McpNotificationConfig {
  method: string;
}

parser.addMcpNotificationHandler(
  method: string,
  handler: (params: any) => void
): this
```

## Lifecycle Events

```typescript
parser.onMcpServerStart(callback: () => void): this
parser.onMcpServerStop(callback: () => void): this
parser.onMcpSessionStart(callback: (sessionId: string) => void): this
parser.onMcpSessionEnd(callback: (sessionId: string) => void): this
```

## Usage Examples

### Basic MCP Server with STDIO Transport

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  appName: "Calculator MCP",
}).addTool({
  name: "calculate",
  description: "Perform arithmetic operations",
  flags: [
    { name: "a", options: ["--a"], type: Number, mandatory: true },
    { name: "b", options: ["--b"], type: Number, mandatory: true },
    {
      name: "operation",
      options: ["--op"],
      type: "string",
      enum: ["add", "sub", "mul", "div"],
    },
  ],
  handler: async (ctx) => {
    const { a, b, operation = "add" } = ctx.args;
    const result = eval(`${a} ${operation} ${b}`);
    return { success: true, result };
  },
});

const server = parser.createMcpServer({
  name: "calculator-server",
  version: "1.0.0",
});

await server.connect("stdio", {
  type: "stdio",
});
```

### HTTP SSE Transport

```typescript
const server = parser.createMcpServer({
  name: "api-server",
  version: "1.0.0",
});

await server.connect("streamable-http", {
  type: "streamable-http",
  port: 3000,
  host: "0.0.0.0",
  cors: {
    origin: "*",
    credentials: true,
  },
});
```

### Multiple Transports

```typescript
await parser.startMcpServerWithMultipleTransports(
  { name: "multi-transport-server", version: "1.0.0" },
  [
    { type: "stdio" },
    {
      type: "streamable-http",
      port: 3000,
      cors: { origin: "*", credentials: true },
    },
  ],
  { validateInputSchemas: true },
);
```

### With Output Schema

```typescript
import { OutputSchemaPatterns, z } from "@alcyone-labs/arg-parser";

parser.addTool({
  name: "getUser",
  description: "Get user information",
  outputSchema: "successWithData",
  flags: [{ name: "id", options: ["--id"], type: Number, mandatory: true }],
  handler: async (ctx) => {
    const user = await fetchUser(ctx.args.id);
    return { success: true, data: { user } };
  },
});

// Or custom schema
parser.addTool({
  name: "search",
  outputSchema: z.object({
    results: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        url: z.string().optional(),
      }),
    ),
    totalCount: z.number(),
    query: z.string(),
  }),
  // ...
});
```

### Auto Output Schema Generation

```typescript
parser.enableAutoOutputSchema();

// Output schemas are automatically generated from handler return types
parser.addTool({
  name: "getData",
  flags: [{ name: "id", options: ["--id"], type: Number }],
  handler: async (ctx) => {
    return { data: { id: ctx.args.id, name: "test" } };
  },
});
// Auto-generates: { success: boolean, data: { ... }, message?, error? }
```
