import { describe, test, expect } from "vitest";
import { ArgParser } from "../src/core/ArgParser";
import { sanitizeMcpToolName, isValidMcpToolName } from "../src/mcp/mcp-utils";

describe("MCP Tool Name Sanitization", () => {
  describe("sanitizeMcpToolName utility", () => {
    test("should keep valid names unchanged", () => {
      expect(sanitizeMcpToolName("valid-tool")).toBe("valid-tool");
      expect(sanitizeMcpToolName("valid_tool")).toBe("valid_tool");
      expect(sanitizeMcpToolName("ValidTool123")).toBe("ValidTool123");
      expect(sanitizeMcpToolName("a")).toBe("a");
    });

    test("should replace invalid characters with underscores", () => {
      expect(sanitizeMcpToolName("test.tool")).toBe("test_tool");
      expect(sanitizeMcpToolName("test@tool")).toBe("test_tool");
      expect(sanitizeMcpToolName("test tool")).toBe("test_tool");
      expect(sanitizeMcpToolName("test/tool")).toBe("test_tool");
      expect(sanitizeMcpToolName("test:tool")).toBe("test_tool");
      expect(sanitizeMcpToolName("test!@#$%tool")).toBe("test_____tool");
    });

    test("should handle empty or invalid input", () => {
      expect(() => sanitizeMcpToolName("")).toThrow("Tool name must be a non-empty string");
      expect(() => sanitizeMcpToolName(null as any)).toThrow("Tool name must be a non-empty string");
      expect(() => sanitizeMcpToolName(undefined as any)).toThrow("Tool name must be a non-empty string");
    });

    test("should truncate names longer than 64 characters", () => {
      const longName = "a".repeat(70);
      const sanitized = sanitizeMcpToolName(longName);
      expect(sanitized.length).toBe(64);
      expect(sanitized).toBe("a".repeat(64));
    });

    test("should handle names that become empty after sanitization", () => {
      expect(sanitizeMcpToolName("!@#$%")).toBe("tool");
      expect(sanitizeMcpToolName("...")).toBe("tool");
    });
  });

  describe("isValidMcpToolName utility", () => {
    test("should validate correct names", () => {
      expect(isValidMcpToolName("valid-tool")).toBe(true);
      expect(isValidMcpToolName("valid_tool")).toBe(true);
      expect(isValidMcpToolName("ValidTool123")).toBe(true);
      expect(isValidMcpToolName("a")).toBe(true);
      expect(isValidMcpToolName("a".repeat(64))).toBe(true);
    });

    test("should reject invalid names", () => {
      expect(isValidMcpToolName("test.tool")).toBe(false);
      expect(isValidMcpToolName("test tool")).toBe(false);
      expect(isValidMcpToolName("test@tool")).toBe(false);
      expect(isValidMcpToolName("")).toBe(false);
      expect(isValidMcpToolName("a".repeat(65))).toBe(false);
      expect(isValidMcpToolName(null as any)).toBe(false);
      expect(isValidMcpToolName(undefined as any)).toBe(false);
    });
  });

  describe("ArgParser tool name sanitization", () => {
    test("should sanitize tool names in addTool", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
      });

      // Capture console warnings
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (message: string) => warnings.push(message);

      parser.addTool({
        name: "test.tool",
        description: "A test tool with invalid name",
        flags: [],
        handler: async () => ({ result: "test" }),
      });

      // Restore console.warn
      console.warn = originalWarn;

      // Check that warning was issued
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("test.tool");
      expect(warnings[0]).toContain("test_tool");
      expect(warnings[0]).toContain("MCP compatibility");

      // Check that the tool was stored with sanitized name
      const tools = parser.getTools();
      expect(tools.has("test_tool")).toBe(true);
      expect(tools.has("test.tool")).toBe(false);
    });

    test("should sanitize tool names in addMcpTool (deprecated)", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
      });

      // Capture console warnings
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (message: string) => warnings.push(message);

      parser.addMcpTool({
        name: "test@tool",
        description: "A test tool with invalid name",
        handler: async () => ({ result: "test" }),
      });

      // Restore console.warn
      console.warn = originalWarn;

      // Check that warnings were issued (deprecation + sanitization)
      expect(warnings.length).toBeGreaterThanOrEqual(2);
      const sanitizationWarning = warnings.find(w => w.includes("test@tool") && w.includes("test_tool"));
      expect(sanitizationWarning).toBeDefined();

      // Check that the tool was stored with sanitized name
      const mcpTools = parser.getMcpTools();
      expect(mcpTools.has("test_tool")).toBe(true);
      expect(mcpTools.has("test@tool")).toBe(false);
    });

    test("should prevent duplicate tools after sanitization", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
      });

      // Suppress warnings for this test
      const originalWarn = console.warn;
      console.warn = () => {};

      parser.addTool({
        name: "test.tool",
        description: "First tool",
        flags: [],
        handler: async () => ({ result: "first" }),
      });

      expect(() => {
        parser.addTool({
          name: "test_tool", // This would sanitize to the same name
          description: "Second tool",
          flags: [],
          handler: async () => ({ result: "second" }),
        });
      }).toThrow("Tool with name 'test_tool' already exists");

      // Restore console.warn
      console.warn = originalWarn;
    });

    test("should generate MCP tools with sanitized names", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
      });

      // Suppress warnings for this test
      const originalWarn = console.warn;
      console.warn = () => {};

      parser.addTool({
        name: "test.tool.name",
        description: "A test tool",
        flags: [
          {
            name: "input",
            options: ["--input"],
            type: "string",
            description: "Input value",
          },
        ],
        handler: async () => ({ result: "test" }),
      });

      // Restore console.warn
      console.warn = originalWarn;

      const mcpTools = parser.toMcpTools();
      const testTool = mcpTools.find(t => t.name === "test_tool_name");
      
      expect(testTool).toBeDefined();
      expect(testTool?.name).toBe("test_tool_name");
      expect(testTool?.description).toBe("A test tool");
    });
  });
});
