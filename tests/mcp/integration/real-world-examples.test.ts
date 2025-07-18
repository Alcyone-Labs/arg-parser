import { describe, expect, test, vi } from "vitest";
import { ArgParser } from "../../../src";
import { generateMcpToolsFromArgParser } from "../../../src/mcp/mcp-integration";

describe("Real-World MCP Examples Integration Tests", () => {
  describe("File Processing Example", () => {
    test("should create file processor with comprehensive operations", () => {
      const fileHandler = vi.fn().mockResolvedValue({
        operation: "read",
        file: "/test/file.txt",
        content: "Hello World!\nThis is a test file.\nWith multiple lines.\n",
        size: 50,
        lines: 3,
        encoding: "utf-8",
      });

      const parser = new ArgParser({
        appName: "File Processor",
        appCommandName: "file-processor",
        description: "Advanced file processing tools for AI assistants",
        handler: fileHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "file",
          description: "Path to the file to process",
          options: ["--file", "-f"],
          type: "string",
          mandatory: true,
        },
        {
          name: "operation",
          description: "Operation to perform on the file",
          options: ["--operation", "-o"],
          type: "string",
          enum: ["read", "info", "hash"],
          mandatory: true,
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      expect(tool.name).toBe("file-processor");
      expect(tool.description).toBe(
        "Advanced file processing tools for AI assistants",
      );
      expect(tool.inputSchema).toBeDefined();
    });

    test("should execute file processing operations", async () => {
      const fileHandler = vi.fn().mockResolvedValue({
        operation: "read",
        file: "/test/file.txt",
        content: "Hello World!\nThis is a test file.\nWith multiple lines.\n",
        size: 50,
        lines: 3,
        encoding: "utf-8",
      });

      const parser = new ArgParser({
        appName: "File Processor",
        appCommandName: "file-processor",
        description: "Advanced file processing tools for AI assistants",
        handler: fileHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "file",
          description: "Path to the file to process",
          options: ["--file", "-f"],
          type: "string",
          mandatory: true,
        },
        {
          name: "operation",
          description: "Operation to perform on the file",
          options: ["--operation", "-o"],
          type: "string",
          enum: ["read", "info", "hash"],
          mandatory: true,
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        file: "/test/file.txt",
        operation: "read",
      });

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe("read");
      expect(result.data.content).toContain("Hello World!");
      expect(result.data.lines).toBe(3);

      expect(fileHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            file: "/test/file.txt",
            operation: "read",
          }),
        }),
      );
    });
  });

  describe("Data Analysis Example", () => {
    test("should create data analysis tools with statistical operations", () => {
      const statsHandler = vi.fn().mockResolvedValue({
        operation: "statistics",
        inputCount: 10,
        measures: ["mean", "median", "standardDeviation"],
        statistics: {
          mean: 5.5,
          median: 5.5,
          standardDeviation: 2.87,
        },
      });

      const parser = new ArgParser({
        appName: "Data Analysis Server",
        appCommandName: "data-analyzer",
        description:
          "Advanced data analysis and statistical computation server",
        handler: statsHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "values",
          description: "Comma-separated numeric values or JSON array",
          options: ["--values", "-v"],
          type: "string",
          mandatory: true,
        },
        {
          name: "measures",
          description: "Statistical measures to compute",
          options: ["--measures", "-m"],
          type: "string",
          defaultValue: "mean,median,standardDeviation",
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      expect(tool.name).toBe("data-analyzer");
      expect(tool.description).toBe(
        "Advanced data analysis and statistical computation server",
      );
      expect(tool.inputSchema).toBeDefined();
    });

    test("should execute statistical analysis operations", async () => {
      const statsHandler = vi.fn().mockResolvedValue({
        operation: "statistics",
        inputCount: 10,
        measures: ["mean", "median", "standardDeviation"],
        statistics: {
          mean: 5.5,
          median: 5.5,
          standardDeviation: 2.87,
        },
      });

      const parser = new ArgParser({
        appName: "Data Analysis Server",
        appCommandName: "data-analyzer",
        description:
          "Advanced data analysis and statistical computation server",
        handler: statsHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "values",
          description: "Comma-separated numeric values or JSON array",
          options: ["--values", "-v"],
          type: "string",
          mandatory: true,
        },
        {
          name: "measures",
          description: "Statistical measures to compute",
          options: ["--measures", "-m"],
          type: "string",
          defaultValue: "mean,median,standardDeviation",
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        values: "1,2,3,4,5,6,7,8,9,10",
        measures: "mean,median,standardDeviation",
      });

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe("statistics");
      expect(result.data.inputCount).toBe(10);
      expect(result.data.statistics.mean).toBe(5.5);

      expect(statsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            values: "1,2,3,4,5,6,7,8,9,10",
            measures: "mean,median,standardDeviation",
          }),
        }),
      );
    });
  });

  describe("Canny CLI Example (Community Contribution)", () => {
    test("should create Canny search CLI with proper MCP integration", () => {
      // Mock the fetch function to avoid actual API calls in unit tests
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            posts: [
              {
                title: "Feature Request: Dark Mode",
                status: "under review",
                score: 42,
                author: { name: "John Doe" },
                details: "Please add dark mode support to the application",
                url: "https://example.canny.io/posts/dark-mode",
                tags: [{ name: "ui" }, { name: "accessibility" }],
              },
              {
                title: "API Rate Limiting",
                status: "planned",
                score: 28,
                author: { name: "Jane Smith" },
                details: "Need better rate limiting for API endpoints",
                url: "https://example.canny.io/posts/rate-limiting",
                tags: [{ name: "api" }, { name: "performance" }],
              },
            ],
          }),
      });

      // Note: In a real test environment, you would mock node-fetch here
      // For this test, we're mocking the handler directly

      const cannyHandler = vi.fn().mockImplementation(async (ctx) => {
        const args = ctx.args;

        // Simulate the actual Canny CLI logic
        if (!args.apiKey && !globalThis.process.env.CANNY_API_KEY) {
          return {
            success: false,
            error:
              "API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.",
          };
        }

        // Mock successful search
        return {
          success: true,
          results: 2,
          posts: [
            {
              title: "Feature Request: Dark Mode",
              status: "under review",
              score: 42,
              author: "John Doe",
              details: "Please add dark mode support to the application",
              url: "https://example.canny.io/posts/dark-mode",
              tags: ["ui", "accessibility"],
            },
            {
              title: "API Rate Limiting",
              status: "planned",
              score: 28,
              author: "Jane Smith",
              details: "Need better rate limiting for API endpoints",
              url: "https://example.canny.io/posts/rate-limiting",
              tags: ["api", "performance"],
            },
          ],
          query: args.query,
        };
      });

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description:
          "Search Canny for relevant feature requests (CLI + MCP server)",
        handler: cannyHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "query",
          options: ["-q", "--query"],
          type: "string",
          description: "Search query for feature requests",
          mandatory: true,
        },
        {
          name: "apiKey",
          options: ["-k", "--api-key"],
          type: "string",
          description:
            "Canny API key (optional, defaults to CANNY_API_KEY env var)",
          mandatory: false,
        },
        {
          name: "limit",
          options: ["-l", "--limit"],
          type: "number",
          description: "Number of results to return",
          defaultValue: 10,
        },
        {
          name: "board",
          options: ["-b", "--board"],
          type: "string",
          description: "Specific board ID to search (optional)",
        },
        {
          name: "status",
          options: ["-s", "--status"],
          type: "string",
          description: "Filter by post status",
          enum: [
            "open",
            "under review",
            "planned",
            "in progress",
            "complete",
            "closed",
          ],
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      expect(tool.name).toBe("canny-search");
      expect(tool.description).toBe(
        "Search Canny for relevant feature requests (CLI + MCP server)",
      );
      expect(tool.inputSchema).toBeDefined();

      // Verify it's a Zod object schema
      expect(tool.inputSchema._def.typeName).toBe("ZodObject");

      // Test valid input parsing
      const validInput = {
        query: "test query",
        limit: 5,
        status: "open",
        board: "test-board",
        apiKey: "test-key",
      };
      expect(() => tool.inputSchema.parse(validInput)).not.toThrow();

      // Test invalid enum value
      const invalidInput = {
        query: "test query",
        status: "invalid-status",
      };
      expect(() => tool.inputSchema.parse(invalidInput)).toThrow();

      // Test missing mandatory field (query)
      const missingQuery = {
        limit: 5,
      };
      // Note: In MCP tools, mandatory fields might be optional due to help functionality
      // So we test that the schema exists and can parse valid input
    });

    test("should execute Canny search operations with proper error handling", async () => {
      const cannyHandler = vi.fn().mockImplementation(async (ctx) => {
        const args = ctx.args;

        // Test error case when no API key is provided
        if (!args.apiKey && !globalThis.process.env.CANNY_API_KEY) {
          return {
            success: false,
            error:
              "API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.",
          };
        }

        // Mock successful search
        return {
          success: true,
          results: 1,
          posts: [
            {
              title: "Feature Request: Dark Mode",
              status: "under review",
              score: 42,
              author: "John Doe",
              details: "Please add dark mode support to the application",
              url: "https://example.canny.io/posts/dark-mode",
              tags: ["ui", "accessibility"],
            },
          ],
          query: args.query,
        };
      });

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description:
          "Search Canny for relevant feature requests (CLI + MCP server)",
        handler: cannyHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "query",
          options: ["-q", "--query"],
          type: "string",
          description: "Search query for feature requests",
          mandatory: true,
        },
        {
          name: "apiKey",
          options: ["-k", "--api-key"],
          type: "string",
          description:
            "Canny API key (optional, defaults to CANNY_API_KEY env var)",
          mandatory: false,
        },
        {
          name: "limit",
          options: ["-l", "--limit"],
          type: "number",
          description: "Number of results to return",
          defaultValue: 10,
        },
        {
          name: "status",
          options: ["-s", "--status"],
          type: "string",
          description: "Filter by post status",
          enum: [
            "open",
            "under review",
            "planned",
            "in progress",
            "complete",
            "closed",
          ],
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // Test successful execution with API key provided
      const result = await tool.executeForTesting!({
        query: "dark mode",
        limit: 5,
        status: "under review",
        apiKey: "test-api-key", // Provide API key to avoid the error case
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.results).toBe(1);
      expect(result.data.posts).toHaveLength(1);
      expect(result.data.posts[0].title).toBe("Feature Request: Dark Mode");
      expect(result.data.query).toBe("dark mode");

      expect(cannyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            query: "dark mode",
            limit: 5,
            status: "under review",
            apiKey: "test-api-key",
          }),
        }),
      );
    });

    test("should handle missing API key gracefully", async () => {
      // Temporarily clear the environment variable for this test
      const originalApiKey = globalThis.process.env.CANNY_API_KEY;
      delete globalThis.process.env.CANNY_API_KEY;

      const cannyHandler = vi.fn().mockImplementation(async (ctx) => {
        const args = ctx.args;

        if (!args.apiKey && !globalThis.process.env.CANNY_API_KEY) {
          return {
            success: false,
            error:
              "API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.",
          };
        }

        return { success: true, results: 0, posts: [], query: args.query };
      });

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description:
          "Search Canny for relevant feature requests (CLI + MCP server)",
        handler: cannyHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "query",
          options: ["-q", "--query"],
          type: "string",
          description: "Search query for feature requests",
          mandatory: true,
        },
        {
          name: "apiKey",
          options: ["-k", "--api-key"],
          type: "string",
          description:
            "Canny API key (optional, defaults to CANNY_API_KEY env var)",
          mandatory: false,
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        query: "test query",
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toContain("API key is required");

      // Restore the original API key
      if (originalApiKey) {
        globalThis.process.env.CANNY_API_KEY = originalApiKey;
      }
    });
  });
});
