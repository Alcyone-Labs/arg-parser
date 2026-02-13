# Arg-Parser Plugin Architecture Migration Plan

## Executive Summary

This document outlines a comprehensive plan to break the monolithic `@alcyone-labs/arg-parser` package into a modular plugin-based architecture. The goal is to make MCP, DXT, and OpenTUI features optional plugins that users can install separately, reducing the core package size and dependency footprint.

## Current State Analysis

### Package Structure

The current package (`@alcyone-labs/arg-parser@2.14.2`) is a monolithic library containing:

**Core Features:**

- CLI argument parsing (`ArgParserBase`, `ArgParser`)
- Flag management (`FlagManager`)
- Interactive prompts (`PromptManager`, `@clack/prompts`)
- Configuration plugins (JSON, optional YAML/TOML)

**MCP Features (tightly coupled):**

- MCP server creation (`ArgParserMcp`)
- Tool generation from CLI structure
- MCP protocol support (`@modelcontextprotocol/sdk`)
- Resources, prompts, lifecycle management

**DXT Features (depends on MCP):**

- DXT package generation (`DxtGenerator`)
- Bundling with `tsdown`
- Logo and manifest handling

**TUI Features (peer dependencies):**

- OpenTUI integration (`@opentui/core`, `@opentui/solid`)
- SolidJS-based components
- Terminal UI framework

### Dependency Analysis

**Current Required Dependencies:**

```json
{
  "@alcyone-labs/simple-chalk": "^1.0.2",
  "@alcyone-labs/simple-mcp-logger": "^1.2.1",
  "@clack/prompts": "^1.0.0",
  "@modelcontextprotocol/sdk": "^1.25.3", // <-- Heavy, not always needed
  "get-tsconfig": "^4.13.1",
  "magic-regexp": "^0.10.0",
  "solid-js": "^1.9.11", // <-- Only for TUI
  "zod": "^4.3.6"
}
```

**Current Peer Dependencies:**

```json
{
  "@opentui/core": ">=0.1.67",
  "@opentui/solid": ">=0.1.67"
}
```

**Problem:** `@modelcontextprotocol/sdk` and `solid-js` are always installed even if users only want basic CLI parsing.

## Target Architecture

### Monorepo Structure

```
arg-parser/
├── packages/
│   ├── core/                    # @alcyone-labs/arg-parser
│   ├── mcp/                     # @alcyone-labs/arg-parser-mcp
│   ├── dxt/                     # @alcyone-labs/arg-parser-dxt
│   └── tui/                     # @alcyone-labs/arg-parser-tui
├── pnpm-workspace.yaml
└── package.json                 # Root workspace config
```

### Package Breakdown

#### 1. @alcyone-labs/arg-parser (Core)

**Purpose:** Pure CLI argument parsing with zero heavy dependencies

**Contains:**

- `ArgParserBase` - Base parsing functionality
- `FlagManager` - Flag definition and validation
- `PromptManager` - Interactive prompts via `@clack/prompts`
- Config plugin system (JSON, with optional YAML/TOML)
- Plugin registration API
- All core types and utilities

**Dependencies:**

```json
{
  "@alcyone-labs/simple-chalk": "^1.0.2",
  "@clack/prompts": "^1.0.0",
  "magic-regexp": "^0.10.0",
  "zod": "^4.3.6"
}
```

**Size Impact:** ~50KB vs current ~500KB+

#### 2. @alcyone-labs/arg-parser-mcp

**Purpose:** MCP server functionality as a plugin

**Contains:**

- `McpPlugin` class implementing `IArgParserPlugin`
- `ArgParserMcp` (optional wrapper)
- MCP integration utilities
- Tool generation from CLI
- Resources, prompts, lifecycle management

**Dependencies:**

```json
{
  "@alcyone-labs/arg-parser": "workspace:*",
  "@alcyone-labs/simple-mcp-logger": "^1.2.1",
  "@modelcontextprotocol/sdk": "^1.25.3"
}
```

