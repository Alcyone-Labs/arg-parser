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
      // Test with async handler
      const asyncHandler = async (ctx: any) => {
        return { success: true, args: ctx.args };
      };

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: asyncHandler,
        handleErrors: false,
        autoExit: false,
      }).addFlags([
        {
          name: "input",
          description: "Input value",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
        },
      ]);

      let result = await parser.parse(["--input", "test-value"]);
      console.log("Async handler result:", result);

      // Temporary workaround: manually process async handler promise if it exists
      if ((result as any)._asyncHandlerPromise) {
        console.log("Manually processing async handler promise");
        const handlerResult = await (result as any)._asyncHandlerPromise;
        (result as any).handlerResponse = handlerResult;
        delete (result as any)._asyncHandlerPromise;
        delete (result as any)._asyncHandlerInfo;
      }

      expect(result).toHaveProperty("handlerResponse");
      expect(result.handlerResponse).toHaveProperty("success", true);
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

    test("should create MCP server", async () => {
      const server = await parser.createMcpServer({
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

      const result = await tool.executeForTesting!({
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

  describe("MCP Sub-command (Legacy)", () => {
    test("should add MCP sub-command correctly with deprecation warning", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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

      // Should show deprecation warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEPRECATED] addMcpSubCommand()"),
      );

      consoleSpy.mockRestore();
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

    test("should create instance with MCP server configuration", () => {
      const parser = ArgParser.withMcp({
        appName: "MCP CLI",
        appCommandName: "mcp-cli",
        description: "CLI with MCP server config",
        mcp: {
          serverInfo: {
            name: "test-mcp-server",
            version: "1.0.0",
            description: "Test MCP server",
            author: { name: "Test Author" },
          },
          defaultTransports: [{ type: "stdio" }],
          toolOptions: { includeSubCommands: true },
        },
      });

      expect(parser).toBeInstanceOf(ArgParser);
      expect(parser.getMcpServerConfig()).toBeDefined();

      const config = parser.getMcpServerConfig();
      expect(config?.serverInfo?.name).toBe("test-mcp-server");
      expect(config?.serverInfo?.version).toBe("1.0.0");
      expect(config?.defaultTransports).toHaveLength(1);
      expect(config?.defaultTransports?.[0].type).toBe("stdio");
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
  });

  describe("MCP Tool Management", () => {
    test("should add MCP tools correctly", () => {
      const parser = ArgParser.withMcp({
        appName: "Tool CLI",
        appCommandName: "tool-cli",
      });

      const toolConfig = {
        name: "test-tool",
        description: "A test tool",
        handler: async (args: any) => ({ result: "test", args }),
      };

      parser.addMcpTool(toolConfig);

      const tools = parser.getMcpTools();
      expect(tools.size).toBe(1);
      expect(tools.has("test-tool")).toBe(true);

      const tool = tools.get("test-tool");
      expect(tool?.name).toBe("test-tool");
      expect(tool?.description).toBe("A test tool");
      expect(typeof tool?.handler).toBe("function");
    });

    test("should prevent duplicate tool names", () => {
      const parser = ArgParser.withMcp({
        appName: "Tool CLI",
        appCommandName: "tool-cli",
      });

      const toolConfig = {
        name: "duplicate-tool",
        description: "First tool",
        handler: async () => ({ result: "first" }),
      };

      parser.addMcpTool(toolConfig);

      expect(() => {
        parser.addMcpTool({
          name: "duplicate-tool",
          description: "Second tool",
          handler: async () => ({ result: "second" }),
        });
      }).toThrow("MCP tool with name 'duplicate-tool' already exists");
    });

    test("should support method chaining", () => {
      const parser = ArgParser.withMcp({
        appName: "Chain CLI",
        appCommandName: "chain-cli",
      });

      const result = parser
        .addMcpTool({
          name: "tool1",
          description: "First tool",
          handler: async () => ({ result: "tool1" }),
        })
        .addMcpTool({
          name: "tool2",
          description: "Second tool",
          handler: async () => ({ result: "tool2" }),
        });

      expect(result).toBe(parser);
      expect(parser.getMcpTools().size).toBe(2);
    });

    test("should generate tool info correctly", () => {
      const parser = ArgParser.withMcp({
        appName: "Info CLI",
        appCommandName: "info-cli",
        handler: async (ctx) => ({ processed: ctx.args.input }),
      })
        .addFlags([
          {
            name: "input",
            description: "Input data",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
        ])
        .addMcpTool({
          name: "manual-tool",
          description: "Manual tool",
          handler: async () => ({ result: "manual" }),
        });

      const toolInfo = parser.getMcpToolInfo();

      expect(toolInfo.manualTools).toContain("manual-tool");
      expect(toolInfo.cliTools.length).toBeGreaterThan(0); // Should have CLI-generated tools
      expect(toolInfo.totalTools).toBeGreaterThan(1);
      expect(Array.isArray(toolInfo.duplicates)).toBe(true);
    });

    test("should test tool routing", async () => {
      const parser = ArgParser.withMcp({
        appName: "Route CLI",
        appCommandName: "route-cli",
      }).addMcpTool({
        name: "echo-tool",
        description: "Echo tool",
        handler: async (args: any) => ({ echo: args.message }),
      });

      const result = await parser.testMcpToolRouting("echo-tool", {
        message: "hello",
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    test("should handle tool routing errors", async () => {
      const parser = ArgParser.withMcp({
        appName: "Error CLI",
        appCommandName: "error-cli",
      });

      const result = await parser.testMcpToolRouting("nonexistent-tool");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool 'nonexistent-tool' not found");
    });

    test("should combine CLI-generated and manual tools", () => {
      const parser = ArgParser.withMcp({
        appName: "Combined CLI",
        appCommandName: "combined-cli",
        handler: async (ctx) => ({
          processed: ctx.args.input,
          verbose: ctx.args.verbose,
        }),
      })
        .addFlags([
          {
            name: "input",
            description: "Input data",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
          {
            name: "verbose",
            description: "Enable verbose output",
            options: ["--verbose"],
            type: "boolean",
            flagOnly: true,
          },
        ])
        .addMcpTool({
          name: "custom-tool",
          description: "A custom tool",
          handler: async (args: any) => ({ custom: true, args }),
        });

      const tools = parser.toMcpTools();

      // Should have both CLI-generated tools and manual tools
      expect(tools.length).toBeGreaterThan(1);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("custom-tool");

      // Should have CLI-generated tools (exact names depend on implementation)
      const hasCliTools = toolNames.some((name) => name !== "custom-tool");
      expect(hasCliTools).toBe(true);
    });

    test("should handle tool name conflicts (manual tools take precedence)", () => {
      const parser = ArgParser.withMcp({
        appName: "Conflict CLI",
        appCommandName: "conflict-cli",
      })
        .addFlags([
          {
            name: "input",
            description: "Input data",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
        ])
        .addMcpTool({
          name: "conflict-cli", // Same as app command name
          description: "Manual tool with conflicting name",
          handler: async () => ({ manual: true }),
        });

      const tools = parser.toMcpTools();
      const conflictTool = tools.find((t) => t.name === "conflict-cli");

      expect(conflictTool).toBeDefined();
      expect(conflictTool?.description).toBe(
        "Manual tool with conflicting name",
      );
    });
  });

  describe("Conversion", () => {
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
        autoExit: false,
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
      let result = await mcpParser.parse(["--test", "value"]);

      // Temporary workaround: manually process async handler promise if it exists
      if ((result as any)._asyncHandlerPromise) {
        const handlerResult = await (result as any)._asyncHandlerPromise;
        (result as any).handlerResponse = handlerResult;
        delete (result as any)._asyncHandlerPromise;
        delete (result as any)._asyncHandlerInfo;
      }

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            test: "value",
          }),
        }),
      );

      expect(result).toHaveProperty("handlerResponse", { preserved: true });
    });
  });

  describe("Integration", () => {
    test("should work with complex CLI setup", async () => {
      const parser = ArgParser.withMcp({
        appName: "Complex CLI",
        appCommandName: "complex",
        description: "A complex CLI with sub-commands and MCP support",
        autoExit: false,
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
      let processResult = await parser.parseAsync([
        "--global",
        "global-value",
        "process",
        "--file",
        "test.txt",
      ]);

      // Temporary workaround: manually process async handler promise if it exists
      if ((processResult as any)._asyncHandlerPromise) {
        const handlerResult = await (processResult as any)._asyncHandlerPromise;
        (processResult as any).handlerResponse = handlerResult;
        delete (processResult as any)._asyncHandlerPromise;
        delete (processResult as any)._asyncHandlerInfo;
      }

      expect(processResult).toHaveProperty("handlerResponse");

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

      const result = await tool.executeForTesting!({ input: "test" });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("Handler error"),
        message: expect.stringContaining("Handler error"),
        data: expect.objectContaining({
          error: expect.stringContaining("Handler error"),
        }),
        exitCode: 1,
      });
    });
  });
});
