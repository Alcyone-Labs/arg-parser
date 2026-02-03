/**
 * Interactive Prompts Examples
 *
 * This file demonstrates how to use the interactive prompts feature
 * with @clack/prompts integration in @alcyone-labs/arg-parser.
 *
 * The interactive prompts feature allows you to create CLI tools that work
 * both programmatically (via flags) and interactively (via prompts).
 */

import { ArgParser } from "../src/core/ArgParser";
import type { IPromptableFlag, IHandlerContext } from "../src/core/types";

// ============================================================================
// Example 1: Basic Interactive Command
// ============================================================================

/**
 * A simple CLI with interactive mode for collecting user information.
 *
 * Usage:
 *   # Programmatic (flags only)
 *   node interactive-prompts-examples.ts greet --name "Alice" --project web
 *
 *   # Interactive mode
 *   node interactive-prompts-examples.ts greet --interactive
 *   # ? What is your name? Alice
 *   # ? Select project type: (use arrow keys)
 *   #   Web Application (React/Vue/Angular)
 *   #   API Server (REST/GraphQL)
 *   # ❯ CLI Tool (Node.js/Bun)
 */
function createBasicInteractiveCLI() {
  const cli = new ArgParser({
    appName: "my-cli",
    promptWhen: "interactive-flag",
    handler: async (ctx: IHandlerContext) => {
      if (ctx.isInteractive) {
        console.log("Interactive mode activated!");
        console.log("Prompt answers:", ctx.promptAnswers);
      }

      const name = ctx.args["name"] || ctx.promptAnswers?.["name"];
      const project = ctx.args["project"] || ctx.promptAnswers?.["project"];

      console.log(`Hello ${name}!`);
      console.log(`Creating ${project} project...`);
    },
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
  } as IPromptableFlag);

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
  } as IPromptableFlag);

  return cli;
}

// ============================================================================
// Example 2: Dynamic Options Based on Previous Answers
// ============================================================================

/**
 * A deployment CLI where subsequent prompts depend on previous answers.
 *
 * Usage:
 *   node interactive-prompts-examples.ts deploy --interactive
 *   # ? Select environment: (use arrow keys)
 *   #   staging
 *   # ❯ production
 *   # ? Select version for production: (use arrow keys)
 *   #   1.0.0 (deployed 2 days ago)
 *   #   1.1.0 (deployed yesterday)
 *   # ❯ 1.2.0 (deployed today)
 *   # ? Deploy 1.2.0 to production? (y/N)
 */
function createDeploymentCLI() {
  const deployParser = new ArgParser({
    appName: "deploy",
    promptWhen: "always", // Always prompt when this subcommand runs (triggered by parent)
    handler: async (ctx: IHandlerContext) => {
      const env = ctx.args["environment"] || ctx.promptAnswers?.["environment"];
      const version = ctx.args["version"] || ctx.promptAnswers?.["version"];

      console.log(`Deploying ${version} to ${env}...`);
      // Deployment logic here
    },
  });

  // Environment selection (first prompt)
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
  } as IPromptableFlag);

  // Version selection (second prompt) - dynamic based on environment
  deployParser.addFlag({
    name: "version",
    options: ["--version", "-v"],
    type: "string",
    promptSequence: 2,
    prompt: async (ctx: IHandlerContext) => {
      const env = ctx.promptAnswers?.["environment"];

      // In real app, fetch from API based on selected environment
      const versions = await fetchVersions(env);

      return {
        type: "select",
        message: `Select version for ${env}:`,
        options: versions.map((v: any) => ({
          label: v.name,
          value: v.id,
          hint: v.deployedAt,
        })),
      };
    },
  } as IPromptableFlag);

  // Confirmation (third prompt)
  deployParser.addFlag({
    name: "force",
    options: ["--force", "-f"],
    type: "boolean",
    promptSequence: 3,
    prompt: async (ctx: IHandlerContext) => ({
      type: "confirm",
      message: `Deploy ${ctx.promptAnswers?.version} to ${ctx.promptAnswers?.environment}?`,
      initial: false,
    }),
  } as IPromptableFlag);

  // Create root CLI with subcommand
  const cli = new ArgParser({
    appName: "deploy-tool",
  });

  // Add --interactive flag to root CLI (needed for master example runner)
  cli.addFlag({
    name: "interactive",
    options: ["--interactive", "-i"],
    type: "boolean",
    flagOnly: true,
    description: "Run in interactive mode",
  });

  cli.addSubCommand({
    name: "deploy",
    description: "Deploy the application",
    // Note: promptWhen is not inherited from subcommand config
    // The deployParser has its own promptWhen setting
    parser: deployParser,
    onCancel: () => console.log("Deployment cancelled by user"),
  });

  return cli;
}

