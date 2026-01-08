# Working Directory Management in ArgParser

ArgParser provides flexible working directory management to support monorepo workflows
and complex project structures.

## Overview

By default, ArgParser uses the current working directory (`process.cwd()`) for all
file operations, including `.env` file loading. However, in monorepo scenarios,
you may need to operate in specific subdirectories.

## setWorkingDirectory Flag Property

The `setWorkingDirectory` flag property allows you to designate a flag's value as
the effective working directory for file operations.

### Basic Usage

```typescript
const parser = new ArgParser({
  appName: "Monorepo CLI",
  handler: (ctx) => {
    /* ... */
  },
}).addFlag({
  name: "workspace",
  description: "The workspace directory to operate in",
  options: ["--workspace", "-w"],
  type: "string",
  setWorkingDirectory: true, // Makes this the effective working directory
});
```

### How It Works

When a flag has `setWorkingDirectory: true`:

1. The flag's value is resolved to an absolute path
2. The path becomes the effective working directory for:
   - `.env` file loading (both explicit and auto-discovered)
   - Any file operations in your handler (if you use relative paths)
3. All paths are resolved relative to this effective directory
4. The last such flag in the command chain wins (with a warning)
5. Warnings are shown for invalid paths (nonexistent, not a directory)

### Example: Monorepo Workflow

```bash
# Project structure:
# /repo/
#   .env              (root-level config)
#   packages/
#     app-a/
#       .env.local     (app-specific config)
#     app-b/
#       .env.local     (app-specific config)

# User runs from /repo/:
my-cli --workspace ./packages/app-a --s-with-env
```

**Behavior:**

- Effective cwd: `/repo/packages/app-a/`
- Loads `.env.local` from `/repo/packages/app-a/.env.local` (auto-discovered)
- Does NOT load `/repo/.env`

### Example: Explicit Env File

```bash
my-cli --workspace ./packages/app-a --s-with-env config/production.env
```

**Behavior:**

- Effective cwd: `/repo/packages/app-a/`
- Loads `/repo/packages/app-a/config/production.env`

## rootPath in Handler Context

The `rootPath` property in the handler context provides access to the original
working directory from the user's CLI invocation perspective.

### When to Use rootPath

Use `rootPath` when you need to:

- Reference paths relative to where the user ran the command
- Display user-friendly paths in output
- Resolve user-provided paths that should be relative to their cwd, not the effective cwd

### Example: Path Resolution Comparison

```typescript
const parser = new ArgParser({
  appName: "Build CLI",
  handler: async (ctx) => {
    const { input, workspace } = ctx.args;

    // Effective working directory (changed by --workspace)
    console.log("Effective cwd:", process.cwd()); // /repo/packages/app-a/

    // Root path (where user ran command)
    console.log("Root path:", ctx.rootPath); // /repo/

    // Resolve input relative to effective cwd (default behavior)
    const inputFromEffective = path.resolve(input); // /repo/packages/app-a/data/file.txt

    // Resolve input relative to user's cwd (using rootPath)
    const inputFromRoot = path.resolve(ctx.rootPath, input); // /repo/data/file.txt

    return { inputFromEffective, inputFromRoot };
  },
})
  .addFlag({
    name: "workspace",
    options: ["--workspace", "-w"],
    type: "string",
    setWorkingDirectory: true,
  })
  .addFlag({
    name: "input",
    options: ["--input", "-i"],
    type: "string",
  });
```

**User runs:**

```bash
cd /repo/
my-cli --workspace ./packages/app-a --input ./data/file.txt
```

**Results:**

- `inputFromEffective`: `/repo/packages/app-a/data/file.txt`
- `inputFromRoot`: `/repo/data/file.txt`

## --s-with-env System Flag

The `--s-with-env` flag loads configuration from environment files.

### Auto-Discovery

When `--s-with-env` is provided without a file path, ArgParser automatically
discovers `.env` files in the effective working directory, in this priority order:

1. `.env.local` (highest priority - dev overrides)
2. `.env.dev` (when `NODE_ENV=development` or `NODE_ENV=dev`)
3. `.env.test` (when `NODE_ENV=test`)
4. `.env` (fallback - base config)

**Note:** Auto-discovery happens when:

- No `setWorkingDirectory` flag is used (default behavior: load from current cwd)
- `setWorkingDirectory` flag is used but `--s-with-env` has no file path argument (load from effective working directory)

When auto-discovery succeeds, a message displays the discovered file:

```
Auto-discovered env file: /path/to/.env.local
```

When no `.env` file is found, a warning is displayed:

```
Warning: No .env file found in working directory. Continuing without environment configuration.
```

