import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArgParser, enableOptionalConfigPluginsAsync } from "../src";
import type { IFlag } from "../src";

describe("--s-with-env system flag", () => {
  const testDir = path.join(__dirname, "temp-env-test");

  beforeEach(async () => {
    // Enable optional config plugins (TOML, YAML) for testing
    await enableOptionalConfigPluginsAsync();

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const flags: IFlag[] = [
    {
      name: "verbose",
      description: "Enable verbose mode",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
      defaultValue: false,
    },
    {
      name: "output",
      description: "Output file path",
      options: ["--output", "-o"],
      type: "string",
      mandatory: true,
    },
    {
      name: "count",
      description: "Number of items",
      options: ["--count", "-c"],
      type: "number",
      defaultValue: 1,
    },
    {
      name: "tags",
      description: "List of tags",
      options: ["--tags", "-t"],
      type: "string",
      allowMultiple: true,
    },
  ];

  describe(".env format", () => {
    it("should load configuration from .env file", async () => {
      const envFile = path.join(testDir, "config.env");
      const envContent = `
verbose=true
output=test-output.txt
count=5
tags=tag1,tag2,tag3
`;
      fs.writeFileSync(envFile, envContent);

      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env", envFile]);

      expect(result.verbose).toBe(true);
      expect(result.output).toBe("test-output.txt");
      expect(result.count).toBe(5);
      expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should allow CLI args to override env file values", async () => {
      const envFile = path.join(testDir, "config.env");
      const envContent = `
verbose=false
output=env-output.txt
count=10
`;
      fs.writeFileSync(envFile, envContent);

      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
      }).addFlags(flags);

      const result = await parser.parse([
        "--s-with-env",
        envFile,
        "--verbose",
        "--output",
        "cli-output.txt",
      ]);

      expect(result.verbose).toBe(true); // CLI override
      expect(result.output).toBe("cli-output.txt"); // CLI override
      expect(result.count).toBe(10); // From env file
    });
  });

  describe("YAML format", () => {
    it("should load configuration from YAML file", async () => {
      const yamlFile = path.join(testDir, "config.yaml");
      const yamlContent = `
verbose: true
output: yaml-output.txt
count: 7
tags:
  - yaml-tag1
  - yaml-tag2
`;
      fs.writeFileSync(yamlFile, yamlContent);

      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env", yamlFile]);

      expect(result.verbose).toBe(true);
      expect(result.output).toBe("yaml-output.txt");
      expect(result.count).toBe(7);
      expect(result.tags).toEqual(["yaml-tag1", "yaml-tag2"]);
    });
  });

  describe("JSON format", () => {
    it("should load configuration from JSON file", async () => {
      const jsonFile = path.join(testDir, "config.json");
      const jsonContent = {
        verbose: false,
        output: "json-output.txt",
        count: 3,
        tags: ["json-tag1", "json-tag2", "json-tag3"],
      };
      fs.writeFileSync(jsonFile, JSON.stringify(jsonContent, null, 2));

      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env", jsonFile]);

      expect(result.verbose).toBe(false);
      expect(result.output).toBe("json-output.txt");
      expect(result.count).toBe(3);
      expect(result.tags).toEqual(["json-tag1", "json-tag2", "json-tag3"]);
    });
  });

  describe("TOML format", () => {
    it("should load configuration from TOML file", async () => {
      const tomlFile = path.join(testDir, "config.toml");
      const tomlContent = `
verbose = true
output = "toml-output.txt"
count = 9
tags = ["toml-tag1", "toml-tag2"]
`;
      fs.writeFileSync(tomlFile, tomlContent);

      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env", tomlFile]);

      expect(result.verbose).toBe(true);
      expect(result.output).toBe("toml-output.txt");
      expect(result.count).toBe(9);
      expect(result.tags).toEqual(["toml-tag1", "toml-tag2"]);
    });
  });

  describe("error handling", () => {
    it("should exit with error if file does not exist", async () => {
      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
        autoExit: false,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env", "nonexistent.env"]);

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("exitCode", 1);
      expect(result).toHaveProperty("shouldExit", true);
      expect(result).toHaveProperty("type", "error");
    });

    it("should require a file path argument", async () => {
      const parser = new ArgParser({
        appName: "Test App",
        handler: (ctx) => ctx.args,
        autoExit: false,
      }).addFlags(flags);

      const result = await parser.parse(["--s-with-env"]);

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("exitCode", 1);
      expect(result).toHaveProperty("shouldExit", true);
      expect(result).toHaveProperty("type", "error");
    });
  });
});