// Mock function for fetching versions
async function fetchVersions(environment: string): Promise<any[]> {
  // In real app, this would fetch from an API
  const versions: Record<string, any[]> = {
    staging: [
      { id: "2.0.0-beta", name: "2.0.0-beta", deployedAt: "today" },
      { id: "1.9.0", name: "1.9.0", deployedAt: "yesterday" },
    ],
    production: [
      { id: "1.2.0", name: "1.2.0", deployedAt: "today" },
      { id: "1.1.0", name: "1.1.0", deployedAt: "yesterday" },
      { id: "1.0.0", name: "1.0.0", deployedAt: "2 days ago" },
    ],
  };

  return versions[environment] || versions.production;
}

// ============================================================================
// Example 3: Subcommand with 'missing' Trigger
// ============================================================================

/**
 * A git-helper CLI that prompts only when required values are missing.
 *
 * Usage:
 *   # Provide all args - no prompts
 *   node interactive-prompts-examples.ts init --name my-repo --visibility public
 *
 *   # Missing --name - triggers prompt
 *   node interactive-prompts-examples.ts init --visibility public
 *   # ? Repository name: my-repo
 *   # ? Visibility: (use arrow keys)
 *   #   Public
 *   # ❯ Private
 */
function createGitHelperCLI() {
  const cli = new ArgParser({
    appName: "git-helper",
  });

  const initParser = new ArgParser({
    appName: "init",
    handler: async (ctx: IHandlerContext) => {
      const name = ctx.args["name"] || ctx.promptAnswers?.["name"];
      const visibility = ctx.args["visibility"] || ctx.promptAnswers?.["visibility"];

      console.log(`Initializing repo: ${name}`);
      console.log(`Visibility: ${visibility}`);
      // Repository initialization logic here
    },
  });

  // Required field with validation
  initParser.addFlag({
    name: "name",
    options: ["--name", "-n"],
    type: "string",
    mandatory: true,
    prompt: async () => ({
      type: "text",
      message: "Repository name:",
      validate: (val) => /^[a-z0-9-]+$/.test(val) || "Use lowercase, numbers, and hyphens",
    }),
  } as IPromptableFlag);

  // Optional field with default
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
  } as IPromptableFlag);

  // Add --interactive flag to root CLI (needed for master example runner)
  cli.addFlag({
    name: "interactive",
    options: ["--interactive", "-i"],
    type: "boolean",
    flagOnly: true,
    description: "Run in interactive mode",
  });

  cli.addSubCommand({
    name: "init",
    description: "Initialize a repository",
    promptWhen: "missing",
    parser: initParser,
    onCancel: () => console.log("Initialization cancelled"),
  });

  return cli;
}

// ============================================================================
// Example 4: Password Prompt with Validation
// ============================================================================
// Example 4: Password Prompt with Validation
// ============================================================================

/**
 * A CLI for setting up database credentials with password confirmation.
 */
function createDatabaseSetupCLI() {
  const cli = new ArgParser({
    appName: "db-setup",
    promptWhen: "interactive-flag",
    handler: async (ctx: IHandlerContext) => {
      const host = ctx.args.host || ctx.promptAnswers?.host;
      const user = ctx.args.user || ctx.promptAnswers?.user;

      console.log(`Configuring database at ${host}...`);
      console.log(`User: ${user}`);
      // Database setup logic here (password is available in ctx.promptAnswers)
    },
  });

  cli.addFlag({
    name: "interactive",
    options: ["--interactive", "-i"],
    type: "boolean",
    flagOnly: true,
    description: "Run in interactive mode",
  });

  cli.addFlag({
    name: "host",
    options: ["--host", "-h"],
    type: "string",
    description: "Database host",
    prompt: async () => ({
      type: "text",
      message: "Database host:",
      placeholder: "localhost",
      initial: "localhost",
    }),
  } as IPromptableFlag);

  cli.addFlag({
    name: "user",
    options: ["--user", "-u"],
    type: "string",
    description: "Database user",
    prompt: async () => ({
      type: "text",
      message: "Database user:",
      placeholder: "admin",
      validate: (val) => val.length > 0 || "User is required",
    }),
  } as IPromptableFlag);

  cli.addFlag({
    name: "password",
    options: ["--password", "-p"],
    type: "string",
    description: "Database password",
    prompt: async () => ({
      type: "password",
      message: "Database password:",
    }),
  } as IPromptableFlag);

  return cli;
}

