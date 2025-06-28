# ArgParser Fuzzy Testing Utility

The ArgParser Fuzzy Testing utility provides comprehensive automated testing for ArgParser configurations to ensure robustness and catch edge cases that might not be covered by manual testing.

## Overview

The fuzzy tester systematically explores all command paths and generates various flag combinations to test:

- **Valid combinations**: Proper flag usage with correct types and values
- **Invalid combinations**: Intentionally wrong inputs to test error handling
- **Random combinations**: Pseudo-random flag combinations to catch unexpected issues
- **Edge cases**: Boundary conditions, special characters, and unusual inputs
- **Performance**: Execution timing for different input complexities

## Features

### Core Testing Capabilities

- **Command Path Discovery**: Automatically discovers all subcommand paths up to a configurable depth
- **Flag Combination Testing**: Tests various combinations of flags including:
  - Individual flags with valid values
  - Multiple flag combinations
  - Flags with enum validation
  - Flags with custom validation functions
  - Multiple values for `allowMultiple` flags
  - Ligature vs separate flag/value syntax
- **Error Boundary Testing**: Validates proper error handling for invalid inputs
- **Performance Profiling**: Measures parsing performance across different scenarios

### Output Formats

- **Text**: Human-readable console output
- **JSON**: Machine-readable structured data
- **Markdown**: Documentation-friendly format

## Usage

### Programmatic API

```typescript
import { ArgParserFuzzyTester } from "@alcyone-labs/arg-parser/fuzzy-tester";
import { myArgParser } from "./my-cli";

const tester = new ArgParserFuzzyTester(myArgParser, {
  maxDepth: 5,
  randomTestCases: 10,
  includePerformance: true,
  testErrorCases: true,
  verbose: false,
});

const report = await tester.runFuzzyTest();
console.log(`Success rate: ${(report.successfulTests / report.totalTests * 100).toFixed(1)}%`);
```

### CLI Tool

```bash
# Test an ArgParser file and output to console
bun src/fuzzy-test-cli.ts --file examples/getting-started.ts

# Test with custom options and save to file
bun src/fuzzy-test-cli.ts \
  --file examples/getting-started.ts \
  --output test-results.json \
  --format json \
  --max-depth 3 \
  --random-tests 20 \
  --verbose

# Test without error cases and with performance timing
bun src/fuzzy-test-cli.ts \
  --file examples/fzf-search-cli.ts \
  --skip-errors \
  --performance \
  --format markdown \
  --output fuzzy-test-report.md
```

### System Flag Integration (v1.1.0+)

The fuzzy tester automatically uses the `--s-enable-fuzzy` system flag to make any ArgParser instance fuzzy-test compatible **without any boilerplate code**:

```bash
# The CLI tool automatically enables fuzzy mode
bun src/fuzzy-test-cli.ts --file examples/getting-started.ts

# You can also manually enable fuzzy mode on any CLI (acts as dry-run)
bun examples/getting-started.ts --s-enable-fuzzy --input test.txt --format json
```

The `--s-enable-fuzzy` system flag acts as a **dry-run mode**:
- **Zero boilerplate**: No conditional logic needed - just `export default cli` and `cli.parse()`
- **Automatic prevention**: System automatically prevents CLI execution during fuzzy testing
- Disables error handling (`handleErrors = false`)
- Skips mandatory flag validation
- **Prevents handler function execution** (no side effects)
- **Logs what each handler would have received** for visibility
- Recursively applies to all subcommand parsers
- Allows safe fuzzy testing without code modifications

This makes it safe to test production CLIs that might have handlers with side effects like file operations, API calls, or database modifications.

### Fuzzy Mode Logging

When `--s-enable-fuzzy` is enabled, you'll see detailed logs showing what arguments each handler would have received:

