# ArgParser Examples

This directory contains example CLI applications demonstrating various features of the ArgParser library.

## Examples

### 1. Simple CLI (`simple-cli.ts`)

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
npx tsx examples/simple-cli.ts --env production --port 8080 --verbose --file src/index.ts --file src/ArgParser.ts

# See help
npx tsx examples/simple-cli.ts --help
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

## Key Features Demonstrated

### Basic Features (Simple CLI)
- **Type Safety**: Automatic type inference for parsed arguments
- **Validation**: Enum validation for restricted values
- **Defaults**: Sensible default values for optional flags
- **Multiple Values**: Support for flags that accept multiple values
- **Help Generation**: Automatic help text generation

### Advanced Features (Advanced CLI)
- **Sub-commands**: Hierarchical command structure
- **Handlers**: Automatic execution of command-specific functions
- **Context**: Access to parent arguments and command chain
- **Global Flags**: Flags that apply across all sub-commands
- **Nested Commands**: Multi-level command hierarchies

## Building Your Own CLI

1. **Start Simple**: Begin with the simple example and add flags as needed
2. **Add Sub-commands**: Use sub-commands to organize related functionality
3. **Use Handlers**: Implement handlers for automatic command execution
4. **Leverage Types**: Take advantage of TypeScript's type inference
5. **Test Thoroughly**: Use the comprehensive test suite as a reference

## Tips

- Use descriptive flag names and descriptions
- Provide sensible defaults where possible
- Use enum validation for restricted values
- Consider using global flags for common options
- Implement proper error handling in your handlers