### Explicit File Path

When a file path is provided with `--s-with-env`, it's resolved relative to the effective working directory:

```bash
# With workspace flag:
my-cli --workspace ./packages/app-a --s-with-env config/custom.env
# Loads: /repo/packages/app-a/config/custom.env

# Without workspace flag:
my-cli --s-with-env config/custom.env
# Loads: /repo/config/custom.env (relative to current cwd)
```

### Warning: No .env File Found

If no `.env` file is found in the effective working directory, a warning is displayed
and execution continues without environment configuration:

```
Warning: No .env file found in working directory. Continuing without environment configuration.
```

### Supported File Formats

`--s-with-env` supports multiple file formats:

- `.env` - Simple key=value pairs
- `.yaml`, `.yml` - YAML format (requires optional plugin)
- `.json` - JSON format
- `.toml` - TOML format (requires optional plugin)

## Backward Compatibility

Existing code that doesn't use `setWorkingDirectory` maintains its current behavior:

- `.env` files are loaded from the current working directory
- Path resolution is unchanged
- No changes to existing parsing logic

## Best Practices

1. **Document workspace behavior clearly**: Users should understand how paths are resolved

2. **Use `rootPath` for user-facing messages**: Display paths relative to user's cwd for clarity

3. **Test with absolute and relative paths**: Ensure your handlers work correctly in both cases

4. **Validate workspace directory**: ArgParser will warn if the directory doesn't exist or isn't a directory

5. **Consider environment-specific files**: Use `.env.local` for development, `.env.test` for testing

6. **Avoid duplicate workspace flags**: Only the last one in the command chain is used

## Examples

### Simple Workspace Switching

```typescript
const parser = new ArgParser({
  appName: "Package Manager",
  handler: (ctx) => {
    console.log(`Working in: ${ctx.args.workspace}`);
    console.log(`Root path: ${ctx.rootPath}`);
  },
}).addFlag({
  name: "workspace",
  description: "Target workspace directory",
  options: ["--workspace", "-w"],
  type: "string",
  setWorkingDirectory: true,
});
```

### Multi-Package Build System

```typescript
const rootParser = new ArgParser({
  appName: "Monorepo Builder",
})
  .addFlag({
    name: "workspace",
    options: ["--workspace", "-w"],
    type: "string",
    setWorkingDirectory: true,
  })
  .addSubCommand({
    name: "build",
    description: "Build a package",
    inheritParentFlags: true,
    handler: async (ctx) => {
      const packageJson = await import(
        path.join(process.cwd(), "package.json")
      );
      console.log(`Building: ${packageJson.name}`);

      // Display user-friendly path
      console.log(
        `Package location: ${path.relative(ctx.rootPath, process.cwd())}`,
      );
    },
  });
```

### Cross-Package Operations

```typescript
const parser = new ArgParser({
  appName: "Multi-Package CLI",
  handler: async (ctx) => {
    const { input, workspace } = ctx.args;

    // Access data file from original root directory
    const dataFromRoot = path.resolve(ctx.rootPath, input);

    // Access config file from workspace directory
    const configFromWorkspace = path.resolve(workspace, "config.yaml");

    console.log("Data (from root):", dataFromRoot);
    console.log("Config (from workspace):", configFromWorkspace);
  },
})
  .addFlag({
    name: "workspace",
    options: ["--workspace", "-w"],
    type: "string",
    setWorkingDirectory: true,
  })
  .addFlag({
    name: "input",
    options: ["--input", "-i"],
    type: "string",
  })
  .addFlag({
    name: "config",
    options: ["--config", "-c"],
    type: "string",
  });
```

## Troubleshooting

### "No .env file found" warning

If you see this warning:

1. Check that `.env`, `.env.local`, or environment-specific files exist in the effective working directory
2. Verify that the `setWorkingDirectory` flag points to the correct directory
3. Use `--s-with-env <path>` to specify an explicit file

### Paths not resolving correctly

1. Remember: All paths are relative to the **effective** working directory when `setWorkingDirectory` is used
2. Use `rootPath` to reference paths relative to where the user ran the command
3. Consider using absolute paths for files outside of the workspace

### Multiple workspace warnings

If you see "Multiple working directory flags detected":

- Only the last one in the command chain is used
- This is intentional behavior (last wins)
- Remove duplicate workspace flags to avoid confusion


## Summary

Working directory management in ArgParser provides a powerful way to handle monorepo structures and complex project layouts by allowing commands to change their effective context. By using `setWorkingDirectory`, you can ensure that environment variables and file operations are relative to the project root, regardless of where the command is executed.
