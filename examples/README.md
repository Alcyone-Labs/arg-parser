# ArgParser Examples

This directory contains example CLI applications demonstrating various features of the ArgParser library.

## Examples

### 1. Simple CLI (`simple-cli-1.ts`)

A basic example showing fundamental ArgParser features:

- Basic flag types (string, number, boolean)
- Mandatory and optional flags
- Default values
- Enum validation
- Multiple values for a single flag

**Run the example:**

```bash
# Build the library first
pnpm build

# Run with TypeScript
npx tsx examples/simple-cli-1.ts --env production --port 8080 --verbose --file src/index.ts --file src/ArgParser.ts

# Run with bun
bun examples/simple-cli-1.ts --env production --port 8080 --verbose --file src/index.ts --file src/ArgParser.ts

# See help
npx tsx examples/simple-cli-1.ts --help
```

### 2. Advanced CLI (`advanced-cli.ts`)

A more complex example demonstrating:

- Sub-commands with nested structure
- Handler functions for command execution
- Global flags that apply to all commands
- Command-specific flags
- Automatic handler execution

**Run the example:**

```bash
# Build the library first
pnpm build

# Run database migration
npx tsx examples/advanced-cli.ts --env production db migrate --force

# Run database migration (run with bun)
bun examples/advanced-cli.ts --env production db migrate --force

# Start server with watch mode
npx tsx examples/advanced-cli.ts --verbose server start --port 8080 --watch

# Seed database
npx tsx examples/advanced-cli.ts db seed --count 500

# See help for main command
npx tsx examples/advanced-cli.ts --help

# See help for sub-commands
npx tsx examples/advanced-cli.ts db --help
npx tsx examples/advanced-cli.ts server start --help
```

## Tips

- Use descriptive flag names and descriptions
- Provide sensible defaults where possible
- Use enum validation for restricted values
- Consider using global flags for common options
- Implement proper error handling in your handlers
