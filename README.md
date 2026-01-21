# ArgParser - Type-Safe Command Line Argument Parser

A modern, type-safe command line argument parser with built-in MCP (Model Context Protocol) integration, real-time MCP Resources, and automatic Claude Desktop Extension (DXT) generation.

## Table of Contents

- [Features Overview](#features-overview)
- [Installation](#installation)
- [Quick Start: The Unified `addTool` API](#quick-start-the-unified-addtool-api)
- [Documentation](#documentation)
- [How to Run It](#how-to-run-it)
- [OpenTUI: Reactive Rich Terminal Interfaces](#opentui-reactive-rich-terminal-interfaces)
- [System Flags & Configuration](#system-flags--configuration)
- [Links](#links)

## Features Overview

- **Unified Tool Architecture**: Define tools once with `addTool()` and they automatically function as both CLI subcommands and MCP tools.
- **Type-safe flag definitions** with full TypeScript support and autocompletion.
- **Automatic MCP Integration**: Transform any CLI into a compliant MCP server with a single command (`--s-mcp-serve`).
- **MCP Resources with Real-Time Feeds** ⭐: Create subscription-based data feeds with URI templates for live notifications to AI assistants.
- **Console Safe**: `console.log` and other methods are automatically handled in MCP mode to prevent protocol contamination.
- **DXT Package Generation**: Generate complete, ready-to-install Claude Desktop Extension (`.dxt`) packages.
- **Hierarchical Sub-commands**: Create complex, nested sub-command structures with flag inheritance.
- **Configuration Management**: Easily load (`--s-with-env`) and save (`--s-save-to-env`) configurations.
- **OpenTUI Framework** ⭐: A reactive TUI engine built on SolidJS with mouse support and themes.

## Installation

```bash
# Using PNPM (recommended)
pnpm add @alcyone-labs/arg-parser
```

## Quick Start: The Unified `addTool` API

The modern way to build with ArgParser is using the `.addTool()` method.

```typescript
import { z } from "zod";
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
}).addTool({
  name: "greet",
  description: "A tool to greet someone",
  flags: [{ name: "name", type: "string", mandatory: true, options: ["--name"] }],
  handler: async (ctx) => {
    console.log(`Hey ${ctx.args.name}!`);
    return { success: true, greeting: `Hey ${ctx.args.name}!` };
  },
});

await cli.parse();
```

## Documentation

For detailed information, please refer to the following guides:

- 📖 **[Core Concepts](./docs/CORE_CONCEPTS.md)**: Flag definitions, type handling, validation, and positional arguments.
- 🤖 **[MCP & Claude Desktop Integration](./docs/MCP.md)**: Full guide on MCP servers, DXT bundling, and Claude integration.
- 🖥️ **[OpenTUI Reference](./docs/TUI.md)**: Building rich terminal interfaces with SolidJS.
- 📂 **[Working Directory Management](./docs/WORKING_DIRECTORY.md)**: Handling PWD and monorepos.
- 🚀 **[Migration Guide (v1 to v2)](./docs/MIGRATION_V2.md)**: Moving to the unified `addTool` API.

## How to Run It

```bash
# 1. As a standard CLI subcommand
mycli greet --name Jane

# 2. As an MCP server
mycli --s-mcp-serve

# 3. Generate a DXT package
mycli --s-build-dxt ./my-dxt-package
```

## OpenTUI: Reactive Rich Terminal Interfaces

ArgParser includes **OpenTUI v2**, a reactive TUI framework built on SolidJS.

> 📖 **Full Documentation**: [docs/TUI.md](./docs/TUI.md) | [Component Reference](./docs/TUI_COMPONENTS.md)

### Runtime Requirements

> ⚠️ **Important**: OpenTUI requires **Bun** to run, not Node.js.

When building TUI applications with OpenTUI, ensure your project uses Bun:

```bash
# Install dependencies with Bun
bun install

# Run your TUI application with Bun
bun run src/index.ts
```

Node.js does not support OpenTUI's terminal rendering capabilities. Most CI environments and remote containers use Node.js by default - configure them to use Bun instead.

### Quick TUI Example

```typescript
import { createTuiApp } from "@alcyone-labs/arg-parser/tui";
import { TuiProvider } from "@alcyone-labs/arg-parser/tui";

function App() {
  return (
    <box border padding={2}>
      <text>Hello from OpenTUI!</text>
    </box>
  );
}

createTuiApp(() => (
  <TuiProvider theme="dark">
    <App />
  </TuiProvider>
));
```

### Peer Dependencies

When using OpenTUI features, install the peer dependencies:

```bash
bun add @opentui/core @opentui/solid solid-js
```

## System Flags & Configuration

ArgParser includes built-in `--s-*` flags for development and debugging.

| Flag                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `--s-mcp-serve`          | Starts the application in MCP server mode.               |
| `--s-build-dxt [dir]`    | Generates a DXT package for Claude Desktop.              |
| `--s-with-env <file>`    | Loads configuration from a file (`.env`, `.json`, etc.). |
| `--s-save-to-env <file>` | Saves current arguments to a configuration file.         |
| `--s-debug`              | Prints a detailed log of the argument parsing process.   |

## Links

- 📜 **[Changelog](./CHANGELOG.md)**
- 📋 **[Backlog](./BACKLOG.md)**
- 💬 **[Discord Support](https://discord.gg/rRHhpz5nS5)**
