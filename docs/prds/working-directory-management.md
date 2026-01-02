# Working Directory Management for Monorepo Support

**Status:** Proposed
**Created:** 2026-01-01
**Purpose:** Enable better monorepo support through flexible working directory management

---

## Executive Summary

This PRD implements working directory control for ArgParser, enabling better monorepo support through:

1. Flag-based working directory selection (`setWorkingDirectory` / `chdir`)
2. Enhanced `--s-with-env` behavior with effective cwd support
3. Auto-discovery of `.env` files in effective working directory
4. Handler context enhancement with `rootPath` for user's original cwd
5. Backward compatibility for existing users

---

## Problem Statement

### Current Limitations

1. **Monorepo Pain Points**
   - Bun auto-loads `.env` from repository root, which is often undesired
   - Users can't easily specify which package/workspace's `.env` to load
   - Path resolution is always relative to current working directory
   - No way to switch working directory for different sub-projects

2. **Inflexible .env Loading**
   - `--s-with-env` only accepts explicit file paths
   - No auto-discovery of environment-specific files (`.env.local`, `.env.dev`, `.env.test`)
   - Always loads from current working directory, can't target specific subdirectory

3. **Path Resolution Complexity**
   - All relative paths are resolved from current cwd
   - In monorepos, users must constantly adjust path arguments
   - No way to reference "where the user ran the command" vs "where the command runs"

### Use Cases

**Monorepo Package Management:**

```bash
# User wants to work in packages/app-a/
my-cli --workspace ./packages/app-a build
# Should load .env from packages/app-a/.env.local
# Should run build in packages/app-a/ directory
```

**Environment-Specific Configuration:**

```bash
# Auto-discover .env.local in development
NODE_ENV=development my-cli build

# Auto-discover .env.test in testing
NODE_ENV=test my-cli test
```

**Cross-Package Operations:**

```bash
# User at /repo/ wants to reference files from both root and package
my-cli --workspace ./packages/app-a \
  --config ./app-config.yaml \
  --data-path ../../shared/data/
# workspace flag changes effective cwd
# But user wants data-path relative to /repo/ (root)
```

---

## Solution Overview

### Core Concepts

1. **Effective Working Directory**: The directory used for file operations (`.env` loading, path resolution)
2. **Root Path**: The original current working directory from user's CLI invocation
3. **Working Directory Flags**: Flags with `setWorkingDirectory: true` that change the effective cwd
4. **Env File Auto-Discovery**: Automatic search for `.env` files in priority order

### Key Design Decisions

**Q1: Property name for working directory flags?**
✅ **Decision:** Use `setWorkingDirectory` as primary name, with `chdir` as a supported alias concept

**Rationale:**

- `setWorkingDirectory` is explicit and self-documenting
- Both terms are familiar to developers
- Can be referenced by either name in documentation

**Q2: Auto-discovery behavior when nothing specified?**
✅ **Decision:** Auto-discover `.env` files in effective working directory when `--s-with-env` is present without arguments

**Auto-discovery priority order:**

1. `.env.local` (highest priority - dev overrides)
2. `.env.dev` (when `NODE_ENV=development` or `NODE_ENV=dev`)
3. `.env.test` (when `NODE_ENV=test`)
4. `.env` (fallback - base config)

**Rationale:**

- Matches developer expectations (similar to Vite, Next.js, etc.)
- Provides sensible defaults without requiring explicit paths
- Can still use explicit `--s-with-env <path>` when needed

**Q3: Backward compatibility for `--s-with-env`?**
✅ **Decision:** Keep `--s-with-env` and upgrade its behavior to support effective working directory

**Backward compatibility strategy:**

- Users without `setWorkingDirectory` flags: behavior unchanged (uses `process.cwd()`)
- Users with `setWorkingDirectory` flags: `.env` paths resolved relative to effective cwd
- No breaking changes to existing functionality

**Q4: Multiple working directory flags?**
✅ **Decision:** Last flag in command chain wins, with a subtle warning

**Example:**

```bash
my-cli --workspace ./packages/app-a \
        subcommand --workspace ./packages/app-b
# Uses: ./packages/app-b (last one)
# Warning: "Multiple working directory flags detected. Using '--workspace' (last one in command chain)."
```

**Rationale:**

