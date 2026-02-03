# Interactive Prompts Configuration

Setup and configuration options for interactive mode.

## Basic Setup

### Step 1: Enable Interactive Mode

Set `promptWhen` in ArgParser config:

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag", // Default behavior
});
```

### Step 2: Add Interactive Flag

Add `--interactive` flag manually:

```typescript
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
  description: "Run in interactive mode",
});
```

### Step 3: Add Promptable Flags

Add `prompt` property to flags:

```typescript
cli.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);
```

## Configuration Options

### promptWhen Modes

#### `"interactive-flag"` (Default)

Show prompts only when `--interactive` or `-i` flag is present.

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag",
});

// Usage:
// my-cli --input file.txt          # No prompts, use flags
// my-cli --interactive             # Show prompts
// my-cli -i                        # Show prompts
```

#### `"missing"`

Show prompts when any promptable flag is missing a value.

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "missing",
});

// Usage:
// my-cli --env production          # env provided, no prompts
// my-cli                           # env missing, show prompts
```

#### `"always"`

Always show prompts (overrides CLI args).

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "always",
});

// Usage:
// my-cli --env production          # Still shows prompts!
```

### promptSequence

Explicit ordering for prompts (1 = first):

```typescript
cli.addFlag({
  name: "environment",
  options: ["--env"],
  type: "string",
  promptSequence: 1, // First
  prompt: async () => ({ ... }),
} as IPromptableFlag);

cli.addFlag({
  name: "version",
  options: ["--version"],
  type: "string",
  promptSequence: 2, // Second
  prompt: async () => ({ ... }),
} as IPromptableFlag);
```

Without `promptSequence`, uses array order.

### onCancel

Handle user cancellation (Ctrl+C):

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  onCancel: (ctx) => {
    console.log("Operation cancelled by user");
    // Cleanup if needed
  },
});
```

For subcommands:

```typescript
cli.addSubCommand({
  name: "deploy",
  parser: deployParser,
  onCancel: () => console.log("Deployment cancelled"),
});
```

## Subcommand Configuration

### Root Parser with Subcommands

When using subcommands with prompts, both parsers need `--interactive`:

```typescript
// Root CLI
const root = new ArgParser({ appName: "root" });

// Add --interactive to ROOT (for master example pattern)
root.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

// Child parser
const child = new ArgParser({
  appName: "child",
  promptWhen: "always", // or "interactive-flag"
});

// Add prompts to child
child.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  prompt: async () => ({ ... }),
} as IPromptableFlag);

// Register subcommand
root.addSubCommand({
  name: "deploy",
  parser: child,
});
```

### Subcommand with promptWhen

```typescript
root.addSubCommand({
  name: "init",
  description: "Initialize repo",
  promptWhen: "missing", // Subcommand-specific trigger
  parser: initParser,
  onCancel: () => console.log("Init cancelled"),
});
```

## Environment Detection

### TTY Detection

Interactive mode is automatically skipped in non-TTY environments (CI, pipes):

```typescript
// This is handled automatically by PromptManager.isInteractiveEnvironment()
// Returns false when:
// - Running in CI/CD
// - Piped input/output
// - process.stdin.isTTY === false
```

### Manual Check

```typescript
import { PromptManager } from "@alcyone-labs/arg-parser";

if (PromptManager.isInteractiveEnvironment()) {
  // Safe to show prompts
} else {
  // Fall back to flags or defaults
}
```

## Validation Configuration

### Basic Validation

```typescript
prompt: async () => ({
  type: "text",
  message: "Enter name:",
  validate: (val) => {
    if (val.length === 0) return "Name is required";
    if (val.length < 3) return "Name must be at least 3 characters";
    return true; // Valid
  },
});
```

### Async Validation

```typescript
prompt: async () => ({
  type: "text",
  message: "Enter username:",
  validate: async (val) => {
    const exists = await checkUserExists(val);
    if (exists) return "Username already taken";
    return true;
  },
});
```

### Context-Aware Validation

```typescript
prompt: async (ctx) => ({
  type: "text",
  message: "Confirm:",
  validate: (val) => {
    // Access previous answers
    const prevAnswer = ctx.promptAnswers?.previousField;
    if (val !== prevAnswer) return "Must match previous field";
    return true;
  },
});
```
