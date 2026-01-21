import { describe, expect, test, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ArgParser } from "../../src";

describe("Async Custom Parser Functions", () => {
  describe("Basic Async Parser Support", () => {
    test("should handle async custom parser functions", async () => {
      const asyncParser = async (value: string): Promise<number> => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return parseInt(value, 10) * 2;
      };

      const parser = new ArgParser({
        appName: "Async Test CLI",
        appCommandName: "async-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "asyncNumber",
        description: "Async number parser",
        options: ["--async-number"],
        type: asyncParser,
      });

      const result = await parser.parse(["--async-number", "21"]);
      expect(result.asyncNumber).toBe(42);
    });

    test("should handle mixed sync and async custom parsers", async () => {
      const syncParser = (value: string): string => value.toUpperCase();
      const asyncParser = async (value: string): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return value.toLowerCase();
      };

      const parser = new ArgParser({
        appName: "Mixed Test CLI",
        appCommandName: "mixed-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlags([
        {
          name: "syncValue",
          description: "Sync parser",
          options: ["--sync"],
          type: syncParser,
        },
        {
          name: "asyncValue",
          description: "Async parser",
          options: ["--async"],
          type: asyncParser,
        },
      ]);

      const result = await parser.parse(["--sync", "hello", "--async", "WORLD"]);
      expect(result.syncValue).toBe("HELLO");
      expect(result.asyncValue).toBe("world");
    });

    test("should handle async parsers with allowMultiple", async () => {
      const asyncParser = async (value: string): Promise<number> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return parseInt(value, 10) + 10;
      };

      const parser = new ArgParser({
        appName: "Multiple Async Test CLI",
        appCommandName: "multiple-async-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "numbers",
        description: "Multiple async numbers",
        options: ["--number"],
        type: asyncParser,
        allowMultiple: true,
      });

      const result = await parser.parse(["--number", "1", "--number", "2", "--number", "3"]);
      expect(result.numbers).toEqual([11, 12, 13]);
    });
  });

  describe("File I/O Async Parsers", () => {
    test("should handle async file reading parser", async () => {
      // Create a temporary test file
      const testFilePath = join(process.cwd(), "test-config.json");
      const testData = { name: "test", value: 42 };
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      const fileParser = async (filePath: string): Promise<any> => {
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content);
      };

      const parser = new ArgParser({
        appName: "File Test CLI",
        appCommandName: "file-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "config",
        description: "Config file parser",
        options: ["--config"],
        type: fileParser,
      });

      try {
        const result = await parser.parse(["--config", testFilePath]);
        expect(result.config).toEqual(testData);
      } finally {
        // Clean up
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test("should handle file parsing errors gracefully", async () => {
      const fileParser = async (filePath: string): Promise<any> => {
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content);
      };

      const parser = new ArgParser({
        appName: "File Error Test CLI",
        appCommandName: "file-error-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
      }).addFlag({
        name: "config",
        description: "Config file parser",
        options: ["--config"],
        type: fileParser,
      });

      await expect(parser.parse(["--config", "nonexistent-file.json"])).rejects.toThrow();
    });
  });

  describe("API Call Async Parsers", () => {
    test("should handle async API call parser", async () => {
      // Mock fetch for testing
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123", name: "Test User" }),
      });
      global.fetch = mockFetch;

      const userParser = async (userId: string): Promise<any> => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`User not found: ${userId}`);
        }
        return response.json();
      };

      const parser = new ArgParser({
        appName: "API Test CLI",
        appCommandName: "api-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "user",
        description: "User ID to fetch",
        options: ["--user"],
        type: userParser,
      });

      const result = await parser.parse(["--user", "123"]);
      expect(result.user).toEqual({ id: "123", name: "Test User" });
      expect(mockFetch).toHaveBeenCalledWith("/api/users/123");
    });

    test("should handle API errors in async parsers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const userParser = async (userId: string): Promise<any> => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`User not found: ${userId}`);
        }
        return response.json();
      };

      const parser = new ArgParser({
        appName: "API Error Test CLI",
        appCommandName: "api-error-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
      }).addFlag({
        name: "user",
        description: "User ID to fetch",
        options: ["--user"],
        type: userParser,
      });

      await expect(parser.parse(["--user", "404"])).rejects.toThrow("User not found: 404");
    });
  });

  describe("Complex Async Parsers", () => {
    test("should handle async parser with validation", async () => {
      const validatedAsyncParser = async (value: string): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 5));

        if (value.length < 3) {
          throw new Error("Value must be at least 3 characters");
        }

        return value.trim().toLowerCase();
      };

      const parser = new ArgParser({
        appName: "Validation Test CLI",
        appCommandName: "validation-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
      }).addFlag({
        name: "validatedValue",
        description: "Validated async value",
        options: ["--validated"],
        type: validatedAsyncParser,
      });

      // Valid case
      const validResult = await parser.parse(["--validated", "  HELLO  "]);
      expect(validResult.validatedValue).toBe("hello");

      // Invalid case
      await expect(parser.parse(["--validated", "hi"])).rejects.toThrow(
        "Value must be at least 3 characters",
      );
    });

    test("should handle async parser returning complex objects", async () => {
      const complexAsyncParser = async (input: string): Promise<any> => {
        await new Promise((resolve) => setTimeout(resolve, 10));

        const [name, age] = input.split(",");
        return {
          name: name.trim(),
          age: parseInt(age.trim(), 10),
          timestamp: new Date().toISOString(),
          processed: true,
        };
      };

      const parser = new ArgParser({
        appName: "Complex Test CLI",
        appCommandName: "complex-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "person",
        description: "Person data (name,age)",
        options: ["--person"],
        type: complexAsyncParser,
      });

      const result = await parser.parse(["--person", "John Doe, 30"]);
      expect(result.person.name).toBe("John Doe");
      expect(result.person.age).toBe(30);
      expect(result.person.processed).toBe(true);
      expect(typeof result.person.timestamp).toBe("string");
    });
  });

  describe("Error Handling", () => {
    test("should propagate async parser errors correctly", async () => {
      const errorParser = async (value: string): Promise<any> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error(`Custom async error: ${value}`);
      };

      const parser = new ArgParser({
        appName: "Error Test CLI",
        appCommandName: "error-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
        handleErrors: false,
      }).addFlag({
        name: "errorValue",
        description: "Value that causes error",
        options: ["--error"],
        type: errorParser,
      });

      await expect(parser.parse(["--error", "test"])).rejects.toThrow("Custom async error: test");
    });

    test("should handle async parser timeout scenarios", async () => {
      const slowParser = async (value: string): Promise<string> => {
        // Simulate a very slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return value.toUpperCase();
      };

      const parser = new ArgParser({
        appName: "Slow Test CLI",
        appCommandName: "slow-test",
        handler: async (ctx) => ({ result: "success", args: ctx.args }),
      }).addFlag({
        name: "slowValue",
        description: "Slow async value",
        options: ["--slow"],
        type: slowParser,
      });

      // This should still work, just take longer
      const result = await parser.parse(["--slow", "hello"]);
      expect(result.slowValue).toBe("HELLO");
    });
  });
});
