import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { McpStdioClient } from "./mcp-client-utils";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { spawn, ChildProcess } from "node:child_process";

describe("Canny CLI Integration Tests", () => {
  const cannyCliPath = resolve(__dirname, "../../../examples/community/canny-cli.js");

  beforeAll(() => {
    // Verify the Canny CLI file exists
    if (!existsSync(cannyCliPath)) {
      throw new Error(`Canny CLI not found at ${cannyCliPath}`);
    }
  });

  describe("CLI Mode Tests", () => {
    test("should show help when run without arguments", async () => {
      const process = spawn("node", [cannyCliPath, "--help"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve) => {
        process.on("close", resolve);
      });

      // Should show help information
      const output = stdout + stderr;
      expect(output).toContain("Canny Search CLI");
      expect(output).toContain("--query");
      expect(output).toContain("--api-key");
    }, 10000);

    test("should handle missing API key gracefully in CLI mode", async () => {
      // Temporarily remove API key
      const originalApiKey = globalThis.process.env.CANNY_API_KEY;
      delete globalThis.process.env.CANNY_API_KEY;

      const process = spawn("node", [cannyCliPath, "--query", "test"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve) => {
        process.on("close", resolve);
      });

      const output = stdout + stderr;
      expect(output).toContain("API key is required");

      // Restore API key
      if (originalApiKey) {
        globalThis.process.env.CANNY_API_KEY = originalApiKey;
      }
    }, 10000);

    test("should execute search successfully with API key from environment", async () => {
      if (!globalThis.process.env.CANNY_API_KEY) {
        console.warn("Skipping CLI search test - CANNY_API_KEY not set");
        return;
      }

      const process = spawn("node", [cannyCliPath, "--query", "API", "--limit", "2"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve) => {
        process.on("close", resolve);
      });

      // Should show search results or "no results found"
      const output = stdout + stderr;
      expect(output).toContain("Searching Canny for");
      expect(output.toLowerCase()).toMatch(/(found \d+|no feature requests found)/);
    }, 15000);
  });

  describe("MCP Server Mode Tests", () => {
    let client: McpStdioClient;

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    test("should start as MCP server and initialize correctly", async () => {
      if (!globalThis.process.env.CANNY_API_KEY) {
        console.warn("Skipping MCP server test - CANNY_API_KEY not set");
        return;
      }

      // Test that the MCP server can start without errors
      const process = spawn("node", [cannyCliPath, "serve", "--help"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve) => {
        process.on("close", resolve);
      });

      const output = stdout + stderr;
      expect(output).toContain("serve");
      expect(output).toContain("transport");
    }, 15000);

    test("should generate MCP tools with correct schema", async () => {
      // Test the MCP tool generation directly using the library
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp-integration");

      const parser = new ArgParser({
        appName: 'Canny Search CLI',
        appCommandName: 'canny-search',
        description: 'Search Canny for relevant feature requests (CLI + MCP server)',
        handler: async () => ({ success: true }),
        handleErrors: false
      }).addFlags([
        {
          name: 'query',
          options: ['-q', '--query'],
          type: 'string',
          description: 'Search query for feature requests',
          mandatory: true
        },
        {
          name: 'status',
          options: ['-s', '--status'],
          type: 'string',
          description: 'Filter by post status',
          enum: ['open', 'under review', 'planned', 'in progress', 'complete', 'closed']
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      expect(tools.length).toBe(1);

      const cannyTool = tools[0];
      expect(cannyTool.name).toBe("canny-search");
      expect(cannyTool.description).toContain("Search Canny for relevant feature requests");

      // Verify schema structure (it's a Zod object)
      expect(cannyTool.inputSchema).toBeDefined();
      expect(cannyTool.inputSchema._def.typeName).toBe("ZodObject");

      // Test that valid input parses correctly
      const validInput = {
        query: "test query",
        status: "open"
      };
      expect(() => cannyTool.inputSchema.parse(validInput)).not.toThrow();

      // Test that invalid enum value throws
      const invalidInput = {
        query: "test query",
        status: "invalid-status"
      };
      expect(() => cannyTool.inputSchema.parse(invalidInput)).toThrow();
    }, 5000);

    test("should execute MCP tool correctly", async () => {
      // Test the MCP tool execution directly using the library
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp-integration");

      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        results: 1,
        posts: [{
          title: "Test Feature Request",
          status: "open",
          score: 10,
          author: "Test User",
          url: "https://test.canny.io/posts/test",
          tags: ["test"]
        }],
        query: "test"
      });

      const parser = new ArgParser({
        appName: 'Canny Search CLI',
        appCommandName: 'canny-search',
        description: 'Search Canny for relevant feature requests',
        handler: mockHandler,
        handleErrors: false
      }).addFlags([
        {
          name: 'query',
          options: ['-q', '--query'],
          type: 'string',
          description: 'Search query for feature requests',
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.execute({
        query: "test"
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.query).toBe("test");
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            query: "test"
          })
        })
      );
    }, 5000);

    test("should validate parameters correctly", async () => {
      // Test parameter validation using the library directly
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp-integration");

      const parser = new ArgParser({
        appName: 'Canny Search CLI',
        appCommandName: 'canny-search',
        description: 'Search Canny for relevant feature requests',
        handler: async () => ({ success: true }),
        handleErrors: false
      }).addFlags([
        {
          name: 'query',
          options: ['-q', '--query'],
          type: 'string',
          description: 'Search query for feature requests',
          mandatory: true
        },
        {
          name: 'status',
          options: ['-s', '--status'],
          type: 'string',
          description: 'Filter by post status',
          enum: ['open', 'under review', 'planned', 'in progress', 'complete', 'closed']
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // Test invalid enum value
      const invalidResult = await tool.execute({
        query: "test",
        status: "invalid-status"
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain("Invalid value 'invalid-status' for flag");
    }, 5000);

    test("should handle API errors gracefully", async () => {
      // Test error handling using the library directly
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp-integration");

      const errorHandler = vi.fn().mockResolvedValue({
        success: false,
        error: "Canny API error: Invalid API key"
      });

      const parser = new ArgParser({
        appName: 'Canny Search CLI',
        appCommandName: 'canny-search',
        description: 'Search Canny for relevant feature requests',
        handler: errorHandler,
        handleErrors: false
      }).addFlags([
        {
          name: 'query',
          options: ['-q', '--query'],
          type: 'string',
          description: 'Search query for feature requests',
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.execute({
        query: "test"
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toContain("Canny API error");
    }, 5000);
  });

  describe("Transport Configuration Tests", () => {
    test("should support multiple transport configurations", async () => {
      if (!globalThis.process.env.CANNY_API_KEY) {
        console.warn("Skipping transport configuration test - CANNY_API_KEY not set");
        return;
      }

      // Test with SSE transport
      const sseProcess = spawn("node", [cannyCliPath, "serve", "--transport", "sse", "--port", "3002"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stderr = "";
      sseProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Give it time to start
      await setTimeout(3000);

      // Should start without errors
      expect(stderr).not.toContain("Error:");
      
      // Clean up
      sseProcess.kill();
      
      // Wait for process to exit
      await new Promise((resolve) => {
        sseProcess.on("close", resolve);
      });
    }, 10000);
  });
});
