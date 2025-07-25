import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ArgParser } from "../../src";
import {
  compareVersions,
  CURRENT_MCP_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSIONS,
} from "../../src/mcp/mcp-protocol-versions";

describe("Output Schema Version Handling", () => {
  describe("MCP Protocol Version Support", () => {
    test("should support output schemas for version 2025-06-18 and later", () => {
      const parser = new ArgParser({
        appName: "Version Test",
        appCommandName: "version-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18")
        .addTool({
          name: "schema-tool",
          description: "Tool with output schema",
          flags: [
            {
              name: "input",
              description: "Input value",
              options: ["--input"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            result: z.string(),
            success: z.boolean(),
          },
          handler: async (ctx) => ({
            result: `Processed: ${ctx.args.input}`,
            success: true,
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "schema-tool");

      // Tool should have output schema included
      expect(tool?.outputSchema).toBeDefined();
      expect(tool?.outputSchema?._def.type).toBe("object");
    });

    test("should NOT support output schemas for versions before 2025-06-18", () => {
      const parser = new ArgParser({
        appName: "Version Test",
        appCommandName: "version-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2024-11-05") // Earlier version
        .addTool({
          name: "schema-tool",
          description: "Tool with output schema",
          flags: [
            {
              name: "input",
              description: "Input value",
              options: ["--input"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            result: z.string(),
            success: z.boolean(),
          },
          handler: async (ctx) => ({
            result: `Processed: ${ctx.args.input}`,
            success: true,
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "schema-tool");

      // Tool should NOT have output schema included due to version
      expect(tool?.outputSchema).toBeUndefined();
    });

    test("should use current version by default", () => {
      const parser = new ArgParser({
        appName: "Version Test",
        appCommandName: "version-test",
        handler: async () => ({ success: true }),
      }).addTool({
        name: "schema-tool",
        description: "Tool with output schema",
        flags: [],
        outputSchema: "successError",
        handler: async () => ({
          success: true,
          message: "Test completed",
        }),
      });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "schema-tool");

      // Should include output schema since current version supports it
      expect(tool?.outputSchema).toBeDefined();
    });
  });

  describe("Response Format Based on Version", () => {
    test("should include structuredContent when version supports output schemas", async () => {
      const parser = new ArgParser({
        appName: "Response Test",
        appCommandName: "response-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18") // Version that supports output schemas
        .addTool({
          name: "response-tool",
          description: "Tool for response testing",
          flags: [
            {
              name: "data",
              description: "Data to process",
              options: ["--data"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            processed: z.string(),
            timestamp: z.string(),
          },
          handler: async (ctx) => ({
            processed: `Result: ${ctx.args.data}`,
            timestamp: new Date().toISOString(),
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "response-tool");

      const result = await tool!.execute({ data: "test-input" });

      // Should include both content and structuredContent
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("structuredContent");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.structuredContent).toMatchObject({
        processed: "Result: test-input",
        timestamp: expect.any(String),
      });
    });

    test("should NOT include structuredContent when version doesn't support output schemas", async () => {
      const parser = new ArgParser({
        appName: "Response Test",
        appCommandName: "response-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2024-11-05") // Version that doesn't support output schemas
        .addTool({
          name: "response-tool",
          description: "Tool for response testing",
          flags: [
            {
              name: "data",
              description: "Data to process",
              options: ["--data"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            processed: z.string(),
            timestamp: z.string(),
          },
          handler: async (ctx) => ({
            processed: `Result: ${ctx.args.data}`,
            timestamp: new Date().toISOString(),
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "response-tool");

      const result = await tool!.execute({ data: "test-input" });

      // Should only include content, not structuredContent
      expect(result).toHaveProperty("content");
      expect(result).not.toHaveProperty("structuredContent");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
    });

    test("should never include structuredContent for tools without output schema", async () => {
      const parser = new ArgParser({
        appName: "No Schema Test",
        appCommandName: "no-schema-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18") // Even with latest version
        .addTool({
          name: "no-schema-tool",
          description: "Tool without output schema",
          flags: [
            {
              name: "data",
              description: "Data to process",
              options: ["--data"],
              type: "string",
              mandatory: true,
            },
          ],
          // No outputSchema specified
          handler: async (ctx) => ({
            result: `Processed: ${ctx.args.data}`,
            timestamp: Date.now(),
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "no-schema-tool");

      const result = await tool!.execute({ data: "test-input" });

      // Should only include content, never structuredContent for tools without schema
      expect(result).toHaveProperty("content");
      expect(result).not.toHaveProperty("structuredContent");
    });
  });

  describe("Version Comparison Edge Cases", () => {
    test("should handle exact version boundary correctly", () => {
      // Test exactly the version that introduced output schemas
      const parserExact = new ArgParser({
        appName: "Boundary Test",
        appCommandName: "boundary-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18")
        .addTool({
          name: "boundary-tool",
          description: "Tool for boundary testing",
          flags: [],
          outputSchema: "successError",
          handler: async () => ({ success: true, message: "boundary test" }),
        });

      const tools = parserExact.toMcpTools();
      const tool = tools.find((t) => t.name === "boundary-tool");

      // Should support output schemas at exactly version 2025-06-18
      expect(tool?.outputSchema).toBeDefined();
    });

    test("should handle day before version boundary", () => {
      const parserBefore = new ArgParser({
        appName: "Before Test",
        appCommandName: "before-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-17") // Day before
        .addTool({
          name: "before-tool",
          description: "Tool for before testing",
          flags: [],
          outputSchema: "successError",
          handler: async () => ({ success: true, message: "before test" }),
        });

      const tools = parserBefore.toMcpTools();
      const tool = tools.find((t) => t.name === "before-tool");

      // Should NOT support output schemas the day before
      expect(tool?.outputSchema).toBeUndefined();
    });

    test("should handle future versions", () => {
      const parserFuture = new ArgParser({
        appName: "Future Test",
        appCommandName: "future-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2026-01-01") // Future version
        .addTool({
          name: "future-tool",
          description: "Tool for future testing",
          flags: [],
          outputSchema: "successWithData",
          handler: async () => ({
            success: true,
            data: "future test",
            message: "From the future",
          }),
        });

      const tools = parserFuture.toMcpTools();
      const tool = tools.find((t) => t.name === "future-tool");

      // Future versions should support output schemas
      expect(tool?.outputSchema).toBeDefined();
    });
  });

  describe("Multiple Tools with Mixed Schemas", () => {
    test("should handle mixed tools correctly based on version", async () => {
      const parser = new ArgParser({
        appName: "Mixed Test",
        appCommandName: "mixed-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18")
        .addTool({
          name: "with-schema",
          description: "Tool with schema",
          flags: [],
          outputSchema: "successError",
          handler: async () => ({ success: true, message: "has schema" }),
        })
        .addTool({
          name: "without-schema",
          description: "Tool without schema",
          flags: [],
          // No outputSchema
          handler: async () => ({ result: "no schema", timestamp: Date.now() }),
        });

      const tools = parser.toMcpTools();
      const withSchema = tools.find((t) => t.name === "with-schema");
      const withoutSchema = tools.find((t) => t.name === "without-schema");

      // Tool with schema should have output schema
      expect(withSchema?.outputSchema).toBeDefined();
      // Tool without schema should not have output schema
      expect(withoutSchema?.outputSchema).toBeUndefined();

      // Test execution results
      const withSchemaResult = await withSchema!.execute({});
      const withoutSchemaResult = await withoutSchema!.execute({});

      // Tool with schema should have structuredContent
      expect(withSchemaResult).toHaveProperty("structuredContent");
      // Tool without schema should not have structuredContent
      expect(withoutSchemaResult).not.toHaveProperty("structuredContent");
    });

    test("should handle version downgrade scenario", () => {
      const parser = new ArgParser({
        appName: "Downgrade Test",
        appCommandName: "downgrade-test",
        handler: async () => ({ success: true }),
      }).addTool({
        name: "schema-tool",
        description: "Tool with schema",
        flags: [],
        outputSchema: "fileOperation",
        handler: async () => ({
          path: "/test/file",
          size: 1024,
          exists: true,
        }),
      });

      // First, check with current version (should support)
      let tools = parser.toMcpTools();
      let tool = tools.find((t) => t.name === "schema-tool");
      expect(tool?.outputSchema).toBeDefined();

      // Then downgrade version (should not support)
      parser.setMcpProtocolVersion("2024-11-05");
      tools = parser.toMcpTools();
      tool = tools.find((t) => t.name === "schema-tool");
      expect(tool?.outputSchema).toBeUndefined();

      // Upgrade again (should support again)
      parser.setMcpProtocolVersion("2025-06-18");
      tools = parser.toMcpTools();
      tool = tools.find((t) => t.name === "schema-tool");
      expect(tool?.outputSchema).toBeDefined();
    });
  });

  describe("Error Handling with Version Awareness", () => {
    test("should handle errors consistently regardless of output schema version support", async () => {
      const parserSupported = new ArgParser({
        appName: "Error Test Supported",
        appCommandName: "error-test-supported",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18")
        .addTool({
          name: "error-tool",
          description: "Tool that errors",
          flags: [],
          outputSchema: "successError",
          handler: async () => {
            throw new Error("Test error");
          },
        });

      const parserNotSupported = new ArgParser({
        appName: "Error Test Not Supported",
        appCommandName: "error-test-not-supported",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2024-11-05")
        .addTool({
          name: "error-tool",
          description: "Tool that errors",
          flags: [],
          outputSchema: "successError", // Will be ignored due to version
          handler: async () => {
            throw new Error("Test error");
          },
        });

      const supportedTools = parserSupported.toMcpTools();
      const notSupportedTools = parserNotSupported.toMcpTools();

      const supportedTool = supportedTools.find((t) => t.name === "error-tool");
      const notSupportedTool = notSupportedTools.find(
        (t) => t.name === "error-tool",
      );

      // Version that supports output schemas should have output schema
      expect(supportedTool?.outputSchema).toBeDefined();
      // Version that doesn't support output schemas should not have output schema
      expect(notSupportedTool?.outputSchema).toBeUndefined();

      // Both should handle errors, but error response format may differ
      const supportedError = await supportedTool!.execute({});
      const notSupportedError = await notSupportedTool!.execute({});

      // Both should indicate errors
      expect(supportedError).toHaveProperty("content");
      expect(notSupportedError).toHaveProperty("content");

      // Error content should contain error information
      expect(supportedError.content[0].text).toContain("Test error");
      expect(notSupportedError.content[0].text).toContain("Test error");
    });
  });

  describe("Debug Output for Version Handling", () => {
    test("should log debug information when output schema is removed due to version", () => {
      // Note: This test would need to capture console.error output to verify debug logging
      // For now, we'll just test that the behavior is correct
      const parser = new ArgParser({
        appName: "Debug Test",
        appCommandName: "debug-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2024-11-05") // Version that doesn't support output schemas
        .addTool({
          name: "debug-tool",
          description: "Tool for debug testing",
          flags: [],
          outputSchema: {
            message: z.string(),
            timestamp: z.string(),
          },
          handler: async () => ({
            message: "debug test",
            timestamp: new Date().toISOString(),
          }),
        });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "debug-tool");

      // Output schema should be removed due to version
      expect(tool?.outputSchema).toBeUndefined();
    });
  });
});
