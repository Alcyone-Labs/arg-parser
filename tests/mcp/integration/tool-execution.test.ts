import { describe, test, expect, vi } from "vitest";
import { ArgParser } from "../../../src";
import { generateMcpToolsFromArgParser } from "../../../src/mcp/mcp-integration";
import type { IFlag } from "../../../src";

describe("MCP Tool Execution Integration Tests", () => {
  describe("Basic Tool Execution", () => {
    test("should execute tools with various parameter types", async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        operation: "main",
        input: "test input",
        processed: true,
        timestamp: "2024-01-01T00:00:00.000Z"
      });

      const parser = new ArgParser({
        appName: "Tool Execution Test Server",
        appCommandName: "tool-server",
        description: "MCP server for testing tool execution scenarios",
        handler: mockHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "input",
          description: "Input data to process",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true
        },
        {
          name: "count",
          description: "Count parameter",
          options: ["--count", "-c"],
          type: "number",
          defaultValue: 1
        },
        {
          name: "verbose",
          description: "Verbose flag",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        input: "test input",
        count: 5,
        verbose: true
      });

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe("main");
      expect(result.data.input).toBe("test input");
      expect(result.data.processed).toBe(true);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            input: "test input",
            count: 5,
            verbose: true
          })
        })
      );
    });

    test("should handle async operations correctly", async () => {
      const asyncHandler = vi.fn().mockImplementation(async (ctx) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          operation: "async-test",
          delay: ctx.args.delay,
          completed: true,
          timestamp: new Date().toISOString()
        };
      });

      const parser = new ArgParser({
        appName: "Async Test Server",
        appCommandName: "async-server",
        description: "Test async operations",
        handler: asyncHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "delay",
          description: "Delay in milliseconds",
          options: ["--delay", "-d"],
          type: "number",
          defaultValue: 100
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const startTime = Date.now();
      const result = await tool.executeForTesting!({
        delay: 100
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe("async-test");
      expect(result.data.completed).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance

      expect(asyncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            delay: 100
          })
        })
      );
    });

    test("should handle complex data types and transformations", async () => {
      const complexHandler = vi.fn().mockResolvedValue({
        processed: true,
        results: ["item1", "item2", "item3"],
        metadata: {
          count: 3,
          timestamp: "2024-01-01T00:00:00.000Z"
        }
      });

      const parser = new ArgParser({
        appName: "Complex Data Server",
        appCommandName: "complex-server",
        description: "Test complex data handling",
        handler: complexHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "data",
          description: "JSON data to process",
          options: ["--data", "-d"],
          type: "string",
          mandatory: true
        },
        {
          name: "format",
          description: "Output format",
          options: ["--format", "-f"],
          type: "string",
          enum: ["json", "csv", "xml"],
          defaultValue: "json"
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        data: '{"items": ["a", "b", "c"]}',
        format: "json"
      });

      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(true);
      expect(result.data.results).toEqual(["item1", "item2", "item3"]);
      expect(result.data.metadata.count).toBe(3);

      expect(complexHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            data: '{"items": ["a", "b", "c"]}',
            format: "json"
          })
        })
      );
    });
  });

  describe("Error Handling", () => {
    test("should handle execution errors gracefully", async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error("Execution failed"));

      const parser = new ArgParser({
        appName: "Error Test Server",
        appCommandName: "error-server",
        description: "Test error handling",
        handler: errorHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "input",
          description: "Input parameter",
          options: ["--input"],
          type: "string",
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        input: "test input"
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Execution failed");
      expect(errorHandler).toHaveBeenCalled();
    });

  });
});
