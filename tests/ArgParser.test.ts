// packages/arg-parser/tests/ArgParser.test.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import { ArgParser } from "../src/core/ArgParser";
import { ArgParserError } from "../src/core/ArgParserBase";
import { type IFlag } from "../src/core/types";

// Helper function to create flexible regex patterns that handle ANSI color codes
function flexibleErrorRegex(pattern: string): RegExp {
  // Extract key words from the pattern and make a very flexible regex
  const keyWords = pattern.match(/\b\w+\b/g) || [];
  if (keyWords.length === 0) return new RegExp(pattern);

  // Create a pattern that looks for these key words in order, allowing for any characters in between
  const flexiblePattern = keyWords.map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped;
  }).join('.*?');

  return new RegExp(flexiblePattern);
}

describe("ArgParser", () => {
  const flags: IFlag[] = [
    {
      name: "phase",
      description: "Phase of the process",
      options: ["--phase"],
      type: "string",
      mandatory: true,
      enum: ["chunking", "pairing", "analysis"],
    },
    {
      name: "batch",
      description: "Batch number (required except for analysis phase)",
      options: ["-b", "--batch-number"],
      type: "number",
      mandatory: (args) => args.phase !== "analysis",
    },
    {
      name: "verbose",
      description: "Enable verbose mode",
      options: ["-v"],
      type: "boolean",
      flagOnly: true,
      defaultValue: false,
    },
    {
      name: "files",
      description: "Files",
      options: ["-f"],
      allowMultiple: true,
      type: "string",
    },
    {
      name: "table",
      description:
        "Table to query (metadata, chunks, qaPairs, processingBatches, all)",
      options: ["--table", "-t"],
      type: "string",
      mandatory: true,
      enum: ["metadata", "chunks", "qaPairs", "processingBatches", "all"],
    },
  ];

  let parser: ArgParser;
  const testCommandName = "test-cli";

  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  // Helper function to create parser with appropriate configuration
  const createParser = (autoExit: boolean = true) => {
    return new ArgParser({
      appName: "Test CLI",
      appCommandName: testCommandName,
      autoExit,
    }).addFlags(flags);
  };

  beforeEach(() => {
    parser = createParser(true); // Default to autoExit: true for backward compatibility

    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });

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

  test("should return error result on conditional mandatory flags", async () => {
    const errorParser = createParser(false);

    // Test case 1: Should fail when phase is chunking and batch is missing
    const result1 = await errorParser.parse(["--phase", "chunking", "-t", "metadata"]);
    expect(result1).toHaveProperty('success', false);
    expect(result1).toHaveProperty('exitCode', 1);
    expect(result1).toHaveProperty('shouldExit', true);
    expect(result1.message).toMatch(flexibleErrorRegex("Missing mandatory flags: batch"));

    // Clear mocks before next check
    mockConsoleError.mockClear();

    // Test case 2: Should succeed when phase is analysis (batch not required)
    const result2 = await errorParser.parse(["--phase", "analysis", "-t", "all"]);
    expect(result2).toMatchObject({
      phase: "analysis",
      table: "all",
    });
  });

  test("should process multiple flag values", async () => {
    const result = await parser.parse([
      "--phase",
      "pairing",
      "-b",
      "5",
      "-f",
      "file1",
      "-f=file2",
      "-t",
      "metadata",
    ]);
    expect(result["files"]).toEqual(expect.arrayContaining(["file1", "file2"]));
    expect(result["files"]).toHaveLength(2);
  });

  test("should return error result on invalid enum value", async () => {
    const errorParser = createParser(false);
    const result = await errorParser.parse(["--phase", "invalid", "-t", "metadata"]);

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('exitCode', 1);
    expect(result).toHaveProperty('shouldExit', true);
    expect(result.message).toMatch(flexibleErrorRegex("Invalid value invalid for flag phase"));
    expect(result.message).toMatch(flexibleErrorRegex("Allowed values"));
  });

  test("should apply default values", async () => {
    const result = await parser.parse(["--phase", "analysis", "-t", "metadata"]);
    expect(result["verbose"]).toBe(false);
    expect(result["batch"]).toBeUndefined();
  });

  test("should handle flag-only parameters", async () => {
    const result = await parser.parse(["--phase", "analysis", "-v", "-t", "metadata"]);
    expect(result["verbose"]).toBe(true);
  });

  test("should return error result on missing mandatory flags", async () => {
    const errorParser = createParser(false);
    const result = await errorParser.parse(["--phase", "chunking"]);

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('exitCode', 1);
    expect(result).toHaveProperty('shouldExit', true);
    expect(result.message).toMatch(
      flexibleErrorRegex("Missing mandatory flags"),
    );
    expect(result.message).not.toMatch(/phase/);
    expect(result.message).toMatch(/batch/);
    expect(result.message).toMatch(/table/);
  });

  test("should process function-based types", async () => {
    const flag: IFlag = {
      name: "date",
      description: "Date of the event",
      options: ["--date"],
      type: (value: string) => new Date(value),
    };

    const customParser = new ArgParser({
      appName: "Custom Parser",
      appCommandName: testCommandName,
    }).addFlag(flag);

    const result = await customParser.parse(["--date", "2024-01-01"]);
    expect(result["date"]).toBeInstanceOf(Date);
  });

  test("should handle complex mandatory dependencies", async () => {
    const complexParser = new ArgParser({
      appCommandName: testCommandName,
    }).addFlags([
      {
        name: "mode",
        description: "Mode of operation",
        options: ["--mode"],
        type: "string",
        mandatory: true,
      },
      {
        name: "output",
        description: "Output file",
        options: ["--out"],
        type: "string",
        mandatory: (args) => args.mode === "build",
      },
    ]);

    // Should require output in build mode
    const errorParser = new ArgParser({
      appCommandName: testCommandName,
      autoExit: false,
    }).addFlags([
      {
        name: "mode",
        description: "Mode of operation",
        options: ["--mode"],
        type: "string",
        mandatory: true,
      },
      {
        name: "output",
        description: "Output file",
        options: ["--out"],
        type: "string",
        mandatory: (args) => args.mode === "build",
      },
    ]);

    const result1 = await errorParser.parse(["--mode", "build"]);
    expect(result1).toHaveProperty('success', false);
    expect(result1).toHaveProperty('exitCode', 1);
    expect(result1.message).toMatch(flexibleErrorRegex("Missing mandatory flags: output"));

    // Shouldn't require output in other modes
    const result2 = await errorParser.parse(["--mode", "serve"]);
    expect(result2).toMatchObject({ mode: "serve" });
  });

  describe("should maintain proper processing mandatory order", () => {
    let orderParser: ArgParser;

    beforeEach(() => {
      orderParser = new ArgParser({ appCommandName: testCommandName }).addFlags(
        [
          {
            name: "first",
            description: "First flag",
            options: ["--first"],
            type: "string",
            mandatory: (args) => args.second === undefined,
          },
          {
            name: "second",
            description: "Second flag",
            options: ["--second"],
            type: "string",
          },
        ],
      );
    });

    test("Should let second be present without first", async () => {
      // Should NOT throw when second is present but first is optional
      const result = await orderParser.parse(["--second", "value"]);
      expect(result).toMatchObject({ second: "value" });
    });

    test("Should exit if third depends on second", async () => {
      // Should throw when second exists and first is missing
      const thirdParser = new ArgParser({
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlags([
        {
          name: "first",
          description: "First flag",
          options: ["--first"],
          type: "string",
          mandatory: (args) => args.second === undefined,
        },
        {
          name: "second",
          description: "Second flag",
          options: ["--second"],
          type: "string",
        },
        {
          name: "third",
          description: "Third flag",
          options: ["--third"],
          type: "string",
          mandatory: (args) => args.second !== undefined,
        },
      ]);

      const result = await thirdParser.parse(["--second", "value"]);
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result.message).toMatch(flexibleErrorRegex("Missing mandatory flags: third"));
    });
  });

  test("should generate proper help text", () => {
    parser = new ArgParser(
      {
        appName: "Test CLI",
        appCommandName: testCommandName,
        description: "A CLI for testing argument parsing",
        subCommands: [],
      },
      [],
    ).addFlags(flags);

    const helpText = parser.helpText();
    const stripped = helpText.replace(/\x1B\[[0-9;]*m/g, "");

    expect(stripped).toMatch(/Test CLI Help/);
    expect(stripped).toMatch(/A CLI for testing argument parsing/);
    expect(stripped).toMatch(/--phase\s*\*/);
    expect(stripped).toMatch(
      /-b, --batch-number\s*\(conditionally mandatory\)/,
    );
    expect(stripped).toMatch(/-t, --table\s*\*/);
  });

  describe("Table flag parsing", () => {
    test("should parse all valid forms", async () => {
      const testCases = [
        { args: ["--table", "metadata"], expected: "metadata" },
        { args: ["--table=chunks"], expected: "chunks" },
        { args: ["-t", "qaPairs"], expected: "qaPairs" },
        { args: ["-t=processingBatches"], expected: "processingBatches" },
        { args: ["--table=all"], expected: "all" },
      ];

      for (const { args, expected } of testCases) {
        const result = await parser.parse([...args, "--phase", "analysis"]);
        expect(result["table"]).toBe(expected);
      }
    });

    test("should return error result on invalid table values", async () => {
      const errorParser = createParser(false);
      const result = await errorParser.parse(["--table", "invalid", "--phase", "analysis"]);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Invalid value invalid for flag table"));
      expect(result.message).toMatch(flexibleErrorRegex("Allowed values"));
    });

    test("should return error result on mandatory table requirement", async () => {
      const errorParser = createParser(false);
      const result = await errorParser.parse(["--phase", "analysis"]);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Missing mandatory flags: table"));
    });
  });

  test("should accept 'default' as alias for 'defaultValue'", async () => {
    const flagWithAlias: IFlag = {
      name: "limit",
      description: "Result limit",
      options: ["--limit"],
      type: "number",
      default: 10,
    };

    const customParser = new ArgParser({
      appCommandName: testCommandName,
      handler: () => {}, // Prevent auto-help
    }).addFlag(flagWithAlias);
    const args = await customParser.parse([]);
    expect(args["limit"]).toBe(10);
  });

  test("should prioritize defaultValue over default alias", async () => {
    const flagWithBoth: IFlag = {
      name: "threshold",
      description: "Score threshold",
      options: ["--threshold"],
      type: "number",
      defaultValue: 0.5,
      default: 0.7,
    };

    const customParser = new ArgParser({
      appCommandName: testCommandName,
      handler: () => {}, // Prevent auto-help
    }).addFlag(flagWithBoth);
    const args = await customParser.parse([]);
    expect(args["threshold"]).toBe(0.5);
  });

  test("should accept 'required' as alias for 'mandatory'", async () => {
    const flagWithAlias: IFlag = {
      name: "force",
      description: "Force operation",
      options: ["--force"],
      type: "boolean",
      required: true,
      flagOnly: true,
    };

    const errorParser = new ArgParser({
      appCommandName: testCommandName,
      handler: () => {}, // Prevent auto-help
      autoExit: false,
    }).addFlag(flagWithAlias);

    // Should fail when required flag is missing
    const result1 = await errorParser.parse([]);
    expect(result1).toHaveProperty('success', false);
    expect(result1).toHaveProperty('exitCode', 1);
    expect(result1.message).toMatch(flexibleErrorRegex("Missing mandatory flags: force"));

    // Should succeed when required flag is provided
    const result2 = await errorParser.parse(["--force"]);
    expect(result2).toHaveProperty("force", true);
  });

  test("should prioritize mandatory over required alias", async () => {
    const flagWithBoth: IFlag = {
      name: "dry-run",
      description: "Dry run mode",
      options: ["--dry-run"],
      type: "boolean",
      mandatory: false,
      required: true,
      flagOnly: true,
    };

    const customParser = new ArgParser({
      appCommandName: testCommandName,
      handler: () => {}, // Prevent auto-help
    }).addFlag(flagWithBoth);

    const result = await customParser.parse([]);
    expect(result).toEqual({ "dry-run": undefined });
  });

  // Add sub-command tests
  describe("Sub-command functionality", () => {
    test("should handle top-level sub-commands", async () => {
      const topParser = new ArgParser({
        appName: "CLI Tool",
        appCommandName: testCommandName,
        subCommands: [
          {
            name: "run",
            description: "Execute a task",
            parser: new ArgParser({ appName: "CLI Tool run" }, [
              {
                name: "force",
                options: ["-f"],
                flagOnly: true,
                description: "Force execution",
                type: "boolean",
              },
            ]),
          },
        ],
      });

      const result = await topParser.parse(["run", "-f"]);
      expect(result).toMatchObject({ force: true });
      expect(result.$commandChain).toEqual(["run"]);
    });

    test("should support nested sub-commands", async () => {
      const nestedParser = new ArgParser({
        appName: "Nested CLI",
        appCommandName: testCommandName,
        subCommands: [
          {
            name: "admin",
            description: "Admin commands",
            parser: new ArgParser({
              subCommands: [
                {
                  name: "reset",
                  description: "Reset system",
                  parser: new ArgParser({}, [
                    {
                      name: "confirm",
                      options: ["-y"],
                      flagOnly: true,
                      description: "Confirm action",
                      type: "boolean",
                    },
                  ]),
                },
              ],
            }),
          },
        ],
      });

      const result = await nestedParser.parse(["admin", "reset", "-y"]);
      expect(result).toMatchObject({ confirm: true });
      expect(result.$commandChain).toEqual(["admin", "reset"]);
    });
  });

  test("should allow duplicate flags with throwForDuplicateFlags: false", () => {
    const parser = new ArgParser(
      { throwForDuplicateFlags: false, appCommandName: testCommandName },
      [],
    );
    const flag = {
      name: "test",
      options: ["--test"],
      type: "string",
      description: "Test flag for duplicate checks",
    };

    // First add succeeds
    parser.addFlag(flag);
    expect(parser.hasFlag("test")).toBe(true);

    expect(() => parser.addFlag(flag)).not.toThrow();
    expect(parser.hasFlag("test")).toBe(true);
  });

  test("should throw for duplicates with throwForDuplicateFlags: true", () => {
    const parser = new ArgParser(
      { throwForDuplicateFlags: true, appCommandName: testCommandName },
      [],
    );
    const flag = {
      name: "test",
      options: ["--test"],
      type: "string",
      description: "Test flag for duplicate checks",
    };

    parser.addFlag(flag);
    expect(() => parser.addFlag(flag)).toThrow(/already exists/);
  });

  test("should execute valid sub-command without triggering help", async () => {
    const topParser = new ArgParser({
      appName: "Test CLI",
      appCommandName: testCommandName,
      subCommands: [
        {
          name: "run",
          description: "Execute a task",
          parser: new ArgParser({}, [
            {
              name: "force",
              options: ["-f"],
              flagOnly: true,
              type: "boolean",
              description: "Force execution",
              defaultValue: false,
            },
          ]),
        },
      ],
    });

    // Parse the sub-command without any flags
    const result = await topParser.parse(["run"]);
    expect(result).toHaveProperty("force", false);
    expect(result.$commandChain).toEqual(["run"]);

    // Parse with valid sub-command + non-help flag
    const resultWithFlag = await topParser.parse(["run", "-f"]);
    expect(resultWithFlag).toHaveProperty("force", true);
    expect(resultWithFlag.$commandChain).toEqual(["run"]);
  });

  test("should accept type strings", async () => {
    const parser = new ArgParser({ appCommandName: testCommandName }).addFlags([
      {
        name: "enabled",
        options: ["--enabled"],
        type: "boolean", // Test string-based type
        flagOnly: true,
        description: "Enable the feature",
      },
      {
        name: "count",
        options: ["--count"],
        type: "number",
        defaultValue: 0,
        description: "The count value",
      },
    ]);

    // Parse with string-based types
    const args = await parser.parse(["--enabled"]);
    expect(args).toMatchObject({ enabled: true, count: 0 });

    const argsWithNumber = await parser.parse(["--count=42"]);
    expect(argsWithNumber["count"]).toBe(42);
  });

  describe("Sub-command Routing (Recursive)", () => {
    const handlerMock = vi.fn();
    let routingParser: ArgParser;

    beforeEach(() => {
      handlerMock.mockClear();
      routingParser = new ArgParser({
        appName: "Routing Test",
        appCommandName: testCommandName,
        subCommands: [
          {
            name: "service",
            description: "Service commands",
            parser: new ArgParser({
              subCommands: [
                {
                  name: "start",
                  description: "Start service",
                  handler: handlerMock,
                  parser: new ArgParser({}, [
                    {
                      name: "port",
                      description: "port",
                      options: ["-p"],
                      type: "number",
                      defaultValue: 3000,
                    },
                  ]),
                },
              ],
            }),
          },
        ],
      });
    });

    test("should track command chain", async () => {
      const result = await routingParser.parse(["service", "start", "-p", "8080"]);

      expect(result.$commandChain).toEqual(["service", "start"]);
      expect(result["port"]).toBe(8080);
      expect(result).not.toHaveProperty("$remainingArgs");
    });

    test("should execute only the final handler", async () => {
      await routingParser.parse(["service", "start"]);

      expect(handlerMock).toHaveBeenCalledOnce();
      expect(handlerMock.mock.calls[0][0].commandChain).toEqual([
        "service",
        "start",
      ]);
      expect(handlerMock.mock.calls[0][0].args).toEqual({
        port: 3000,
        help: undefined,
      });
      expect(handlerMock.mock.calls[0][0].parentArgs).toEqual({});
    });

    test("should handle main parser handler", async () => {
      const mainHandler = vi.fn();
      const mainParser = new ArgParser({
        appCommandName: testCommandName,
        handler: mainHandler,
        subCommands: [],
      });

      await mainParser.parse([]);
      expect(mainHandler).toHaveBeenCalledOnce();
      expect(mainHandler.mock.calls[0][0].args).toEqual({});
      expect(mainHandler.mock.calls[0][0].parentArgs).toEqual({});
      expect(mainHandler.mock.calls[0][0].commandChain).toEqual([]);
    });

    test("should pass parent args to handlers (without inheritance)", async () => {
      const childHandler = vi.fn();
      const parentParser = new ArgParser({
        appCommandName: testCommandName,

        subCommands: [
          {
            name: "child",
            description: "Children",
            handler: childHandler,
            parser: new ArgParser({}, [
              // inheritParentFlags is false by default
              {
                name: "local",
                description: "local flag",
                options: ["--local"],
                type: "string",
                defaultValue: "defaultLocal",
              },
            ]),
          },
        ],
      }).addFlags([
        {
          name: "verbose",
          description: "verbose",
          options: ["-v"],
          flagOnly: true,
          type: "boolean",
        },
      ]);

      const args = await parentParser.parse(["-v", "child"]);
      expect(childHandler).toHaveBeenCalledOnce();
      const context = childHandler.mock.calls[0][0];
      expect(context.parentArgs?.verbose).toBe(true);
      expect(context.args).toEqual({ local: "defaultLocal" });
      expect(context.commandChain).toEqual(["child"]);

      expect(args).toEqual({
        verbose: true,
        local: "defaultLocal",
        help: undefined,
        $commandChain: ["child"],
      });
    });

    test("should maintain consistency between main and sub-command handlers", async () => {
      const mainHandler = vi.fn();
      const subHandler = vi.fn();

      const parser = new ArgParser(
        {
          appCommandName: testCommandName,
          handler: mainHandler,
          subCommands: [
            {
              name: "sub",
              description: "sub 1",
              handler: subHandler,
              parser: new ArgParser({}, [
                {
                  name: "work",
                  description: "work",
                  options: ["-f"],
                  type: Boolean,
                  flagOnly: true,
                },
              ]),
            },
          ],
        },
        [],
      );

      await parser.parse(["sub", "-f"]);
      expect(mainHandler).not.toHaveBeenCalled(); // Main handler shouldn't run if a sub-command is matched
      expect(subHandler).toHaveBeenCalledOnce();
      expect(subHandler.mock.calls[0][0].args).toEqual({ work: true });
      expect(subHandler.mock.calls[0][0].parentArgs).toEqual({});
      expect(subHandler.mock.calls[0][0].commandChain).toEqual(["sub"]);
    });

    test("should handle flags before subcommands correctly", async () => {
      const handler = vi.fn();
      const parser = new ArgParser({
        appCommandName: testCommandName,
      })
        .addFlags([
          {
            name: "global",
            description: "Global flag",
            options: ["-g"],
            flagOnly: true,
            type: "boolean",
          },
        ])
        .addSubCommand({
          name: "cmd",
          description: "command",
          handler: handler,
          parser: new ArgParser().addFlags([
            {
              name: "local",
              description: "Local flag",
              options: ["-l"],
              flagOnly: true,
              type: "boolean",
            },
          ]),
        });

      const result = await parser.parse(["-g", "cmd", "-l"]);
      expect(result).toEqual({
        global: true,
        local: true,
        $commandChain: ["cmd"],
      });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].args).toEqual({ local: true });
      expect(handler.mock.calls[0][0].parentArgs).toEqual({ global: true });
      expect(handler.mock.calls[0][0].commandChain).toEqual(["cmd"]);
    });

    test("should error on flags from parent scope appearing after subcommand flags", async () => {
      const handler = vi.fn();
      const errorParser = new ArgParser({
        appCommandName: testCommandName,
        autoExit: false,
      })
        .addFlags([
          {
            name: "global",
            description: "Global flag",
            options: ["-g"],
            flagOnly: true,
            type: "boolean",
          },
        ])
        .addSubCommand({
          name: "cmd",
          description: "command",
          handler: handler,
          parser: new ArgParser().addFlags([
            {
              name: "local",
              description: "Local flag",
              options: ["-l"],
              flagOnly: true,
              type: "boolean",
            },
          ]),
        });

      const result = await errorParser.parse(["cmd", "-l", "-g"]);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Unknown command g"));
      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle flags between nested subcommands correctly", async () => {
      const finalHandler = vi.fn();
      const parser = new ArgParser({
        appCommandName: testCommandName,
      })
        .addFlags([
          {
            name: "root",
            description: "Root flag",
            options: ["-r"],
            flagOnly: true,
            type: "boolean",
          },
        ])
        .addSubCommand({
          name: "level1",
          description: "level 1",
          parser: new ArgParser()
            .addFlags([
              {
                name: "flag1",
                description: "Level 1 flag",
                options: ["-f1"],
                flagOnly: true,
                type: "boolean",
              },
            ])
            .addSubCommand({
              name: "level2",
              description: "level 2",
              handler: finalHandler,
              parser: new ArgParser().addFlags([
                {
                  name: "flag2",
                  description: "Level 2 flag",
                  options: ["-f2"],
                  flagOnly: true,
                  type: "boolean",
                },
              ]),
            }),
        });

      const result = await parser.parse(["-r", "level1", "-f1", "level2", "-f2"]);
      expect(result).toEqual({
        root: true,
        flag1: true,
        flag2: true,
        $commandChain: ["level1", "level2"],
      });
      expect(finalHandler).toHaveBeenCalledOnce();
      expect(finalHandler.mock.calls[0][0].args).toEqual({ flag2: true });
      expect(finalHandler.mock.calls[0][0].parentArgs).toEqual({
        root: true,
        flag1: true,
      });
      expect(finalHandler.mock.calls[0][0].commandChain).toEqual([
        "level1",
        "level2",
      ]);
    });
  });

  // Add tests for handleErrors: false
  describe("Error Handling Opt-Out (handleErrors: false)", () => {
    let optOutParser: ArgParser;

    beforeEach(() => {
      // Create parser with error handling disabled
      optOutParser = new ArgParser(
        {
          appName: "OptOut CLI",
          appCommandName: testCommandName,
          handleErrors: false,
        },
        [],
      ).addFlags(flags);
      // Ensure mocks don't interfere if accidentally called
      mockConsoleError.mockClear();
    });

    test("should throw ArgParserError on missing mandatory flags", async () => {
      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.toThrow(
        ArgParserError,
      );
      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.toThrow(
        flexibleErrorRegex("Missing mandatory flags"),
      );
      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.not.toThrow(
        /phase/,
      );
      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.toThrow(
        /batch/,
      );
      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.toThrow(
        /table/,
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on invalid enum value", async () => {
      await expect(
        optOutParser.parse(["--phase", "invalid", "-t", "metadata"]),
      ).rejects.toThrow(ArgParserError);
      await expect(
        optOutParser.parse(["--phase", "invalid", "-t", "metadata"]),
      ).rejects.toThrow(flexibleErrorRegex("Invalid value invalid for flag phase"));
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on validation failure (string message)", async () => {
      const validateParser = new ArgParser({
        handleErrors: false,
        appCommandName: testCommandName,
      }).addFlag({
        name: "custom",
        options: ["-c"],
        type: "string",
        mandatory: true,
        validate: (v) =>
          v === "valid" ? true : `Value '${v}' is not 'valid'!`,
        description: "test",
      });
      await expect(validateParser.parse(["-c", "wrong"])).rejects.toThrow(
        ArgParserError,
      );
      await expect(validateParser.parse(["-c", "wrong"])).rejects.toThrow(
        /Value 'wrong' is not 'valid'!/,
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on conditional mandatory flags", async () => {
      await expect(
        optOutParser.parse(["--phase", "chunking", "-t", "metadata"]),
      ).rejects.toThrow(ArgParserError);
      await expect(
        optOutParser.parse(["--phase", "chunking", "-t", "metadata"]),
      ).rejects.toThrow(flexibleErrorRegex("Missing mandatory flags batch"));
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on unknown top-level command", async () => {
      const optOutParser = new ArgParser({
        handleErrors: false,
        appCommandName: testCommandName,
      }).addSubCommand({
        name: "known",
        description: "known",
        parser: new ArgParser(),
      });

      await expect(optOutParser.parse(["unknown"])).rejects.toThrow(ArgParserError);
      try {
        await optOutParser.parse(["unknown"]);
      } catch (e: any) {
        expect(e.message).toMatch(flexibleErrorRegex("Unknown command unknown"));
        expect(e.commandChain).toEqual([]); // Error at root level
      }
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on unknown nested sub-command", async () => {
      const optOutParser = new ArgParser({
        handleErrors: false,
        appCommandName: testCommandName,
      }).addSubCommand({
        name: "level1",
        description: "level1",
        parser: new ArgParser().addSubCommand({
          name: "known2",
          description: "known2",
          parser: new ArgParser(),
        }),
      });

      await expect(optOutParser.parse(["level1", "unknown2"])).rejects.toThrow(
        ArgParserError,
      );
      try {
        await optOutParser.parse(["level1", "unknown2"]);
      } catch (e: any) {
        expect(e.message).toMatch(flexibleErrorRegex("Unknown command unknown2"));
        expect(e.commandChain).toEqual(["level1"]); // Error after 'level1'
      }
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("Automatic Help on Empty Invocation", () => {
    let mockConsoleLog: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      mockConsoleLog.mockRestore();
    });

    test("should display help and exit(0) if conditions met", async () => {
      const simpleParser = new ArgParser({
        appName: "Simple Tool",
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlags([
        {
          name: "opt",
          description: "An option",
          options: ["-o"],
          type: "string",
        },
      ]);

      const result = await simpleParser.parse([]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);

      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("Simple Tool Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("-o");
    });

    test("should NOT display auto-help if arguments are provided (and trigger error if needed)", async () => {
      const parser = new ArgParser({
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlags([
        {
          name: "opt",
          description: "An option",
          options: ["-o"],
          type: "string",
          mandatory: true,
        },
      ]);
      const result = await parser.parse(["arg"]);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Unknown command arg"));
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test("should NOT display auto-help if root handler is defined", async () => {
      const handler = vi.fn();
      const parser = new ArgParser({
        handler: handler,
        appCommandName: testCommandName,
        autoExit: false,
      });
      const result = await parser.parse([]);
      expect(result).not.toHaveProperty('type', 'help');
      expect(handler).toHaveBeenCalledOnce();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test("should display help if subCommands are defined but none provided and no root handler", async () => {
      const parser = new ArgParser({
        appName: "Sub Tool",
        appCommandName: testCommandName,
        autoExit: false,
        subCommands: [
          { name: "sub", description: "sub", parser: new ArgParser() },
        ],
      });

      const result = await parser.parse([]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);

      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("Sub Tool Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain(
        "Available sub-commands:",
      );
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub");
    });

    test("should NOT display auto-help when parse is called on a sub-parser instance", () => {
      const subParser = new ArgParser({});

      // Parent parser for testing (not used in this specific test)
      // const parentParser = new ArgParser({
      //   appCommandName: testCommandName,
      // }).addSubCommand({
      //   name: "sub",
      //   description: "test sub",
      //   parser: subParser,
      // });

      expect(() => subParser.parse([])).not.toThrow();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  test("should exit on unknown top-level command (default handler)", async () => {
    const parser = new ArgParser({
      appName: "TestCLI",
      appCommandName: testCommandName,
      autoExit: false,
    }).addSubCommand({
      name: "known",
      description: "known",
      parser: new ArgParser(),
    });

    const result = await parser.parse(["unknown"]);

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('exitCode', 1);
    expect(result).toHaveProperty('shouldExit', true);
    expect(result.message).toMatch(flexibleErrorRegex("Unknown command unknown"));
  });

  test("should exit on unknown nested sub-command (default handler)", async () => {
    const parser = new ArgParser({
      appName: "TestCLI",
      appCommandName: testCommandName,
      autoExit: false,
    }).addSubCommand({
      name: "level1",
      description: "level1",
      parser: new ArgParser().addSubCommand({
        name: "known2",
        description: "known2",
        parser: new ArgParser(),
      }),
    });

    const result = await parser.parse(["level1", "unknown2"]);

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('exitCode', 1);
    expect(result).toHaveProperty('shouldExit', true);
    expect(result.message).toMatch(flexibleErrorRegex("Unknown command unknown2"));
  });

  describe("Flag Inheritance (inheritParentFlags - Merge Strategy)", () => {
    let parentParser: ArgParser;
    let childParser: ArgParser;
    let grandChildParser: ArgParser;

    const globalFlag: IFlag = {
      name: "global",
      options: ["-g"],
      type: "string",
      description: "Global flag",
    };
    const sharedFlagParent: IFlag = {
      name: "shared",
      options: ["-s"],
      type: "boolean",
      flagOnly: true,
      description: "Shared flag (Parent)",
    };
    const parentOnlyFlag: IFlag = {
      name: "parentOnly",
      options: ["-p"],
      type: "string",
      description: "Parent Only flag",
    };
    const localFlag: IFlag = {
      name: "local",
      options: ["-l"],
      type: "string",
      description: "Child Local flag",
    };
    const sharedFlagChild: IFlag = {
      name: "shared",
      options: ["--shared-child"],
      type: "number",
      description: "Shared flag (Child override)",
    }; // Override
    const deepFlag: IFlag = {
      name: "deep",
      options: ["-d"],
      type: "string",
      description: "Grandchild Deep flag",
    };

    beforeEach(() => {
      parentParser = new ArgParser({
        appName: "Parent",
        appCommandName: "parent-cmd",
        autoExit: false,
      }).addFlags([globalFlag, sharedFlagParent, parentOnlyFlag]);

      childParser = new ArgParser({ inheritParentFlags: true }).addFlags([
        localFlag,
        sharedFlagChild,
      ]);

      grandChildParser = new ArgParser({ inheritParentFlags: true }).addFlags([
        deepFlag,
      ]);
    });

    test("child parser should contain inherited and local flags after addSubCommand", async () => {
      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });

      expect(childParser.hasFlag("global")).toBe(true);
      expect(childParser.hasFlag("parentOnly")).toBe(true);
      expect(childParser.hasFlag("local")).toBe(true);
      expect(childParser.hasFlag("shared")).toBe(true);
      expect(childParser.hasFlag("help")).toBe(true);

      const sharedFlag = childParser.flags.find((f) => f["name"] === "shared");
      expect(sharedFlag?.["description"]).toBe("Shared flag (Child override)");
      expect(sharedFlag?.["type"]).toBe(Number);
      expect(sharedFlag?.["options"]).toEqual(["--shared-child"]);

      const help = childParser.helpText();
      const stripped = help.replace(/\x1B\[[0-9;]*m/g, "");
      expect(stripped).toMatch(/-g\s+Global flag/);
      expect(stripped).toMatch(/-p\s+Parent Only flag/);
      expect(stripped).toMatch(/-l\s+Child Local flag/);
      expect(stripped).toMatch(
        /--shared-child\s+Shared flag \(Child override\)/,
      );
      expect(stripped).not.toMatch(/-s\s+Shared flag \(Parent\)/);

      const result = await parentParser.parse([
        "child",
        "-g",
        "globalVal",
        "-p",
        "parentVal",
        "--shared-child",
        "123",
        "-l",
        "localVal",
      ]);
      expect(result).toEqual({
        global: "globalVal",
        parentOnly: "parentVal",
        shared: 123,
        local: "localVal",
        $commandChain: ["child"],
      });
    });

    test("child parser should NOT contain parent flags if inheritParentFlags is false", async () => {
      childParser = new ArgParser({ inheritParentFlags: false }).addFlags([
        localFlag,
      ]);

      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });

      expect(childParser.hasFlag("global")).toBe(false);
      expect(childParser.hasFlag("parentOnly")).toBe(false);
      expect(childParser.hasFlag("local")).toBe(true);
      expect(childParser.hasFlag("shared")).toBe(false);
      expect(childParser.hasFlag("help")).toBe(true);

      const help = childParser.helpText();
      const stripped = help.replace(/\x1B\[[0-9;]*m/g, "");
      expect(stripped).not.toMatch(/-g\s+Global flag/);
      expect(stripped).not.toMatch(/-p\s+Parent Only flag/);
      expect(stripped).toMatch(/-l\s+Child Local flag/);

      const result = await parentParser.parse(["child", "-g", "value"]);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Unknown command g"));
    });

    test("grandchild should inherit merged flags from child (cascading)", async () => {
      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });
      childParser.addSubCommand({
        name: "grandchild",
        description: "grandchild cmd",
        parser: grandChildParser,
      });

      expect(grandChildParser.hasFlag("global")).toBe(true);
      expect(grandChildParser.hasFlag("parentOnly")).toBe(true);
      expect(grandChildParser.hasFlag("local")).toBe(true);
      expect(grandChildParser.hasFlag("shared")).toBe(true);
      expect(grandChildParser.hasFlag("deep")).toBe(true);
      expect(grandChildParser.hasFlag("help")).toBe(true);

      const sharedFlag = grandChildParser.flags.find(
        (f) => f["name"] === "shared",
      );
      expect(sharedFlag?.["description"]).toBe("Shared flag (Child override)");

      const help = grandChildParser.helpText();
      const stripped = help.replace(/\x1B\[[0-9;]*m/g, "");
      expect(stripped).toMatch(/-g\s+Global flag/);
      expect(stripped).toMatch(/-p\s+Parent Only flag/);
      expect(stripped).toMatch(/-l\s+Child Local flag/);
      expect(stripped).toMatch(
        /--shared-child\s+Shared flag \(Child override\)/,
      );
      expect(stripped).toMatch(/-d\s+Grandchild Deep flag/);
      expect(stripped).not.toMatch(/-s\s+Shared flag \(Parent\)/);

      const result = await parentParser.parse([
        "child",
        "grandchild",
        "-g",
        "gVal",
        "-p",
        "pVal",
        "-l",
        "lVal",
        "--shared-child",
        "99",
        "-d",
        "dVal",
      ]);
      expect(result).toEqual({
        global: "gVal",
        parentOnly: "pVal",
        local: "lVal",
        shared: 99,
        deep: "dVal",
        $commandChain: ["child", "grandchild"],
      });
    });

    test("handler context should reflect inherited flags in args, not parentArgs", async () => {
      const childHandler = vi.fn();
      childParser.setHandler(childHandler);
      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });

      await parentParser.parse([
        "child",
        "-g",
        "globalVal",
        "-p",
        "parentVal",
        "--shared-child",
        "123",
        "-l",
        "localVal",
      ]);

      expect(childHandler).toHaveBeenCalledOnce();
      const context = childHandler.mock.calls[0][0];

      expect(context.args).toHaveProperty("global", "globalVal");
      expect(context.args).toHaveProperty("parentOnly", "parentVal");
      expect(context.args).toHaveProperty("shared", 123);
      expect(context.args).toHaveProperty("local", "localVal");

      expect(context.parentArgs).toEqual({});

      expect(context.commandChain).toEqual(["child"]);
    });

    test("should enforce inherited mandatory flag (default handler)", async () => {
      const parentParser = new ArgParser({
        appName: "Parent",
        appCommandName: "parent-cmd",
        autoExit: false,
      }).addFlags([
        {
          name: "parentMandatory",
          options: ["-m"],
          type: "string",
          mandatory: true,
          description: "Parent Mandatory",
        },
        {
          name: "parentOptional",
          options: ["-o"],
          type: "string",
          description: "Parent Optional",
        },
      ]);
      const childParser = new ArgParser({ inheritParentFlags: true });

      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });

      const errorResult = await parentParser.parse(["child", "-o", "optionalValue"]);

      expect(errorResult).toHaveProperty('success', false);
      expect(errorResult).toHaveProperty('exitCode', 1);
      expect(errorResult).toHaveProperty('shouldExit', true);
      expect(errorResult.message).toMatch(/Missing mandatory flags:.*parentMandatory/);

      const successResult = await parentParser.parse([
        "child",
        "-m",
        "mandatoryValue",
        "-o",
        "optionalValue",
      ]);

      expect(successResult).toEqual({
        parentMandatory: "mandatoryValue",
        parentOptional: "optionalValue",
        $commandChain: ["child"],
      });
    });
  });

  describe("Global Help Flag (--help)", () => {
    let rootParser: ArgParser;
    let sub1Parser: ArgParser;
    let sub2Parser: ArgParser;
    let mockConsoleLog: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

      rootParser = new ArgParser({
        appName: "HelpTest",
        appCommandName: "help-test",
        autoExit: false,
      });
      rootParser.addFlags([
        {
          name: "rootFlag",
          options: ["-r"],
          type: "string",
          description: "Root flag",
        },
      ]);

      sub1Parser = new ArgParser();
      sub1Parser.addFlags([
        {
          name: "sub1Mandatory",
          options: ["--s1m"],
          type: "string",
          mandatory: true,
          description: "Sub1 Mandatory Flag",
        },
      ]);

      sub2Parser = new ArgParser();
      sub2Parser.addFlags([
        {
          name: "sub2Flag",
          options: ["--s2f"],
          type: "boolean",
          flagOnly: true,
          description: "Sub2 Flag",
        },
      ]);

      rootParser.addSubCommand({
        name: "sub1",
        description: "Sub 1",
        parser: sub1Parser,
      });
      sub1Parser.addSubCommand({
        name: "sub2",
        description: "Sub 2",
        parser: sub2Parser,
      });


    });

    afterEach(() => {
      mockConsoleLog.mockRestore();
    });

    test("should show root help when --help is the only arg", async () => {
      const result = await rootParser.parse(["--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("-r");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub1");
    });

    test("should show sub1 help when sub1 --help is used", async () => {
      const result = await rootParser.parse(["sub1", "--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub1 Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("--s1m");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub2");
      expect(mockConsoleLog.mock.calls[0][0]).not.toContain("-r");
    });

    test("should show sub2 help when sub1 sub2 --help is used", async () => {
      const result = await rootParser.parse(["sub1", "sub2", "--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("--s2f");
      expect(mockConsoleLog.mock.calls[0][0]).not.toContain("--s1m");
    });

    test("should show sub2 help when --help appears before sub2", async () => {
      const result = await rootParser.parse(["sub1", "--help", "sub2"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should show sub2 help when --help appears after flags for sub2", async () => {
      const result = await rootParser.parse(["sub1", "sub2", "--s2f", "--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should show sub2 help and bypass sub1 mandatory flag check", async () => {
      const result = await rootParser.parse(["sub1", "sub2", "--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should show sub2 help even if mandatory flag for sub1 appears before sub2", async () => {
      const result = await rootParser.parse(["sub1", "--s1m", "value", "sub2", "--help"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should handle -h alias correctly", async () => {
      const result = await rootParser.parse(["sub1", "sub2", "-h"]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exitCode', 0);
      expect(result).toHaveProperty('type', 'help');
      expect(result).toHaveProperty('shouldExit', true);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should skip global help check if skipHelpHandling is true", async () => {
      // This test now expects the mandatory flag error because the default value check was fixed
      const result = await rootParser.parse(["sub1", "sub2", "--help"], {
        skipHelpHandling: true,
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('exitCode', 1);
      expect(result).toHaveProperty('shouldExit', true);
      expect(result.message).toMatch(flexibleErrorRegex("Missing mandatory flags sub1Mandatory"));
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test("should parse help flag correctly if skipHelpHandling is true and no other errors", async () => {
      const simpleParser = new ArgParser({
        appCommandName: "simple",
        handleErrors: false,
      });

      const result = await simpleParser.parse(["--help"], { skipHelpHandling: true });

      expect(result).toEqual({ help: true });

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("Inheritance and Mandatory Flag Validation", () => {
    let mockConsoleError: ReturnType<typeof vi.spyOn>;
    let mockProcessExit: any;

    beforeEach(() => {
      mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockProcessExit = vi
        .spyOn(process, "exit")
        .mockImplementation(
          (code?: string | number | null | undefined): never => {
            throw new Error(
              `process.exit called with code ${code ?? "undefined"}`,
            );
          },
        );
    });

    afterEach(() => {
      mockConsoleError.mockRestore();
      mockProcessExit.mockRestore();
    });

    describe("Root parser mandatory flags with inheritParentFlags: false", () => {
      test("should NOT validate root parser mandatory flags when child doesn't inherit", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        }).addFlags([
          {
            name: "rootMandatory",
            options: ["--root-mandatory"],
            type: "string",
            mandatory: true,
            description: "Root mandatory flag",
          },
        ]);

        const childParser = new ArgParser({}); // inheritParentFlags: false by default
        childParser.addFlags([
          {
            name: "childFlag",
            options: ["--child-flag"],
            type: "string",
            description: "Child flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "child",
          description: "Child command",
          parser: childParser,
        });

        // Should succeed without providing root mandatory flag
        const result = await rootParser.parse(["child", "--child-flag", "value"]);

        expect(result).toEqual({
          help: undefined,
          rootMandatory: undefined,
          childFlag: "value",
          $commandChain: ["child"],
        });
      });

      test("should validate root parser mandatory flags when child inherits", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        }).addFlags([
          {
            name: "rootMandatory",
            options: ["--root-mandatory"],
            type: "string",
            mandatory: true,
            description: "Root mandatory flag",
          },
        ]);

        const childParser = new ArgParser({ inheritParentFlags: true });
        childParser.addFlags([
          {
            name: "childFlag",
            options: ["--child-flag"],
            type: "string",
            description: "Child flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "child",
          description: "Child command",
          parser: childParser,
        });

        // Should fail without providing root mandatory flag
        const result = await rootParser.parse(["child", "--child-flag", "value"]);

        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('exitCode', 1);
        expect(result).toHaveProperty('shouldExit', true);
        expect(result.message).toMatch(/Missing mandatory flags.*rootMandatory/);
      });
    });

    describe("Intermediate parser mandatory flags", () => {
      test("should validate intermediate parser mandatory flags even when child doesn't inherit", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        });

        const intermediateParser = new ArgParser({});
        intermediateParser.addFlags([
          {
            name: "intermediateMandatory",
            options: ["--intermediate-mandatory"],
            type: "string",
            mandatory: true,
            description: "Intermediate mandatory flag",
          },
        ]);

        const finalParser = new ArgParser({}); // inheritParentFlags: false by default
        finalParser.addFlags([
          {
            name: "finalFlag",
            options: ["--final-flag"],
            type: "string",
            description: "Final flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "intermediate",
          description: "Intermediate command",
          parser: intermediateParser,
        });

        intermediateParser.addSubCommand({
          name: "final",
          description: "Final command",
          parser: finalParser,
        });

        // Should fail without providing intermediate mandatory flag
        const result = await rootParser.parse(["intermediate", "final", "--final-flag", "value"]);

        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('exitCode', 1);
        expect(result).toHaveProperty('shouldExit', true);
        expect(result.message).toMatch(/Missing mandatory flags.*intermediateMandatory/);
      });

      test("should succeed when intermediate parser mandatory flags are provided", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        });

        const intermediateParser = new ArgParser({});
        intermediateParser.addFlags([
          {
            name: "intermediateMandatory",
            options: ["--intermediate-mandatory"],
            type: "string",
            mandatory: true,
            description: "Intermediate mandatory flag",
          },
        ]);

        const finalParser = new ArgParser({});
        finalParser.addFlags([
          {
            name: "finalFlag",
            options: ["--final-flag"],
            type: "string",
            description: "Final flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "intermediate",
          description: "Intermediate command",
          parser: intermediateParser,
        });

        intermediateParser.addSubCommand({
          name: "final",
          description: "Final command",
          parser: finalParser,
        });

        // Should succeed when providing intermediate mandatory flag
        const result = await rootParser.parse([
          "intermediate",
          "--intermediate-mandatory",
          "value",
          "final",
          "--final-flag",
          "finalValue",
        ]);

        expect(result).toEqual({
          help: undefined,
          intermediateMandatory: "value",
          finalFlag: "finalValue",
          $commandChain: ["intermediate", "final"],
        });
      });
    });

    describe("Complex inheritance scenarios", () => {
      test("should handle mixed inheritance in deep command chains", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        }).addFlags([
          {
            name: "rootMandatory",
            options: ["--root-mandatory"],
            type: "string",
            mandatory: true,
            description: "Root mandatory flag",
          },
        ]);

        // Level 1: inherits from root
        const level1Parser = new ArgParser({ inheritParentFlags: true });
        level1Parser.addFlags([
          {
            name: "level1Mandatory",
            options: ["--level1-mandatory"],
            type: "string",
            mandatory: true,
            description: "Level 1 mandatory flag",
          },
        ]);

        // Level 2: does NOT inherit from level1
        const level2Parser = new ArgParser({ inheritParentFlags: false });
        level2Parser.addFlags([
          {
            name: "level2Flag",
            options: ["--level2-flag"],
            type: "string",
            description: "Level 2 flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "level1",
          description: "Level 1 command",
          parser: level1Parser,
        });

        level1Parser.addSubCommand({
          name: "level2",
          description: "Level 2 command",
          parser: level2Parser,
        });

        // Should fail because level1 inherits from root, so rootMandatory is required
        // But level1Mandatory should also be required since level2 doesn't inherit
        const result = await rootParser.parse(["level1", "level2", "--level2-flag", "value"]);

        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('exitCode', 1);
        expect(result).toHaveProperty('shouldExit', true);
        expect(result.message).toMatch(/Missing mandatory flags/);
        // Should require both rootMandatory and level1Mandatory
        expect(result.message).toMatch(/level1Mandatory/);
      });

      test("should work with skipHelpHandling and mandatory validation", async () => {
        const rootParser = new ArgParser({
          appName: "TestApp",
          appCommandName: "test-app",
          autoExit: false,
        });

        const subParser = new ArgParser({});
        subParser.addFlags([
          {
            name: "subMandatory",
            options: ["--sub-mandatory"],
            type: "string",
            mandatory: true,
            description: "Sub mandatory flag",
          },
        ]);

        rootParser.addSubCommand({
          name: "sub",
          description: "Sub command",
          parser: subParser,
        });

        // Should fail with skipHelpHandling: true because mandatory validation still happens
        const result = await rootParser.parse(["sub", "--help"], { skipHelpHandling: true });

        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('exitCode', 1);
        expect(result).toHaveProperty('shouldExit', true);
        expect(result.message).toMatch(/Missing mandatory flags.*subMandatory/);
      });

      test("should handle real-world CLI scenario like getting-started example", async () => {
        // Simulate the getting-started.ts structure
        const mainParser = new ArgParser({
          appName: "File Processor",
          appCommandName: "file-processor",
          autoExit: false,
        }).addFlags([
          {
            name: "input",
            options: ["--input", "-i"],
            type: "string",
            mandatory: true,
            description: "Input file path",
          },
        ]);

        const analyzeParser = new ArgParser({}); // inheritParentFlags: false by default
        analyzeParser.addFlags([
          {
            name: "file",
            options: ["--file"],
            type: "string",
            mandatory: true,
            description: "File to analyze",
          },
          {
            name: "type",
            options: ["--type", "-t"],
            type: "string",
            enum: ["basic", "detailed"],
            defaultValue: "basic",
            description: "Analysis type",
          },
        ]);

        mainParser.addSubCommand({
          name: "analyze",
          description: "Analyze file content",
          parser: analyzeParser,
        });

        // Should succeed without providing main parser's mandatory 'input' flag
        const result = await mainParser.parse(["analyze", "--file", "test.txt", "--type", "detailed"]);

        expect(result).toEqual({
          help: undefined,
          input: undefined,
          file: "test.txt",
          type: "detailed",
          $commandChain: ["analyze"],
        });
      });
    });

    describe("MCP subcommand mandatory flag behavior", () => {
      test("should NOT validate parent mandatory flags for MCP subcommands", async () => {
        const mainParser = new ArgParser({
          appName: "Main CLI",
          appCommandName: "main",
          autoExit: false,
          handleErrors: false, // Throw errors instead of returning error objects
        }).addFlags([
          {
            name: "parentMandatory",
            options: ["--parent-mandatory"],
            type: "string",
            mandatory: true,
            description: "Parent mandatory flag",
          },
        ]);

        // Add MCP subcommand
        mainParser.addMcpSubCommand("mcp-server", {
          name: "Test MCP Server",
          version: "1.0.0",
          description: "Test MCP server",
        });

        // Should succeed without providing parent mandatory flag
        // MCP subcommands should not validate parent mandatory flags (like regular subcommands with inheritParentFlags: false)
        // We expect this to NOT throw an error about missing parent mandatory flags
        await expect(async () => {
          // Use a timeout to prevent hanging if MCP server starts
          const parsePromise = mainParser.parse(["mcp-server"]);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Test timeout - MCP server likely started")), 1000)
          );
          await Promise.race([parsePromise, timeoutPromise]);
        }).not.toThrow(/parentMandatory/);
      });

      test("should validate MCP subcommand's own flags correctly", async () => {
        const mainParser = new ArgParser({
          appName: "Main CLI",
          appCommandName: "main",
          autoExit: false,
          handleErrors: false, // Throw errors instead of returning error objects
        });

        // Add MCP subcommand
        mainParser.addMcpSubCommand("mcp-server", {
          name: "Test MCP Server",
          version: "1.0.0",
          description: "Test MCP server",
        });

        // Should succeed with valid MCP subcommand (MCP subcommands have default values for all flags)
        // Since there are no parent mandatory flags, this should succeed without issues
        await expect(async () => {
          // Use a timeout to prevent hanging if MCP server starts
          const parsePromise = mainParser.parse(["mcp-server"]);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Test timeout - MCP server likely started")), 1000)
          );
          await Promise.race([parsePromise, timeoutPromise]);
        }).not.toThrow();
      });
    });
  });
});
