# ArgParser - Type-Safe Command Line Argument Parser

A modern, type-safe command line argument parser with built-in MCP (Model Context Protocol) integration, real-time MCP Resources, and automatic Claude Desktop Extension (DXT) generation.

## Table of Contents

- [Features Overview](#features-overview)
- [Installation](#installation)
- [Quick Start: The Unified `addTool` API](#quick-start-the-unified-addtool-api)
- [Working Directory Management for Monorepos](#working-directory-management)
- [MCP Tool Name Constraints](#mcp-tool-name-constraints)
- [How to Run It](#how-to-run-it)
  - [Setting Up System-Wide CLI Access](#setting-up-system-wide-cli-access)
- [OpenTUI: Reactive Rich Terminal Interfaces](#opentui-reactive-rich-terminal-interfaces)
- [Parsing Command-Line Arguments](#parsing-command-line-arguments)
  - [Automatic Argument Detection](#automatic-argument-detection)
  - [Cannonical Usage Pattern](#cannonical-usage-pattern)
  - [Top-level await](#top-level-await)
  - [Promise-based parsing](#promise-based-parsing)
- [Migrating from v1.x to the v2.0 `addTool` API](#migrating-from-v1x-to-the-v20-addtool-api)
  - [Before v2.0: Separate Definitions](#before-v20-separate-definitions)
  - [After v2.0: The Unified `addTool()` Method](#after-v20-the-unified-addtool-method)
- [Core Concepts](#core-concepts)
  - [Defining Flags](#defining-flags)
  - [Type Handling and Validation](#type-handling-and-validation)
    - [Supported Type Formats](#supported-type-formats)
    - [Runtime Type Validation](#runtime-type-validation)
    - [Automatic Type Processing](#automatic-type-processing)
    - [Async Custom Parser Support](#async-custom-parser-support)
    - [Zod Schema Flags (Structured JSON Validation)](#zod-schema-flags-structured-json-validation)
    - [Type Conversion Examples](#type-conversion-examples)
  - [DXT Package User Configuration & Path Handling](#dxt-package-user-configuration--path-handling)
  - [Hierarchical CLIs (Sub-Commands)](#hierarchical-clis-sub-commands)
    - [MCP Exposure Control](#mcp-exposure-control)
  - [Flag Inheritance (`inheritParentFlags`)](#flag-inheritance-inheritparentflags)
  - [Dynamic Flags (`dynamicRegister`)](#dynamic-flags-dynamicregister)
  - [Automatic Help Display](#automatic-help-display)

- [MCP & Claude Desktop Integration](#mcp--claude-desktop-integration)
  - [Output Schema Support](#output-schema-support)
    - [Basic Usage](#basic-usage)
    - [Predefined Schema Patterns](#predefined-schema-patterns)
    - [Custom Zod Schemas](#custom-zod-schemas)
    - [MCP Version Compatibility](#mcp-version-compatibility)
    - [Automatic Error Handling](#automatic-error-handling)
  - [Writing Effective MCP Tool Descriptions](#writing-effective-mcp-tool-descriptions)
    - [Best Practices for Tool Descriptions](#best-practices-for-tool-descriptions)
    - [Complete Example: Well-Documented Tool](#complete-example-well-documented-tool)
    - [Parameter Description Guidelines](#parameter-description-guidelines)
    - [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
  - [Automatic MCP Server Mode (`--s-mcp-serve`)](#automatic-mcp-server-mode---s-mcp-serve)
  - [MCP Transports](#mcp-transports)
    - [Adding custom HTTP routes (e.g., /health)](#adding-custom-http-routes-eg-health)
    - [CORS and Authentication for streamable-http](#cors-and-authentication-for-streamable-http)
    - [Multiple transports and improved logging](#multiple-transports-and-improved-logging)
  - [MCP Logging Configuration](#mcp-logging-configuration)
    - [Enhanced Logging (Recommended)](#enhanced-logging-recommended)
    - [Simple Logging Configuration](#simple-logging-configuration)
    - [Configuration Priority](#configuration-priority)
    - [Configuration Merging](#configuration-merging)
    - [Path Resolution Options](#path-resolution-options)
  - [MCP Lifecycle Events](#mcp-lifecycle-events)
  - [MCP Resources - Real-Time Data Feeds](#mcp-resources---real-time-data-feeds)
    - [Basic Resource Setup](#basic-resource-setup)
    - [URI Templates with Dynamic Parameters](#uri-templates-with-dynamic-parameters)
    - [MCP Subscription Lifecycle](#mcp-subscription-lifecycle)
    - [Usage Examples](#usage-examples)
    - [Design Patterns](#design-patterns)
  - [Automatic Console Safety](#automatic-console-safety)
  - [Generating DXT Packages (`--s-build-dxt`)](#generating-dxt-packages---s-build-dxt)
  - [Logo Configuration](#logo-configuration)
    - [Supported Logo Sources](#supported-logo-sources)
  - [Including Additional Files in DXT Packages](#including-additional-files-in-dxt-packages)
    - [Include Options](#include-options)
  - [How DXT Generation Works](#how-dxt-generation-works)
  - [DXT Bundling Strategies](#dxt-bundling-strategies)
    - [Standard Approach (Recommended for Most Projects)](#standard-approach-recommended-for-most-projects)
    - [Native Dependencies Approach](#native-dependencies-approach)
  - [Typical Errors](#typical-errors)
- [System Flags & Configuration](#system-flags--configuration)
- [Changelog](#changelog)
  - [v2.10.2](#v2102)
  - [v2.10.1](#v2101)
  - [v2.10.0](#v2100)
  - [v2.8.2](#v282)
  - [v2.8.1](#v281)
  - [v2.7.2](#v272)
  - [v2.7.0](#v270)
  - [v2.6.0](#v260)
  - [v2.5.0](#v250)
  - [v2.4.2](#v242)
  - [v2.4.1](#v241)
  - [v2.4.0](#v240)
  - [v2.3.0](#v230)
  - [v2.2.1](#v221)
  - [v2.2.0](#v220)
  - [v2.1.1](#v211)
  - [v2.1.0](#v210)
  - [v2.0.0](#v200)
  - [v1.3.0](#v130)
  - [v1.2.0](#v120)
  - [v1.1.0](#v110)

- [Backlog](#backlog)
  - [(known) Bugs / DX improvement points](#known-bugs--dx-improvement-points)

## Features Overview

- **Unified Tool Architecture**: Define tools once with `addTool()` and they automatically function as both CLI subcommands and MCP tools.
- **Type-safe flag definitions** with full TypeScript support and autocompletion.
- **Automatic MCP Integration**: Transform any CLI into a compliant MCP server with a single command (`--s-mcp-serve`).
- **MCP Resources with Real-Time Feeds** ⭐: Create subscription-based data feeds with URI templates for live notifications to AI assistants.
- **Console Safe**: `console.log` and other methods
  are automatically handled in MCP mode to prevent protocol contamination, requiring no changes to your code.
- **DXT Package Generation**: Generate complete, ready-to-install Claude Desktop Extension (`.dxt`) packages with the `--s-build-dxt` command and `--s-with-node-modules` for platform-dependent builds.
- **Hierarchical Sub-commands**: Create complex, nested sub-command structures (e.g., `git commit`, `docker container ls`) with flag inheritance.
- **Configuration Management**: Easily load (`--s-with-env`) and save (`--s-save-to-env`) configurations from/to `.env`, `.json`, `.yaml`, and `.toml` files.
- **OpenTUI Framework** ⭐: A standardized, event-driven TUI engine with mouse support, multi-layer navigation, and reactive themes (Dark, Ocean, Monokai).

---

## OpenTUI: Reactive Rich Terminal Interfaces

ArgParser includes **OpenTUI v2**, a reactive TUI framework built on SolidJS for building rich terminal applications with minimal boilerplate.

> 📖 **Full Documentation**: [docs/TUI.md](./docs/TUI.md)

- **Standardized Navigation**: `Enter` / `Right` to dive into details, `Esc` / `Left` to go back.
- **Reactive Theming**: Cycle through built-in themes (`Default`, `Ocean`, `Monokai`) or create your own.
- **Mouse & Scroll Performance**: Built-in SGR mouse reporting support with smooth scrolling and high-performance rendering.
- **New Components**: `Label` (Text), `Button` (Interactive), `Card` (Container), `Toast` (Notification).
- **Component Based**: Reusable `List`, `ScrollArea`, `Input`, and `SplitLayout` components.
- **TuiProvider**: Unified provider handling mouse, resize, cleanup, themes, and shortcuts
- **Virtual Scrolling**: Efficient list rendering with `VirtualList`
- **Theme System**: 6 built-in themes + `Theme.from().extend()` for custom themes
- **Slot-based Layouts**: `MasterDetail` with customizable panels
- **Keyboard + Mouse**: Built-in navigation with useKeyboard and mouse wheel

### Quick Start

```tsx
import { render, useKeyboard } from "@opentui/solid";
import { createSignal } from "solid-js";
import { 
  TuiProvider, useTui, useTheme, 
  MasterDetail, VirtualList, createVirtualListController,
  cleanupTerminal 
} from "@alcyone-labs/arg-parser/tui";

const DATA = [{ id: "1", name: "Item 1" }, /* ... */];

function App() {
  const { viewportHeight, exit } = useTui();
  const { current: theme, cycle } = useTheme();
  const [idx, setIdx] = createSignal(0);
  
  const list = createVirtualListController(() => DATA, idx, setIdx, viewportHeight);

  useKeyboard((key) => {
    if (key.name === "q") exit(0);
    if (key.name === "t") cycle();
    if (key.name === "down") list.selectNext();
    if (key.name === "up") list.selectPrevious();
  });

  return (
    <MasterDetail
      header="My App"
      breadcrumb={["Items", DATA[idx()]!.name]}
      footer={`↑↓: Navigate | t: Theme (${theme().name}) | q: Quit`}
      master={
        <VirtualList
          items={DATA}
          selectedIndex={idx()}
          viewportHeight={viewportHeight()}
          getLabel={(item) => item.name}
        />
      }
      detail={<text>Selected: {DATA[idx()]!.name}</text>}
    />
  );
}

render(
  () => <TuiProvider theme="dark"><App /></TuiProvider>,
  { onDestroy: cleanupTerminal }
);
```

### Theme Builder

```ts
import { Theme, THEMES } from "@alcyone-labs/arg-parser/tui";

// Built-in: dark, light, monokai, dracula, nord, solarized
const custom = Theme.from(THEMES.dark).extend({
  name: "my-theme",
  colors: { background: "#1e1e1e", accent: "#ff6b6b" }
});
```

### Run Examples

```bash
bun examples/framework-demo.tsx    # Simplified demo
bun examples/aquaria-trace-viewer.tsx  # Full-featured demo
```


## Installation

```bash
# Using PNPM (recommended)
pnpm add @alcyone-labs/arg-parser
```

---

## Quick Start: The Unified `addTool` API

The modern way to build with ArgParser is using the `.addTool()` method. It creates a single, self-contained unit that works as both a CLI subcommand and an MCP tool.

```typescript
import { z } from "zod";
import { ArgParser } from "@alcyone-labs/arg-parser";

// Use ArgParser.withMcp to enable MCP and DXT features
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
})
  // Define a tool that works everywhere
  .addTool({
    name: "greet",
    description: "A tool to greet someone",
    flags: [
      {
        name: "name",
        type: "string",
        mandatory: true,
        options: ["--name"],
        description: "Name to greet",
      },
      {
        name: "style",
        type: "string",
        enum: ["formal", "casual"],
        defaultValue: "casual",
        description: "Greeting style",
      },
    ],
    // Optional: Define output schema for MCP clients (Claude Desktop, etc.)
    // This only affects MCP mode - CLI mode works the same regardless
    outputSchema: {
      success: z.boolean().describe("Whether the greeting was successful"),
      greeting: z.string().describe("The formatted greeting message"),
      name: z.string().describe("The name that was greeted"),
    },
    handler: async (ctx) => {
      // Use console.log freely - it's automatically safe in MCP mode!
      console.log(`Greeting ${ctx.args.name} in a ${ctx.args.style} style...`);

      const greeting =
        ctx.args.style === "formal"
          ? `Good day, ${ctx.args.name}.`
          : `Hey ${ctx.args.name}!`;

      console.log(greeting);
      return { success: true, greeting, name: ctx.args.name };
    },
  });

// parse() is async and works with both sync and async handlers
async function main() {
  try {
    await cli.parse(process.argv.slice(2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

// Export if you want to test, use the CLI programmatically
// or use the --s-enable-fuzzing system flag to run fuzzy tests on your CLI
export default cli;
```

### MCP Tool Name Constraints

When using `.addTool()` or `.addMcpTool()`, tool names are automatically sanitized for MCP compatibility. MCP tool names must follow the pattern `^[a-zA-Z0-9_-]{1,64}$` (only alphanumeric characters, underscores, and hyphens, with a maximum length of 64 characters).

```typescript
// These names will be automatically sanitized:
cli.addTool({
  name: "test.tool", // → "test_tool"
  // ... rest of config
});

cli.addTool({
  name: "my@tool", // → "my_tool"
  // ... rest of config
});

cli.addTool({
  name: "tool with spaces", // → "tool_with_spaces"
  // ... rest of config
});

cli.addTool({
  name: "very-long-tool-name-that-exceeds-the-64-character-limit-for-mcp", // → truncated to 64 chars
  // ... rest of config
});
```

The library will warn you when tool names are sanitized, but your tools will continue to work normally. For CLI usage, the original name is preserved as the subcommand name.

## How to Run It

```bash
# This assumes `mycli` is your CLI's entry point

# 1. As a standard CLI subcommand
mycli greet --name Jane --style formal

# 2. As an MCP server, exposing the 'greet' tool
mycli --s-mcp-serve

# 3. Generate a DXT package for Claude Desktop (2-steps)
mycli --s-build-dxt ./my-dxt-package

# If you use ML models or packages that include binaries such as Sqlite3 or sharp, etc...
# You need to bundle the node_modules folder with your DXT package
# In order to do this, you need to use the following flag:
# First hard-install all the packages
rm -rf node_moduels
pnpm install --prod --node-linker=hoisted
# Then bundle with node_modules
mycli --s-build-dxt ./my-dxt-package --s-with-node-modules
# then packages the dxt
npx @anthropic-ai/dxt pack ./my-dxt-package
# then upload the dxt bundle to Claude Desktop from the settings > extensions > advanced screen
```

Read more on generating the DXT package here: [Generating DXT Packages](#generating-dxt-packages---s-build-dxt)

### Setting Up System-Wide CLI Access

To make your CLI available system-wide as a binary command, you need to configure the `bin` field in your `package.json` and use package linking:

**1. Configure your package.json:**

```json
{
  "name": "my-cli-app",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./cli.js"
  }
}
```

**2. Make your CLI file executable:**

```bash
chmod +x cli.js
```

**3. Add a shebang to your CLI file:**

```javascript
#!/usr/bin/env node
# or #!/usr/bin/env bun for native typescript runtime

import { ArgParser } from '@alcyone-labs/arg-parser';

const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  // ... your configuration
});

// Parse command line arguments
await cli.parse(process.argv.slice(2));
```

**4. Link the package globally:**

```bash
# Using npm
npm link

# Using pnpm
pnpm link --global

# Using bun
bun link

# Using yarn
yarn link
```

**5. Use your CLI from anywhere:**

```bash
# Now you can run your CLI from any directory
mycli --help
mycli greet --name "World"

# Or use with npx/pnpx if you prefer
npx mycli --help
pnpx mycli greet --name "World"
```

**To unlink later:**

```bash
# Using npm
npm unlink --global my-cli-app

# Using pnpm
pnpm unlink --global

# Using bun
bun unlink

# Using yarn
yarn unlink
```

---

## Parsing Command-Line Arguments

ArgParser's `parse()` method is async and automatically handles both synchronous and asynchronous handlers:

### Auto-Execution versus Import: No More Boilerplate

ArgParser now provides auto-execution ability that eliminates the need for boilerplate code to check if your script is being run directly vs. imported. This enables use cases such as programmatically loading the CLI and scanning for tools or testing it from another script via the --s-enable-fuzzy flag or your own script.

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "my-cli",
  handler: async (ctx) => ({ success: true, data: ctx.args }),
});

// Now, this will NOT automatically execute the parser if the script is imported, but will execute if called directly:
await cli
  .parse(undefined, {
    importMetaUrl: import.meta.url,
  })
  .catch(handleError);

// Or, using the manual APIs:
await cli.parseIfExecutedDirectly(import.meta.url).catch((error) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
```

**Replaces previously confusing patterns:**

```typescript
// Brittle and breaks in sandboxes
if (import.meta.url === `file://${process.argv[1]}`) {
  await cli.parse().catch(handleError);
}
```

### Cannonical Usage Pattern

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  handler: async (ctx) => {
    // Works with both sync and async operations
    const result = await someAsyncOperation(ctx.args.input);
    return { success: true, result };
  },
});

// parse() is async and works with both sync and async handlers
async function main() {
  try {
    // Option 1: Auto-detection - convenient for simple scripts
    const result = await cli.parse();

    // Option 2: Explicit arguments - full control
    // const result = await cli.parse(process.argv.slice(2));

    // Handler results are automatically awaited and merged
    console.log(result.success); // true
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
```

### Top-level await

Works in ES modules or Node.js >=18 with top-level await

```javascript
try {
  // Auto-detection approach (recommended for simple scripts)
  const result = await cli.parse();

  // Or explicit approach for full control
  // const result = await cli.parse(process.argv.slice(2));

  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
```

### Promise-based parsing

If you need synchronous contexts, you can simply rely on promise-based APIs

```javascript
// Auto-detection approach
cli
  .parse()
  .then((result) => {
    console.log("Success:", result);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });

// Or explicit approach
// cli
//   .parse(process.argv.slice(2))
//   .then((result) => {
//     console.log("Success:", result);
//   })
//   .catch((error) => {
//     console.error("Error:", error.message);
//     process.exit(1);
//   });
```

---

## Migrating from v1.x to the v2.0 `addTool` API

Version 2.0 introduces the `addTool()` method to unify CLI subcommand and MCP tool creation. This simplifies development by removing boilerplate and conditional logic.

### Before v2.0: Separate Definitions

Previously, you had to define CLI handlers and MCP tools separately, often with conditional logic inside the handler to manage different output formats.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// Old way: Separate CLI subcommands and MCP tools
cli
  .addSubCommand({
    name: "search",
    handler: async (ctx) => {
      // Manual MCP detection was required
      if (ctx.isMcp) {
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } else {
        console.log("Search results...");
        return result;
      }
    },
  })
  // And a separate command to start the server
  .addMcpSubCommand("serve", {
    /* MCP config */
  });
```

### After v2.0: The Unified `addTool()` Method

Now, a single `addTool()` definition creates both the CLI subcommand and the MCP tool. Console output is automatically managed, flags are converted to MCP schemas, and the server is started with a universal system flag.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// New way: A single tool definition for both CLI and MCP
cli.addTool({
  name: "search",
  description: "Search for items",
  flags: [
    { name: "query", type: "string", mandatory: true },
    { name: "apiKey", type: "string", env: "API_KEY" }, // Universal Env support (also used for DXT)
  ],
  handler: async (ctx) => {
    // No more MCP detection! Use console.log freely.
    console.log(`Searching for: ${ctx.args.query}`);
    const results = await performSearch(ctx.args.query, ctx.args.apiKey);
    console.log(`Found ${results.length} results`);
    return { success: true, results };
  },
});

// CLI usage: mycli search --query "test"
// MCP usage: mycli --s-mcp-serve
```

**Benefits of Migrating:**

- **Less Code**: A single definition replaces two or more complex ones.
- **Simpler Logic**: No more manual MCP mode detection or response formatting.
- **Automatic Schemas**: Flags are automatically converted into the `input_schema` for MCP tools.
- **Automatic Console Safety**: `console.log` is automatically redirected in MCP mode.
- **Optional Output Schemas**: Add `outputSchema` only if you want structured responses for MCP clients - CLI mode works perfectly without them.

---

## Core Concepts

### Defining Flags

Flags are defined using the `IFlag` interface within the `flags` array of a tool or command.

```typescript
interface IFlag {
  name: string; // Internal name (e.g., 'verbose')
  options: string[]; // Command-line options (e.g., ['--verbose', '-v'])
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | Function
    | ZodSchema;
  description?: string; // Help text
  mandatory?: boolean | ((args: any) => boolean); // Whether the flag is required
  defaultValue?: any; // Default value if not provided
  flagOnly?: boolean; // A flag that doesn't consume a value (like --help)
  enum?: any[]; // An array of allowed values
  validate?: (value: any, parsedArgs?: any) => boolean | string | void; // Custom validation function
  allowMultiple?: boolean; // Allow the flag to be provided multiple times
  env?: string | string[]; // Maps flag to environment variable(s). Logic: Fallback (Env -> Flag) and Sync (Flag -> Env). Precedence: Flag > Env > Default.
  dxtOptions?: DxtOptions; // Customizes how this flag appears in DXT package user_config
}

interface DxtOptions {
  type?: "string" | "directory" | "file" | "boolean" | "number"; // UI input type in Claude Desktop
  title?: string; // Display name in Claude Desktop (defaults to formatted flag name)
  sensitive?: boolean; // Whether to hide the value in UI (defaults to true for security)
  default?: any; // Default value for the user_config entry
  min?: number; // Minimum value (for number types)
  max?: number; // Maximum value (for number types)
}
```

### Environment Variable Support

ArgParser provides universal support for environment variables across all commands.

**Features:**

1.  **Automatic Fallback**: If a flag is not provided via CLI, ArgParser looks for configured environment variables.
2.  **Priority Handling**: `CLI Flag` > `Environment Variable` > `Default Value`.
3.  **Reverse Sync**: Once a flag value is resolved (whether from CLI or Env), it is automatically written back to `process.env`. This ensures downstream code accessing `process.env` sees the consistent, final value.
4.  **Array Support**: You can specify multiple env vars for a single flag; the first one found is used.

**Example:**

```typescript
parser.addFlag({
  name: "apiKey",
  type: "string",
  env: ["MY_APP_API_KEY", "LEGACY_API_KEY"], // First match wins
  defaultValue: "dev-key",
});
```

- If passed `--api-key val`: `apiKey` is "val", and `process.env.MY_APP_API_KEY` becomes "val".
- If not passed, but `MY_APP_API_KEY` exists: `apiKey` uses the env value.
- If neither: `apiKey` is "dev-key", and `process.env.MY_APP_API_KEY` is set to "dev-key".

### DXT Package User Configuration & Path Handling

ArgParser v2.5.0 introduces comprehensive DXT (Desktop Extension Toolkit) support with rich user interfaces, automatic path resolution, and context-aware development tools.

#### Enhanced dxtOptions

When generating DXT packages with `--s-build-dxt`, you can create rich user configuration interfaces using `dxtOptions`:

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "file-processor",
    version: "1.0.0",
    logPath: "${HOME}/logs/file-processor.log", // DXT variables supported!
  })
  .addFlag({
    name: "input-file",
    description: "File to process",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      title: "Select Input File",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Output directory for processed files",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/processed-files", // Smart defaults with DXT variables
      title: "Output Directory",
    },
  })
  .addFlag({
    name: "api-key",
    description: "API authentication key",
    type: "string",
    env: "API_KEY",
    dxtOptions: {
      type: "string",
      sensitive: true, // Excluded from DXT manifest for security
      title: "API Key",
    },
  })
  .addFlag({
    name: "quality",
    description: "Processing quality (1-100)",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 100,
      localDefault: 85,
      title: "Quality (%)",
    },
  })
  .addFlag({
    name: "parallel",
    description: "Enable parallel processing",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: true,
      title: "Parallel Processing",
    },
  });
```

#### DXT Variables & Path Resolution

ArgParser automatically resolves paths based on your runtime environment:

```typescript
// DXT variables work everywhere - in flags, MCP config, and code
const logPath = "${HOME}/logs/app.log";
const configPath = "${DOCUMENTS}/myapp/config.json";
const resourcePath = "${__dirname}/templates/default.hbs";

// Helper functions for common patterns
const userDataPath = DxtPathResolver.createUserDataPath("cache.db");
const tempPath = DxtPathResolver.createTempPath("processing.tmp");
const configPath = DxtPathResolver.createConfigPath("settings.json");

// Context detection
const context = DxtPathResolver.detectContext();
if (context.isDxt) {
  console.log("Running in DXT environment");
} else {
  console.log("Running in development");
}
```

**Supported DXT Variables:**

- `${HOME}` - User's home directory
- `${DOCUMENTS}` - Documents folder
- `${DOWNLOADS}` - Downloads folder
- `${DESKTOP}` - Desktop folder
- `${__dirname}` - Entry point directory (DXT package root in DXT)
- `${pathSeparator}` - Platform-specific path separator
- `${DXT_DIR}` - DXT package directory (DXT only)
- `${EXTENSION_DIR}` - Extension root directory (DXT only)

#### dxtOptions Properties

| Property       | Type                                                         | Description                                      |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `type`         | `'string' \| 'file' \| 'directory' \| 'boolean' \| 'number'` | UI component type                                |
| `sensitive`    | `boolean`                                                    | Mark as sensitive (excluded from manifest)       |
| `localDefault` | `string \| number \| boolean`                                | Default for development (supports DXT variables) |
| `multiple`     | `boolean`                                                    | Allow multiple values                            |
| `min` / `max`  | `number`                                                     | Validation constraints                           |
| `title`        | `string`                                                     | Custom display name                              |

#### Security & Best Practices

- **Sensitive Data**: Use `sensitive: true` for passwords, API keys, tokens
- **Smart Defaults**: Use DXT variables in `localDefault` for portable paths
- **Type Safety**: Match `dxtOptions.type` with flag `type` for validation
- **Cross-Platform**: Use `${pathSeparator}` for platform-independent paths

#### Comprehensive Documentation

For detailed guides and examples:

- **[DXT Path Handling Guide](./docs/DXT_PATH_HANDLING.md)** - Complete path resolution guide
- **[dxtOptions API Documentation](./docs/DXT_OPTIONS_API.md)** - Full API reference with examples
- **[DXT Migration Guide](./docs/DXT_MIGRATION.md)** - Migrate existing applications
- **[DXT Practical Examples](./docs/DXT_EXAMPLES.md)** - Real-world usage patterns

### Type Handling and Validation

ArgParser provides **strong typing** for flag definitions with comprehensive validation at both compile-time and runtime. The `type` property accepts multiple formats and ensures type safety throughout your application.

#### Supported Type Formats

You can define flag types using either **constructor functions** or **string literals**:

```typescript
const parser = new ArgParser({
  /* ... */
}).addFlags([
  // Constructor functions (recommended for TypeScript)
  { name: "count", options: ["--count"], type: Number },
  { name: "enabled", options: ["--enabled"], type: Boolean, flagOnly: true },
  { name: "files", options: ["--files"], type: Array, allowMultiple: true },

  // String literals (case-insensitive)
  { name: "name", options: ["--name"], type: "string" },
  { name: "port", options: ["--port"], type: "number" },
  { name: "verbose", options: ["-v"], type: "boolean", flagOnly: true },
  { name: "tags", options: ["--tags"], type: "array", allowMultiple: true },
  { name: "config", options: ["--config"], type: "object" },

  // Custom parser functions (sync)
  {
    name: "date",
    options: ["--date"],
    type: (value: string) => new Date(value),
  },

  // Async custom parser functions
  {
    name: "config",
    options: ["--config"],
    type: async (filePath: string) => {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    },
  },
  {
    name: "user",
    options: ["--user-id"],
    type: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
  },
]);
```

#### Runtime Type Validation

The type system validates flag definitions at runtime and throws descriptive errors for invalid configurations:

```typescript
// ✅ Valid - these work
{ name: "count", options: ["--count"], type: Number }
{ name: "count", options: ["--count"], type: "number" }
{ name: "count", options: ["--count"], type: "NUMBER" } // case-insensitive

// ❌ Invalid - these throw ZodError
{ name: "count", options: ["--count"], type: "invalid-type" }
{ name: "count", options: ["--count"], type: 42 } // primitive instead of constructor
{ name: "count", options: ["--count"], type: null }
```

#### Automatic Type Processing

- **String literals** are automatically converted to constructor functions internally
- **Constructor functions** are preserved as-is
- **Custom parser functions** (sync and async) allow complex transformations
- **undefined** falls back to the default `"string"` type

#### Async Custom Parser Support

Custom parser functions can be **asynchronous**, enabling powerful use cases like file I/O, API calls, and database lookups:

```typescript
const parser = new ArgParser({
  /* ... */
}).addFlags([
  {
    name: "config",
    options: ["--config"],
    type: async (filePath: string) => {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    },
  },
  {
    name: "user",
    options: ["--user-id"],
    type: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error(`User not found: ${userId}`);
      return response.json();
    },
  },
]);

// Usage: --config ./settings.json --user-id 123
const result = await parser.parse(process.argv.slice(2));
// result.config contains parsed JSON from file
// result.user contains user data from API
```

**Key Features:**

- ✅ **Backward compatible** - existing sync parsers continue to work
- ✅ **Automatic detection** - no configuration needed, just return a Promise
- ✅ **Error handling** - async errors are properly propagated
- ✅ **Performance** - parsers run concurrently when possible

#### Type Conversion Examples

```typescript
// String flags
--name value          → "value"
--name="quoted value" → "quoted value"

// Number flags
--count 42           → 42
--port=8080          → 8080

// Boolean flags (flagOnly: true)
--verbose            → true
(no flag)            → false

// Array flags (allowMultiple: true)
--tags tag1,tag2,tag3           → ["tag1", "tag2", "tag3"]
--file file1.txt --file file2.txt → ["file1.txt", "file2.txt"]

// Custom parser functions (sync)
--date "2023-01-01"  → Date object
--json '{"key":"val"}' → parsed JSON object

// Async custom parser functions
--config "./settings.json" → parsed JSON from file (async)
--user-id "123"            → user data from API (async)

// Zod schema validation (structured JSON)
--config '{"host":"localhost","port":5432}' → validated object
--deployment '{"env":"prod","region":"us-east-1"}' → validated object
```

#### Zod Schema Flags (Structured JSON Validation)

**Since v2.5.0** - You can now use Zod schemas as flag types for structured JSON input with automatic validation and proper MCP JSON Schema generation:

```typescript
import { z } from "zod";

const DatabaseConfigSchema = z.object({
  host: z.string().describe("Database host address"),
  port: z.number().min(1).max(65535).describe("Database port number"),
  credentials: z.object({
    username: z.string().describe("Database username"),
    password: z.string().describe("Database password"),
  }),
  ssl: z.boolean().optional().describe("Enable SSL connection"),
});

const cli = ArgParser.withMcp({
  appName: "Database CLI",
  appCommandName: "db-cli",
}).addTool({
  name: "connect",
  description: "Connect to database with structured configuration",
  flags: [
    {
      name: "config",
      options: ["--config", "-c"],
      type: DatabaseConfigSchema, // 🎉 Zod schema as type!
      description: "Database configuration as JSON object",
      mandatory: true,
    },
  ],
  handler: async (ctx) => {
    // ctx.args.config is fully typed and validated!
    const { host, port, credentials, ssl } = ctx.args.config;
    console.log(`Connecting to ${host}:${port} as ${credentials.username}`);
    return { success: true };
  },
});

// CLI usage with JSON validation:
// db-cli connect --config '{"host":"localhost","port":5432,"credentials":{"username":"admin","password":"secret"},"ssl":true}'

// MCP usage: Generates proper JSON Schema for MCP clients
// db-cli --s-mcp-serve
```

**Example with Complex Nested Schema:**

```typescript
const DeploymentSchema = z.object({
  environment: z.enum(["dev", "staging", "prod"]),
  region: z.string(),
  scaling: z.object({
    minInstances: z.number().min(1),
    maxInstances: z.number().min(1),
    targetCpu: z.number().min(10).max(100),
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    alertEmail: z.string().email().optional(),
    metrics: z.array(z.string()),
  }),
});

// This generates comprehensive JSON Schema for MCP clients
// while providing full validation and type safety for CLI usage
```

### Hierarchical CLIs (Sub-Commands)

While `addTool()` is the recommended way to create subcommands that are also MCP-compatible, you can use `.addSubCommand()` for traditional CLI hierarchies.

> **Note**: By default, subcommands created with `.addSubCommand()` are exposed to MCP as tools. If you want to create CLI-only subcommands, set `includeSubCommands: false` when adding tools.

```typescript
// Create a parser for a nested command
const logsParser = new ArgParser().addFlags([
  { name: "follow", options: ["-f"], type: "boolean", flagOnly: true },
]);

// This creates a command group: `my-cli monitor`
const monitorParser = new ArgParser().addSubCommand({
  name: "logs",
  description: "Show application logs",
  parser: logsParser,
  handler: ({ args }) => console.log(`Following logs: ${args.follow}`),
});

// Attach the command group to the main CLI
const cli = new ArgParser().addSubCommand({
  name: "monitor",
  description: "Monitoring commands",
  parser: monitorParser,
});

// Usage: my-cli monitor logs -f
```

#### MCP Exposure Control

```typescript
// By default, subcommands are exposed to MCP
const mcpTools = parser.toMcpTools(); // Includes all subcommands

// To exclude subcommands from MCP (CLI-only)
const mcpToolsOnly = parser.toMcpTools({ includeSubCommands: false });

// Name conflicts: You cannot have both addSubCommand("name") and addTool({ name: "name" })
// This will throw an error:
parser.addSubCommand({ name: "process", parser: subParser });
parser.addTool({ name: "process", handler: async () => {} }); // ❌ Error: Sub-command 'process' already exists
```

### Flag Inheritance (`inheritParentFlags`)

ArgParser supports flag inheritance for CLI hierarchies. By default, sub-commands do not inherit flags from their parents. You can control this behavior using the `inheritParentFlags` option, using either a boolean (for basic/legacy behavior) or the `FlagInheritance` configuration object (for advanced control).

#### Basic Inheritance (Snapshot)

Set `inheritParentFlags: true` (or `FlagInheritance.DirectParentOnly`) to inherit flags from the _direct parent_ at the moment the sub-command is attached.

> **Note**: This is a snapshot of the parent's flags at the time `.addSubCommand()` is called. If the parent acquires new flags later (e.g., by inheriting from a grandparent), the child will NOT see them unless `FlagInheritance.AllParents` is used.

```typescript
// Child inherits current flags from parent
const childParser = new ArgParser({ inheritParentFlags: true });
```

#### Full Chain Inheritance

For complex hierarchies (e.g. `root -> mid -> leaf`), especially when constructing parsers bottom-up, use `FlagInheritance.AllParents`. This ensures that flags propagate down the entire chain, even if the intermediate parent inherits them _after_ the leaf was attached.

```typescript
import { ArgParser, FlagInheritance } from "@alcyone-labs/arg-parser";

const root = new ArgParser().addFlag({
  name: "root-flag",
  options: ["--root"],
});
const mid = new ArgParser({ inheritParentFlags: FlagInheritance.AllParents });
const leaf = new ArgParser({ inheritParentFlags: FlagInheritance.AllParents });

// Even if you link bottom-up:
mid.addSubCommand({ name: "leaf", parser: leaf });
root.addSubCommand({ name: "mid", parser: mid });

// 'leaf' will correctly have 'root-flag' thanks to deep propagation
```

#### Inheritance Options Reference

| Value                              | Legacy Boolean | Behavior                                                    |
| ---------------------------------- | -------------- | ----------------------------------------------------------- |
| `FlagInheritance.NONE`             | `false`        | No flags are inherited (Default)                            |
| `FlagInheritance.DirectParentOnly` | `true`         | Inherits from direct parent only (Snapshot)                 |
| `FlagInheritance.AllParents`       | N/A            | Inherits from entire ancestor chain (Recursive Propagation) |

### Dynamic Flags (`dynamicRegister`)

Register flags at runtime from another flag's value (e.g., load a manifest and add flags programmatically). This works in normal runs and when showing `--help`.

- Two-phase parsing: loader flags run first, can register more flags, then parsing continues with the full set
- Help preload: when `--help` is present, dynamic loaders run to show complete help (no command handlers execute)
- Cleanup: dynamic flags are removed between parses (no accumulation)
- Async-friendly: loaders can be async (e.g., `fs.readFile`)

```ts
import { readFile } from "node:fs/promises";
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser().addFlags([
  {
    name: "manifest",
    options: ["-w", "--manifest"],
    type: "string",
    description: "Path to manifest.json that defines extra flags",
    dynamicRegister: async ({ value, registerFlags }) => {
      const json = JSON.parse(await readFile(value, "utf8"));
      if (Array.isArray(json.flags)) {
        // Each entry should be a valid IFlag
        registerFlags(json.flags);
      }
    },
  },
]);

// Examples:
// my-cli -w manifest.json --help     → help includes dynamic flags
// my-cli -w manifest.json --foo bar  → dynamic flag "--foo" parsed/validated normally
```

Notes:

- Inherited behavior works normally: if loader lives on a parent parser and children use `inheritParentFlags`, dynamic flags will be visible to children
- For heavy loaders, implement app-level caching inside your `dynamicRegister` (e.g., memoize by absolute path + mtime); library-level caching may be added later

### Automatic Help Display

ArgParser provides features to automatically show help messages when a command is invoked incorrectly or as a "container" command.

- **`ctx.displayHelp()`**: Programmatically trigger help for the current command from within its handler.
- **`autoHelpHandler`**: A pre-built handler for container commands (e.g., `git remote`) that simply displays the help text.
- **`triggerAutoHelpIfNoHandler`**: A setting that, when enabled, automatically triggers the help display for any command or sub-command that does not have an explicit handler defined.

For more details, see the [Automatic Help Display Guide](docs/DISPLAY_HELP.md) and the [example demo](examples/auto-help-demo.ts).

---

## MCP & Claude Desktop Integration

### Output Schema Support

Output schemas are **completely optional** and **only affect MCP mode** (Claude Desktop, MCP clients). They have **zero impact** on CLI usage - your CLI will work exactly the same with or without them.

**When do I need output schemas?**

- ❌ **CLI-only usage**: Never needed - skip this section entirely
- ✅ **MCP integration**: Optional but recommended for better structured responses
- ✅ **Claude Desktop**: Helpful for Claude to understand your tool's output format

**Key Points:**

- ✅ **CLI works perfectly without them**: Your command-line interface is unaffected
- ✅ **MCP-only feature**: Only used when running with `--s-mcp-serve`
- ✅ **Version-aware**: Automatically included only for compatible MCP clients (v2025-06-18+)
- ✅ **Flexible**: Use predefined patterns or custom Zod schemas

#### Basic Usage

```typescript
import { z } from "zod";

.addTool({
  name: "process-file",
  description: "Process a file",
  flags: [
    { name: "path", options: ["--path"], type: "string", mandatory: true }
  ],
  // Optional: Only needed if you want structured MCP responses
  // CLI mode works exactly the same whether this is present or not
  outputSchema: {
    success: z.boolean().describe("Whether processing succeeded"),
    filePath: z.string().describe("Path to the processed file"),
    size: z.number().describe("File size in bytes"),
    lastModified: z.string().describe("Last modification timestamp")
  },
  handler: async (ctx) => {
    // Your logic here - same code for both CLI and MCP
    // The outputSchema doesn't change how this function works
    return {
      success: true,
      filePath: ctx.args.path,
      size: 1024,
      lastModified: new Date().toISOString()
    };
  }
})

// CLI usage (outputSchema ignored): mycli process-file --path /my/file.txt
// MCP usage (outputSchema provides structure): mycli --s-mcp-serve
```

#### Predefined Schema Patterns

For common use cases, use predefined patterns:

```typescript
// For simple success/error responses
outputSchema: "successError";

// For operations that return data
outputSchema: "successWithData";

// For file operations
outputSchema: "fileOperation";

// For process execution
outputSchema: "processExecution";

// For list operations
outputSchema: "list";
```

#### Custom Zod Schemas

For complex data structures:

```typescript
outputSchema: z.object({
  analysis: z.object({
    summary: z.string(),
    wordCount: z.number(),
    sentiment: z.enum(["positive", "negative", "neutral"]),
  }),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
  }),
});
```

#### MCP Version Compatibility

Output schemas are automatically handled based on MCP client version:

- **MCP v2025-06-18+**: Full output schema support with `structuredContent`
- **Earlier versions**: Schemas ignored, standard JSON text response only

To explicitly set the MCP version for testing:

```typescript
const cli = ArgParser.withMcp({
  // ... your config
}).setMcpProtocolVersion("2025-06-18"); // Enable output schema support
```

**Important**:

- **CLI users**: You can ignore MCP versions entirely - they don't affect command-line usage
- **MCP users**: ArgParser handles version detection automatically based on client capabilities

#### Automatic Error Handling

ArgParser automatically handles errors differently based on execution context, so your handlers can simply throw errors without worrying about CLI vs MCP mode:

```typescript
const cli = ArgParser.withMcp({
  // ... config
}).addTool({
  name: "process-data",
  handler: async (ctx) => {
    // Simply throw errors - ArgParser handles the rest automatically
    if (!ctx.args.apiKey) {
      throw new Error("API key is required");
    }

    // Do your work and return results
    return { success: true, data: processedData };
  },
});
```

**How it works:**

- **CLI mode**: Thrown errors cause the process to exit with error code 1
- **MCP mode**: Thrown errors are automatically converted to structured MCP error responses
- **No manual checks needed**: Handlers don't need to check `ctx.isMcp` or handle different response formats

### Writing Effective MCP Tool Descriptions

**Why descriptions matter**: When your tools are exposed to Claude Desktop or other MCP clients, the `description` field is the primary way LLMs understand what your tool does and when to use it. A well-written description significantly improves tool selection accuracy and user experience.

#### Best Practices for Tool Descriptions

**1. Start with the action** - Begin with a clear verb describing what the tool does:

```typescript
// ✅ Good: Action-first, specific
description: "Analyzes text files and returns detailed statistics including word count, character count, and sentiment analysis";

// ❌ Avoid: Vague or noun-heavy
description: "File analysis tool";
```

**2. Include context and use cases** - Explain when and why to use the tool:

```typescript
// ✅ Good: Provides context
description: "Converts image files between formats (PNG, JPEG, WebP). Use this when you need to change image format, resize images, or optimize file sizes. Supports batch processing of multiple files.";

// ❌ Avoid: No context
description: "Converts images";
```

**3. Mention key parameters and constraints** - Reference important inputs and limitations:

```typescript
// ✅ Good: Mentions key parameters and constraints
description: "Searches through project files using regex patterns. Specify the search pattern and optionally filter by file type. Supports JavaScript, TypeScript, Python, and text files up to 10MB.";

// ❌ Avoid: No parameter guidance
description: "Searches files";
```

**4. Be specific about outputs** - Describe what the tool returns:

```typescript
// ✅ Good: Clear output description
description: "Analyzes code complexity and returns metrics including cyclomatic complexity, lines of code, and maintainability index. Results include detailed breakdown by function and overall file scores.";

// ❌ Avoid: Unclear output
description: "Analyzes code";
```

#### Complete Example: Well-Documented Tool

```typescript
.addTool({
  name: "analyze-repository",
  description: "Analyzes a Git repository and generates comprehensive statistics including commit history, contributor activity, code quality metrics, and dependency analysis. Use this to understand project health, identify bottlenecks, or prepare reports. Supports Git repositories up to 1GB with history up to 5 years.",
  flags: [
    {
      name: "path",
      description: "Path to the Git repository root directory",
      options: ["--path", "-p"],
      type: "string",
      mandatory: true,
    },
    {
      name: "include-dependencies",
      description: "Include analysis of package.json dependencies and security vulnerabilities",
      options: ["--include-dependencies", "-d"],
      type: "boolean",
      flagOnly: true,
    },
    {
      name: "output-format",
      description: "Output format for the analysis report",
      options: ["--output-format", "-f"],
      type: "string",
      choices: ["json", "markdown", "html"],
      defaultValue: "json",
    }
  ],
  handler: async (ctx) => {
    // Implementation here
  }
})
```

#### Parameter Description Guidelines

Each flag should have a clear, concise description:

```typescript
// ✅ Good parameter descriptions
{
  name: "timeout",
  description: "Maximum execution time in seconds (default: 30, max: 300)",
  options: ["--timeout", "-t"],
  type: "number",
}

{
  name: "verbose",
  description: "Enable detailed logging output including debug information",
  options: ["--verbose", "-v"],
  type: "boolean",
  flagOnly: true,
}

{
  name: "format",
  description: "Output format for results (json: structured data, csv: spreadsheet-friendly, pretty: human-readable)",
  options: ["--format"],
  type: "string",
  choices: ["json", "csv", "pretty"],
}
```

#### Common Pitfalls to Avoid

- **Don't be overly technical**: Avoid jargon that doesn't help with tool selection
- **Don't repeat the tool name**: The name is already visible, focus on functionality
- **Don't use generic terms**: "Process data" or "handle files" are too vague
- **Don't forget constraints**: Mention important limitations or requirements
- **Don't ignore parameter descriptions**: Each flag should have a helpful description

**Remember**: A good description helps the LLM choose the right tool for the task and use it correctly. Invest time in writing clear, comprehensive descriptions - it directly impacts the user experience in Claude Desktop and other MCP clients.

### Automatic MCP Server Mode (`--s-mcp-serve`)

You don't need to write any server logic. Run your application with the `--s-mcp-serve` flag, and ArgParser will automatically start a compliant MCP server, exposing all tools defined with `.addTool()` and subcommands created with `.addSubCommand()` (unless `includeSubCommands: false` is set).

```bash
# This single command starts a fully compliant MCP server
my-cli-app --s-mcp-serve

# You can also override transports and ports using system flags
my-cli-app --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3001

# Configure custom log file path for MCP server logs
my-cli-app --s-mcp-serve --s-mcp-log-path ./custom-logs/mcp-server.log

# Or configure logging programmatically in withMcp()
const cli = ArgParser.withMcp({
  appName: 'My CLI App',
  appCommandName: 'my-cli-app',
  mcp: {
    serverInfo: { name: 'my-server', version: '1.0.0' },
    // NEW: Improved logging with level control
    log: {
      level: 'info',        // Captures info, warn, error
      logToFile: './my-logs/mcp-server.log',
      prefix: 'MyApp'
    }
    // LEGACY: logPath: './my-logs/mcp-server.log'  // Still works
  }
});
```

### MCP Transports

You can define the transports directly in the .withMcp() settings, or override them via the `--s-mcp-transport(s)` flags.

```bash
# Single transport
my-tool --s-mcp-serve --s-mcp-transport stdio

# Multiple transports via JSON
my-tool --s-mcp-serve --s-mcp-transports '[{"type":"stdio"},{"type":"sse","port":3001}]'

# Single transport with custom options
my-tool --s-mcp-serve --s-mcp-transport sse --s-mcp-port 3000 --s-mcp-host 0.0.0.0

# Streamable HTTP CORS/auth via CLI flags (JSON strings)
my-tool --s-mcp-serve \
  --s-mcp-transport streamable-http \
  --s-mcp-port 3002 --s-mcp-path /api/mcp \
  --s-mcp-cors '{"origins":["http://localhost:5173"],"credentials":true,"methods":["GET","POST","OPTIONS"],"maxAge":600}' \
  --s-mcp-auth '{"required":true,"scheme":"jwt","jwt":{"algorithms":["HS256"],"secret":"$MY_JWT_SECRET"},"publicPaths":["/health"]}'


# Custom log path via CLI flag (logs to specified file instead of ./logs/mcp.log)
my-tool --s-mcp-serve --s-mcp-log-path /var/log/my-mcp-server.log

# Improved logging via programmatic configuration
const parser = ArgParser.withMcp({
  mcp: {
    serverInfo: { name: 'my-tool', version: '1.0.0' },

```

### CORS and Authentication for streamable-http

CORS is often required when connecting a Web UI to an MCP server over HTTP.

- Programmatic transport config:

```ts
import type { McpTransportConfig } from "@alcyone-labs/arg-parser";

const defaultTransports: McpTransportConfig[] = [
  {
    type: "streamable-http",
    port: 3002,
    path: "/api/mcp",
    cors: {
      origins: ["http://localhost:5173", /^https?:\/\/example\.com$/],
      methods: ["GET", "POST", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "MCP-Session-Id"],
      exposedHeaders: ["MCP-Session-Id"],
      credentials: true,
      maxAge: 600,
    },
    auth: {
      required: true,
      scheme: "jwt", // or "bearer"
      // Bearer allowlist:
      // allowedTokens: ["token1","token2"],
      // JWT verification (HS256):
      // jwt: { algorithms: ["HS256"], secret: process.env.JWT_SECRET },
      // JWT verification (RS256 with static public key):
      // jwt: { algorithms: ["RS256"], publicKey: process.env.RS256_PUBLIC_KEY },
      // JWT verification (RS256 with dynamic JWKS):
      // jwt: { algorithms: ["RS256"], getPublicKey: async (header)=>{ /* fetch JWKS and return PEM */ } },
      publicPaths: ["/health"],
      protectedPaths: undefined, // if set, only listed paths require auth
      // Optional custom validator to add extra checks
      validator: async (req, token) => true,
    },
  },
];
```

- CLI flags (JSON strings):

```bash
my-tool --s-mcp-serve \
  --s-mcp-transport streamable-http \
  --s-mcp-port 3002 --s-mcp-path /api/mcp \
  --s-mcp-cors '{"origins":["http://localhost:5173"],"credentials":true,"methods":["GET","POST","OPTIONS"],"maxAge":600}' \
  --s-mcp-auth '{"required":true,"scheme":"jwt","jwt":{"algorithms":["HS256"],"secret":"'$JWT_SECRET'"},"publicPaths":["/health"]}'
```

- Express hook for custom routes:

```ts
httpServer: {
  configureExpress: (app) => {
    app.get("/health", (_req, res) => res.json({ ok: true }));
  },
}
```

See examples:

- examples/streamable-http/secure-mcp.ts (HS256)
- examples/streamable-http/rs256-mcp.ts (RS256)
- examples/streamable-http/jwks-mcp.ts (JWKS)
- examples/streamable-http/bearer-mcp.ts (Bearer)
- examples/streamable-http/productized-mcp.ts (token + session usage)

#### TypeScript types

- CorsOptions

```ts
export type CorsOptions = {
  origins?: "*" | string | RegExp | Array<string | RegExp>;
  methods?: string[];
  headers?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
};
```

- AuthOptions and JwtVerifyOptions

```ts
export type JwtVerifyOptions = {
  algorithms?: ("HS256" | "RS256")[];
  secret?: string; // HS256
  publicKey?: string; // RS256 static
  getPublicKey?: (
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) => Promise<string> | string; // RS256 dynamic
  audience?: string | string[];
  issuer?: string | string[];
  clockToleranceSec?: number;
};

export type AuthOptions = {
  required?: boolean; // default true for MCP endpoint
  scheme?: "bearer" | "jwt";
  allowedTokens?: string[]; // simple bearer allowlist
  validator?: (
    req: any,
    token: string | undefined,
  ) => boolean | Promise<boolean>;
  jwt?: JwtVerifyOptions;
  publicPaths?: string[]; // paths that skip auth
  protectedPaths?: string[]; // if provided, only these paths require auth
  customMiddleware?: (req: any, res: any, next: any) => any; // full control hook
};
```

- HttpServerOptions

```ts
export type HttpServerOptions = {
  configureExpress?: (app: any) => void;
};
```

Notes:

- When credentials are true, Access-Control-Allow-Origin echoes the request Origin rather than using "\*".
- You can manage CORS for non-MCP routes in configureExpress.
- Use publicPaths to allow some routes without auth; use protectedPaths to only require auth for certain routes.

  log: {
  level: 'debug', // Capture all log levels
  logToFile: '/var/log/my-mcp-server.log',
  prefix: 'MyTool'
  }
  // LEGACY: logPath: '/var/log/my-mcp-server.log' // Still works
  }

### Adding custom HTTP routes (e.g., /health)

Use the httpServer.configureExpress(app) hook to register routes before MCP endpoints are bound. Example:

```ts
const cli = ArgParser.withMcp({
  mcp: {
    serverInfo: { name: "my-mcp", version: "1.0.0" },
    defaultTransports: [
      {
        type: "streamable-http",
        port: 3002,
        path: "/api/mcp",
        auth: { required: true, publicPaths: ["/health"] },
      },
    ],
    httpServer: {
      configureExpress: (app) =>
        app.get("/health", (_req, res) => res.json({ ok: true })),
    },
  },
});
```

- To make a route public (no auth), add it to auth.publicPaths.
- CORS headers for non-MCP paths can be applied by your own middleware inside the hook if desired.

### Multiple transports and improved logging

const cli = ArgParser.withMcp({
appName: 'multi-tool',
appCommandName: 'multi-tool',
mcp: {
// NEW: improved logging configuration
log: {
level: 'info',
logToFile: './logs/multi-tool-mcp.log',
prefix: 'MultiTool'
},
serverInfo: {
name: 'multi-tool-mcp',
version: '1.0.0'
},
transports: [
// Can be a single string...
"stdio",
// or one of the other transport types supported by @modelcontextprotocol/sdk
{ type: "sse", port: 3000, host: "0.0.0.0" },
{ type: "websocket", port: 3001, path: "/ws" }
]
}
});

````

### MCP Logging Configuration

MCP server logging can be configured with McpLoggerOptions options using `@alcyone-labs/simple-mcp-logger`. You can control log levels, output destinations, and more.

#### Enhanced Logging (Recommended)

Use the new `log` property for comprehensive logging control:

```typescript
const parser = ArgParser.withMcp({
  appName: "My MCP Server",
  appCommandName: "my-mcp-server",
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    log: {
      level: "debug", // Captures debug, info, warn, error
      logToFile: "./logs/comprehensive.log",
      prefix: "MyServer",
      mcpMode: true, // MCP compliant (default)
    },
  },
});
````

**Available log levels**: `"debug"` | `"info"` | `"warn"` | `"error"` | `"silent"`

**Type Safety**: The `McpLoggerOptions` type is provided for full TypeScript support and matches the interface from `@alcyone-labs/simple-mcp-logger`.

#### Simple Logging Configuration

For basic use cases, you can use a simple string path:

```typescript
const parser = ArgParser.withMcp({
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    log: "./logs/simple.log", // Simple string path
  },
});
```

#### Configuration Priority

Logging configuration follows this priority order:

1. **CLI Flag (Highest Priority)**: `--s-mcp-log-path <path>`
2. **Merging**: When both `mcp.log` and `mcp.logPath` are present:
   - `mcp.log` provides logger options (level, prefix, mcpMode)
   - `mcp.logPath` provides flexible path resolution (relativeTo, basePath)
   - Path resolution: `mcp.logPath` > `mcp.log.logToFile`
3. **Log Config Only**: `mcp.log` object or string in `withMcp()`
4. **Legacy Log Path Only**: `mcp.logPath` in `withMcp()`
5. **Default Path (Fallback)**: `./logs/mcp.log`

#### Configuration Merging

When both `log` and `logPath` are specified:

```typescript
const parser = ArgParser.withMcp({
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    // log provides logger options (level, prefix, mcpMode)
    log: {
      level: "debug",
      prefix: "MyServer",
      mcpMode: true,
      // logToFile can be omitted when using logPath
    },
    // logPath provides flexible path resolution
    logPath: {
      path: "./logs/app.log",
      relativeTo: "entry", // "entry" | "cwd" | "absolute"
      basePath: "/custom/base", // Optional custom base path
    },
  },
});
```

**Merging behavior:**

- `log` provides logger configuration (level, prefix, mcpMode)
- `logPath` provides flexible path resolution with `relativeTo` options
- If both specify a file path, `logPath` takes precedence for path resolution
- This preserves the powerful `LogPath` features while using `McpLoggerOptions` for logger settings

#### Path Resolution Options

Log paths are resolved with smart defaults for better DXT package compatibility:

```typescript
// Simple string paths (recommended)
const parser = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "my-cli",
  mcp: {
    serverInfo: { name: "my-server", version: "1.0.0" },
    logPath: "./logs/app.log", // Relative to entry point (default)
    // logPath: "/tmp/app.log",          // Absolute paths work too
    // logPath: "cwd:./logs/app.log",    // Explicit process.cwd() relative
  },
});

// Object configuration for more granular use cases
const parser = ArgParser.withMcp({
  // ... other config
  mcp: {
    // ... server info
    logPath: {
      path: "./logs/app.log",
      relativeTo: "entry", // "entry" | "cwd" | "absolute"
      basePath: "/custom/base", // Optional custom base path
    },
  },
});

// CLI flag overrides programmatic setting
// my-cli --s-mcp-serve --s-mcp-log-path ./override.log
```

The CLI flag always takes precedence, allowing users to override the developer's programmatic configuration when needed. By default, relative paths resolve relative to the application's entry point, making logs predictably located near DXT packages.

### MCP Lifecycle Events

ArgParser MCP servers support lifecycle events that allow you to perform initialization, cleanup, and other operations at specific points in the MCP protocol flow. These events are particularly useful for database connections, resource setup, and graceful shutdown procedures.

```typescript
const cli = ArgParser.withMcp({
  appName: "Database CLI",
  appCommandName: "db-cli",
  mcp: {
    serverInfo: { name: "database-server", version: "1.0.0" },
    lifecycle: {
      onInitialize: async (ctx) => {
        // Called when client sends "initialize" request
        // Perfect for database connections, resource setup
        ctx.logger.mcpError("Initializing server...");

        const dbUrl = ctx.getFlag("database_url");
        if (dbUrl) {
          await connectToDatabase(dbUrl);
          ctx.logger.mcpError("Database connected successfully");
        }
      },

      onInitialized: async (ctx) => {
        // Called when client sends "initialized" notification
        // Server is ready for normal operations
        ctx.logger.mcpError("Server ready for requests");
        await startBackgroundTasks();
      },

      onShutdown: async (ctx) => {
        // Called during server shutdown
        // Perfect for cleanup, closing connections
        ctx.logger.mcpError(`Shutting down: ${ctx.reason}`);
        await cleanupResources();
        await closeDatabase();
      },
    },
  },
});
```

**Lifecycle Events:**

- **`onInitialize`**: Called when a client sends an "initialize" request. Ideal for database connections, resource initialization, configuration validation, and authentication setup.
- **`onInitialized`**: Called when a client sends an "initialized" notification, indicating the client is ready for normal operations. Perfect for final setup steps and background task initialization.
- **`onShutdown`**: Called when the MCP server is shutting down. Essential for cleanup, resource disposal, and graceful shutdown procedures.

**Context Properties:**

Each lifecycle event receives a context object with:

- `getFlag(name)`: Access parsed CLI flags and environment variables
- `logger`: MCP-compliant logger instance for the current context
- `serverInfo`: Server information (name, version, description)
- `clientInfo`: Client information (available in onInitialize and onInitialized)
- `protocolVersion`: MCP protocol version being used
- `reason`: Shutdown reason (only in onShutdown: "client_disconnect", "server_shutdown", "error", "signal")

### MCP Resources - Real-Time Data Feeds

MCP Resources enable your CLI tools to provide **real-time, subscription-based data feeds** to AI assistants. Unlike tools (which are called once), resources can be subscribed to and provide live updates when data changes.

**Key Benefits:**

- **Real-time notifications**: AI assistants get notified when your data changes
- **Flexible URI templates**: Support dynamic parameters like `data://alerts/aged/gte:{threshold}`
- **Standard MCP pattern**: Full subscription lifecycle support
- **Zero CLI impact**: Resources only work in MCP mode, CLI usage unchanged

#### Basic Resource Setup

```typescript
const parser = ArgParser.withMcp({
  appName: "Data Monitor",
  appCommandName: "data-monitor",
  mcp: {
    serverInfo: { name: "data-monitor", version: "1.0.0" },
  },
}).addMcpResource({
  name: "recent-data",
  uriTemplate: "data://recent",
  title: "Recent Data",
  description: "Get the most recent data entries",
  mimeType: "application/json",
  handler: async (uri) => {
    const recentData = await getRecentData();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(recentData, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  },
});
```

#### URI Templates with Dynamic Parameters

Create flexible resources that accept parameters:

```typescript
.addMcpResource({
  name: "aged-data-alert",
  uriTemplate: "data://alerts/aged/gte:{threshold}",
  title: "Aged Data Alert",
  description: "Monitor data that has aged past a threshold (in milliseconds)",
  handler: async (uri, { threshold }) => {
    const thresholdMs = parseInt(threshold);
    const agedData = await getDataOlderThan(new Date(Date.now() - thresholdMs));

    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          threshold_ms: thresholdMs,
          query_time: new Date().toISOString(),
          aged_data: agedData,
          count: agedData.length
        }, null, 2),
        mimeType: "application/json"
      }]
    };
  }
});
```

#### MCP Subscription Lifecycle

Resources support the full MCP subscription pattern:

1. **Client subscribes**: `resources/subscribe` → `"data://alerts/aged/gte:10000"`
2. **Server monitors**: Your application detects data changes
3. **Server notifies**: `notifications/resources/updated` sent to subscribed clients
4. **Client reads fresh data**: `resources/read` → `"data://alerts/aged/gte:10000"`
5. **Client unsubscribes**: `resources/unsubscribe` when done

#### Usage Examples

**AI Assistant Integration:**

```typescript
// AI assistant can subscribe to real-time data
await client.request("resources/subscribe", {
  uri: "data://alerts/aged/gte:60000", // 1 minute threshold
});

// Handle notifications
client.on("notifications/resources/updated", async (notification) => {
  const response = await client.request("resources/read", {
    uri: notification.uri,
  });
  console.log("Fresh data:", JSON.parse(response.contents[0].text));
});
```

**Command Line Testing:**

```bash
# Start MCP server
data-monitor --s-mcp-serve

# Test resource (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"data://alerts/aged/gte:10000"}}' | data-monitor --s-mcp-serve
```

#### Design Patterns

**Static Resources**: Use simple URIs for data that changes content but not structure

```typescript
uriTemplate: "logs://recent"; // Always available, content updates
uriTemplate: "status://system"; // System status, updates in real-time
```

**Parameterized Resources**: Use URI templates for flexible filtering

```typescript
uriTemplate: "data://type/{type}"; // Filter by type
uriTemplate: "alerts/{severity}/gte:{age}"; // Multiple parameters
uriTemplate: "search/{query}/limit:{count}"; // Search with limits
```

**Time-Based Resources**: Perfect for monitoring and alerting

```typescript
uriTemplate: "events/since:{timestamp}"; // Events since timestamp
uriTemplate: "metrics/aged/gte:{threshold}"; // Metrics past threshold
uriTemplate: "logs/errors/last:{duration}"; // Recent errors
```

> **💡 Pro Tip**: Resources are perfect for monitoring, alerting, and real-time data feeds. They complement tools (one-time actions) by providing continuous data streams that AI assistants can subscribe to.

### Automatic Console Safety

A major challenge in MCP is preventing `console.log` from corrupting the JSON-RPC communication over `STDOUT`. ArgParser solves this automatically.

- **How it works**: When `--s-mcp-serve` is active, ArgParser hijacks the global `console` object.
- **What it does**: It redirects `console.log`, `.info`, `.warn`, and `.debug` to `STDERR` with a prefix, making them visible for debugging without interfering with the protocol. `console.error` is preserved on `STDERR` as expected.
- **Your benefit**: You can write `console.log` statements freely in your handlers. They will work as expected in CLI mode and be safely handled in MCP mode with **zero code changes**.

### Generating DXT Packages (`--s-build-dxt`)

A Desktop Extension (`.dxt`) is a standardized package for installing your tools into Claude Desktop. ArgParser automates this process.

```bash
# 1. Generate the DXT package contents into a directory
my-cli-app --s-build-dxt ./my-dxt-package

# The output folder contains everything needed: manifest.json, entry point, etc.
# A default logo will be applied if you don't provide one.

# 2. (Optional) Pack the folder into a .dxt file for distribution
# (you can install the unpacked folder) directly in Claude Desktop > Settings > Extensions > Advanced
npx @anthropic-ai/dxt pack ./my-dxt-package

# 3. (Optional) Sign the DXT package - this has not been well tested yet
npx @anthropic-ai/dxt sign ./my-dxt-package.dxt

# Then drag & drop the .dxt file into Claude Desktop to install it, in the Settings > Extensions screen.

# **IMPORTANT**:
# If you use ML models or packages that include binaries such as Sqlite3 or sharp, etc...
# You need to bundle the node_modules folder with your DXT package
# In order to do this, you need to use the following flag:
# First hard-install all the packages
rm -rf node_moduels
pnpm install --prod --linker hoisted
# Then bundle with node_modules
mycli --s-build-dxt ./my-dxt-package --s-with-node-modules
# then build the dxt bundle
npx @anthropic-ai/dxt pack ./my-dxt-package
# then upload the dxt bundle to Claude Desktop from the settings > extensions > advanced
```

### Logo Configuration

The logo will appear in Claude Desktop's Extensions settings and when users interact with your MCP tools. Note that neither ArgParser nor Anthropic packer will modify the logo, so make sure to use a reasonable size, such as 256x256 pixels or 512x512 pixels maximum. Any image type that can display in a browser is supported.

You can customize the logo/icon that appears in Claude Desktop for your DXT package by configuring the `logo` property in your `serverInfo`:

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  mcp: {
    // This will appear in Claude Desktop's Extensions settings
    serverInfo: {
      name: "my-mcp-server",
      version: "1.0.0",
      description: "My CLI as an MCP server",
      logo: "./assets/my-logo.png", // Local file path
    },
  },
});
```

If no custom logo is provided or loading fails, a default ArgParser logo is included

#### Supported Logo Sources

**Local File Path:**

```typescript
logo: "./assets/my-logo.png"; // Relative to your project
logo: "/absolute/path/to/logo.jpg"; // Absolute path
```

**HTTP/HTTPS URL:**

```typescript
logo: "https://example.com/logo.png"; // Downloaded automatically
logo: "https://cdn.example.com/icon.svg";
```

### Including Additional Files in DXT Packages

You can include additional files and directories in your DXT package using the `dxt.include` configuration. This is useful for bundling database migrations, configuration files, assets, or any other files your MCP server needs at runtime.

```typescript
const cli = ArgParser.withMcp({
  appName: "My CLI",
  appCommandName: "mycli",
  mcp: {
    serverInfo: {
      name: "my-mcp-server",
      version: "1.0.0",
      description: "My CLI as an MCP server",
    },
    dxt: {
      include: [
        "migrations", // Copy entire migrations folder
        "config/production.json", // Copy specific file
        { from: "assets/logo.png", to: "logo.png" }, // Copy and rename file
        { from: "scripts", to: "bin" }, // Copy folder with new name
      ],
    },
  },
});
```

#### Include Options

**Simple string paths** - Copy files/directories to the same relative location:

```typescript
include: [
  "migrations", // Copies ./migrations/ to dxt/migrations/
  "config/default.json", // Copies ./config/default.json to dxt/config/default.json
];
```

**Object mapping** - Copy with custom destination paths:

```typescript
include: [
  { from: "config/prod.json", to: "config.json" }, // Rename during copy
  { from: "database/schema", to: "db/schema" }, // Copy to different path
];
```

**Path Resolution**: All paths in the `from` field are resolved relative to your project root (where `package.json` and `tsconfig.json` are located).

**Example Use Cases**:

- Database migration files for initialization
- Configuration templates or defaults
- Static assets like images or documents
- Scripts or utilities needed at runtime
- Documentation or help files

### How DXT Generation Works

When you run `--s-build-dxt`, ArgParser performs several steps to create a self-contained, autonomous package:

1.  **Introspection**: It analyzes all tools defined with `.addTool()`.
2.  **Manifest Generation**: It creates a `manifest.json` file.
    - Tool flags are converted into a JSON Schema for the `input_schema`.
    - Flags with an `env` property (e.g., `{ name: 'apiKey', env: 'API_KEY' }`) provide universal `process.env` fallback/sync and are automatically added to the `user_config` section of the DXT manifest.
3.  **Autonomous Build**: It bundles your CLI's source code and its dependencies into a single entry point (e.g., `server.js`) that can run without `node_modules`. This ensures the DXT is portable and reliable. If you have properly setup your node_modules (via `pnpm install --prod --node-linker=hoisted`) and pass `--s-with-node-nodules` to the bundling process, the resulting DXT will include all necessary dependencies, this is useful for projects that require native dependencies or have complex dependency trees.
4.  **Packaging**: It assembles all necessary files (manifest, server bundle, logo, etc.) into the specified output directory, ready to be used by Claude Desktop or packed with `npx @anthropic-ai/dxt`.

### DXT Bundling Strategies

ArgParser offers two approaches for handling dependencies in DXT packages, depending on your project's needs.

#### Standard Approach (Recommended for Most Projects)

```bash
# For pure JavaScript/TypeScript projects
your-cli --s-build-dxt
```

- **Best for**: Pure JS/TS projects without native dependencies
- **Bundle size**: Small (5-10MB typical)
- **Build time**: Fast
- **Dependencies**: Bundled automatically by TSDown

#### Native Dependencies Approach

```bash
# For projects with native binaries (ONNX, Sharp, SQLite, etc.)
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
your-cli --s-build-dxt --s-with-node-modules
```

- **Best for**: Projects using ONNX Runtime, Sharp, Canvas, SQLite, or other packages with `.node` binaries
- **Bundle size**: Larger (50-200MB typical)
- **Build time**: Longer (copies entire node_modules)
- **Dependencies**: Complete autonomy - no installation needed by Claude

**When to use `--s-with-node-modules`:**

- ✅ Your project uses machine learning packages (ONNX Runtime, TensorFlow bindings)
- ✅ You need image processing (Sharp, Canvas)
- ✅ You use database packages with native binaries (better-sqlite3, sqlite3)
- ✅ You want guaranteed compatibility without runtime installation
- ✅ Bundle size is acceptable for your use case

**Required preparation steps:**

1. `rm -rf node_modules` - Clean slate for proper structure
2. `pnpm install --prod --node-linker=hoisted` - Creates flat, symlink-free structure
3. Add `--s-with-node-modules` flag to your build command

The system automatically validates your setup and provides guidance if issues are detected.

### Typical Errors

**Failed to run in Claude Desktop**:

Claude Desktop is pretty finicky (as of Claude 0.12.28), and the built-in Node.js does not work with extensions built with `--s-with-node-modules` and installed via ArgParser (and I have no idea why because there's no debug info).
To resolve this, simply go to `Claude Desktop > Settings > Extensions > Advanced Settings` and turn **OFF** `Use Built-in Node.js for MCP`.

Note that there are _many_ reasons for extensions not to work, if it does not work with Built-in or System Node.js, then something in your app is wrong. Feel free to join Alcyone Labs' discord for support: [Alcyone Labs' Discord](https://discord.gg/rRHhpz5nS5)

**Failed to attach to MCP when downloading external assets**

Sometimes, the MCP client needs to install external files, for example an ML model from HuggingFace or some task that takes more than 10 seconds to run. While it's working, Claude Desktop will display a `Cannot attach to MCP`, simply ignore it, Claude Desktop runs a ping every X seconds, and when it is running a long-running task, the ping will fail, but the task itself will still finish correctly.

**Failed to generate DXT package**:

If you encounter the following error running a command such as:

```bash
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
bun src/index.ts --s-build-dxt ./dxt --s-with-node-modules

-- Error generating DXT package: TSDown DXT build failed: EEXIST: file already exists, mkdir
```

Then run:

```bash
rm -rf ./dxt
bun src/index.ts --s-build-dxt ./dxt --s-with-node-modules
```

And it should work. TSDown is tasked to clean the outputDir first, but it won't if some files have been manually changed.

---

## System Flags & Configuration

ArgParser includes built-in `--s-*` flags for development, debugging, and configuration. They are processed before normal arguments and will cause the program to exit after their task is complete.

| Flag                        | Description                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **MCP & DXT**               |                                                                                                                |
| `--s-mcp-serve`             | Starts the application in MCP server mode, exposing all tools.                                                 |
| `--s-build-dxt [dir]`       | Generates a complete, autonomous DXT package for Claude Desktop in the specified directory.                    |
| `--s-with-node-modules`     | Use with `--s-build-dxt`. Includes complete node_modules in DXT package for projects with native dependencies. |
| `--s-mcp-transport <type>`  | Overrides the MCP transport (`stdio`, `sse`, `streamable-http`).                                               |
| `--s-mcp-transports <json>` | Overrides transports with a JSON array for multi-transport setups.                                             |
| `--s-mcp-port <number>`     | Sets the port for HTTP-based transports (`sse`, `streamable-http`).                                            |
| `--s-mcp-host <string>`     | Sets the host address for HTTP-based transports.                                                               |
| `--s-mcp-log-path <path>`   | Sets the file path for MCP server logs (default: `./logs/mcp.log`). Overrides programmatic setting.            |
| **Configuration**           |                                                                                                                |
| `--s-with-env <file>`       | Loads configuration from a file (`.env`, `.json`, `.yaml`, `.toml`). CLI args take precedence.                 |
| `--s-save-to-env <file>`    | Saves the current arguments to a configuration file, perfect for templates.                                    |
| **Debugging**               |                                                                                                                |
| `--s-debug`                 | Prints a detailed, step-by-step log of the argument parsing process.                                           |
| `--s-debug-print`           | Exports the entire parser configuration to a JSON file for inspection.                                         |
| `--s-enable-fuzzy`          | Enables fuzzy testing mode—a dry run that parses args but skips handler execution.                             |

---

## Changelog

### v2.10.3

**Flag Inheritance Improvements**

- **Full Chain Inheritance**: Introduced `FlagInheritance.AllParents` option to support deep flag propagation. This fixes issues where nested sub-commands (e.g., `root > mid > leaf`) failed to inherit root flags when constructed bottom-up.
- **Granular Control**: New `FlagInheritance` configuration object provides clear options: `NONE`, `DirectParentOnly` (legacy behavior), and `AllParents`.
- **Type Safety**: New `TFlagInheritance` type definition for better TypeScript support.
- **Backward Compatibility**: Kept `inheritParentFlags` for legacy behavior, but now it's just an alias for `FlagInheritance.DirectParentOnly`.

**Auto-Help Features**

- **Programmatic Help**: Added `ctx.displayHelp()` method to command handlers, allowing easy help display from within your logic.
- **Auto-Trigger**: Added `triggerAutoHelpIfNoHandler` option to automatically show help messages for "container" commands that don't have their own handler.
- **Helper Function**: Exported `autoHelpHandler` utility for quick setup of help-only commands. This can be passed as `setHandler(autoHelpHandler)` or `handler: autoHelpHandler` depending on your API of choice.

### v2.10.2

**OpenTUI Improvements**

- **Soft Wrapping**: Added `wrapText` (boolean) to `ScrollArea` component. When enabled, text automatically reflows to fit the container width (preventing clipping).
- **ANSI Preservation**: Soft-wrapping logic is ANSI-aware; color and style states are correctly carried over to wrapped lines.

### v2.10.1

- **Bug Fixes**:
  - Fixed a crash in `Terminal.moveCursor` when running in certain environments where `node:readline` utilities were inaccessible. Switched to direct ANSI escape codes for cursor positioning.

### v2.10.0 - OpenTUI integration + IFlag "env" property now first-class citizen

#### OpenTUI Integration

- **OpenTUI**: Integrated a complete Terminal User Interface (TUI) framework into the library core.
- **StackNavigator**: Standardized UX for deep navigation with `Enter`/`Right` to push and `Esc`/`Left` to pop views.
- **Reactive Themes**: Centralized `ThemeManager` with `Default`, `Ocean` (High-Contrast), and `Monokai` presets.
- **Scroll Performance**: ANSI-aware left-side scrollbars with automatic height calculation and scroll-state management.
- **Mouse Integration**: Native SGR mouse reporting for wheel scrolling and hit-detected clicks.
- **Safety**: Robust TTY restoration and process-level cleanup to prevent terminal lockups on exit or crash.
- **Components**: Exported `List`, `ScrollArea`, `Input`, and `SplitLayout` under the `UI` namespace.

#### Universal Environment Variable Support

- **Universal `env` Support**: The `env` property is now a core feature available to all commands and tools, not just DXT/MCP contexts.
- **Resolution Priority**: Implemented strict precedence: **CLI Flag > Environment Variable > Default Value**.
- **Reverse Sync**: Resolved flag values (from CLI or Env) are now automatically synced back to `process.env`, ensuring downstream code sees the correct configuration.
- **Flexible Mapping**: Supports both string and array-of-strings for `env` (first match wins).
- **Automatic Type Conversion**: Environment variables are automatically coerced to the flag's defined type (Number, Boolean, etc.).

### v2.8.2

- UX: Help shows example values via `valueHint` for non-boolean flags; repeatable flags display 'Multiple values allowed (repeat flag)' with example; examples use `valueHint` when present.
- Types: Added `IFlag.valueHint?: string`; accepted by `zodFlagSchema`; included in processed flags; supported in manifest-driven dynamic flags.
- Examples: `examples/core/dynamic-flags-demo.ts` updated to demonstrate `valueHint` for `--url`.

### v2.8.1

- Feature: Dynamic flags via `IFlag.dynamicRegister(ctx)` to register additional flags at runtime (e.g., from a manifest file)
- Help: `--help` preloads dynamic flags without executing handlers; help output includes both static and dynamic flags
- Flow: Two-phase parsing (load dynamic flags → re-parse with full flag set)
- Cleanup: Dynamically registered flags are reset between parses to avoid accumulation
- Types: Exported `DynamicRegisterContext` and `DynamicRegisterFn`
- Internal: `FlagManager.removeFlag(name)` to support cleanup

### v2.7.2

**Feat**

**MCP**:

- outputSchema is now included in MCP tool registration for MCP 2025-06-18+ clients and will generate a JSON Schema in `tools/list` responses to make JSON introspection easier.

**Fixes and Changes**

**MCP**:

- The app parameter in configureExpress: (app) => {} is now fully typed to improve intellisense.
- Express' x-powered-by was disabled by default. It can be re-enabled or changed via configureExpress as needed.
- Logger parameters were still not fully functional and log level was still ignored, this has been fixed.

### v2.7.0

**Feat**

**MCP**:

- Add support for CORS and authentication options, enabling powerful tools to serve Web UIs and publicly exposed APIs
- Add supports for configuring express by exposing the app before it runs

**CLI**:

- Add support for NOT automatically executing the CLI if the script is imported, but will execute if called directly as a CLI. This enables use cases such as programmatically loading the CLI and scanning for tools or testing it from another script via the --s-enable-fuzzy flag or your own script.

### v2.6.0

**Feat**

**DXT**:

- Improve how paths and dynamic variables are handled when bundling into a DXT, to improve compatibility and reduce paths that will fail in a sandbox when the CLI / MCP expects path available on the system. Dynamic path resolution with `${VARIABLE}` syntax supporting `${HOME}`, `${DOCUMENTS}`, `${__dirname}`, `${DXT_DIR}`, and more. Context-aware path resolution with `DxtPathResolver.createUserDataPath()`, `createTempPath()`, `createConfigPath()`.
- Add new IFlag.dxtOption set of options for each flag to allow finer control on how the flags are perceived on the DXT manifest / Claude Desktop.

Read more her: [DXT Package User Configuration & Path Handling](#dxt-package-user-configuration--path-handling)

**Fixes and Changes**

**DXT**:

- Improve handling of sensitive env variable, they were previously always showing as sensitive.

**Known Limitations**

**DXT**:

The DXT bundling / packing / unpacking / launching process is notoriously early and brittle. There are many reasons something is not working, but **MOST** importantly it will not work if:

1. You are bundling a package in a mono-repo (you will need to temporarily create a pnpm-workspace.yaml file for example to break the hierarchy)
2. You do _not_ hard-install your node_modules as detailed in the documentation (it will only work if the node_modules are hard installed)
3. In some cases if your CLI entrypoint does not run a main loop (see documentation for working examples)
4. If you use PATH-dependent variables (for example relying on ~/.config/path/to/some.json). This has been addressed in v2.6.0, but you have to make sure you use the correct patterns (see documentation)

### v2.5.0

**Feat**

- **Zod Schema Flags**: You can now use Zod schemas as flag types for structured JSON input validation. This enables complex object validation with automatic JSON Schema generation for MCP clients while maintaining full type safety and CLI compatibility.
- **Improved MCP Tool Documentation**: Zod schema descriptions automatically become MCP tool parameter documentation

### v2.4.2

**Fixes and Changes**

- add missing MCP lifecycle event documentation
- fix the behavior of the withMcp() options.mcp.log that was not working as expected

### v2.4.1

**Fixes and Changes**

- switch to NPM version of @alcyone-labs/modelcontextprotocol-sdk to freeze the dependency and avoid side-effects

### v2.4.0

**Feat**

- MCP client now supports initialization during the client 'initialize' call, which allows to do certain things such as establishing database connection or even running migrations
- MCP client now sanitizes the method names to ensure spec-compliants MCP behavior, names that collision will be logged
- There were some use-cases where the DXT bundling failed, this new release addresses all of them, namely:
  1. Output structure will match that of the input so relative files (for example DB migrations) will work
  2. Deeper folder structure was previously not working
- DXT bundling now supports including resources via options: `{dxt: {include: ['TSDown blob-like paths']}`
- Logger was improved to support log level via `options:{ log: {} }` so you can set it to level: 'debug' and the MCP log will contain 100% of the console output, logPath setting was not impacted

**Fixes and Changes**

- Zod has been upgraded to V4 and no issue was identified (but @modelcontextprotocol/sdk had to be upgraded to V4 as well, which was more challenging).

### v2.3.0

The DXT bundling is working pretty well now, and we have had a lot of success building, bundling and running various extensions. If you see issues, feel free to open an Issue on GitHub with details, or ask about it on [Alcyone Labs' Discord](https://discord.gg/rRHhpz5nS5)

Make sure to clearly identify if you need to include the node_modules or not. In doubt, include them using `--s-with-node-modules`

**Feat**

- **New `--s-with-node-modules` flag**: Create fully autonomous DXT packages that include complete native dependencies. Perfect for projects using ONNX Runtime, Sharp, SQLite, or other packages with `.node` binaries. Use `rm -rf ./node_modules && pnpm install --prod --node-linker=hoisted` followed by `my-cli --s-build-dxt ./dxt --s-with-node-modules` to create self-contained packages that work without Claude needing to install dependencies.
  Note that when bundling with node_modules, it's likely that the built-in Node.js will not work with that extension, so go to `Claude Desktop > Settings > Extensions > Advanced Settings` and turn **OFF** `Use Built-in Node.js for MCP`.

### v2.2.1

**Feat**

- You can now specify logPath for the MCP output and easily disambiguate what the path is relative to (`__dirname` versus `process.cwd()` versus absolute)

**Fixes and changes**

- Fixes an issue where building a DXT package via `--s-build-dxt` would generate an invalid package if the entry_point was a TypeScript .ts file.

### v2.2.0

**Feat**

- IFlag function-based `type` now supports async methods such as `type: async () => Promise<string>`.

**Fixes and changes**

- `.parse()` can now work without arguments, it will try to infer that if you are in CLI mode and on a Node environment, it should use `process.argv` as the input. You can still pass parameters to control more granularly.
- `--s-build-dxt` now takes an optional path to specify where to prepare the assets prior to packing, the path you pass is in relation to process.cwd() (current working directory).
- `--s-build-dxt` logo detection now resolves paths more accurately...

### v2.1.1

**Fixes and changes**

- Fix missing missing types fr

### v2.1.0

**Feat**

- IFlag function-based `type` handling must now define the type it returns, this unlocks nice features such as providing nicer Intellisense, `output schemas` support and makes it easier to upgrade to Zod V4
- Add support for MCP output_schema field for clients that support it, CLI isn't impacted by it, this helps a lot the interactivity, self-documentation, and improves the API guarantees

**Fixes and changes**

- Improved MCP version compliance

### v2.0.0

- **Unified Tool Architecture**: Introduced `.addTool()` to define CLI subcommands and MCP tools in a single declaration.
- **Universal Environment Variables Support**: The `env` property on any `IFlag` now provides native `process.env` fallback/sync logic for all commands, while maintaining its role in generating `user_config` entries for DXT manifests.
- **Enhanced DXT Generation**: The `env` property on flags now automatically generates `user_config` entries in the DXT manifest.
- **Automatic Console Safety**: Console output is automatically and safely redirected in MCP mode to prevent protocol contamination.
- **Breaking Changes**: The `addMcpSubCommand()` and separate `addSubCommand()` for MCP tools are deprecated in favor of `addTool()` and `--s-mcp-serve`.

### v1.3.0

- **Plugin System & Architecture**: Refactored to a dependency-injection model, making the core library dependency-free. Optional plugins for TOML/YAML.
- **Global Console Replacement**: Implemented the first version of automatic console suppression for MCP compliance.
- **Autonomous Build Improvements**: Significantly reduced DXT bundle size and removed dynamic `require` issues.

### v1.2.0

- **Critical MCP Fixes**: Resolved issues where MCP tools with output schemas would fail. Ensured correct JSON-RPC 2.0 response formatting.
- **Enhanced Handler Context**: Added `isMcp` flag to the handler context for more reliable mode detection.

### v1.1.0

- **Major Features**: First release with MCP Integration, System Flags (`--s-debug`, `--s-with-env`, etc.), and environment loading from files.

---

## Backlog

- [x] Publish as an open-source library
- [x] Make ArgParser compatible with MCP out-of-the-box
- [x] Rename --LIB-\* flags to --s-\*
- [x] Make it possible to pass a `--s-save-to-env /path/to/file` parameter that saves all the parameters to a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Make it possible to pass a `--s-with-env /path/to/file` parameter that loads all the parameters from a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Add support for async type function to enable more flexibility
- [x] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)
- [ ] Add System flags to args.systemArgs
- [ ] Improve flag options collision prevention
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Add support for locales / translations

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
