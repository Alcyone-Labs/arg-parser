# Working with Subcommands

## Overview

Subcommands (also called nested commands) allow you to create hierarchical CLI structures like `git commit`, `docker run`, or `npm install`. This guide covers creating, organizing, and managing subcommands in ArgParser.

**Prerequisites:**
- Understanding of basic ArgParser usage
- Familiarity with CLI command structures

**Learning Outcomes:**
After reading this guide, you will be able to:
- Create hierarchical CLI structures with subcommands
- Implement flag inheritance between commands
- Manage command handlers and contexts
- Build complex CLI applications like Git or Docker

---

## Quickstart

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

// Create subcommand parsers
const addParser = new ArgParser({
  appName: 'add',
  handler: async (ctx) => {
    console.log(`Adding files: ${ctx.args.files.join(', ')}`);
    return { added: ctx.args.files };
  }
}).addFlag({
  name: 'files',
  options: ['-f', '--file'],
  type: 'string',
  allowMultiple: true,
  mandatory: true,
  description: 'Files to add'
});

const commitParser = new ArgParser({
  appName: 'commit',
  handler: async (ctx) => {
    console.log(`Committing with message: ${ctx.args.message}`);
    return { committed: true, message: ctx.args.message };
  }
}).addFlag({
  name: 'message',
  options: ['-m', '--message'],
  type: 'string',
  mandatory: true,
  description: 'Commit message'
});

// Create main CLI with subcommands
const git = new ArgParser({
  appName: 'git-like',
  description: 'A Git-like CLI'
});

git
  .addSubCommand({
    name: 'add',
    description: 'Add files to staging',
    parser: addParser
  })
  .addSubCommand({
    name: 'commit',
    description: 'Commit staged changes',
    parser: commitParser
  });

await git.parse();
```

**Expected Output:**
```bash
$ node git.js add -f file1.txt -f file2.txt
Adding files: file1.txt, file2.txt

$ node git.js commit -m "Initial commit"
Committing with message: Initial commit
```

---

## Deep Dive

### 1. Understanding Subcommand Architecture

Subcommands in ArgParser follow a hierarchical pattern:

```
Root Parser (git)
├── Subcommand (add)
│   └── Own flags and handler
├── Subcommand (commit)
│   └── Own flags and handler
└── Subcommand (push)
    └── Own flags and handler
```

**Key Concepts:**
- Each subcommand is a complete `ArgParser` instance
- Subcommands have their own flags, handlers, and configuration
- The root parser acts as a command dispatcher
- Commands can be nested multiple levels deep

### 2. Creating Subcommands

#### Basic Subcommand

```typescript
// 1. Create the subcommand parser
const deployParser = new ArgParser({
  appName: 'deploy',
  description: 'Deploy the application',
  handler: async (ctx) => {
    console.log(`Deploying to ${ctx.args.environment}...`);
    return { deployed: true };
  }
});

// 2. Add flags to subcommand
deployParser.addFlag({
  name: 'environment',
  options: ['-e', '--env'],
  type: 'string',
  mandatory: true,
  enum: ['staging', 'production'],
  description: 'Target environment'
});

// 3. Create root parser and add subcommand
const cli = new ArgParser({
  appName: 'my-cli',
  description: 'My CLI tool'
});

cli.addSubCommand({
  name: 'deploy',
  description: 'Deploy the application',
  parser: deployParser
});
```

#### Subcommand with Handler Override

You can override the parser's handler at the subcommand level:

```typescript
const statusParser = new ArgParser({
  appName: 'status',
  // Default handler
  handler: async () => ({ status: 'unknown' })
});

cli.addSubCommand({
  name: 'status',
  description: 'Show status',
  parser: statusParser,
  // Override handler
  handler: async (ctx) => {
    console.log('Repository status: clean');
    return { status: 'clean' };
  }
});
```

### 3. Nested Subcommands (Multi-Level)

Create deeply nested command structures:

```typescript
// Level 3: remote add
const remoteAddParser = new ArgParser({
  appName: 'remote-add',
  handler: async (ctx) => {
    console.log(`Adding remote ${ctx.args.name} at ${ctx.args.url}`);
    return { added: true };
  }
}).addFlag({
  name: 'name',
  options: ['--name'],
  type: 'string',
  mandatory: true,
  positional: 1
}).addFlag({
  name: 'url',
  options: ['--url'],
  type: 'string',
  mandatory: true,
  positional: 2
});

