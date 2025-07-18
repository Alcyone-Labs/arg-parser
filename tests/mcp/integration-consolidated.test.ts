import { describe, expect, test } from "vitest";
import { ArgParser } from "../../src";
import { generateMcpToolsFromArgParser } from "../../src/mcp/mcp-integration";

describe("MCP Integration (Consolidated)", () => {
  describe("Tool Generation", () => {
    test("should generate basic MCP tool", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ result: ctx.args.input }),
      }).addFlag({
        name: "input",
        description: "Input parameter",
        options: ["--input"],
        type: "string",
        mandatory: true,
      });

      const tools = generateMcpToolsFromArgParser(parser);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("test-cli");
      expect(tools[0].description).toContain("test-cli");
    });

    test("should generate tools for sub-commands", () => {
      const subParser = new ArgParser({
        appName: "Sub Command",
        handler: async (ctx) => ({ processed: ctx.args.data }),
      }).addFlag({
        name: "data",
        description: "Data to process",
        options: ["--data"],
        type: "string",
        mandatory: true,
      });

      const mainParser = new ArgParser({
        appName: "Main CLI",
        appCommandName: "main",
        handler: async () => ({ main: true }),
      }).addSubCommand({
        name: "process",
        description: "Process data",
        parser: subParser,
      });

      const tools = generateMcpToolsFromArgParser(mainParser);

      expect(tools).toHaveLength(2);
      expect(tools.some((t) => t.name === "main")).toBe(true);
      expect(tools.some((t) => t.name.includes("process"))).toBe(true);
    });
  });

  describe("Tool Execution", () => {
    test("should execute tool successfully", async () => {
      const parser = new ArgParser({
        appName: "Execution Test",
        appCommandName: "exec-test",
        handler: async (ctx) => ({
          result: "success",
          input: ctx.args.input,
        }),
      }).addFlag({
        name: "input",
        description: "Input data",
        options: ["--input"],
        type: "string",
        mandatory: true,
      });

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        input: "test data",
      });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe("success");
      expect(result.data.input).toBe("test data");
    });

    test("should handle execution errors", async () => {
      const parser = new ArgParser({
        appName: "Error Test",
        appCommandName: "error-test",
        handler: async () => {
          throw new Error("Test error");
        },
      }).addFlag({
        name: "input",
        description: "Input",
        options: ["--input"],
        type: "string",
        mandatory: true,
      });

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({ input: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("handler_error");
    });

    test("should handle missing mandatory parameters", async () => {
      const parser = new ArgParser({
        appName: "Validation Test",
        appCommandName: "validate",
        handler: async (ctx) => ({ result: ctx.args.required }),
      }).addFlag({
        name: "required",
        description: "Required parameter",
        options: ["--required"],
        type: "string",
        mandatory: true,
      });

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("handler_error");
    });
  });

  describe("MCP Parser Factory", () => {
    test("should create MCP-enabled parser", () => {
      const parser = ArgParser.withMcp({
        appName: "MCP Test",
        appCommandName: "mcp-test",
        handler: async (ctx) => ({ result: ctx.args.input }),
      }).addFlag({
        name: "input",
        description: "Input data",
        options: ["--input"],
        type: "string",
        mandatory: true,
      });

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("mcp-test");
    });

    test("should support unified tool management", () => {
      const parser = ArgParser.withMcp({
        appName: "Tool Test",
        handler: async () => ({ result: "main" }),
      });

      parser.addTool({
        name: "custom-tool",
        description: "A custom tool",
        flags: [
          {
            name: "param",
            description: "Parameter",
            options: ["--param"],
            type: "string",
            mandatory: true,
          },
        ],
        handler: async (ctx) => ({ custom: ctx.args.param }),
      });

      const tools = parser.getTools();
      expect(tools.has("custom-tool")).toBe(true);

      const mcpTools = parser.toMcpTools();
      expect(mcpTools.some((t) => t.name === "custom-tool")).toBe(true);
    });
  });

  describe("Performance", () => {
    test("should execute tools with reasonable response time", async () => {
      const parser = new ArgParser({
        appName: "Performance Test",
        appCommandName: "perf-test",
        handler: async (ctx) => ({
          processed: ctx.args.data,
          timestamp: Date.now(),
        }),
      }).addFlag({
        name: "data",
        description: "Data to process",
        options: ["--data"],
        type: "string",
        mandatory: true,
      });

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const startTime = Date.now();
      const result = await tool.executeForTesting!({ data: "test data" });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.success).toBe(true);
      expect(result.data.processed).toBe("test data");
    });
  });
});
