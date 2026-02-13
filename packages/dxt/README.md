# @alcyone-labs/arg-parser-dxt

DXT (Desktop Extension) plugin for @alcyone-labs/arg-parser.

## Installation

```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp @alcyone-labs/arg-parser-dxt
```

## Quick Start

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';

const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => ({ result: 'success' })
})
  .use(mcpPlugin({
    serverInfo: {
      name: 'my-server',
      version: '1.0.0'
    }
  }))
  .use(dxtPlugin({
    outputDir: './dist/dxt',
    include: ['assets', 'config.json']
  }));

await parser.parse();
```

## Building DXT Packages

Run your CLI with the `--s-build-dxt` flag:

```bash
node my-cli.js --s-build-dxt ./dist/dxt
```

## Options

- `outputDir`: Output directory for DXT package (default: './dxt')
- `include`: Additional files to include in the package
- `withNodeModules`: Whether to include node_modules (default: false)

## License

MIT