// Level 3: remote remove
const remoteRemoveParser = new ArgParser({
  appName: 'remote-remove',
  handler: async (ctx) => {
    console.log(`Removing remote ${ctx.args.name}`);
    return { removed: true };
  }
}).addFlag({
  name: 'name',
  options: ['--name'],
  type: 'string',
  mandatory: true,
  positional: 1
});

// Level 2: remote
const remoteParser = new ArgParser({
  appName: 'remote'
});

remoteParser
  .addSubCommand({
    name: 'add',
    description: 'Add a remote',
    parser: remoteAddParser
  })
  .addSubCommand({
    name: 'remove',
    description: 'Remove a remote',
    parser: remoteRemoveParser
  });

// Level 1: root
const git = new ArgParser({
  appName: 'git'
});

git.addSubCommand({
  name: 'remote',
  description: 'Manage remotes',
  parser: remoteParser
});

// Usage: git remote add origin https://github.com/user/repo.git
```

### 4. Flag Inheritance

Share flags between parent and child commands:

#### No Inheritance (Default)

```typescript
const root = new ArgParser()
  .addFlag({ name: 'verbose', options: ['-v'], type: 'boolean' });

const child = new ArgParser();  // No inheritance

root.addSubCommand({ name: 'child', parser: child });

// Usage: root -v child           ❌ verbose not available in child
```

#### Direct Parent Inheritance

```typescript
import { ArgParser, FlagInheritance } from '@alcyone-labs/arg-parser';

const root = new ArgParser()
  .addFlag({ name: 'verbose', options: ['-v'], type: 'boolean' });

const child = new ArgParser({
  inheritParentFlags: FlagInheritance.DirectParentOnly
});

root.addSubCommand({ name: 'child', parser: child });

// Usage: root -v child           ❌ Can't use flags on root
// Usage: root child -v           ✅ Works!
```

**Important:** With `DirectParentOnly`, child inherits flags from immediate parent only:

```typescript
const root = new ArgParser()
  .addFlag({ name: 'root-flag', options: ['--root'], type: 'boolean' });

const mid = new ArgParser({ inheritParentFlags: true })
  .addFlag({ name: 'mid-flag', options: ['--mid'], type: 'boolean' });

const leaf = new ArgParser({ inheritParentFlags: true });

root.addSubCommand({ name: 'mid', parser: mid });
mid.addSubCommand({ name: 'leaf', parser: leaf });

// leaf inherits: mid-flag (from mid)
// leaf does NOT inherit: root-flag (snapshot behavior)
```

#### Full Chain Inheritance

Use `AllParents` for complete inheritance chains:

```typescript
const root = new ArgParser()
  .addFlag({ name: 'verbose', options: ['-v'], type: 'boolean' });

const mid = new ArgParser({
  inheritParentFlags: FlagInheritance.AllParents
});

const leaf = new ArgParser({
  inheritParentFlags: FlagInheritance.AllParents
});

root.addSubCommand({ name: 'mid', parser: mid });
mid.addSubCommand({ name: 'leaf', parser: leaf });

// leaf inherits: verbose (from root through mid)
```

**Edge Case:** Order of attachment doesn't matter with `AllParents`:

```typescript
// Can attach in any order
mid.addSubCommand({ name: 'leaf', parser: leaf });
root.addSubCommand({ name: 'mid', parser: mid });

// leaf still inherits from root
```

### 5. Command Context

Access parent context from subcommands:

```typescript
const root = new ArgParser({
  appName: 'root',
  handler: async (ctx) => {
    console.log('Root args:', ctx.args);
    console.log('Command chain:', ctx.commandChain);
    return {};
  }
}).addFlag({
  name: 'global',
  options: ['-g', '--global'],
  type: 'string',
  description: 'Global setting'
});

