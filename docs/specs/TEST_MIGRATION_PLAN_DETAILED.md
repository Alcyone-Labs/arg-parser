# Hyper-Detailed Test Migration Plan

## Overview

This document provides a complete, step-by-step migration plan for tests in the **core package**, **unified tools**, **flag management**, and **documentation**. MCP, DXT, and TUI tests are out of scope for this plan.

**Scope**: Core functionality only  
**Out of Scope**: MCP, DXT, TUI tests
**Estimated Duration**: 1-2 weeks  
**Priority**: P0 (Critical for v3.0.0 release)

---

## Part 1: Core Package Tests

### 1.1 Test File Inventory

**Files to Migrate to `packages/core/tests/`:**

| Source File                                    | Target Location                                         | Lines | Priority | Rewrite % |
| ---------------------------------------------- | ------------------------------------------------------- | ----- | -------- | --------- |
| `tests/ArgParser.test.ts`                      | `packages/core/tests/ArgParser.test.ts`                 | 533   | P0       | 30%       |
| `tests/core/flag-types-consolidated.test.ts`   | `packages/core/tests/flag-types-consolidated.test.ts`   | ~500  | P0       | 20%       |
| `tests/core/working-directory.test.ts`         | `packages/core/tests/working-directory.test.ts`         | ~300  | P0       | 25%       |
| `tests/core/zod-schema-flags.test.ts`          | `packages/core/tests/zod-schema-flags.test.ts`          | ~400  | P0       | 20%       |
| `tests/core/async-custom-parsers.test.ts`      | `packages/core/tests/async-custom-parsers.test.ts`      | ~250  | P1       | 20%       |
| `tests/core/output-schema.test.ts`             | `packages/core/tests/output-schema.test.ts`             | ~200  | P1       | 15%       |
| `tests/core/getJsonSchemaTypeFromFlag.test.ts` | `packages/core/tests/getJsonSchemaTypeFromFlag.test.ts` | ~150  | P1       | 15%       |
| `tests/core/auto-argument-detection.test.ts`   | `packages/core/tests/auto-argument-detection.test.ts`   | ~300  | P1       | 25%       |
| `tests/core/env-config-overwrite.test.ts`      | `packages/core/tests/env-config-overwrite.test.ts`      | ~400  | P1       | 30%       |
| `tests/system-args.test.ts`                    | `packages/core/tests/system-args.test.ts`               | ~400  | P1       | 25%       |
| `tests/auto-help.test.ts`                      | `packages/core/tests/auto-help.test.ts`                 | ~150  | P1       | 20%       |
| `tests/inheritance.test.ts`                    | `packages/core/tests/inheritance.test.ts`               | ~200  | P1       | 20%       |
| `tests/positional-arguments.test.ts`           | `packages/core/tests/positional-arguments.test.ts`      | ~300  | P1       | 25%       |
| `tests/with-env.test.ts`                       | `packages/core/tests/with-env.test.ts`                  | ~300  | P2       | 30%       |
| `tests/ConfigurationManager.test.ts`           | `packages/core/tests/ConfigurationManager.test.ts`      | ~400  | P2       | 35%       |
| `tests/backward-compatibility.test.ts`         | `packages/core/tests/backward-compatibility.test.ts`    | ~400  | P2       | 50%       |
| `tests/flag-collision-detection.test.ts`       | `packages/core/tests/flag-collision-detection.test.ts`  | ~350  | P2       | 25%       |
| `tests/interactive-prompts.test.ts`            | `packages/core/tests/interactive-prompts.test.ts`       | ~500  | P2       | 40%       |

**Total Lines**: ~6,000 lines  
**Average Rewrite**: ~25-30%

### 1.2 Directory Structure

