# Automatic Help Display Features

ArgParser provides several ways to automatically display help information when a command is invoked without a handler or when a handler needs to explicitly show help.

## `ctx.displayHelp()`

The `IHandlerContext` now includes a `displayHelp()` method. This allows any command handler to programmatically trigger the help message for its own context.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-tool",
  handler: async (ctx) => {
    // Explicitly show help if no arguments are provided
    if (Object.keys(ctx.args).length === 0) {
      ctx.displayHelp();
      return;
    }

    console.log("Processing with args:", ctx.args);
  },
});
```

> [!NOTE]
> `displayHelp()` respects the `autoExit` setting. If `autoExit` is `true` (default), it will print the help and call `process.exit(0)`.

---

## `autoHelpHandler`

For sub-commands that act as containers for other sub-commands and don't have their own logic, you can use the `autoHelpHandler` utility. This handler simply calls `ctx.displayHelp()`.

```typescript
import { ArgParser, autoHelpHandler } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({ appName: "main" });

const configCmd = new ArgParser({
  appName: "config",
  handler: autoHelpHandler, // Show help for 'main config' if no sub-command is provided
});

configCmd.addSubCommand({
  name: "set",
  handler: async (ctx) => {
    /* ... */
  },
});

cli.addSubCommand({
  name: "config",
  parser: configCmd,
});
```

---

## `triggerAutoHelpIfNoHandler`

This is a framework-level setting that automatically displays help for any command or sub-command that lacks a defined handler.

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-tool",
  triggerAutoHelpIfNoHandler: true, // Enable auto-help globally
});

// Since no handler is defined for the root, running 'my-tool' will show help.

cli.addSubCommand({
  name: "setup",
  parser: new ArgParser({
    appName: "setup",
    // No handler here either, running 'my-tool setup' will show help for setup.
  }),
});
```

### Key Benefits of `triggerAutoHelpIfNoHandler`:

1.  **Cleaner Code**: You don't need to manually check for empty arguments or assign `autoHelpHandler` to every container command.
2.  **Inheritance**: The setting is automatically inherited by sub-parsers added via `addSubCommand`, ensuring consistent behavior across your entire CLI hierarchy.
3.  **Improved DX**: Users are never met with silence when they miss a required sub-command or argument; they are immediately shown how to use the tool.

---

## Improved Help Rendering (v2.11+)

ArgParser v2.11 introduced a significantly improved help rendering engine that provides better clarity for complex CLI structures.

### Subcommand Descriptions

Subcommands now display their descriptions on a dedicated line in the "Available sub-commands" section, making them much easier to scan.

### Flag Previews

The help output now includes a summary of available flags for each subcommand, so users can see what options are available without having to run `--help` on every subcommand.

### Positional Arguments

If a command uses positional arguments (via the `positional` property on a flag), they are automatically included in the `Usage:` hint:

```bash
Usage: my-tool [OPTIONS] <INPUT_FILE> [OUTPUT_FILE]
```

Mandatory positional arguments are enclosed in `<>`, while optional ones use `[]`.
