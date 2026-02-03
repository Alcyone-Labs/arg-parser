# Interactive Prompts Configuration

## ArgParser Configuration

### Constructor Options

```typescript
interface IArgParserParams {
  // ... other options ...

  /**
   * When to trigger interactive prompts for this command.
   * @default "interactive-flag"
   */
  promptWhen?: "interactive-flag" | "missing" | "always";

  /**
   * Called when user cancels (Ctrl+C) during prompts.
   * If not provided, exits gracefully with code 0.
   */
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

### promptWhen Values

| Value                | Description                                            | Use Case                                 |
| -------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `"interactive-flag"` | Prompts only when `--interactive` or `-i` flag present | Explicit opt-in to interactive mode      |
| `"missing"`          | Prompts when any promptable flag missing value         | Graceful degradation for required fields |
| `"always"`           | Always show prompts regardless of flags                | Interactive-first CLI design             |

### Default Configuration

```typescript
const defaults = {
  promptWhen: "interactive-flag",
  // onCancel is undefined by default
};
```

## Flag Configuration

### IPromptableFlag Properties

```typescript
{
  name: "environment",           // required
  options: ["--env", "-e"],      // required
  type: "string",                // required

  // Prompt configuration
  prompt: async (ctx) => ({     // optional
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),

  // Explicit sequence order
  promptSequence: 1,             // optional
}
```

### promptSequence Behavior

- `1` = First prompt to show
- `2` = Second prompt to show
- If omitted, uses flag's position in array
- Ties broken by array order (first in array wins)

## PromptFieldConfig Options

### Common Options (All Types)

```typescript
{
  type: PromptType; // required - "text" | "password" | "confirm" | "select" | "multiselect"
  message: string; // required - Question shown to user
}
```

### Text Prompt

```typescript
{
  type: "text",
  message: "Enter your name:",
  placeholder?: "John Doe",      // Grey hint text
  initial?: "Anonymous",         // Default value
  validate?: (val, ctx) => {     // Returns true or error string
    return val.length > 0 || "Name is required";
  },
}
```

### Password Prompt

```typescript
{
  type: "password",
  message: "Enter password:",
  // Note: placeholder not supported
  // Note: initial not supported
}
```

### Confirm Prompt

```typescript
{
  type: "confirm",
  message: "Are you sure?",
  initial?: false,  // boolean, default false
}
```

### Select Prompt

```typescript
{
  type: "select",
  message: "Select option:",
  options?: [
    "simple-string-option",              // Simple string
    {
      label: "Display Label",            // What user sees
      value: "internal-value",           // What's returned
      hint?: "Additional info"           // Grey hint text
    },
  ],
  initial?: "internal-value",            // Must match option value
  maxItems?: 5,                          // Scroll after N items
}
```

### Multiselect Prompt

```typescript
{
  type: "multiselect",
  message: "Select features:",
  options?: [
    { label: "TypeScript", value: "ts", hint: "Type safety" },
    { label: "ESLint", value: "eslint" },
  ],
  initial?: ["ts"],                      // Array of selected values
  maxItems?: 10,
}
```

### Validation Function

```typescript
validate?: (
  value: any,
  ctx: IHandlerContext
) => boolean | string | Promise<boolean | string>;
```

**Return values:**

- `true` - Validation passed
- `string` - Validation failed, string is error message shown to user
- Re-prompts indefinitely until validation passes

## Environment Detection

### TTY Detection

Automatic non-TTY detection for CI/pipes:

```typescript
// PromptManager.isInteractiveEnvironment()
// Returns false when:
// - process.stdin.isTTY === false
// - process.stdin.isTTY === undefined
// - Running in CI/CD pipelines
```

**Behavior:** Falls back to flag-only mode, no prompts shown

### Missing Value Detection (promptWhen: "missing")

Values considered "missing":

- `undefined`
- `null`
- `""` (empty string)

Values considered "present":

- Any non-empty string
- Any boolean (true/false)
- Any number (including 0)
- Empty array `[]` (for array flags without allowMultiple)

## Subcommand Configuration

### Per-Subcommand Settings

```typescript
parser.addSubCommand({
  name: "deploy",
  description: "Deploy application",
  promptWhen: "interactive-flag", // Override parent setting
  onCancel: (ctx) => {
    // Override parent cancel handler
    console.log("Deploy cancelled");
  },
  parser: deployParser,
});
```

**Inheritance:**

- `promptWhen` inherited from parent if not specified
- `onCancel` inherited from parent if not specified
- Can override at subcommand level

## Complete Example Configuration

```typescript
const parser = new ArgParser({
  appName: "deploy-tool",
  promptWhen: "interactive-flag",
  onCancel: (ctx) => console.log("Operation cancelled"),
  handler: async (ctx) => {
    // Handle completion
  },
});

// Trigger flag
parser.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
});

// First prompt: environment
parser.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: [
      { label: "Staging", value: "staging", hint: "Safe for testing" },
      { label: "Production", value: "production", hint: "Careful!" },
    ],
  }),
} as IPromptableFlag);

// Second prompt: version (depends on environment)
parser.addFlag({
  name: "version",
  options: ["--version", "-v"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => ({
    type: "select",
    message: `Select version for ${ctx.promptAnswers?.environment}:`,
    options: await fetchVersions(ctx.promptAnswers?.environment),
  }),
} as IPromptableFlag);

// Third prompt: confirm
parser.addFlag({
  name: "confirm",
  options: ["--confirm", "-y"],
  type: "boolean",
  promptSequence: 3,
  prompt: async (ctx) => ({
    type: "confirm",
    message: `Deploy ${ctx.promptAnswers?.version} to ${ctx.promptAnswers?.environment}?`,
    initial: false,
  }),
} as IPromptableFlag);
```
