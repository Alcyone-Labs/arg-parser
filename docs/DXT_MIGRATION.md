# DXT Migration Guide

This guide helps you migrate existing ArgParser applications to use the new DXT functionality, including `dxtOptions`, DXT variables, and path handling improvements.

## Table of Contents

- [Migration Overview](#migration-overview)
- [Flag Migration](#flag-migration)
- [Path Handling Migration](#path-handling-migration)
- [MCP Configuration Migration](#mcp-configuration-migration)
- [Environment Variable Migration](#environment-variable-migration)
- [Testing Migration](#testing-migration)
- [Common Migration Patterns](#common-migration-patterns)

## Migration Overview

### What's New in v2.13.1

- **🎨 dxtOptions** - Rich UI types for DXT package generation
- **🔀 DXT Variables** - Dynamic path resolution with `${VARIABLE}` syntax
- **🛠️ Path Helpers** - Context-aware path resolution functions
- **🔍 Auto-Detection** - Automatic DXT vs development environment detection

### Backward Compatibility

✅ **All existing code continues to work unchanged**

- No breaking changes to existing APIs
- Optional `dxtOptions` property
- Existing flags work exactly as before
- Gradual migration is supported

## Flag Migration

### Basic Flag Enhancement

**Before:**

```typescript
parser.addFlag({
  name: "output-dir",
  description: "Output directory for generated files",
  type: "string",
});
```

**After:**

```typescript
parser.addFlag({
  name: "output-dir",
  description: "Output directory for generated files",
  type: "string",
  dxtOptions: {
    type: "directory",
    localDefault: "${DOCUMENTS}/myapp/output",
    title: "Output Directory",
  },
});
```

### File Input Migration

**Before:**

```typescript
parser.addFlag({
  name: "config",
  description: "Configuration file path",
  type: "string",
});
```

**After:**

```typescript
parser.addFlag({
  name: "config",
  description: "Configuration file path",
  type: "string",
  dxtOptions: {
    type: "file",
    localDefault: "${__dirname}/config.json",
  },
});
```

### Sensitive Data Migration

**Before:**

```typescript
parser.addFlag({
  name: "api-key",
  description: "API authentication key",
  type: "string",
});
```

**After:**

```typescript
parser.addFlag({
  name: "api-key",
  description: "API authentication key",
  type: "string",
  dxtOptions: {
    type: "string",
    sensitive: true, // Excluded from DXT manifest for security
  },
});
```

### Number Constraints Migration

**Before:**

```typescript
parser.addFlag({
  name: "port",
  description: "Server port number",
  type: "number",
});
```

**After:**

```typescript
parser.addFlag({
  name: "port",
  description: "Server port number",
  type: "number",
  dxtOptions: {
    type: "number",
    min: 1024,
    max: 65535,
    localDefault: 3000,
  },
});
```

## Path Handling Migration

### From Hardcoded Paths

**Before:**

```typescript
const logPath = "/Users/john/logs/app.log";
const configDir = "/Users/john/.config/myapp";
```

**After:**

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

const logPath = "${HOME}/logs/app.log";
const configPath = DxtPathResolver.createConfigPath("config.json");
```

### From os.homedir() Usage

**Before:**

```typescript
import * as os from "os";

const dataPath = `${os.homedir()}/.myapp/data.json`;
const tempPath = `${os.tmpdir()}/myapp-temp`;
```

**After:**

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

const dataPath = DxtPathResolver.createUserDataPath("data.json");
const tempPath = DxtPathResolver.createTempPath("temp-file");
```

### From Manual Environment Detection

**Before:**

```typescript
const isDxt = !!process.env.DXT_EXTENSION_DIR;
const basePath = isDxt ? process.env.DXT_EXTENSION_DIR : process.cwd();
```

**After:**

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

const context = DxtPathResolver.detectContext();
const basePath = context.isDxt ? context.extensionDir : context.cwd;
```

## MCP Configuration Migration

### Log Path Migration

**Before:**

```typescript
const parser = new ArgParser().withMcp({
  name: "my-server",
  version: "1.0.0",
  // No log path configuration
});
```

**After:**

```typescript
const parser = new ArgParser().withMcp({
  name: "my-server",
  version: "1.0.0",
  logPath: "${HOME}/logs/my-server.log", // DXT variable support
});
```

### Advanced MCP Configuration

**Before:**

```typescript
const parser = new ArgParser().addMcpSubCommand("serve", {
  // Basic MCP setup
});
```

**After:**

```typescript
const parser = new ArgParser().withMcp({
  name: "my-server",
  version: "1.0.0",
  logPath: {
    path: "server.log",
    relativeTo: "absolute",
    basePath: "${HOME}/logs",
  },
});
```

## Environment Variable Migration

### From ENV Flags to dxtOptions

**Before:**

```typescript
parser.addFlag({
  name: "database-url",
  description: "Database connection URL",
  type: "string",
  env: "DATABASE_URL",
});
```

**After:**

```typescript
parser.addFlag({
  name: "database-url",
  description: "Database connection URL",
  type: "string",
  env: "DATABASE_URL",
  dxtOptions: {
    type: "string",
    sensitive: true, // Database URLs often contain credentials
    title: "Database Connection URL",
  },
});
```

### Path Environment Variables

**Before:**

```typescript
parser.addFlag({
  name: "data-dir",
  description: "Data directory path",
  type: "string",
  env: "DATA_DIR",
  default: `${os.homedir()}/.myapp/data`,
});
```

**After:**

```typescript
parser.addFlag({
  name: "data-dir",
  description: "Data directory path",
  type: "string",
  env: "DATA_DIR",
  dxtOptions: {
    type: "directory",
    localDefault: "${HOME}/.myapp/data",
  },
});
```

## Testing Migration

### Test Environment Setup

**Before:**

```typescript
describe("MyApp", () => {
  beforeEach(() => {
    process.env.HOME = "/tmp/test-home";
  });
});
```

**After:**

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

describe("MyApp", () => {
  beforeEach(() => {
    // Clear DXT context cache for clean tests
    DxtPathResolver.clearCache();
    process.env.HOME = "/tmp/test-home";
  });
});
```

### Path Testing

**Before:**

```typescript
it("should use correct config path", () => {
  const configPath = `${os.homedir()}/.myapp/config.json`;
  expect(configPath).toBe("/tmp/test-home/.myapp/config.json");
});
```

**After:**

```typescript
it("should use correct config path", () => {
  const configPath = DxtPathResolver.createConfigPath("config.json");
  // Automatically adapts to test environment
  expect(configPath).toContain("config.json");
});
```

## Common Migration Patterns

### Pattern 1: File Processing Tool

**Before:**

```typescript
const parser = new ArgParser()
  .addFlag({
    name: "input",
    description: "Input file",
    type: "string",
    mandatory: true,
  })
  .addFlag({
    name: "output",
    description: "Output file",
    type: "string",
  });
```

**After:**

```typescript
const parser = new ArgParser()
  .addFlag({
    name: "input",
    description: "Input file to process",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      title: "Select Input File",
    },
  })
  .addFlag({
    name: "output",
    description: "Output file path",
    type: "string",
    dxtOptions: {
      type: "file",
      localDefault: "${DOCUMENTS}/processed-output.txt",
      title: "Output File",
    },
  });
```

### Pattern 2: Server Configuration

**Before:**

```typescript
const parser = new ArgParser()
  .addFlag({
    name: "port",
    description: "Server port",
    type: "number",
    default: 3000,
  })
  .addFlag({
    name: "host",
    description: "Server host",
    type: "string",
    default: "localhost",
  });
```

**After:**

```typescript
const parser = new ArgParser()
  .addFlag({
    name: "port",
    description: "Server port number",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1024,
      max: 65535,
      localDefault: 3000,
    },
  })
  .addFlag({
    name: "host",
    description: "Server hostname or IP",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "localhost",
      title: "Server Host",
    },
  });
```

### Pattern 3: Data Processing with Paths

**Before:**

```typescript
const dataDir = process.env.DATA_DIR || `${os.homedir()}/.myapp`;
const logFile = `${dataDir}/logs/app.log`;
const configFile = `${dataDir}/config.json`;
```

**After:**

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

const dataPath = DxtPathResolver.createUserDataPath("data.json");
const logPath = "${HOME}/logs/app.log";
const configPath = DxtPathResolver.createConfigPath("config.json");
```

## Migration Checklist

### Phase 1: Basic Enhancement

- [ ] Add `dxtOptions.type` to file/directory flags
- [ ] Add `dxtOptions.title` for better UI labels
- [ ] Mark sensitive flags with `dxtOptions.sensitive: true`

### Phase 2: Path Migration

- [ ] Replace hardcoded paths with DXT variables
- [ ] Use `DxtPathResolver` helper functions
- [ ] Update MCP log path configuration

### Phase 3: Validation & Constraints

- [ ] Add `min`/`max` constraints to number flags
- [ ] Set `localDefault` values with DXT variables
- [ ] Enable `multiple: true` where appropriate

### Phase 4: Testing & Validation

- [ ] Test in both development and DXT environments
- [ ] Verify DXT package generation works correctly
- [ ] Update tests to use `DxtPathResolver.clearCache()`

## Migration Benefits

After migration, you'll gain:

- **🎨 Rich DXT UI** - File pickers, directory selectors, number inputs
- **🔒 Better Security** - Automatic sensitive data handling
- **🌐 Cross-Platform** - Consistent path handling across OS
- **📦 Zero Config** - Automatic environment detection
- **🔄 Future-Proof** - Ready for DXT ecosystem growth

---

For detailed API documentation, see [dxtOptions API Documentation](./DXT_OPTIONS_API.md) and [DXT Path Handling Guide](./DXT_PATH_HANDLING.md).
