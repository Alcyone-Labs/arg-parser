# Interactive Prompts Patterns

Common implementation patterns for interactive prompts.

## Pattern 1: Dual-Mode CLI

CLI that works both programmatically and interactively:

```typescript
const cli = new ArgParser({
  appName: "deploy",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    // Works with both CLI args and prompt answers
    const env = ctx.args.environment || ctx.promptAnswers?.environment;
    const version = ctx.args.version || ctx.promptAnswers?.version;

    console.log(`Deploying ${version} to ${env}`);
  },
});

// Interactive flag
cli.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

// Promptable flags
cli.addFlag({
  name: "environment",
  options: ["-e", "--env"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "version",
  options: ["-v", "--version"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Version:",
    options: ["1.0.0", "1.1.0", "2.0.0"],
  }),
} as IPromptableFlag);

// Usage:
// deploy --env production --version 2.0.0  # Programmatic
// deploy -i                                # Interactive
```

## Pattern 2: Sequential Dependent Prompts

Prompts where later ones depend on earlier answers:

```typescript
cli.addFlag({
  name: "region",
  options: ["--region"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Region:",
    options: ["us-east", "us-west", "eu-central"],
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "datacenter",
  options: ["--datacenter"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => {
    const region = ctx.promptAnswers?.region;

    // Dynamic options based on previous answer
    const datacenters = {
      "us-east": ["dc1", "dc2"],
      "us-west": ["dc3", "dc4"],
      "eu-central": ["dc5", "dc6"],
    };

    return {
      type: "select",
      message: `Datacenter in ${region}:`,
      options: datacenters[region] || [],
    };
  },
} as IPromptableFlag);
```

## Pattern 3: Conditional Prompts

Prompt only when conditions are met:

```typescript
cli.addFlag({
  name: "force",
  options: ["--force", "-f"],
  type: "boolean",
  promptSequence: 3,
  prompt: async (ctx) => {
    const env = ctx.promptAnswers?.environment;

    // Only confirm for production
    if (env !== "production") {
      return { type: "confirm", message: "Continue?", initial: true };
    }

    return {
      type: "confirm",
      message: "⚠️  DEPLOYING TO PRODUCTION! Are you absolutely sure?",
      initial: false,
    };
  },
} as IPromptableFlag);
```

## Pattern 4: Form-Style Multi-Field Input

Collect multiple fields like a form:

```typescript
const setupParser = new ArgParser({
  appName: "setup",
  promptWhen: "always",
  handler: async (ctx) => {
    const answers = ctx.promptAnswers;
    console.log("Setup complete:");
    console.log(`  Database: ${answers?.dbHost}:${answers?.dbPort}`);
    console.log(`  Username: ${answers?.dbUser}`);
  },
});

// Field 1: Host
setupParser.addFlag({
  name: "dbHost",
  options: ["--db-host"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "text",
    message: "Database host:",
    placeholder: "localhost",
    initial: "localhost",
  }),
} as IPromptableFlag);

// Field 2: Port
setupParser.addFlag({
  name: "dbPort",
  options: ["--db-port"],
  type: "number",
  promptSequence: 2,
  prompt: async () => ({
    type: "text", // @clack/prompts doesn't have number type
    message: "Database port:",
    placeholder: "5432",
    initial: "5432",
    validate: (val) => !isNaN(parseInt(val)) || "Must be a number",
  }),
} as IPromptableFlag);

// Field 3: Username
setupParser.addFlag({
  name: "dbUser",
  options: ["--db-user"],
  type: "string",
  promptSequence: 3,
  prompt: async () => ({
    type: "text",
    message: "Database username:",
    validate: (val) => val.length > 0 || "Username required",
  }),
} as IPromptableFlag);

// Field 4: Password
setupParser.addFlag({
  name: "dbPassword",
  options: ["--db-password"],
  type: "string",
  promptSequence: 4,
  prompt: async () => ({
    type: "password",
    message: "Database password:",
  }),
} as IPromptableFlag);
```

## Pattern 5: Master Example Pattern