**Usage:**

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

const parser = new ArgParser({...})
  .use(mcpPlugin({
    serverInfo: { name: 'my-server', version: '1.0.0' }
  }));
```

#### 3. @alcyone-labs/arg-parser-dxt

**Purpose:** DXT package generation for Claude Desktop

**Contains:**

- `DxtPlugin` class
- `DxtGenerator`
- DXT path resolver utilities
- Bundling integration

**Dependencies:**

```json
{
  "@alcyone-labs/arg-parser": "workspace:*",
  "@alcyone-labs/arg-parser-mcp": "workspace:*",
  "get-tsconfig": "^4.13.1",
  "tsdown": "^0.20.1"
}
```

**Usage:**

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';

const parser = new ArgParser({...})
  .use(mcpPlugin({...}))
  .use(dxtPlugin());
```

#### 4. @alcyone-labs/arg-parser-tui

**Purpose:** OpenTUI-based terminal UI framework

**Contains:**

- All TUI components
- Layout templates
- Hooks and utilities
- Theme system

**Dependencies:**

```json
{
  "@alcyone-labs/arg-parser": "workspace:*",
  "solid-js": "^1.9.11"
},
"peerDependencies": {
  "@opentui/core": ">=0.1.67",
  "@opentui/solid": ">=0.1.67"
}
```

**Usage:**

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { tuiPlugin } from '@alcyone-labs/arg-parser-tui';

const parser = new ArgParser({...})
  .use(tuiPlugin());
```

## Plugin System Design

### Core Plugin Interface

```typescript
// packages/core/src/plugin/types.ts

/**
 * Plugin interface for extending ArgParser functionality
 */
export interface IArgParserPlugin {
  /** Unique plugin identifier */
  readonly name: string;

  /** Plugin version */
  readonly version?: string;

  /**
   * Install the plugin into an ArgParser instance
   * @param parser - The ArgParser instance to extend
   * @returns The modified parser or void
   */
  install<T>(parser: ArgParserBase<T>): ArgParserBase<T> | void;

  /**
   * Optional cleanup when parser is destroyed
   */
  destroy?(): void;
}

/**
 * Plugin metadata for introspection
 */
export interface IPluginMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

/**
 * Plugin registry for managing installed plugins
 */
export class PluginRegistry {
  private plugins = new Map<string, IArgParserPlugin>();

