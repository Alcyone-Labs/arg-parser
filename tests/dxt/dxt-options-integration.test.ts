import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";
import { ArgParser } from "../../src/index";

describe("DxtOptions Integration Tests", () => {
  let parser: ArgParser;
  let dxtGenerator: DxtGenerator;
  let tempDir: string;

  beforeEach(async () => {
    parser = new ArgParser("test-app");
    tempDir = join(process.cwd(), "tests", "fixtures", "temp-dxt-integration");

    // Ensure temp directory exists
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe("End-to-End DXT Package Generation", () => {
    it("should generate complete DXT package with dxtOptions", async () => {
      // Set up parser with flags that have dxtOptions
      parser.addFlags([
        {
          name: "apiKey",
          description: "API key for service",
          options: ["--api-key"],
          type: "string",
          env: "API_KEY",
          mandatory: true,
          dxtOptions: {
            type: "string",
            title: "Service API Key",
            sensitive: true,
          },
        },
        {
          name: "port",
          description: "Server port",
          options: ["--port"],
          type: "number",
          env: "SERVER_PORT",
          dxtOptions: {
            type: "number",
            title: "Server Port",
            default: 3000,
            min: 1000,
            max: 65535,
          },
        },
        {
          name: "configFile",
          description: "Configuration file path",
          options: ["--config"],
          type: "string",
          env: "CONFIG_FILE",
          dxtOptions: {
            type: "file",
            title: "Config File",
            default: "./config.json",
          },
        },
        {
          name: "verbose",
          description: "Enable verbose logging",
          options: ["--verbose"],
          type: "boolean",
          env: "VERBOSE_MODE",
          dxtOptions: {
            type: "boolean",
            title: "Verbose Logging",
            default: false,
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      // Generate environment and user config
      const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Verify environment variables
      expect(envVars).toEqual({
        API_KEY: "${user_config.API_KEY}",
        SERVER_PORT: "${user_config.SERVER_PORT}",
        CONFIG_FILE: "${user_config.CONFIG_FILE}",
        VERBOSE_MODE: "${user_config.VERBOSE_MODE}",
      });

      // Verify user config with dxtOptions applied
      expect(userConfig.API_KEY).toEqual({
        type: "string",
        title: "Service API Key",
        description: "API key for service",
        required: true,
        sensitive: true,
      });

      expect(userConfig.SERVER_PORT).toEqual({
        type: "number",
        title: "Server Port",
        description: "Server port (default: 3000)",
        required: false,
        sensitive: true,
        default: 3000,
        min: 1000,
        max: 65535,
      });

      expect(userConfig.CONFIG_FILE).toEqual({
        type: "file",
        title: "Config File",
        description: "Configuration file path (default: ./config.json)",
        required: false,
        sensitive: true,
        default: "./config.json",
      });

      expect(userConfig.VERBOSE_MODE).toEqual({
        type: "boolean",
        title: "Verbose Logging",
        description: "Enable verbose logging (default: false)",
        required: false,
        sensitive: true,
        default: false,
      });
    });

    it("should handle mixed flags with and without dxtOptions", async () => {
      parser.addFlags([
        {
          name: "withDxt",
          description: "Flag with dxtOptions",
          options: ["--with-dxt"],
          type: "string",
          env: "WITH_DXT",
          dxtOptions: {
            type: "string",
            title: "Custom Title",
            sensitive: false,
          },
        },
        {
          name: "withoutDxt",
          description: "Flag without dxtOptions",
          options: ["--without-dxt"],
          type: "string",
          env: "WITHOUT_DXT",
          // No dxtOptions
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Flag with dxtOptions should use custom configuration
      expect(userConfig.WITH_DXT).toEqual({
        type: "string",
        title: "Custom Title",
        description: "Flag with dxtOptions",
        required: false,
        sensitive: false,
      });

      // Flag without dxtOptions should use defaults
      expect(userConfig.WITHOUT_DXT).toEqual({
        type: "string",
        title: "Without Dxt",
        description: "Flag without dxtOptions",
        required: false,
        sensitive: true,
      });
    });

    it("should generate valid manifest.json with dxtOptions", async () => {
      parser.addFlags([
        {
          name: "token",
          description: "Authentication token",
          options: ["--token"],
          type: "string",
          env: "AUTH_TOKEN",
          mandatory: true,
          dxtOptions: {
            type: "string",
            title: "Auth Token",
            sensitive: true,
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      // Generate manifest data
      const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Verify manifest structure would be correct
      expect(envVars.AUTH_TOKEN).toBe("${user_config.AUTH_TOKEN}");
      expect(userConfig.AUTH_TOKEN).toEqual({
        type: "string",
        title: "Auth Token",
        description: "Authentication token",
        required: true,
        sensitive: true,
      });
    });

    it("should handle complex dxtOptions scenarios", async () => {
      parser.addFlags([
        {
          name: "database",
          description: "Database connection string",
          options: ["--database"],
          type: "string",
          env: "DATABASE_URL",
          mandatory: true,
          dxtOptions: {
            type: "string",
            title: "Database Connection",
            sensitive: true,
          },
        },
        {
          name: "retries",
          description: "Number of retry attempts",
          options: ["--retries"],
          type: "number",
          env: "RETRY_COUNT",
          dxtOptions: {
            type: "number",
            title: "Retry Attempts",
            default: 3,
            min: 0,
            max: 10,
          },
        },
        {
          name: "outputDir",
          description: "Output directory",
          options: ["--output-dir"],
          type: "string",
          env: "OUTPUT_DIR",
          dxtOptions: {
            type: "directory",
            title: "Output Directory",
            default: "./output",
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Verify all dxtOptions are properly applied
      expect(userConfig.DATABASE_URL.type).toBe("string");
      expect(userConfig.DATABASE_URL.title).toBe("Database Connection");
      expect(userConfig.DATABASE_URL.sensitive).toBe(true);
      expect(userConfig.DATABASE_URL.required).toBe(true);

      expect(userConfig.RETRY_COUNT.type).toBe("number");
      expect(userConfig.RETRY_COUNT.title).toBe("Retry Attempts");
      expect(userConfig.RETRY_COUNT.default).toBe(3);
      expect(userConfig.RETRY_COUNT.min).toBe(0);
      expect(userConfig.RETRY_COUNT.max).toBe(10);

      expect(userConfig.OUTPUT_DIR.type).toBe("directory");
      expect(userConfig.OUTPUT_DIR.title).toBe("Output Directory");
      expect(userConfig.OUTPUT_DIR.default).toBe("./output");
    });

    it("should preserve flag precedence with dxtOptions", async () => {
      // Add main flags
      parser.addFlags([
        {
          name: "shared",
          description: "Shared flag from main",
          options: ["--shared"],
          type: "string",
          env: "SHARED_VAR",
          dxtOptions: {
            type: "string",
            title: "Main Shared Flag",
            sensitive: false,
          },
        },
      ]);

      // Add tool with conflicting flag
      parser.addTool({
        name: "test-tool",
        description: "Test tool",
        flags: [
          {
            name: "shared",
            description: "Shared flag from tool",
            options: ["--shared"],
            type: "string",
            env: "SHARED_VAR",
            dxtOptions: {
              type: "string",
              title: "Tool Shared Flag",
              sensitive: true,
            },
          },
        ],
        handler: async () => ({ success: true }),
      });

      dxtGenerator = new DxtGenerator(parser);
      const { userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Main flag should take precedence
      expect(userConfig.SHARED_VAR.title).toBe("Main Shared Flag");
      expect(userConfig.SHARED_VAR.sensitive).toBe(false);
    });

    it("should work with DXT package generation flow", async () => {
      parser.addFlags([
        {
          name: "apiKey",
          description: "API key",
          options: ["--api-key"],
          type: "string",
          env: "API_KEY",
          dxtOptions: {
            type: "string",
            title: "API Key",
            sensitive: true,
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      // Test the core DXT generation functionality
      const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

      // Verify the DXT configuration is correct
      expect(envVars.API_KEY).toBe("${user_config.API_KEY}");
      expect(userConfig.API_KEY).toEqual({
        type: "string",
        title: "API Key",
        description: "API key",
        required: false,
        sensitive: true,
      });

      // Verify that the dxtOptions are properly applied
      expect(userConfig.API_KEY.title).toBe("API Key");
      expect(userConfig.API_KEY.sensitive).toBe(true);
      expect(userConfig.API_KEY.type).toBe("string");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle validation errors during DXT generation", async () => {
      parser.addFlags([
        {
          name: "invalid",
          description: "Invalid flag",
          options: ["--invalid"],
          type: "number",
          env: "INVALID_VAR",
          dxtOptions: {
            type: "number",
            default: "not-a-number", // Invalid: string default for number type
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        dxtGenerator.generateEnvAndUserConfig();
      }).toThrow("Invalid dxtOptions.default for INVALID_VAR: expected number, got string");
    });

    it("should handle type mismatch errors during DXT generation", async () => {
      parser.addFlags([
        {
          name: "typeMismatch",
          description: "Type mismatch flag",
          options: ["--type-mismatch"],
          type: "number",
          env: "TYPE_MISMATCH_VAR",
          dxtOptions: {
            type: "number",
            default: "not-a-number", // Invalid: string default for number type
          },
        },
      ]);

      dxtGenerator = new DxtGenerator(parser);

      expect(() => {
        dxtGenerator.generateEnvAndUserConfig();
      }).toThrow("Invalid dxtOptions.default for TYPE_MISMATCH_VAR: expected number, got string");
    });
  });
});