- Sub-commands in monorepos might have their own workspace flag
- Last-wins is intuitive (most specific context takes precedence)
- Warning ensures users are aware of the behavior

**Q5: Path translation for user convenience?**
✅ **Decision:** Option A - No path translation. Add `rootPath` to handler context instead.

**Rationale:**

- Simpler implementation, fewer edge cases
- Path translation is complex and error-prone
- `rootPath` gives users full control
- Clear separation: effective cwd for ops, root path for user-facing logic

**Path Resolution Behavior:**

```typescript
// User at /repo/ runs:
my-cli --workspace ./packages/app-a --input ./data/file.txt

// Effective cwd: /repo/packages/app-a/
// Root path: /repo/

// ctx.args.input: "./data/file.txt"
// When resolved (default): /repo/packages/app-a/data/file.txt
// When resolved with rootPath: /repo/data/file.txt
```

---

## Detailed Implementation Plan

### Phase 1: Type Definitions and Core Infrastructure

#### 1.1 Update `src/core/types.ts`

**Add to `IFlag` interface:**

````typescript
export type IFlag = IFlagCore & {
  // ... existing properties
  env?: string | string[];
  dxtOptions?: IDxtOptions;
  dynamicRegister?: DynamicRegisterFn;

  /**
   * If true, this flag's value becomes the effective working directory.
   * When set, all file operations (including .env loading) will be relative to this path.
   * Last flag with this property in the command chain wins.
   *
   * @alias chdir
   *
   * @example
   * ```typescript
   * .addFlag({
   *   name: "workspace",
   *   description: "Workspace directory to operate in",
   *   options: ["--workspace", "-w"],
   *   type: "string",
   *   setWorkingDirectory: true,  // This becomes the effective working directory
   * })
   * ```
   */
  setWorkingDirectory?: boolean;
};
````

**Update `IHandlerContext` interface:**

```typescript
export type IHandlerContext<
  TCurrentCommandArgs extends Record<string, any> = Record<string, any>,
  TParentCommandArgs extends Record<string, any> = Record<string, any>,
> = {
  args: TCurrentCommandArgs;
  parentArgs?: TParentCommandArgs;
  commandChain: string[];
  parser: ArgParserInstance;
  parentParser?: ArgParserInstance;
  isMcp?: boolean;
  getFlag?: (name: string) => any;
  displayHelp: () => void;

  /**
   * The root path from the user's CLI command perspective.
   * This is the original current working directory when the CLI was invoked.
   *
   * Use this when you need to reference paths relative to where the user ran the command,
   * as opposed to the effective working directory (which may have been changed by
   * flags with `setWorkingDirectory`).
   *
   * @example
   * // User runs: my-cli --workspace ./packages/app --input ./data/file.txt
   * // From /repo/ directory
   *
   * // In handler:
   * console.log(ctx.rootPath);           // "/repo/" (where user ran command)
   * console.log(process.cwd());           // "/repo/packages/app/" (effective cwd)
   * console.log(ctx.args.input);          // "./data/file.txt" (relative to effective cwd)
   *
   * // To resolve ctx.args.input relative to user's cwd:
   * const userInputPath = path.resolve(ctx.rootPath, ctx.args.input);
   */
  rootPath?: string;
};
```

---

### Phase 2: Early Parsing and Working Directory Resolution

#### 2.1 Add Private Fields to `ArgParserBase`

```typescript
// In src/core/ArgParserBase.ts class

/** The effective working directory for this parser instance */
#effectiveWorkingDirectory: string | null = null;

/** The original root path from the user's CLI invocation */
#rootPath: string | null = null;

/** Tracks if the effective working directory has been resolved */
#workingDirectoryResolved = false;
```

#### 2.2 Create `#_resolveWorkingDirectory()` Method

**Location:** `src/core/ArgParserBase.ts` (private method, before `#_handleGlobalChecks`)

**Algorithm:**