```
[--s-enable-fuzzy] handler() skipped for command chain: (root)
  Input args: [--s-enable-fuzzy --input test.txt --format json]
  Parsed args: {"input":"test.txt","format":"json"}
[--s-enable-fuzzy] handler() skipped for command chain: convert
  Input args: [convert --format yaml --compress]
  Parsed args: {"format":"yaml","compress":true}
```

This provides excellent visibility into the fuzzy testing process and helps verify that the correct arguments are being parsed for each command path.

### CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Path to TypeScript/JavaScript file with ArgParser | Required |
| `--output` | `-o` | Output file for results (default: stdout) | - |
| `--max-depth` | `-d` | Maximum depth for command path exploration | 5 |
| `--random-tests` | `-r` | Number of random test cases per path | 10 |
| `--verbose` | `-v` | Enable verbose output | false |
| `--skip-errors` | | Skip error case testing | false |
| `--format` | | Output format (json/text/markdown) | text |
| `--performance` | `-p` | Include performance timing | true |

## Configuration Options

### FuzzyTestOptions

```typescript
interface FuzzyTestOptions {
  /** Maximum depth for command path exploration */
  maxDepth?: number;
  /** Number of random test cases to generate per command path */
  randomTestCases?: number;
  /** Include performance timing in results */
  includePerformance?: boolean;
  /** Test invalid combinations to verify error handling */
  testErrorCases?: boolean;
  /** Verbose output for debugging */
  verbose?: boolean;
}
```

## Understanding Test Results

### What Gets Tested

The fuzzy tester runs **three types of tests** to comprehensively validate your CLI:

1. **Valid Combinations** (should succeed):
   - Mandatory flags with correct values
   - Optional flags with valid types
   - Proper enum values
   - Correct flag combinations

2. **Random Combinations** (should mostly succeed):
   - 30% chance each flag gets included
   - Random valid values for each type
   - Tests unexpected but valid combinations

3. **Error Cases** (should fail gracefully):
   - Invalid flag names (`--nonexistent`)
   - Wrong types (`--count not-a-number`)
   - Invalid enum values
   - **These failures are EXPECTED and count as "success"**

### Success Rate Interpretation

The fuzzy testing CLI automatically **exits with code 1 if success rate < 80%**:

- **90%+ Success Rate**: 🟢 **Excellent** - Your CLI is very robust
- **80-89% Success Rate**: 🟡 **Good** - Minor issues, but generally solid
- **<80% Success Rate**: 🔴 **Needs Attention** - Indicates significant parsing or validation issues

### Key Health Indicators

#### **✅ Green Flags (Healthy CLI)**
- Success rate 90% or higher
- Error types are mostly expected ones:
  - "Unknown command"
  - "Invalid enum value"
  - "Missing mandatory flag"
- All command paths have reasonable test coverage
- Failed tests are mostly from the "error cases" category

#### **🚨 Red Flags (Problems to Investigate)**
- Success rate below 80% (tool exits with error code 1)
- High counts of unexpected errors:
  - "Type conversion failed" (type handling issues)
  - "Validation failed" (custom validation problems)
  - "Handler execution failed" (logic errors in handlers)
- Command paths with 0 coverage (discovery issues)
- Specific command paths with very low success rates

## Test Report Structure

The fuzzy tester generates comprehensive reports with the following information:

### Summary Statistics
- Total number of tests executed
- Success/failure counts and percentages
- Command path coverage analysis
- Error type distribution

### Detailed Results
- Individual test results with arguments and outcomes
- Error messages for failed tests
- Performance timing data
- Command chain information

### Example Report Output

