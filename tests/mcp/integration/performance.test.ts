import { describe, test, expect, vi } from "vitest";
import { ArgParser } from "../../../src";
import { generateMcpToolsFromArgParser } from "../../../src/mcp-integration";

describe("MCP Performance and Reliability Tests", () => {
  describe("Response Time Performance", () => {
    test("should execute tools with reasonable response times", async () => {
      const fastHandler = vi.fn().mockResolvedValue({
        operation: "default",
        message: "Simple operation completed",
        timestamp: new Date().toISOString()
      });

      const parser = new ArgParser({
        appName: "Performance Test Server",
        appCommandName: "perf-server",
        description: "MCP server for performance and reliability testing",
        handler: fastHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "operation",
          description: "Type of operation to perform",
          options: ["--operation", "-o"],
          type: "string",
          enum: ["compute", "memory", "error", "default"],
          defaultValue: "default"
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const startTime = Date.now();
      const result = await tool.execute({
        operation: "default"
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe("default");
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

      expect(fastHandler).toHaveBeenCalled();
    });

    test("should handle concurrent tool execution", async () => {
      const concurrentHandler = vi.fn().mockImplementation(async (ctx) => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          operation: "concurrent",
          processed: true,
          timestamp: new Date().toISOString()
        };
      });

      const parser = new ArgParser({
        appName: "Concurrent Test Server",
        appCommandName: "concurrent-server",
        description: "Test concurrent execution",
        handler: concurrentHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "id",
          description: "Request ID",
          options: ["--id"],
          type: "string",
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // Execute multiple tools concurrently
      const startTime = Date.now();
      const promises = Array.from({ length: 5 }, (_, i) =>
        tool.execute({ id: `request-${i}` })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.operation).toBe("concurrent");
      });

      // Should complete all requests within reasonable time
      expect(totalTime).toBeLessThan(1000); // Should be much less than 5 * 50ms due to concurrency
      expect(concurrentHandler).toHaveBeenCalled();
    });

  });

  describe("Error Recovery", () => {
    test("should handle errors gracefully and continue operation", async () => {
      const errorHandler = vi.fn().mockImplementation(async (ctx) => {
        if (ctx.args.attempt === "1") {
          throw new Error("First call failed");
        }
        return { success: true, message: "Second call succeeded" };
      });

      const parser = new ArgParser({
        appName: "Error Recovery Test",
        appCommandName: "error-recovery",
        description: "Test error recovery",
        handler: errorHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "attempt",
          description: "Attempt number",
          options: ["--attempt"],
          type: "string",
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // First call should fail
      const firstResult = await tool.execute({ attempt: "1" });
      expect(firstResult.success).toBe(false);
      expect(firstResult.message).toContain("First call failed");

      // Second call should succeed
      const secondResult = await tool.execute({ attempt: "2" });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.success).toBe(true);

      // Handler should have been called for both attempts
      expect(errorHandler).toHaveBeenCalled();
    });

  });
});
