import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { ArgParser, ArgParserBase } from "../../src";
import type { IFlag } from "../../src";

describe("ArgParser", () => {
  describe("Basic Functionality", () => {
    test("should extend ArgParserBase correctly", () => {
      const parser = new ArgParser({
        appName: "Test MCP CLI",
        appCommandName: "test-mcp",
      });

      expect(parser).toBeInstanceOf(ArgParserBase);
      expect(parser).toBeInstanceOf(ArgParser);
      expect(parser.getAppName()).toBe("Test MCP CLI");
      expect(parser.getAppCommandName()).toBe("test-mcp");
    });

    test("should support all ArgParser functionality", async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: mockHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "input",
          description: "Input value",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
        },
      ]);

      const result = await parser.parse(["--input", "test-value"]);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            input: "test-value",
          }),
        }),
      );

      expect(result.handlerResponse).toEqual({ success: true });
    });
  });

  describe("MCP Methods", () => {
    let parser: ArgParser;

    beforeEach(() => {
      parser = new ArgParser({
        appName: "MCP Test CLI",
        appCommandName: "mcp-test",
        description: "A test CLI for MCP functionality",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
      }).addFlags([
        {
          name: "name",
          description: "Name parameter",
          options: ["--name", "-n"],
          type: "string",
          mandatory: true,
        },
        {
          name: "count",
          description: "Count parameter",
          options: ["--count", "-c"],
          type: "number",
          defaultValue: 1,
        },
      ]);
    });

    test("should generate MCP tools", () => {
      const tools = parser.toMcpTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: "mcp-test",
        description: "A test CLI for MCP functionality",
        inputSchema: expect.objectContaining({
          _def: expect.objectContaining({
            typeName: "ZodObject",
          }),
        }),
        execute: expect.any(Function),
      });
    });

    test("should generate MCP tools with custom options", () => {
      const customOutputSchema = z.object({
        result: z.string().describe("Operation result"),
        timestamp: z.number().describe("Timestamp"),
      });

      const tools = parser.toMcpTools({
        outputSchemaMap: {
          "custom_MCP Test CLI_tool": customOutputSchema,
        },
        generateToolName: (_commandPath, appName) => `custom_${appName}_tool`,
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("custom_MCP Test CLI_tool");
      expect(tools[0].outputSchema).toBeDefined();
    });

    test("should create MCP server", () => {
      const server = parser.createMcpServer({
        name: "test-mcp-server",
        version: "1.0.0",
        description: "Test MCP server",
      });

      expect(server).toBeDefined();
      expect(typeof server.registerTool).toBe("function");
    });

    test("should execute MCP tool correctly", async () => {
      const tools = parser.toMcpTools();
      const tool = tools[0];

      const result = await tool.execute({
        name: "test-name",
        count: 5,
      });

      expect(result).toEqual({
        success: true,
        data: {
          result: "success",
          args: {
            name: "test-name",
            count: 5,
          },
        },
      });
    });
  });

  describe("MCP Sub-command", () => {
    test("should add MCP sub-command correctly", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
        description: "Test MCP server",
      });

      const subCommands = parser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);

      const serveCommand = subCommands.get("serve");
      expect(serveCommand).toMatchObject({
        name: "serve",
        description: "Start test-mcp-server as an MCP server",
        handler: expect.any(Function),
        parser: expect.any(ArgParserBase),
      });
    });

    test("should support method chaining", () => {
      const parser = new ArgParser({
        appName: "Chainable CLI",
        appCommandName: "chain",
      })
        .addFlags([
          {
            name: "input",
            description: "Input value",
            options: ["--input"],
            type: "string",
          },
        ])
        .addMcpSubCommand("mcp", {
          name: "chain-mcp-server",
          version: "1.0.0",
        });

      expect(parser).toBeInstanceOf(ArgParser);
      expect(parser.flags.length).toBeGreaterThan(0);
      expect(parser.getSubCommands().has("mcp")).toBe(true);
    });

    test("should handle custom sub-command name and options", () => {
      // Custom output schema for testing (not used in this specific test)
      // const customOutputSchema = z.object({
      //   data: z.any().describe("Response data"),
      // });

      const parser = new ArgParser({
        appName: "Custom CLI",
        appCommandName: "custom",
      }).addMcpSubCommand(
        "start-server",
        {
          name: "custom-mcp-server",
          version: "2.0.0",
          description: "Custom MCP server instance",
        },
        {
          toolOptions: {
            outputSchemaMap: {
              custom: z.object({
                data: z.any(),
              }),
            },
          },
        },
      );

      const subCommands = parser.getSubCommands();
      expect(subCommands.has("start-server")).toBe(true);

      const serverCommand = subCommands.get("start-server");
      expect(serverCommand?.description).toBe(
        "Start custom-mcp-server as an MCP server",
      );
    });
  });

  describe("Factory Methods", () => {
    test("should create instance with withMcp factory method", () => {
      const parser = ArgParser.withMcp({
        appName: "Factory CLI",
        appCommandName: "factory",
        description: "Created with factory method",
      });

      expect(parser).toBeInstanceOf(ArgParser);
      expect(parser.getAppName()).toBe("Factory CLI");
      expect(parser.getAppCommandName()).toBe("factory");
      expect(parser.getDescription()).toBe("Created with factory method");
    });

    test("should create instance with initial flags using factory method", () => {
      const initialFlags: IFlag[] = [
        {
          name: "verbose",
          description: "Enable verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true,
        },
      ];

      const parser = ArgParser.withMcp(
        {
          appName: "Factory CLI with Flags",
          appCommandName: "factory-flags",
        },
        initialFlags,
      );

      expect(parser.flags).toHaveLength(2); // includes help flag
      expect(parser.flags.find((f) => f["name"] === "verbose")).toBeDefined();
    });

    test("should convert existing ArgParser with fromArgParser", () => {
      const originalParser = new ArgParser({
        appName: "Original CLI",
        appCommandName: "original",
        description: "Original parser",
        handler: async () => ({ converted: true }),
      }).addFlags([
        {
          name: "input",
          description: "Input parameter",
          options: ["--input"],
          type: "string",
        },
      ]);

      const mcpParser = ArgParser.fromArgParser(originalParser);

      expect(mcpParser).toBeInstanceOf(ArgParser);
      expect(mcpParser.getAppName()).toBe("Original CLI");
      expect(mcpParser.getAppCommandName()).toBe("original");
      expect(mcpParser.getDescription()).toBe("Original parser");
      expect(mcpParser.flags.length).toBe(originalParser.flags.length);

      // Should have MCP methods
      expect(typeof mcpParser.toMcpTools).toBe("function");
      expect(typeof mcpParser.createMcpServer).toBe("function");
      expect(typeof mcpParser.addMcpSubCommand).toBe("function");
    });

    test("should preserve handler in converted parser", async () => {
      const mockHandler = vi.fn().mockResolvedValue({ preserved: true });

      const originalParser = new ArgParser({
        appName: "Handler Test CLI",
        appCommandName: "handler-test",
        handler: mockHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "test",
          description: "Test parameter",
          options: ["--test"],
          type: "string",
          mandatory: true,
        },
      ]);

      const mcpParser = ArgParser.fromArgParser(originalParser);
      const result = await mcpParser.parse(["--test", "value"]);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            test: "value",
          }),
        }),
      );

      expect(result.handlerResponse).toEqual({ preserved: true });
    });
  });

  describe("Integration", () => {
    test("should work with complex CLI setup", async () => {
      const parser = ArgParser.withMcp({
        appName: "Complex CLI",
        appCommandName: "complex",
        description: "A complex CLI with sub-commands and MCP support",
      })
        .addFlags([
          {
            name: "global",
            description: "Global flag",
            options: ["--global", "-g"],
            type: "string",
          },
        ])
        .addSubCommand({
          name: "process",
          description: "Process data",
          handler: async (ctx) => ({
            action: "process",
            global: ctx.parentArgs?.["global"],
            file: ctx.args["file"],
          }),
          parser: new ArgParserBase({}, [
            {
              name: "file",
              description: "File to process",
              options: ["--file", "-f"],
              type: "string",
              mandatory: true,
            },
          ]),
        })
        .addMcpSubCommand("serve", {
          name: "complex-mcp-server",
          version: "1.0.0",
        });

      // Test regular sub-command
      const processResult = await parser.parse([
        "--global",
        "global-value",
        "process",
        "--file",
        "test.txt",
      ]);

      expect(processResult.handlerResponse).toEqual({
        action: "process",
        global: "global-value",
        file: "test.txt",
      });

      // Test MCP tools generation
      const tools = parser.toMcpTools();
      expect(tools.length).toBeGreaterThan(0);

      // Verify MCP sub-command exists
      expect(parser.getSubCommands().has("serve")).toBe(true);
    });

    test("should handle errors gracefully in MCP context", async () => {
      const errorParser = new ArgParser({
        appName: "Error CLI",
        appCommandName: "error",
        handler: async () => {
          throw new Error("Handler error");
        },
        handleErrors: false,
      }).addFlags([
        {
          name: "input",
          description: "Input value",
          options: ["--input"],
          type: "string",
          mandatory: true,
        },
      ]);

      const tools = errorParser.toMcpTools();
      const tool = tools[0];

      const result = await tool.execute({ input: "test" });

      expect(result).toEqual({
        success: false,
        message: "Cmd error: handler_error - Handler error",
        data: expect.any(Object),
      });
    });
  });
});
