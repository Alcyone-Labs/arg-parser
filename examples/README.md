# ArgParser Examples

This directory contains example CLI applications demonstrating various features of the ArgParser library, from basic CLI usage to advanced MCP server integration.

## Runtime Compatibility

All examples work seamlessly across multiple JavaScript runtimes:

### **BunJS (Recommended)**

```bash
bun examples/getting-started.ts --input data.txt --verbose
bun examples/simple-cli.ts --env production --port 8080
```

### **Node.js**

```bash
npx tsx examples/getting-started.ts --input data.txt --verbose
npx tsx examples/simple-cli.ts --env production --port 8080
```

### **Deno**

```bash
# Direct execution
deno run --unstable-sloppy-imports --allow-read --allow-write --allow-env examples/getting-started.ts --input data.txt --verbose

# Or use predefined tasks (recommended)
deno task example:getting-started --input data.txt --verbose
deno task example:simple-cli --env production --port 8080
```

### **About These Examples**

Examples are provided as TypeScript source files for educational purposes and are not compiled into the distributed package. This keeps the package lean while providing practical, runnable examples.

To use the library in your own projects, install it via npm/pnpm and import it normally:

```bash
# Install the library
pnpm add @alcyone-labs/arg-parser

# Use in your project
import { ArgParser } from '@alcyone-labs/arg-parser';
```

**Note:** Replace `bun` with your preferred runtime command in all examples below.

## 📋 **Quick Overview**

| Example                    | Purpose            | Key Features                                              |
| -------------------------- | ------------------ | --------------------------------------------------------- |
| `core/getting-started.ts`       | Learn the basics   | Complete executable CLI, subcommands, MCP integration     |
| `core/simple-cli.ts`            | Essential patterns | Clean flag examples, modern handler patterns              |
| `v1.1.0-showcase.ts`            | Latest features    | System flags, environment loading, multi-transport MCP    |
| `fzf-search-cli.ts`             | Real-world usage   | Production-ready tool, complex validation, error handling |
| `with-env-example.ts`           | Configuration      | File loading, environment management, save/load workflow  |
| `MCP/preset-transports.ts`      | MCP advanced       | Preset transport configuration, multiple protocols        |
| `streamable-http/secure-mcp.ts` | HTTP security demo | CORS + JWT (HS256) + /health                              |
| `streamable-http/rs256-mcp.ts`  | HTTP security demo | CORS + JWT (RS256) + /health                              |
| `streamable-http/bearer-mcp.ts` | HTTP security demo | CORS + Bearer allowlist + /health                         |

## Featured Examples

### **v1.1.0 Feature Showcase (`v1.1.0-showcase.ts`)**

**NEW!** Comprehensive demonstration of all v1.1.0 features including:

- **System flags** (`--s-debug`, `--s-with-env`, `--s-save-to-env`)
- **MCP server integration** with multiple transport types
- **Environment loading** from various file formats
- **Multiple transport configurations** for maximum flexibility

**Run the showcase:**

```bash
# Basic CLI usage with debug
bun examples/v1.1.0-showcase.ts --s-debug --input data.txt process --format json

# Load environment from YAML
bun examples/v1.1.0-showcase.ts --s-with-env config.yaml --input data.txt analyze --algorithm neural

# Save current configuration to environment file
bun examples/v1.1.0-showcase.ts --input data.txt --s-save-to-env

# Start MCP server with stdio (default)
bun examples/v1.1.0-showcase.ts --s-mcp-serve

# Start MCP server with SSE transport
bun examples/v1.1.0-showcase.ts --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3001

# Start MCP server with multiple transports
bun examples/v1.1.0-showcase.ts --s-mcp-serve --s-mcp-transports '[{"type":"stdio"},{"type":"sse","port":3001,"path":"/sse"},{"type":"streamable-http","port":3002,"path":"/mcp"}]'

# Start predefined multi-transport server
bun examples/v1.1.0-showcase.ts serve-multi
```

## **Core Examples**

