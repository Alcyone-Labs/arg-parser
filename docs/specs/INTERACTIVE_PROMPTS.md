# Interactive Prompts Specification

## Overview

This specification defines the **Interactive Prompts** feature for `@alcyone-labs/arg-parser`, which integrates `@clack/prompts` to provide command-level interactive mode. This allows CLI builders to offer both programmatic (flag-based) and interactive (prompt-based) interfaces for the same commands.

## Goals

1. **Dual Interface**: Commands work both via CLI flags (`--env production`) and interactive prompts
2. **Command-Level Control**: Interactivity is defined at the command level, not flag level
3. **Sequenced Prompts**: Prompts execute in a defined order with access to previous answers
4. **Dynamic Content**: Prompts can be dynamic based on previous answers or external data
5. **Graceful Degradation**: Falls back to flag-only mode in non-TTY environments

## Non-Goals

1. Not replacing the existing flag system - flags remain primary
2. Not adding prompts to individual flags in isolation
3. Not supporting real-time validation during typing (use validate callback)
4. Not supporting form-like multi-field prompts (sequential only)

## Terminology

| Term                 | Definition                                                    |
| -------------------- | ------------------------------------------------------------- |
| **Interactive Mode** | State where prompts are shown to collect missing values       |
| **Promptable Flag**  | A flag that has a `prompt` configuration for interactive mode |
| **Prompt Sequence**  | The order in which prompts are displayed                      |
| **Prompt When**      | Condition that triggers interactive mode for a command        |
| **Prompt Answer**    | Value collected from a prompt, stored in `ctx.promptAnswers`  |

## Architecture

### Command-Level Interactive Control

Interactivity is configured at the **command level** via `promptWhen`:

```typescript
interface IInteractiveSubCommand extends ISubCommand {
  /** When to trigger interactive prompts for this command */
  promptWhen?: "interactive-flag" | "missing" | "always";

  /** Called when user cancels (Ctrl+C) during prompts */
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}
```

**Modes:**

- `'interactive-flag'` (default): Prompts shown only when `--interactive` or `-i` flag is present
- `'missing'`: Prompts shown when any promptable flag is missing a value
- `'always'`: Always show prompts (overrides CLI args for promptable flags)

### Flag-Level Prompt Configuration

Individual flags opt-in to prompts via the `prompt` property:

```typescript
interface IPromptableFlag extends IFlag {
  /**
   * Prompt configuration factory.
   * If provided, this flag can participate in interactive mode.
   */
  prompt?: (ctx: IHandlerContext) => PromptFieldConfig | Promise<PromptFieldConfig>;

  /**
   * Explicit sequence order (1 = first, 2 = second).
   * If omitted, uses the flag's position in the parser's flag array.
   */
  promptSequence?: number;
}
```

**Key behaviors:**

- Flags WITHOUT `prompt` are excluded from interactive mode entirely
- Flags WITH `prompt` are included in the sequence
- `promptSequence` is optional; array order is the fallback
- On tie (same sequence number), array order breaks the tie

### Prompt Configuration

```typescript
interface PromptFieldConfig {
  /** Type of prompt to display */
  type: "text" | "password" | "confirm" | "select" | "multiselect";

  /** Message shown to the user */
  message: string;

  /** Placeholder text (for text/password types) */
  placeholder?: string;

  /** Initial/default value */
  initial?: any;

  /**
   * Validation function.
   * Return true for valid, string for error message.
   * Can be async.
   */
  validate?: (value: any, ctx: IHandlerContext) => boolean | string | Promise<boolean | string>;

  /**
   * Options for select/multiselect.
   * Can be simple strings or label/value objects.
   */
  options?: Array<
    | string
    | {
        label: string;
        value: any;
        hint?: string;
      }
  >;

  /** Maximum items to show before scrolling (select/multiselect) */
  maxItems?: number;
}
```

### Handler Context Extensions

```typescript
interface IHandlerContext {
  // ... existing fields ...

  /**
   * Answers collected from interactive prompts.
   * Populated sequentially as prompts are answered.
   * Available to subsequent prompts for conditional logic.
   * Also available to the final handler.
   */
  promptAnswers?: Record<string, any>;

  /** Whether running in interactive mode (prompts were shown) */
  isInteractive?: boolean;
}
```

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Parse CLI Arguments                                       │
│    - Parse all flags normally                                │
│    - Include --interactive if present                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Check Interactive Trigger                                 │
│    - Get command's promptWhen setting                        │
│    - Check if condition is met:                              │
│      • 'interactive-flag': --interactive present?            │
│      • 'missing': Any promptable flag missing value?         │
│      • 'always': Always true                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
     ┌─────▼─────┐          ┌──────▼──────┐
     │ Condition │          │ Condition   │
     │ NOT MET   │          │ MET         │
     └─────┬─────┘          └──────┬──────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌──────────────────────────────────────┐
