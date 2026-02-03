# Core API

ArgParser core class, handlers, and context.

## ArgParser Class

Main class for building CLI tools.

### Constructor

```typescript
new ArgParser(options?: IArgParserParams, initialFlags?: IFlag[])
```

### Key Methods

- `addFlag(flag)` - Add single flag
- `addFlags(flags)` - Add multiple flags
- `addSubCommand(config)` - Add subcommand
- `parse(args?, options?)` - Parse and execute
- `setHandler(handler)` - Set main handler
- `helpText()` - Generate help text

### Handler Context

```typescript
interface IHandlerContext {
  args: TParsedArgs;           // Parsed flag values
  parentArgs?: TParsedArgs;    // Parent command args (subcommands)
  commandChain: string[];      // Command hierarchy
  parser: ArgParserInstance;   // Current parser
  displayHelp(): void;         // Show help
  systemArgs?: ISystemArgs;    // System flags
  promptAnswers?: Record;      // Interactive answers
  isInteractive?: boolean;     // Interactive mode flag
}
```

See main SKILL.md for complete workflow examples.