```
============================================================
ArgParser Fuzzy Test Report
============================================================

SUMMARY:
  Total Tests: 156
  Successful: 142 (91.0%)  ← Excellent success rate!
  Failed: 14 (9.0%)        ← Low failure rate indicates robust CLI

COMMAND PATHS TESTED:
  (root): 45/50 passed     ← 90% success rate for root command
  process: 38/42 passed    ← 90.5% success rate
  analyze: 35/38 passed    ← 92.1% success rate
  export database: 12/13 passed ← 92.3% success rate
  export file: 12/13 passed     ← 92.3% success rate

ERROR TYPES:
  Unknown command: 8       ← Expected from error case testing
  Invalid enum value: 4    ← Expected from error case testing
  Missing mandatory flag: 2 ← Expected from error case testing

FAILED TESTS:
  Command: (root)
  Args: --invalid-flag value
  Error: Unknown command: 'invalid-flag'  ← Expected failure (error case)

  Command: process
  Args: process --algorithm invalid
  Error: Invalid enum value for 'algorithm' ← Expected failure (error case)
```

## Reading Your Results

### Step-by-Step Analysis

#### 1. **Check Overall Success Rate**
```
Successful: 142 (91.0%)
```
- **90%+**: Your CLI is very robust ✅
- **80-89%**: Good, minor issues 🟡
- **<80%**: Needs attention, tool exits with error code 1 🔴

#### 2. **Analyze Command Path Coverage**
```
COMMAND PATHS TESTED:
  (root): 45/50 passed
  process: 38/42 passed
```
- **Look for paths with 0 tests**: Indicates discovery issues
- **Compare success rates across paths**: Identify problematic command paths
- **Focus on critical paths**: Your main workflows should have high success rates

#### 3. **Review Error Types**
```
ERROR TYPES:
  Unknown command: 8
  Invalid enum value: 4
```
- **Expected error types** (from error case testing):
  - "Unknown command"
  - "Invalid enum value"
  - "Missing mandatory flag"
- **Unexpected error types** (investigate these):
  - "Type conversion failed"
  - "Validation failed"
  - "Handler execution failed"

#### 4. **Examine Failed Tests**
```
FAILED TESTS:
  Command: process
  Args: process --algorithm invalid
  Error: Invalid enum value for 'algorithm'
```
- **Expected failures**: Invalid inputs being properly rejected
- **Unexpected failures**: Valid-looking inputs that failed (investigate!)
- **Pattern recognition**: Multiple similar failures indicate systematic issues

### Practical Interpretation Examples

#### **Healthy CLI Example**
```bash
# Command: bun src/fuzzy-test-cli.ts --file my-cli.ts
# Output:
Total Tests: 156
Successful: 142 (91.0%)  ← Excellent!
Failed: 14 (9.0%)        ← Mostly expected error cases

ERROR TYPES:
  Unknown command: 8      ← Expected
  Invalid enum value: 4   ← Expected
  Missing mandatory flag: 2 ← Expected
```
**Interpretation**: This CLI is very robust and handles edge cases well.

#### **Problematic CLI Example**
```bash
# Command: bun src/fuzzy-test-cli.ts --file problematic-cli.ts
# Output:
Total Tests: 156
Successful: 98 (62.8%)   ← Too low! Tool exits with code 1
Failed: 58 (37.2%)       ← High failure rate

ERROR TYPES:
  Type conversion failed: 25  ← Investigate type handling
  Validation failed: 15       ← Check custom validators
  Unknown command: 8          ← Expected
  Handler execution failed: 10 ← Logic errors in handlers
```
**Interpretation**: This CLI has significant issues that need investigation.

### Performance Analysis

When `--performance` is enabled, monitor:
```bash
# Look for slow parsing times in verbose output
Average execution time: 15ms  ← May indicate complexity issues
```
- **<5ms**: Excellent performance
- **5-10ms**: Good performance
- **>10ms**: Consider optimization, especially for simple commands

## Best Practices

### File Structure for Testing

Ensure your ArgParser file exports the parser instance:

```typescript
// my-cli.ts
import { ArgParser } from "@alcyone-labs/arg-parser";

export const parser = new ArgParser({
  appName: "My CLI",
  // ... configuration
});

// or as default export
export default parser;
```

**Note**: With the `--s-enable-fuzzy` system flag (v1.1.0+), you no longer need to modify your parser configuration for fuzzy testing. The system flag automatically handles error handling and mandatory flag validation.

### Continuous Integration