  register(plugin: IArgParserPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin '${plugin.name}' is already registered`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
  }

  get(name: string): IArgParserPlugin | undefined {
    return this.plugins.get(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Global registry instance
export const globalPluginRegistry = new PluginRegistry();
```

### Plugin Installation API

```typescript
// packages/core/src/core/ArgParserBase.ts

export class ArgParserBase<THandlerReturn = any> {
  private _plugins = new Map<string, IArgParserPlugin>();
  private _pluginRegistry: PluginRegistry;

  /**
   * Install a plugin into this ArgParser instance
   * @param plugin - The plugin to install
   * @returns This ArgParser instance for chaining
   */
  use(plugin: IArgParserPlugin): this {
    if (this._plugins.has(plugin.name)) {
      throw new Error(
        `Plugin '${plugin.name}' is already installed on this parser`,
      );
    }

    // Install the plugin
    const result = plugin.install(this);

    // Track installed plugin
    this._plugins.set(plugin.name, plugin);

    // Return this for chaining (or the result if plugin returns a new instance)
    return (result as any) || this;
  }

  /**
   * Check if a plugin is installed
   */
  hasPlugin(name: string): boolean {
    return this._plugins.has(name);
  }

  /**
   * Get an installed plugin
   */
  getPlugin(name: string): IArgParserPlugin | undefined {
    return this._plugins.get(name);
  }

  /**
   * List all installed plugins
   */
  listPlugins(): string[] {
    return Array.from(this._plugins.keys());
  }
}
```

### MCP Plugin Implementation

```typescript
// packages/mcp/src/McpPlugin.ts

import type { ArgParserBase, IArgParserPlugin } from "@alcyone-labs/arg-parser";
import type { McpServerOptions, ToolConfig } from "./types";

export interface IMcpPluginOptions {
  serverInfo: DxtServerInfo;
  defaultTransports?: McpTransportConfig[];
  toolOptions?: GenerateMcpToolsOptions;
  log?: string | McpLoggerOptions;
  lifecycle?: McpLifecycleEvents;
  dxt?: DxtOptions;
}

/**
 * MCP Plugin for ArgParser
 * Adds MCP server capabilities to any ArgParser instance
 */
export class McpPlugin implements IArgParserPlugin {
  readonly name = "mcp";
  readonly version = "2.0.0";

  private options: IMcpPluginOptions;
  private _tools = new Map<string, ToolConfig>();
  private _mcpTools = new Map<string, McpToolConfig>(); // Legacy
  private _mcpServerConfig?: McpServerOptions;

  constructor(options: IMcpPluginOptions) {
    this.options = options;
    this._mcpServerConfig = {
      serverInfo: options.serverInfo,
      defaultTransports: options.defaultTransports,
      toolOptions: options.toolOptions,
      log: options.log,
      lifecycle: options.lifecycle,
      dxt: options.dxt,
    };
  }

  install<T>(parser: ArgParserBase<T>): ArgParserBase<T> {
    // Extend the parser with MCP methods
    const extendedParser = parser as ArgParserBase<T> & IMcpMethods;

    // Bind MCP methods
    extendedParser.addTool = this.addTool.bind(this);
    extendedParser.addMcpTool = this.addMcpTool.bind(this);
    extendedParser.createMcpServer = this.createMcpServer.bind(this);
    extendedParser.toMcpTools = this.toMcpTools.bind(this);
    extendedParser.getMcpServerConfig = () => this._mcpServerConfig;
    extendedParser.getTools = () => new Map(this._tools);
    extendedParser.getMcpTools = () => new Map(this._mcpTools);
    extendedParser.getToolInfo = this.getToolInfo.bind(this);
    extendedParser.validateToolRouting = this.validateToolRouting.bind(this);
    extendedParser.testMcpToolRouting = this.testMcpToolRouting.bind(this);

    // Add MCP subcommand automatically
    this.addMcpSubCommand(extendedParser);

    return extendedParser;
  }

  private addTool(toolConfig: ToolConfig): void {
    // Implementation from current ArgParser.ts
  }

  private async createMcpServer(
    serverInfo?: DxtServerInfo,
    toolOptions?: GenerateMcpToolsOptions,
  ): Promise<any> {
    // Implementation from current ArgParser.ts
    const { McpServer } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    // ... rest of implementation
  }

  // ... other methods from current ArgParser.ts
}

/**
 * Factory function for creating MCP plugin
 */
export function mcpPlugin(options: IMcpPluginOptions): McpPlugin {
  return new McpPlugin(options);
}

/**
 * Type augmentation for TypeScript support
 */
export interface IMcpMethods {
  addTool(toolConfig: ToolConfig): this;
  addMcpTool(toolConfig: McpToolConfig): this;
  createMcpServer(serverInfo?: DxtServerInfo, toolOptions?: any): Promise<any>;
  toMcpTools(options?: any): IMcpToolStructure[];
  getMcpServerConfig(): McpServerOptions | undefined;
  getTools(): Map<string, ToolConfig>;
  getMcpTools(): Map<string, McpToolConfig>;
  getToolInfo(options?: any): any;
  validateToolRouting(): any;
  testMcpToolRouting(toolName: string, args?: any): Promise<any>;
}

// Type augmentation for users
declare module "@alcyone-labs/arg-parser" {
  interface ArgParserBase<T> extends IMcpMethods {}
}
```

## Migration Strategy

### Phase 1: Setup Monorepo Structure (Week 1)

1. **Create workspace configuration:**

   ```yaml
   # pnpm-workspace.yaml
   packages:
     - "packages/*"
   ```

2. **Create root package.json:**

   ```json
   {
     "name": "@alcyone-labs/arg-parser-workspace",
     "private": true,
     "workspaces": ["packages/*"],
     "scripts": {
       "build": "pnpm -r build",
       "test": "pnpm -r test",
       "lint": "pnpm -r lint",
       "changeset": "changeset",
       "version-packages": "changeset version",
       "release": "pnpm build && changeset publish"
     },
     "devDependencies": {
       "@changesets/cli": "^2.27.0"
     }
   }
   ```

3. **Create shared configurations:**
   - `tsconfig.base.json` - Shared TypeScript config
   - Build scripts and tooling

### Phase 2: Extract Core Package (Week 2)

1. **Create `packages/core/`:**

   ```
   packages/core/
   ├── src/
   │   ├── core/
   │   │   ├── ArgParserBase.ts
   │   │   ├── FlagManager.ts
   │   │   ├── PromptManager.ts
   │   │   ├── types.ts
   │   │   └── log-path-utils.ts
   │   ├── config/
   │   │   └── plugins/
   │   ├── plugin/
   │   │   ├── types.ts
   │   │   └── registry.ts
   │   ├── utils/
   │   │   └── debug-utils.ts
   │   └── index.ts
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. **Migrate core code:**
   - Copy `ArgParserBase.ts` without MCP methods
   - Copy all core types
   - Remove MCP/DXT/TUI imports
   - Add plugin system

3. **Update dependencies:**
   - Remove `@modelcontextprotocol/sdk`
   - Remove `solid-js`
   - Keep only core dependencies

### Phase 3: Create MCP Package (Week 3)

1. **Create `packages/mcp/`:**
   - Extract all MCP code from current `ArgParser.ts`
   - Implement `McpPlugin` class
   - Move `@modelcontextprotocol/sdk` dependency

2. **Key migrations:**

   ```typescript
   // Before (current ArgParser.ts)
   export class ArgParser<T> extends ArgParserBase<T> {
     private _mcpTools = new Map();

     addTool(config: ToolConfig): this {
       // ... implementation
     }

     async createMcpServer(): Promise<any> {
       // ... implementation
     }
   }

   // After (packages/mcp/src/McpPlugin.ts)
   export class McpPlugin implements IArgParserPlugin {
     install<T>(parser: ArgParserBase<T>) {
       // Extend parser with MCP methods
       (parser as any).addTool = (config: ToolConfig) => {
         // ... implementation
       };
     }
   }
   ```

### Phase 4: Create DXT Package (Week 4)

1. **Create `packages/dxt/`:**
   - Extract `DxtGenerator.ts`
   - Implement `DxtPlugin` class
   - Move `tsdown` dependency

2. **Integration with MCP:**
   - DXT plugin depends on MCP plugin
   - Check for MCP plugin installation

### Phase 5: Create TUI Package (Week 5)

1. **Create `packages/tui/`:**
   - Move all TUI code from `src/tui/`
   - Keep `@opentui/*` as peer dependencies
   - Implement `TuiPlugin` class

### Phase 6: Testing & Migration Guide (Week 6)

1. **Comprehensive testing:**
   - Unit tests for each package
   - Integration tests for plugin combinations
   - Backward compatibility tests

2. **Create migration guide:**

   ````markdown
   # Migration Guide: v2 to v3

   ## Before (v2)

   ```typescript
   import { ArgParser } from '@alcyone-labs/arg-parser';

   const parser = new ArgParser({...})
     .addMcpSubCommand('serve', {...});
   ```
   ````

   ## After (v3)

   ```typescript
   import { ArgParser } from '@alcyone-labs/arg-parser';
   import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';

   const parser = new ArgParser({...})
     .use(mcpPlugin({...}));
   ```

   ```

   ```

3. **Version strategy:**
   - Core: v3.0.0 (breaking change)
   - MCP: v1.0.0 (new package)
   - DXT: v1.0.0 (new package)
   - TUI: v1.0.0 (new package)

## Dependency Graph

```
                    User Application
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  arg-parser  │  │arg-parser-mcp│  │ arg-parser-  │
│    (core)    │  │              │  │     tui      │
└──────────────┘  └──────────────┘  └──────────────┘
        ▲                  │
        │                  ▼
        │         ┌──────────────┐
        │         │arg-parser-dxt│
        │         │              │
        │         └──────────────┘
        │
        └──────────────────────────────┐
                                       │
    ┌──────────────────────────────────┼──┐
    │                                  │  │
    ▼                                  ▼  ▼
┌─────────┐  ┌──────────────┐  ┌─────────┴─────┐
│  zod    │  │@modelcontext-│  │ @opentui/core │
│         │  │protocol/sdk  │  │@opentui/solid │
└─────────┘  └──────────────┘  └───────────────┘
```

## Benefits

### For Users:

1. **Smaller installs:** Core package is ~90% smaller
2. **No unused dependencies:** Only install what you need
3. **Faster builds:** Less code to parse and bundle
4. **Clearer dependencies:** Explicit feature dependencies

### For Maintainers:

1. **Independent versioning:** Each package versions separately
2. **Isolated testing:** Test features independently
3. **Clear boundaries:** Easier to understand and maintain
4. **Community contributions:** Easier for others to contribute to specific features

### Example Install Scenarios:

**Basic CLI only:**

```bash
npm install @alcyone-labs/arg-parser
# Installs: ~5 dependencies, ~50KB
```

**CLI + MCP:**

```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-mcp
# Installs: ~15 dependencies, ~200KB
```

**Full stack (CLI + MCP + DXT + TUI):**

```bash
npm install @alcyone-labs/arg-parser \
            @alcyone-labs/arg-parser-mcp \
            @alcyone-labs/arg-parser-dxt \
            @alcyone-labs/arg-parser-tui
# Installs: ~25 dependencies, ~500KB
```

## Risks and Mitigation

### Risk 1: Breaking Changes

**Impact:** High  
**Mitigation:**

- Clear migration guide
- Codemod script for automatic migration
- Deprecation warnings in v2.x
- Backward compatibility layer (optional)

### Risk 2: Plugin API Complexity

**Impact:** Medium  
**Mitigation:**

- Well-documented plugin interface
- Helper utilities for common patterns
- TypeScript type augmentation support

### Risk 3: Version Compatibility

**Impact:** Medium  
**Mitigation:**

- Semantic versioning
- Peer dependency constraints
- Automated testing across version combinations

### Risk 4: Documentation Overhead

**Impact:** Low  
**Mitigation:**

- Centralized documentation site
- Clear package READMEs
- Interactive examples

## Success Metrics

1. **Bundle Size:** Core package < 100KB (currently ~500KB)
2. **Install Time:** Core package < 2s (currently ~10s)
3. **Dependency Count:** Core package < 10 deps (currently ~15)
4. **Adoption:** 80% of users migrated within 3 months
5. **Satisfaction:** No major complaints about breaking changes

## Timeline

| Phase      | Duration    | Deliverables                |
| ---------- | ----------- | --------------------------- |
| 1. Setup   | 1 week      | Monorepo structure, tooling |
| 2. Core    | 1 week      | Core package extracted      |
| 3. MCP     | 1 week      | MCP package created         |
| 4. DXT     | 1 week      | DXT package created         |
| 5. TUI     | 1 week      | TUI package created         |
| 6. Testing | 1 week      | Tests, migration guide      |
| **Total**  | **6 weeks** | **Complete migration**      |

## Next Steps

1. **Review this plan** with stakeholders
2. **Create proof of concept** (Phase 1-2)
3. **Test with real applications** (dogfooding)
4. **Iterate on plugin API** based on feedback
5. **Execute full migration** plan

---

_Document Version: 1.0_  
_Last Updated: 2026-02-05_
