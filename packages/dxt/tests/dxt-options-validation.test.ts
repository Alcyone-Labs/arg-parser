import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { ArgParser } from "../../core/src/index.js";
import { DxtGenerator } from "../src/index.js";

describe("DxtOptions Validation", () => {
  let parser: ArgParser;
  let dxtGenerator: DxtGenerator;
  let consoleSpy: any;

  beforeEach(() => {
    parser = new ArgParser({ appName: "test-app" });
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Critical Validations (should throw errors)", () => {
    it("should throw error when min > max", () => {
      expect(() => {
        parser.addFlags([
          {
            name: "count",
            description: "Count value",
            options: ["--count"],
            type: "number",
            env: "COUNT_VAR",
            dxtOptions: {
              type: "number",
              min: 10,
              max: 5, // Invalid: min > max
            },
          },
        ]);
      }).toThrow(); // Zod validation will catch this
    });

    it("should throw error for invalid type", () => {
      expect(() => {
        parser.addFlags([
          {
            name: "value",
            description: "Some value",
            options: ["--value"],
            type: "string",
            env: "VALUE_VAR",
            dxtOptions: {
              type: "invalid-type" as any, // Invalid type
            },
          },
        ]);
      }).toThrow(); // Zod validation will catch this
    });

    it("should throw error when default type doesn't match declared type", () => {
      parser.addFlags([
        {
          name: "port",
          description: "Port number",
          options: ["--port"],
          type: "number",
          env: "PORT_VAR",
          dxtOptions: {
            type: "number",
            default: "8080", // Invalid: string default for number type
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        dxtGenerator.generateEnvAndUserConfig();
      }).toThrow("Invalid dxtOptions.default for PORT_VAR: expected number, got string");
    });

    it("should throw error for boolean type mismatch", () => {
      parser.addFlags([
        {
          name: "enabled",
          description: "Enable feature",
          options: ["--enabled"],
          type: "boolean",
          env: "ENABLED_VAR",
          dxtOptions: {
            type: "boolean",
            default: "true", // Invalid: string default for boolean type
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        dxtGenerator.generateEnvAndUserConfig();
      }).toThrow("Invalid dxtOptions.default for ENABLED_VAR: expected boolean, got string");
    });
  });

  describe("Security Warnings (should warn but continue)", () => {
    it("should warn when sensitive keyword has sensitive: false", () => {
      parser.addFlags([
        {
          name: "apiKey",
          description: "API key for service",
          options: ["--api-key"],
          type: "string",
          env: "API_KEY",
          dxtOptions: {
            sensitive: false, // Warning: API_KEY should be sensitive
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);
      const result = dxtGenerator.generateEnvAndUserConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Security Warning: API_KEY contains sensitive keyword"),
      );
      expect(result.userConfig.API_KEY).toBeDefined();
    });

    it("should warn for various sensitive keywords", () => {
      parser.addFlags([
        {
          name: "token",
          description: "Auth token",
          options: ["--token"],
          type: "string",
          env: "AUTH_TOKEN",
          dxtOptions: { sensitive: false },
        },
        {
          name: "password",
          description: "User password",
          options: ["--password"],
          type: "string",
          env: "USER_PASSWORD",
          dxtOptions: { sensitive: false },
        },
        {
          name: "secret",
          description: "Secret value",
          options: ["--secret"],
          type: "string",
          env: "SECRET_VALUE",
          dxtOptions: { sensitive: false },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);
      dxtGenerator.generateEnvAndUserConfig();

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("AUTH_TOKEN contains sensitive keyword"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("USER_PASSWORD contains sensitive keyword"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SECRET_VALUE contains sensitive keyword"),
      );
    });

    it("should warn when mandatory flag is sensitive", () => {
      parser.addFlags([
        {
          name: "apiKey",
          description: "Required API key",
          options: ["--api-key"],
          type: "string",
          env: "API_KEY",
          mandatory: true, // Warning: required + sensitive
          dxtOptions: {
            sensitive: true,
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);
      dxtGenerator.generateEnvAndUserConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Security Warning: API_KEY is required and sensitive"),
      );
    });
  });

  describe("Valid Configurations (should pass without errors)", () => {
    it("should accept valid min/max configuration", () => {
      parser.addFlags([
        {
          name: "count",
          description: "Count value",
          options: ["--count"],
          type: "number",
          env: "COUNT_VAR",
          dxtOptions: {
            type: "number",
            min: 1,
            max: 100,
            default: 10,
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        const result = dxtGenerator.generateEnvAndUserConfig();
        expect(result.userConfig.COUNT_VAR).toBeDefined();
        expect(result.userConfig.COUNT_VAR.min).toBe(1);
        expect(result.userConfig.COUNT_VAR.max).toBe(100);
        expect(result.userConfig.COUNT_VAR.default).toBe(10);
      }).not.toThrow();
    });

    it("should accept all valid DXT types", () => {
      parser.addFlags([
        {
          name: "text",
          description: "Text value",
          options: ["--text"],
          type: "string",
          env: "TEXT_VAR",
          dxtOptions: { type: "string" },
        },
        {
          name: "dir",
          description: "Directory path",
          options: ["--dir"],
          type: "string",
          env: "DIR_VAR",
          dxtOptions: { type: "directory" },
        },
        {
          name: "file",
          description: "File path",
          options: ["--file"],
          type: "string",
          env: "FILE_VAR",
          dxtOptions: { type: "file" },
        },
        {
          name: "enabled",
          description: "Enable feature",
          options: ["--enabled"],
          type: "boolean",
          env: "ENABLED_VAR",
          dxtOptions: { type: "boolean", default: false },
        },
        {
          name: "count",
          description: "Count value",
          options: ["--count"],
          type: "number",
          env: "COUNT_VAR",
          dxtOptions: { type: "number", default: 0 },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        const result = dxtGenerator.generateEnvAndUserConfig();
        expect(Object.keys(result.userConfig)).toHaveLength(5);
      }).not.toThrow();
    });
  });
});
