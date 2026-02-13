# ArgParser Core Package

## Overview

The `@alcyone-labs/arg-parser` core package provides a robust, type-safe CLI argument parser with a powerful plugin architecture. It supports flags, subcommands, interactive prompts, and comprehensive validation while maintaining a small bundle size (~50KB).

**Prerequisites:**
- Node.js 18+
- TypeScript 5.0+ (for TypeScript projects)
- Basic understanding of CLI application structure

**Learning Outcomes:**
After reading this guide, you will be able to:
- Create CLI applications with type-safe argument parsing
- Define and validate complex flag configurations
- Implement subcommands and hierarchical CLIs
- Use the plugin system to extend functionality
- Handle interactive prompts alongside CLI flags

---

## Quickstart

Install the package:

```bash
npm install @alcyone-labs/arg-parser
```

Create your first CLI:

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({
  appName: 'hello-cli',
  description: 'A simple greeting CLI',
  handler: async (ctx) => {
    const name = ctx.args.name;
    const greeting = ctx.args.greeting;
    console.log(`${greeting}, ${name}!`);
    return { success: true };
  }
});

parser.addFlag({
  name: 'name',
  options: ['-n', '--name'],
  type: 'string',
  mandatory: true,
  description: 'Name to greet'
});

parser.addFlag({
  name: 'greeting',
  options: ['-g', '--greeting'],
  type: 'string',
  defaultValue: 'Hello',
  description: 'Greeting message'
});

await parser.parse();
```

**Expected Output:**
```bash
$ node hello-cli.js --name World
Hello, World!

$ node hello-cli.js --name World --greeting Hi
Hi, World!
```

---

## Deep Dive

### 1. Understanding the ArgParser Architecture

ArgParser follows a declarative approach where you define your CLI structure upfront:

1. **Parser Instance**: Created with configuration options
2. **Flag Definitions**: Added via `addFlag()` or `addFlags()`
3. **Subcommands**: Optional hierarchy via `addSubCommand()`
4. **Handler**: Executed when the CLI runs
5. **Plugin System**: Extend functionality via `.use()`

### 2. Flag Configuration

Flags are the core of any CLI. ArgParser supports multiple types and validation:

**Basic Flag Types:**

```typescript
// String flag
parser.addFlag({
  name: 'config',
  options: ['-c', '--config'],
  type: 'string',
  description: 'Configuration file path'
});

// Number flag
parser.addFlag({
  name: 'port',
  options: ['-p', '--port'],
  type: 'number',
  defaultValue: 3000,
  description: 'Server port'
});

// Boolean flag (flag-only)
parser.addFlag({
  name: 'verbose',
  options: ['-v', '--verbose'],
  type: 'boolean',
  flagOnly: true,
  defaultValue: false,
  description: 'Enable verbose output'
});

// Array flag (multiple values)
parser.addFlag({
  name: 'tags',
  options: ['-t', '--tag'],
  type: 'string',
  allowMultiple: true,
  description: 'Tags to apply'
});
```

**Advanced Flag Features:**

```typescript
// Enum validation
parser.addFlag({
  name: 'env',
  options: ['-e', '--env'],
  type: 'string',
  mandatory: true,
  enum: ['dev', 'staging', 'production'],
  description: 'Environment'
});

// Conditional mandatory
parser.addFlag({
  name: 'apiKey',
  options: ['--api-key'],
  type: 'string',
  mandatory: (args) => args.env === 'production',
  description: 'API key (required in production)'
});

// Custom validation
parser.addFlag({
  name: 'email',
  options: ['--email'],
  type: 'string',
  validate: (value) => {
    if (!value.includes('@')) return 'Invalid email format';
    return true;
  },
  description: 'User email'
});
```

### 3. Subcommands and Hierarchies

Create complex CLI hierarchies with subcommands:

```typescript
// Subcommand parser
const deployParser = new ArgParser({
  appName: 'deploy',
  handler: async (ctx) => {
    console.log(`Deploying to ${ctx.args.env}...`);
    return { deployed: true };
  }
}).addFlag({
  name: 'env',
  options: ['-e', '--env'],
  type: 'string',
  mandatory: true,
  enum: ['staging', 'production'],
  description: 'Target environment'
});

// Main parser with subcommand
const cli = new ArgParser({
  appName: 'my-cli',
  description: 'My CLI tool'
}).addSubCommand({
  name: 'deploy',
  description: 'Deploy the application',
  parser: deployParser
});

// Usage: my-cli deploy --env production
```

### 4. The Plugin System

Extend ArgParser functionality through plugins:

```typescript
// Define a plugin
const loggingPlugin = {
  name: 'com.example.logging',
  version: '1.0.0',
  install(parser) {
    // Extend parser with new methods
    (parser as any).log = (message: string) => {
      console.log(`[LOG] ${message}`);
    };
    return parser;
  }
};

// Use the plugin
const cli = new ArgParser({...})
  .use(loggingPlugin);