```typescript
#_resolveWorkingDirectory(
  processArgs: string[],
  parserChain: ArgParserBase[]
): { effectiveCwd: string; rootPath: string } {
  // 1. Store the original root path once
  if (!this.#rootPath) {
    this.#rootPath = process.cwd();
  }

  // 2. Scan for flags with setWorkingDirectory in reverse order
  //    (last one in the command chain wins)
  let foundCwd: string | null = null;
  let foundFlagName: string | null = null;

  for (let i = parserChain.length - 1; i >= 0; i--) {
    const parser = parserChain[i];
    const chdirFlags = parser.#flagManager.flags.filter(
      (flag: ProcessedFlag) => flag.setWorkingDirectory
    );

    for (const flag of chdirFlags) {
      // Simple pattern matching for flag presence
      for (const option of flag.options) {
        // Find flag in processArgs
        const flagIndex = processArgs.indexOf(option);
        if (flagIndex !== -1 && flagIndex + 1 < processArgs.length) {
          const value = processArgs[flagIndex + 1];
          if (!value || value.startsWith("-")) continue;

          // Resolve path relative to current effective working directory
          const resolvedPath = path.resolve(
            this.#effectiveWorkingDirectory || this.#rootPath,
            value
          );

          // Validate path exists and is a directory
          if (!fs.existsSync(resolvedPath)) {
            console.warn(
              chalk.yellow(
                `Warning: Working directory '${resolvedPath}' specified by ${option} does not exist. Using current directory instead.`
              )
            );
            continue;
          }

          if (!fs.statSync(resolvedPath).isDirectory()) {
            console.warn(
              chalk.yellow(
                `Warning: Path '${resolvedPath}' specified by ${option} is not a directory. Using current directory instead.`
              )
            );
            continue;
          }

          foundCwd = resolvedPath;
          foundFlagName = option;

          // Check for multiple chdir flags
          const allChdirIndices: { index: number; flag: string }[] = [];
          for (let j = 0; j < processArgs.length; j++) {
            for (const p of parserChain) {
              for (const f of p.#flagManager.flags) {
                if (f.setWorkingDirectory && f.options.includes(processArgs[j])) {
                  allChdirIndices.push({ index: j, flag: processArgs[j] });
                }
              }
            }
          }

          if (allChdirIndices.length > 1) {
            console.warn(
              chalk.yellow(
                `Warning: Multiple working directory flags detected. Using '${option}' (last one in command chain).`
              )
            );
          }

          break; // Use the first found flag in this parser
        }
      }

      if (foundCwd) break; // Found valid chdir flag, stop searching
    }

    if (foundCwd) break; // Found valid chdir flag, stop searching parsers
  }

  // 3. Return the effective working directory
  return {
    effectiveCwd: foundCwd || this.#rootPath,
    rootPath: this.#rootPath,
  };
}
```

#### 2.3 Integrate into `#_handleGlobalChecks`

**Location:** `src/core/ArgParserBase.ts`, modify the existing method

**Changes:**

1. Call `#_resolveWorkingDirectory()` at the beginning of `#_handleGlobalChecks`
2. Store the result in instance fields
3. Pass the effective working directory to env loading logic

```typescript
async #_handleGlobalChecks(
  processArgs: string[],
  options?: IParseOptions,
): Promise<boolean | ParseResult> {
  // NEW: Resolve working directory FIRST
  const { finalParser: parserChainParser } =
    this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

  const { effectiveCwd, rootPath } = this.#_resolveWorkingDirectory(
    processArgs,
    parserChainParser ? [this, parserChainParser] : [this]
  );

  this.#effectiveWorkingDirectory = effectiveCwd;
  this.#rootPath = rootPath;
  this.#workingDirectoryResolved = true;

  // ... rest of the existing checks (auto-help, fuzzy, etc.)
```

---

### Phase 3: Env File Loading Enhancements

#### 3.1 Add `.env` Auto-Discovery Method

**Location:** `src/config/ConfigurationManager.ts`

```typescript
/**
 * Discovers .env files in the specified directory
 * Searches in priority order: .env.local, .env.dev/.env.test, .env
 *
 * @param searchDir - The directory to search for .env files
 * @returns Path to the found .env file, or null if none is found
 */
public discoverEnvFile(searchDir: string): string | null {
  const envFilesToCheck: string[] = [".env.local"];

  // Add environment-specific files based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === "development" || nodeEnv === "dev") {
    envFilesToCheck.push(".env.dev");
  } else if (nodeEnv === "test") {
    envFilesToCheck.push(".env.test");
  }

  envFilesToCheck.push(".env");

  // Check each file in priority order
  for (const envFile of envFilesToCheck) {
    const envPath = path.join(searchDir, envFile);
    if (fs.existsSync(envPath)) {
      debug.log(`Auto-discovered env file: ${envPath}`);
      return envPath;
    }
  }

  return null;
}
```

