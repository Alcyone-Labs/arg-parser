# Working with Flags

## Overview

Flags are the building blocks of any CLI application. This guide covers everything you need to know about defining, validating, and using flags in ArgParser, from basic string flags to advanced custom parsers.

**Prerequisites:**
- Basic understanding of CLI applications
- Familiarity with TypeScript/JavaScript

**Learning Outcomes:**
After reading this guide, you will be able to:
- Define flags of all types (string, number, boolean, array, object)
- Implement validation and constraints
- Use environment variable integration
- Create custom parser functions
- Handle complex flag scenarios

---

## Quickstart

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({
  appName: 'config-cli',
  handler: async (ctx) => {
    console.log('Config:', ctx.args);
    return ctx.args;
  }
});

// String flag
parser.addFlag({
  name: 'name',
  options: ['-n', '--name'],
  type: 'string',
  mandatory: true,
  description: 'Your name'
});

// Number flag with default
parser.addFlag({
  name: 'port',
  options: ['-p', '--port'],
  type: 'number',
  defaultValue: 3000,
  description: 'Server port'
});

// Boolean flag
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

await parser.parse();
```

**Expected Output:**
```bash
$ node config.js --name John --port 8080 -v -t admin -t user
Config: { name: 'John', port: 8080, verbose: true, tags: ['admin', 'user'] }
```

---

## Deep Dive

### 1. Flag Types

ArgParser supports multiple flag types to handle different kinds of input:

#### String Flags

The most common type, accepts any text value:

```typescript
parser.addFlag({
  name: 'config',
  options: ['-c', '--config'],
  type: 'string',
  description: 'Configuration file path'
});

// Usage: --config ./settings.json
// Result: './settings.json'
```

#### Number Flags

Automatically converts input to numbers:

```typescript
parser.addFlag({
  name: 'port',
  options: ['-p', '--port'],
  type: 'number',
  defaultValue: 3000,
  description: 'Server port number'
});

// Usage: --port 8080
// Result: 8080 (number, not string)
```

**Edge Case:** Non-numeric input throws a validation error

#### Boolean Flags

Flags that don't consume a value (presence = true):

```typescript
parser.addFlag({
  name: 'verbose',
  options: ['-v', '--verbose'],
  type: 'boolean',
  flagOnly: true,  // Important: doesn't consume value
  defaultValue: false,
  description: 'Enable verbose output'
});

// Usage: --verbose
// Result: true

// Usage: (not provided)
// Result: false (uses default)
```

**Important:** Always use `flagOnly: true` for boolean flags

#### Array Flags

Accept multiple values for the same flag:

```typescript
parser.addFlag({
  name: 'files',
  options: ['-f', '--file'],
  type: 'string',
  allowMultiple: true,
  description: 'Files to process'
});

// Usage: -f file1.txt -f file2.txt -f file3.txt
// Result: ['file1.txt', 'file2.txt', 'file3.txt']
```

### 2. Flag Validation

#### Enum Validation

Restrict input to specific values:

```typescript
parser.addFlag({
  name: 'env',
  options: ['-e', '--env'],
  type: 'string',
  mandatory: true,
  enum: ['development', 'staging', 'production'],
  description: 'Environment'
});

// Usage: --env production  ✅ Valid
// Usage: --env prod        ❌ Invalid - throws error
```

#### Custom Validation

Implement complex validation logic:

```typescript
parser.addFlag({
  name: 'email',
  options: ['--email'],
  type: 'string',
  mandatory: true,
  validate: (value) => {
    if (!value.includes('@')) {
      return 'Invalid email format - must contain @';
    }
    if (!value.includes('.')) {
      return 'Invalid email format - must contain domain';
    }
    return true;  // Validation passed
  },
  description: 'User email address'
});
```

**Validation Return Values:**
- `true` - Validation passed
- `string` - Validation failed, string is error message
- `void` - Validation passed (undefined return)

#### Conditional Mandatory

Make flags required based on other flag values:

```typescript
parser.addFlag({
  name: 'apiKey',
  options: ['--api-key'],
  type: 'string',
  mandatory: (args) => args.env === 'production',
  description: 'API key (required in production)'
});

parser.addFlag({
  name: 'env',
  options: ['--env'],
  type: 'string',
  defaultValue: 'development',
  enum: ['development', 'production']
});

// Usage: --env development          ✅ apiKey not required
// Usage: --env production           ❌ apiKey required - throws error
// Usage: --env production --api-key xxx  ✅ Valid
```

### 3. Default Values

Provide fallback values when flags aren't specified:

```typescript
parser.addFlag({
  name: 'port',
  options: ['-p', '--port'],
  type: 'number',
  defaultValue: 3000,
  description: 'Server port'
});

parser.addFlag({
  name: 'host',
  options: ['-h', '--host'],
  type: 'string',
  defaultValue: 'localhost',
  description: 'Server host'
});

