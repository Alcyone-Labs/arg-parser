# Interactive Prompts API Reference

## Type Definitions

### PromptType

```typescript
type PromptType = "text" | "password" | "confirm" | "select" | "multiselect";
```

Union type of all supported prompt types from @clack/prompts.

### PromptFieldConfig

```typescript
interface PromptFieldConfig {
  type: PromptType;
  message: string;
  placeholder?: string;     // text only
  initial?: any;            // confirm: boolean, select: string value
  validate?: (value: any, ctx: IHandlerContext) => boolean | string | Promise<boolean | string>;
  options?: Array<string | { label: string; value: any; hint?: string }>;
  maxItems?: number;        // select/multiselect only
}
```

Configuration for a single prompt field.

### PromptWhen

```typescript
type PromptWhen = "interactive-flag" | "missing" | "always";
```

When to trigger interactive mode:
- `"interactive-flag"` - Only when `--interactive` or `-i` flag present
- `"missing"` - When any promptable flag is missing a value
- `"always"` - Always show prompts (overrides CLI args)

### IPromptableFlag

```typescript
interface IPromptableFlag extends IFlag {
  prompt?: (ctx: IHandlerContext) => PromptFieldConfig | Promise<PromptFieldConfig>;
  promptSequence?: number;
}
```

Extended flag interface with prompt support.

**Fields:**
- `prompt` - Factory function returning prompt configuration
- `promptSequence` - Explicit order (1 = first). Falls back to array order if not specified

### IHandlerContext Extensions

```typescript
interface IHandlerContext {
  // ... existing fields ...
  promptAnswers?: Record<string, any>;
  isInteractive?: boolean;
}
```

**New fields:**
- `promptAnswers` - Object containing all answers from prompts (key = flag name)
- `isInteractive` - Boolean indicating if running in interactive mode

## ArgParser Configuration

### Constructor Options

```typescript
new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag",  // default
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>,
  // ... other options
});
```

**Options:**
- `promptWhen` - When to trigger interactive mode
- `onCancel` - Called when user presses Ctrl+C during prompts

### Methods

#### getPromptableFlags()

```typescript
getPromptableFlags(): Array<{ flag: IPromptableFlag; name: string }>
```

Returns all flags that have prompt configuration.

#### getPromptWhen()

```typescript
getPromptWhen(): PromptWhen
```

Returns the current `promptWhen` setting.

#### setPromptWhen()

```typescript
setPromptWhen(promptWhen: PromptWhen): this
```

Sets the `promptWhen` mode. Returns parser for chaining.

#### setOnCancel()

```typescript
setOnCancel(onCancel: (ctx: IHandlerContext) => void | Promise<void>): this
```

Sets the cancel callback. Returns parser for chaining.

## PromptManager API

### Constructor

```typescript
new PromptManager({
  context: IHandlerContext;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
});
```

### Static Methods

#### isInteractiveEnvironment()

```typescript
PromptManager.isInteractiveEnvironment(): boolean
```

Returns `true` if `process.stdin.isTTY` is `true`. Used for CI/pipe detection.

#### shouldTriggerInteractive()

```typescript
PromptManager.shouldTriggerInteractive(
  promptWhen: PromptWhen,
  flags: Array<{ flag: IPromptableFlag; name: string }>,
  args: Record<string, any>
): boolean
```

Determines if interactive mode should trigger based on condition.

#### sortFlagsBySequence()

```typescript
PromptManager.sortFlagsBySequence(
  flags: Array<{ flag: IPromptableFlag; name: string; index: number }>
): Array<{ flag: IPromptableFlag; name: string; index: number }>
```

Sorts flags by `promptSequence` or falls back to array order.

### Instance Methods

#### executePrompts()

```typescript
executePrompts(
  flags: Array<{ flag: IPromptableFlag; name: string }>
): Promise<{
  success: boolean;
  answers: Record<string, any>;
  cancelled: boolean;
}>
```

Executes all prompts in sequence. Returns collected answers.

## Subcommand Configuration

### ISubCommand Extensions

```typescript
interface ISubCommand {
  // ... existing fields ...
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

**New fields:**
- `promptWhen` - Per-subcommand trigger mode
- `onCancel` - Per-subcommand cancel handler

## Exports

```typescript
// From @alcyone-labs/arg-parser
export { PromptManager };
export type {
  PromptType,
  PromptFieldConfig,
  PromptWhen,
  IPromptableFlag,
  PromptManagerOptions,
  PromptResult,
};
```
