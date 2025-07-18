import { describe, expect, test } from "vitest";
import { getJsonSchemaTypeFromFlag } from "../../src/core/types";

describe("getJsonSchemaTypeFromFlag", () => {
  describe("Constructor functions", () => {
    test("should handle String constructor", () => {
      expect(getJsonSchemaTypeFromFlag(String)).toBe("string");
    });

    test("should handle Number constructor", () => {
      expect(getJsonSchemaTypeFromFlag(Number)).toBe("number");
    });

    test("should handle Boolean constructor", () => {
      expect(getJsonSchemaTypeFromFlag(Boolean)).toBe("boolean");
    });

    test("should handle Array constructor", () => {
      expect(getJsonSchemaTypeFromFlag(Array)).toBe("array");
    });

    test("should handle Object constructor", () => {
      expect(getJsonSchemaTypeFromFlag(Object)).toBe("object");
    });
  });

  describe("String literals", () => {
    test("should handle string literal types", () => {
      expect(getJsonSchemaTypeFromFlag("string")).toBe("string");
      expect(getJsonSchemaTypeFromFlag("number")).toBe("number");
      expect(getJsonSchemaTypeFromFlag("boolean")).toBe("boolean");
      expect(getJsonSchemaTypeFromFlag("array")).toBe("array");
      expect(getJsonSchemaTypeFromFlag("object")).toBe("object");
    });

    test("should handle case-insensitive string literals", () => {
      expect(getJsonSchemaTypeFromFlag("STRING")).toBe("string");
      expect(getJsonSchemaTypeFromFlag("Number")).toBe("number");
      expect(getJsonSchemaTypeFromFlag("BOOLEAN")).toBe("boolean");
      expect(getJsonSchemaTypeFromFlag("Array")).toBe("array");
      expect(getJsonSchemaTypeFromFlag("Object")).toBe("object");
    });

    test("should default unknown string types to string", () => {
      expect(getJsonSchemaTypeFromFlag("unknown")).toBe("string");
      expect(getJsonSchemaTypeFromFlag("custom")).toBe("string");
      expect(getJsonSchemaTypeFromFlag("")).toBe("string");
    });
  });

  describe("Custom parser functions", () => {
    test("should handle custom parser functions", () => {
      const customParser = (value: string) => parseInt(value);
      expect(getJsonSchemaTypeFromFlag(customParser)).toBe("string");
    });

    test("should handle arrow functions", () => {
      const arrowParser = (value: string) => new Date(value);
      expect(getJsonSchemaTypeFromFlag(arrowParser)).toBe("string");
    });

    test("should handle complex custom functions", () => {
      const complexParser = (value: string) => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };
      expect(getJsonSchemaTypeFromFlag(complexParser)).toBe("string");
    });
  });

  describe("Edge cases", () => {
    test("should handle null and undefined gracefully", () => {
      // These shouldn't happen in practice, but the function should be robust
      expect(getJsonSchemaTypeFromFlag(null as any)).toBe("string");
      expect(getJsonSchemaTypeFromFlag(undefined as any)).toBe("string");
    });

    test("should handle non-standard function types", () => {
      const customConstructor = function CustomType() {};
      expect(getJsonSchemaTypeFromFlag(customConstructor as any)).toBe(
        "string",
      );
    });
  });
});