// ============================================================================
// Example 5: Multi-select with Dynamic Loading
// ============================================================================

/**
 * A CLI for selecting features to install with multiselect prompt.
 */
function createFeatureInstallerCLI() {
  const cli = new ArgParser({
    appName: "feature-installer",
    promptWhen: "interactive-flag",
    handler: async (ctx: IHandlerContext) => {
      const features = ctx.args["features"] || ctx.promptAnswers?.["features"];

      if (Array.isArray(features) && features.length > 0) {
        console.log(`Installing features: ${features.join(", ")}`);
        // Feature installation logic here
      } else {
        console.log("No features selected");
      }
    },
  });

  cli.addFlag({
    name: "interactive",
    options: ["--interactive", "-i"],
    type: "boolean",
    flagOnly: true,
    description: "Run in interactive mode",
  });

  cli.addFlag({
    name: "features",
    options: ["--features", "-f"],
    type: "array",
    description: "Features to install",
    prompt: async () => ({
      type: "multiselect",
      message: "Select features to install:",
      options: [
        { value: "typescript", label: "TypeScript", hint: "Type safety" },
        { value: "eslint", label: "ESLint", hint: "Code linting" },
        { value: "prettier", label: "Prettier", hint: "Code formatting" },
        { value: "jest", label: "Jest", hint: "Testing framework" },
        { value: "husky", label: "Husky", hint: "Git hooks" },
      ],
      maxItems: 5,
    }),
  } as IPromptableFlag);

  return cli;
}

// ============================================================================
// Master Example - Interactive Demo Runner
// ============================================================================

/**
 * Creates the master example CLI that demonstrates all interactive prompt features
 * and allows users to run any example interactively.
 */
function createMasterExampleCLI() {
  const cli = new ArgParser({
    appName: "interactive-prompts-master",
    promptWhen: "interactive-flag",
    description: "Interactive prompts master example - run any example interactively",
    handler: async (ctx: IHandlerContext) => {
      // Show instructions if --instructions flag is passed
      if (ctx.args.instructions) {
        showInstructions();
        return;
      }

      // If we have a selected example from interactive mode, run it
      if (ctx.isInteractive && ctx.promptAnswers?.example) {
        const exampleName = ctx.promptAnswers.example;
        console.log(`\n🚀 Running example: ${exampleName}\n`);

        switch (exampleName) {
          case "basic":
            await runExample("basic", createBasicInteractiveCLI, ctx.promptAnswers);
            break;
          case "deployment":
            await runExample("deployment", createDeploymentCLI, ctx.promptAnswers);
            break;
          case "git":
            await runExample("git", createGitHelperCLI, ctx.promptAnswers);
            break;
          case "database":
            await runExample("database", createDatabaseSetupCLI, ctx.promptAnswers);
            break;
          case "features":
            await runExample("features", createFeatureInstallerCLI, ctx.promptAnswers);
            break;
          default:
            console.log("Unknown example selected");
        }
        return;
      }

      // Default: show help
      console.log(ctx.parser.helpText());
      console.log("\n💡 Tip: Run with --interactive to try the examples!");
    },
  });

  // --instructions flag - show usage instructions (non-interactive)
  cli.addFlag({
    name: "instructions",
    options: ["--instructions"],
    type: "boolean",
    flagOnly: true,
    description: "Show usage instructions",
  });

  // --interactive flag - trigger interactive mode
  cli.addFlag({
    name: "interactive",
    options: ["--interactive", "-i"],
    type: "boolean",
    flagOnly: true,
    description: "Run in interactive mode to select and run examples",
  });

  // Example selector prompt
  cli.addFlag({
    name: "example",
    options: ["--example", "-e"],
    type: "string",
    description: "Which example to run",
    prompt: async () => ({
      type: "select",
      message: "Which example would you like to run?",
      options: [
        {
          value: "basic",
          label: "Basic Greeting CLI",
          hint: "Simple name/project prompts",
        },
        {
          value: "deployment",
          label: "Deployment CLI",
          hint: "Dynamic options based on previous answers",
        },
        {
          value: "git",
          label: "Git Helper CLI",
          hint: "Git init with 'missing' trigger",
        },
        {
          value: "database",
          label: "Database Setup CLI",
          hint: "Password prompts with validation",
        },
        {
          value: "features",
          label: "Feature Installer CLI",
          hint: "Multiselect for feature selection",
        },
      ],
    }),
  } as IPromptableFlag);

  return cli;
}

