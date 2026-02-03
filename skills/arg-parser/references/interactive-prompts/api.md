# Interactive Prompts API Reference

Complete API reference for @clack/prompts integration.

## Types

### PromptType

```typescript
type PromptType = "text" | "password" | "confirm" | "select" | "multiselect";
```

### PromptWhen

```typescript
type PromptWhen = "interactive-flag" | "missing" | "always";
```

- `"interactive-flag"` (default): Show prompts only when `--interactive` or `-i` flag present
- `"missing"`: Show prompts when any promptable flag is missing a value
- `"always"`: Always show prompts (overrides CLI args)

### PromptFieldConfig

```typescript
interface PromptFieldConfig {
  type: PromptType;
  message: string;
  placeholder?: string; // For text/password
  initial?: any; // Default value
  validate?: (value: any, ctx: IHandlerContext) => boolean | string | Promise<boolean | string>;
  options?: Array<string | { label: string; value: any; hint?: string }>; // For select/multiselect
  maxItems?: number; // For select/multiselect scrolling
}
```

### IPromptableFlag

Extends `IFlag` with prompt properties:

```typescript
interface IPromptableFlag extends IFlag {
  prompt?: (ctx: IHandlerContext) => PromptFieldConfig | Promise<PromptFieldConfig>;
  promptSequence?: number; // 1 = first, 2 = second, etc.
}
```

### IInteractiveSubCommand

Extends `ISubCommand` with interactive properties:

```typescript
interface IInteractiveSubCommand extends ISubCommand {
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

### IHandlerContext Extensions

```typescript
interface IHandlerContext {
  // ... existing properties ...

  /** Answers from interactive prompts */
  promptAnswers?: Record<string, any>;

  /** Whether running in interactive mode */
  isInteractive?: boolean;
}
```

## Classes

### PromptManager

Manages interactive prompt execution.

#### Static Methods

##### `isInteractiveEnvironment(): boolean`

Returns `true` if stdin is a TTY (interactive terminal).

```typescript
if (PromptManager.isInteractiveEnvironment()) {
  // Safe to show prompts
}
```

##### `shouldTriggerInteractive(promptWhen, flags, args): boolean`

Determines if interactive mode should trigger based on condition.

```typescript
const shouldRun = PromptManager.shouldTriggerInteractive(
  "missing",
  [{ flag: envFlag, name: "environment" }],
  { environment: undefined },
);
// Returns: true (environment is missing)
```

##### `sortFlagsBySequence(flags): SortedFlags`

Sorts flags by `promptSequence` or array order.

```typescript
const sorted = PromptManager.sortFlagsBySequence([
  { flag: { promptSequence: 2 }, name: "second", index: 0 },
  { flag: { promptSequence: 1 }, name: "first", index: 1 },
]);
// Returns: [{ name: "first" ... }, { name: "second" ... }]
```

#### Instance Methods

##### `constructor(options: PromptManagerOptions)`

```typescript
const manager = new PromptManager({
  context: handlerContext,
  onCancel: () => console.log("Cancelled"),
});
```

##### `executePrompts(flags): Promise<PromptResult>`

Executes all prompts in sequence.

```typescript
const result = await manager.executePrompts([
  { flag: envFlag, name: "environment" },
  { flag: versionFlag, name: "version" },
]);

if (result.success) {
  console.log("Answers:", result.answers);
} else if (result.cancelled) {
  console.log("User cancelled");
}
```

## ArgParser Methods

### `getPromptableFlags(): Array<{ flag: IPromptableFlag; name: string }>`

Returns all flags that have a `prompt` property.

```typescript
const promptableFlags = parser.getPromptableFlags();
// Returns: [{ flag: IPromptableFlag, name: "environment" }, ...]
```

### `getPromptWhen(): PromptWhen`

Gets the current `promptWhen` setting.

```typescript
const when = parser.getPromptWhen();
// Returns: "interactive-flag" | "missing" | "always"
```

### `setPromptWhen(promptWhen): this`

Sets the `promptWhen` setting.

```typescript
parser.setPromptWhen("always");
```

### `setOnCancel(onCancel): this`

Sets the cancel callback.

```typescript
parser.setOnCancel((ctx) => {
  console.log("User cancelled prompts");
});
```

## Configuration Options

### ArgParser Constructor

```typescript
new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag", // When to trigger prompts
  onCancel: (ctx) => {
    // Cancel handler
    console.log("Cancelled");
  },
  handler: async (ctx) => {
    // Handler receives:
    // - ctx.args: Parsed CLI args
    // - ctx.promptAnswers: Answers from prompts
    // - ctx.isInteractive: Whether prompts were shown
  },
});
```

### SubCommand Configuration

```typescript
parser.addSubCommand({
  name: "deploy",
  description: "Deploy application",
  promptWhen: "interactive-flag",
  parser: deployParser,
  onCancel: () => console.log("Deployment cancelled"),
});
```

## Prompt Configuration by Type

### Text

```typescript
prompt: async () => ({
  type: "text",
  message: "Enter value:",
  placeholder: "default value",
  initial: "starting value",
  validate: (val) => val.length > 0 || "Required",
});
```

### Password

```typescript
prompt: async () => ({
  type: "password",
  message: "Enter password:",
});
```

### Confirm

```typescript
prompt: async () => ({
  type: "confirm",
  message: "Are you sure?",
  initial: false,
});
```

### Select

```typescript
prompt: async () => ({
  type: "select",
  message: "Choose one:",
  options: [
    { label: "Option A", value: "a", hint: "Hint text" },
    { label: "Option B", value: "b" },
    "simple-string-option",
  ],
  initial: "a",
  maxItems: 5,
});
```

### Multiselect

```typescript
prompt: async () => ({
  type: "multiselect",
  message: "Choose multiple:",
  options: [
    { label: "Feature A", value: "a" },
    { label: "Feature B", value: "b" },
  ],
  initial: ["a"],
  maxItems: 10,
});
```
