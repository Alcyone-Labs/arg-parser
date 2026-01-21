# Core Gotchas

Pitfalls, limitations, and lifecycle bugs in ArgParser core.

## Auto-Execution Detection

### Problem: `parse()` auto-executes when script is run directly

```typescript
// my-cli.ts
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({ appName: "My CLI" });
parser.addFlags([{ name: "name", options: ["--name"], type: "string" }]);
parser.setHandler((ctx) => console.log(ctx.args.name));

// When run: node my-cli.ts --name foo
// parse() is called automatically and script exits
```

### Solution: Disable autoExecute or importMetaUrl

```typescript
await parser.parse([], { autoExecute: false });

// Or use importMetaUrl for proper ES module detection
await parser.parse([], { importMetaUrl: import.meta.url });
```

### Problem: Detection may fail in some environments

- Bun.js may not properly detect direct execution
- Sandboxed environments (WebContainer, etc.)
- Test runners that import the script

### Solution: Explicit parse call

```typescript
// Always call parse() explicitly in library code
if (require.main === module || process.argv[1]?.includes("my-cli")) {
  await parser.parse();
}
```

## Flag Name Conflicts

### Problem: Duplicate flags throw or warn

```typescript
parser.addFlag({ name: "verbose", options: ["--verbose"], type: Boolean });
parser.addFlag({ name: "verbose", options: ["-v"], type: Boolean });
// Throws if throwForDuplicateFlags: true, otherwise warns
```

### Solution: Check before adding

```typescript
if (!parser.hasFlag("verbose")) {
  parser.addFlag({
    name: "verbose",
    options: ["--verbose", "-v"],
    type: Boolean,
  });
}
```

### Problem: Subcommands can shadow parent flags

```typescript
const parent = new ArgParser({ appName: "Parent" }).addFlags([
  { name: "config", options: ["--config"], type: "string" },
]);

const child = new ArgParser({ appName: "Child" }).addFlags([
  { name: "config", options: ["--config"], type: "string" }, // Shadows parent
]);

parent.addSubCommand({ name: "child", parser: child });
// When running: parent --config=a child --config=b
// child's handler sees config=b, parent's handler sees config=a
// But parent's config flag is NOT inherited because child has its own
```

## Environment Variable Priority

### Problem: ENV vars may not override as expected

```typescript
// Config file sets: { debug: true }
// Env var: DEBUG_MODE=false
// CLI flag: --debug (Boolean, default false)
//
// Priority should be: CLI > ENV > config
// But if flagOnly: true, the flag's presence alone sets it
```

### Solution: Understand the chain

```typescript
// Flag definition with env
{
  name: "debug",
  options: ["--debug"],
  type: Boolean,
  flagOnly: true,        // Presence alone sets to true
  env: "DEBUG_MODE",
  defaultValue: false,   // Only used if neither CLI nor ENV
}

// CLI --debug: debug = true
// ENV DEBUG_MODE=true: debug = true
// CLI --debug + ENV DEBUG_MODE=false: debug = true (CLI wins)
```

## Working Directory Resolution

### Problem: `setWorkingDirectory` has last-flag-wins behavior

```typescript
.addFlags([
  { name: "project", options: ["--project"], setWorkingDirectory: true },
  { name: "workspace", options: ["--workspace"], setWorkingDirectory: true },
]);

// User runs: my-cli --project ./a --workspace ./b
// Effective cwd is ./b (last one wins)
```

### Solution: Design flags to not conflict

```typescript
// Use mutually exclusive options
{
  name: "directory",
  options: ["--project", "--workspace"],
  type: "string",
  setWorkingDirectory: true,
  // Single flag, no conflict
}
```

### Problem: `ctx.rootPath` is NOT the effective cwd

```typescript
// User runs: my-cli --workspace ./packages/app
// From: /home/user/project/

// In handler:
console.log(process.cwd()); // /home/user/project/packages/app (effective)
console.log(ctx.rootPath); // /home/user/project/ (original)

// Relative paths in args are resolved relative to effective cwd!
console.log(ctx.args.config); // "./config.json"
console.log(path.resolve(ctx.args.config)); // Resolves from packages/app
// NOT from ctx.rootPath
```