```
packages/core/tests/
├── setup.ts                          # Test setup and utilities
├── utils/
│   ├── test-helpers.ts              # Shared test utilities
│   ├── mock-process.ts              # Process mocking
│   └── flag-factories.ts            # Flag creation helpers
├── ArgParser.test.ts                # Main parser tests
├── FlagManager.test.ts              # Flag management tests
├── PromptManager.test.ts            # Prompt management tests
├── core/
│   ├── flag-types-consolidated.test.ts
│   ├── working-directory.test.ts
│   ├── zod-schema-flags.test.ts
│   ├── async-custom-parsers.test.ts
│   ├── output-schema.test.ts
│   ├── getJsonSchemaTypeFromFlag.test.ts
│   ├── auto-argument-detection.test.ts
│   ├── env-config-overwrite.test.ts
│   └── dxt-variable-integration.test.ts
├── features/
│   ├── system-args.test.ts
│   ├── auto-help.test.ts
│   ├── inheritance.test.ts
│   ├── positional-arguments.test.ts
│   ├── with-env.test.ts
│   ├── configuration.test.ts
│   ├── backward-compatibility.test.ts
│   ├── flag-collision.test.ts
│   └── interactive-prompts.test.ts
└── integration/
    └── full-cli-workflow.test.ts    # End-to-end CLI tests
```

### 1.3 Step-by-Step Migration Instructions

#### Step 1: Create Test Infrastructure (Day 1)

**File: `packages/core/tests/setup.ts`**

```typescript
import { vi } from "vitest";

// Global test setup
globalThis.testEnv = {
  isTest: true,
};

// Mock console methods to avoid noise during tests
export function mockConsole() {
  return {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
  };
}

// Mock process.exit
export function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code}) called`);
  });
}

// Restore all mocks
export function restoreMocks(...mocks: any[]) {
  mocks.forEach((mock) => mock?.mockRestore?.());
}
```

**File: `packages/core/tests/utils/test-helpers.ts`**

```typescript
import { ArgParser } from "../../src/index.js";
import type { IFlag, IArgParserParams } from "../../src/index.js";

/**
 * Create a test parser with autoExit disabled
 */
export function createTestParser(params: Partial<IArgParserParams> = {}) {
  return new ArgParser({
    appName: "test-cli",
    appCommandName: "test-cli",
    autoExit: false,
    handleErrors: false,
    ...params,
  });
}

/**
 * Create a test parser with flags
 */
export function createTestParserWithFlags(
  flags: IFlag[],
  params: Partial<IArgParserParams> = {},
) {
  return createTestParser(params).addFlags(flags);
}

/**
 * Parse arguments and return result
 */
export async function parseArgs(
  parser: ArgParser,
  args: string[],
  options = {},
) {
  return parser.parse(args, { autoExecute: false, ...options });
}

/**
 * Standard test flags
 */
export const standardTestFlags: IFlag[] = [
  {
    name: "name",
    options: ["-n", "--name"],
    type: "string",
    mandatory: true,
    description: "Name parameter",
  },
  {
    name: "verbose",
    options: ["-v", "--verbose"],
    type: "boolean",
    flagOnly: true,
    defaultValue: false,
    description: "Enable verbose mode",
  },
  {
    name: "count",
    options: ["-c", "--count"],
    type: "number",
    defaultValue: 1,
    description: "Count parameter",
  },
];
```

**File: `packages/core/tests/utils/flag-factories.ts`**

```typescript
import type { IFlag } from "../../src/index.js";

/**
 * Factory for creating string flags
 */
export function createStringFlag(
  name: string,
  options: Partial<IFlag> = {},
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: "string",
    ...options,
  };
}

/**
 * Factory for creating boolean flags
 */
export function createBooleanFlag(
  name: string,
  options: Partial<IFlag> = {},
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: "boolean",
    flagOnly: true,
    ...options,
  };
}

/**
 * Factory for creating number flags
 */
export function createNumberFlag(
  name: string,
  options: Partial<IFlag> = {},
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: "number",
    ...options,
  };
}

/**
 * Factory for creating array flags
 */
