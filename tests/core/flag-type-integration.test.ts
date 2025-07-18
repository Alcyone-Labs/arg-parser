import { describe, expect, test } from "vitest";
import { ArgParser, getJsonSchemaTypeFromFlag } from "../../src";
import { convertFlagsToJsonSchema } from "../../src/mcp/mcp-integration";

describe("Flag Type Integration", () => {
  test("should handle mixed flag type formats consistently", () => {
    // Create flags with different type formats
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
        name: "booleanLiteral",
        description: "Boolean using literal",
        options: ["--boolean-literal"],
        type: "boolean",
        flagOnly: true,
      },
      {
        name: "booleanConstructor",
        description: "Boolean using constructor",
        options: ["--boolean-constructor"],
        type: Boolean,
        flagOnly: true,
      },
      {
        name: "customParser",
        description: "Custom parser function",
        options: ["--custom-parser"],
        type: (value: string) => parseInt(value) * 2,
        defaultValue: 0,
      },
    ]);

    // Get the processed flags
    const flags = parser.flags;

    // Test that getJsonSchemaTypeFromFlag works for all types
    const stringLiteralFlag = flags.find((f) => f.name === "stringLiteral")!;
    const stringConstructorFlag = flags.find(
      (f) => f.name === "stringConstructor",
    )!;
    const numberLiteralFlag = flags.find((f) => f.name === "numberLiteral")!;
    const numberConstructorFlag = flags.find(
      (f) => f.name === "numberConstructor",
    )!;
    const booleanLiteralFlag = flags.find((f) => f.name === "booleanLiteral")!;
    const booleanConstructorFlag = flags.find(
      (f) => f.name === "booleanConstructor",
    )!;
    const customParserFlag = flags.find((f) => f.name === "customParser")!;

    // Both string formats should return "string"
    expect(getJsonSchemaTypeFromFlag(stringLiteralFlag.type)).toBe("string");
    expect(getJsonSchemaTypeFromFlag(stringConstructorFlag.type)).toBe(
      "string",
    );

    // Both number formats should return "number"
    expect(getJsonSchemaTypeFromFlag(numberLiteralFlag.type)).toBe("number");
    expect(getJsonSchemaTypeFromFlag(numberConstructorFlag.type)).toBe(
      "number",
    );

    // Both boolean formats should return "boolean"
    expect(getJsonSchemaTypeFromFlag(booleanLiteralFlag.type)).toBe("boolean");
    expect(getJsonSchemaTypeFromFlag(booleanConstructorFlag.type)).toBe(
      "boolean",
    );

    // Custom parser should default to "string"
    expect(getJsonSchemaTypeFromFlag(customParserFlag.type)).toBe("string");
  });

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
        type: "string", // String literal
        mandatory: true,
      },
      {
        name: "count",
        description: "Count value",
        options: ["--count", "-c"],
        type: Number, // Constructor function
        defaultValue: 1,
      },
      {
        name: "verbose",
        description: "Verbose output",
        options: ["--verbose", "-v"],
        type: Boolean, // Constructor function
        flagOnly: true,
      },
      {
        name: "format",
        description: "Output format",
        options: ["--format", "-f"],
        type: "string", // String literal with enum
        enum: ["json", "csv", "xml"],
        defaultValue: "json",
      },
    ]);

    // Generate JSON schema using MCP integration
    const schema = convertFlagsToJsonSchema(parser.flags);

    // Verify the schema structure
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeDefined();
    expect(schema.required).toContain("input"); // Mandatory field

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
});