### 1. **Getting Started** (`getting-started.ts`) ⭐

**Perfect for beginners!** A complete, executable CLI demonstrating the most common ArgParser patterns:

- **Basic flags**: String, boolean, and array types with validation
- **Essential features**: Mandatory flags, default values, enum validation
- **Sub-commands**: Building hierarchical CLIs with command-specific flags
- **MCP integration**: Transform your CLI into an MCP server with one line

**Run the examples:**

```bash
# Basic file processing
bun examples/getting-started.ts --input data.txt --format json --verbose

# Convert files with subcommand
bun examples/getting-started.ts convert --input data.csv --format yaml --compress

# Analyze files
bun examples/getting-started.ts analyze --file report.txt --type detailed

# Start MCP server
bun examples/getting-started.ts serve

# Show help
bun examples/getting-started.ts --help
```

### 2. **Simple CLI** (`simple-cli.ts`)

Clean, focused example demonstrating essential flag types:

- **String flags** with enum validation
- **Number flags** with default values
- **Boolean flags** (flag-only)
- **Array flags** (multiple values)
- **Modern handler patterns**

````bash
# Run with all flags
bun examples/simple-cli.ts --env production --port 8080 --verbose --file src/main.ts --file src/utils.ts

# Show help
bun examples/simple-cli.ts --help

### 3. **Configuration File Loading** (`with-env-example.ts`)

Demonstrates the `--s-with-env` and `--s-save-to-env` system flags for configuration management:

- Support for multiple file formats (.env, YAML, JSON, TOML)
- CLI arguments override file configuration
- Automatic type conversion and validation
- Save current configuration to files

**Run the example:**

```bash
# Load from .env file
bun examples/with-env-example.ts --s-with-env examples/config.env

# Load from YAML file
bun examples/with-env-example.ts --s-with-env examples/config.yaml

# Save current configuration to auto-generated file
bun examples/with-env-example.ts --verbose --output result.txt --count 5 --s-save-to-env

# Save to specific file
bun examples/with-env-example.ts --verbose --count 10 --s-save-to-env my-config.yaml

# Load and modify saved configuration
bun examples/with-env-example.ts --s-with-env my-config.yaml --count 15
````

### 3. **Real-World Example** (`fzf-search-cli.ts`)

A complete, production-ready CLI tool demonstrating:

- **Real-world functionality**: Fuzzy file search using fzf
- **Complex flag validation**: File extensions, directory paths
- **MCP server integration**: Transform CLI into MCP server
- **Error handling**: Graceful handling of missing dependencies
- **Modern patterns**: Clean code structure and TypeScript types

**Run the example:**

```bash
# Basic file search
bun examples/fzf-search-cli.ts --query "test" --directory src

# Search with file extensions filter
bun examples/fzf-search-cli.ts --query "util" --extensions "ts,js" --max-results 10

# Start as MCP server
bun examples/fzf-search-cli.ts mcp-server

# Show help
bun examples/fzf-search-cli.ts --help
```

## **Development Tips**

### **CLI Design Best Practices**

- Use descriptive flag names and comprehensive descriptions
- Provide sensible defaults where possible
- Use enum validation for restricted values
- Consider using global flags for common options like `--verbose`
- Implement proper error handling in your handlers

### **MCP Integration Tips**

- Design your CLI with clear, focused commands that work well as MCP tools
- Use meaningful return values from handlers - they become MCP tool responses
- Consider which transport types your users need (stdio for CLI tools, HTTP for web apps)
- Test your MCP tools with multiple transports to ensure compatibility

### **Configuration Management**

- Use `--s-save-to-env` to generate configuration templates for users
- Combine `--s-with-env` with CLI arguments for flexible deployment scenarios
- Use `--s-debug` during development to understand complex command chains
- Document your configuration file formats for users

### **Performance & Debugging**

- Use `--s-debug-print` to inspect complex parser configurations
- Test with various argument combinations to ensure robust parsing
- Consider using async handlers for I/O operations when using `ArgParser` with MCP
