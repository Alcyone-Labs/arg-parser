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
import { ArgParser, ArgParserError } from "../src/ArgParser";
import { type IFlag } from "../src/types";

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
  let mockProcessExit: MockInstance<
    (code?: string | number | null | undefined) => never
  >;

  beforeEach(() => {
    parser = new ArgParser({
      appName: "Test CLI",
      appCommandName: testCommandName,
    }).addFlags(flags);

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

  test("should parse basic flags", () => {
    const args = parser.parse([
      "--phase",
      "pairing",
      "-b",
      "42",
      "-t",
      "chunks",
    ]);
    expect(args).toMatchObject({
      phase: "pairing",
      batch: 42,
      verbose: false,
      files: [],
      table: "chunks",
    });
    expect(mockProcessExit).not.toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  test("should exit on conditional mandatory flags (default handler)", () => {
    // Should require batch number for non-analysis phases
    expect(
      () => parser.parse(["--phase", "chunking", "-t", "metadata"]),
      "Throw when phase is chunking",
    ).toThrow("process.exit called with code 1");
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Missing mandatory flags: batch/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );

    // Clear mocks before next check
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    expect(
      () => parser.parse(["--phase", "analysis", "-t", "all"]),
      "Not throw when phase is analysis",
    ).not.toThrow();
    expect(mockProcessExit).not.toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  test("should process multiple flag values", () => {
    const args = parser.parse([
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
    expect(args["files"]?.slice().sort()).toEqual(["file1", "file2"]);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should exit on invalid enum value (default handler)", () => {
    expect(() =>
      parser.parse(["--phase", "invalid", "-t", "metadata"]),
    ).toThrow("process.exit called with code 1");

    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Invalid value 'invalid' for flag 'phase'/,
    );
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Allowed values: 'chunking', 'pairing', 'analysis'/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );
  });

  test("should apply default values", () => {
    const args = parser.parse(["--phase", "analysis", "-t", "metadata"]);
    expect(args["verbose"]).toBe(false);
    expect(args["batch"]).toBeUndefined();
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should handle flag-only parameters", () => {
    const args = parser.parse(["--phase", "analysis", "-v", "-t", "metadata"]);
    expect(args["verbose"]).toBe(true);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should exit on missing mandatory flags (default handler)", () => {
    expect(() => parser.parse(["--phase", "chunking"])).toThrow(
      "process.exit called with code 1",
    );

    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Missing mandatory flags:/,
    );
    expect(mockConsoleError.mock.calls[0][0]).not.toMatch(/phase/);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(/batch/);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(/table/);
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );
  });

  test("should process function-based types", () => {
    const flag: IFlag = {
      name: "date",
      description: "Date of the event",
      options: ["--date"],
      type: (value: string) => new Date(value),
    };
    const customParser = new ArgParser({
      appCommandName: testCommandName,
    }).addFlag(flag);

    const args = customParser.parse(["--date", "2024-01-01"]);
    expect(args["date"]).toBeInstanceOf(Date);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should handle complex mandatory dependencies (default handler)", () => {
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
    expect(() => complexParser.parse(["--mode", "build"])).toThrow(
      "process.exit called with code 1",
    );
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Missing mandatory flags: output/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );

    // Clear mocks
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    // Shouldn't require output in other modes
    expect(() => complexParser.parse(["--mode", "serve"])).not.toThrow();
    expect(mockProcessExit).not.toHaveBeenCalled();
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

    test("Should let second be present without first", () => {
      // Should NOT throw when second is present but first is optional
      expect(
        () => orderParser.parse(["--second", "value"]),
        "Should let second be present without first",
      ).not.toThrow();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("Should exit if third depends on second (default handler)", () => {
      // Should throw when second exists and first is missing
      const thirdParser = new ArgParser({
        appCommandName: testCommandName,
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
      expect(
        () => thirdParser.parse(["--second", "value"]),
        "Should exit if third is missing when second exists",
      ).toThrow("process.exit called with code 1");
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Missing mandatory flags: third/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        new RegExp(`Try '${testCommandName} --help' for usage details.`),
      );
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
    test("should parse all valid forms", () => {
      const testCases = [
        { args: ["--table", "metadata"], expected: "metadata" },
        { args: ["--table=chunks"], expected: "chunks" },
        { args: ["-t", "qaPairs"], expected: "qaPairs" },
        { args: ["-t=processingBatches"], expected: "processingBatches" },
        { args: ["--table=all"], expected: "all" },
      ];

      for (const { args, expected } of testCases) {
        const result = parser.parse([...args, "--phase", "analysis"]);
        expect(result["table"]).toBe(expected);
      }
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should exit on invalid table values (default handler)", () => {
      expect(() =>
        parser.parse(["--table", "invalid", "--phase", "analysis"]),
      ).toThrow("process.exit called with code 1");
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Invalid value 'invalid' for flag 'table'/,
      );
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Allowed values: 'metadata', 'chunks', 'qaPairs', 'processingBatches', 'all'/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        new RegExp(`Try '${testCommandName} --help' for usage details.`),
      );
    });

    test("should exit on mandatory table requirement (default handler)", () => {
      expect(() => parser.parse(["--phase", "analysis"])).toThrow(
        "process.exit called with code 1",
      );
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Missing mandatory flags: table/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        new RegExp(`Try '${testCommandName} --help' for usage details.`),
      );
    });
  });

  test("should accept 'default' as alias for 'defaultValue'", () => {
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
    const args = customParser.parse([]);
    expect(args["limit"]).toBe(10);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should prioritize defaultValue over default alias", () => {
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
    const args = customParser.parse([]);
    expect(args["threshold"]).toBe(0.5);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should accept 'required' as alias for 'mandatory' (default handler)", () => {
    const flagWithAlias: IFlag = {
      name: "force",
      description: "Force operation",
      options: ["--force"],
      type: "boolean",
      required: true,
      flagOnly: true,
    };

    const customParser = new ArgParser({
      appCommandName: testCommandName,
      handler: () => {}, // Prevent auto-help
    }).addFlag(flagWithAlias);

    expect(() => customParser.parse([])).toThrow(
      "process.exit called with code 1",
    );
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Missing mandatory flags: force/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );

    // Clear mocks
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    expect(customParser.parse(["--force"])).toHaveProperty("force", true);
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should prioritize mandatory over required alias", () => {
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

    expect(() => customParser.parse([])).not.toThrow();
    expect(mockProcessExit).not.toHaveBeenCalled();

    expect(customParser.parse([])).toEqual({ "dry-run": undefined });
  });

  // Add sub-command tests
  describe("Sub-command functionality", () => {
    test("should handle top-level sub-commands", () => {
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

      const result = topParser.parse(["run", "-f"]);
      expect(result).toMatchObject({ force: true });
      expect(result.$commandChain).toEqual(["run"]);
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should support nested sub-commands", () => {
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

      const result = nestedParser.parse(["admin", "reset", "-y"]);
      expect(result).toMatchObject({ confirm: true });
      expect(result.$commandChain).toEqual(["admin", "reset"]);
      expect(mockProcessExit).not.toHaveBeenCalled();
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
    expect(mockProcessExit).not.toHaveBeenCalled();
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
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should execute valid sub-command without triggering help", () => {
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
    const result = topParser.parse(["run"]);
    expect(result).toHaveProperty("force", false);
    expect(result.$commandChain).toEqual(["run"]);

    // Parse with valid sub-command + non-help flag
    const resultWithFlag = topParser.parse(["run", "-f"]);
    expect(resultWithFlag).toHaveProperty("force", true);
    expect(resultWithFlag.$commandChain).toEqual(["run"]);

    expect(() => topParser.parse(["run"])).not.toThrow();
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  test("should accept type strings", () => {
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
    const args = parser.parse(["--enabled"]);
    expect(args).toMatchObject({ enabled: true, count: 0 });

    const argsWithNumber = parser.parse(["--count=42"]);
    expect(argsWithNumber["count"]).toBe(42);
    expect(mockProcessExit).not.toHaveBeenCalled();
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

    test("should track command chain", () => {
      const result = routingParser.parse(["service", "start", "-p", "8080"]);

      expect(result.$commandChain).toEqual(["service", "start"]);
      expect(result["port"]).toBe(8080);
      expect(result).not.toHaveProperty("$remainingArgs");
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should execute only the final handler", () => {
      routingParser.parse(["service", "start"]);

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
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should handle main parser handler", () => {
      const mainHandler = vi.fn();
      const mainParser = new ArgParser({
        appCommandName: testCommandName,
        handler: mainHandler,
        subCommands: [],
      });

      mainParser.parse([]);
      expect(mainHandler).toHaveBeenCalledOnce();
      expect(mainHandler.mock.calls[0][0].args).toEqual({});
      expect(mainHandler.mock.calls[0][0].parentArgs).toEqual({});
      expect(mainHandler.mock.calls[0][0].commandChain).toEqual([]);
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should pass parent args to handlers (without inheritance)", () => {
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

      const args = parentParser.parse(["-v", "child"]);
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
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should maintain consistency between main and sub-command handlers", () => {
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

      parser.parse(["sub", "-f"]);
      expect(mainHandler).not.toHaveBeenCalled(); // Main handler shouldn't run if a sub-command is matched
      expect(subHandler).toHaveBeenCalledOnce();
      expect(subHandler.mock.calls[0][0].args).toEqual({ work: true });
      expect(subHandler.mock.calls[0][0].parentArgs).toEqual({});
      expect(subHandler.mock.calls[0][0].commandChain).toEqual(["sub"]);
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should handle flags before subcommands correctly", () => {
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

      const result = parser.parse(["-g", "cmd", "-l"]);
      expect(result).toEqual({
        global: true,
        local: true,
        $commandChain: ["cmd"],
      });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].args).toEqual({ local: true });
      expect(handler.mock.calls[0][0].parentArgs).toEqual({ global: true });
      expect(handler.mock.calls[0][0].commandChain).toEqual(["cmd"]);
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should error on flags from parent scope appearing after subcommand flags", () => {
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

      expect(() => parser.parse(["cmd", "-l", "-g"])).toThrow(
        "process.exit called with code 1",
      );

      expect(handler).not.toHaveBeenCalled();

      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Unknown command: '-g'/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        new RegExp(`Try '${testCommandName} cmd --help' for usage details.`),
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test("should handle flags between nested subcommands correctly", () => {
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

      const result = parser.parse(["-r", "level1", "-f1", "level2", "-f2"]);
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
      expect(mockProcessExit).not.toHaveBeenCalled();
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
      mockProcessExit.mockClear();
    });

    test("should throw ArgParserError on missing mandatory flags", () => {
      expect(() => optOutParser.parse(["--phase", "chunking"])).toThrow(
        ArgParserError,
      );
      expect(() => optOutParser.parse(["--phase", "chunking"])).toThrow(
        /Missing mandatory flags:/,
      );
      expect(() => optOutParser.parse(["--phase", "chunking"])).not.toThrow(
        /phase/,
      );
      expect(() => optOutParser.parse(["--phase", "chunking"])).toThrow(
        /batch/,
      );
      expect(() => optOutParser.parse(["--phase", "chunking"])).toThrow(
        /table/,
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on invalid enum value", () => {
      expect(() =>
        optOutParser.parse(["--phase", "invalid", "-t", "metadata"]),
      ).toThrow(ArgParserError);
      expect(() =>
        optOutParser.parse(["--phase", "invalid", "-t", "metadata"]),
      ).toThrow(/Invalid value 'invalid' for flag 'phase'/);
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on validation failure (string message)", () => {
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
      expect(() => validateParser.parse(["-c", "wrong"])).toThrow(
        ArgParserError,
      );
      expect(() => validateParser.parse(["-c", "wrong"])).toThrow(
        /Value 'wrong' is not 'valid'!/,
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on conditional mandatory flags", () => {
      expect(() =>
        optOutParser.parse(["--phase", "chunking", "-t", "metadata"]),
      ).toThrow(ArgParserError);
      expect(() =>
        optOutParser.parse(["--phase", "chunking", "-t", "metadata"]),
      ).toThrow(/Missing mandatory flags: batch/);
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on unknown top-level command", () => {
      const optOutParser = new ArgParser({
        handleErrors: false,
        appCommandName: testCommandName,
      }).addSubCommand({
        name: "known",
        description: "known",
        parser: new ArgParser(),
      });

      expect(() => optOutParser.parse(["unknown"])).toThrow(ArgParserError);
      try {
        optOutParser.parse(["unknown"]);
      } catch (e: any) {
        expect(e.message).toMatch(/Unknown command: 'unknown'/);
        expect(e.commandChain).toEqual([]); // Error at root level
      }
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should throw ArgParserError on unknown nested sub-command", () => {
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

      expect(() => optOutParser.parse(["level1", "unknown2"])).toThrow(
        ArgParserError,
      );
      try {
        optOutParser.parse(["level1", "unknown2"]);
      } catch (e: any) {
        expect(e.message).toMatch(/Unknown command: 'unknown2'/);
        expect(e.commandChain).toEqual(["level1"]); // Error after 'level1'
      }
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
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

    test("should display help and exit(0) if conditions met", () => {
      const simpleParser = new ArgParser({
        appName: "Simple Tool",
        appCommandName: testCommandName,
      }).addFlags([
        {
          name: "opt",
          description: "An option",
          options: ["-o"],
          type: "string",
        },
      ]);

      mockProcessExit.mockRestore();
      let exitCode: number | undefined = undefined;
      mockProcessExit = vi
        .spyOn(process, "exit")
        .mockImplementation(
          (code?: string | number | null | undefined): never => {
            if (typeof code === "string") {
              const num = parseInt(code, 10);
              exitCode = isNaN(num) ? 1 : num;
            } else if (code === null) {
              exitCode = 0;
            } else {
              exitCode = code;
            }
            throw new Error(
              `process.exit called with code ${code ?? "undefined"}`,
            );
          },
        );

      expect(() => simpleParser.parse([])).toThrow(
        /process.exit called with code 0/,
      );

      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("Simple Tool Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("-o");

      expect(exitCode).toBe(0);
    });

    test("should NOT display auto-help if arguments are provided (and trigger error if needed)", () => {
      const parser = new ArgParser({
        appCommandName: testCommandName,
      }).addFlags([
        {
          name: "opt",
          description: "An option",
          options: ["-o"],
          type: "string",
          mandatory: true,
        },
      ]);
      expect(() => parser.parse(["arg"])).toThrow(
        "process.exit called with code 1",
      );
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Unknown command: 'arg'/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        new RegExp(`Try '${testCommandName} --help' for usage details.`),
      );
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test("should NOT display auto-help if root handler is defined", () => {
      const handler = vi.fn();
      const parser = new ArgParser({
        handler: handler,
        appCommandName: testCommandName,
      });
      expect(() => parser.parse([])).not.toThrow();
      expect(handler).toHaveBeenCalledOnce();
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should display help if subCommands are defined but none provided and no root handler", () => {
      const parser = new ArgParser({
        appName: "Sub Tool",
        appCommandName: testCommandName,
        subCommands: [
          { name: "sub", description: "sub", parser: new ArgParser() },
        ],
      });

      mockProcessExit.mockRestore();
      let exitCode: number | undefined = undefined;
      mockProcessExit = vi
        .spyOn(process, "exit")
        .mockImplementation(
          (code?: string | number | null | undefined): never => {
            if (typeof code === "string") {
              const num = parseInt(code, 10);
              exitCode = isNaN(num) ? 1 : num;
            } else if (code === null) {
              exitCode = 0;
            } else {
              exitCode = code;
            }
            throw new Error(
              `process.exit called with code ${code ?? "undefined"}`,
            );
          },
        );

      expect(() => parser.parse([])).toThrow(/process.exit called with code 0/);

      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("Sub Tool Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain(
        "Available sub-commands:",
      );
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub");

      expect(exitCode).toBe(0);
    });

    test("should NOT display auto-help when parse is called on a sub-parser instance", () => {
      const subParser = new ArgParser({});

      const parentParser = new ArgParser({
        appCommandName: testCommandName,
      }).addSubCommand({
        name: "sub",
        description: "test sub",
        parser: subParser,
      });

      expect(() => subParser.parse([])).not.toThrow();

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  test("should exit on unknown top-level command (default handler)", () => {
    const parser = new ArgParser({
      appName: "TestCLI",
      appCommandName: testCommandName,
    }).addSubCommand({
      name: "known",
      description: "known",
      parser: new ArgParser(),
    });

    expect(() => parser.parse(["unknown"])).toThrow(
      "process.exit called with code 1",
    );
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Unknown command: 'unknown'/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} --help' for usage details.`),
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("should exit on unknown nested sub-command (default handler)", () => {
    const parser = new ArgParser({
      appName: "TestCLI",
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

    expect(() => parser.parse(["level1", "unknown2"])).toThrow(
      "process.exit called with code 1",
    );
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError.mock.calls[0][0]).toMatch(
      /Error: Unknown command: 'unknown2'/,
    );
    expect(mockConsoleError.mock.calls[1][0]).toMatch(
      new RegExp(`Try '${testCommandName} level1 --help' for usage details.`),
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
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
      }).addFlags([globalFlag, sharedFlagParent, parentOnlyFlag]);

      childParser = new ArgParser({ inheritParentFlags: true }).addFlags([
        localFlag,
        sharedFlagChild,
      ]);

      grandChildParser = new ArgParser({ inheritParentFlags: true }).addFlags([
        deepFlag,
      ]);
    });

    test("child parser should contain inherited and local flags after addSubCommand", () => {
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

      const sharedFlag = childParser.flags.find((f) => f.name === "shared");
      expect(sharedFlag?.description).toBe("Shared flag (Child override)");
      expect(sharedFlag?.type).toBe(Number);
      expect(sharedFlag?.options).toEqual(["--shared-child"]);

      const help = childParser.helpText();
      const stripped = help.replace(/\x1B\[[0-9;]*m/g, "");
      expect(stripped).toMatch(/-g\s+Global flag/);
      expect(stripped).toMatch(/-p\s+Parent Only flag/);
      expect(stripped).toMatch(/-l\s+Child Local flag/);
      expect(stripped).toMatch(
        /--shared-child\s+Shared flag \(Child override\)/,
      );
      expect(stripped).not.toMatch(/-s\s+Shared flag \(Parent\)/);

      const result = parentParser.parse([
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
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("child parser should NOT contain parent flags if inheritParentFlags is false", () => {
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

      expect(() => parentParser.parse(["child", "-g", "value"])).toThrow(
        "process.exit called with code 1",
      );
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Unknown command: '-g'/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        /Try 'parent-cmd child --help' for usage details./,
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test("grandchild should inherit merged flags from child (cascading)", () => {
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
        (f) => f.name === "shared",
      );
      expect(sharedFlag?.description).toBe("Shared flag (Child override)");

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

      const result = parentParser.parse([
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
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("handler context should reflect inherited flags in args, not parentArgs", () => {
      const childHandler = vi.fn();
      childParser.setHandler(childHandler);
      parentParser.addSubCommand({
        name: "child",
        description: "child cmd",
        parser: childParser,
      });

      parentParser.parse([
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
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test("should enforce inherited mandatory flag (default handler)", () => {
      const parentParser = new ArgParser({
        appName: "Parent",
        appCommandName: "parent-cmd",
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

      expect(() =>
        parentParser.parse(["child", "-o", "optionalValue"]),
      ).toThrow("process.exit called with code 1");

      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Missing mandatory flags: parentMandatory/,
      );
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        /Try 'parent-cmd child --help' for usage details./,
      );

      mockConsoleError.mockClear();
      mockProcessExit.mockClear();

      expect(() =>
        parentParser.parse([
          "child",
          "-m",
          "mandatoryValue",
          "-o",
          "optionalValue",
        ]),
      ).not.toThrow();

      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();

      const result = parentParser.parse([
        "child",
        "-m",
        "mandatoryValue",
        "-o",
        "optionalValue",
      ]);
      expect(result).toEqual({
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

      mockProcessExit.mockRestore();
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
      mockConsoleLog.mockRestore();
    });

    test("should show root help when --help is the only arg", () => {
      expect(() => rootParser.parse(["--help"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("-r");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub1");
    });

    test("should show sub1 help when sub1 --help is used", () => {
      expect(() => rootParser.parse(["sub1", "--help"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub1 Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("--s1m");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("sub2");
      expect(mockConsoleLog.mock.calls[0][0]).not.toContain("-r");
    });

    test("should show sub2 help when sub1 sub2 --help is used", () => {
      expect(() => rootParser.parse(["sub1", "sub2", "--help"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleLog.mock.calls[0][0]).toContain("--s2f");
      expect(mockConsoleLog.mock.calls[0][0]).not.toContain("--s1m");
    });

    test("should show sub2 help when --help appears before sub2", () => {
      expect(() => rootParser.parse(["sub1", "--help", "sub2"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should show sub2 help when --help appears after flags for sub2", () => {
      expect(() =>
        rootParser.parse(["sub1", "sub2", "--s2f", "--help"]),
      ).toThrow(/process.exit called with code 0/);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should show sub2 help and bypass sub1 mandatory flag check", () => {
      expect(() => rootParser.parse(["sub1", "sub2", "--help"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should show sub2 help even if mandatory flag for sub1 appears before sub2", () => {
      expect(() =>
        rootParser.parse(["sub1", "--s1m", "value", "sub2", "--help"]),
      ).toThrow(/process.exit called with code 0/);
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test("should handle -h alias correctly", () => {
      expect(() => rootParser.parse(["sub1", "sub2", "-h"])).toThrow(
        /process.exit called with code 0/,
      );
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleLog.mock.calls[0][0]).toContain("HelpTest sub2 Help");
    });

    test("should skip global help check if skipHelpHandling is true", () => {
      // This test now expects the mandatory flag error because the default value check was fixed
      expect(() =>
        rootParser.parse(["sub1", "sub2", "--help"], {
          skipHelpHandling: true,
        }),
      ).toThrow(/process.exit called with code 1/);

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleError.mock.calls[0][0]).toMatch(
        /Error: Missing mandatory flags: sub1Mandatory/,
      );
      // Update this line:
      expect(mockConsoleError.mock.calls[1][0]).toMatch(
        /Try 'help-test sub1 sub2 --help' for usage details./,
      );
    });

    test("should parse help flag correctly if skipHelpHandling is true and no other errors", () => {
      const simpleParser = new ArgParser({
        appCommandName: "simple",
        handleErrors: false,
      });

      const result = simpleParser.parse(["--help"], { skipHelpHandling: true });

      expect(result).toEqual({ help: true });

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });
});
