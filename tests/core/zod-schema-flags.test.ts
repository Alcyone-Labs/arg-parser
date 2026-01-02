import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ArgParser } from "../../src";
import {
  convertFlagsToJsonSchema,
  convertFlagsToZodSchema,
} from "../../src/mcp/mcp-integration";

describe("Zod Schema Flag Support", () => {
  describe("Basic Zod Schema Flags", () => {
    test("should accept Zod schema as flag type", () => {
      const configSchema = z.object({
        apiKey: z.string().describe("API key for authentication"),
        timeout: z
          .number()
          .min(1000)
          .describe("Request timeout in milliseconds"),
        retries: z.number().optional().describe("Number of retry attempts"),
      });

      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "config",
          description: "Configuration object",
          options: ["--config"],
          type: configSchema,
          mandatory: true,
        });
      }).not.toThrow();
    });

    test("should parse JSON input with Zod schema validation", async () => {
      const configSchema = z.object({
        apiKey: z.string(),
        timeout: z.number().min(1000),
        retries: z.number().optional(),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ config: ctx.args.config }),
      }).addFlag({
        name: "config",
        description: "Configuration object",
        options: ["--config"],
        type: configSchema,
        mandatory: true,
      });

      const validConfig = {
        apiKey: "test-key",
        timeout: 5000,
        retries: 3,
      };

      const result = await parser.parse([
        "--config",
        JSON.stringify(validConfig),
      ]);
      expect(result.config).toEqual(validConfig);
    });

    test("should validate JSON input against Zod schema", async () => {
      const configSchema = z.object({
        apiKey: z.string(),
        timeout: z.number().min(1000),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ config: ctx.args.config }),
        handleErrors: false,
      }).addFlag({
        name: "config",
        description: "Configuration object",
        options: ["--config"],
        type: configSchema,
        mandatory: true,
      });

      // Invalid JSON structure
      const invalidConfig = {
        apiKey: "test-key",
        timeout: 500, // Below minimum
      };

      await expect(
        parser.parse(["--config", JSON.stringify(invalidConfig)]),
      ).rejects.toThrow();
    });

    test("should handle invalid JSON input", async () => {
      const configSchema = z.object({
        apiKey: z.string(),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ config: ctx.args.config }),
        handleErrors: false,
      }).addFlag({
        name: "config",
        description: "Configuration object",
        options: ["--config"],
        type: configSchema,
        mandatory: true,
      });

      await expect(parser.parse(["--config", "invalid-json"])).rejects.toThrow(
        "Invalid JSON",
      );
    });
  });

  describe("MCP Integration", () => {
    test("should generate proper JSON Schema for Zod schema flags", () => {
      const configSchema = z.object({
        apiKey: z.string().describe("API key for authentication"),
        timeout: z
          .number()
          .min(1000)
          .describe("Request timeout in milliseconds"),
        retries: z.number().optional().describe("Number of retry attempts"),
        endpoints: z.array(z.string().url()).describe("List of API endpoints"),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlag({
        name: "config",
        description: "Configuration object",
        options: ["--config"],
        type: configSchema,
        mandatory: true,
      });

      const jsonSchema = convertFlagsToJsonSchema(parser.flags);

      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema.properties.config).toBeDefined();
      expect(jsonSchema.properties.config.type).toBe("object");
      expect(jsonSchema.properties.config.properties).toBeDefined();
      expect(jsonSchema.properties.config.properties.apiKey).toEqual({
        type: "string",
        description: "API key for authentication",
      });
      expect(jsonSchema.properties.config.properties.timeout).toEqual({
        type: "number",
        minimum: 1000,
        description: "Request timeout in milliseconds",
      });
      expect(jsonSchema.properties.config.properties.endpoints).toEqual({
        type: "array",
        items: { type: "string", format: "uri" },
        description: "List of API endpoints",
      });
      expect(jsonSchema.required).toContain("config");
    });

    test("should generate proper Zod schema for MCP tools", () => {
      const configSchema = z.object({
        apiKey: z.string(),
        timeout: z.number().min(1000),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlag({
        name: "config",
        description: "Configuration object",
        options: ["--config"],
        type: configSchema,
        mandatory: true,
      });

      const zodSchema = convertFlagsToZodSchema(parser.flags);

      // The generated schema should be a Zod object with the config property
      expect(zodSchema._def.type).toBe("object");

      // Test that it can parse valid input
      const validInput = {
        config: { apiKey: "test", timeout: 2000 },
      };
      expect(() => zodSchema.parse(validInput)).not.toThrow();

      // Test that it rejects invalid input
      const invalidInput = {
        config: { apiKey: "test", timeout: 500 },
      };
      expect(() => zodSchema.parse(invalidInput)).toThrow();
    });
  });

  describe("Complex Zod Schemas", () => {
    test("should handle nested object schemas", async () => {
      const complexSchema = z.object({
        database: z.object({
          host: z.string(),
          port: z.number().min(1).max(65535),
          credentials: z.object({
            username: z.string(),
            password: z.string(),
          }),
        }),
        features: z.array(z.enum(["auth", "logging", "metrics"])),
        debug: z.boolean().optional(),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ config: ctx.args.config }),
      }).addFlag({
        name: "config",
        description: "Complex configuration object",
        options: ["--config"],
        type: complexSchema,
        mandatory: true,
      });

      const validConfig = {
        database: {
          host: "localhost",
          port: 5432,
          credentials: {
            username: "admin",
            password: "secret",
          },
        },
        features: ["auth", "logging"],
        debug: true,
      };

      const result = await parser.parse([
        "--config",
        JSON.stringify(validConfig),
      ]);
      expect(result.config).toEqual(validConfig);
    });

    test("should handle union and enum schemas", async () => {
      const unionSchema = z.object({
        mode: z.enum(["development", "production", "test"]),
        config: z.union([
          z.object({ type: z.literal("file"), path: z.string() }),
          z.object({ type: z.literal("env"), prefix: z.string() }),
        ]),
      });

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ config: ctx.args.config }),
      }).addFlag({
        name: "config",
        description: "Union configuration object",
        options: ["--config"],
        type: unionSchema,
        mandatory: true,
      });

      const validConfig = {
        mode: "development",
        config: { type: "file", path: "./config.json" },
      };

      const result = await parser.parse([
        "--config",
        JSON.stringify(validConfig),
      ]);
      expect(result.config).toEqual(validConfig);
    });
  });
});
