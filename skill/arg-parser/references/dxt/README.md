# DXT Bundling Reference

Everything about DXT (executable) bundling in ArgParser.

## Overview

Build standalone executables from your CLI tools using `tsdown` bundler.

## System Flags

| Flag                    | Description          |
| ----------------------- | -------------------- |
| `--s-build-dxt [dir]`   | Build DXT executable |
| `--s-with-node-modules` | Include node_modules |

## DxtOptions Interface

```typescript
interface IDxtOptions {
  sensitive?: boolean;
  localDefault?: string;
  type?: "string" | "directory" | "file" | "boolean" | "number";
  multiple?: boolean;
  min?: number;
  max?: number;
  default?: any;
  title?: string;
}
```

## When to Use

- Distribution of CLI tools
- Self-contained executables
- Easy deployment
- No node_modules required

## Build Command

```bash
pnpm build
my-cli --s-build-dxt ./dist
```

## Related Files

- `api.md` - DXT API reference
- `patterns.md` - Bundling patterns