Integrate fuzzy testing into your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Fuzzy Tests
  run: |
    bun src/fuzzy-test-cli.ts \
      --file src/my-cli.ts \
      --format json \
      --output fuzzy-results.json
    
    # Fail if success rate is below threshold
    SUCCESS_RATE=$(cat fuzzy-results.json | jq '.successfulTests / .totalTests * 100')
    if (( $(echo "$SUCCESS_RATE < 90" | bc -l) )); then
      echo "Fuzzy test success rate too low: $SUCCESS_RATE%"
      exit 1
    fi
```

### Performance Monitoring

Use fuzzy testing to monitor performance regressions:

```typescript
const report = await tester.runFuzzyTest();
const avgTime = report.results
  .filter(r => r.executionTime)
  .reduce((sum, r) => sum + r.executionTime!, 0) / report.results.length;

if (avgTime > 10) { // 10ms threshold
  console.warn(`Performance regression detected: ${avgTime}ms average`);
}
```

## Examples

### Basic Example

```bash
# Test the getting-started example
bun src/fuzzy-test-cli.ts --file examples/getting-started.ts --verbose
```

### Complex CLI Testing

```bash
# Test a complex CLI with deep nesting
bun src/fuzzy-test-cli.ts \
  --file examples/fzf-search-cli.ts \
  --max-depth 4 \
  --random-tests 15 \
  --format markdown \
  --output fzf-fuzzy-report.md
```

### Custom Test Script

```typescript
// custom-fuzzy-test.ts
import { ArgParserFuzzyTester } from "./src/fuzzy-tester";
import { myComplexParser } from "./src/my-cli";

async function customFuzzyTest() {
  const tester = new ArgParserFuzzyTester(myComplexParser, {
    maxDepth: 6,
    randomTestCases: 25,
    testErrorCases: true,
    verbose: true,
  });
  
  const report = await tester.runFuzzyTest();
  
  // Custom analysis
  const criticalPaths = ["deploy", "migrate", "backup"];
  for (const path of criticalPaths) {
    const pathResults = report.results.filter(r => 
      r.commandPath.includes(path)
    );
    const successRate = pathResults.filter(r => r.success).length / pathResults.length;
    
    if (successRate < 0.95) {
      console.error(`Critical path '${path}' has low success rate: ${successRate * 100}%`);
    }
  }
}

customFuzzyTest();
```

## Troubleshooting

### Common Issues and Solutions

#### **1. "No ArgParser instance found"**
**Problem**: The fuzzy tester can't find your parser instance.
**Solution**: Ensure your file exports the parser as `default`, `parser`, `cli`, `argParser`, or `mainParser`:
```typescript
// ✅ Good - any of these work:
export default parser;
export const parser = new ArgParser({...});
export const cli = new ArgParser({...});
```

#### **2. High Failure Rate (>20%)**
**Problem**: Success rate below 80%, tool exits with error code 1.
**Investigation steps**:
1. Run with `--verbose` to see what's failing
2. Check failed tests for patterns:
   ```bash
   bun src/fuzzy-test-cli.ts --file my-cli.ts --verbose --format json --output results.json
   ```
3. Common causes:
   - **Missing type validation**: Flags accepting invalid types
   - **Incorrect enum definitions**: Enum values not matching expected inputs
   - **Handler errors**: Logic errors in command handlers
   - **Flag conflicts**: Overlapping flag definitions

#### **3. Command Path Coverage Issues**
**Problem**: Some paths show 0 tests or very low coverage.
**Solutions**:
- **0 tests**: Check if subcommands are properly defined
- **Low coverage**: May indicate complex flag requirements
- **Path not found errors**: Verify subcommand structure

#### **4. Performance Issues**
**Problem**: Slow execution times (>10ms average).
**Investigation**:
```bash
# Enable performance monitoring
bun src/fuzzy-test-cli.ts --file my-cli.ts --performance --verbose
```
**Common causes**:
- Complex validation functions
- Heavy handler logic (should be disabled in fuzzy mode)
- Deep command hierarchies

### Debugging Workflow

#### **Step 1: Start Simple**
```bash
# Focus on valid cases first
bun src/fuzzy-test-cli.ts --file my-cli.ts --skip-errors --verbose
```

#### **Step 2: Analyze Patterns**
```bash
# Get detailed JSON output for analysis
bun src/fuzzy-test-cli.ts --file my-cli.ts --format json --output results.json

