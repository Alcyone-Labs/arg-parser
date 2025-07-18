import { describe, expect, test } from "vitest";
import { ZodError } from "zod";
import { ArgParser, getJsonSchemaTypeFromFlag } from "../../src";
import { convertFlagsToJsonSchema } from "../../src/mcp/mcp-integration";

describe("Flag Types (Consolidated)", () => {
  describe("Type Validation", () => {
    test("should accept valid string literal and constructor types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlags([
          {
            name: "stringLiteral",
            description: "String literal",
            options: ["--string-literal"],
            type: "string",
          },
          {
            name: "stringConstructor",
            description: "String constructor",
            options: ["--string-constructor"],
            type: String,
          },
        ]);
      }).not.toThrow();
    });

    test("should accept valid constructor types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlags([
          {
            name: "numberFlag",
            description: "Number flag",
            options: ["--number"],
            type: Number,
          },
          {
            name: "booleanFlag",
            description: "Boolean flag",
            options: ["--boolean"],
            type: Boolean,
          },
          {
            name: "arrayFlag",
            description: "Array flag",
            options: ["--array"],
            type: Array,
          },
        ]);
      }).not.toThrow();
    });

    test("should accept custom parser functions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "customFlag",
          description: "Custom flag",
          options: ["--custom"],
          type: (value: string) => parseInt(value, 10),
        });
      }).not.toThrow();
    });

    test("should throw ZodError for invalid string literal types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "invalidFlag",
          description: "Invalid flag",
          options: ["--invalid"],
          type: "invalid-type" as any,
        });
      }).toThrow(ZodError);
    });

    test("should handle null and undefined types", () => {
      // null should throw an error
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "nullFlag",
          description: "Null flag",
          options: ["--null"],
          type: null as any,
        });
      }).toThrow(ZodError);

      // undefined should fall back to default string type
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlag({
        name: "undefinedFlag",
        description: "Undefined flag",
        options: ["--undefined"],
        type: undefined as any,
      });

      const flags = parser.flags;
      const undefinedFlag = flags.find((f) => f.name === "undefinedFlag");
      expect(undefinedFlag?.type).toBe(String);
    });
  });

  describe("Type Processing", () => {
    test("should convert string literals to constructors internally", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlags([
        {
          name: "stringLiteral",
          description: "String literal",
          options: ["--string-literal"],
          type: "string",
        },
        {
          name: "numberLiteral",
          description: "Number literal",
          options: ["--number-literal"],
          type: "number",
        },
        {
          name: "booleanLiteral",
          description: "Boolean literal",
          options: ["--boolean-literal"],
          type: "boolean",
        },
      ]);

      const flags = parser.flags;
      const stringFlag = flags.find((f) => f.name === "stringLiteral");
      const numberFlag = flags.find((f) => f.name === "numberLiteral");
      const booleanFlag = flags.find((f) => f.name === "booleanLiteral");

      expect(stringFlag?.type).toBe(String);
      expect(numberFlag?.type).toBe(Number);
      expect(booleanFlag?.type).toBe(Boolean);
    });

    test("should preserve constructor types as-is", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlags([
        {
          name: "stringConstructor",
          description: "String constructor",
          options: ["--string-constructor"],
          type: String,
        },
        {
          name: "numberConstructor",
          description: "Number constructor",
          options: ["--number-constructor"],
          type: Number,
        },
      ]);

      const flags = parser.flags;
      const stringFlag = flags.find((f) => f.name === "stringConstructor");
      const numberFlag = flags.find((f) => f.name === "numberConstructor");

      expect(stringFlag?.type).toBe(String);
      expect(numberFlag?.type).toBe(Number);
    });
  });

  describe("Mixed Type Format Integration", () => {
    test("should handle mixed flag type formats consistently", () => {
      const parser = new ArgParser({
        appName: "Mixed Types CLI",
        appCommandName: "mixed-types",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlags([
        {
          name: "stringLiteral",
          description: "String using literal",
          options: ["--string-literal"],
          type: "string",
          mandatory: true,
        },
        {
          name: "stringConstructor",
          description: "String using constructor",
          options: ["--string-constructor"],
          type: String,
          mandatory: true,
        },
        {
          name: "numberLiteral",
          description: "Number using literal",
          options: ["--number-literal"],
          type: "number",
          defaultValue: 42,
        },
        {
          name: "numberConstructor",
          description: "Number using constructor",
          options: ["--number-constructor"],
          type: Number,
          defaultValue: 100,
        },
        {
          name: "customParser",
          description: "Custom parser function",
          options: ["--custom-parser"],
          type: (value: string) => parseInt(value) * 2,
          defaultValue: 0,
        },
      ]);

      const flags = parser.flags;

      // Get JSON schema types for all flags
      const stringLiteralFlag = flags.find((f) => f.name === "stringLiteral")!;
      const stringConstructorFlag = flags.find((f) => f.name === "stringConstructor")!;
      const numberLiteralFlag = flags.find((f) => f.name === "numberLiteral")!;
      const numberConstructorFlag = flags.find((f) => f.name === "numberConstructor")!;
      const customParserFlag = flags.find((f) => f.name === "customParser")!;

      // Both string formats should return "string"
      expect(getJsonSchemaTypeFromFlag(stringLiteralFlag.type)).toBe("string");
      expect(getJsonSchemaTypeFromFlag(stringConstructorFlag.type)).toBe("string");

      // Both number formats should return "number"
      expect(getJsonSchemaTypeFromFlag(numberLiteralFlag.type)).toBe("number");
      expect(getJsonSchemaTypeFromFlag(numberConstructorFlag.type)).toBe("number");

      // Custom parser should default to "string"
      expect(getJsonSchemaTypeFromFlag(customParserFlag.type)).toBe("string");
    });
  });

  describe("JSON Schema Generation", () => {
    test("should generate valid JSON schema for MCP integration", () => {
      const parser = new ArgParser({
        appName: "Schema Test CLI",
        appCommandName: "schema-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlags([
        {
          name: "input",
          description: "Input file",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
        },
        {
          name: "count",
          description: "Count value",
          options: ["--count", "-c"],
          type: Number,
          defaultValue: 1,
        },
        {
          name: "verbose",
          description: "Verbose output",
          options: ["--verbose", "-v"],
          type: Boolean,
          flagOnly: true,
        },
        {
          name: "format",
          description: "Output format",
          options: ["--format", "-f"],
          type: "string",
          enum: ["json", "csv", "xml"],
          defaultValue: "json",
        },
      ]);

      const schema = convertFlagsToJsonSchema(parser.flags);

      // Verify the schema structure
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.required).toContain("input");

      // Verify individual property types
      expect(schema.properties.input.type).toBe("string");
      expect(schema.properties.count.type).toBe("number");
      expect(schema.properties.verbose.type).toBe("boolean");
      expect(schema.properties.format.type).toBe("string");
      expect(schema.properties.format.enum).toEqual(["json", "csv", "xml"]);

      // Verify default values
      expect(schema.properties.count.default).toBe(1);
      expect(schema.properties.verbose.default).toBe(false);
      expect(schema.properties.format.default).toBe("json");
    });

    test("should handle various type scenarios in schema generation", () => {
      const parser = new ArgParser({
        appName: "Complex Schema CLI",
        appCommandName: "complex-schema",
        handler: async () => ({ result: "success" }),
      }).addFlags([
        {
          name: "requiredString",
          description: "Required string",
          options: ["--required"],
          type: "string",
          mandatory: true,
        },
        {
          name: "optionalNumber",
          description: "Optional number",
          options: ["--optional"],
          type: "number",
          defaultValue: 42,
        },
        {
          name: "flagBoolean",
          description: "Flag boolean",
          options: ["--flag"],
          type: "boolean",
          flagOnly: true,
        },
        {
          name: "enumString",
          description: "Enum string",
          options: ["--enum"],
          type: "string",
          enum: ["option1", "option2", "option3"],
          defaultValue: "option1",
        },
      ]);

      const schema = convertFlagsToJsonSchema(parser.flags);

      // Check required fields
      expect(schema.required).toContain("requiredString");
      expect(schema.required).not.toContain("optionalNumber");
      expect(schema.required).not.toContain("flagBoolean");
      expect(schema.required).not.toContain("enumString");

      // Check enum handling
      expect(schema.properties.enumString.enum).toEqual(["option1", "option2", "option3"]);
      expect(schema.properties.enumString.default).toBe("option1");

      // Check default values
      expect(schema.properties.optionalNumber.default).toBe(42);
      expect(schema.properties.flagBoolean.default).toBe(false);
    });
  });
});
