import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArgParser, ArgParserError, type IFlag } from "../src";

const testCommandName = "test-cli";

function flexibleErrorRegex(message: string): RegExp {
  const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escapedMessage, "i");
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
      description: "Table to query",
      options: ["--table", "-t"],
      type: "string",
      mandatory: true,
      enum: ["metadata", "chunks", "qaPairs", "processingBatches", "all"],
    },
  ];

  let parser: ArgParser;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockProcessExit: any;

  const createParser = (autoExit: boolean = true) => {
    return new ArgParser({
      appName: "Test CLI",
      appCommandName: testCommandName,
      autoExit,
    }).addFlags(flags);
  };

  beforeEach(() => {
    parser = createParser(true);
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe("Basic Flag Parsing", () => {
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

    test("should process multiple flag values", async () => {
      const result = await parser.parse([
        "--phase",
        "analysis",
        "-t",
        "all",
        "-f",
        "file1.txt",
        "-f",
        "file2.txt",
      ]);
      expect(result.files).toEqual(["file1.txt", "file2.txt"]);
    });

    test("should apply default values", async () => {
      const result = await parser.parse([
        "--phase",
        "analysis",
        "-t",
        "metadata",
      ]);
      expect(result.verbose).toBe(false);
    });

    test("should handle flag-only parameters", async () => {
      const result = await parser.parse([
        "--phase",
        "analysis",
        "-t",
        "metadata",
        "-v",
      ]);
      expect(result.verbose).toBe(true);
    });

    test("should process function-based types", async () => {
      const customParser = new ArgParser({
        appName: "Custom CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlag({
        name: "custom",
        description: "Custom parser",
        options: ["--custom"],
        type: (value: string) => value.toUpperCase(),
      });

      const result = await customParser.parse(["--custom", "hello"]);
      expect(result.custom).toBe("HELLO");
    });
  });

  describe("Error Handling", () => {
    test("should return error result on missing mandatory flags", async () => {
      await expect(() => parser.parse(["--phase", "chunking"])).rejects.toThrow(
        "process.exit called",
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(flexibleErrorRegex("Missing mandatory flags")),
      );
    });

    test("should return error result on invalid enum value", async () => {
      await expect(() =>
        parser.parse(["--phase", "invalid", "-t", "metadata"]),
      ).rejects.toThrow("process.exit called");
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(flexibleErrorRegex("Invalid value")),
      );
    });

    test("should return error result on conditional mandatory flags", async () => {
      const errorParser = createParser(false);

      const result = await errorParser.parse([
        "--phase",
        "chunking",
        "-t",
        "metadata",
      ]);
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("exitCode", 1);
      expect(result.message).toMatch(
        flexibleErrorRegex("Missing mandatory flags: batch"),
      );
    });

    test("should throw ArgParserError when handleErrors is false", async () => {
      const optOutParser = new ArgParser({
        appName: "OptOut CLI",
        appCommandName: testCommandName,
        handleErrors: false,
      }).addFlags(flags);

      await expect(optOutParser.parse(["--phase", "chunking"])).rejects.toThrow(
        ArgParserError,
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("Table Flag Parsing", () => {
    test("should parse all valid table forms", async () => {
      const testCases = [
        { args: ["--table", "metadata"], expected: "metadata" },
        { args: ["--table", "chunks"], expected: "chunks" },
        { args: ["-t", "qaPairs"], expected: "qaPairs" },
      ];

      for (const { args, expected } of testCases) {
        const result = await parser.parse([...args, "--phase", "analysis"]);
        expect(result["table"]).toBe(expected);
      }
    });

    test("should return error result on invalid table values", async () => {
      const errorParser = createParser(false);
      const result = await errorParser.parse([
        "--table",
        "invalid",
        "--phase",
        "analysis",
      ]);

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("exitCode", 1);
      expect(result.message).toMatch(flexibleErrorRegex("Invalid value"));
    });
  });

  describe("Sub-command Functionality", () => {
    test("should handle top-level sub-commands", async () => {
      const subParser = new ArgParser({
        appName: "Sub Command",
        handler: async (ctx) => ({ subResult: ctx.args.data }),
      }).addFlag({
        name: "data",
        description: "Data to process",
        options: ["--data"],
        type: "string",
        mandatory: true,
      });

      const mainParser = new ArgParser({
        appName: "Main CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addSubCommand({
        name: "process",
        description: "Process data",
        parser: subParser,
      });

      const result = await mainParser.parse(["process", "--data", "test"]);
      expect(result.subResult).toBe("test");
    });

    test("should support nested sub-commands", async () => {
      const deepParser = new ArgParser({
        appName: "Deep Command",
        handler: async (ctx) => ({ deep: true, value: ctx.args.value }),
      }).addFlag({
        name: "value",
        description: "Value to set",
        options: ["--value"],
        type: "string",
        mandatory: true,
      });

      const midParser = new ArgParser({
        appName: "Mid Command",
      }).addSubCommand({
        name: "deep",
        description: "Deep nested command",
        parser: deepParser,
      });

      const rootParser = new ArgParser({
        appName: "Root CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addSubCommand({
        name: "mid",
        description: "Mid level command",
        parser: midParser,
      });

      const result = await rootParser.parse(["mid", "deep", "--value", "test"]);
      expect(result.deep).toBe(true);
      expect(result.value).toBe("test");
    });

    test("should exit on unknown top-level command", async () => {
      const commandParser = new ArgParser({
        appName: "Command CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addSubCommand({
        name: "known",
        description: "known",
        parser: new ArgParser(),
      });

      const result = await commandParser.parse(["unknown"]);
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("exitCode", 1);
      expect(result.message).toMatch(flexibleErrorRegex("Unknown command"));
    });
  });

  describe("Help Functionality", () => {
    test("should generate proper help text", () => {
      const helpText = parser.helpText();
      expect(helpText).toContain("Test CLI");
      expect(helpText).toContain("--phase");
      expect(helpText).toContain("--batch-number");
    });

    test("should show help on --help flag", async () => {
      const mockConsoleLog = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const helpParser = new ArgParser({
        appName: "Help CLI",
        appCommandName: testCommandName,
        autoExit: false,
      });

      const result = await helpParser.parse(["--help"]);
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("type", "help");
      expect(mockConsoleLog).toHaveBeenCalled();

      mockConsoleLog.mockRestore();
    });

    test("should show subcommand help", async () => {
      const mockConsoleLog = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const subParser = new ArgParser({
        appName: "Sub Command",
      }).addFlag({
        name: "subflag",
        description: "Sub flag",
        options: ["--subflag"],
        type: "string",
      });

      const helpParser = new ArgParser({
        appName: "Help CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addSubCommand({
        name: "sub",
        description: "Sub command",
        parser: subParser,
      });

      const result = await helpParser.parse(["sub", "--help"]);
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("type", "help");

      mockConsoleLog.mockRestore();
    });
  });

  describe("Flag Inheritance", () => {
    test("should inherit parent flags when enabled", async () => {
      const parentParser = new ArgParser({
        appName: "Parent CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlag({
        name: "global",
        description: "Global flag",
        options: ["--global"],
        type: "string",
        defaultValue: "default",
      });

      const childParser = new ArgParser({
        appName: "Child CLI",
        inheritParentFlags: true,
        handler: async (ctx) => ({ result: ctx.args }),
      }).addFlag({
        name: "local",
        description: "Local flag",
        options: ["--local"],
        type: "string",
        mandatory: true,
      });

      parentParser.addSubCommand({
        name: "child",
        description: "Child command",
        parser: childParser,
      });

      const result = await parentParser.parse([
        "child",
        "--global",
        "test",
        "--local",
        "value",
      ]);

      expect(result.result.global).toBe("test");
      expect(result.result.local).toBe("value");
    });

    test("should NOT validate parent mandatory flags when child doesn't inherit", async () => {
      const parentParser = new ArgParser({
        appName: "Parent CLI",
        appCommandName: testCommandName,
        autoExit: false,
      }).addFlag({
        name: "parentMandatory",
        description: "Parent mandatory flag",
        options: ["--parent"],
        type: "string",
        mandatory: true,
      });

      const childParser = new ArgParser({
        appName: "Child CLI",
        inheritParentFlags: false,
        handler: async (ctx) => ({ result: "success" }),
      });

      parentParser.addSubCommand({
        name: "child",
        description: "Child command",
        parser: childParser,
      });

      const result = await parentParser.parse(["child"]);
      expect(result.result).toBe("success");
    });
  });

  describe("Duplicate Flags", () => {
    test("should allow duplicate flags with throwForDuplicateFlags: false", () => {
      const duplicateParser = new ArgParser({
        appName: "Duplicate CLI",
        appCommandName: testCommandName,
        throwForDuplicateFlags: false,
      });

      expect(() => {
        duplicateParser
          .addFlag({
            name: "test",
            description: "Test flag",
            options: ["--test"],
            type: "string",
          })
          .addFlag({
            name: "test",
            description: "Test flag 2",
            options: ["--test2"],
            type: "string",
          });
      }).not.toThrow();
    });

    test("should throw for duplicates with throwForDuplicateFlags: true", () => {
      const duplicateParser = new ArgParser({
        appName: "Duplicate CLI",
        appCommandName: testCommandName,
        throwForDuplicateFlags: true,
      });

      expect(() => {
        duplicateParser
          .addFlag({
            name: "test",
            description: "Test flag",
            options: ["--test"],
            type: "string",
          })
          .addFlag({
            name: "test",
            description: "Test flag 2",
            options: ["--test2"],
            type: "string",
          });
      }).toThrow();
    });
  });

  describe("Automatic Help on Empty Invocation", () => {
    test("should display help and exit(0) if conditions met", async () => {
      const mockConsoleLog = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const autoHelpParser = new ArgParser({
        appName: "Auto Help CLI",
        appCommandName: testCommandName,
        autoExit: false,
      });

      const result = await autoHelpParser.parse([]);
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("exitCode", 0);
      expect(result).toHaveProperty("type", "help");

      mockConsoleLog.mockRestore();
    });

    test("should NOT display auto-help if root handler is defined", async () => {
      const handlerParser = new ArgParser({
        appName: "Handler CLI",
        appCommandName: testCommandName,
        autoExit: false,
        handler: async (ctx) => ({ result: "handled" }),
      });

      const result = await handlerParser.parse([]);
      expect(result.result).toBe("handled");
    });
  });
});
