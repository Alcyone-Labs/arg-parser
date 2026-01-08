## MCP & Claude Desktop Integration

ArgParser makes it trivial to turn any CLI tool into a **Model Context Protocol (MCP)** server. This allows AI assistants like Claude Desktop to discover and execute your CLI tools with full parameter validation and type safety.

### Quick Setup: `.withMcp()`

To enable MCP features, use the `ArgParser.withMcp()` factory method. This adds built-in system flags (like `--s-mcp-serve`) and enables tool introspection.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "My Tool",
  appCommandName: "my-tool",
  mcp: {
    serverInfo: {
      name: "my-mcp-server",
      version: "1.0.0",
      description: "A description of my server",
    },
  },
});
```

### Defining Tools: `.addTool()`

The `addTool()` method is the modern, unified way to define commands that work as both CLI sub-commands and MCP tools.

```typescript
cli.addTool({
  name: "calculate_revenue",
  description: "Calculate revenue for a specific period",
  flags: [
    { name: "startDate", type: "string", mandatory: true },
    { name: "endDate", type: "string", mandatory: true },
    { name: "currency", type: "string", defaultValue: "USD", enum: ["USD", "EUR", "GBP"] },
  ],
  handler: async (ctx) => {
    // Both CLI and MCP usage share this handler
    const data = await getRevenue(ctx.args.startDate, ctx.args.endDate);
    console.log(`Calculated revenue: ${data.total} ${ctx.args.currency}`);
    return { revenue: data.total, currency: ctx.args.currency };
  },
});
```

### Transports and Connectivity

ArgParser supports multiple MCP transports, enabling various connectivity scenarios:

1.  **`stdio` (Default)**: Best for Claude Desktop local extensions.
2.  **`sse`**: Starts an HTTP server with Server-Sent Events, ideal for remote connections.
3.  **`streamable-http`**: Optimized HTTP transport with full CORS and authentication support, perfect for building Web UIs on top of your MCP server.
4.  **`websocket`**: Standard WebSocket transport for real-time bidirectional communication.

#### Multi-Transport Support

You can define the transports directly in the `.withMcp()` settings, or override them via the `--s-mcp-transport(s)` flags.

```bash
# Single transport
my-tool --s-mcp-serve --s-mcp-transport stdio

# Multiple transports via JSON
my-tool --s-mcp-serve --s-mcp-transports '[{"type":"stdio"},{"type":"sse","port":3001}]'

# Single transport with custom options
my-tool --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3000 --s-mcp-host 0.0.0.0

# Streamable HTTP CORS/auth via CLI flags (JSON strings)
my-tool --s-mcp-serve \
  --s-mcp-transport streamable-http \
  --s-mcp-port 3002 --s-mcp-path /api/mcp \
  --s-mcp-cors '{"origins":["http://localhost:5173"],"credentials":true,"methods":["GET","POST","OPTIONS"],"maxAge":600}' \
  --s-mcp-auth '{"required":true,"scheme":"jwt","jwt":{"algorithms":["HS256"],"secret":"$MY_JWT_SECRET"},"publicPaths":["/health"]}'
```

### CORS and Authentication for `streamable-http`

CORS is often required when connecting a Web UI to an MCP server over HTTP.

- **Programmatic transport config**:

```ts
import type { McpTransportConfig } from "@alcyone-labs/arg-parser";

const defaultTransports: McpTransportConfig[] = [
  {
    type: "streamable-http",
    port: 3002,
    path: "/api/mcp",
    cors: {
      origins: ["http://localhost:5173", /^https?:\/\/example\.com$/],
      methods: ["GET", "POST", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "MCP-Session-Id"],
      exposedHeaders: ["MCP-Session-Id"],
      credentials: true,
      maxAge: 600,
    },
    auth: {
      required: true,
      scheme: "jwt", // or "bearer"
      // JWT verification (HS256):
      // jwt: { algorithms: ["HS256"], secret: process.env.JWT_SECRET },
      publicPaths: ["/health"],
      validator: async (req, token) => true,
    },
  },
];
```

### MCP Logging Configuration

MCP server logging is handled via `@alcyone-labs/simple-mcp-logger`. You can control log levels, output destinations, and more.

#### Enhanced Logging

```typescript
const parser = ArgParser.withMcp({
  appName: "My MCP Server",
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    log: {
      level: "debug", // "debug" | "info" | "warn" | "error" | "silent"
      logToFile: "./logs/comprehensive.log",
      prefix: "MyServer",
      mcpMode: true, // MCP compliant (default)
    },
  },
});
```

### MCP Lifecycle Events

Support for `onInitialize`, `onInitialized`, and `onShutdown` events for setup and cleanup.

```typescript
 lifecycle: {
   onInitialize: async (ctx) => {
     // Perfect for database connections
     await connectToDatabase(ctx.getFlag("database_url"));
   },
   onShutdown: async (ctx) => {
     // Graceful cleanup
     await closeDatabase();
   }
 }
```

### MCP Resources

Enable real-time, subscription-based data feeds.

```typescript
.addMcpResource({
  name: "recent-data",
  uriTemplate: "data://recent",
  title: "Recent Data",
  handler: async (uri) => {
    const data = await getRecentData();
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(data),
        mimeType: "application/json"
      }]
    };
  }
});
```

### Generating DXT Packages (`--s-build-dxt`)

A Desktop Extension (`.dxt`) is a standardized package for installing your tools into Claude Desktop.

```bash
# Generate the DXT package folder
my-cli --s-build-dxt ./my-dxt-package

# (Optional) Pack into a .dxt file
npx @anthropic-ai/dxt pack ./my-dxt-package
```

### Logo and Assets

You can customize the icon shown in Claude Desktop:

```typescript
serverInfo: {
  name: "my-mcp",
  version: "1.0.0",
  logo: "./assets/icon.png", // Local file or URL
}
```

Include additional files (DBs, templates):

```typescript
dxt: {
  include: ["migrations", { from: "config/prod.json", to: "config.json" }],
}
```

### DXT Bundling Strategies

1.  **Standard**: For pure JS/TS projects (Fast, small).
2.  **Native Dependencies**: Use `--s-with-node-modules` for projects with binaries (SQLite, Sharp, ONNX).

```bash
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
your-cli --s-build-dxt ./dxt --s-with-node-modules
```

---

> **💡 Note**: For a full list of system flags and advanced configuration, see the [System Flags](../README.md#system-flags--configuration) section in the README.
