# Environment Variables in ArgParser

This document explains how environment variables work in the ArgParser library, including flag inheritance, resolution priority, and the issues with MCP/DXT contexts.

## Architecture Overview

### Core Components

1. **ArgParser.withMcp()** - Factory method that creates MCP-compatible CLI parsers
2. **IFlag Interface** - Flag definitions with `env` property for environment variable mapping
3. **FlagManager** - Manages flag storage and retrieval
4. **Flag Resolution Chain** - Priority order: CLI flag > ENV variable > default value
5. **Flag Inheritance** - Child parsers inherit flags from parent parsers

### File Structure

```
src/
├── core/
│   ├── ArgParser.ts          # Main ArgParser class with withMcp()
│   ├── ArgParserBase.ts      # Base parsing logic and flag resolution
│   ├── FlagManager.ts        # Flag storage and management
│   └── types.ts              # IFlag interface and type definitions
├── mcp/
│   ├── ArgParserMcp.ts       # MCP-optimized parser (no config files)
│   └── mcp-lifecycle.ts      # MCP context and getFlag() method
└── config/
    └── ConfigurationManager.ts # Environment file loading (.env, etc.)
```

## How It Should Work

### 1. Root Parser with Inherited Flags

```typescript
const rootParser = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "my-cli",
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" }
  }
})
.addFlag({
  name: "database_url",
  description: "Database connection string",
  options: ["--db-url"],
  env: "DATABASE_URL",        // Maps to process.env.DATABASE_URL
  type: "string",
  defaultValue: ""
})
.addFlag({
  name: "verbose",
  description: "Enable verbose logging",
  options: ["--verbose", "-v"],
  env: "VERBOSE",
  type: "boolean",
  flagOnly: true,
  defaultValue: false
});
```

### 2. Flag Inheritance

Child parsers inherit parent flags by default (when `inheritParentFlags: true`):

```typescript
rootParser.addSubCommand({
  name: "migrate",
  description: "Run database migrations",
  inheritParentFlags: true,    // Inherits --db-url and --verbose
  handler: async (ctx) => {
    // ctx.getFlag("database_url") should work here
    const dbUrl = ctx.getFlag("database_url");
    const verbose = ctx.getFlag("verbose");
  }
});
```

### 3. Flag Resolution Priority

The intended priority order is:
1. **CLI Flag**: `--db-url postgresql://...`
2. **Environment Variable**: `process.env.DATABASE_URL`
3. **Default Value**: `defaultValue: ""`

### 4. Environment File Loading

ArgParser supports loading environment files via:
- `--s-with-env .env.local` (development)
- `--s-with-env .env.test` (testing)
- `--s-with-env .env` (production)

## Issues Identified and Resolved

### Issue 1: Context Mismatch ✅ **FIXED**

**Problem**: Two different context types existed with inconsistent `getFlag()` availability:
- `McpLifecycleBaseContext` - Had `getFlag()` method (lifecycle events only)
- `IHandlerContext` - **Missing `getFlag()` method** (regular handlers)

**Solution**: Extended `IHandlerContext` with optional `getFlag?: (name: string) => any` method for MCP mode.

### Issue 2: Missing Flag Resolution in Handler Contexts ✅ **FIXED**

**Problem**: Regular MCP handlers couldn't access flag resolution logic, forcing users to manually parse `process.argv`.

**Solution**: Implemented `getFlag` function in MCP handler context creation that:
1. Tries parsed arguments first (from MCP input)
2. Falls back to environment variables using `flagDef["env"]`
3. Falls back to default values using `flagDef["defaultValue"]`
4. Handles both `string` and `string[]` env types

### Issue 3: Environment Variables in DXT Context ⚠️ **PARTIALLY ADDRESSED**

**Problem**: In DXT packages running inside Claude Desktop, `process.env` doesn't contain expected environment variables.

**Root Cause**: DXT packages run in isolated contexts where:
- Local `.env` files are not loaded
- Parent process environment variables are not inherited
- Only explicitly set environment variables are available

**Status**: The flag resolution now properly handles missing environment variables by falling back to defaults, but environment variable loading in DXT contexts remains limited by the execution environment.

## Flag Resolution Implementation

The `getFlag()` method follows this priority chain:
1. **CLI Arguments**: Values from MCP tool input
2. **Environment Variables**: Using the `env` property from flag definitions
3. **Default Values**: Fallback to `defaultValue` from flag definitions

The `env` property supports both single environment variables (`string`) and multiple options (`string[]`).

## Current Status

The flag resolution system now works correctly across all contexts:

- ✅ **MCP Handler Context**: `ctx.getFlag()` available in MCP mode
- ✅ **Environment Variables**: Proper fallback to env vars when CLI flags not provided
- ✅ **Default Values**: Graceful fallback to defaults when neither CLI nor env available
- ✅ **Type Safety**: Handles both single and multiple environment variable configurations

### Usage Example

```typescript
// Clean, consistent API across all contexts
const dbUrl = ctx.getFlag("database_url") || "";
const verbose = ctx.getFlag("verbose") || false;
```

## Environment File Behavior by Context

### Development (Local) ✅
- Loads `.env.local` automatically via `--s-with-env`
- `process.env.DATABASE_URL` available
- CLI flags work correctly
- Full flag resolution chain functional

### MCP Inspector (Absolute Path) ✅
- No automatic `.env` loading (by design)
- Must manually set environment variables in inspector
- CLI flags now work correctly with implemented solution
- Flag resolution falls back to defaults when env vars missing

### DXT/Claude Desktop ✅
- Completely isolated environment (by design)
- No `.env` file access (security limitation)
- No parent environment inheritance (security limitation)
- CLI flags now work correctly via `ctx.getFlag()`
- Graceful fallback to default values when env vars unavailable

### Summary

The implemented solution ensures consistent behavior across all contexts:
- **CLI flags always work** regardless of environment
- **Environment variables work when available** (local dev, manually set)
- **Default values provide reliable fallback** in isolated contexts (DXT)
- **Clean API** eliminates context-specific workarounds

This provides a robust foundation for MCP-compatible CLIs that work reliably across development, testing, and production environments.