│ Skip Prompts     │    │ 3. Collect Promptable Flags          │
│ Execute Handler  │    │    - Filter flags with 'prompt'      │
│ (normal flow)    │    │    - Sort by promptSequence          │
└──────────────────┘    │    - Fallback to array order         │
                        └──────────────┬───────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────────────┐
                        │ 4. Execute Prompts Sequentially      │
                        │                                      │
                        │    For each flag in sequence:        │
                        │    ┌─────────────────────────────┐   │
                        │    │ a. Call flag.prompt(ctx)    │   │
                        │    │    - ctx.promptAnswers has  │   │
                        │    │      previous answers       │   │
                        │    └──────────────┬──────────────┘   │
                        │                   │                  │
                        │                   ▼                  │
                        │    ┌─────────────────────────────┐   │
                        │    │ b. Execute @clack/prompts   │   │
                        │    │    - Show interactive UI    │   │
                        │    │    - Wait for user input    │   │
                        │    └──────────────┬──────────────┘   │
                        │                   │                  │
                        │                   ▼                  │
                        │    ┌─────────────────────────────┐   │
                        │    │ c. Validate Result          │   │
                        │    │    - Call validate()        │   │
                        │    │    - If invalid: re-prompt  │   │
                        │    │      (infinite loop)        │   │
                        │    └──────────────┬──────────────┘   │
                        │                   │                  │
                        │                   ▼                  │
                        │    ┌─────────────────────────────┐   │
                        │    │ d. Store Answer             │   │
                        │    │    - ctx.promptAnswers[name]│   │
                        │    │    = user value             │   │
                        │    └─────────────────────────────┘   │
                        │                                      │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │ 5. Execute Handler                   │
                        │    - ctx.promptAnswers populated     │
                        │    - ctx.isInteractive = true        │
                        │    - Handler processes answers       │
                        └──────────────────────────────────────┘
```

## Error Handling & Edge Cases

### Validation Failure

- **Behavior**: Re-prompt indefinitely until validation passes
- **UX**: Show error message from validate() return value
- **Escape**: User can always Ctrl+C to cancel

### User Cancellation (Ctrl+C)

- **Behavior**: Cancel current prompt and exit gracefully
- **Callback**: Call command's `onCancel` handler if provided
- **Exit Code**: 0 (graceful, not an error)
- **No onCancel**: Silent exit

### Non-TTY Environment

- **Detection**: `process.stdin.isTTY === false`
- **Behavior**: Skip all prompts, use CLI args only
- **Missing Values**: If promptable flag missing and no default:
  - Error: `"Missing required value for --{flag}. Run with --interactive or provide the flag."`

### Async prompt() Throws

- **Behavior**: Error bubbles up, no prompts shown
- **Result**: Standard ArgParser error handling

### Empty Prompt Sequence

- **Condition**: Command has `promptWhen` but no flags have `prompt`
- **Behavior**: Warn and execute normally

### Tied Sequence Numbers

- **Condition**: Multiple flags have same `promptSequence`
- **Resolution**: Array order breaks ties (first in array wins)

## Usage Examples

### Example 1: Basic Interactive Command

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag",
});

// Add --interactive flag
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
  description: "Run in interactive mode",
});

// Add promptable flags
cli.addFlag({
  name: "name",
  options: ["--name", "-n"],
  type: "string",
  description: "Your name",
  prompt: async () => ({
    type: "text",
    message: "What is your name?",
    placeholder: "John Doe",
    validate: (val) => val.length > 0 || "Name is required",
  }),
});

cli.addFlag({
  name: "project",
  options: ["--project", "-p"],
  type: "string",
  description: "Project type",
  prompt: async () => ({
    type: "select",
    message: "Select project type:",
    options: [
      { label: "Web Application", value: "web", hint: "React/Vue/Angular" },
      { label: "API Server", value: "api", hint: "REST/GraphQL" },
      { label: "CLI Tool", value: "cli", hint: "Node.js/Bun" },
    ],
  }),
});

cli.setHandler(async (ctx) => {
  if (ctx.isInteractive) {
    console.log("Interactive answers:", ctx.promptAnswers);
  }
  console.log("Hello", ctx.args.name || ctx.promptAnswers?.name);
});

await cli.parse();
```

**Usage:**

```bash
# Programmatic
my-cli --name "Alice" --project web

# Interactive
my-cli --interactive
# ? What is your name? Alice
# ? Select project type:
#   Web Application (React/Vue/Angular)
#   API Server (REST/GraphQL)
# ❯ CLI Tool (Node.js/Bun)
```

