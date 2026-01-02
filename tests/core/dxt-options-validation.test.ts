import { describe, expect, test } from "vitest";
import { ArgParser } from "../../src/core/ArgParser";
import { zodDxtOptionsSchema, type IDxtOptions } from "../../src/core/types";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";

describe("DXT Options Validation", () => {
  describe("Backward Compatibility", () => {
    test("should work with existing IFlag usage without dxtOptions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "apiKey",
          description: "API key for service",
          options: ["--api-key"],
          type: "string",
          mandatory: true,
          env: "API_KEY",
        });
      }).not.toThrow();
    });

    test("should work with existing ENV flags without dxtOptions", () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async () => ({ success: true }),
      }).addFlags([
        {
          name: "token",
          description: "Auth token",
          options: ["--token"],
          type: "string",
          env: "AUTH_TOKEN",
        },
        {
          name: "verbose",
          description: "Verbose output",
          options: ["--verbose", "-v"],
          type: "boolean",
          defaultValue: false,
        },
      ]);

      expect(parser.flags.length).toBe(3); // Including help flag
    });

    test("should preserve all existing flag properties", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test",
        handler: async (ctx) => ({ args: ctx.args }),
      }).addFlag({
        name: "config",
        description: "Configuration file path",
        options: ["--config", "-c"],
        type: "string",
        mandatory: true,
        defaultValue: "./config.json",
        validate: (value) => value.endsWith(".json") || "Must be a JSON file",
        env: "CONFIG_PATH",
      });

      const result = await parser.parse(["--config", "test.json"]);
      expect(result.args.config).toBe("test.json");
    });
  });

  describe("DXT Options Schema Validation", () => {
    test("should validate valid dxtOptions", () => {
      const validOptions: IDxtOptions = {
        sensitive: false,
        localDefault: "/tmp/default",
        type: "directory",
        title: "Custom Title",
      };

      expect(() => zodDxtOptionsSchema.parse(validOptions)).not.toThrow();
    });

    test("should validate number type with min/max", () => {
      const validNumberOptions: IDxtOptions = {
        type: "number",
        min: 1,
        max: 100,
        default: 50,
      };

      expect(() => zodDxtOptionsSchema.parse(validNumberOptions)).not.toThrow();
    });

    test("should reject min/max with non-number types", () => {
      const invalidOptions = {
        type: "string",
        min: 1,
        max: 10,
      };

      expect(() => zodDxtOptionsSchema.parse(invalidOptions)).toThrow(
        "Invalid dxtOptions: min/max can only be used with type 'number'",
      );
    });

    test("should reject min > max", () => {
      const invalidOptions = {
        type: "number",
        min: 100,
        max: 50,
      };

      expect(() => zodDxtOptionsSchema.parse(invalidOptions)).toThrow(
        "min must be <= max",
      );
    });

    test("should reject invalid DXT types", () => {
      const invalidOptions = {
        type: "invalid-type",
      };

      expect(() => zodDxtOptionsSchema.parse(invalidOptions)).toThrow();
    });

    test("should reject extra properties (strict mode)", () => {
      const invalidOptions = {
        type: "string",
        extraProperty: "not allowed",
      };

      expect(() => zodDxtOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });

  describe("IFlag with dxtOptions Integration", () => {
    test("should accept IFlag with valid dxtOptions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "outputDir",
          description: "Output directory",
          options: ["--output-dir"],
          type: "string",
          env: "OUTPUT_DIR",
          dxtOptions: {
            sensitive: false,
            type: "directory",
            localDefault: "${DOCUMENTS}/MyApp",
            title: "Output Directory",
          },
        });
      }).not.toThrow();
    });

    test("should accept IFlag with number dxtOptions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "maxRetries",
          description: "Maximum retry attempts",
          options: ["--max-retries"],
          type: "number",
          defaultValue: 3,
          dxtOptions: {
            type: "number",
            min: 1,
            max: 10,
            sensitive: false,
          },
        });
      }).not.toThrow();
    });

    test("should reject IFlag with invalid dxtOptions", () => {
      expect(() => {
        new ArgParser({
          appName: "Test CLI",
          appCommandName: "test",
          handler: async () => ({ success: true }),
        }).addFlag({
          name: "invalidFlag",
          description: "Invalid flag",
          options: ["--invalid"],
          type: "string",
          dxtOptions: {
            type: "string",
            min: 1, // Invalid: min with string type
          },
        });
      }).toThrow();
    });
  });

  describe("Type Safety", () => {
    test("should provide proper TypeScript types for dxtOptions", () => {
      // This test ensures TypeScript compilation works correctly
      const options: IDxtOptions = {
        sensitive: true,
        localDefault: "default-value",
        type: "file",
        multiple: false,
        title: "File Path",
      };

      // These should be properly typed
      expect(typeof options.sensitive).toBe("boolean");
      expect(typeof options.localDefault).toBe("string");
      expect(options.type).toBe("file");
      expect(typeof options.multiple).toBe("boolean");
      expect(typeof options.title).toBe("string");
    });
  });

  describe("Enhanced Manifest Generation", () => {
    test("should generate enhanced user_config with dxtOptions", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async () => ({ success: true }),
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      }).addFlag({
        name: "outputDir",
        description: "Output directory for files",
        options: ["--output-dir"],
        type: "string",
        env: "OUTPUT_DIR",
        dxtOptions: {
          sensitive: false,
          type: "directory",
          localDefault: "${DOCUMENTS}/MyApp",
          title: "Output Directory",
        },
      });

      const dxtGenerator = new DxtGenerator(parser);
      const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

      expect(envVars).toHaveProperty("OUTPUT_DIR", "${user_config.OUTPUT_DIR}");
      expect(userConfig.OUTPUT_DIR).toEqual({
        type: "directory",
        title: "Output Directory",
        description: "Output directory for files (default: ${DOCUMENTS}/MyApp)",
        required: false,
        sensitive: false,
        default: "${DOCUMENTS}/MyApp",
      });
    });

    test("should generate number type with min/max constraints", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async () => ({ success: true }),
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      }).addFlag({
        name: "maxRetries",
        description: "Maximum retry attempts",
        options: ["--max-retries"],
        type: "number",
        defaultValue: 3,
        env: "MAX_RETRIES",
        dxtOptions: {
          type: "number",
          min: 1,
          max: 10,
          sensitive: false,
          default: 5,
        },
      });

      const dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      expect(userConfig.MAX_RETRIES).toEqual({
        type: "number",
        title: "Max Retries",
        description: "Maximum retry attempts (default: 5)",
        required: false,
        sensitive: false,
        min: 1,
        max: 10,
        default: 5,
      });
    });

    test("should support multiple values and custom titles", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async () => ({ success: true }),
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      }).addFlag({
        name: "endpoints",
        description: "API endpoints to monitor",
        options: ["--endpoints"],
        type: "array",
        env: "API_ENDPOINTS",
        dxtOptions: {
          type: "string",
          multiple: true,
          sensitive: true,
          title: "API Endpoints",
          localDefault: "https://api.example.com",
        },
      });

      const dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      expect(userConfig.API_ENDPOINTS).toEqual({
        type: "string",
        title: "API Endpoints",
        description:
          "API endpoints to monitor (default: https://api.example.com)",
        required: false,
        sensitive: true,
        multiple: true,
        default: "https://api.example.com",
      });
    });

    test("should fall back to defaults when dxtOptions not provided", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async () => ({ success: true }),
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      }).addFlag({
        name: "apiKey",
        description: "API key for authentication",
        options: ["--api-key"],
        type: "string",
        env: "API_KEY",
        // No dxtOptions - should use defaults
      });

      const dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      expect(userConfig.API_KEY).toEqual({
        type: "string", // Inferred from IFlag.type
        title: "Api Key", // Auto-generated from env var
        description: "API key for authentication", // From flag description
        required: false,
        sensitive: true, // Default for ENV-linked flags
      });
    });

    test("should infer DXT types from IFlag types", () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async () => ({ success: true }),
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      }).addFlags([
        {
          name: "debug",
          options: ["--debug"],
          type: Boolean,
          env: "DEBUG_MODE",
          dxtOptions: { sensitive: false },
        },
        {
          name: "port",
          options: ["--port"],
          type: Number,
          env: "PORT",
          dxtOptions: { sensitive: false },
        },
      ]);

      const dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      expect(userConfig.DEBUG_MODE.type).toBe("boolean");
      expect(userConfig.PORT.type).toBe("number");
    });
  });
});