#### 3.2 Update `--s-with-env` Handling

**Location:** `src/core/ArgParserBase.ts`, modify the existing `--s-with-env` block

**Changes:**

1. Update the help text for `--s-with-env` to mention the new behavior
2. If no path is specified, auto-discover the `.env` file in the effective cwd
3. Resolve the env file path relative to the **effective working directory**

```typescript
// Handle --s-with-env system flag early to modify processArgs before parsing
const withEnvIndex = processArgs.findIndex((arg) => arg === "--s-with-env");
if (withEnvIndex !== -1) {
  // ... existing validation code ...

  let envFilePath: string | null = null;

  // Check if a file path is provided
  if (withEnvIndex + 1 < processArgs.length) {
    const providedPath = processArgs[withEnvIndex + 1];
    if (providedPath && !providedPath.startsWith("-")) {
      // NEW: Resolve relative to effective working directory
      const basePath = this.#effectiveWorkingDirectory || process.cwd();
      envFilePath = path.resolve(basePath, providedPath);
    } else {
      // No file path provided - auto-discover
      const basePath = this.#effectiveWorkingDirectory || process.cwd();
      envFilePath = this.#configurationManager.discoverEnvFile(basePath);

      if (!envFilePath) {
        console.warn(
          chalk.yellow(
            `Warning: No .env file found in working directory. Continuing without environment configuration.`,
          ),
        );
        // Remove the flag and continue
        processArgs.splice(withEnvIndex, 1);
      }
    }
  } else {
    // Flag present but no argument - auto-discover
    const basePath = this.#effectiveWorkingDirectory || process.cwd();
    envFilePath = this.#configurationManager.discoverEnvFile(basePath);

    if (!envFilePath) {
      console.warn(
        chalk.yellow(
          `Warning: No .env file found in working directory. Continuing without environment configuration.`,
        ),
      );
      // Remove the flag and continue
      processArgs.splice(withEnvIndex, 1);
    }
  }

  // Load env file if found
  if (envFilePath) {
    try {
      // Identify the final parser and parser chain for loading configuration
      const {
        finalParser: identifiedFinalParser,
        parserChain: identifiedParserChain,
      } = this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

      const envConfigArgs =
        identifiedFinalParser.#configurationManager.loadEnvFile(
          envFilePath,
          identifiedParserChain,
        );
      if (envConfigArgs) {
        // Merge environment configuration with process args
        // CLI args take precedence over file configuration
        const mergedArgs =
          identifiedFinalParser.#configurationManager.mergeEnvConfigWithArgs(
            envConfigArgs,
            processArgs,
          );

        // Replace the original processArgs array contents
        processArgs.length = 0;
        processArgs.push(...mergedArgs);
      }

      // Remove the --s-with-env flag and its file path argument from processArgs
      // This must be done after merging to avoid interfering with the merge process
      const finalWithEnvIndex = processArgs.findIndex(
        (arg) => arg === "--s-with-env",
      );
      if (finalWithEnvIndex !== -1) {
        // Check if there's a file path argument after the flag
        if (
          finalWithEnvIndex + 1 < processArgs.length &&
          !processArgs[finalWithEnvIndex + 1].startsWith("-")
        ) {
          processArgs.splice(finalWithEnvIndex, 2); // Remove both the flag and the file path
        } else {
          processArgs.splice(finalWithEnvIndex, 1); // Remove only the flag
        }
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Error loading environment file: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return this._handleExit(
        1,
        `Error loading environment file: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  }
}
```

#### 3.3 Backward Compatibility Strategy

**Key principle:** Users who don't use `setWorkingDirectory` keep the existing behavior

**Implementation:**

```typescript
// In #_resolveWorkingDirectory():
return {
  effectiveCwd: foundCwd || this.#rootPath,
  rootPath: this.#rootPath,
};

// In env loading:
// Only use effectiveWorkingDirectory if it was explicitly set
const basePath = this.#effectiveWorkingDirectory
  ? this.#effectiveWorkingDirectory
  : process.cwd();

