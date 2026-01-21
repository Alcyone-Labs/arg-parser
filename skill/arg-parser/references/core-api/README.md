# Core API Reference

Everything about ArgParser core classes, types, and methods.

## Overview

The core module provides:

- `ArgParserBase` - Base class for CLI parsing
- `ArgParser` - Full MCP integration
- `FlagManager` - Flag definition management
- `IFlag` - Flag definition interface
- `IHandlerContext` - Handler context type
- `ParseResult` - Parse result interface
- `FlagInheritance` - Subcommand inheritance options

## When to Use

- Building CLI applications with flags
- Creating multi-level subcommands
- Defining custom type parsers
- Managing working directory changes
- Implementing dynamic flag registration
- Handling errors with custom strategies

## Decision Tree

```
Need MCP integration?
├─► NO: Use ArgParserBase
│   └─► Just flags and handlers? Yes.
│   └─► Subcommands? Yes.
│   └──► inheritParentFlags: FlagInheritance.AllParents
│
└─► YES: Use ArgParser
    └─► Want unified CLI/MCP tools? Use addTool().
    └─► Need config plugins? Yes (JSON, ENV built-in).
    └──► ArgParser excludes plugins? Use ArgParserMcp.

Need autonomous/DXT build?
└─► YES: Use ArgParserMcp (no config plugins)
```

## Key Concepts

### Flag Types

| Type            | Usage            | Example                    |
| --------------- | ---------------- | -------------------------- |
| `"string"`      | Text value       | `--name Alice`             |
| `"number"`      | Numeric value    | `--count 42`               |
| `"boolean"`     | True/false       | `--verbose`                |
| `"array"`       | Multiple values  | `--files a b c`            |
| `"object"`      | JSON object      | `--data '{"k":"v"}'`       |
| Custom function | Custom parsing   | `type: (v) => parseInt(v)` |
| Zod schema      | Validated object | `type: z.object({...})`    |

### Parse Modes

| Mode          | autoExit | handleErrors | Behavior           |
| ------------- | -------- | ------------ | ------------------ |
| CLI (default) | true     | true         | Print error, exit  |
| Programmatic  | false    | true         | Return ParseResult |
| Manual        | false    | false        | Throw errors       |

### Handler Context Properties

- `args` - Parsed arguments
- `parentArgs` - Parent command args (subcommands)
- `commandChain` - Command sequence
- `parser` - Current parser
- `parentParser` - Parent parser (subcommands)
- `isMcp` - MCP mode flag
- `displayHelp` - Show help
- `rootPath` - Original user cwd
- `logger` - Data-safe logger

## Related Files

- `api.md` - Complete API reference
- `configuration.md` - Configuration schemas
- `patterns.md` - Implementation patterns
- `gotchas.md` - Common pitfalls
