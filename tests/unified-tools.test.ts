import { describe, test, expect, beforeEach, vi } from "vitest";
import { ArgParser, type ToolConfig } from "../src";

describe("Unified Tool Architecture", () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test",
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0"
        }
      }
    });
  });

  describe("addTool() Method", () => {
    test("should add a tool successfully", () => {
      const toolConfig: ToolConfig = {
        name: "test-tool",
        description: "A test tool",
        flags: [
          { name: "input", description: "Input parameter", options: ["--input"], type: "string", mandatory: true }
        ],
        handler: async (ctx) => ({ result: ctx.args.input })
      };

      parser.addTool(toolConfig);
      
      const tools = parser.getTools();
      expect(tools.has("test-tool")).toBe(true);
      expect(tools.get("test-tool")).toEqual(toolConfig);
    });

    test("should prevent duplicate tool names", () => {
      const toolConfig: ToolConfig = {
        name: "duplicate",
        flags: [],
        handler: async () => ({})
      };

      parser.addTool(toolConfig);
      
      expect(() => parser.addTool(toolConfig)).toThrow(
        "Tool with name 'duplicate' already exists"
      );
    });

    test("should validate tool configuration", () => {
      expect(() => parser.addTool({
        name: "",
        flags: [],
        handler: async () => ({})
      } as ToolConfig)).toThrow("Tool name is required and must be a string");

      expect(() => parser.addTool({
        name: "test",
        flags: [],
        handler: null as any
      })).toThrow("Tool handler is required and must be a function");

      expect(() => parser.addTool({
        name: "test",
        flags: "invalid" as any,
        handler: async () => ({})
      })).toThrow("Tool flags must be an array");
    });

    test("should support method chaining", () => {
      const result = parser.addTool({
        name: "tool1",
        flags: [],
        handler: async () => ({})
      }).addTool({
        name: "tool2", 
        flags: [],
        handler: async () => ({})
      });

      expect(result).toBe(parser);
      expect(parser.getTools().size).toBe(2);
    });
  });

  describe("CLI Subcommand Registration", () => {
    test("should register tools as CLI subcommands", () => {
      parser.addTool({
        name: "greet",
        description: "Greet someone",
        flags: [
          { name: "name", description: "Name to greet", options: ["--name"], type: "string", mandatory: true }
        ],
        handler: async (ctx) => ({ greeting: `Hello ${ctx.args.name}!` })
      });

      const subCommands = parser.getSubCommands();
      expect(subCommands?.has("greet")).toBe(true);
    });

    test("should execute tool via CLI subcommand", async () => {
      parser.addTool({
        name: "echo",
        flags: [
          { name: "message", description: "Message to echo", options: ["--message"], type: "string", mandatory: true }
        ],
        handler: async (ctx) => ({ echo: ctx.args.message })
      });

      const result = await parser.parseAsync(["echo", "--message", "hello world"]);
      expect(result.echo).toBe("hello world");
      expect(result.$commandChain).toEqual(["echo"]);
    });

    test("should handle tool flags correctly in CLI mode", async () => {
      parser.addTool({
        name: "calc",
        flags: [
          { name: "a", description: "First number", options: ["--a"], type: "number", mandatory: true },
          { name: "b", description: "Second number", options: ["--b"], type: "number", mandatory: true },
          { name: "operation", description: "Operation to perform", options: ["--op"], type: "string", enum: ["add", "sub"], defaultValue: "add" }
        ],
        handler: async (ctx) => {
          const { a, b, operation } = ctx.args;
          const result = operation === "add" ? a + b : a - b;
          return { result, operation, operands: { a, b } };
        }
      });

      const result = await parser.parseAsync(["calc", "--a", "5", "--b", "3", "--op", "add"]);
      expect(result.result).toBe(8);
      expect(result.operation).toBe("add");
      expect(result.operands).toEqual({ a: 5, b: 3 });
    });
  });

  describe("MCP Tool Generation", () => {
    test("should generate MCP tools from unified tools", () => {
      parser.addTool({
        name: "test-mcp",
        description: "Test MCP tool",
        flags: [
          { name: "input", description: "Input to process", options: ["--input"], type: "string", mandatory: true },
          { name: "count", description: "Number of times to process", options: ["--count"], type: "number", defaultValue: 1 }
        ],
        handler: async (ctx) => ({ processed: ctx.args.input, count: ctx.args.count })
      });

      const mcpTools = parser.toMcpTools();
      const testTool = mcpTools.find(t => t.name === "test-mcp");
      
      expect(testTool).toBeDefined();
      expect(testTool?.description).toBe("Test MCP tool");
      expect(testTool?.inputSchema).toBeDefined();
    });

    test("should execute MCP tool correctly", async () => {
      parser.addTool({
        name: "mcp-echo",
        flags: [
          { name: "text", description: "Text to echo", options: ["--text"], type: "string", mandatory: true }
        ],
        handler: async (ctx) => {
          expect(ctx.isMcp).toBe(true);
          return { echo: ctx.args.text, mode: "mcp" };
        }
      });

      const mcpTools = parser.toMcpTools();
      const echoTool = mcpTools.find(t => t.name === "mcp-echo");
      
      expect(echoTool).toBeDefined();
      
      const result = await echoTool!.execute({ text: "hello mcp" });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain("hello mcp");
    });

    test("should handle MCP tool errors gracefully", async () => {
      parser.addTool({
        name: "error-tool",
        description: "Tool that throws an error",
        flags: [],
        handler: async () => {
          throw new Error("Test error");
        }
      });

      const mcpTools = parser.toMcpTools();
      const errorTool = mcpTools.find(t => t.name === "error-tool");
      
      const result = await errorTool!.execute({});
      expect(result.content[0].text).toContain("Test error");
    });
  });

  describe("Tool Information and Validation", () => {
    test("should provide tool information", () => {
      parser.addTool({
        name: "info-tool",
        description: "Get information",
        flags: [],
        handler: async () => ({})
      });

      const toolInfo = parser.getToolInfo();
      expect(toolInfo.unifiedTools).toContain("info-tool");
      expect(toolInfo.totalTools).toBeGreaterThan(0);
    });

    test("should validate tool routing", () => {
      parser.addTool({
        name: "routing-test",
        description: "Test routing",
        flags: [],
        handler: async () => ({})
      });

      const validation = parser.validateToolRouting();
      expect(validation.isValid).toBe(true);
      expect(validation.cliSubcommands).toContain("routing-test");
      expect(validation.mcpTools).toContain("routing-test");
    });
  });

  describe("Integration with Legacy API", () => {
    test("should work alongside legacy addMcpTool()", () => {
      // Add unified tool
      parser.addTool({
        name: "unified-tool",
        description: "Unified tool",
        flags: [{ name: "param", description: "Parameter", options: ["--param"], type: "string" }],
        handler: async (ctx) => ({ type: "unified", param: ctx.args.param })
      });

      // Add legacy MCP tool (should show deprecation warning)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      parser.addMcpTool({
        name: "legacy-tool",
        handler: async (args) => ({ type: "legacy", args })
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEPRECATED] addMcpTool() is deprecated")
      );

      const mcpTools = parser.toMcpTools();
      expect(mcpTools.find(t => t.name === "unified-tool")).toBeDefined();
      expect(mcpTools.find(t => t.name === "legacy-tool")).toBeDefined();

      consoleSpy.mockRestore();
    });

    test("should prioritize unified tools over legacy tools", () => {
      parser.addTool({
        name: "conflict-tool",
        description: "Conflict tool",
        flags: [],
        handler: async () => ({ type: "unified" })
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      parser.addMcpTool({
        name: "conflict-tool",
        handler: async () => ({ type: "legacy" })
      });

      const mcpTools = parser.toMcpTools();
      const conflictTool = mcpTools.find(t => t.name === "conflict-tool");
      
      // Should be the unified tool (first one registered)
      expect(conflictTool).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe("Complex Tool Scenarios", () => {
    test("should handle multiple tools with different flag types", async () => {
      parser
        .addTool({
          name: "string-tool",
          description: "String tool",
          flags: [
            { name: "text", description: "Text input", options: ["--text"], type: "string", mandatory: true }
          ],
          handler: async (ctx) => ({ type: "string", value: ctx.args.text })
        })
        .addTool({
          name: "number-tool",
          description: "Number tool",
          flags: [
            { name: "num", description: "Number input", options: ["--num"], type: "number", mandatory: true }
          ],
          handler: async (ctx) => ({ type: "number", value: ctx.args.num })
        })
        .addTool({
          name: "boolean-tool",
          description: "Boolean tool",
          flags: [
            { name: "flag", description: "Boolean flag", options: ["--flag"], type: "boolean", flagOnly: true }
          ],
          handler: async (ctx) => ({ type: "boolean", value: ctx.args.flag })
        });

      // Test CLI execution
      const stringResult = await parser.parseAsync(["string-tool", "--text", "hello"]);
      expect(stringResult.type).toBe("string");
      expect(stringResult.value).toBe("hello");

      const numberResult = await parser.parseAsync(["number-tool", "--num", "42"]);
      expect(numberResult.type).toBe("number");
      expect(numberResult.value).toBe(42);

      const booleanResult = await parser.parseAsync(["boolean-tool", "--flag"]);
      expect(booleanResult.type).toBe("boolean");
      expect(booleanResult.value).toBe(true);

      // Test MCP generation
      const mcpTools = parser.toMcpTools();
      expect(mcpTools.length).toBeGreaterThanOrEqual(3);
      expect(mcpTools.map(t => t.name)).toContain("string-tool");
      expect(mcpTools.map(t => t.name)).toContain("number-tool");
      expect(mcpTools.map(t => t.name)).toContain("boolean-tool");
    });
  });
});