const envFilePath = path.resolve(basePath, providedPath);
```

**Testing strategy:**

- Test without `setWorkingDirectory` → behavior identical to current
- Test with `setWorkingDirectory` → uses effective cwd
- Test `--s-with-env` with both scenarios

---

### Phase 4: Handler Context Enhancement

#### 4.1 Populate `rootPath` in Handler Context

**Location:** `src/core/ArgParserBase.ts`, in the context creation code

**Find:** Context creation around line 1608

**Update:**

```typescript
const handlerContext: IHandlerContext<any, any> = {
  args: currentLevelArgs,
  parentArgs: accumulatedParentArgs,
  commandChain: commandChainSoFar,
  parser: currentParser,
  parentParser: parentParser,
  displayHelp: () => {
    console.log(currentParser.helpText());
    // ... existing exit logic ...
  },

  // NEW: Add rootPath if the working directory was resolved
  rootPath: this.#rootPath || undefined,
};
```

#### 4.2 Update Context for MCP Mode

**Location:** Same as above, ensure MCP mode contexts also get `rootPath`

```typescript
// In MCP-specific context creation (if separate)
// Add rootPath to ensure consistency across all modes
```

---

### Phase 5: Help Text and System Flag Documentation

#### 5.1 Update Help Text for `--s-with-env`

**Location:** In the `helpText()` method or system flag documentation

**New description:**

```typescript
{
  name: "s-with-env",
  description: [
    "Load configuration from environment file (.env, .yaml, .json, .toml, etc.)",
    "",
    "When a file path is provided: loads from that specific file",
    "When no file path is provided: auto-discovers .env.local, .env.dev/.env.test, or .env",
    "",
    "Env file paths are resolved relative to the effective working directory.",
    "The effective working directory can be changed using flags with setWorkingDirectory.",
    "",
    "Examples:",
    "  --s-with-env .env.local",
    "  --s-with-env /path/to/config.yaml",
    "  --s-with-env (auto-discover)",
  ],
  // ... rest of flag definition
}
```

#### 5.2 Document the `setWorkingDirectory` Flag Property

**Location:** Add JSDoc to `IFlag` interface

````typescript
/**
 * @property {boolean} [setWorkingDirectory] - If true, this flag's value becomes the effective
 * working directory for file operations. When set, environment file loading and path resolution
 * will be relative to this directory. Last flag with this property in the command chain wins.
 *
 * @alias chdir
 *
 * @example
 * ```typescript
 * .addFlag({
 *   name: "workspace",
 *   description: "Workspace directory to operate in",
 *   options: ["--workspace", "-w"],
 *   type: "string",
 *   setWorkingDirectory: true,  // This becomes the effective working directory
 * })
 * ```
 *
 * @example
 * ```typescript
 * // User runs: my-cli --workspace ./packages/my-app
 * // Effective cwd becomes: /repo/packages/my-app/
 * // All .env files are loaded from: /repo/packages/my-app/
 * ```
 */
````

---

### Phase 6: Testing

#### 6.1 Create New Test Files

**File:** `tests/core/working-directory.test.ts`

**Test cases:**

1. **Basic setWorkingDirectory functionality**

   ```typescript
   test("should change effective working directory when setWorkingDirectory flag is provided", async () => {
     const parser = new ArgParser({
       appName: "Test CLI",
       handler: (ctx) => ({
         cwd: process.cwd(),
         rootPath: ctx.rootPath,
       }),
     }).addFlag({
       name: "workspace",
       options: ["--workspace"],
       type: "string",
       setWorkingDirectory: true,
     });

     const result = await parser.parse(["--workspace", testDir]);
     expect(result.cwd).toBe(testDir);
     expect(result.rootPath).toBe(originalCwd);
   });
   ```

2. **Auto-discovery of .env files**

   ```typescript
   test("should auto-discover .env.local in effective working directory", async () => {
     // Create .env.local file in test directory
     const envPath = path.join(testDir, ".env.local");
     fs.writeFileSync(envPath, "TEST_VAR=from_local\n");

     const parser = new ArgParser({
       appName: "Test CLI",
       handler: (ctx) => ctx.args,
     })
       .addFlag({
         name: "workspace",
         options: ["--workspace"],
         type: "string",
         setWorkingDirectory: true,
       })
       .addFlag({
         name: "testVar",
         options: ["--test-var"],
         type: "string",
       });

     const result = await parser.parse([
       "--workspace",
       testDir,
       "--s-with-env", // No file path - should auto-discover
     ]);

     expect(result.testVar).toBe("from_local");
   });
   ```

3. **Multiple setWorkingDirectory flags (last wins)**

   ```typescript
   test("should use last setWorkingDirectory flag in command chain", async () => {
     const parser1 = new ArgParser({ appName: "Root" }).addFlag({
       name: "workspace1",
       options: ["--w1"],
       type: "string",
       setWorkingDirectory: true,
     });

     const subParser = parser1
       .addSubCommand({
         name: "sub",
         description: "Sub command",
         handler: (ctx) => ({ cwd: process.cwd() }),
       })
       .addFlag({
         name: "workspace2",
         options: ["--w2"],
         type: "string",
         setWorkingDirectory: true,
       });

     const result = await parser1.parse([
       "--w1",
       testDir1,
       "sub",
       "--w2",
       testDir2,
     ]);

     expect(result.cwd).toBe(testDir2); // Last one wins
   });
   ```

4. **Warning for invalid directory**

   ```typescript
   test("should warn and use original cwd if setWorkingDirectory path does not exist", async () => {
     const consoleWarnSpy = vi.spyOn(console, "warn");

     const parser = new ArgParser({
       appName: "Test CLI",
       handler: (ctx) => ({ cwd: process.cwd() }),
     }).addFlag({
       name: "workspace",
       options: ["--workspace"],
       type: "string",
       setWorkingDirectory: true,
     });

     const result = await parser.parse(["--workspace", "/nonexistent/path"]);

     expect(consoleWarnSpy).toHaveBeenCalledWith(
       expect.stringContaining("does not exist"),
     );
     expect(result.cwd).toBe(originalCwd);
   });
   ```

5. **Backward compatibility (no setWorkingDirectory)**

   ```typescript
   test("should maintain backward compatibility when no setWorkingDirectory is used", async () => {
     const parser = new ArgParser({
       appName: "Test CLI",
       handler: (ctx) => ctx.args,
     }).addFlag({
       name: "test",
       options: ["--test"],
       type: "string",
     });

     const envPath = path.join(process.cwd(), "config.env");
     fs.writeFileSync(envPath, "TEST=value\n");

     const result = await parser.parse(["--s-with-env", "config.env"]);
     expect(result.test).toBe("value");
   });
   ```

6. **rootPath in handler context**

   ```typescript
   test("should provide rootPath in handler context", async () => {
     const parser = new ArgParser({
       appName: "Test CLI",
       handler: (ctx) => ({ rootPath: ctx.rootPath }),
     }).addFlag({
       name: "workspace",
       options: ["--workspace"],
       type: "string",
       setWorkingDirectory: true,
     });

     const result = await parser.parse(["--workspace", testDir]);
     expect(result.rootPath).toBe(originalCwd);
   });
   ```

7. **Priority order: .env.local > .env.dev > .env**

   ```typescript
   test("should use .env.local over other .env files", async () => {
     // Create multiple env files
     fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
     fs.writeFileSync(path.join(testDir, ".env.dev"), "PRIORITY=dev\n");
     fs.writeFileSync(path.join(testDir, ".env.local"), "PRIORITY=local\n");

     // ... parser setup ...
     const result = await parser.parse([
       "--workspace",
       testDir,
       "--s-with-env",
     ]);

     expect(result.priority).toBe("local");
   });
   ```

#### 6.2 Update Existing Tests

**File:** `tests/with-env.test.ts`

**Add test cases:**

- `--s-with-env` with `setWorkingDirectory` flag
- Auto-discovery with different `NODE_ENV` values
- Path resolution from effective cwd

---

### Phase 7: Documentation

#### 7.1 Create New Documentation File

**File:** `docs/WORKING_DIRECTORY.md`

**Content:**

````markdown
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
````

### How It Works

When a flag has `setWorkingDirectory: true`:

1. The flag's value is resolved to an absolute path
2. The path becomes the effective working directory for:
   - `.env` file loading (both explicit and auto-discovered)
   - Any file operations in the handler (if you use relative paths)
3. All paths are resolved relative to this effective directory
4. The last such flag in the command chain wins (with a warning)

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

1. `.env.local` (highest priority)
2. `.env.dev` (when `NODE_ENV=development` or `NODE_ENV=dev`)
3. `.env.test` (when `NODE_ENV=test`)
4. `.env` (fallback)

### Explicit File Path

When a file path is provided, it's resolved relative to the effective working directory:

```bash
# With workspace flag:
my-cli --workspace ./packages/app-a --s-with-env config/custom.env
# Loads: /repo/packages/app-a/config/custom.env

