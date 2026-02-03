# MCP Integration

Model Context Protocol server integration.

## Overview

Turn any CLI into an MCP server that AI tools can call.

## Setup

```typescript
const parser = new ArgParser({...})
  .withMcp({
    serverInfo: { 
      name: "my-cli", 
      version: "1.0.0" 
    },
    defaultTransport: { type: "stdio" }
  });
```

## Tools

Auto-generated from CLI flags:

```typescript
parser.addTool({
  name: "search",
  description: "Search items",
  flags: [...],
  handler: async (ctx) => ({ results: [] }),
  outputSchema: "successWithData"
});
```

## DXT Bundling

```typescript
.withMcp({
  dxt: { 
    include: ["config/", "assets/"],
    exclude: ["tests/"]
  }
})
```

See main SKILL.md for MCP workflow.
