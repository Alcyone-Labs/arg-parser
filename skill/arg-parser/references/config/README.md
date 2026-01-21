# Config Management Reference

Everything about configuration file handling in ArgParser.

## Overview

Built-in and optional plugins for loading configuration:

- `EnvConfigPlugin` - Environment variables (built-in)
- `JsonConfigPlugin` - JSON/JSONC files (built-in)
- `TomlConfigPlugin` - TOML files (optional)
- `YamlConfigPlugin` - YAML files (optional)

## When to Use

- Loading config from files
- Environment variable support
- Multiple config format support
- Config priority management
- Saving configuration

## Decision Tree

```
Need config files?
├─► NO: Use ArgParserMcp (excludes plugins)
│
├─► YES: Built-in formats?
│   ├─► ENV: Use EnvConfigPlugin (auto-loaded)
│   ├─► JSON: Use JsonConfigPlugin (auto-loaded)
│   └─► Both: Use default (both included)
│
└─► YES: TOML or YAML?
    └─► Install optional dependencies
       npm install smol-toml js-yaml
```

## System Flags

| Flag                     | Description                |
| ------------------------ | -------------------------- |
| `--s-with-env <file>`    | Load environment from file |
| `--s-save-to-env <file>` | Save config to file        |

## Related Files

- `api.md` - Plugin API reference
- `patterns.md` - Config patterns