/**
 * Shows usage instructions
 */
function showInstructions() {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     Interactive Prompts - Master Example                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("This CLI demonstrates the interactive prompts feature of");
  console.log("@alcyone-labs/arg-parser with @clack/prompts integration.");
  console.log("");
  console.log("USAGE:");
  console.log("  bun examples/interactive-prompts-examples.ts [options]");
  console.log("");
  console.log("OPTIONS:");
  console.log("  --instructions     Show this help message");
  console.log("  --interactive, -i  Run in interactive mode to select examples");
  console.log("");
  console.log("INTERACTIVE MODE:");
  console.log("  When you run with --interactive, you'll see a menu of examples");
  console.log("  to choose from. Select one to run it immediately!");
  console.log("");
  console.log("AVAILABLE EXAMPLES:");
  console.log("  1. Basic Greeting CLI");
  console.log("     • Text input with validation");
  console.log("     • Select from predefined options");
  console.log("     • Basic interactive flow");
  console.log("");
  console.log("  2. Deployment CLI");
  console.log("     • Sequential prompts with dependencies");
  console.log("     • Dynamic options based on previous answers");
  console.log("     • Environment → Version → Confirmation flow");
  console.log("");
  console.log("  3. Git Helper CLI");
  console.log("     • 'missing' trigger mode");
  console.log("     • Automatic prompting when required flags missing");
  console.log("     • Input validation with regex");
  console.log("");
  console.log("  4. Database Setup CLI");
  console.log("     • Password prompt type (hidden input)");
  console.log("     • Initial/default values");
  console.log("     • Form-like sequential prompts");
  console.log("");
  console.log("  5. Feature Installer CLI");
  console.log("     • Multiselect prompt type");
  console.log("     • Multiple selections with hints");
  console.log("     • Array value handling");
  console.log("");
  console.log("PROGRAMMATIC USAGE:");
  console.log("  You can also import individual example creators:");
  console.log("");
  console.log("    import { createBasicInteractiveCLI } from './interactive-prompts-examples';");
  console.log("    const cli = createBasicInteractiveCLI();");
  console.log("    await cli.parse(['--interactive']);");
  console.log("");
}

/**
 * Helper to run an example with mock args
 */
async function runExample(
  exampleName: string,
  exampleFactory: () => ArgParser,
  selectedAnswers: Record<string, any>,
) {
  const exampleCLI = exampleFactory();

  // Build args based on the example type
  // Some examples have subcommands that need to be included
  const args: string[] = [];

  // Add interactive flag FIRST (before subcommand, so root parser processes it)
  args.push("--interactive");

  // Add subcommand for examples that have them
  switch (exampleName) {
    case "deployment":
      args.push("deploy");
      break;
    case "git":
      args.push("init");
      break;
  }

  try {
    await exampleCLI.parse(args);
  } catch (error) {
    // Examples may exit or throw - that's expected
    console.log("\n✅ Example completed!");
  }
}

// ============================================================================
// Main Export
// ============================================================================

export {
  createBasicInteractiveCLI,
  createDeploymentCLI,
  createGitHelperCLI,
  createDatabaseSetupCLI,
  createFeatureInstallerCLI,
  createMasterExampleCLI,
};

// ============================================================================
// Entry Point - Run Master Example
// ============================================================================

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const masterCLI = createMasterExampleCLI();
  await masterCLI.parse();
}
