import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { ArgParser } from "../../core/src/index.js";
import { mcpPlugin } from "../src/index.js";
import type { IFlag } from "../../core/src/index.js";

describe("ArgParser with MCP Plugin", () => {
  describe("Basic Functionality", () => {
    test("should support all ArgParser functionality", async () => {
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

      const result = await parser.parse(["--input", "test-value"]);
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("MCP Methods", () => {
    let parser: any;

    beforeEach(() => {
      parser = new ArgParser({
        appName: "MCP Test CLI",
        appCommandName: "mcp-test",
        description: "A test CLI for MCP functionality",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
        autoExit: false,
      })
      .use(mcpPlugin({
        serverInfo: {
          name: "test-mcp-server",
          version: "1.0.0",
        }
      }))
      .addFlags([
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
      });
    });

    test("should generate MCP tools with custom options", () => {
      const customOutputSchema = z.object({
        result: z.string().describe("Operation result"),
        timestamp: z.number().describe("Timestamp"),
      });

      const tools = parser.toMcpTools({
        outputSchemaMap: {
          "custom_mcp_test_tool": customOutputSchema,
        },
        generateToolName: (_commandPath: string[], appName: string) => `custom_${appName.toLowerCase().replace(/ /g, '_')}_tool`,
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("custom_mcp_test_cli_tool");
    });

    test("should execute MCP tool correctly", async () => {
      const tools = parser.toMcpTools();
      const tool = tools[0];

      const result = await tool.execute({
        name: "test-name",
        count: 5,
      });

      // The simplified execute returns createMcpSuccessResponse(parseResult)
      // parseResult for the handler will be the handler's return value
      expect(result.structuredContent).toMatchObject({
        result: "success",
        args: {
          name: "test-name",
          count: 5,
        },
      });
    });
  });

  describe("MCP Tool Management", () => {
    test("should add MCP tools correctly", () => {
      const parser: any = new ArgParser({
        appName: "Tool CLI",
        appCommandName: "tool-cli",
      }).use(mcpPlugin({
        serverInfo: { name: "test", version: "1.0.0" }
      }));

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
    });

    test("should prevent duplicate tool names", () => {
      const parser: any = new ArgParser({
        appName: "Tool CLI",
        appCommandName: "tool-cli",
      }).use(mcpPlugin({
        serverInfo: { name: "test", version: "1.0.0" }
      }));

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
  });
});
