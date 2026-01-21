# Agent Development Guidelines for @alcyone-labs/arg-parser

## Commands

### Build

- `pnpm build` - Full build (clean, types, cjs, esm, minified, assets)
- `pnpm build:watch` - Watch mode for TypeScript compilation
- `pnpm check:types` - TypeScript type checking

### Lint & Format

- `pnpm format` - Format with Prettier (includes import sorting)
- `pnpm check:cir-dep` - Check circular dependencies

### Test

- `pnpm test` - Run tests non-interactively (default, excludes integration, exits after completion)
- `pnpm test:all` - Run all tests including integration tests (slower)
- `vitest run <file-path>` - Run specific test file: `vitest run tests/core/flag-types-consolidated.test.ts`
- `vitest run --reporter=verbose <pattern>` - Run tests matching pattern with verbose output
- `pnpm test:watch` - Watch mode for tests (interactive, watches for file changes)
- `pnpm test:ui` - Run Vitest UI (interactive, serves web interface)
- `vitest --run --reporter=verbose tests/core/` - Run tests in specific directory

### Pre-publish

- `pnpm prepublishOnly` - Runs build + test:fast

## Code Style

### Imports

- Sorted automatically via `@ianvs/prettier-plugin-sort-imports`
- Order: BUILTIN_MODULES → local modules → THIRD_PARTY_MODULES → internal (#/\*) → relative (./)
- Test files: `vitest` import first
- Use `node:` prefix for built-ins: `import * as fs from "node:fs"`
- Re-export from `src/index.ts` for public API
- For internal imports, use `#/*` alias: `import { debug } from "#/utils/debug-utils"`
- For local imports within same directory, use `./`: `import { FlagManager } from "./FlagManager"`

### Types

- TypeScript strict mode enabled
- Use Zod schemas for runtime validation
- Interfaces: PascalCase with `I` prefix: `IArgParserParams`, `IHandlerContext`, `IFlag`
- Type aliases: PascalCase with `T` prefix: `THandlerReturn`, `TParsedArgs`, `TFlagInheritance`
- Export types from `src/index.ts` for public API
- Zod v4: use `z.url()` instead of deprecated `z.string().url()`, as well as other similar deprecated APIs
- Type definitions in same file as implementation unless there are too many or cross-files and need to be centralized

### Naming Conventions

- Classes: `PascalCase` (e.g., `ArgParser`, `FlagManager`)
- Functions/variables: `camelCase` (e.g., `parse()`, `appName`)
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts`
- Test files: `<filename>.test.ts` alongside source file
- Private fields: `#privateField` (private class fields syntax)

### Error Handling

- Extend `Error` class for custom errors: `class ArgParserError extends Error`
- Use try/catch for error handling
- Include meaningful error messages
- Fail-fast approach for critical errors
- Export custom error classes from `src/index.ts`

### Testing

- Framework: Vitest
- Test files: `<filename>.test.ts` in `tests/` directory
- Structure: `describe("feature", () => { test("scenario", async () => {}) })`
- Use `vi` for mocking (e.g., `vi.spyOn`, `vi.fn()`)
- Cleanup in `afterEach` hooks
- Write tests before implementation (TDD encouraged)

### Async & Runtime

- Use `async/await` for asynchronous operations
- Use Bun.JS for running TypeScript files without build step: `bun run-file.ts`
- All Node built-ins use `node:` prefix

### Tooling

- Package manager: `pnpm` (NOT npm, NOT yarn)
- Build tool: Vite with TypeScript
- Runtime: Node support is mandatory, but running TS natively via Bun is the second important target
- Cross-platform: Use `cross-env` for environment variables

### Code Organization

- No path hell: use `./` for relative paths, `#/*` for internal aliases
- Keep files focused on single responsibilities
- Related files grouped in directories (core/, mcp/, ui/, utils/, config/)
- Export main functionality from `index.ts`
- Follow existing patterns in codebase

### Cross-Package Dependencies

- Use `workspace:*` syntax in package.json: `"@alcyone-labs/package": "workspace:*"`
- Then run `pnpm install`
- Never use relative paths or tsconfig path aliases for cross-package imports

### Documentation

- Document ALL public APIs with JSDoc
- Include ALL types in JSDoc
- Maintain examples in `examples/` directory
- Update existing documentation files, don't create new ones unnecessarily

### File Structure

```
src/
  core/           # Core parsing logic
  mcp/            # MCP integration
  ui/             # Terminal UI components
  config/         # Configuration management
  utils/          # Utility functions
tests/
  core/           # Core functionality tests
  mcp/            # MCP integration tests
  ui/             # UI component tests
```

### Important Notes

- DO NOT EDIT GENERATED FILES
- DO NOT COMMIT SECRETS OR CREDENTIALS
- Run `pnpm check:types` and `pnpm format` before committing
- Test related changes only, not entire suite
- Timeout long-running commands with `timeout XX`
