import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ArgParser } from "../../src";

describe("Output Schema Integration", () => {
  describe("Basic Output Schema Functionality", () => {
    test("should properly handle tools with and without output schemas", async () => {
      const parser = new ArgParser({
        appName: "Integration Test",
        appCommandName: "integration-test",
        handler: async () => ({ success: true }),
      })
        .addTool({
          name: "with-schema",
          description: "Tool with output schema",
          flags: [
            {
              name: "input",
              description: "Input data",
              options: ["--input"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            result: z.string().describe("Processed result"),
            timestamp: z.string().describe("Processing timestamp"),
            success: z.boolean().describe("Operation success"),
          },
          handler: async (ctx) => ({
            result: `Processed: ${ctx.args.input}`,
            timestamp: new Date().toISOString(),
            success: true,
          }),
        })
        .addTool({
          name: "without-schema",
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
          handler: async (ctx) => ({
            processed: ctx.args.data,
            timestamp: Date.now(),
          }),
        });

      const tools = parser.toMcpTools();

      const withSchema = tools.find((t) => t.name === "with-schema");
      const withoutSchema = tools.find((t) => t.name === "without-schema");

      // Verify tool definitions
      expect(withSchema?.outputSchema).toBeDefined();
      expect(withoutSchema?.outputSchema).toBeUndefined();

      // Execute tools and verify response formats
      const schemaResult = await withSchema!.execute({ input: "test-data" });
      const noSchemaResult = await withoutSchema!.execute({ data: "test-data" });

      // Tool with schema should include structuredContent
      expect(schemaResult).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining('"result": "Processed: test-data"'),
          },
        ],
        structuredContent: {
          result: "Processed: test-data",
          timestamp: expect.any(String),
          success: true,
        },
      });

      // Tool without schema should only have content
      expect(noSchemaResult).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining('"processed": "test-data"'),
          },
        ],
      });
      expect(noSchemaResult).not.toHaveProperty("structuredContent");
    });

    test("should support predefined output schema patterns", async () => {
      const parser = new ArgParser({
        appName: "Pattern Test",
        appCommandName: "pattern-test",
        handler: async () => ({ success: true }),
      })
        .addTool({
          name: "success-error-pattern",
          description: "Tool using successError pattern",
          flags: [],
          outputSchema: "successError",
          handler: async () => ({
            success: true,
            message: "Operation completed successfully",
          }),
        })
        .addTool({
          name: "file-operation-pattern",
          description: "Tool using fileOperation pattern",
          flags: [],
          outputSchema: "fileOperation",
          handler: async () => ({
            path: "/test/file.txt",
            size: 1024,
            exists: true,
            message: "File processed",
          }),
        });

      const tools = parser.toMcpTools();

      tools.forEach(tool => {
        if (tool.name !== "pattern-test") { // Skip main command
          expect(tool.outputSchema).toBeDefined();
          expect(tool.outputSchema?._def.typeName).toBe("ZodObject");
        }
      });

      const successTool = tools.find((t) => t.name === "success-error-pattern");
      const fileTool = tools.find((t) => t.name === "file-operation-pattern");

      const successResult = await successTool!.execute({});
      const fileResult = await fileTool!.execute({});

      expect(successResult).toHaveProperty("structuredContent");
      expect(fileResult).toHaveProperty("structuredContent");
    });
  });

  describe("Version-Aware Behavior", () => {
    test("should conditionally include output schemas based on MCP version", () => {
      const createParser = (version: string) =>
        new ArgParser({
          appName: "Version Test",
          appCommandName: "version-test",
          handler: async () => ({ success: true }),
        })
          .setMcpProtocolVersion(version)
          .addTool({
            name: "test-tool",
            description: "Test tool",
            flags: [],
            outputSchema: "successWithData",
            handler: async () => ({
              success: true,
              data: "test data",
            }),
          });

      // Version that supports output schemas
      const supportedParser = createParser("2025-06-18");
      const supportedTools = supportedParser.toMcpTools();
      const supportedTool = supportedTools.find((t) => t.name === "test-tool");
      expect(supportedTool?.outputSchema).toBeDefined();

      // Version that doesn't support output schemas
      const unsupportedParser = createParser("2024-11-05");
      const unsupportedTools = unsupportedParser.toMcpTools();
      const unsupportedTool = unsupportedTools.find((t) => t.name === "test-tool");
      expect(unsupportedTool?.outputSchema).toBeUndefined();
    });

    test("should format responses appropriately based on version support", async () => {
      const createParser = (version: string) =>
        new ArgParser({
          appName: "Response Format Test",
          appCommandName: "response-format-test",
          handler: async () => ({ success: true }),
        })
          .setMcpProtocolVersion(version)
          .addTool({
            name: "format-tool",
            description: "Format test tool",
            flags: [],
            outputSchema: {
              message: z.string(),
              formatted: z.boolean(),
            },
            handler: async () => ({
              message: "test message",
              formatted: true,
            }),
          });

      // Version with output schema support
      const supportedParser = createParser("2025-06-18");
      const supportedTools = supportedParser.toMcpTools();
      const supportedTool = supportedTools.find((t) => t.name === "format-tool");
      const supportedResult = await supportedTool!.execute({});

      expect(supportedResult).toHaveProperty("structuredContent");
      expect(supportedResult.structuredContent).toMatchObject({
        message: "test message",
        formatted: true,
      });

      // Version without output schema support
      const unsupportedParser = createParser("2024-11-05");
      const unsupportedTools = unsupportedParser.toMcpTools();
      const unsupportedTool = unsupportedTools.find((t) => t.name === "format-tool");
      const unsupportedResult = await unsupportedTool!.execute({});

      expect(unsupportedResult).not.toHaveProperty("structuredContent");
      expect(unsupportedResult).toHaveProperty("content");
    });
  });

  describe("Error Handling with Output Schemas", () => {
    test("should handle errors appropriately for tools with output schemas", async () => {
      const parser = new ArgParser({
        appName: "Error Test",
        appCommandName: "error-test",
        handler: async () => ({ success: true }),
      }).addTool({
        name: "error-tool",
        description: "Tool that can error",
        flags: [
          {
            name: "shouldFail",
            description: "Whether to fail",
            options: ["--fail"],
            type: "boolean",
            flagOnly: true,
          },
        ],
        outputSchema: "successError",
        handler: async (ctx) => {
          if (ctx.args.shouldFail) {
            throw new Error("Intentional test failure");
          }
          return {
            success: true,
            message: "Operation completed",
          };
        },
      });

      const tools = parser.toMcpTools();
      const tool = tools.find((t) => t.name === "error-tool");

      // Test successful execution
      const successResult = await tool!.execute({ shouldFail: false });
      expect(successResult).toHaveProperty("structuredContent");
      expect(successResult.structuredContent).toMatchObject({
        success: true,
        message: "Operation completed",
      });

      // Test error execution
      const errorResult = await tool!.execute({ shouldFail: true });
      expect(errorResult).toHaveProperty("content");
      expect(errorResult.content[0].text).toContain("Intentional test failure");
    });
  });

  describe("Complex Integration Scenarios", () => {
    test("should handle mixed tool configurations in a single parser", async () => {
      const parser = new ArgParser({
        appName: "Complex Test",
        appCommandName: "complex-test",
        handler: async () => ({ success: true }),
      })
        .setMcpProtocolVersion("2025-06-18")
        .addTool({
          name: "file-processor",
          description: "Process files",
          flags: [
            {
              name: "path",
              description: "File path",
              options: ["--path"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: "fileOperation",
          handler: async (ctx) => ({
            path: ctx.args.path,
            size: 1024,
            exists: true,
            message: "File processed successfully",
          }),
        })
        .addTool({
          name: "data-analyzer",
          description: "Analyze data",
          flags: [
            {
              name: "input",
              description: "Input data",
              options: ["--input"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: {
            analysis: z.object({
              summary: z.string(),
              wordCount: z.number(),
              sentiment: z.enum(["positive", "negative", "neutral"]),
            }),
            metadata: z.object({
              timestamp: z.string(),
              version: z.string(),
            }),
          },
          handler: async (ctx) => ({
            analysis: {
              summary: `Analysis of: ${ctx.args.input}`,
              wordCount: ctx.args.input.split(" ").length,
              sentiment: "neutral" as const,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              version: "1.0.0",
            },
          }),
        })
        .addTool({
          name: "simple-tool",
          description: "Simple tool without schema",
          flags: [],
          handler: async () => ({
            result: "simple result",
            timestamp: Date.now(),
          }),
        });

      const tools = parser.toMcpTools();

      // Verify tool configurations
      const fileProcessor = tools.find((t) => t.name === "file-processor");
      const dataAnalyzer = tools.find((t) => t.name === "data-analyzer");
      const simpleTool = tools.find((t) => t.name === "simple-tool");

      expect(fileProcessor?.outputSchema).toBeDefined();
      expect(dataAnalyzer?.outputSchema).toBeDefined();
      expect(simpleTool?.outputSchema).toBeUndefined();

      // Test executions
      const fileResult = await fileProcessor!.execute({ path: "/test/file.txt" });
      const analysisResult = await dataAnalyzer!.execute({ input: "hello world test" });
      const simpleResult = await simpleTool!.execute({});

      // Verify response formats
      expect(fileResult).toHaveProperty("structuredContent");
      expect(analysisResult).toHaveProperty("structuredContent");
      expect(simpleResult).not.toHaveProperty("structuredContent");

      // Verify structured content matches expected schemas
      expect(analysisResult.structuredContent).toMatchObject({
        analysis: {
          summary: "Analysis of: hello world test",
          wordCount: 3,
          sentiment: "neutral",
        },
        metadata: {
          timestamp: expect.any(String),
          version: "1.0.0",
        },
      });
    });

    test("should maintain consistency when switching between versions", () => {
      const parser = new ArgParser({
        appName: "Consistency Test",
        appCommandName: "consistency-test",
        handler: async () => ({ success: true }),
      }).addTool({
        name: "consistent-tool",
        description: "Tool for consistency testing",
        flags: [],
        outputSchema: "processExecution",
        handler: async () => ({
          command: "test-command",
          exitCode: 0,
          stdout: "test output",
          stderr: "",
          executionTime: 100,
        }),
      });

      // Start with version that supports output schemas
      parser.setMcpProtocolVersion("2025-06-18");
      let tools = parser.toMcpTools();
      let tool = tools.find((t) => t.name === "consistent-tool");
      expect(tool?.outputSchema).toBeDefined();

      // Switch to version that doesn't support output schemas
      parser.setMcpProtocolVersion("2024-11-05");
      tools = parser.toMcpTools();
      tool = tools.find((t) => t.name === "consistent-tool");
      expect(tool?.outputSchema).toBeUndefined();

      // Switch back to supported version
      parser.setMcpProtocolVersion("2025-06-18");
      tools = parser.toMcpTools();
      tool = tools.find((t) => t.name === "consistent-tool");
      expect(tool?.outputSchema).toBeDefined();
    });
  });

  describe("Real-World Usage Patterns", () => {
    test("should support common CLI-to-MCP conversion patterns", async () => {
      const parser = new ArgParser({
        appName: "CLI Converter",
        appCommandName: "cli-converter",
        handler: async () => ({ success: true }),
      })
        .addTool({
          name: "list-files",
          description: "List files in directory",
          flags: [
            {
              name: "directory",
              description: "Directory to list",
              options: ["--dir", "-d"],
              type: "string",
              mandatory: true,
            },
            {
              name: "recursive",
              description: "List recursively",
              options: ["--recursive", "-r"],
              type: "boolean",
              flagOnly: true,
            },
          ],
          outputSchema: "list",
          handler: async (ctx) => ({
            items: [
              { name: "file1.txt", type: "file", size: 100 },
              { name: "file2.txt", type: "file", size: 200 },
              { name: "subdir", type: "directory", size: 0 },
            ],
            metadata: {
              directory: ctx.args.directory,
              recursive: !!ctx.args.recursive,
              totalCount: 3,
            },
          }),
        })
        .addTool({
          name: "search-content",
          description: "Search file content",
          flags: [
            {
              name: "query",
              description: "Search query",
              options: ["--query", "-q"],
              type: "string",
              mandatory: true,
            },
            {
              name: "files",
              description: "Files to search",
              options: ["--files", "-f"],
              type: "array",
              allowMultiple: true,
            },
          ],
          outputSchema: {
            matches: z.array(z.object({
              file: z.string(),
              line: z.number(),
              content: z.string(),
            })),
            summary: z.object({
              totalMatches: z.number(),
              filesSearched: z.number(),
              query: z.string(),
            }),
          },
          handler: async (ctx) => ({
            matches: [
              { file: "test.txt", line: 5, content: "matching line content" },
              { file: "other.txt", line: 12, content: "another match" },
            ],
            summary: {
              totalMatches: 2,
              filesSearched: ctx.args.files?.length || 0,
              query: ctx.args.query,
            },
          }),
        });

      const tools = parser.toMcpTools();

      const listTool = tools.find((t) => t.name === "list-files");
      const searchTool = tools.find((t) => t.name === "search-content");

      // Verify both tools have output schemas
      expect(listTool?.outputSchema).toBeDefined();
      expect(searchTool?.outputSchema).toBeDefined();

      // Test realistic executions
      const listResult = await listTool!.execute({
        directory: "/home/user",
        recursive: true,
      });

      const searchResult = await searchTool!.execute({
        query: "test query",
        files: ["file1.txt", "file2.txt"],
      });

      // Verify structured responses
      expect(listResult.structuredContent).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            type: expect.any(String),
          }),
        ]),
        metadata: expect.objectContaining({
          directory: "/home/user",
          recursive: true,
        }),
      });

      expect(searchResult.structuredContent).toMatchObject({
        matches: expect.arrayContaining([
          expect.objectContaining({
            file: expect.any(String),
            line: expect.any(Number),
            content: expect.any(String),
          }),
        ]),
        summary: expect.objectContaining({
          query: "test query",
          totalMatches: 2,
        }),
      });
    });
  });
});
