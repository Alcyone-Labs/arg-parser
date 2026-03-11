# @alcyone-labs/arg-parser v3.0.0

A robust, type-safe CLI argument parser with plugin support.

> [!IMPORTANT]
> ArgParser v3 is a **breaking release**. If you're upgrading from v2.x, start with the [v2 → v3 migration guide](./docs/MIGRATION_V3.md).

## 🔄 Upgrading from v2.x

If you're coming from v2, this is the fastest migration path:

1. Keep `@alcyone-labs/arg-parser` for core parsing, then install the extra packages you actually use (`@alcyone-labs/arg-parser-mcp`, `@alcyone-labs/arg-parser-dxt`, `@alcyone-labs/arg-parser-tui`).
2. Replace built-in v2 MCP/DXT/TUI usage with the v3 plugin pattern via `.use(...)`.
3. Update `addMcpSubCommand()` calls to `mcpPlugin(...)` from `@alcyone-labs/arg-parser-mcp`.
4. Move feature-specific imports to their new packages, such as `createTuiApp` from `@alcyone-labs/arg-parser-tui`.

## 🚀 What's New in v3.0.0

ArgParser v3.0.0 introduces a **plugin-based architecture**! The monolithic package has been split into focused packages:

| Package | Purpose | Size |
|---------|---------|------|
| `@alcyone-labs/arg-parser` | Core CLI parsing | ~50KB |
| `@alcyone-labs/arg-parser-mcp` | MCP server functionality | +150KB |
| `@alcyone-labs/arg-parser-dxt` | DXT package generation | +100KB |
| `@alcyone-labs/arg-parser-tui` | Terminal UI (OpenTUI) | +200KB |

**Benefits:**
- ✅ Smaller installs - only include what you need
- ✅ Faster builds - no unused dependencies
- ✅ Better separation of concerns
- ✅ Independent versioning per feature

## 📦 Installation

### Core Only (CLI parsing)
```bash
npm install @alcyone-labs/arg-parser
```

### With MCP Support
```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp
```

### With MCP + DXT
```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp @alcyone-labs/arg-parser-dxt
```

### With TUI
```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-tui @opentui/core @opentui/solid
```

## 📝 Quick Start

### Basic CLI
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

### With MCP Plugin
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

const parser = new ArgParser({
  appName: 'my-mcp-server',
  handler: async (ctx) => ({ result: 'success' })
})
  .use(mcpPlugin({
    serverInfo: {
      name: 'my-server',
      version: '1.0.0',
      description: 'My MCP server'
    }
  }));

await parser.parse();
```

### With DXT Plugin
```typescript
import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';

const parser = new ArgParser({...})
  .use(mcpPlugin({...}))
  .use(dxtPlugin({
    outputDir: './dist/dxt',
    include: ['assets', 'config.json']
  }));

// Build DXT package with: --s-build-dxt
```

### With TUI Plugin
```tsx
import { tuiPlugin, createTuiApp } from '@alcyone-labs/arg-parser-tui';

const parser = new ArgParser({
  handler: async (ctx) => {
    await createTuiApp(
      () => <text>Hello TUI!</text>,
      { theme: 'dark' }
    );
  }
})
  .use(tuiPlugin({ theme: 'dark' }));
```

## 🔌 Plugin System

ArgParser v3.0.0 uses a plugin architecture:

```typescript
import { ArgParser, type IArgParserPlugin } from '@alcyone-labs/arg-parser';

const myPlugin = (options: any): IArgParserPlugin => ({
  name: 'my-plugin',
  version: '1.0.0',
  install(parser) {
    // Extend parser with custom functionality
    (parser as any).myMethod = () => {
      // Implementation
    };
  }
});

const parser = new ArgParser({...})
  .use(myPlugin({...}));
```

## 📚 Documentation

- [Migration Guide v2 → v3](./docs/MIGRATION_V3.md)
- [Plugin Architecture Plan](./docs/specs/PLUGIN_ARCHITECTURE_PLAN.md)
- [Core Package README](./packages/core/README.md)
- [MCP Package README](./packages/mcp/README.md)
- [DXT Package README](./packages/dxt/README.md)
- [TUI Package README](./packages/tui/README.md)

## 🔄 Migration from v2.x

See the [Migration Guide](./docs/MIGRATION_V3.md) for detailed instructions.

Quick summary:
1. Install the plugins you need
2. Replace `addMcpSubCommand()` with `.use(mcpPlugin())`
3. Add `.use(dxtPlugin())` for DXT support
4. Add `.use(tuiPlugin())` for TUI support

## 🛠️ Development

This is a monorepo using pnpm workspaces:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Test all packages
pnpm test

# Build specific package
pnpm build:core
pnpm build:mcp
pnpm build:dxt
pnpm build:tui
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.
