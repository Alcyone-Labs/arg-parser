# Interactive Prompts Gotchas

## TTY Detection

### Issue: CI/CD Pipelines

Interactive prompts require TTY. In CI/CD or piped environments, prompts will be skipped.

```typescript
// In GitHub Actions or other CI:
// my-cli --interactive  # Prompts are skipped!

// Solution: Always provide fallback for non-TTY
const cli = new ArgParser({
  handler: async (ctx) => {
    const value = ctx.args["value"] || ctx.promptAnswers?.["value"];
    if (!value) {
      console.error("Error: --value required in non-interactive mode");
      process.exit(1);
    }
  },
});
```

### Detection

```typescript
// PromptManager.isInteractiveEnvironment() returns false when:
// - process.stdin.isTTY === false
// - process.stdin.isTTY === undefined
// - Running in Docker without -t flag
// - Running in GitHub Actions, Jenkins, etc.
```

## Validation Loop

### Issue: Infinite Re-prompt

Validation failures cause infinite re-prompt until valid. Always provide escape hatch.

```typescript
// Bad: User can get stuck
prompt: async () => ({
  type: "text",
  message: "Enter value:",
  validate: (val) => val === "secret" || "Wrong!", // User stuck if they don't know secret
});

// Good: Allow skip with Ctrl+C or provide hint
prompt: async () => ({
  type: "text",
  message: "Enter value (hint: starts with 's'):",
  validate: (val) => val.length > 0 || "Value is required",
});
```

## TypeScript Type Casting

### Issue: IFlag vs IPromptableFlag

Must cast flags with `prompt` property to `IPromptableFlag`.

```typescript
// TypeScript error: Property 'prompt' does not exist on type 'IFlag'
cli.addFlag({
  name: "test",
  options: ["--test"],
  type: "string",
  prompt: async () => ({ type: "text", message: "Test:" }),
});

// Solution: Add type cast
import type { IPromptableFlag } from "@alcyone-labs/arg-parser";

cli.addFlag({
  name: "test",
  options: ["--test"],
  type: "string",
  prompt: async () => ({ type: "text", message: "Test:" }),
} as IPromptableFlag);
```

## Zod Schema Stripping

### Issue: Custom Properties

Zod schema strips unknown properties by default. `prompt` and `promptSequence` must be in schema.

```typescript
// If you see: prompt is undefined at runtime
// Check that zodFlagSchema includes these fields

// The schema must include:
const zodFlagSchema = z.object({
  // ... other fields ...
  prompt: z.custom(...).optional(),
  promptSequence: z.number().optional(),
});
```

## Prompt Factory Context

### Issue: Context Timing

`ctx.promptAnswers` is populated sequentially during prompt execution, not before.

```typescript
// In constructor - promptAnswers is empty
const cli = new ArgParser({
  handler: async (ctx) => {
    // At this point, all prompts have completed
    console.log(ctx.promptAnswers); // ✅ Full answers
  },
});

// In prompt factory - previous answers available
cli.addFlag({
  prompt: async (ctx) => {
    console.log(ctx.promptAnswers); // ✅ Previous answers only
    // Current flag not yet added
  },
} as IPromptableFlag);
```

## Cancel Handling

### Issue: Async onCancel

`onCancel` can be async but errors won't be caught.

```typescript
// Warning: Error here will not be caught
onCancel: async (ctx) => {
  await cleanup(); // If this throws, process exits with error
};

// Better: Wrap in try-catch
onCancel: async (ctx) => {
  try {
    await cleanup();
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
};
```

## Sequence Numbers

### Issue: Duplicate Sequences

Duplicate `promptSequence` values cause tie-break by array order, which may be surprising.

```typescript
cli.addFlag({ name: "a", promptSequence: 1, ... } as IPromptableFlag);
cli.addFlag({ name: "b", promptSequence: 1, ... } as IPromptableFlag);
cli.addFlag({ name: "c", promptSequence: 1, ... } as IPromptableFlag);

// Order: a, b, c (by array order)
// If you reorder addFlag calls, sequence changes!
```

### Best Practice

Use unique sequence numbers or rely on array order entirely.

