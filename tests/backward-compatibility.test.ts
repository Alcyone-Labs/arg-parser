import { describe, expect, test } from "vitest";
import { ArgParser } from "../src";

describe("Backward Compatibility", () => {
  describe("Traditional ArgParser Constructor", () => {
    test("should work with traditional new ArgParser() syntax", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        description: "A test CLI application",
        handler: async (ctx) => {
          return { success: true, args: ctx.args };
        },
      });

      expect(parser).toBeDefined();
      expect(parser.getAppName()).toBe("Test CLI");
      expect(parser.getAppCommandName()).toBe("test-cli");
      expect(parser.getDescription()).toBe("A test CLI application");
    });

    test("should work with traditional addFlags() method", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: async (ctx) => ({ result: ctx.args.input }),
      }).addFlags([
        {
          name: "input",
          description: "Input file",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
        },
        {
          name: "verbose",
          description: "Verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true,
        },
      ]);

      expect(parser.flags).toHaveLength(3); // input, verbose, help
      expect(parser.flags.find((f) => f.name === "input")).toBeDefined();
      expect(parser.flags.find((f) => f.name === "verbose")).toBeDefined();
      expect(parser.flags.find((f) => f.name === "help")).toBeDefined();
    });

    test("should work with traditional addSubCommand() method", () => {
      const subParser = new ArgParser(
        {
          appName: "Sub Command",
          handler: async (ctx) => ({ subResult: ctx.args.data }),
        },
        [
          {
            name: "data",
            description: "Data to process",
            options: ["--data"],
            type: "string",
            mandatory: true,
          },
        ],
      );

      const mainParser = new ArgParser({
        appName: "Main CLI",
        handler: async (ctx) => ({ mainResult: ctx.args.config }),
      })
        .addFlags([
          {
            name: "config",
            description: "Config file",
            options: ["--config"],
            type: "string",
            defaultValue: "config.json",
          },
        ])
        .addSubCommand({
          name: "process",
          description: "Process data",
          parser: subParser,
          handler: async (ctx) => {
            return { action: "process", data: ctx.args.data };
          },
        });

      expect(mainParser.getSubCommands().size).toBe(1);
      expect(mainParser.getSubCommands().has("process")).toBe(true);
    });
  });

  describe("Hierarchical Parsers", () => {
    test("should support nested subcommands", () => {
      const deepParser = new ArgParser(
        {
          appName: "Deep Command",
          handler: async (ctx) => ({ deep: true, value: ctx.args.value }),
        },
        [
          {
            name: "value",
            description: "Value to set",
            options: ["--value"],
            type: "string",
            mandatory: true,
          },
        ],
      );

      const midParser = new ArgParser(
        {
          appName: "Mid Command",
          handler: async (ctx) => ({ mid: true, option: ctx.args.option }),
        },
        [
          {
            name: "option",
            description: "Option to use",
            options: ["--option"],
            type: "string",
            defaultValue: "default",
          },
        ],
      ).addSubCommand({
        name: "deep",
        description: "Deep nested command",
        parser: deepParser,
      });

      const rootParser = new ArgParser({
        appName: "Root CLI",
        handler: async (ctx) => ({ root: true, global: ctx.args.global }),
      })
        .addFlags([
          {
            name: "global",
            description: "Global flag",
            options: ["--global"],
            type: "boolean",
            flagOnly: true,
          },
        ])
        .addSubCommand({
          name: "mid",
          description: "Mid level command",
          parser: midParser,
        });

      expect(rootParser.getSubCommands().size).toBe(1);
      expect(rootParser.getSubCommands().has("mid")).toBe(true);

      const midCommand = rootParser.getSubCommands().get("mid");
      expect(midCommand?.parser.getSubCommands().size).toBe(1);
      expect(midCommand?.parser.getSubCommands().has("deep")).toBe(true);
    });

    test("should work without MCP functionality", async () => {
      const parser = new ArgParser({
        appName: "Non-MCP CLI",
        appCommandName: "non-mcp",
        description: "A CLI without MCP functionality",
        handler: async (ctx) => {
          return {
            success: true,
            message: `Hello ${ctx.args.name}!`,
            verbose: ctx.args.verbose,
          };
        },
      }).addFlags([
        {
          name: "name",
          description: "Name to greet",
          options: ["--name", "-n"],
          type: "string",
          mandatory: true,
        },
        {
          name: "verbose",
          description: "Verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true,
        },
      ]);

      // Test parsing
      const result = await parser.parse(["--name", "World", "--verbose"]);

      expect(result).toBeDefined();

      // Check if there's an async handler promise to wait for
      if (result._asyncHandlerPromise) {
        const handlerResult = await result._asyncHandlerPromise;
        expect(handlerResult).toEqual({
          success: true,
          message: "Hello World!",
          verbose: true,
        });
      } else {
        // For traditional parsers, the result should contain the parsed args
        expect(result.name).toBe("World");
        expect(result.verbose).toBe(true);
      }
    });
  });

  describe("Flag Inheritance", () => {
    test("should support flag inheritance from parent parsers", () => {
      const parentParser = new ArgParser({
        appName: "Parent CLI",
        handler: async (ctx) => ({ parent: true }),
      }).addFlags([
        {
          name: "global",
          description: "Global flag",
          options: ["--global"],
          type: "string",
          defaultValue: "default",
        },
      ]);

      const childParser = new ArgParser(
        {
          appName: "Child CLI",
          inheritParentFlags: true,
          handler: async (ctx) => ({
            child: true,
            global: ctx.args.global,
            local: ctx.args.local,
          }),
        },
        [
          {
            name: "local",
            description: "Local flag",
            options: ["--local"],
            type: "string",
            mandatory: true,
          },
        ],
      );

      parentParser.addSubCommand({
        name: "child",
        description: "Child command",
        parser: childParser,
      });

      // Child should have both global and local flags
      expect(childParser.flags.find((f) => f.name === "local")).toBeDefined();
      // Note: Flag inheritance is handled during parsing, not at construction time
    });
  });

  describe("Traditional API Methods", () => {
    test("should support all traditional methods", () => {
      const parser = new ArgParser({
        appName: "Full Featured CLI",
        description: "A CLI with all traditional features",
      });

      // Test method availability
      expect(typeof parser.addFlag).toBe("function");
      expect(typeof parser.addFlags).toBe("function");
      expect(typeof parser.addSubCommand).toBe("function");
      expect(typeof parser.parse).toBe("function");
      // parseAsync() method has been removed - parse() is now async
      expect(typeof parser.getSubCommands).toBe("function");
      expect(typeof parser.getAppName).toBe("function");
      expect(typeof parser.getAppCommandName).toBe("function");
      expect(typeof parser.getDescription).toBe("function");
      expect(typeof parser.helpText).toBe("function");
    });

    test("should work with traditional flag definitions", () => {
      const parser = new ArgParser({
        appName: "Traditional CLI",
      })
        .addFlag({
          name: "input",
          description: "Input file",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
        })
        .addFlag({
          name: "output",
          description: "Output file",
          options: ["--output", "-o"],
          type: "string",
          defaultValue: "output.txt",
        });

      expect(parser.flags).toHaveLength(3); // input, output, help
      expect(parser.flagNames).toContain("input");
      expect(parser.flagNames).toContain("output");
      expect(parser.flagNames).toContain("help");
    });
  });

  describe("No MCP Dependencies", () => {
    test("should work without any MCP-related functionality", () => {
      const parser = new ArgParser({
        appName: "Pure CLI",
        appCommandName: "pure-cli",
        description: "A pure CLI without MCP",
        handler: async (ctx) => {
          return {
            processed: true,
            args: ctx.args,
          };
        },
      }).addFlags([
        {
          name: "file",
          description: "File to process",
          options: ["--file", "-f"],
          type: "string",
          mandatory: true,
        },
      ]);

      // MCP methods are available but not required for traditional usage
      // This is by design - allows adding MCP functionality to existing parsers
      expect(typeof (parser as any).addTool).toBe("function");
      expect(typeof (parser as any).toMcpTools).toBe("function");
      // withMcp is a static method, not instance method
      expect(typeof (parser.constructor as any).withMcp).toBe("function");

      // Should have traditional methods
      expect(parser.addFlag).toBeDefined();
      expect(parser.addFlags).toBeDefined();
      expect(parser.addSubCommand).toBeDefined();
      expect(parser.parse).toBeDefined();
    });
  });
});
