import type { IArgParser, ISubCommand, ProcessedFlag } from "../core/types";

export interface FuzzyTestOptions {
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

export interface TestResult {
  commandPath: string[];
  args: string[];
  success: boolean;
  error?: string;
  executionTime?: number;
  parsedResult?: any;
}

export interface FuzzyTestReport {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  commandPaths: string[][];
  results: TestResult[];
  summary: {
    coverageByPath: Record<string, { total: number; passed: number }>;
    errorTypes: Record<string, number>;
  };
}

export class ArgParserFuzzyTester {
  private parser: IArgParser;
  private options: Required<FuzzyTestOptions>;

  constructor(parser: IArgParser, options: FuzzyTestOptions = {}) {
    this.parser = parser;
    this.options = {
      maxDepth: options.maxDepth ?? 5,
      randomTestCases: options.randomTestCases ?? 10,
      includePerformance: options.includePerformance ?? true,
      testErrorCases: options.testErrorCases ?? true,
      verbose: options.verbose ?? false,
    };
  }

  /**
   * Run comprehensive fuzzy testing on the ArgParser instance
   */
  async runFuzzyTest(): Promise<FuzzyTestReport> {
    const commandPaths = this.discoverCommandPaths();
    const results: TestResult[] = [];

    if (this.options.verbose) {
      this.parser.logger.info(
        `Discovered ${commandPaths.length} command paths:`,
      );
      commandPaths.forEach((path) =>
        this.parser.logger.info(`  ${path.join(" ") || "(root)"}`),
      );
    }

    for (const commandPath of commandPaths) {
      const pathResults = await this.testCommandPath(commandPath);
      results.push(...pathResults);
    }

    return this.generateReport(commandPaths, results);
  }

  /**
   * Discover all possible command paths in the parser
   */
  private discoverCommandPaths(): string[][] {
    const paths: string[][] = [];

    // Add root path
    paths.push([]);

    // Recursively discover subcommand paths
    this.discoverSubCommandPaths(this.parser, [], paths, 0);

    return paths;
  }

  /**
   * Recursively discover subcommand paths
   */
  private discoverSubCommandPaths(
    parser: IArgParser,
    currentPath: string[],
    allPaths: string[][],
    depth: number,
  ): void {
    if (depth >= this.options.maxDepth) return;

    const subCommands = this.getSubCommands(parser);

    for (const [subCommandName, subCommand] of subCommands) {
      const newPath = [...currentPath, subCommandName];
      allPaths.push(newPath);

      // Recursively explore this subcommand's subcommands
      this.discoverSubCommandPaths(
        subCommand.parser,
        newPath,
        allPaths,
        depth + 1,
      );
    }
  }

  /**
   * Get subcommands from a parser instance
   */
  private getSubCommands(parser: IArgParser): Map<string, ISubCommand> {
    return parser.getSubCommands();
  }

  /**
   * Get flags from a parser instance
   */
  private getFlags(parser: IArgParser): ProcessedFlag[] {
    return parser.flags;
  }