A CLI that can run multiple examples interactively:

```typescript
const masterCLI = new ArgParser({
  appName: "examples",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    if (ctx.promptAnswers?.example) {
      const exampleName = ctx.promptAnswers.example;
      console.log(`Running: ${exampleName}`);

      // Run the selected example
      switch (exampleName) {
        case "basic":
          await runBasicExample();
          break;
        case "advanced":
          await runAdvancedExample();
          break;
      }
    }
  },
});

masterCLI.addFlag({
  name: "interactive",
  options: ["-i", "--interactive"],
  type: "boolean",
  flagOnly: true,
});

masterCLI.addFlag({
  name: "example",
  options: ["--example"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Choose example:",
    options: [
      { label: "Basic", value: "basic", hint: "Simple prompts" },
      { label: "Advanced", value: "advanced", hint: "Sequential prompts" },
    ],
  }),
} as IPromptableFlag);
```

## Pattern 6: Validation with Re-prompt

Built-in validation automatically re-prompts on failure:

```typescript
cli.addFlag({
  name: "email",
  options: ["--email"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Email address:",
    validate: (val) => {
      // Return true = valid
      // Return string = error message (re-prompts)
      if (!val.includes("@")) {
        return "Please enter a valid email address";
      }
      if (!val.includes(".")) {
        return "Email must contain a domain";
      }
      return true;
    },
  }),
} as IPromptableFlag);
```

## Pattern 7: Feature Selection with Multiselect

Select multiple features at once:

```typescript
cli.addFlag({
  name: "features",
  options: ["--features", "-f"],
  type: "array",
  prompt: async () => ({
    type: "multiselect",
    message: "Select features to install:",
    options: [
      { value: "typescript", label: "TypeScript", hint: "Type safety" },
      { value: "eslint", label: "ESLint", hint: "Linting" },
      { value: "prettier", label: "Prettier", hint: "Formatting" },
      { value: "jest", label: "Jest", hint: "Testing" },
      { value: "husky", label: "Husky", hint: "Git hooks" },
    ],
  }),
} as IPromptableFlag);

// Handler receives array
handler: async (ctx) => {
  const features: string[] = ctx.args.features || ctx.promptAnswers?.features || [];
  console.log(`Installing: ${features.join(", ")}`);
};
```

## Pattern 8: Multiselect with Select All Toggle

Enable quick selection/deselection of all options:

```typescript
cli.addFlag({
  name: "modules",
  options: ["--modules", "-m"],
  type: "array",
  prompt: async () => ({
    type: "multiselect",
    message: "Select modules to install:",
    options: [
      { value: "auth", label: "Authentication", hint: "User login" },
      { value: "database", label: "Database", hint: "Data persistence" },
      { value: "api", label: "API", hint: "REST endpoints" },
      { value: "ui", label: "UI", hint: "User interface" },
      { value: "cache", label: "Cache", hint: "Redis caching" },
      { value: "queue", label: "Queue", hint: "Background jobs" },
    ],
  }),
} as IPromptableFlag);

// Use Space to toggle individual items, Enter to confirm
```

## Pattern 9: Default Value Fallback

Use flag's `defaultValue` as prompt's initial value automatically:

```typescript
cli.addFlag({
  name: "timeout",
  options: ["--timeout", "-t"],
  type: "number",
  defaultValue: 30, // Automatically used as initial in prompt
  prompt: async () => ({
    type: "text",
    message: "Enter timeout (seconds):",
    // No initial needed - uses defaultValue automatically
  }),
} as IPromptableFlag);

// Explicit initial overrides defaultValue
cli.addFlag({
  name: "retries",
  options: ["--retries", "-r"],
  type: "number",
  defaultValue: 3,
  prompt: async () => ({
    type: "text",
    message: "Enter retry count:",
    initial: 5, // This takes precedence over defaultValue
  }),
} as IPromptableFlag);

// Priority: config.initial > flag.defaultValue > undefined
```

## Pattern 10: Conditional Prompt Skipping

Skip prompts based on previous answers:

```typescript
// First prompt - ask if user wants to configure advanced options
cli.addFlag({
  name: "configureAdvanced",
  options: ["--configure-advanced"],
  type: "boolean",
  promptSequence: 1,
  prompt: async () => ({
    type: "confirm",
    message: "Would you like to configure advanced options?",
    initial: false,
  }),
} as IPromptableFlag);

// Second prompt - only shown if first answer was true
cli.addFlag({
  name: "advancedOptions",
  options: ["--advanced-options"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => ({
    type: "text",
    message: "Enter advanced options:",
    skip: !ctx.promptAnswers?.configureAdvanced, // Skip if false
  }),
} as IPromptableFlag);

// When skip is true, the prompt is not shown and no value is set
```

## Pattern 11: Subcommand with Mandatory Prompts

Force prompts for required fields:

```typescript
const initParser = new ArgParser({
  appName: "init",
  promptWhen: "missing", // Prompt if required flags missing
  handler: async (ctx) => {
    const name = ctx.args.name || ctx.promptAnswers?.name;
    console.log(`Initializing: ${name}`);
  },
});

initParser.addFlag({
  name: "name",
  options: ["--name", "-n"],
  type: "string",
  mandatory: true, // Required
  prompt: async () => ({
    type: "text",
    message: "Project name:",
    validate: (val) => /^[a-z0-9-]+$/.test(val) || "Use lowercase/numbers/hyphens",
  }),
} as IPromptableFlag);

const root = new ArgParser({ appName: "cli" });
root.addSubCommand({
  name: "init",
  parser: initParser,
  onCancel: () => console.log("Cancelled"),
});

// Usage:
// cli init --name my-project    # No prompts
// cli init                      # Prompts for --name (missing)
```

## Pattern 12: Context-Aware Pre-Configuration

Use CLI flags to "pre-configure" interactive prompts, skipping questions already answered and refining choices based on context:

```typescript
const cli = new ArgParser({
  appName: "installer",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    const scope = ctx.args.global ? "global" : "local";
    console.log(`Installing ${scope}ly...`);
  },
});

// Scope selection - can be pre-configured via --global or --local
cli.addFlag({
  name: "global",
  options: ["--global", "-g"],
  type: "boolean",
  prompt: async (ctx) => ({
    type: "confirm",
    message: "Install globally?",
    initial: false,
    // Skip if user already specified --global or --local
    skip: ctx.args.global || ctx.args.local,
  }),
} as IPromptableFlag);

// Dynamic options based on scope
cli.addFlag({
  name: "packageManager",
  options: ["--package-manager", "-p"],
  type: "string",
  prompt: async (ctx) => {
    // Check if scope was pre-configured
    const isGlobal = ctx.args.global || ctx.promptAnswers?.global;

    // Refine options based on scope
    const options = isGlobal
      ? ["npm", "yarn", "pnpm"] // Global supports fewer managers
      : ["npm", "yarn", "pnpm", "bun"]; // Local supports all

    return {
      type: "select",
      message: "Package manager:",
      options,
      initial: ctx.args.packageManager, // Use CLI flag as default
    };
  },
} as IPromptableFlag);

// Scope-conditional prompt
cli.addFlag({
  name: "addToPath",
  options: ["--add-to-path"],
  type: "boolean",
  prompt: async (ctx) => ({
    type: "confirm",
    message: "Add to PATH?",
    initial: true,
    skip: !ctx.args.global, // Only ask for global installs
  }),
} as IPromptableFlag);

// Usage:
// installer --interactive                    # Asks all questions
// installer --global --interactive           # Skips scope, refines package managers
// installer --local -p npm --interactive     # Pre-configures scope and package manager
// installer --global -p npm -d /usr/local    # Fully programmatic, no prompts
```

**Key techniques:**

- Check `ctx.args` to see if flag was provided via CLI
- Use `skip` to avoid questions already answered
- Use `initial` to pre-select values from flags
- Dynamically generate `options` based on context
- Combine with `promptWhen: "missing"` for hybrid behavior