# Without workspace flag:
my-cli --s-with-env config/custom.env
# Loads: /repo/config/custom.env (relative to current cwd)
```

## Backward Compatibility

Existing code that doesn't use `setWorkingDirectory` maintains its current behavior:

- `.env` files are loaded from the current working directory
- Path resolution is unchanged
- No changes to existing parsing logic

## Best Practices

1. **Document workspace behavior clearly**: Users should understand how paths are resolved

2. **Use rootPath for user-facing messages**: Display paths relative to user's cwd for clarity

3. **Test with absolute and relative paths**: Ensure your handlers work correctly in both cases

4. **Validate workspace directory**: ArgParser will warn if the directory doesn't exist or isn't a directory

5. **Consider environment-specific files**: Use `.env.local` for development, `.env.test` for testing

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

## Troubleshooting

### "No .env file found" warning

If you see this warning:

1. Check that `.env`, `.env.local`, or environment-specific files exist in the effective working directory
2. Verify that `setWorkingDirectory` flag points to the correct directory
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

````

#### 7.2 Update Existing Documentation

**Files to update:**
- `README.md`: Add reference to working directory management
- `docs/how/ENV_VARIABLES.md`: Add section on effective working directory

**Add to `README.md`:**
```markdown
## Working Directory Management

For monorepo support, ArgParser allows you to change the effective working directory
using the `setWorkingDirectory` flag property. See the [Working Directory Guide](docs/WORKING_DIRECTORY.md)
for details.
````