const child = new ArgParser({
  appName: 'child',
  handler: async (ctx) => {
    console.log('Child args:', ctx.args);
    console.log('Parent args:', ctx.parentArgs);
    console.log('Command chain:', ctx.commandChain);
    console.log('Root path:', ctx.rootPath);
    return {};
  }
}).addFlag({
  name: 'local',
  options: ['-l', '--local'],
  type: 'string'
});

root.addSubCommand({ name: 'child', parser: child });

// Usage: cli --global setting child --local value
// ctx.commandChain = ['child']
// ctx.parentArgs = { global: 'setting' }
```

**Context Properties:**
- `args` - Current command arguments
- `parentArgs` - Parent command arguments
- `commandChain` - Array of command names
- `parser` - Current parser instance
- `parentParser` - Parent parser instance
- `rootPath` - Original working directory

### 6. Container Commands

Create commands that only show help (no direct functionality):

```typescript
const containerParser = new ArgParser({
  appName: 'remote',
  description: 'Manage set of tracked repositories',
  // No handler = container command
});

containerParser.addSubCommand({
  name: 'add',
  description: 'Add a remote',
  parser: addParser
});

containerParser.addSubCommand({
  name: 'remove',
  description: 'Remove a remote',
  parser: removeParser
});

// Usage: cli remote           → Shows help for remote commands
// Usage: cli remote add ...   → Executes add subcommand
```

### 7. Subcommand Help

Each subcommand has its own help text:

```typescript
// Shows root help
$ cli --help

// Shows specific subcommand help
$ cli deploy --help

// Shows nested subcommand help
$ cli remote add --help
```

---

## Examples

### Example 1: Git-like CLI

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

// Status command
const statusParser = new ArgParser({
  appName: 'status',
  description: 'Show working tree status',
  handler: async () => {
    console.log('On branch main');
    console.log('Your branch is up to date with origin/main.');
    console.log('nothing to commit, working tree clean');
    return { status: 'clean' };
  }
}).addFlag({
  name: 'short',
  options: ['-s', '--short'],
  type: 'boolean',
  flagOnly: true,
  description: 'Give the output in the short-format'
});

// Add command
const addParser = new ArgParser({
  appName: 'add',
  description: 'Add file contents to the index',
  handler: async (ctx) => {
    const files = ctx.args.files || ctx.args.all ? ['all files'] : [];
    console.log(`Adding ${files.join(', ')} to staging area`);
    return { added: files };
  }
}).addFlag({
  name: 'files',
  options: ['-f', '--file'],
  type: 'string',
  allowMultiple: true,
  positional: 1,
  description: 'Files to add'
}).addFlag({
  name: 'all',
  options: ['-A', '--all'],
  type: 'boolean',
  flagOnly: true,
  description: 'Add all changes'
});

// Commit command
const commitParser = new ArgParser({
  appName: 'commit',
  description: 'Record changes to the repository',
  handler: async (ctx) => {
    console.log(`[main ${'a1b2c3d'}] ${ctx.args.message}`);
    if (ctx.args.files) {
      console.log(`${ctx.args.files.length} files changed`);
    }
    return { committed: true, hash: 'a1b2c3d' };
  }
}).addFlag({
  name: 'message',
  options: ['-m', '--message'],
  type: 'string',
  mandatory: true,
  description: 'Commit message'
}).addFlag({
  name: 'amend',
  options: ['--amend'],
  type: 'boolean',
  flagOnly: true,
  description: 'Amend previous commit'
});

// Push command
const pushParser = new ArgParser({
  appName: 'push',
  description: 'Update remote refs along with associated objects',
  handler: async (ctx) => {
    const remote = ctx.args.remote || 'origin';
    const branch = ctx.args.branch || 'main';
    console.log(`Pushing to ${remote} ${branch}`);
    return { pushed: true, remote, branch };
  }
}).addFlag({
  name: 'remote',
  options: ['--remote'],
  type: 'string',
  positional: 1,
  description: 'Remote name'
}).addFlag({
  name: 'branch',
  options: ['--branch'],
  type: 'string',
  positional: 2,
  description: 'Branch name'
}).addFlag({
  name: 'force',
  options: ['-f', '--force'],
  type: 'boolean',
  flagOnly: true,
  description: 'Force push'
});

// Root CLI
const git = new ArgParser({
  appName: 'git',
  description: 'The stupid content tracker'
});

git
  .addSubCommand({
    name: 'status',
    description: 'Show working tree status',
    parser: statusParser
  })
  .addSubCommand({
    name: 'add',
    description: 'Add file contents to the index',
    parser: addParser
  })
  .addSubCommand({
    name: 'commit',
    description: 'Record changes to the repository',
    parser: commitParser
  })
  .addSubCommand({
    name: 'push',
    description: 'Update remote refs',
    parser: pushParser
  });

await git.parse();
```