export function createArrayFlag(
  name: string,
  options: Partial<IFlag> = {},
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: "string",
    allowMultiple: true,
    ...options,
  };
}
```

#### Step 2: Migrate ArgParser.test.ts (Days 2-3)

**Critical Changes:**

1. **Update imports:**

   ```typescript
   // BEFORE (v2.x)
   import { ArgParser, ArgParserError, type IFlag } from "../src";

   // AFTER (v3.0)
   import { ArgParser, ArgParserError, type IFlag } from "../../src/index.js";
   import {
     createTestParser,
     standardTestFlags,
   } from "./utils/test-helpers.js";
   ```

2. **Update test setup:**

   ```typescript
   // BEFORE
   const createParser = (autoExit: boolean = true) => {
     return new ArgParser({
       appName: "Test CLI",
       appCommandName: testCommandName,
       autoExit,
     }).addFlags(flags);
   };

   // AFTER
   const createParser = (autoExit: boolean = false) => {
     return createTestParser({
       appCommandName: testCommandName,
       autoExit,
     }).addFlags(flags);
   };
   ```

3. **Update assertions** (minimal changes expected):

   ```typescript
   // BEFORE
   test("should parse basic flags", async () => {
     const result = await parser.parse([
       "--phase",
       "pairing",
       "-b",
       "42",
       "-t",
       "chunks",
     ]);
     expect(result).toMatchObject({
       phase: "pairing",
       batch: 42,
       verbose: false,
       table: "chunks",
     });
   });

   // AFTER (same - no changes needed)
   test("should parse basic flags", async () => {
     const result = await parser.parse([
       "--phase",
       "pairing",
       "-b",
       "42",
       "-t",
       "chunks",
     ]);
     expect(result).toMatchObject({
       phase: "pairing",
       batch: 42,
       verbose: false,
       table: "chunks",
     });
   });
   ```

**Migration Checklist for ArgParser.test.ts:**

- [ ] Update imports to use `../../src/index.js`
- [ ] Import test helpers from `./utils/test-helpers.js`
- [ ] Replace `new ArgParser()` calls with `createTestParser()`
- [ ] Ensure `autoExit: false` in all test parsers
- [ ] Update any MCP-related tests (remove or move to plugin tests)
- [ ] Verify all 533 lines still work
- [ ] Run tests and fix any failures

#### Step 3: Migrate Flag Type Tests (Day 4)

**Files:**

- `tests/core/flag-types-consolidated.test.ts`
- `tests/core/zod-schema-flags.test.ts`
- `tests/core/async-custom-parsers.test.ts`

**Changes:**

1. Update imports to `../../src/index.js`
2. Use `createTestParser()` helper
3. Remove any MCP-specific flag tests (move to MCP plugin tests)

#### Step 4: Migrate Feature Tests (Days 5-6)

**Files:**

- `tests/system-args.test.ts`
- `tests/auto-help.test.ts`
- `tests/inheritance.test.ts`
- `tests/positional-arguments.test.ts`
- `tests/core/working-directory.test.ts`

**Special Notes:**

**For system-args.test.ts:**

- System flag detection logic unchanged
- Just update imports

**For auto-help.test.ts:**

- Help generation logic unchanged
- Update imports only

**For inheritance.test.ts:**

- Flag inheritance logic unchanged
- Update imports only

**For working-directory.test.ts:**

- Working directory logic moved to core
- Update imports only

#### Step 5: Migrate Configuration Tests (Day 7)

**Files:**

- `tests/ConfigurationManager.test.ts`
- `tests/core/env-config-overwrite.test.ts`
- `tests/with-env.test.ts`

**Changes:**

1. ConfigurationManager stays in core
2. Update imports
3. Some config tests may need adjustment for plugin architecture

### 1.4 Test Migration Template

Use this template for each test file:

```typescript
/**
 * @fileoverview [Test File Description]
 * @module @alcyone-labs/arg-parser/tests/[path]
 *
 * Migrated from: tests/[original-path].test.ts
 * Migration Date: [Date]
 * Changes Made:
 *   - Updated imports to use package structure
 *   - Replaced direct ArgParser instantiation with createTestParser()
 *   - [Any other specific changes]
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ArgParser,
  ArgParserError,
  type IFlag,
  type IArgParserParams,
} from "../../src/index.js";
import {
  createTestParser,
  createTestParserWithFlags,
  standardTestFlags,
  mockConsole,
  mockProcessExit,
  restoreMocks,
} from "../utils/test-helpers.js";

describe("[Feature Name]", () => {
  let parser: ArgParser;
  let consoleMocks: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    consoleMocks = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    restoreMocks(consoleMocks.log, consoleMocks.error, exitMock);
  });

  describe("[Test Category]", () => {
    test("[test description]", async () => {
      // Arrange
      parser = createTestParserWithFlags(standardTestFlags);

      // Act
      const result = await parser.parse(["--name", "test"]);

      // Assert
      expect(result).toMatchObject({ name: "test" });
    });
  });
});
```

---

## Part 2: Unified Tools Tests

### 2.1 Test File Inventory

**Files to Migrate:**

| Source File                   | Target Location                                      | Lines | Priority | Rewrite % |
| ----------------------------- | ---------------------------------------------------- | ----- | -------- | --------- |
| `tests/unified-tools.test.ts` | `packages/core/tests/features/unified-tools.test.ts` | ~400  | P0       | 70%       |

**Note**: Unified tools tests will need to be created from scratch or heavily modified since the unified tools concept is new in v3.0.

### 2.2 New Test Structure

```
packages/core/tests/
├── features/
│   └── unified-tools.test.ts
```

### 2.3 Unified Tools Test Plan

Since unified tools are a **new feature** in v3.0, we need to write tests from scratch:

**Test Coverage Needed:**

1. **Tool Definition Tests**
   - Define tool with flags
   - Define tool with handler
   - Define tool with output schema

2. **Tool Registration Tests**
   - Register tool via plugin
   - Tool appears in CLI as subcommand
   - Tool appears in MCP server

3. **Tool Execution Tests**
   - Execute tool via CLI
   - Execute tool via MCP
   - Error handling in both modes

4. **Tool Schema Tests**
   - JSON schema generation
   - Zod schema validation
   - Output schema validation

**Example Test:**

```typescript
describe("Unified Tools", () => {
  describe("Tool Definition", () => {
    test("should define a unified tool", () => {
      const tool = {
        name: "process-data",
        description: "Process data files",
        flags: [
          {
            name: "input",
            options: ["-i", "--input"],
            type: "string",
            mandatory: true,
          },
          { name: "output", options: ["-o", "--output"], type: "string" },
        ],
        handler: async (ctx) => {
          return { processed: true, input: ctx.args.input };
        },
      };

      // Tool definition should be valid
      expect(tool.name).toBe("process-data");
      expect(tool.flags).toHaveLength(2);
    });
  });

  describe("Tool Registration", () => {
    test("should register tool as CLI subcommand", async () => {
      const parser = createTestParser();

      // Register tool
      parser.addTool({
        name: "process",
        flags: [
          { name: "file", options: ["-f"], type: "string", mandatory: true },
        ],
        handler: async (ctx) => ctx.args,
      });

      // Tool should be accessible as subcommand
      const result = await parser.parse(["process", "-f", "data.txt"]);
      expect(result.file).toBe("data.txt");
    });
  });
});
```

---

## Part 3: Flag Management Tests

### 3.1 Test File Inventory

**Files to Migrate:**

| Source File                                  | Target Location                                            | Lines | Priority | Rewrite % |
| -------------------------------------------- | ---------------------------------------------------------- | ----- | -------- | --------- |
| `tests/flag-collision-detection.test.ts`     | `packages/core/tests/FlagManager.test.ts`                  | ~350  | P0       | 25%       |
| `tests/core/flag-types-consolidated.test.ts` | `packages/core/tests/core/flag-types-consolidated.test.ts` | ~500  | P0       | 20%       |
| `tests/core/dxt-options-validation.test.ts`  | Remove or move to DXT plugin                               | ~300  | N/A      | N/A       |

### 3.2 FlagManager Unit Tests

Create comprehensive FlagManager tests:

**File: `packages/core/tests/FlagManager.test.ts`**

```typescript
describe("FlagManager", () => {
  describe("addFlag", () => {
    test("should add a flag", () => {
      const manager = new FlagManager();
      manager.addFlag({
        name: "verbose",
        options: ["-v", "--verbose"],
        type: "boolean",
      });

      expect(manager.hasFlag("verbose")).toBe(true);
    });

    test("should throw on duplicate when configured", () => {
      const manager = new FlagManager({ throwForDuplicateFlags: true });
      manager.addFlag({ name: "verbose", options: ["-v"], type: "boolean" });

      expect(() => {
        manager.addFlag({
          name: "verbose",
          options: ["--verbose"],
          type: "boolean",
        });
      }).toThrow("already exists");
    });
  });

  describe("collision detection", () => {
    test("should detect option collisions", () => {
      const manager = new FlagManager();
      manager.addFlag({ name: "verbose", options: ["-v"], type: "boolean" });
      manager.addFlag({ name: "version", options: ["-v"], type: "boolean" });

      const collisions = manager.getCollisions();
      expect(collisions).toHaveLength(1);
      expect(collisions[0].option).toBe("-v");
    });
  });
});
```

---

## Part 4: Documentation Tests

### 4.1 Documentation Test Plan

**Goal**: Ensure all documentation is accurate and up-to-date

**Test Types:**

1. **README Accuracy Tests**
   - All code examples in READMEs should work
   - All links should be valid
   - All API references should be correct

2. **JSDoc Tests**
   - All public APIs should have JSDoc
   - All parameters should be documented
   - All examples should be valid

3. **Migration Guide Tests**
   - All migration examples should work
   - All breaking changes should be documented

### 4.2 Documentation Test Implementation

**File: `packages/core/tests/docs/readme-examples.test.ts`**

```typescript
import { describe, test, expect } from "vitest";
import { ArgParser } from "../../src/index.js";

describe("README Examples", () => {
  test("basic CLI example from README should work", async () => {
    // Example from README.md
    const parser = new ArgParser({
      appName: "my-cli",
      handler: async (ctx) => {
        return { greeting: `Hello ${ctx.args.name}` };
      },
    });

    parser.addFlag({
      name: "name",
      options: ["-n", "--name"],
      type: "string",
      mandatory: true,
    });

    const result = await parser.parse(["--name", "World"]);
    expect(result.greeting).toBe("Hello World");
  });
});
```

**File: `scripts/verify-docs.ts`**

````typescript
/**
 * Script to verify documentation accuracy
 */
