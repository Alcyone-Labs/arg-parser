# Test Migration Plan for v3.0.0

## Current State

- **Total test files**: ~40 files
- **Total test lines**: ~19,000 lines
- **Current structure**: All tests in `/tests/` directory at root
- **Current imports**: `import { ... } from "../src"`

## The Challenge

The existing tests are tightly coupled to the monolithic architecture:

```typescript
// Old (v2.x) - Everything from one package
import { ArgParser, ArgParserMcp } from "../src";

const parser = new ArgParser({...})
  .addMcpSubCommand('serve', {...});  // Direct method
```

```typescript
// New (v3.0) - Plugin-based
import { ArgParser } from "@alcyone-labs/arg-parser";
import { mcpPlugin } from "@alcyone-labs/arg-parser-mcp";

const parser = new ArgParser({...})
  .use(mcpPlugin({...}));  // Plugin-based
```

## Migration Strategy

### Phase 1: Reorganize Test Structure

Move tests to package directories:

```
packages/
  core/
    src/
    tests/
      ├── ArgParser.test.ts
      ├── FlagManager.test.ts
      ├── PromptManager.test.ts
      └── core/
          ├── flag-types-consolidated.test.ts
          ├── working-directory.test.ts
          └── ...
  
  mcp/
    src/
    tests/
      ├── McpPlugin.test.ts
      ├── mcp-integration.test.ts
      ├── mcp-resources.test.ts
      └── mcp/
          └── integration/
  
  dxt/
    src/
    tests/
      ├── DxtPlugin.test.ts
      ├── DxtGenerator.test.ts
      └── dxt/
  
  tui/
    src/
    tests/
      └── TuiPlugin.test.ts
```

### Phase 2: Update Imports

**Core Package Tests:**
```typescript
// Before
import { ArgParser, ArgParserError } from "../src";

// After
import { ArgParser, ArgParserError } from "../src/index.js";
```

**MCP Plugin Tests:**
```typescript
// Before
import { ArgParser } from "../../src";

// After
import { ArgParser } from "@alcyone-labs/arg-parser";
import { mcpPlugin } from "../src/index.js";
```

### Phase 3: Rewrite Test Logic

**High-Rewrite Tests (~60-80% changes):**

1. **MCP Tests** - Complete API change
   - `addMcpSubCommand()` → `.use(mcpPlugin())`
   - `createMcpServer()` now async via plugin
   - Tool registration changes

2. **Unified Tool Tests** - New architecture
   - `addTool()` instead of separate CLI/MCP methods
   - Tool execution context changes

**Medium-Rewrite Tests (~30-50% changes):**

3. **Flag Management Tests** - Mostly intact
   - Import changes only
   - Core logic unchanged

4. **Configuration Tests** - Moderate changes
   - Some config moved to plugins

**Low-Rewrite Tests (~10-20% changes):**

5. **Basic Parsing Tests** - Minimal changes
   - Import updates only
   - Test logic stays the same

6. **Type Tests** - Mostly unchanged
   - Type definitions moved but logic same

## Specific Test Files Analysis

### Critical Tests (Must migrate first)

| File | Lines | Rewrite % | Notes |
|------|-------|-----------|-------|
| ArgParser.test.ts | 533 | 30% | Core parsing - mostly imports |
| flag-types-consolidated.test.ts | ~500 | 20% | Type tests - minimal changes |
| unified-tools.test.ts | ~400 | 70% | Major API changes |
| mcp-tool-name-sanitization.test.ts | ~300 | 60% | New plugin API |
| interactive-prompts.test.ts | ~500 | 40% | Some integration changes |

### MCP Tests (Major rewrite)

| File | Lines | Rewrite % | Notes |
|------|-------|-----------|-------|
| mcp/*.test.ts | ~3000 | 70% | New plugin architecture |
| mcp/integration/* | ~2000 | 80% | Complete restructuring |

### DXT Tests (Moderate rewrite)

| File | Lines | Rewrite % | Notes |
|------|-------|-----------|-------|
| dxt/*.test.ts | ~1000 | 50% | Plugin-based DXT |

## Test Migration Priority

### P0 (Critical Path)
1. Core ArgParser parsing tests
2. Flag management tests
3. Basic plugin functionality tests

### P1 (Important)
4. MCP plugin integration tests
5. DXT generation tests
6. Configuration management tests

### P2 (Nice to have)
7. TUI component tests
8. Edge case tests
9. Performance tests

## Effort Estimate

- **Test reorganization**: 2-3 days
- **Import updates**: 1-2 days
- **Logic rewrites**: 5-7 days
- **New plugin tests**: 3-4 days
- **Integration tests**: 2-3 days

**Total**: ~2-3 weeks of focused effort

## Recommended Approach

1. **Don't migrate all at once** - Start with core package tests
2. **Create test utilities** - Shared test helpers for plugin testing
3. **Maintain v2 tests temporarily** - Keep old tests until v3 is stable
4. **Write new tests first** - TDD approach for new plugin functionality
5. **Gradual migration** - Migrate test files as features are ported

## Test Utilities Needed

```typescript
// packages/core/tests/utils/test-helpers.ts
export function createTestParser(options = {}) {
  return new ArgParser({
    appName: 'test-cli',
    autoExit: false,
    ...options
  });
}

// packages/mcp/tests/utils/mcp-test-helpers.ts
export function createTestMcpPlugin(options = {}) {
  return mcpPlugin({
    serverInfo: {
      name: 'test-server',
      version: '1.0.0'
    },
    ...options
  });
}
```

## Key Changes Summary

### API Changes Requiring Test Updates

1. **Plugin Installation**
   ```typescript
   // Old
   parser.addMcpSubCommand('serve', config);
   
   // New
   parser.use(mcpPlugin(config));
   ```

2. **Tool Registration**
   ```typescript
   // Old
   parser.addMcpTool(toolConfig);
   parser.addCliCommand(commandConfig);
   
   // New
   parser.use(mcpPlugin()).addTool(unifiedToolConfig);
   ```

3. **Server Creation**
   ```typescript
   // Old
   const server = parser.createMcpServer();
   
   // New
   const server = await parser.createMcpServer(); // Via plugin
   ```

4. **DXT Building**
   ```typescript
   // Old
   parser.buildDxt(outputDir);
   
   // New
   parser.use(dxtPlugin()).buildDxt(outputDir);
   ```

## Conclusion

The test migration is **substantial but manageable**. The core test logic is sound - it's primarily:
- Import path changes
- API method renames
- Plugin setup/teardown
- Async handling for plugin initialization

**Recommendation**: Start with core package tests, then migrate plugin tests incrementally as each plugin is fully implemented.
