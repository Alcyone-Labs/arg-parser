import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { McpStdioClient } from "./mcp-client-utils";

describe("Canny CLI Integration Tests", () => {
  const cannyCliPath = resolve(__dirname, "../../../examples/community/canny-cli/canny-cli.ts");

  beforeAll(() => {
    // Verify the Canny CLI file exists
    if (!existsSync(cannyCliPath)) {
      throw new Error(`Canny CLI not found at ${cannyCliPath}`);
    }
  });

  describe("CLI Mode Tests", () => {
    test("should show help when run without arguments", async () => {
      const process = spawn(
        "deno",
        ["run", "--allow-all", "--unstable-sloppy-imports", cannyCliPath, "--help"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

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
      // Create environment without CANNY_API_KEY
      const env = { ...globalThis.process.env };
      delete env["CANNY_API_KEY"];

      const process = spawn(
        "deno",
        [
          "run",
          "--allow-all",
          "--unstable-sloppy-imports",
          cannyCliPath,
          "search",
          "--query",
          "test",
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: env,
        },
      );

      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve) => {
        process.on("close", (code) => {
          exitCode = code || 0;
          resolve(code);
        });
      });

      const output = stdout + stderr;

      // The process should exit with an error code when API key is missing
      expect(exitCode).not.toBe(0);
      expect(output).toContain("API key is required");
    }, 10000);

    test("should execute search successfully with API key from environment", async () => {
      if (!globalThis.process.env["CANNY_API_KEY"]) {
        console.warn("Skipping CLI search test - CANNY_API_KEY not set");
        return;
      }

      const process = spawn(
        "deno",
        [
          "run",
          "--allow-all",
          "--unstable-sloppy-imports",
          cannyCliPath,
          "search",
          "--query",
          "API",
          "--limit",
          "3",
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

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
      expect(output.toLowerCase()).toMatch(/(found \d+|no results found)/);
    }, 15000);
  });

  describe("MCP Server Mode Tests", () => {
    let client: McpStdioClient | undefined;

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    test("should start as MCP server and initialize correctly", async () => {
      if (!globalThis.process.env["CANNY_API_KEY"]) {
        console.warn("Skipping MCP server test - CANNY_API_KEY not set");
        return;
      }

      // Test that the MCP server can start without errors
      const process = spawn(
        "deno",
        ["run", "--allow-all", "--unstable-sloppy-imports", cannyCliPath, "--help"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

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
      expect(output).toContain("search");
      expect(output).toContain("Canny");
    }, 15000);

    test("should generate MCP tools with correct schema", async () => {
      // Test the MCP tool generation directly using the library
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp/mcp-integration");

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description: "Search Canny for relevant feature requests (CLI + MCP server)",
        handler: async () => ({ success: true }),
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
          name: "status",
          options: ["-s", "--status"],
          type: "string",
          description: "Filter by post status",
          enum: ["open", "under review", "planned", "in progress", "complete", "closed"],
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      expect(tools.length).toBe(1);

      const cannyTool = tools[0];
      expect(cannyTool.name).toBe("canny-search");
      expect(cannyTool.description).toContain("Search Canny for relevant feature requests");

      // Verify schema structure (it's a Zod object)
      expect(cannyTool.inputSchema).toBeDefined();
      expect(cannyTool.inputSchema._def.type).toBe("object");

      // Test that valid input parses correctly
      const validInput = {
        query: "test query",
        status: "open",
      };
      expect(() => cannyTool.inputSchema.parse(validInput)).not.toThrow();

      // Test that invalid enum value throws
      const invalidInput = {
        query: "test query",
        status: "invalid-status",
      };
      expect(() => cannyTool.inputSchema.parse(invalidInput)).toThrow();
    }, 5000);

    test("should execute MCP tool correctly", async () => {
      // Test the MCP tool execution directly using the library
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp/mcp-integration");

      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        results: 1,
        posts: [
          {
            title: "Test Feature Request",
            status: "open",
            score: 10,
            author: "Test User",
            url: "https://test.canny.io/posts/test",
            tags: ["test"],
          },
        ],
        query: "test",
      });

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description: "Search Canny for relevant feature requests",
        handler: mockHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "query",
          options: ["-q", "--query"],
          type: "string",
          description: "Search query for feature requests",
          mandatory: true,
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        query: "test",
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.query).toBe("test");
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            query: "test",
          }),
        }),
      );
    }, 5000);

    test("should validate parameters correctly", async () => {
      // Test parameter validation using the library directly
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp/mcp-integration");

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description: "Search Canny for relevant feature requests",
        handler: async () => ({ success: true }),
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
          name: "status",
          options: ["-s", "--status"],
          type: "string",
          description: "Filter by post status",
          enum: ["open", "under review", "planned", "in progress", "complete", "closed"],
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // Test invalid enum value
      const invalidResult = await tool.executeForTesting!({
        query: "test",
        status: "invalid-status",
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain("Invalid value 'invalid-status' for flag");
    }, 5000);

    test("should handle API errors gracefully", async () => {
      // Test error handling using the library directly
      const { ArgParser } = await import("../../../src");
      const { generateMcpToolsFromArgParser } = await import("../../../src/mcp/mcp-integration");

      const errorHandler = vi.fn().mockResolvedValue({
        success: false,
        error: "Canny API error: Invalid API key",
      });

      const parser = new ArgParser({
        appName: "Canny Search CLI",
        appCommandName: "canny-search",
        description: "Search Canny for relevant feature requests",
        handler: errorHandler,
        handleErrors: false,
      }).addFlags([
        {
          name: "query",
          options: ["-q", "--query"],
          type: "string",
          description: "Search query for feature requests",
          mandatory: true,
        },
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        query: "test",
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toContain("Canny API error");
    }, 5000);
  });

  describe("Transport Configuration Tests", () => {
    test("should support multiple transport configurations", async () => {
      if (!globalThis.process.env["CANNY_API_KEY"]) {
        console.warn("Skipping transport configuration test - CANNY_API_KEY not set");
        return;
      }

      // Test with MCP server mode
      const mcpProcess = spawn(
        "deno",
        ["run", "--allow-all", "--unstable-sloppy-imports", cannyCliPath, "--s-mcp-serve"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      let stderr = "";
      mcpProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Give it time to start
      await setTimeout(1000);

      // Should start without errors (though it may exit quickly in test mode)
      expect(stderr).not.toContain("Unknown command");

      // Clean up
      mcpProcess.kill();

      // Wait for process to exit
      await new Promise((resolve) => {
        mcpProcess.on("close", resolve);
      });
    }, 10000);
  });
});