import * as fs from "node:fs";
import * as path from "node:path";

// Extract code blocks from markdown
function extractCodeBlocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /```typescript\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

// Verify a code block compiles
async function verifyCodeBlock(
  block: string,
  filename: string,
): Promise<boolean> {
  try {
    // Write to temp file and try to compile
    const tempFile = `/tmp/doc-test-${Date.now()}.ts`;
    fs.writeFileSync(tempFile, block);

    // Run TypeScript compiler
    const { execSync } = require("child_process");
    execSync(`npx tsc --noEmit ${tempFile}`, { stdio: "pipe" });

    // Clean up
    fs.unlinkSync(tempFile);
    return true;
  } catch (error) {
    console.error(`Failed to verify code block in ${filename}:`, error);
    return false;
  }
}

async function main() {
  const readmePath = path.join(__dirname, "../packages/core/README.md");
  const content = fs.readFileSync(readmePath, "utf-8");
  const blocks = extractCodeBlocks(content);

  console.log(`Found ${blocks.length} TypeScript code blocks in README`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < blocks.length; i++) {
    const success = await verifyCodeBlock(
      blocks[i],
      `README.md block ${i + 1}`,
    );
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
````

---

## Part 5: Execution Timeline

### Week 1: Core Package Tests

**Day 1: Setup**

- [ ] Create test infrastructure (setup.ts, test-helpers.ts)
- [ ] Create flag-factories.ts
- [ ] Configure vitest for core package
- [ ] Set up test scripts in package.json

**Day 2-3: ArgParser.test.ts**

- [ ] Migrate ArgParser.test.ts
- [ ] Update all imports
- [ ] Replace parser instantiation with helpers
- [ ] Run tests and fix failures

**Day 4: Flag Type Tests**

- [ ] Migrate flag-types-consolidated.test.ts
- [ ] Migrate zod-schema-flags.test.ts
- [ ] Migrate async-custom-parsers.test.ts

**Day 5-6: Feature Tests**

- [ ] Migrate system-args.test.ts
- [ ] Migrate auto-help.test.ts
- [ ] Migrate inheritance.test.ts
- [ ] Migrate positional-arguments.test.ts
- [ ] Migrate working-directory.test.ts

**Day 7: Configuration Tests**

- [ ] Migrate ConfigurationManager.test.ts
- [ ] Migrate env-config-overwrite.test.ts
- [ ] Migrate with-env.test.ts

### Week 2: Unified Tools & Documentation

**Day 8-9: Unified Tools**

- [ ] Write unified-tools.test.ts from scratch
- [ ] Test tool definition
- [ ] Test tool registration
- [ ] Test tool execution
- [ ] Test schema generation

**Day 10: Flag Management**

- [ ] Create FlagManager.test.ts
- [ ] Test all FlagManager methods
- [ ] Migrate flag-collision-detection.test.ts

**Day 11-12: Documentation**

- [ ] Create README examples test
- [ ] Create JSDoc verification script
- [ ] Test all code examples in docs
- [ ] Verify migration guide examples

**Day 13-14: Integration & Polish**

- [ ] Create integration tests
- [ ] Run full test suite
- [ ] Fix any remaining failures
- [ ] Document any skipped tests

---

## Part 6: Quality Checklist

### Before Marking Complete

- [ ] All P0 tests migrated and passing
- [ ] All P1 tests migrated and passing
- [ ] Test coverage > 80% for core package
- [ ] No test failures in core package
- [ ] All README examples tested
- [ ] All migration guide examples tested
- [ ] Documentation is accurate
- [ ] Test utilities are well-documented
- [ ] CI/CD pipeline updated for new test structure

### Test Quality Standards

1. **Each test should:**
   - Have a clear description
   - Follow Arrange-Act-Assert pattern
   - Use test helpers where appropriate
   - Clean up after itself

2. **Test files should:**
   - Be organized by feature
   - Use consistent naming
   - Have proper imports
   - Include JSDoc comments

3. **Test suite should:**
   - Run in < 30 seconds
   - Have no flaky tests
   - Have clear error messages
   - Be easy to debug

---

## Part 7: Handoff Notes

### MCP, DXT, TUI Test Migration

**Scope**:

- `tests/mcp/` → `packages/mcp/tests/`
- `tests/dxt/` → `packages/dxt/tests/`
- `tests/tui/` → `packages/tui/tests/`

**Key Differences from Core:**

1. These tests use the plugin architecture
2. Need to test `.use(plugin)` method
3. Need to test plugin-specific functionality
4. May need to mock MCP SDK, tsdown, OpenTUI

**Dependencies on Core:**

- Use test helpers from `packages/core/tests/utils/`
- Follow same test structure
- Use same naming conventions

---

## Appendix: Quick Reference

### Import Mapping

| Old Import                 | New Import                       |
| -------------------------- | -------------------------------- |
| `from "../src"`            | `from "../../src/index.js"`      |
| `from "../../src"`         | `from "../../../src/index.js"`   |
| `from "../src/core/types"` | `from "../../src/core/types.js"` |

### Test Helper Usage

```typescript
// Create parser
const parser = createTestParser({ appName: "my-test" });

// Create parser with flags
const parser = createTestParserWithFlags(standardTestFlags);

// Mock console
const mocks = mockConsole();

// Mock process.exit
const exitMock = mockProcessExit();

// Clean up
restoreMocks(mocks.log, exitMock);
```

### Running Tests

```bash
# All core tests
pnpm --filter @alcyone-labs/arg-parser test

# Specific test file
pnpm --filter @alcyone-labs/arg-parser test ArgParser.test.ts

# Watch mode
pnpm --filter @alcyone-labs/arg-parser test:watch

# Coverage
pnpm --filter @alcyone-labs/arg-parser test --coverage
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-05  
**Status**: Ready for execution
