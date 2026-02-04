# Interactive Prompts

Integration with @clack/prompts for building dual-mode CLIs that work both programmatically (via flags) and interactively (via prompts).

## When to Use

- Want to offer both CLI flags AND interactive prompts
- Building developer tools that need user input
- Creating guided workflows with sequential prompts
- Need validation and re-prompt loops
- Building deployment/configuration tools

## Architecture

Interactive prompts are **command-level**, not flag-level. A command (ArgParser instance) defines when to show prompts via `promptWhen`:

```
Command Level
├── promptWhen: "interactive-flag" | "missing" | "always"
├── onCancel: callback for Ctrl+C
└── Flags with prompt property
    ├── prompt: factory function
    ├── promptSequence: order (optional)
    └── Types: text | password | confirm | select | multiselect
```

## Decision Tree

```
User runs command
│
├─ Has --interactive flag?
│  ├─ YES → Show prompts
│  └─ NO → Check promptWhen
│
├─ promptWhen: "always"?
│  └─ YES → Show prompts
│
├─ promptWhen: "missing"?
│  ├─ Any flag with prompt missing value?
│  │  ├─ YES → Show prompts
│  │  └─ NO → Skip prompts
│
└─ promptWhen: "interactive-flag" (default)
   └─ Skip prompts
```

## Workflow

### 1. Enable Interactive Mode

Add `promptWhen` to ArgParser config:

```typescript
const cli = new ArgParser({
  appName: "deploy-tool",
  promptWhen: "interactive-flag", // Trigger with --interactive
  handler: async (ctx) => {
    if (ctx.isInteractive) {
      console.log("Interactive mode!");
    }
  },
});
```

### 2. Add --interactive Flag

Must be added manually (not auto-added):

```typescript
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
  description: "Run in interactive mode",
});
```

### 3. Add Promptable Flags

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

### 4. Access Answers in Handler

```typescript
handler: async (ctx) => {
  // Merge args (CLI) with promptAnswers (interactive)
  const env = ctx.args.environment || ctx.promptAnswers?.environment;
};
```

## Prompt Types

| Type          | Description             | Returns        |
| ------------- | ----------------------- | -------------- |
| `text`        | Free text input         | `string`       |
| `password`    | Hidden input            | `string`       |
| `confirm`     | Yes/no prompt           | `boolean`      |
| `select`      | Single choice from list | Selected value |
| `multiselect` | Multiple choices        | `Array<value>` |

## Enhanced Features

### Default Value Fallback

When a flag has `defaultValue` but no explicit `initial` in the prompt config, the `defaultValue` is automatically used as the initial value:

```typescript
cli.addFlag({
  name: "timeout",
  options: ["--timeout", "-t"],
  type: "number",
  defaultValue: 30, // Used as initial in prompt
  prompt: async () => ({
    type: "text",
    message: "Enter timeout (seconds):",
    // No initial needed - uses defaultValue automatically
  }),
} as IPromptableFlag);
```

**Priority:** `config.initial` > `flag.defaultValue` > `undefined`

### Conditional Prompt Skipping

Skip prompts based on previous answers using the `skip` option:

```typescript
// First prompt
cli.addFlag({
  name: "configureAdvanced",
  options: ["--configure-advanced"],
  type: "boolean",
  promptSequence: 1,
  prompt: async () => ({
    type: "confirm",
    message: "Configure advanced options?",
    initial: false,
  }),
} as IPromptableFlag);

// Second prompt - skipped if first was false
cli.addFlag({
  name: "advancedOptions",
  options: ["--advanced-options"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => ({
    type: "text",
    message: "Enter advanced options:",
    skip: !ctx.promptAnswers?.configureAdvanced,
  }),
} as IPromptableFlag);
```

### Multiselect with Select All

Enable quick selection/deselection of all options in multiselect prompts:

```typescript
cli.addFlag({
  name: "modules",
  options: ["--modules", "-m"],
  type: "array",
  prompt: async () => ({
    type: "multiselect",
    message: "Select modules to install:",
    options: ["auth", "database", "api", "ui", "cache"],
    allowSelectAll: true, // Enable select all/none toggle
  }),
} as IPromptableFlag);
```

When `allowSelectAll` is true:

- After the multiselect, a confirmation prompt asks "Select all options?" or "Deselect all?"
- If confirmed, the multiselect is reshown with all/none selected
- Useful when selecting many options from a long list

## Examples

### Basic Interactive CLI

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    const name = ctx.args.name || ctx.promptAnswers?.name;
    console.log(`Hello ${name}`);
  },
});

cli.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

cli.addFlag({
  name: "name",
  options: ["-n", "--name"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Your name:",
    validate: (v) => v.length > 0 || "Required",
  }),
} as IPromptableFlag);
```

### Sequential Prompts

```typescript
// First prompt
cli.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Environment:",
    options: ["staging", "prod"],
  }),
} as IPromptableFlag);

// Second prompt (depends on first)
cli.addFlag({
  name: "version",
  options: ["--version"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => {
    const env = ctx.promptAnswers?.env;
    return {
      type: "select",
      message: `Version for ${env}:`,
      options: env === "prod" ? ["1.0.0", "1.1.0"] : ["2.0.0-beta"],
    };
  },
} as IPromptableFlag);
```

### Subcommand with Prompts

```typescript
const childParser = new ArgParser({
  appName: "child",
  promptWhen: "always", // Always prompt when this subcommand runs
  handler: async (ctx) => {
    console.log("Deploying to:", ctx.promptAnswers?.env);
  },
});

childParser.addFlag({
  name: "env",
  options: ["--env"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

// Root CLI
const root = new ArgParser({ appName: "root" });

// Add --interactive to root (required for master example pattern)
root.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

root.addSubCommand({
  name: "deploy",
  parser: childParser,
  onCancel: () => console.log("Cancelled"),
});
```

See also:

- `api.md` - Full API reference
- `configuration.md` - Setup and config options
- `patterns.md` - Common implementation patterns
- `gotchas.md` - Known issues and workarounds