  /**
   * Test a specific command path with various flag combinations
   */
  private async testCommandPath(commandPath: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const targetParser = this.getParserForPath(commandPath);
    const flags = this.getFlags(targetParser);

    if (this.options.verbose) {
      this.parser.logger.info(
        `Testing command path: ${commandPath.join(" ") || "(root)"}`,
      );
    }

    // Test valid combinations
    const validCombinations = this.generateValidFlagCombinations(flags);
    for (const flagArgs of validCombinations) {
      const fullArgs = [...commandPath, ...flagArgs];
      const result = await this.executeTest(fullArgs, commandPath);
      results.push(result);
    }

    // Test random combinations
    for (let i = 0; i < this.options.randomTestCases; i++) {
      const randomArgs = this.generateRandomFlagCombination(flags);
      const fullArgs = [...commandPath, ...randomArgs];
      const result = await this.executeTest(fullArgs, commandPath);
      results.push(result);
    }

    // Test error cases if enabled
    if (this.options.testErrorCases) {
      const errorCases = this.generateErrorCases(flags);
      for (const errorArgs of errorCases) {
        const fullArgs = [...commandPath, ...errorArgs];
        const result = await this.executeTest(fullArgs, commandPath, true);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get the parser instance for a specific command path
   */
  private getParserForPath(commandPath: string[]): IArgParser {
    let currentParser = this.parser;

    for (const command of commandPath) {
      const subCommands = this.getSubCommands(currentParser);
      const subCommand = subCommands.get(command);
      if (!subCommand) {
        throw new Error(`Command path not found: ${commandPath.join(" ")}`);
      }
      currentParser = subCommand.parser;
    }

    return currentParser;
  }

  /**
   * Generate valid flag combinations for testing
   */
  private generateValidFlagCombinations(flags: ProcessedFlag[]): string[][] {
    const combinations: string[][] = [];

    // Separate mandatory and optional flags
    const mandatoryFlags = flags.filter(
      (f) =>
        f["name"] !== "help" &&
        (typeof f["mandatory"] === "boolean" ? f["mandatory"] : false),
    );
    const optionalFlags = flags.filter(
      (f) =>
        f["name"] !== "help" &&
        (typeof f["mandatory"] === "boolean" ? !f["mandatory"] : true),
    );

    // Generate base combination with all mandatory flags
    const mandatoryArgs: string[] = [];
    for (const flag of mandatoryFlags) {
      const flagArgs = this.generateFlagArgs(flag, "valid");
      mandatoryArgs.push(...flagArgs);
    }

    // Test with just mandatory flags
    if (mandatoryArgs.length > 0) {
      combinations.push([...mandatoryArgs]);
    } else {
      // Test with no flags if no mandatory flags exist
      combinations.push([]);
    }

    // Test each optional flag individually (with mandatory flags)
    for (const flag of optionalFlags) {
      const flagArgs = this.generateFlagArgs(flag, "valid");
      if (flagArgs.length > 0) {
        combinations.push([...mandatoryArgs, ...flagArgs]);
      }
    }

    // Test combinations of optional flags (with mandatory flags)
    if (optionalFlags.length > 1) {
      // Test pairs of optional flags
      for (let i = 0; i < optionalFlags.length - 1; i++) {
        for (let j = i + 1; j < optionalFlags.length; j++) {
          const flag1Args = this.generateFlagArgs(optionalFlags[i], "valid");
          const flag2Args = this.generateFlagArgs(optionalFlags[j], "valid");
          if (flag1Args.length > 0 && flag2Args.length > 0) {
            combinations.push([...mandatoryArgs, ...flag1Args, ...flag2Args]);
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Generate random flag combination
   */
  private generateRandomFlagCombination(flags: ProcessedFlag[]): string[] {
    const args: string[] = [];
    const availableFlags = flags.filter((f) => f["name"] !== "help");

    // Randomly select flags to include
    for (const flag of availableFlags) {
      if (Math.random() < 0.3) {
        // 30% chance to include each flag
        const flagArgs = this.generateFlagArgs(flag, "random");
        args.push(...flagArgs);
      }
    }

    return args;
  }

  /**
   * Generate error test cases
   */
  private generateErrorCases(flags: ProcessedFlag[]): string[][] {
    const errorCases: string[][] = [];

    // Test invalid flag names
    errorCases.push(["--invalid-flag"]);
    errorCases.push(["--nonexistent", "value"]);

    // Test flags with wrong types
    for (const flag of flags) {
      if (flag["name"] === "help") continue;

      const invalidArgs = this.generateFlagArgs(flag, "invalid");
      if (invalidArgs.length > 0) {
        errorCases.push(invalidArgs);
      }
    }

    return errorCases;
  }

  /**
   * Generate arguments for a specific flag
   */
  private generateFlagArgs(
    flag: ProcessedFlag,
    mode: "valid" | "invalid" | "random",
  ): string[] {
    const option = flag["options"][0]; // Use first option
    if (!option) return [];

    if (flag["flagOnly"]) {
      return [option];
    }

    const values = this.generateFlagValues(flag, mode);
    const args: string[] = [];

    for (const value of values) {
      if (flag["allowLigature"] && Math.random() < 0.5) {
        args.push(`${option}=${value}`);
      } else {
        args.push(option, value);
      }
    }

    return args;
  }

  /**
   * Generate values for a flag based on its type and constraints
   */
  private generateFlagValues(
    flag: ProcessedFlag,
    mode: "valid" | "invalid" | "random",
  ): string[] {
    const count =
      flag["allowMultiple"] && mode !== "invalid"
        ? Math.floor(Math.random() * 3) + 1
        : 1;

    const values: string[] = [];

    for (let i = 0; i < count; i++) {
      values.push(this.generateSingleFlagValue(flag, mode));
    }

    return values;
  }

  /**
   * Generate a single value for a flag
   */
  private generateSingleFlagValue(
    flag: ProcessedFlag,
    mode: "valid" | "invalid" | "random",
  ): string {
    if (mode === "invalid") {
      // Generate intentionally invalid values
      if (flag["type"] === Number) return "not-a-number";
      if (flag["enum"] && flag["enum"].length > 0) return "invalid-enum-value";
      if (flag["type"] === Boolean) return "not-boolean";
      return "invalid-value";
    }

    // Handle enum values
    if (flag["enum"] && flag["enum"].length > 0) {
      const randomIndex = Math.floor(Math.random() * flag["enum"].length);
      return String(flag["enum"][randomIndex]);
    }

    // Generate values based on type
    if (flag["type"] === Number) {
      return String(Math.floor(Math.random() * 1000));
    }

    if (flag["type"] === Boolean) {
      return Math.random() < 0.5 ? "true" : "false";
    }

    // Default to string
    const testStrings = [
      "test-value",
      "hello-world",
      "file.txt",
      "/path/to/file",
      "user@example.com",
      "123",
      "special-chars-!@#",
    ];

    return testStrings[Math.floor(Math.random() * testStrings.length)];
  }

  /**
   * Execute a single test case
   */
  private async executeTest(
    args: string[],
    commandPath: string[],
    expectError: boolean = false,
  ): Promise<TestResult> {
    const startTime = this.options.includePerformance ? Date.now() : 0;

    try {
      // Store the original input arguments for logging visibility
      const originalArgs = [...args];

      const testResult = this.parser.parse(args, {
        skipHelpHandling: true,
      });

      // Store original args in the result for logging
      if (testResult && typeof testResult === "object") {
        (testResult as any)._originalInputArgs = originalArgs;
      }

      const executionTime = this.options.includePerformance
        ? Date.now() - startTime
        : undefined;

      return {
        commandPath,
        args,
        success: !expectError,
        parsedResult: testResult,
        executionTime,
      };
    } catch (error) {
      const executionTime = this.options.includePerformance
        ? Date.now() - startTime
        : undefined;

      return {
        commandPath,
        args,
        success: expectError,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(
    commandPaths: string[][],
    results: TestResult[],
  ): FuzzyTestReport {
    const totalTests = results.length;
    const successfulTests = results.filter((r) => r.success).length;
    const failedTests = totalTests - successfulTests;

    // Coverage by path
    const coverageByPath: Record<string, { total: number; passed: number }> =
      {};
    for (const path of commandPaths) {
      const pathKey = path.join(" ") || "(root)";
      const pathResults = results.filter(
        (r) => JSON.stringify(r.commandPath) === JSON.stringify(path),
      );
      coverageByPath[pathKey] = {
        total: pathResults.length,
        passed: pathResults.filter((r) => r.success).length,
      };
    }

    // Error types
    const errorTypes: Record<string, number> = {};
    for (const result of results) {
      if (result.error) {
        const errorType = result.error.split(":")[0] || "Unknown";
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    }

    return {
      totalTests,
      successfulTests,
      failedTests,
      commandPaths,
      results,
      summary: {
        coverageByPath,
        errorTypes,
      },
    };
  }
}
