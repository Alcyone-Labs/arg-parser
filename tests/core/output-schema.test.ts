import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ArgParser, createOutputSchema, OutputSchemaPatterns } from "../../src";

describe("Output Schema Support", () => {
  describe("OutputSchemaPatterns", () => {
    test("should provide predefined schema patterns", () => {
      expect(OutputSchemaPatterns.successError).toBeDefined();
      expect(OutputSchemaPatterns.successWithData).toBeDefined();
      expect(OutputSchemaPatterns.list).toBeDefined();
      expect(OutputSchemaPatterns.fileOperation).toBeDefined();
      expect(OutputSchemaPatterns.processExecution).toBeDefined();
    });

    test("should generate valid Zod schemas from patterns", () => {
      const successErrorSchema = OutputSchemaPatterns.successError();
      expect(successErrorSchema._def.type).toBe("object");

      const successWithDataSchema = OutputSchemaPatterns.successWithData();
      expect(successWithDataSchema._def.type).toBe("object");

      const listSchema = OutputSchemaPatterns.list();
      expect(listSchema._def.type).toBe("object");
    });

    test("should accept custom schemas for data patterns", () => {
      const customDataSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const successWithDataSchema =
        OutputSchemaPatterns.successWithData(customDataSchema);
      expect(successWithDataSchema._def.type).toBe("object");

      const listSchema = OutputSchemaPatterns.list(customDataSchema);
      expect(listSchema._def.type).toBe("object");
    });
  });

  describe("createOutputSchema", () => {
    test("should create schema from pattern name", () => {
      const schema = createOutputSchema("successError");
      expect(schema._def.type).toBe("object");
    });

    test("should pass through Zod schema directly", () => {
      const customSchema = z.object({ result: z.string() });
      const schema = createOutputSchema(customSchema);
      expect(schema).toBe(customSchema);
    });

    test("should create schema from object definition", () => {
      const schema = createOutputSchema({
        result: z.string().describe("The result"),
        timestamp: z.string().describe("When completed"),
      });
      expect(schema._def.type).toBe("object");
    });

    test("should fallback to successError for invalid input", () => {
      const schema = createOutputSchema("invalid" as any);
      expect(schema._def.type).toBe("object");
    });
  });

  describe("ArgParser Output Schema Configuration", () => {
    test("should set default output schema", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ success: true, data: ctx.args }),
      })
        .setDefaultOutputSchema("successWithData")
        .addFlags([
          {
            name: "input",
            description: "Input parameter",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
        ]);

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBeDefined();
      expect(tools[0].outputSchema?._def.type).toBe("object");
    });

    test("should set specific tool output schema", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ result: ctx.args.input }),
      })
        .setOutputSchema("test", {
          result: z.string().describe("The processed result"),
          metadata: z
            .object({
              timestamp: z.string(),
              version: z.string(),
            })
            .optional(),
        })
        .addFlags([
          {
            name: "input",
            description: "Input parameter",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
        ]);

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBeDefined();
      expect(tools[0].outputSchema?._def.type).toBe("object");
    });

    test("should enable automatic output schema generation", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ success: true, message: "Done" }),
      })
        .enableAutoOutputSchema("successError")
        .addFlags([
          {
            name: "input",
            description: "Input parameter",
            options: ["--input"],
            type: "string",
            mandatory: true,
          },
        ]);

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBeDefined();
      expect(tools[0].outputSchema?._def.type).toBe("object");
    });

    test("should prioritize explicit schema over default and auto-generated", () => {
      const explicitSchema = z.object({ explicit: z.boolean() });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ explicit: true }),
      })
        .setDefaultOutputSchema("successError")
        .enableAutoOutputSchema("successWithData")
        .addFlags([
          {
            name: "input",
            description: "Input parameter",
            options: ["--input"],
            type: "string",
          },
        ]);

      const tools = parser.toMcpTools({
        outputSchemaMap: {
          test: explicitSchema,
        },
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBe(explicitSchema);
    });

    test("should prioritize tool-level schema over instance-level schemas", () => {
      const toolSchema = z.object({ toolLevel: z.string() });

      const parser = new ArgParser({
        appName: "Priority Test CLI",
        appCommandName: "priority-test",
        handler: async () => ({ success: true }),
      })
        .setDefaultOutputSchema("successError")
        .setOutputSchema("priority-test", "successWithData")
        .enableAutoOutputSchema("processExecution")
        .addTool({
          name: "tool-with-schema",
          description: "Tool with its own schema",
          flags: [
            {
              name: "input",
              description: "Input parameter",
              options: ["--input"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: toolSchema, // Tool-level schema should take priority
          handler: async (ctx) => ({
            toolLevel: `Processed: ${ctx.args.input}`,
          }),
        });

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(2); // Main command + tool

      const toolWithSchema = tools.find((t) => t.name === "tool-with-schema");
      expect(toolWithSchema?.outputSchema).toBe(toolSchema);

      // Main command should use instance-level setOutputSchema
      const mainTool = tools.find((t) => t.name === "priority-test");
      expect(mainTool?.outputSchema).toBeDefined();
      expect(mainTool?.outputSchema).not.toBe(toolSchema);
    });

    test("should work with unified tools", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      })
        .enableAutoOutputSchema("processExecution")
        .addTool({
          name: "process-file",
          description: "Process a file",
          flags: [
            {
              name: "file",
              description: "File to process",
              options: ["--file"],
              type: "string",
              mandatory: true,
            },
          ],
          handler: async (ctx) => ({
            exitCode: 0,
            stdout: `Processed ${ctx.args.file}`,
            duration: 1500,
          }),
        });

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(2); // Main command + unified tool

      const processFileTool = tools.find((t) => t.name === "process-file");
      expect(processFileTool).toBeDefined();
      expect(processFileTool?.outputSchema).toBeDefined();
      expect(processFileTool?.outputSchema?._def.type).toBe("object");
    });

    test("should support output schema directly in addTool", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      })
        .addTool({
          name: "file-tool",
          description: "File operation tool",
          flags: [
            {
              name: "path",
              description: "File path",
              options: ["--path"],
              type: "string",
              mandatory: true,
            },
          ],
          outputSchema: "fileOperation", // Using predefined pattern
          handler: async (ctx) => ({
            path: ctx.args.path,
            size: 1024,
            exists: true,
          }),
        })
        .addTool({
          name: "custom-tool",
          description: "Tool with custom schema",
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
            result: z.string().describe("Processing result"),
            metadata: z.object({
              timestamp: z.string(),
              version: z.string(),
            }),
          },
          handler: async (ctx) => ({
            result: `Processed: ${ctx.args.input}`,
            metadata: {
              timestamp: new Date().toISOString(),
              version: "1.0.0",
            },
          }),
        });

      const tools = parser.toMcpTools();
      expect(tools).toHaveLength(3); // Main command + 2 tools

      const fileTool = tools.find((t) => t.name === "file-tool");
      expect(fileTool?.outputSchema).toBeDefined();
      expect(fileTool?.outputSchema?._def.type).toBe("object");

      const customTool = tools.find((t) => t.name === "custom-tool");
      expect(customTool?.outputSchema).toBeDefined();
      expect(customTool?.outputSchema?._def.type).toBe("object");
    });
  });

  describe("MCP Integration with Output Schemas", () => {
    test("should generate tools with auto output schemas", () => {
      const parser = new ArgParser({
        appName: "Auto Schema CLI",
        appCommandName: "auto-schema",
        handler: async (ctx) => ({
          success: true,
          data: { processed: ctx.args.input },
          message: "Processing complete",
        }),
      }).addFlags([
        {
          name: "input",
          description: "Input parameter",
          options: ["--input"],
          type: "string",
          mandatory: true,
        },
      ]);

      const tools = parser.toMcpTools({
        autoGenerateOutputSchema: "successWithData",
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBeDefined();
      expect(tools[0].outputSchema?._def.type).toBe("object");
    });

    test("should merge instance and option schemas correctly", () => {
      const instanceSchema = z.object({ instance: z.string() });
      const optionSchema = z.object({ option: z.string() });

      const parser = new ArgParser({
        appName: "Merge Test CLI",
        appCommandName: "merge-test",
        handler: async () => ({ result: "test" }),
      })
        .setOutputSchema("merge-test", instanceSchema)
        .addFlags([
          {
            name: "input",
            description: "Input parameter",
            options: ["--input"],
            type: "string",
          },
        ]);

      // Option schema should take precedence
      const tools = parser.toMcpTools({
        outputSchemaMap: {
          "merge-test": optionSchema,
        },
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].outputSchema).toBe(optionSchema);
    });
  });
});