---

## Implementation Checklist

- [ ] Phase 1: Update type definitions (IFlag, IHandlerContext)
- [ ] Phase 2: Implement `#_resolveWorkingDirectory()` method
- [ ] Phase 2: Integrate into `#_handleGlobalChecks()`
- [ ] Phase 3: Add `discoverEnvFile()` to `ConfigurationManager`
- [ ] Phase 3: Update `--s-with-env` handling with effective cwd
- [ ] Phase 4: Populate `rootPath` in handler context
- [ ] Phase 5: Update help text and add JSDoc documentation
- [ ] Phase 6: Create comprehensive test suite
- [ ] Phase 6: Update existing tests for backward compatibility
- [ ] Phase 7: Create `WORKING_DIRECTORY.md` documentation
- [ ] Phase 7: Update `README.md` and `ENV_VARIABLES.md`
- [ ] Run lint and typecheck
- [ ] Verify all tests pass

---

## Questions for Review

1. **Auto-discovery priority**: Is `.env.local > .env.dev/.env.test > .env` the correct order?

2. **Warning messages**: Are the proposed warning messages clear enough?

3. **Multiple chdir flags**: Should we error instead of warn? Current plan: warning + last wins

4. **Path validation**: Should we validate the directory exists immediately (current plan) or on file access only? Current plan: validate immediately with warning

5. **MCP mode integration**: Should `rootPath` be available in MCP mode? Current plan: yes, for consistency

---

## Future Enhancements

### Option C: Explicit Path Flag Type

Add a new flag property to mark path flags for automatic translation:

```typescript
{
  name: "input",
  options: ["--input", "-i"],
  type: "string",
  path: "user-cwd" | "effective-cwd",  // NEW property
}
```

When `path: "user-cwd"`:

- Flag values are automatically translated from user cwd → effective cwd
- Example: `--input ./data/file.txt` (typed at /repo/) → resolves to `/repo/data/file.txt` even when effective cwd is `/repo/packages/app-a/`

This can be added later as an opt-in enhancement if users request it.

### Workspace Aliases

Add support for workspace name resolution:

```typescript
.addFlag({
  name: "workspace",
  options: ["--workspace", "-w"],
  type: "string",
  setWorkingDirectory: true,
  workspaceAliases: {
    "app-a": "./packages/app-a",
    "app-b": "./packages/app-b",
  },
})

// Usage:
my-cli --workspace app-a  # Resolves to ./packages/app-a
```

---

**Status:** Ready for implementation
