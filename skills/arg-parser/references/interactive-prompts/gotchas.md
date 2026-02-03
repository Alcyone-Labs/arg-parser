# Interactive Prompts Gotchas

Known issues, limitations, and workarounds for interactive prompts.

## Gotcha 1: Subcommand Prompts Need --interactive on Root

**Problem:** Subcommand with prompts doesn't trigger when run from root.

```typescript
// ❌ WRONG: Root doesn't have --interactive
const root = new ArgParser({ appName: "root" });

const child = new ArgParser({
  appName: "child",
  promptWhen: "interactive-flag",
});

root.addSubCommand({ name: "deploy", parser: child });

// Running: root deploy --interactive
// Error: Unknown command '--interactive'
```

**Solution:** Add `--interactive` to BOTH root and child:

```typescript
// ✓ CORRECT: Root has --interactive
const root = new ArgParser({ appName: "root" });

root.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

const child = new ArgParser({
  appName: "child",
  promptWhen: "always", // Use "always" since --interactive consumed by root
});

root.addSubCommand({ name: "deploy", parser: child });

// Running: root --interactive deploy
// Works! ✓
```

## Gotcha 2: Flag Order Matters

**Problem:** Arguments in wrong order cause parsing errors.

```bash
# ❌ WRONG: Subcommand before flag
cli deploy --interactive
# Error: Unknown command '--interactive'

# ✓ CORRECT: Flag before subcommand
cli --interactive deploy
# Works! ✓
```

**Explanation:** The parser processes arguments left-to-right. Flags must come before the subcommand name.

## Gotcha 3: promptWhen Not Inherited

**Problem:** Setting `promptWhen` on `addSubCommand` doesn't work as expected.

```typescript
// ❌ WRONG: promptWhen on addSubCommand ignored
root.addSubCommand({
  name: "deploy",
  parser: deployParser,
  promptWhen: "interactive-flag", // This is NOT inherited by parser
});
```

**Solution:** Set `promptWhen` on the child parser itself:

```typescript
// ✓ CORRECT: promptWhen on child parser
const deployParser = new ArgParser({
  appName: "deploy",
  promptWhen: "always", // Set here
});

root.addSubCommand({
  name: "deploy",
  parser: deployParser,
  // Don't set promptWhen here
});
```

## Gotcha 4: --interactive Flag Not Auto-Added

**Problem:** Expecting `--interactive` to be automatically available.

```typescript
// ❌ WRONG: No --interactive flag defined
const cli = new ArgParser({
  promptWhen: "interactive-flag", // Expects --interactive flag
});

// Running: cli --interactive
// Error: Unknown command '--interactive'
```

**Solution:** Must manually add the flag:

```typescript
// ✓ CORRECT: Explicitly add --interactive
const cli = new ArgParser({
  promptWhen: "interactive-flag",
});

cli.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});
```

## Gotcha 5: Type Casting Required

**Problem:** TypeScript errors when adding `prompt` to flags.

```typescript
// ❌ WRONG: Type error
cli.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  prompt: async () => ({ ... }), // Error: 'prompt' doesn't exist
});
```

**Solution:** Cast to `IPromptableFlag`:

```typescript
import type { IPromptableFlag } from "@alcyone-labs/arg-parser";

// ✓ CORRECT: Type cast
cli.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  prompt: async () => ({ ... }),
} as IPromptableFlag);
```

## Gotcha 6: Non-TTY Environments

**Problem:** Prompts hang in CI/CD or piped environments.

```bash
# ❌ WRONG: Will hang in CI
echo "value" | cli --interactive
```

**Explanation:** TTY detection automatically skips prompts in non-interactive environments.

**Solution:** Provide flags in non-TTY environments:

```bash
# ✓ CORRECT: Use flags instead
cli --env production --version 2.0.0
```

Or check programmatically:

```typescript
import { PromptManager } from "@alcyone-labs/arg-parser";

if (!PromptManager.isInteractiveEnvironment()) {
  console.log("Non-interactive mode - provide flags");
  process.exit(1);
}
```