**Usage:**
```bash
$ node git.js status
On branch main
Your branch is up to date with origin/main.
nothing to commit, working tree clean

$ node git.js add -A
Adding all files to staging area

$ node git.js commit -m "Fix bug"
[main a1b2c3d] Fix bug

$ node git.js push origin main
Pushing to origin main
```

### Example 2: Docker-like CLI with Inheritance

```typescript
import { ArgParser, FlagInheritance } from '@alcyone-labs/arg-parser';

// Global flags that all commands inherit
const root = new ArgParser({
  appName: 'docker'
}).addFlag({
  name: 'verbose',
  options: ['-v', '--verbose'],
  type: 'boolean',
  flagOnly: true,
  description: 'Enable verbose output'
}).addFlag({
  name: 'host',
  options: ['-H', '--host'],
  type: 'string',
  description: 'Daemon socket to connect to'
});

// Container command
const containerParser = new ArgParser({
  appName: 'container',
  inheritParentFlags: FlagInheritance.AllParents
});

// Container ls (list)
const containerLsParser = new ArgParser({
  appName: 'container-ls',
  handler: async (ctx) => {
    if (ctx.args.verbose) {
      console.log('Connecting to:', ctx.args.host || 'default');
    }
    console.log('CONTAINER ID   IMAGE    STATUS');
    console.log('abc123         nginx    Up 2 hours');
    return { containers: 1 };
  },
  inheritParentFlags: FlagInheritance.AllParents
}).addFlag({
  name: 'all',
  options: ['-a', '--all'],
  type: 'boolean',
  flagOnly: true,
  description: 'Show all containers'
});

// Container run
const containerRunParser = new ArgParser({
  appName: 'container-run',
  handler: async (ctx) => {
    console.log(`Running ${ctx.args.image}`);
    if (ctx.args.detach) {
      console.log('Running in detached mode');
    }
    return { started: true };
  },
  inheritParentFlags: FlagInheritance.AllParents
}).addFlag({
  name: 'image',
  options: ['--image'],
  type: 'string',
  mandatory: true,
  positional: 1,
  description: 'Image to run'
}).addFlag({
  name: 'detach',
  options: ['-d', '--detach'],
  type: 'boolean',
  flagOnly: true,
  description: 'Run in background'
}).addFlag({
  name: 'port',
  options: ['-p', '--port'],
  type: 'string',
  allowMultiple: true,
  description: 'Port mapping'
});

containerParser
  .addSubCommand({
    name: 'ls',
    description: 'List containers',
    parser: containerLsParser
  })
  .addSubCommand({
    name: 'run',
    description: 'Run a container',
    parser: containerRunParser
  });

root.addSubCommand({
  name: 'container',
  description: 'Manage containers',
  parser: containerParser
});

await root.parse();
```

**Usage:**
```bash
# Inherits --verbose from root
$ node docker.js container ls -v
Connecting to: default
CONTAINER ID   IMAGE    STATUS
abc123         nginx    Up 2 hours

# Inherits both --verbose and --host
$ node docker.js -H tcp://remote:2375 container ls -v
Connecting to: tcp://remote:2375
CONTAINER ID   IMAGE    STATUS
abc123         nginx    Up 2 hours

# Container run with inherited flags
$ node docker.js -v container run -d -p 8080:80 nginx
Running nginx
Running in detached mode
```

### Example 3: Complex Multi-Level CLI

