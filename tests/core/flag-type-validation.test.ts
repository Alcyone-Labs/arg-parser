import { describe, expect, test } from "vitest";
import { ArgParser } from "../../src";
import { ZodError } from "zod";

describe("Flag Type Validation", () => {
  describe("Valid Type Values", () => {
    test("should accept valid string literal types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "stringFlag",
          description: "String flag",
          options: ["--string"],
          type: "string"
        });
      }).not.toThrow();
    });

    test("should accept valid constructor types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI", 
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlags([
          {
            name: "stringFlag",
            description: "String flag",
            options: ["--string"],
            type: String
          },
          {
            name: "numberFlag",
            description: "Number flag", 
            options: ["--number"],
            type: Number
          },
          {
            name: "booleanFlag",
            description: "Boolean flag",
            options: ["--boolean"],
            type: Boolean
          },
          {
            name: "arrayFlag",
            description: "Array flag",
            options: ["--array"],
            type: Array
          },
          {
            name: "objectFlag",
            description: "Object flag",
            options: ["--object"],
            type: Object
          }
        ]);
      }).not.toThrow();
    });

    test("should accept custom parser functions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test", 
          handler: async () => ({ success: true })
        }).addFlag({
          name: "customFlag",
          description: "Custom flag",
          options: ["--custom"],
          type: (value: string) => parseInt(value, 10)
        });
      }).not.toThrow();
    });

    test("should accept case-insensitive string literals", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlags([
          {
            name: "upperString",
            description: "Upper case string",
            options: ["--upper"],
            type: "STRING" as any
          },
          {
            name: "mixedBoolean", 
            description: "Mixed case boolean",
            options: ["--mixed"],
            type: "Boolean" as any
          }
        ]);
      }).not.toThrow();
    });
  });

  describe("Invalid Type Values", () => {
    test("should throw ZodError for invalid string literal types", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "invalidFlag",
          description: "Invalid flag",
          options: ["--invalid"],
          type: "invalid-type" as any
        });
      }).toThrow(ZodError);
    });

    test("should accept function constructors as custom parsers", () => {
      // Function constructors like Date are accepted as custom parser functions
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "dateFlag",
          description: "Date flag",
          options: ["--date"],
          type: Date as any // Date constructor is treated as custom parser
        });
      }).not.toThrow();
    });

    test("should handle null and undefined types differently", () => {
      // null doesn't match any union option and throws an error
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "nullFlag",
          description: "Null flag",
          options: ["--null"],
          type: null as any
        });
      }).toThrow(ZodError);

      // undefined falls back to the default "string" type
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true })
      }).addFlag({
        name: "undefinedFlag",
        description: "Undefined flag",
        options: ["--undefined"],
        type: undefined as any
      });

      const flags = parser.flags;
      const undefinedFlag = flags.find(f => f.name === "undefinedFlag");
      expect(undefinedFlag?.type).toBe(String); // Falls back to default string
    });

    test("should throw ZodError for primitive values as types", () => {
      // Primitive values don't match constructor checks
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "primitiveFlag",
          description: "Primitive flag",
          options: ["--primitive"],
          type: 42 as any // Number value instead of Number constructor
        });
      }).toThrow(ZodError);
    });

    test("should provide meaningful error messages for invalid string types", () => {
      try {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true })
        }).addFlag({
          name: "invalidFlag",
          description: "Invalid flag",
          options: ["--invalid"],
          type: "invalid-type" as any
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        // The error comes from the first failed refine check in the union
        expect(zodError.issues[0].message).toContain("Must be String constructor");
      }
    });
  });

  describe("Type Processing", () => {
    test("should convert string literals to constructors internally", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true })
      }).addFlags([
        {
          name: "stringLiteral",
          description: "String literal",
          options: ["--string-literal"],
          type: "string"
        },
        {
          name: "numberLiteral",
          description: "Number literal", 
          options: ["--number-literal"],
          type: "number"
        }
      ]);

      const flags = parser.flags;
      const stringFlag = flags.find(f => f.name === "stringLiteral");
      const numberFlag = flags.find(f => f.name === "numberLiteral");

      expect(stringFlag?.type).toBe(String);
      expect(numberFlag?.type).toBe(Number);
    });

    test("should preserve constructor types as-is", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true })
      }).addFlags([
        {
          name: "stringConstructor",
          description: "String constructor",
          options: ["--string-constructor"],
          type: String
        },
        {
          name: "booleanConstructor",
          description: "Boolean constructor",
          options: ["--boolean-constructor"],
          type: Boolean
        }
      ]);

      const flags = parser.flags;
      const stringFlag = flags.find(f => f.name === "stringConstructor");
      const booleanFlag = flags.find(f => f.name === "booleanConstructor");

      expect(stringFlag?.type).toBe(String);
      expect(booleanFlag?.type).toBe(Boolean);
    });
  });
});
