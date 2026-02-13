# @alcyone-labs/arg-parser v3.0.0

A robust, type-safe CLI argument parser with plugin support.

## Installation

```bash
npm install @alcyone-labs/arg-parser
```

## Quick Start

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => {
    console.log('Hello', ctx.args.name);
  }
});

await parser.parse();
```

## Plugin System

ArgParser v3.0.0 introduces a plugin architecture. Install plugins to add functionality:

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

const parser = new ArgParser({...})
  .use(mcpPlugin({ serverInfo: { name: 'my-server', version: '1.0.0' } }));
```

### Available Plugins

- `@alcyone-labs/arg-parser-mcp` - MCP server functionality
- `@alcyone-labs/arg-parser-dxt` - DXT package generation
- `@alcyone-labs/arg-parser-tui` - Terminal UI with OpenTUI

## Migration from v2.x

See the [Migration Guide](../../docs/MIGRATION_V3.md) for details on upgrading from v2.x to v3.0.0.
