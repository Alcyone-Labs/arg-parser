# @alcyone-labs/arg-parser-mcp

MCP (Model Context Protocol) plugin for @alcyone-labs/arg-parser.

## Installation

```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp
```

## Quick Start

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => ({ result: 'success' })
})
  .use(mcpPlugin({
    serverInfo: {
      name: 'my-mcp-server',
      version: '1.0.0',
      description: 'My MCP server'
    }
  }));

await parser.parse();
```

## Features

- Expose CLI tools as MCP tools
- Support for stdio, SSE, and streamable HTTP transports
- Automatic tool schema generation from flags
- Resource and prompt management
- Lifecycle event handling

## API

### mcpPlugin(options)

Creates an MCP plugin instance.

#### Options

- `serverInfo` (required): Server metadata
  - `name`: Server name
  - `version`: Server version
  - `description`: Server description
- `defaultTransports`: Array of transport configurations
- `toolOptions`: Tool generation options
- `log`: Logger configuration
- `lifecycle`: Lifecycle event handlers
- `dxt`: DXT package configuration

### Methods Added to ArgParser

After installing the plugin, your ArgParser instance will have these additional methods:

- `addTool(config)`: Add a unified CLI/MCP tool
- `createMcpServer()`: Create an MCP server instance
- `toMcpTools()`: Generate MCP tools from parser structure

## License

MIT