```typescript
// Explicit unique sequences
cli.addFlag({ name: "first", promptSequence: 1, ... } as IPromptableFlag);
cli.addFlag({ name: "second", promptSequence: 2, ... } as IPromptableFlag);

// Or rely on array order
cli.addFlag({ name: "first", ... } as IPromptableFlag);  // First
cli.addFlag({ name: "second", ... } as IPromptableFlag); // Second
```

## Password Prompts

### Limitation: No Placeholder

@clack/prompts password type doesn't support placeholder text.

```typescript
// This won't show placeholder
prompt: async () => ({
  type: "password",
  message: "Password:",
  placeholder: "min 8 chars", // ❌ Ignored
});

// Solution: Include hint in message
prompt: async () => ({
  type: "password",
  message: "Password (min 8 characters):", // ✅ Include in message
});
```

## Array Results

### Issue: Multiselect Returns Array

Multiselect returns an array, which may need different handling than single values.

```typescript
cli.addFlag({
  name: "features",
  type: "array", // Note: array type
  prompt: async () => ({
    type: "multiselect",
    options: ["a", "b", "c"],
  }),
} as IPromptableFlag);

// Result:
ctx.promptAnswers?.features; // ["a", "b"] - array!
ctx.args.features; // Also array if passed via --features a --features b
```

## Validation Return Types

### Issue: Falsy Values

Only `true` means success. Falsy values don't trigger error messages.

```typescript
// Bad: Empty string is falsy, no error shown
validate: (val) => val.length > 3 || ""; // ❌ Empty string = no error

// Good: Always return string for errors
validate: (val) => val.length > 3 || "Must be > 3 chars"; // ✅ Shows error
```

## Subcommand Inheritance

### Issue: promptWhen Inheritance

Subcommands inherit `promptWhen` from parent if not explicitly set.

```typescript
const parent = new ArgParser({
  promptWhen: "always", // All subcommands inherit this!
});

const child = new ArgParser({
  promptWhen: "interactive-flag", // Override parent
});
```

### Issue: onCancel Inheritance

Cancel handler also inherited. Set explicitly to override.

```typescript
parent.addSubCommand({
  name: "deploy",
  parser: deployParser,
  onCancel: (ctx) => console.log("Deploy cancelled"), // Specific message
});
```

## Flag Collisions

### Issue: Flag Name vs Prompt Answer Key

Flag name becomes the key in `promptAnswers` and `args`.

```typescript
cli.addFlag({
  name: "my-flag",  // Key is "my-flag" (with hyphen)
  ...
});

// Access with bracket notation
ctx.promptAnswers?.["my-flag"]  // ✅ Works
ctx.promptAnswers?.my-flag      // ❌ Syntax error (hyphen)
```

## Dynamic Options Errors

### Issue: Async Errors in Prompt Factory

Errors in async prompt factories will crash the prompt flow.

```typescript
cli.addFlag({
  prompt: async () => {
    const options = await fetchFromAPI(); // If this throws...
    return { type: "select", options };
  },
} as IPromptableFlag);

// Solution: Add try-catch
prompt: async () => {
  try {
    const options = await fetchFromAPI();
    return { type: "select", message: "Choose:", options };
  } catch (err) {
    // Return fallback or re-throw with context
    return { type: "text", message: "Enter manually:" };
  }
};
```

## Process Exit

### Issue: Graceful Exit on Cancel

Canceling prompts returns empty result, not error. Check `cancelled` flag.

```typescript
const result = await promptManager.executePrompts(flags);

if (result.cancelled) {
  // User pressed Ctrl+C
  // onCancel was already called
  // Exit gracefully
  return;
}

// Continue with result.answers
```

## Testing

### Issue: Mocking @clack/prompts

Testing interactive prompts requires mocking @clack/prompts.

```typescript
import { vi } from "vitest";
import * as p from "@clack/prompts";

vi.mock("@clack/prompts", () => ({
  text: vi.fn(() => Promise.resolve("mocked-value")),
  select: vi.fn(() => Promise.resolve("option-1")),
  // ... other mocks
}));
```

### Issue: TTY in Tests

Tests run without TTY by default. Override detection or mock it.

```typescript
// Mock TTY detection
vi.spyOn(PromptManager, "isInteractiveEnvironment").mockReturnValue(true);

// Or set stdin.isTTY
Object.defineProperty(process.stdin, "isTTY", { value: true });
```