// Usage: (no flags)
// Result: { port: 3000, host: 'localhost' }
```

### 4. Environment Variable Integration

Automatically map flags to environment variables:

```typescript
parser.addFlag({
  name: 'apiKey',
  options: ['--api-key'],
  type: 'string',
  env: 'API_KEY',  // Maps to process.env.API_KEY
  mandatory: true,
  description: 'API key'
});

// CLI flag takes precedence:
// Usage: --api-key cli-value
// Result: 'cli-value'

// Env var as fallback:
// Usage: (no flag, API_KEY=env-value)
// Result: 'env-value'
```

**Priority Order:** CLI Flag > Environment Variable > Default Value

**Multiple Environment Variables:**

```typescript
parser.addFlag({
  name: 'databaseUrl',
  options: ['--db-url'],
  type: 'string',
  env: ['DATABASE_URL', 'DB_URL', 'PG_URL'],  // Tries in order
  description: 'Database connection URL'
});
```

### 5. Custom Parser Functions

Transform input with custom logic:

#### Synchronous Parsers

```typescript
parser.addFlag({
  name: 'date',
  options: ['--date'],
  type: (value: string) => new Date(value),
  description: 'Date in ISO format'
});

// Usage: --date 2024-01-15
// Result: Date object
```

#### Asynchronous Parsers

```typescript
import { readFile } from 'node:fs/promises';

parser.addFlag({
  name: 'config',
  options: ['--config'],
  type: async (filePath: string) => {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  },
  description: 'JSON config file'
});

// Usage: --config ./settings.json
// Result: Parsed JSON object
```

#### Validation in Parsers

```typescript
parser.addFlag({
  name: 'port',
  options: ['--port'],
  type: (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }
    return num;
  },
  description: 'Port number'
});
```

### 6. Positional Arguments

Capture trailing arguments by position:

```typescript
parser.addFlag({
  name: 'input',
  options: ['--input'],  // Fallback option
  type: 'string',
  mandatory: true,
  positional: 1,  // First positional argument
  valueHint: 'FILE',
  description: 'Input file'
});

// Both work:
// cli process ./file.txt        → input = './file.txt'
// cli process --input ./file.txt → input = './file.txt'
```

**Multiple Positional Arguments:**

```typescript
parser.addFlag({
  name: 'source',
  options: ['-s', '--source'],
  type: 'string',
  mandatory: true,
  positional: 1,
  valueHint: 'SOURCE'
});

parser.addFlag({
  name: 'dest',
  options: ['-d', '--dest'],
  type: 'string',
  mandatory: true,
  positional: 2,
  valueHint: 'DEST'
});

// Usage: copy file.txt backup/
// Result: { source: 'file.txt', dest: 'backup/' }
```

### 7. Flag Inheritance

Share flags between parent and child commands:

```typescript
import { ArgParser, FlagInheritance } from '@alcyone-labs/arg-parser';

const root = new ArgParser()
  .addFlag({
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true
  });

const child = new ArgParser({
  inheritParentFlags: FlagInheritance.AllParents
});

root.addSubCommand({
  name: 'child',
  parser: child
});

// Child inherits --verbose flag from root
```

---

## Examples

### Example 1: Database Connection Configuration

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const dbCli = new ArgParser({
  appName: 'db-cli',
  handler: async (ctx) => {
    const { host, port, username, password, ssl } = ctx.args;
    
    console.log(`Connecting to ${host}:${port}`);
    console.log(`User: ${username}`);
    console.log(`SSL: ${ssl ? 'enabled' : 'disabled'}`);
    
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
    validate: (value) => {
      if (value < 1 || value > 65535) {
        return 'Port must be between 1 and 65535';
      }
      return true;
    },
    description: 'Database port'
  })
  .addFlag({
    name: 'username',
    options: ['-u', '--username'],
    type: 'string',
    mandatory: true,
    env: 'DB_USER',
    description: 'Database username'
  })
  .addFlag({
    name: 'password',
    options: ['--password'],
    type: 'string',
    mandatory: true,
    env: 'DB_PASSWORD',
    description: 'Database password'
  })
  .addFlag({
    name: 'ssl',
    options: ['--ssl'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Enable SSL connection'
  });

await dbCli.parse();
```

**Usage:**
```bash
# Using CLI flags
$ node db.js --username admin --password secret
Connecting to localhost:5432
User: admin
SSL: disabled

# Using environment variables
$ export DB_USER=admin
$ export DB_PASSWORD=secret
$ export DB_HOST=prod.db.example.com
$ node db.js
Connecting to prod.db.example.com:5432
User: admin
SSL: disabled

# Override env var with CLI flag
$ DB_HOST=prod.db.example.com node db.js --host localhost --username admin --password secret
Connecting to localhost:5432
User: admin
SSL: disabled
```

### Example 2: File Processor with Validation

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { existsSync } from 'node:fs';