// Access plugin functionality
(cli as any).log('Application started');
```

**Edge Cases:**

1. **Duplicate Plugin Names**: Attempting to install a plugin with the same name twice throws an error
2. **Plugin Order**: Plugins are applied in the order they are installed
3. **Plugin Return Value**: Plugins can return a modified parser or void

---

## Examples

### Example 1: Basic File Processor

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const processor = new ArgParser({
  appName: 'file-processor',
  description: 'Process files with various options',
  handler: async (ctx) => {
    const { input, output, verbose } = ctx.args;
    
    if (verbose) {
      console.log(`Processing ${input}...`);
    }
    
    // Processing logic here
    console.log(`Output written to ${output}`);
    
    return { processed: true, input, output };
  }
});

processor
  .addFlag({
    name: 'input',
    options: ['-i', '--input'],
    type: 'string',
    mandatory: true,
    description: 'Input file path'
  })
  .addFlag({
    name: 'output',
    options: ['-o', '--output'],
    type: 'string',
    mandatory: true,
    description: 'Output file path'
  })
  .addFlag({
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Enable verbose logging'
  });

await processor.parse();
```

**Usage:**
```bash
$ node processor.js --input data.csv --output result.json
Output written to result.json

$ node processor.js --input data.csv --output result.json --verbose
Processing data.csv...
Output written to result.json
```

### Example 2: Multi-Command Git-like CLI

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

// Status command
const statusParser = new ArgParser({
  appName: 'status',
  handler: async () => {
    console.log('On branch main');
    console.log('Your branch is up to date.');
    return { status: 'clean' };
  }
});

// Commit command
const commitParser = new ArgParser({
  appName: 'commit',
  handler: async (ctx) => {
    const { message } = ctx.args;
    console.log(`Created commit: ${message}`);
    return { committed: true, message };
  }
}).addFlag({
  name: 'message',
  options: ['-m', '--message'],
  type: 'string',
  mandatory: true,
  description: 'Commit message'
});

// Main CLI
const git = new ArgParser({
  appName: 'git-like',
  description: 'A git-like CLI example'
});

git
  .addSubCommand({
    name: 'status',
    description: 'Show working tree status',
    parser: statusParser
  })
  .addSubCommand({
    name: 'commit',
    description: 'Record changes',
    parser: commitParser
  });

await git.parse();
```

**Usage:**
```bash
$ node git.js status
On branch main
Your branch is up to date.

$ node git.js commit -m "Initial commit"
Created commit: Initial commit
```

### Example 3: Advanced Configuration with Environment Variables

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const dbCli = new ArgParser({
  appName: 'db-cli',
  description: 'Database management CLI',
  handler: async (ctx) => {
    const { host, port, username, password } = ctx.args;
    console.log(`Connecting to ${host}:${port} as ${username}`);
    // Database connection logic
    return { connected: true };
  }
});

dbCli
  .addFlag({
    name: 'host',
    options: ['-h', '--host'],
    type: 'string',
    defaultValue: 'localhost',
    env: 'DB_HOST',
    description: 'Database host'
  })
  .addFlag({
    name: 'port',
    options: ['-p', '--port'],
    type: 'number',
    defaultValue: 5432,
    env: 'DB_PORT',
    description: 'Database port'
  })
  .addFlag({
    name: 'username',
    options: ['-u', '--username'],
    type: 'string',
    mandatory: true,
    env: ['DB_USER', 'DB_USERNAME'],
    description: 'Database username'
  })
  .addFlag({
    name: 'password',
    options: ['--password'],
    type: 'string',
    mandatory: true,
    env: 'DB_PASSWORD',
    description: 'Database password'
  });

await dbCli.parse();
```

**Usage:**
```bash
# Using CLI flags
$ node db.js --username admin --password secret
Connecting to localhost:5432 as admin

# Using environment variables
$ export DB_USERNAME=admin
$ export DB_PASSWORD=secret
$ node db.js
Connecting to localhost:5432 as admin

# Mixing both (CLI flags take precedence)
$ export DB_HOST=prod.db.example.com
$ node db.js --username admin --password secret
Connecting to prod.db.example.com:5432 as admin
```

---

## References

### Internal Links

- [Migration Guide v2 → v3](./MIGRATION_V3.md) - Upgrade from v2.x to v3.0
- [Plugin Architecture](./specs/PLUGIN_ARCHITECTURE_PLAN.md) - Detailed plugin system documentation
- [Core Concepts](./CORE_CONCEPTS.md) - In-depth concept explanations
- [Interactive Prompts](./specs/INTERACTIVE_PROMPTS.md) - Interactive mode documentation

### External Links

- [npm package](https://www.npmjs.com/package/@alcyone-labs/arg-parser)
- [GitHub Repository](https://github.com/Alcyone-Labs/arg-parser)
- [Zod Documentation](https://zod.dev/) - For schema validation
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)

### API Reference

**Core Classes:**
- `ArgParser` - Main parser class
- `ArgParserError` - Error class for parser errors
- `FlagManager` - Internal flag management
- `PromptManager` - Interactive prompt handling

**Key Interfaces:**
- `IFlag` - Flag definition interface
- `IHandlerContext` - Handler context interface
- `ISubCommand` - Subcommand interface
- `IArgParserPlugin` - Plugin interface

---

## Quality Gates

- [x] Template used correctly
- [x] All 5 mandatory sections present
- [x] Quickstart code is runnable
- [x] Examples have expected outputs
- [x] Internal links documented
- [x] External references vetted