## Zod Schema Compatibility

### Problem: Zod v4 syntax required, but MCP SDK needs v3

```typescript
import { z } from "zod";

// Zod v4 syntax (required)
type: z.url(); // NOT z.string().url()
type: z.email(); // NOT z.string().email()
type: z.datetime(); // NOT z.string().datetime()

// MCP SDK internally handles conversion
// But output schema validation may differ
```

### Solution: Use Zod v4 syntax for input, patterns for output

```typescript
import { OutputSchemaPatterns } from "@alcyone-labs/arg-parser";

// For flag type input
{
  type: z.object({
    name: z.string().min(1),
    email: z.email(),
  }),
}

// For output schema, use patterns
{
  outputSchema: "successWithData",
  // Or explicit z.object({ ... })
}
```

### Problem: Zod schema in flags may cause issues with circular refs

```typescript
// Avoid circular references in Zod schemas
const recursiveSchema = z.lazy(() =>
  z.object({
    id: z.number(),
    children: z.array(recursiveSchema),
  }),
);
```

## Dynamic Flag Registration

### Problem: Flags are registered AFTER the triggering flag is parsed

```typescript
{
  name: "mode",
  options: ["--mode"],
  dynamicRegister: async (ctx) => {
    // At this point, mode flag is already parsed
    // But other flags haven't been processed yet
    return [
      { name: "newFlag", options: ["--new-flag"], type: "string" },
    ];
  },
}

// User runs: my-cli --mode advanced --new-flag value
// --new-flag is available because --mode triggered its registration
// But --new-flag must come AFTER --mode in command line
```

### Solution: Ensure flag order in command line

```typescript
// User must run: my-cli --mode advanced --new-flag value
// NOT: my-cli --new-flag value --mode advanced
// Because dynamic registration happens when --mode is parsed
```

### Problem: Dynamic flags are not cleaned up between parse calls

```typescript
// In test or hot-reload scenarios
await parser.parse(["--mode", "advanced", "--new-flag", "x"]);
// newFlag is now registered

await parser.parse(["--mode", "basic"]);
// newFlag is STILL registered from previous parse!
```

### Solution: Parser instance should not be reused for different modes

```typescript
// Create new parser for each mode test
const createParser = (mode: string) => {
  const parser = new ArgParser({ appName: "Test" });
  parser.addFlag({
    name: "mode",
    options: ["--mode"],
    type: "string",
    defaultValue: mode,
  });
  if (mode === "advanced") {
    parser.addFlag({
      name: "newFlag",
      options: ["--new-flag"],
      type: "string",
    });
  }
  return parser;
};
```

## MCP Console Hijacking

### Problem: `console.log` is hijacked in MCP mode

```typescript
parser.setHandler((ctx) => {
  console.log("This is hijacked in MCP mode");
  // In CLI mode: outputs to stdout normally
  // In MCP mode: redirected to avoid protocol contamination
});
```

### Solution: Use `ctx.logger` for data-safe logging

```typescript
parser.setHandler((ctx) => {
  ctx.logger.info("User-friendly message");
  ctx.logger.debug("Debug info for developers");
  // In MCP mode, logger writes to STDERR or log file
  // STDOUT is reserved for MCP protocol responses
});
```

### Problem: Multiple log calls may interleave

```typescript
// Bad: Multiple async log calls
ctx.logger.info("Starting..."); // May interleave with other logs
await doSomething();
ctx.logger.info("Done");
```

### Solution: Single structured log or buffered logging

```typescript
ctx.logger.info("Operation", { step: "start", input: ctx.args });
await doSomething();
ctx.logger.info("Operation", { step: "complete", result });
```

## Async Handler Handling

### Problem: `deep: true` (default) may cause issues with long-running handlers

```typescript
// Default: deep: true
parser.setHandler(async (ctx) => {
  await longRunningOperation();
  // Handler promise is awaited before parse returns
});

// This is usually fine, but can cause issues with:
```

### Solution: Use `deep: false` for manual control