# Look for patterns in failures
cat results.json | jq '.results[] | select(.success == false) | .error' | sort | uniq -c
```

#### **Step 3: Focus on Critical Paths**
```bash
# Test specific command depth
bun src/fuzzy-test-cli.ts --file my-cli.ts --max-depth 2 --random-tests 5
```

#### **Step 4: Performance Profiling**
```bash
# Monitor execution times
bun src/fuzzy-test-cli.ts --file my-cli.ts --performance --format json | jq '.results[].executionTime' | sort -n
```

### Interpreting Specific Error Messages

| Error Message | Meaning | Action |
|---------------|---------|---------|
| `Unknown command: 'xyz'` | Expected from error case testing | ✅ Normal |
| `Invalid enum value for 'flag'` | Expected from error case testing | ✅ Normal |
| `Missing mandatory flag: 'flag'` | Expected from error case testing | ✅ Normal |
| `Type conversion failed` | Type handling issues | 🔍 Investigate flag type definitions |
| `Validation failed` | Custom validation problems | 🔍 Check custom validation functions |
| `Handler execution failed` | Logic errors in handlers | 🔍 Review handler implementations |
| `Command path not found` | Path discovery bug | 🔍 Check subcommand structure |

## Integration with Testing Frameworks

The fuzzy tester can be integrated with existing test suites:

```typescript
// vitest example
import { describe, it, expect } from 'vitest';
import { ArgParserFuzzyTester } from '../src/fuzzy-tester';
import { myParser } from '../src/my-cli';

describe('ArgParser Fuzzy Tests', () => {
  it('should have high success rate', async () => {
    const tester = new ArgParserFuzzyTester(myParser);
    const report = await tester.runFuzzyTest();
    
    const successRate = report.successfulTests / report.totalTests;
    expect(successRate).toBeGreaterThan(0.9);
  });
  
  it('should handle all command paths', async () => {
    const tester = new ArgParserFuzzyTester(myParser);
    const report = await tester.runFuzzyTest();
    
    // Ensure all paths have some coverage
    for (const [path, coverage] of Object.entries(report.summary.coverageByPath)) {
      expect(coverage.total).toBeGreaterThan(0);
    }
  });
});
```

## Quick Reference

### Success Rate Guidelines
- **90%+**: Excellent CLI health ✅
- **80-89%**: Good, minor issues 🟡
- **<80%**: Needs attention, tool exits with error code 1 🔴

### Expected vs Unexpected Errors

#### **Expected Errors** (count as success)
- `Unknown command`
- `Invalid enum value`
- `Missing mandatory flag`

#### **Unexpected Errors** (investigate these)
- `Type conversion failed`
- `Validation failed`
- `Handler execution failed`

### Quick Commands

```bash
# Basic test
bun src/fuzzy-test-cli.ts --file my-cli.ts

# Focus on valid cases only
bun src/fuzzy-test-cli.ts --file my-cli.ts --skip-errors

# Detailed analysis
bun src/fuzzy-test-cli.ts --file my-cli.ts --verbose --format json --output results.json

# Performance monitoring
bun src/fuzzy-test-cli.ts --file my-cli.ts --performance

# Quick iteration (fewer tests)
bun src/fuzzy-test-cli.ts --file my-cli.ts --max-depth 2 --random-tests 5
```

### CI Integration Threshold

The fuzzy testing CLI automatically fails (exit code 1) when success rate < 80%, making it perfect for CI/CD pipelines to catch regressions.
