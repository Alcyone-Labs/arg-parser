import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { ArgParser } from "../../../src";
import { generateMcpToolsFromArgParser } from "../../../src/mcp-integration";
import type { IFlag } from "../../../src";
import { McpStdioClient } from "./mcp-client-utils";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";

describe("MCP End-to-End Integration Tests", () => {

  describe("MCP Tool Generation and Execution", () => {
    test("should generate MCP tools from complex ArgParser with sub-commands", () => {
      const mainParser = new ArgParser({
        appName: "Test MCP Server",
        appCommandName: "test-server",
        description: "A test MCP server for integration testing",
        handler: async (ctx) => {
          return {
            message: "Hello from test server",
            input: ctx.args.input,
            timestamp: new Date().toISOString()
          };
        }
      }).addFlags([
        {
          name: "input",
          description: "Input text to process",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true
        },
        {
          name: "verbose",
          description: "Enable verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true
        }
      ]);

      const analyzeParser = new ArgParser({
        appName: "Analyze Command",
        description: "Analyze input data",
        handler: async (ctx) => {
          return {
            analysis: "Data analyzed successfully",
            input: ctx.args.data,
            method: ctx.args.method || "default"
          };
        }
      }).addFlags([
        {
          name: "data",
          description: "Data to analyze",
          options: ["--data", "-d"],
          type: "string",
          mandatory: true
        },
        {
          name: "method",
          description: "Analysis method",
          options: ["--method", "-m"],
          type: "string",
          enum: ["basic", "advanced", "statistical"],
          defaultValue: "basic"
        }
      ]);

      mainParser.addSubCommand({
        name: "analyze",
        description: "Analyze input data",
        parser: analyzeParser
      });

      const tools = generateMcpToolsFromArgParser(mainParser);

      expect(tools.length).toBeGreaterThan(0);

      // Should have main tool and sub-command tool
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain("test-server");

      // Find the main tool
      const mainTool = tools.find(t => t.name === "test-server");
      expect(mainTool).toBeDefined();
      expect(mainTool?.description).toBe("A test MCP server for integration testing");
      expect(mainTool?.inputSchema).toBeDefined();
    });

    test("should execute main tool correctly", async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        message: "Hello from test server",
        input: "test input data",
        timestamp: "2024-01-01T00:00:00.000Z"
      });

      const parser = new ArgParser({
        appName: "Test MCP Server",
        appCommandName: "test-server",
        description: "A test MCP server for integration testing",
        handler: mockHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "input",
          description: "Input text to process",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true
        },
        {
          name: "verbose",
          description: "Enable verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const mainTool = tools.find(t => t.name === "test-server");
      expect(mainTool).toBeDefined();

      const result = await mainTool!.executeForTesting!({
        input: "test input data",
        verbose: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: "Hello from test server",
        input: "test input data",
        timestamp: "2024-01-01T00:00:00.000Z"
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            input: "test input data",
            verbose: true
          })
        })
      );
    });

    test("should execute sub-command tool correctly", async () => {
      const mainHandler = vi.fn();
      const analyzeHandler = vi.fn().mockResolvedValue({
        analysis: "Data analyzed successfully",
        input: "sample data for analysis",
        method: "advanced"
      });

      const mainParser = new ArgParser({
        appName: "Test MCP Server",
        appCommandName: "test-server",
        description: "A test MCP server for integration testing",
        handler: mainHandler,
        handleErrors: false
      });

      const analyzeParser = new ArgParser({
        appName: "Analyze Command",
        description: "Analyze input data",
        handler: analyzeHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "data",
          description: "Data to analyze",
          options: ["--data", "-d"],
          type: "string",
          mandatory: true
        },
        {
          name: "method",
          description: "Analysis method",
          options: ["--method", "-m"],
          type: "string",
          enum: ["basic", "advanced", "statistical"],
          defaultValue: "basic"
        }
      ]);

      mainParser.addSubCommand({
        name: "analyze",
        description: "Analyze input data",
        parser: analyzeParser
      });

      const tools = generateMcpToolsFromArgParser(mainParser);

      // Find the analyze tool (it might be named differently)
      const analyzeTool = tools.find(t => t.name.includes("analyze"));
      expect(analyzeTool).toBeDefined();

      const result = await analyzeTool!.executeForTesting!({
        data: "sample data for analysis",
        method: "advanced"
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        analysis: "Data analyzed successfully",
        input: "sample data for analysis",
        method: "advanced"
      });

      expect(analyzeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            data: "sample data for analysis",
            method: "advanced"
          })
        })
      );
    });

    test("should handle tool execution errors gracefully", async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error("Processing failed"));

      const parser = new ArgParser({
        appName: "Error Test Server",
        appCommandName: "error-server",
        description: "A server that tests error handling",
        handler: errorHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "input",
          description: "Input text to process",
          options: ["--input", "-i"],
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
      expect(result.error).toContain("Processing failed");
      expect(errorHandler).toHaveBeenCalled();
    });

    test("should handle missing mandatory parameters", async () => {
      const parser = new ArgParser({
        appName: "Validation Test Server",
        appCommandName: "validation-server",
        description: "A server that tests parameter validation",
        handler: async () => ({ success: true }),
        handleErrors: false
      }).addFlags([
        {
          name: "required",
          description: "Required parameter",
          options: ["--required", "-r"],
          type: "string",
          mandatory: true
        },
        {
          name: "optional",
          description: "Optional parameter",
          options: ["--optional", "-o"],
          type: "string"
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        optional: "value"
        // Missing required parameter
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing mandatory flags");
    });

    test("should validate enum parameters correctly", async () => {
      const parser = new ArgParser({
        appName: "Enum Test Server",
        appCommandName: "enum-server",
        description: "A server that tests enum validation",
        handler: async (ctx) => ({ choice: ctx.args.choice }),
        handleErrors: false
      }).addFlags([
        {
          name: "choice",
          description: "Choice parameter",
          options: ["--choice", "-c"],
          type: "string",
          enum: ["option1", "option2", "option3"],
          mandatory: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      // Valid enum value should work
      const validResult = await tool.executeForTesting!({
        choice: "option2"
      });
      expect(validResult.success).toBe(true);
      expect(validResult.data.choice).toBe("option2");

      // Invalid enum value should fail
      const invalidResult = await tool.executeForTesting!({
        choice: "invalid-option"
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe("MCP Server Creation", () => {
    test("should create MCP server with proper configuration", async () => {
      const parser = new ArgParser({
        appName: "Server Creation Test",
        appCommandName: "server-test",
        description: "Test MCP server creation",
        handler: async () => ({ created: true })
      });

      const server = await parser.createMcpServer({
        name: "test-mcp-server",
        version: "1.0.0",
        description: "Test MCP server"
      });

      expect(server).toBeDefined();
      expect(typeof server).toBe("object");
    });

    test("should generate tools with correct schemas", () => {
      const parser = new ArgParser({
        appName: "Schema Test",
        appCommandName: "schema-test",
        description: "Test tool schema generation",
        handler: async () => ({ success: true })
      }).addFlags([
        {
          name: "text",
          description: "Text input",
          options: ["--text", "-t"],
          type: "string",
          mandatory: true
        },
        {
          name: "number",
          description: "Number input",
          options: ["--number", "-n"],
          type: "number",
          defaultValue: 42
        },
        {
          name: "flag",
          description: "Boolean flag",
          options: ["--flag", "-f"],
          type: "boolean",
          flagOnly: true
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);
      const tool = tools[0];

      expect(tool.name).toBe("schema-test");
      expect(tool.description).toBe("Test tool schema generation");
      expect(tool.inputSchema).toBeDefined();

      // Test schema validation
      const validInput = { text: "hello", number: 123, flag: true };
      expect(() => tool.inputSchema.parse(validInput)).not.toThrow();

      const invalidInput = { text: "hello", number: "not-a-number", flag: "not-boolean" };
      expect(() => tool.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe("Real-World Canny CLI MCP Server Integration", () => {
    const cannyCliPath = resolve(__dirname, "../../../examples/community/canny-cli/canny-cli.js");
    let client: McpStdioClient;

    beforeAll(() => {
      // Verify the Canny CLI file exists
      if (!existsSync(cannyCliPath)) {
        throw new Error(`Canny CLI not found at ${cannyCliPath}`);
      }
    });

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    test("should start Canny CLI as MCP server and connect successfully", async () => {
      // Skip this test if no CANNY_API_KEY is available
      if (!process.env.CANNY_API_KEY) {
        console.warn("Skipping Canny CLI MCP test - CANNY_API_KEY not set");
        return;
      }

      client = new McpStdioClient("node", [cannyCliPath, "--s-mcp-serve"], {
        timeout: 15000,
        debug: true
      });

      await client.connect();
      await setTimeout(1000); // Give server time to initialize

      const serverInfo = await client.initialize({
        name: "test-client",
        version: "1.0.0"
      });

      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe("canny-mcp-server");
      expect(serverInfo.version).toBe("1.0.0");
    }, 20000);

    test("should list Canny search tool correctly", async () => {
      if (!process.env.CANNY_API_KEY || !client) {
        console.warn("Skipping Canny CLI tool listing test - CANNY_API_KEY not set or client not connected");
        return;
      }

      const toolsResponse = await client.listTools();

      expect(toolsResponse.tools).toBeDefined();
      expect(toolsResponse.tools.length).toBeGreaterThan(0);

      const cannyTool = toolsResponse.tools.find(tool => tool.name === "search");
      expect(cannyTool).toBeDefined();
      expect(cannyTool?.description).toContain("Search Canny for relevant feature requests");
      expect(cannyTool?.inputSchema).toBeDefined();

      expect(cannyTool?.inputSchema.properties).toHaveProperty("query");
      // The MCP SDK converts Zod schemas to JSON Schema format
      // The query field should be present in properties (it's mandatory in the ArgParser definition)
      expect(cannyTool?.inputSchema.properties?.query).toBeDefined();
      expect(cannyTool?.inputSchema.properties?.query?.type).toBe("string");
    }, 15000);

    test("should execute Canny search tool successfully", async () => {
      if (!process.env.CANNY_API_KEY || !client) {
        console.warn("Skipping Canny CLI tool execution test - CANNY_API_KEY not set or client not connected");
        return;
      }

      const result = await client.callTool("search", {
        query: "API",
        limit: 3,
        status: "open"
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // The result should be a successful search
      const searchResult = result.content[0];
      expect(searchResult.type).toBe("text");

      // Parse the JSON result
      const data = JSON.parse(searchResult.text);
      expect(data.success).toBe(true);
      expect(data.query).toBe("API");
      expect(Array.isArray(data.results)).toBe(true);
      expect(typeof data.total).toBe("number");

      if (data.total > 0) {
        expect(data.results).toBeDefined();
        expect(Array.isArray(data.results)).toBe(true);
        expect(data.results.length).toBeLessThanOrEqual(3);

        // Verify post structure
        const firstPost = data.posts[0];
        expect(firstPost).toHaveProperty("title");
        expect(firstPost).toHaveProperty("status");
        expect(firstPost).toHaveProperty("score");
        expect(firstPost).toHaveProperty("author");
        expect(firstPost).toHaveProperty("url");
      }
    }, 20000);

    test("should handle invalid parameters gracefully", async () => {
      if (!process.env.CANNY_API_KEY || !client) {
        console.warn("Skipping Canny CLI error handling test - CANNY_API_KEY not set or client not connected");
        return;
      }

      // Test with missing mandatory query parameter
      try {
        const result = await client.callTool("search", {
          limit: 5
          // Missing required 'query' parameter
        });

        // If we get a result, it should be an error response
        expect(result).toBeDefined();
        if (result.content && Array.isArray(result.content)) {
          const errorContent = result.content[0];
          expect(errorContent.type).toBe("text");
          const errorData = JSON.parse(errorContent.text);
          expect(errorData.error).toContain("Missing mandatory flags");
        } else {
          // Should not reach here without an error
          expect(true).toBe(false);
        }
      } catch (error) {
        // Also accept MCP errors as valid error handling
        expect(error).toBeDefined();
        expect(error.message).toMatch(/Missing mandatory flags|MCP Error|Process exited/);
      }
    }, 15000);

    test("should handle invalid parameters correctly", async () => {
      if (!process.env.CANNY_API_KEY || !client) {
        console.warn("Skipping Canny CLI parameter validation test - CANNY_API_KEY not set or client not connected");
        return;
      }

      // Test with missing mandatory query parameter
      try {
        const result = await client.callTool("search", {
          // Missing mandatory 'query' parameter
          limit: 5
        });

        // If we get a result, it should be an error response
        expect(result).toBeDefined();
        if (result.content && Array.isArray(result.content)) {
          const errorContent = result.content[0];
          expect(errorContent.type).toBe("text");
          const errorData = JSON.parse(errorContent.text);
          expect(errorData.error).toMatch(/Missing mandatory|query.*required/);
        } else {
          // Should not reach here without an error
          expect(true).toBe(false);
        }
      } catch (error) {
        // Also accept MCP errors as valid error handling
        expect(error).toBeDefined();
        if (error.message) {
          expect(error.message).toMatch(/Missing mandatory|query.*required|MCP Error|Process exited/);
        } else {
          // If error.message is undefined, just check that error exists
          expect(error).toBeTruthy();
        }
      }
    }, 15000);
  });
});