### Example 2: Dynamic Options Based on Previous Answers

```typescript
const deployParser = new ArgParser({
  appName: "deploy",
  promptWhen: "interactive-flag",
});

deployParser.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: ["staging", "production"],
  }),
});

deployParser.addFlag({
  name: "version",
  options: ["--version", "-v"],
  type: "string",
  promptSequence: 2,
  // Dynamic options based on selected environment
  prompt: async (ctx) => {
    const env = ctx.promptAnswers?.environment;
    const versions = await fetchVersions(env); // Different versions per env

    return {
      type: "select",
      message: `Select version for ${env}:`,
      options: versions.map((v) => ({
        label: v.name,
        value: v.id,
        hint: v.deployedAt,
      })),
    };
  },
});

deployParser.addFlag({
  name: "force",
  options: ["--force", "-f"],
  type: "boolean",
  promptSequence: 3,
  prompt: async (ctx) => ({
    type: "confirm",
    message: `Deploy ${ctx.promptAnswers?.version} to ${ctx.promptAnswers?.environment}?`,
    initial: false,
  }),
});
```

### Example 3: Subcommand with 'missing' Trigger

```typescript
const cli = new ArgParser({ appName: "git-helper" });

const initParser = new ArgParser({
  appName: "init",
  handler: async (ctx) => {
    console.log("Initializing repo:", ctx.promptAnswers?.name);
  },
});

initParser.addFlag({
  name: "name",
  options: ["--name", "-n"],
  type: "string",
  mandatory: true, // Required flag
  prompt: async () => ({
    type: "text",
    message: "Repository name:",
    validate: (v) => /^[a-z0-9-]+$/.test(v) || "Use lowercase, numbers, and hyphens",
  }),
});

initParser.addFlag({
  name: "visibility",
  options: ["--visibility", "-v"],
  type: "string",
  defaultValue: "private",
  prompt: async () => ({
    type: "select",
    message: "Visibility:",
    options: [
      { label: "Public", value: "public" },
      { label: "Private", value: "private" },
    ],
  }),
});

cli.addSubCommand({
  name: "init",
  description: "Initialize a repository",
  promptWhen: "missing", // Prompt if --name is missing
  parser: initParser,
  onCancel: () => console.log("Initialization cancelled"),
});

await cli.parse();
```

**Usage:**

```bash
# Provide all args - no prompts
git-helper init --name my-repo --visibility public

# Missing --name - triggers prompt
git-helper init
# ? Repository name: my-repo
# ? Visibility:
#   Public
# ❯ Private
```

## Dependencies

- `@clack/prompts`: ^0.x.x (regular dependency)
- Existing: `chalk` (already used by @clack/prompts)

## Testing Strategy

### Unit Tests (PromptManager)

- Sequence ordering logic
- TTY detection
- Prompt config resolution
- Validation loop

### Integration Tests

- Full interactive flow with mock prompts
- Non-TTY fallback
- Cancel handling
- Dynamic options based on previous answers

### Edge Case Tests

- Empty prompt sequence
- All prompt types
- Validation failures
- Async prompt() errors

## Future Enhancements (Out of Scope for MVP)

1. **Conditional Prompts**: Skip prompts based on previous answers
2. **Prompt Groups**: Logical grouping with headers
3. **Progress Saving**: Resume partial interactive sessions
4. **Theming**: Custom colors/styling for prompts
5. **Spinner Integration**: Loading states during dynamic option fetch

## Task Breakdown

### Phase 1: Foundation

1. Add type definitions (PromptWhen, PromptFieldConfig, IPromptableFlag, etc.)
2. Extend IHandlerContext with promptAnswers and isInteractive
3. Extend ISubCommand with promptWhen and onCancel

### Phase 2: Prompt Engine

4. Create PromptManager class
5. Implement @clack/prompts integration
6. Implement sequence ordering logic
7. Implement validation loop with re-prompt

### Phase 3: Integration

8. Modify \_parseRecursive to check promptWhen condition
9. Inject prompt execution before handler
10. Handle TTY detection and fallback
11. Handle cancel (Ctrl+C) gracefully

### Phase 4: Testing

12. Unit tests for PromptManager
13. Integration tests for full flow
14. Non-TTY fallback tests
15. Cancel handling tests

### Phase 5: Documentation

16. JSDoc for all new types and methods
17. Usage examples
18. Migration guide for existing commands

---

**Status**: Ready for implementation  
**Priority**: High  
**Estimated Effort**: 12-16 hours  
**Dependencies**: @clack/prompts
