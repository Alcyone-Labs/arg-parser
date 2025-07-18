import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigurationManager } from "../src/config/ConfigurationManager";
import { ArgParser } from "../src/core/ArgParser";

describe("ConfigurationManager", () => {
  const testConfigDir = "./test-config-output";
  let configManager: ConfigurationManager;
  let mockArgParser: any;

  beforeEach(() => {
    // Clean up any existing test output
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testConfigDir, { recursive: true });

    // Create a mock ArgParser instance
    mockArgParser = {
      getAppName: () => "Test App",
      getAppCommandName: () => "test-cli",
      getDescription: () => "Test CLI description",
      flags: [
        {
          name: "input",
          description: "Input file",
          type: "string",
          mandatory: true,
        },
        {
          name: "verbose",
          description: "Verbose output",
          type: "boolean",
          mandatory: false,
        },
        {
          name: "count",
          description: "Number of items",
          type: "number",
          mandatory: false,
        },
      ],
      getLastParseResult: () => ({
        args: {
          input: "test.txt",
          verbose: true,
          count: 5,
        },
      }),
    };

    configManager = new ConfigurationManager(mockArgParser);
  });

  afterEach(() => {
    // Clean up test output
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe("generateDefaultEnvFileName", () => {
    test("should generate filename from app command name", () => {
      const filename = configManager.generateDefaultEnvFileName();
      expect(filename).toBe("TestCli.env");
    });

    test("should generate filename from app name when no command name", () => {
      mockArgParser.getAppCommandName = () => undefined;
      const filename = configManager.generateDefaultEnvFileName();
      expect(filename).toBe("TestApp.env");
    });

    test("should use default config name when no app info", () => {
      mockArgParser.getAppCommandName = () => undefined;
      mockArgParser.getAppName = () => "Argument Parser";
      const filename = configManager.generateDefaultEnvFileName();
      expect(filename).toBe("Config.env");
    });
  });

  describe("parseEnvFile", () => {
    test("should parse basic environment file format", () => {
      const content = `
# Test config
INPUT=test.txt
VERBOSE=true
COUNT=5
`;
      const result = configManager.parseEnvFile(content);
      expect(result).toEqual({
        INPUT: "test.txt",
        VERBOSE: "true",
        COUNT: "5",
      });
    });

    test("should handle quoted values", () => {
      const content = `
INPUT="file with spaces.txt"
DESCRIPTION='A test description'
`;
      const result = configManager.parseEnvFile(content);
      expect(result).toEqual({
        INPUT: "file with spaces.txt",
        DESCRIPTION: "A test description",
      });
    });

    test("should ignore comments and empty lines", () => {
      const content = `
# This is a comment
INPUT=test.txt

# Another comment
VERBOSE=true
`;
      const result = configManager.parseEnvFile(content);
      expect(result).toEqual({
        INPUT: "test.txt",
        VERBOSE: "true",
      });
    });
  });

  describe("parseJsonFile", () => {
    test("should parse valid JSON", () => {
      const content = `{
        "input": "test.txt",
        "verbose": true,
        "count": 5
      }`;
      const result = configManager.parseJsonFile(content);
      expect(result).toEqual({
        input: "test.txt",
        verbose: true,
        count: 5,
      });
    });

    test("should throw error for invalid JSON", () => {
      const content = "{ invalid json }";
      expect(() => configManager.parseJsonFile(content)).toThrow(
        "Failed to parse JSON",
      );
    });
  });

  describe("convertValueToFlagType", () => {
    test("should convert string values", () => {
      const flag = { name: "test", type: "string" };
      expect(configManager.convertValueToFlagType("hello", flag)).toBe("hello");
      expect(configManager.convertValueToFlagType(123, flag)).toBe("123");
    });

    test("should convert number values", () => {
      const flag = { name: "test", type: "number" };
      expect(configManager.convertValueToFlagType("123", flag)).toBe(123);
      expect(configManager.convertValueToFlagType(456, flag)).toBe(456);
    });

    test("should throw error for invalid number", () => {
      const flag = { name: "test", type: "number" };
      expect(() =>
        configManager.convertValueToFlagType("not-a-number", flag),
      ).toThrow("Cannot convert");
    });

    test("should convert boolean values", () => {
      const flag = { name: "test", type: "boolean" };
      expect(configManager.convertValueToFlagType("true", flag)).toBe(true);
      expect(configManager.convertValueToFlagType("false", flag)).toBe(false);
      expect(configManager.convertValueToFlagType("1", flag)).toBe(true);
      expect(configManager.convertValueToFlagType("0", flag)).toBe(false);
      expect(configManager.convertValueToFlagType(true, flag)).toBe(true);
    });

    test("should convert table/array values", () => {
      const flag = { name: "test", type: "table" };
      expect(configManager.convertValueToFlagType(["a", "b"], flag)).toEqual([
        "a",
        "b",
      ]);
      expect(configManager.convertValueToFlagType("a,b,c", flag)).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(configManager.convertValueToFlagType('["x","y"]', flag)).toEqual([
        "x",
        "y",
      ]);
    });
  });

  describe("generateEnvFormat", () => {
    test("should generate proper .env format", () => {
      const flags = mockArgParser.flags;
      const parsedArgs = mockArgParser.getLastParseResult();

      const result = configManager.generateEnvFormat(flags, parsedArgs);

      expect(result).toContain("INPUT=test.txt");
      expect(result).toContain("VERBOSE=true");
      expect(result).toContain("COUNT=5");
      expect(result).toContain("# Input file");
      expect(result).toContain("# Type: string");
    });

    test("should quote values with spaces", () => {
      mockArgParser.getLastParseResult = () => ({
        args: { input: "file with spaces.txt" },
      });

      const result = configManager.generateEnvFormat(
        [mockArgParser.flags[0]],
        mockArgParser.getLastParseResult(),
      );
      expect(result).toContain('INPUT="file with spaces.txt"');
    });
  });

  describe("generateYamlFormat", () => {
    test("should generate proper YAML format", () => {
      const flags = mockArgParser.flags;
      const parsedArgs = mockArgParser.getLastParseResult();

      const result = configManager.generateYamlFormat(flags, parsedArgs);

      expect(result).toContain("input: test.txt");
      expect(result).toContain("verbose: true");
      expect(result).toContain("count: 5");
      expect(result).toContain("# Input file");
    });
  });

  describe("generateJsonFormat", () => {
    test("should generate proper JSON format", () => {
      const flags = mockArgParser.flags;
      const parsedArgs = mockArgParser.getLastParseResult();

      const result = configManager.generateJsonFormat(flags, parsedArgs);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        input: "test.txt",
        verbose: true,
        count: 5,
      });
    });
  });

  describe("mergeEnvConfigWithArgs", () => {
    test("should merge config with command line args", () => {
      const envConfig = { input: "config.txt", verbose: true };
      const processArgs = ["--count", "10"];

      const result = configManager.mergeEnvConfigWithArgs(
        envConfig,
        processArgs,
      );

      expect(result).toContain("--count");
      expect(result).toContain("10");
      expect(result).toContain("--input");
      expect(result).toContain("config.txt");
      expect(result).toContain("--verbose");
    });

    test("should not override existing command line args", () => {
      const envConfig = { input: "config.txt" };
      const processArgs = ["--input", "cli.txt"];

      const result = configManager.mergeEnvConfigWithArgs(
        envConfig,
        processArgs,
      );

      // Should keep the CLI version, not add the config version
      expect(result.filter((arg) => arg === "--input")).toHaveLength(1);
      expect(result).toContain("cli.txt");
      expect(result).not.toContain("config.txt");
    });
  });
});
