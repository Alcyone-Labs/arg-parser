# Migration Guide: v2.x to v3.0.0

## Overview

ArgParser v3.0.0 introduces a plugin-based architecture. The monolithic package has been split into separate packages:

- `@alcyone-labs/arg-parser` - Core CLI parsing (v3.0.0)
- `@alcyone-labs/arg-parser-mcp` - MCP server functionality (v1.0.0)
- `@alcyone-labs/arg-parser-dxt` - DXT package generation (v1.0.0)
- `@alcyone-labs/arg-parser-tui` - OpenTUI integration (v1.0.0)

## Breaking Changes

### 1. Package Structure

**Before (v2.x):**
```bash
npm install @alcyone-labs/arg-parser
```

**After (v3.0.0):**
```bash
# Core only
npm install @alcyone-labs/arg-parser

# With MCP
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp

# With MCP + DXT
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp @alcyone-labs/arg-parser-dxt

# With TUI
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-tui @opentui/core @opentui/solid
```

### 2. MCP Usage

**Before (v2.x):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => ({ result: 'success' })
})
  .addMcpSubCommand('serve', {
    name: 'my-server',
    version: '1.0.0'
  });
```

**After (v3.0.0):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

const parser = new ArgParser({
  appName: 'my-cli',
  handler: async (ctx) => ({ result: 'success' })
})
  .use(mcpPlugin({
    serverInfo: {
      name: 'my-server',
      version: '1.0.0'
    }
  }));
```

### 3. DXT Usage

**Before (v2.x):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({...})
  .addMcpSubCommand('serve', {...});
  // DXT was built-in
```

**After (v3.0.0):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';

const parser = new ArgParser({...})
  .use(mcpPlugin({...}))
  .use(dxtPlugin());
```

### 4. TUI Usage

**Before (v2.x):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { createTuiApp } from '@alcyone-labs/arg-parser/tui';
```

**After (v3.0.0):**
```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { tuiPlugin, createTuiApp } from '@alcyone-labs/arg-parser-tui';

const parser = new ArgParser({...})
  .use(tuiPlugin());
```

## Benefits of v3.0.0

1. **Smaller Bundle Size**: Install only what you need
   - Core: ~50KB (was ~500KB)
   - No unused dependencies

2. **Faster Installation**: Only download features you use

3. **Better Tree Shaking**: Each package is optimized independently

4. **Independent Versioning**: Each plugin can evolve separately

5. **Plugin Ecosystem**: Easy to create and share custom plugins

## Migration Checklist

- [ ] Identify which features you use (MCP, DXT, TUI)
- [ ] Install the corresponding plugin packages
- [ ] Replace `addMcpSubCommand()` with `.use(mcpPlugin())`
- [ ] Add `.use(dxtPlugin())` if using DXT generation
- [ ] Add `.use(tuiPlugin())` if using TUI
- [ ] Update import statements
- [ ] Test your application

## Backward Compatibility

There is no backward compatibility layer. v3.0.0 is a breaking change requiring code updates.

If you need to stay on v2.x temporarily:
```bash
npm install @alcyone-labs/arg-parser@^2.14.0
```

## Getting Help

- Read the [Plugin Architecture Plan](./specs/PLUGIN_ARCHITECTURE_PLAN.md)
- Check package READMEs in the monorepo
- Open an issue on GitHub