```typescript
const result = await parser.parse([], { deep: false });
// result.data._asyncHandlerInfo contains the handler promise
await result.data._asyncHandlerInfo.handler(
  result.data._asyncHandlerInfo.context,
);
```

### Problem: Unhandled rejections in async handlers

```typescript
parser.setHandler(async (ctx) => {
  throw new Error("Oops"); // May not be caught properly
});

// Unhandled rejection may crash the process
```

### Solution: Wrap handler logic

```typescript
parser.setHandler(async (ctx) => {
  try {
    await riskyOperation();
  } catch (error) {
    ctx.logger.error("Operation failed", { error });
    return { success: false, error: String(error) };
  }
});
```

## Subcommand Inheritance

### Problem: Default inheritance is `false`, not `AllParents`

```typescript
const parent = new ArgParser({ appName: "Parent" }).addFlags([
  { name: "verbose", options: ["--verbose"], type: Boolean },
]);

const child = new ArgParser({ appName: "Child" }).addFlags([
  { name: "input", options: ["--input"], type: "string" },
]);

parent.addSubCommand({ name: "child", parser: child });
// Child does NOT inherit "verbose" flag by default!
```

### Solution: Explicitly set inheritance

```typescript
const parent = new ArgParser({
  appName: "Parent",
  inheritParentFlags: FlagInheritance.AllParents, // Enable inheritance
}).addFlags([{ name: "verbose", options: ["--verbose"], type: Boolean }]);

// Or use boolean (legacy)
// inheritParentFlags: true  // Direct parent only
```

### Problem: Inheritance with duplicate flag names

```typescript
const parent = new ArgParser({
  inheritParentFlags: FlagInheritance.AllParents,
}).addFlags([{ name: "debug", options: ["--debug"], type: Boolean }]);

const child = new ArgParser({ inheritParentFlags: false }).addFlags([
  { name: "debug", options: ["--debug"], type: String },
]); // Different type

parent.addSubCommand({ name: "child", parser: child });
// Child's debug flag shadows parent's
// Child's handler sees type String, not Boolean
```

## Error Types and Messages

### Problem: Custom error messages may not include command chain

```typescript
throw new Error("Invalid input");
// Error message is just "Invalid input"

throw new ArgParserError("Invalid input", this.getCommandChain());
// Error includes command chain: ["root", "subcommand"]
```

### Solution: Always use ArgParserError for parser-related errors

```typescript
if (invalid) {
  throw new ArgParserError(
    `Invalid value for flag '${flagName}'`,
    this.getCommandChain(),
  );
}
```

### Problem: Error handling may swallow stack traces

```typescript
// With handleErrors: true (default)
try {
  await parser.parse();
} catch (error) {
  console.error(error.stack); // May be incomplete
}
```

### Solution: Set handleErrors: false for full control

```typescript
const parser = new ArgParser({
  appName: "CLI",
  handleErrors: false,
  autoExit: false,
});

try {
  await parser.parse();
} catch (error) {
  console.error("Full error:", error);
  process.exit(1);
}
```

## Performance Considerations

### Problem: Large flag sets may slow parsing

```typescript
// Adding 100+ flags with complex validation
parser.addFlags([
  { name: "f1", options: ["--f1"], validate: complexValidator },
  // ... many more
]);
```

### Solution: Use dynamic registration for conditional flags

```typescript
parser.addFlags([
  {
    name: "advanced",
    options: ["--advanced"],
    dynamicRegister: async (ctx) => {
      if (ctx.value) {
        return advancedFlags; // Only added when needed
      }
      return [];
    },
  },
]);
```

### Problem: Repeated parse calls re-validate all flags

```typescript
// In test loop
for (const testCase of testCases) {
  await parser.parse(testCase.args); // Re-validates all flags each time
}
```

### Solution: Create fresh parser for each test case

```typescript
const createTestParser = (args: string[]) => {
  const parser = new ArgParser({ appName: "Test" });
  parser.addFlags(flagDefinitions);
  parser.setHandler(handler);
  return parser;
};

for (const testCase of testCases) {
  const parser = createTestParser(testCase.args);
  await parser.parse();
}
```
