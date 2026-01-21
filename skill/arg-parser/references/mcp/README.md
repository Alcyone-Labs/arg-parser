# MCP Integration Reference

Everything about Model Context Protocol (MCP) integration in ArgParser.

## Overview

ArgParser provides first-class MCP support:

- Convert CLI tools to MCP tools automatically
- Run MCP servers with multiple transport types
- Protocol version compatibility
- Output schema support (MCP 2025-06-18+)
- Resources, prompts, and notifications

## When to Use

- Building MCP servers that expose CLI functionality
- Creating unified CLI/MCP tools (single definition for both)
- Running MCP servers with stdio, SSE, or HTTP transports
- Implementing MCP resources and prompts
- Handling MCP lifecycle events

## Decision Tree

```
Building MCP Server?
├─► YES: Using ArgParser?
│   ├─► NO: Start with ArgParser or ArgParserMcp
│   └─► YES: Continue below
│
├─► Need config plugins?
│   ├─► YES: Use ArgParser (includes all plugins)
│   └─► NO: Use ArgParserMcp (excludes plugins)
│
├─► Transport type?
│   ├─► Local IPC: Use "stdio"
│   ├─► HTTP SSE: Use "sse"
│   └─► HTTP Streamable: Use "streamable-http"
│
└─► Protocol version?
    ├─► 2024-11-05 (v1): Basic MCP support
    └─► 2025-06-18+ (v2): Output schemas, better validation
```

## Key Concepts

### Unified Tool API

Single `addTool()` definition works as both:

- CLI subcommand when running as CLI
- MCP tool when running as MCP server

### Transport Types

| Transport       | Use Case                           | Configuration          |
| --------------- | ---------------------------------- | ---------------------- |
| stdio           | Local MCP clients, CLI integration | No config needed       |
| sse             | HTTP-based SSE connections         | host, port, path       |
| streamable-http | Modern HTTP with streaming         | host, port, cors, auth |

### Protocol Versions

| Version    | Features                            |
| ---------- | ----------------------------------- |
| 2024-11-05 | Basic MCP protocol                  |
| 2025-06-18 | Output schemas, enhanced validation |

### Console Safety

In MCP mode:

- `console.log()` is hijacked
- Use `ctx.logger` for logging
- STDOUT reserved for MCP protocol

## Related Files

- `api.md` - Complete API reference
- `configuration.md` - Configuration schemas
- `patterns.md` - Implementation patterns
- `gotchas.md` - Common pitfalls
