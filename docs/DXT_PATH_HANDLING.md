# DXT Path Handling Guide

This guide explains how to use ArgParser's DXT path handling features for building applications that work seamlessly in both development and DXT (Desktop Extension Toolkit) environments.

## Table of Contents

- [Overview](#overview)
- [DXT Variables](#dxt-variables)
- [Path Helper Functions](#path-helper-functions)
- [Context Detection](#context-detection)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

## Overview

ArgParser provides automatic path resolution that adapts to your runtime environment:

- **Development Environment**: Uses standard system paths (home directory, temp, etc.)
- **DXT Environment**: Uses sandboxed extension directories for security

### Key Benefits

- **🔄 Automatic Context Detection** - No manual environment checks needed
- **🔒 Security-First** - Automatic path sandboxing in DXT environments
- **🌐 Cross-Platform** - Consistent behavior across Windows, macOS, Linux
- **📦 Zero Configuration** - Works out of the box with sensible defaults

## DXT Variables

DXT variables provide dynamic path resolution using `${VARIABLE_NAME}` syntax.

### Standard Variables

| Variable           | Description             | Example                 |
| ------------------ | ----------------------- | ----------------------- |
| `${HOME}`          | User's home directory   | `/Users/john`           |
| `${DOCUMENTS}`     | User's Documents folder | `/Users/john/Documents` |
| `${DOWNLOADS}`     | User's Downloads folder | `/Users/john/Downloads` |
| `${DESKTOP}`       | User's Desktop folder   | `/Users/john/Desktop`   |
| `${pathSeparator}` | Platform path separator | `/` or `\`              |

### Context-Specific Variables

| Variable           | Development           | DXT Environment          |
| ------------------ | --------------------- | ------------------------ |
| `${__dirname}`     | Entry point directory | DXT package root         |
| `${DXT_DIR}`       | Not available         | DXT package directory    |
| `${EXTENSION_DIR}` | Not available         | Extension root directory |

### Usage Examples

```typescript
// Basic variable usage
const logPath = "${HOME}/logs/app.log";
const configPath = "${DOCUMENTS}/myapp/config.json";

// Cross-platform paths
const dataPath = "${HOME}${pathSeparator}data${pathSeparator}cache.db";

// DXT-aware paths
const packagePath = "${__dirname}/resources/data.json";
const extensionPath = "${EXTENSION_DIR}/shared/config.toml";
```

## Path Helper Functions

ArgParser provides helper functions for common path patterns that automatically adapt to your environment.

### createUserDataPath()

Creates paths for persistent user data storage.

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

// Automatically chooses the right location
const dataPath = DxtPathResolver.createUserDataPath("settings.json");

// Development: ~/.local/share/myapp/settings.json
// DXT: /extension/data/settings.json
```

### createTempPath()

Creates paths for temporary files.

```typescript
const tempPath = DxtPathResolver.createTempPath("cache.tmp");

// Development: /tmp/myapp/cache.tmp
// DXT: /extension/temp/cache.tmp
```

### createConfigPath()

Creates paths for configuration files.

```typescript
const configPath = DxtPathResolver.createConfigPath("app.toml");

// Development: ~/.config/myapp/app.toml
// DXT: /extension/config/app.toml
```

## Context Detection

ArgParser automatically detects whether your code is running in a DXT environment.

### Detection Methods

1. **Environment Variables**: `DXT_EXTENSION_DIR`, `CLAUDE_DESKTOP_DXT`
2. **File Patterns**: `manifest.json` (validated as DXT manifest), `.dxt` marker
3. **Directory Structure**: DXT-specific directory patterns

### Manual Context Access

```typescript
const context = DxtPathResolver.detectContext();

if (context.isDxt) {
  console.log("Running in DXT environment");
  console.log("Extension dir:", context.extensionDir);
} else {
  console.log("Running in development");
  console.log("Working dir:", context.cwd);
}
```

## Best Practices

### ✅ Do

- **Use DXT variables** for any file paths that users might configure
- **Use helper functions** for standard data/config/temp paths
- **Test both environments** during development
- **Use relative paths** within your package when possible

```typescript
// ✅ Good - adapts to environment
const logPath = "${HOME}/logs/myapp.log";
const dataPath = DxtPathResolver.createUserDataPath("cache.db");

// ✅ Good - relative to package
const resourcePath = "${__dirname}/resources/template.txt";
```

### ❌ Don't

- **Hardcode absolute paths** that won't work in DXT
- **Use process.cwd()** for data storage (not sandboxed)
- **Assume specific directory structures** across environments

```typescript
// ❌ Bad - hardcoded paths
const logPath = "/Users/john/logs/app.log";
const dataPath = process.cwd() + "/data.json";

// ❌ Bad - not DXT-aware
const configPath = require("os").homedir() + "/.myapp/config.json";
```

### Log Path Configuration

When configuring MCP log paths, use DXT variables for flexibility:

```typescript
const parser = new ArgParser().withMcp({
  name: "my-server",
  version: "1.0.0",
  logPath: "${HOME}/logs/my-server.log", // ✅ Adapts to environment
});
```

### Flag Configuration with dxtOptions

Use `dxtOptions` to make file/directory flags DXT-aware:

```typescript
parser.addFlag({
  name: "output-dir",
  description: "Output directory for generated files",
  type: "string",
  dxtOptions: {
    type: "directory",
    localDefault: "${DOCUMENTS}/myapp/output",
  },
});
```

## Migration Guide

### From Hardcoded Paths

**Before:**

```typescript
const logPath = "/Users/john/logs/app.log";
const configPath = require("os").homedir() + "/.myapp/config.json";
```

**After:**

```typescript
const logPath = "${HOME}/logs/app.log";
const configPath = DxtPathResolver.createConfigPath("config.json");
```

### From Environment Variables

**Before:**

```typescript
const dataDir = process.env.DATA_DIR || `${os.homedir()}/.myapp`;
```

**After:**

```typescript
const dataPath = DxtPathResolver.createUserDataPath("data.json");
// Or with variables:
const dataDir = "${HOME}/.myapp";
```

### From Manual Environment Detection

**Before:**

```typescript
const isDxt = !!process.env.DXT_EXTENSION_DIR;
const basePath = isDxt ? process.env.DXT_EXTENSION_DIR : process.cwd();
```

**After:**

```typescript
const context = DxtPathResolver.detectContext();
const basePath = context.isDxt ? context.extensionDir : context.cwd;
```

## Examples

### Basic CLI with DXT Support

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "file-processor",
    version: "1.0.0",
    logPath: "${HOME}/logs/file-processor.log",
  })
  .addFlag({
    name: "input",
    description: "Input file to process",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Output directory",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/processed-files",
    },
  })
  .addTool({
    name: "process",
    description: "Process the input file",
    handler: async (args) => {
      const outputPath = DxtPathResolver.createUserDataPath("results.json");

      // Process file...
      console.log(`Processing ${args.input}`);
      console.log(`Output will be saved to ${outputPath}`);

      return { success: true, outputPath };
    },
  });
```

### Advanced Path Handling

```typescript
import { DxtPathResolver } from "@alcyone-labs/arg-parser";

class FileManager {
  private configPath: string;
  private dataPath: string;
  private tempPath: string;

  constructor() {
    // These automatically adapt to DXT vs development
    this.configPath = DxtPathResolver.createConfigPath("settings.toml");
    this.dataPath = DxtPathResolver.createUserDataPath("database.sqlite");
    this.tempPath = DxtPathResolver.createTempPath("processing");
  }

  async initialize() {
    // Ensure directories exist
    await DxtPathResolver.ensureDirectory(this.configPath);
    await DxtPathResolver.ensureDirectory(this.dataPath);
    await DxtPathResolver.ensureDirectory(this.tempPath);
  }

  getResourcePath(filename: string): string {
    // Use variables for package-relative paths
    return DxtPathResolver.resolvePath(`\${__dirname}/resources/${filename}`);
  }
}
```

### Custom Variable Usage

```typescript
// Define custom variables for specific use cases
const customVariables = {
  PROJECT_ROOT: "/path/to/project",
  BUILD_DIR: "/path/to/build",
};

const buildPath = DxtPathResolver.substituteVariables(
  "${PROJECT_ROOT}/dist/${BUILD_DIR}/output.js",
  DxtPathResolver.detectContext(),
  { customVariables },
);
```

---

For more examples and advanced usage, see the [dxtOptions API Documentation](./DXT_OPTIONS_API.md) and [Migration Guide](./DXT_MIGRATION.md).