const processor = new ArgParser({
  appName: 'file-processor',
  description: 'Process files with validation',
  handler: async (ctx) => {
    const { input, output, formats, quality, verbose } = ctx.args;
    
    if (verbose) {
      console.log(`Input: ${input}`);
      console.log(`Output: ${output}`);
      console.log(`Formats: ${formats.join(', ')}`);
      console.log(`Quality: ${quality}%`);
    }
    
    // Processing logic here
    console.log('Processing complete!');
    
    return { processed: true, files: formats.length };
  }
});

processor
  .addFlag({
    name: 'input',
    options: ['-i', '--input'],
    type: 'string',
    mandatory: true,
    positional: 1,
    valueHint: 'INPUT',
    validate: (value) => {
      if (!existsSync(value)) {
        return `Input file does not exist: ${value}`;
      }
      return true;
    },
    description: 'Input file path'
  })
  .addFlag({
    name: 'output',
    options: ['-o', '--output'],
    type: 'string',
    mandatory: true,
    positional: 2,
    valueHint: 'OUTPUT',
    description: 'Output directory'
  })
  .addFlag({
    name: 'formats',
    options: ['-f', '--format'],
    type: 'string',
    allowMultiple: true,
    mandatory: true,
    enum: ['json', 'csv', 'xml', 'yaml'],
    description: 'Output formats'
  })
  .addFlag({
    name: 'quality',
    options: ['-q', '--quality'],
    type: 'number',
    defaultValue: 90,
    validate: (value) => {
      if (value < 1 || value > 100) {
        return 'Quality must be between 1 and 100';
      }
      return true;
    },
    description: 'Processing quality (1-100)'
  })
  .addFlag({
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Enable verbose output'
  });

await processor.parse();
```

**Usage:**
```bash
# Valid usage
$ node processor.js ./data.csv ./output -f json -f csv -q 95 -v
Input: ./data.csv
Output: ./output
Formats: json, csv
Quality: 95%
Processing complete!

# Invalid - file doesn't exist
$ node processor.js ./missing.csv ./output -f json
Error: Input file does not exist: ./missing.csv

# Invalid - quality out of range
$ node processor.js ./data.csv ./output -f json -q 150
Error: Quality must be between 1 and 100

# Invalid - missing mandatory flag
$ node processor.js ./data.csv
Error: Missing mandatory flags: formats
```

### Example 3: Advanced Configuration with Custom Parsers

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';
import { readFile } from 'node:fs/promises';

interface Config {
  server: { host: string; port: number };
  database: { url: string; poolSize: number };
  features: string[];
}

const configParser = new ArgParser({
  appName: 'config-cli',
  description: 'Advanced configuration CLI',
  handler: async (ctx) => {
    const { config, debug, env } = ctx.args;
    
    if (debug) {
      console.log('Configuration:', JSON.stringify(config, null, 2));
      console.log('Environment:', env);
    }
    
    return config;
  }
});

configParser
  .addFlag({
    name: 'config',
    options: ['-c', '--config'],
    type: async (filePath: string): Promise<Config> => {
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      
      // Validate required fields
      if (!parsed.server?.host || !parsed.server?.port) {
        throw new Error('Config must have server.host and server.port');
      }
      if (!parsed.database?.url) {
        throw new Error('Config must have database.url');
      }
      
      return parsed;
    },
    mandatory: true,
    description: 'JSON configuration file'
  })
  .addFlag({
    name: 'env',
    options: ['-e', '--env'],
    type: 'string',
    defaultValue: 'development',
    enum: ['development', 'staging', 'production'],
    description: 'Environment'
  })
  .addFlag({
    name: 'debug',
    options: ['-d', '--debug'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Enable debug mode'
  });

await configParser.parse();
```

**Usage:**
```bash
# With valid config file
$ node config.js --config ./app.json --env production --debug
Configuration: {
  "server": {
    "host": "0.0.0.0",
    "port": 8080
  },
  "database": {
    "url": "postgres://localhost/myapp",
    "poolSize": 10
  },
  "features": ["auth", "logging"]
}
Environment: production

# Invalid config file
$ node config.js --config ./invalid.json
Error: Config must have server.host and server.port
```

---

## References

### Internal Links

- [Core Package Guide](./index.md) - Main getting started guide
- [API Reference](./api-reference.md) - Complete API documentation
- [Core Concepts](../CORE_CONCEPTS.md) - Detailed concept explanations
- [Interactive Prompts](../specs/INTERACTIVE_PROMPTS.md) - Adding interactive prompts

### External Links

- [Node.js Process Env](https://nodejs.org/api/process.html#process_process_env) - Environment variables
- [JSON Schema](https://json-schema.org/) - Schema validation patterns

### Related Topics

- **Subcommands** - Create hierarchical CLIs with flag inheritance
- **Interactive Prompts** - Combine flags with interactive prompts
- **Plugins** - Extend functionality with plugins
- **System Flags** - Built-in flags like --help

---

## Quality Gates

- [x] Template used correctly
- [x] All 5 mandatory sections present
- [x] Quickstart code is runnable
- [x] Examples have expected outputs
- [x] Internal links documented
- [x] External references vetted
