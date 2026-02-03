# Interactive Prompts Patterns

## Pattern 1: Basic Interactive Mode

Simple CLI with explicit `--interactive` flag trigger.

```typescript
const cli = new ArgParser({
  appName: "my-cli",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    const name = ctx.args["name"] || ctx.promptAnswers?.["name"];
    console.log(`Hello ${name}!`);
  },
});

// Required: Add --interactive flag
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
});

// Promptable flag
cli.addFlag({
  name: "name",
  options: ["--name", "-n"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "What is your name?",
  }),
} as IPromptableFlag);

// Usage: node cli.ts --interactive
```

## Pattern 2: Missing Value Fallback

Automatically prompt when required values not provided.

```typescript
const cli = new ArgParser({
  appName: "config-cli",
  promptWhen: "missing",
  handler: async (ctx) => {
    const email = ctx.args["email"] || ctx.promptAnswers?.["email"];
    // email is guaranteed to be set
  },
});

cli.addFlag({
  name: "email",
  options: ["--email", "-e"],
  type: "string",
  mandatory: true,  // Required field
  prompt: async () => ({
    type: "text",
    message: "Email address:",
    validate: (val) => val.includes("@") || "Invalid email",
  }),
} as IPromptableFlag);

// Usage: node cli.ts (triggers prompt)
// Usage: node cli.ts --email user@example.com (no prompt)
```

## Pattern 3: Sequential Dependent Prompts

Prompts where subsequent options depend on previous answers.

```typescript
cli.addFlag({
  name: "region",
  options: ["--region"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Select region:",
    options: ["us-east-1", "us-west-2", "eu-west-1"],
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "availability-zone",
  options: ["--az"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => {
    // Access previous answer
    const region = ctx.promptAnswers?.["region"];
    const zones = await fetchAvailabilityZones(region);
    
    return {
      type: "select",
      message: `Select AZ in ${region}:`,
      options: zones,
    };
  },
} as IPromptableFlag);

// Prompts execute in sequence: region → az
```

## Pattern 4: Form Wizard

Multi-step form with validation at each step.

```typescript
const wizard = new ArgParser({
  appName: "setup-wizard",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    const answers = ctx.promptAnswers;
    console.log("Configuration:", answers);
  },
});

// Step 1: Project name
wizard.addFlag({
  name: "project-name",
  options: ["--name"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "text",
    message: "Project name:",
    validate: (val) => /^[a-z0-9-]+$/.test(val) 
      || "Use lowercase, numbers, and hyphens only",
  }),
} as IPromptableFlag);

// Step 2: Description
wizard.addFlag({
  name: "description",
  options: ["--desc"],
  type: "string",
  promptSequence: 2,
  prompt: async () => ({
    type: "text",
    message: "Description:",
    placeholder: "Brief project description",
  }),
} as IPromptableFlag);

// Step 3: Visibility
wizard.addFlag({
  name: "visibility",
  options: ["--visibility"],
  type: "string",
  promptSequence: 3,
  prompt: async () => ({
    type: "select",
    message: "Visibility:",
    options: [
      { label: "Public", value: "public" },
      { label: "Private", value: "private" },
      { label: "Internal", value: "internal" },
    ],
  }),
} as IPromptableFlag);

// Step 4: Confirm
wizard.addFlag({
  name: "confirm",
  options: ["--confirm"],
  type: "boolean",
  promptSequence: 4,
  prompt: async (ctx) => ({
    type: "confirm",
    message: `Create project "${ctx.promptAnswers?.["project-name"]}"?`,
    initial: true,
  }),
} as IPromptableFlag);
```

## Pattern 5: Conditional Prompts

Skip or modify prompts based on previous answers.

```typescript
cli.addFlag({
  name: "deployment-type",
  options: ["--type"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "select",
    message: "Deployment type:",
    options: ["standard", "blue-green", "canary"],
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "canary-percentage",
  options: ["--canary"],
  type: "number",
  promptSequence: 2,
  prompt: async (ctx) => {
    // Only show if canary selected
    if (ctx.promptAnswers?.["deployment-type"] !== "canary") {
      return null;  // Skip this prompt
    }
    
    return {
      type: "select",
      message: "Canary percentage:",
      options: ["5", "10", "25", "50"],
    };
  },
} as IPromptableFlag);
```

## Pattern 6: Multiselect Features

Select multiple items from a list.

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
      { value: "eslint", label: "ESLint", hint: "Code linting" },
      { value: "prettier", label: "Prettier", hint: "Formatting" },
      { value: "jest", label: "Jest", hint: "Testing" },
      { value: "husky", label: "Husky", hint: "Git hooks" },
    ],
    maxItems: 5,
  }),
} as IPromptableFlag);

// Result: ctx.promptAnswers?.features = ["typescript", "eslint", "jest"]
```

## Pattern 7: Password with Confirmation

Password input with confirmation step.

```typescript
cli.addFlag({
  name: "password",
  options: ["--password", "-p"],
  type: "string",
  promptSequence: 1,
  prompt: async () => ({
    type: "password",
    message: "Enter password:",
  }),
} as IPromptableFlag);

cli.addFlag({
  name: "confirm-password",
  options: ["--confirm-password"],
  type: "string",
  promptSequence: 2,
  prompt: async (ctx) => ({
    type: "password",
    message: "Confirm password:",
    validate: (val) => {
      const original = ctx.promptAnswers?.["password"];
      return val === original || "Passwords do not match";
    },
  }),
} as IPromptableFlag);
```

## Pattern 8: Subcommand with Prompts

Different prompts per subcommand.

```typescript
const deployParser = new ArgParser({
  appName: "deploy",
  promptWhen: "missing",
  handler: async (ctx) => {
    console.log("Deploying...");
  },
});

deployParser.addFlag({
  name: "environment",
  options: ["--env"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Environment:",
    options: ["staging", "production"],
  }),
} as IPromptableFlag);

const initParser = new ArgParser({
  appName: "init",
  promptWhen: "missing",
  handler: async (ctx) => {
    console.log("Initializing...");
  },
});

initParser.addFlag({
  name: "project-name",
  options: ["--name"],
  type: "string",
  prompt: async () => ({
    type: "text",
    message: "Project name:",
  }),
} as IPromptableFlag);

const cli = new ArgParser({ appName: "my-cli" });

cli.addSubCommand({
  name: "deploy",
  description: "Deploy application",
  parser: deployParser,
});

cli.addSubCommand({
  name: "init",
  description: "Initialize project",
  parser: initParser,
});

// Usage: my-cli deploy (prompts for environment)
// Usage: my-cli init (prompts for project name)
```

## Pattern 9: Graceful Degradation

Handle non-TTY environments.

```typescript
const cli = new ArgParser({
  appName: "setup",
  promptWhen: "missing",
  handler: async (ctx) => {
    if (!ctx.isInteractive && !ctx.args["email"]) {
      console.error("Error: --email is required in non-interactive mode");
      console.error("Usage: setup --email user@example.com");
      process.exit(1);
    }
    // Continue with interactive or flag-based value
  },
});
```

## Pattern 10: Dynamic Options Loading

Load options from API or filesystem.

```typescript
cli.addFlag({
  name: "template",
  options: ["--template", "-t"],
  type: "string",
  prompt: async () => {
    // Fetch from API
    const templates = await fetch("https://api.example.com/templates")
      .then(r => r.json());
    
    return {
      type: "select",
      message: "Select template:",
      options: templates.map(t => ({
        label: t.name,
        value: t.id,
        hint: t.description,
      })),
    };
  },
} as IPromptableFlag);
```
