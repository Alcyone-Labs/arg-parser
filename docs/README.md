# ArgParser Documentation

Welcome to the ArgParser v3.0 documentation. This is a complete rewrite with a new plugin-based architecture.

## Documentation Structure

```
docs/
├── core/                          # Core package documentation
│   ├── index.md                   # Getting started guide
│   ├── flags.md                   # Working with flags
│   ├── subcommands.md             # Hierarchical commands
│   ├── system-flags.md            # Built-in system flags
│   └── api-reference.md           # Complete API reference
├── specs/                         # Technical specifications
│   ├── PLUGIN_ARCHITECTURE_PLAN.md
│   ├── TEST_MIGRATION_PLAN_DETAILED.md
│   └── INTERACTIVE_PROMPTS.md
├── how/                           # How-to guides
│   └── ENV_VARIABLES.md
├── .templates/                    # Documentation templates
│   └── guide.md
├── CORE_CONCEPTS.md               # Detailed concept explanations
├── MIGRATION_V3.md               # v2 → v3 migration guide
├── MIGRATION_V2.md               # Legacy migration guide
├── DISPLAY_HELP.md               # Help system documentation
├── MCP.md                        # MCP integration guide
├── TUI.md                        # TUI integration guide
├── DXT_*.md                      # DXT documentation
└── WORKING_DIRECTORY.md          # Working directory handling
```

## Quick Navigation

### For New Users
1. Start with [Core Package Guide](./core/index.md) - Getting started guide
2. Learn about [Flags](./core/flags.md) - Defining and validating flags
3. Understand [Subcommands](./core/subcommands.md) - Hierarchical CLIs
4. Review [System Flags](./core/system-flags.md) - Built-in functionality
5. Check out [Examples](../examples/)

### Topic Guides
- **[Flags](./core/flags.md)** - String, number, boolean, array flags; validation; custom parsers
- **[Subcommands](./core/subcommands.md)** - Nested commands, inheritance, hierarchies
- **[System Flags](./core/system-flags.md)** - Debug, env, MCP, DXT flags
- **[Interactive Prompts](./specs/INTERACTIVE_PROMPTS.md)** - Interactive mode with @clack/prompts
- **[API Reference](./core/api-reference.md)** - Complete API documentation

### For v2.x Users
1. Read [Migration Guide v3](./MIGRATION_V3.md)
2. Review breaking changes
3. Update your code incrementally

### For Plugin Developers
1. Read [Plugin Architecture](./specs/PLUGIN_ARCHITECTURE_PLAN.md)
2. Study [API Reference](./core/api-reference.md)
3. Check existing plugin implementations

## Package Overview

ArgParser v3.0 is organized into separate packages:

| Package | Purpose | Install |
|---------|---------|---------|
| `@alcyone-labs/arg-parser` | Core CLI parsing | `npm i @alcyone-labs/arg-parser` |
| `@alcyone-labs/arg-parser-mcp` | MCP server support | `npm i @alcyone-labs/arg-parser-mcp` |
| `@alcyone-labs/arg-parser-dxt` | DXT package generation | `npm i @alcyone-labs/arg-parser-dxt` |
| `@alcyone-labs/arg-parser-tui` | Terminal UI (OpenTUI) | `npm i @alcyone-labs/arg-parser-tui` |

## Key Features

- ✅ **Type-safe** - Full TypeScript support with inference
- ✅ **Plugin Architecture** - Extensible via plugins
- ✅ **Small Bundle** - Core is only ~50KB
- ✅ **MCP Support** - Create MCP servers easily
- ✅ **Interactive** - Built-in prompt support
- ✅ **Subcommands** - Hierarchical CLI structures
- ✅ **Validation** - Comprehensive flag validation
- ✅ **Environment** - Automatic env variable support

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/Alcyone-Labs/arg-parser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Alcyone-Labs/arg-parser/discussions)
- **Examples**: Check the `/examples` directory

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