```typescript
import { ArgParser, FlagInheritance } from '@alcyone-labs/arg-parser';

// Level 1: Root
const aws = new ArgParser({
  appName: 'aws'
}).addFlag({
  name: 'profile',
  options: ['--profile'],
  type: 'string',
  description: 'AWS profile'
}).addFlag({
  name: 'region',
  options: ['--region'],
  type: 'string',
  description: 'AWS region'
});

// Level 2: S3
const s3 = new ArgParser({
  appName: 's3',
  inheritParentFlags: FlagInheritance.AllParents
});

// Level 3: S3 Commands
const s3Ls = new ArgParser({
  appName: 's3-ls',
  handler: async (ctx) => {
    const bucket = ctx.args.bucket || 'all-buckets';
    console.log(`Listing S3 bucket: ${bucket}`);
    console.log(`Region: ${ctx.args.region || 'us-east-1'}`);
    return { bucket };
  },
  inheritParentFlags: FlagInheritance.AllParents
}).addFlag({
  name: 'bucket',
  options: ['--bucket'],
  type: 'string',
  positional: 1,
  description: 'Bucket name'
}).addFlag({
  name: 'recursive',
  options: ['--recursive'],
  type: 'boolean',
  flagOnly: true,
  description: 'List recursively'
});

const s3Cp = new ArgParser({
  appName: 's3-cp',
  handler: async (ctx) => {
    console.log(`Copying ${ctx.args.source} to ${ctx.args.dest}`);
    console.log(`Profile: ${ctx.args.profile || 'default'}`);
    return { copied: true };
  },
  inheritParentFlags: FlagInheritance.AllParents
}).addFlag({
  name: 'source',
  options: ['--source'],
  type: 'string',
  mandatory: true,
  positional: 1,
  description: 'Source path'
}).addFlag({
  name: 'dest',
  options: ['--dest'],
  type: 'string',
  mandatory: true,
  positional: 2,
  description: 'Destination path'
}).addFlag({
  name: 'recursive',
  options: ['--recursive'],
  type: 'boolean',
  flagOnly: true,
  description: 'Copy recursively'
});

s3
  .addSubCommand({ name: 'ls', parser: s3Ls })
  .addSubCommand({ name: 'cp', parser: s3Cp });

// Level 2: EC2
const ec2 = new ArgParser({
  appName: 'ec2',
  inheritParentFlags: FlagInheritance.AllParents
});

const ec2Instances = new ArgParser({
  appName: 'ec2-instances',
  handler: async (ctx) => {
    console.log('Listing EC2 instances');
    console.log(`Region: ${ctx.args.region || 'us-east-1'}`);
    return { instances: [] };
  },
  inheritParentFlags: FlagInheritance.AllParents
});

ec2.addSubCommand({
  name: 'describe-instances',
  parser: ec2Instances
});

// Build hierarchy
aws
  .addSubCommand({ name: 's3', parser: s3 })
  .addSubCommand({ name: 'ec2', parser: ec2 });

await aws.parse();
```

**Usage:**
```bash
# S3 commands
$ node aws.js --region us-west-2 s3 ls my-bucket --recursive
Listing S3 bucket: my-bucket
Region: us-west-2

$ node aws.js --profile prod s3 cp ./file.txt s3://bucket/file.txt
Copying ./file.txt to s3://bucket/file.txt
Profile: prod

# EC2 commands
$ node aws.js --region eu-west-1 ec2 describe-instances
Listing EC2 instances
Region: eu-west-1
```

---

## References

### Internal Links

- [Core Package Guide](./index.md) - Main getting started guide
- [Flags Guide](./flags.md) - Detailed flag documentation
- [API Reference](./api-reference.md) - Complete API documentation
- [Flag Inheritance](../CORE_CONCEPTS.md) - Inheritance concepts

### External Links

- [Git Command Structure](https://git-scm.com/docs/git#_git_commands) - Real-world example
- [Docker CLI](https://docs.docker.com/engine/reference/commandline/cli/) - Complex CLI example

### Related Topics

- **Flags** - Define flags for subcommands
- **Interactive Prompts** - Add prompts to subcommands
- **System Flags** - Built-in flags like --help
- **Plugins** - Extend subcommand functionality

---

## Quality Gates

- [x] Template used correctly
- [x] All 5 mandatory sections present
- [x] Quickstart code is runnable
- [x] Examples have expected outputs
- [x] Internal links documented
- [x] External references vetted