## Gotcha 7: Accessing promptAnswers with Bracket Notation

**Problem:** TypeScript errors when accessing `ctx.promptAnswers.field`.

```typescript
// ❌ WRONG: Type error
const env = ctx.promptAnswers.environment;
// Error: Property 'environment' comes from index signature
```

**Solution:** Use bracket notation:

```typescript
// ✓ CORRECT: Bracket notation
const env = ctx.promptAnswers?.["environment"];
// or
const env = ctx.promptAnswers?.environment; // With optional chaining
```

## Gotcha 8: Missing promptSequence Causes Wrong Order

**Problem:** Prompts appear in wrong order.

```typescript
// ❌ WRONG: Order depends on addFlag() call order
cli.addFlag({ name: "b", prompt: ... }); // Appears 1st
cli.addFlag({ name: "a", prompt: ... }); // Appears 2nd
```

**Solution:** Use `promptSequence` for explicit ordering:

```typescript
// ✓ CORRECT: Explicit sequence
cli.addFlag({
  name: "a",
  promptSequence: 1, // First
  prompt: ...
} as IPromptableFlag);

cli.addFlag({
  name: "b",
  promptSequence: 2, // Second
  prompt: ...
} as IPromptableFlag);
```

## Gotcha 9: Cancel Doesn't Stop Execution

**Problem:** Handler runs even after user cancels.

```typescript
const cli = new ArgParser({
  handler: async (ctx) => {
    // This runs even if user cancels!
    console.log("Deploying...");
  },
});
```

**Explanation:** Cancel stops prompts but handler may still run with partial/undefined answers.

**Solution:** Check if cancelled in handler:

```typescript
const cli = new ArgParser({
  handler: async (ctx) => {
    // Check if we have required answers
    const env = ctx.args.environment || ctx.promptAnswers?.["environment"];
    if (!env) {
      console.log("Missing required environment");
      return;
    }
    console.log("Deploying...");
  },
});
```

Or use `onCancel` callback:

```typescript
cli.addSubCommand({
  name: "deploy",
  parser: deployParser,
  onCancel: () => {
    console.log("Cancelled - exiting");
    process.exit(0);
  },
});
```

## Gotcha 10: @clack/prompts Not in Dependencies

**Problem:** Missing @clack/prompts dependency.

```bash
Error: Cannot find module '@clack/prompts'
```

**Solution:** Install dependency:

```bash
npm install @clack/prompts
# or
yarn add @clack/prompts
# or
pnpm add @clack/prompts
```

Note: @alcyone-labs/arg-parser has @clack/prompts as a dependency, so it should be available automatically.

## Gotcha 11: Empty Options Array

**Problem:** Empty or undefined options for select/multiselect.

```typescript
prompt: async (ctx) => {
  const options = await fetchOptions();
  return {
    type: "select",
    message: "Choose:",
    options: options || [], // Empty array if fetch fails
  };
};
```

**Result:** @clack/prompts may crash or show empty list.

**Solution:** Always validate options:

```typescript
prompt: async (ctx) => {
  const options = await fetchOptions();
  if (!options || options.length === 0) {
    throw new Error("No options available");
  }
  return {
    type: "select",
    message: "Choose:",
    options,
  };
};
```

## Gotcha 12: Async Validation Errors

**Problem:** Async validation throws unhandled errors.

```typescript
prompt: async () => ({
  type: "text",
  message: "Username:",
  validate: async (val) => {
    const exists = await checkUser(val); // May throw
    if (exists) return "User exists";
    return true;
  },
});
```

**Solution:** Wrap in try-catch:

```typescript
prompt: async () => ({
  type: "text",
  message: "Username:",
  validate: async (val) => {
    try {
      const exists = await checkUser(val);
      if (exists) return "User exists";
      return true;
    } catch (error) {
      return "Validation error - try again";
    }
  },
});
```
