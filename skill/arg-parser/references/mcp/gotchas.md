# MCP Gotchas

Pitfalls and limitations in MCP integration.

## Console Hijacking in MCP Mode

### Problem: `console.log` is hijacked and may cause protocol errors

```typescript
parser.setHandler(async (ctx) => {
  console.log("Processing..."); // HIJACKED in MCP mode!
  const result = await process(ctx.args.input);
  console.log("Done:", result); // May corrupt MCP response
  return { result };
});
```

### Solution: Use `ctx.logger` for all logging

.setHandler(async (ctx) => {

```typescript
parser  ctx.logger.info("Processing started", { input: ctx.args.input });
  const result = await process(ctx.args.input);
  ctx.logger.info("Processing complete", { result });
  return { result };
});
```

### Problem: Third-party libraries use `console.log`

```typescript
import axios from "axios";

parser.setHandler(async (ctx) => {
  // axios may log requests using console.log
  const response = await axios.get(ctx.args.url);
  return { data: response.data };
});
```

### Solution: Mock console before calling third-party code

```typescript
parser.setHandler(async (ctx) => {
  const originalLog = console.log;
  console.log = () => {}; // Suppress all console.log

  try {
    const response = await axios.get(ctx.args.url);
    return { data: response.data };
  } finally {
    console.log = originalLog; // Restore
  }
});
```

## Tool Name Conflicts

### Problem: Tool names must be unique but may conflict with CLI subcommands

```typescript
parser.addTool({ name: "list", ... });  // May conflict with subcommand
parser.addSubCommand({ name: "list", ... });
```

### Solution: Use distinct naming

```typescript
// Prefix MCP tools with underscore or use namespaced names
parser.addTool({ name: "_mcp_list", ... });  // MCP tool
parser.addSubCommand({ name: "list", ... });  // CLI subcommand
```

## Output Schema Compatibility

### Problem: Output schemas only supported in MCP 2025-06-18+

```typescript
parser.addTool({
  name: "getData",
  outputSchema: "successWithData", // Only works with MCP v2
  // ...
});

// If client uses MCP v1, outputSchema is ignored
```

### Solution: Check protocol version or use compatible schemas

```typescript
parser.setMcpProtocolVersion("2025-06-18");

// Or provide fallback for v1 clients
parser.addTool({
  name: "getData",
  outputSchema: "successWithData", // Will be ignored by v1
  // Handler returns compatible format for both
  handler: async (ctx) => ({
    success: true,
    data: await getData(),
  }),
});
```

### Problem: Auto output schema may not match handler return type

```typescript
parser.enableAutoOutputSchema();

parser.addTool({
  name: "getUser",
  handler: async (ctx) => {
    // Handler returns: { id: 1, name: "Alice" }
    return { id: 1, name: "Alice" };
  },
  // Auto-generated schema may not infer correctly
});
```

### Solution: Explicitly set output schema when type inference is unclear

```typescript
parser.addTool({
  name: "getUser",
  outputSchema: z.object({
    id: z.number(),
    name: z.string(),
  }),
  handler: async (ctx) => {
    return { id: 1, name: "Alice" };
  },
});
```

## Transport Issues

### Problem: HTTP transports may block on slow handlers

```typescript
// HTTP SSE transport
await server.connect("sse", { type: "sse", host: "0.0.0.0", port: 3000 });

// If handler takes > 30 seconds, SSE connection may timeout
parser.addTool({
  name: "longRunning",
  handler: async (ctx) => {
    await sleep(60000); // 60 seconds
    return { done: true };
  },
});
```

### Solution: Use streaming response or increase timeout

```typescript
// Use streamable-http with proper timeout configuration
await server.connect("streamable-http", {
  type: "streamable-http",
  port: 3000,
  // Configure timeout in your reverse proxy
});
```

### Problem: Multiple transports may cause duplicate initialization

```typescript
await parser.startMcpServerWithMultipleTransports(
  serverInfo,
  [{ type: "stdio" }, { type: "streamable-http", port: 3000 }],
  toolOptions,
);

// Database connection initialized twice (once per transport)
```

### Solution: Use lifecycle events for single initialization

```typescript
let initialized = false;

parser.onMcpServerStart(() => {
  if (!initialized) {
    initializeDatabase(); // Only once
    initialized = true;
  }
});
```

## Zod Schema Issues

### Problem: Zod v4 syntax required but SDK uses v3 internally

```typescript
import { z } from "zod";

// Zod v4 syntax (required for input)
{
  type: z.object({
    email: z.email(),           // NOT z.string().email()
    url: z.url(),               // NOT z.string().url()
    datetime: z.datetime(),     // NOT z.string().datetime()
  }),
}
```

### Solution: Use Zod v4 throughout the project

```json
// package.json
{
  "dependencies": {
    "zod": "^4.3.0"
  }
}
```

### Problem: Complex Zod schemas may cause circular reference errors

```typescript
const userSchema = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    friends: z.array(userSchema), // Circular!
  }),
);
```

### Solution: Use explicit type annotation or avoid circular refs

```typescript
// Option 1: Use type annotation
interface User {
  id: number;
  name: string;
  friends: User[];
}

const userSchema: z.ZodType<User> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    friends: z.array(userSchema),
  }),
);
```

## Session Management

### Problem: Sessions may leak resources

```typescript
parser.onMcpSessionStart((sessionId) => {
  const connection = createConnection(sessionId); // Connection per session
});

parser.onMcpSessionEnd((sessionId) => {
  // May not be called if client disconnects abruptly
  connection.close();
});
```

### Solution: Use heartbeat and cleanup intervals

```typescript
const connections = new Map<string, Connection>();

parser.onMcpSessionStart((sessionId) => {
  connections.set(sessionId, createConnection(sessionId));
});

parser.onMcpSessionEnd((sessionId) => {
  connections.get(sessionId)?.close();
  connections.delete(sessionId);
});

// Periodic cleanup for stale sessions
setInterval(() => {
  for (const [sessionId, conn] of connections) {
    if (conn.isStale()) {
      conn.close();
      connections.delete(sessionId);
    }
  }
}, 60000);
```

## Tool Routing Validation

### Problem: `validateToolRouting()` may not catch all issues

```typescript
const validation = parser.validateToolRouting();
if (validation.valid) {
  // May still have runtime issues
}
```

### Solution: Use `testMcpToolRouting()` for comprehensive testing

```typescript
// Test all tools with sample inputs
const tools = parser.getMcpToolInfo();
for (const tool of tools) {
  const result = await parser.testMcpToolRouting(tool.name, {
    // Sample valid input
    ...generateValidInput(tool),
  });
  if (!result.success) {
    console.error(`Tool ${tool.name} failed test:`, result.error);
  }
}
```

## Auth Configuration

### Problem: Auth tokens may be exposed in logs

```typescript
await server.connect("streamable-http", {
  type: "streamable-http",
  auth: {
    type: "bearer",
    credentials: { token: "secret-token-12345" }, // May be logged!
  },
});
```

### Solution: Load auth from environment

```typescript
await server.connect("streamable-http", {
  type: "streamable-http",
  auth: {
    type: "bearer",
    credentials: { token: process.env.MCP_AUTH_TOKEN! },
  },
});
```

## CORS Issues

### Problem: CORS may block legitimate origins

```typescript
await server.connect("streamable-http", {
  type: "streamable-http",
  cors: {
    origin: "https://only-one.example.com",
    credentials: true,
  },
});

// requests from https://other.example.com will be blocked
```

### Solution: Configure appropriate CORS policy

```typescript
await server.connect("streamable-http", {
  type: "streamable-http",
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  },
});
```

## Logging in Production

### Problem: Logger may not be configured for production

```typescript
// Default logger writes to STDERR
parser.setHandler((ctx) => {
  ctx.logger.info("Something happened");
  // In production, you may want structured logging to file
});
```

### Solution: Configure custom logger

```typescript
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";

const logger = createMcpLogger({
  prefix: "production-server",
  mcpMode: true,
  transport: {
    type: "file",
    path: "/var/log/mcp-server.log",
  },
});

new ArgParser({
  appName: "Production Server",
  logger,
});
```
