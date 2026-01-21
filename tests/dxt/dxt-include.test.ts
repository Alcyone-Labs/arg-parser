import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { DxtGenerator } from "../../src/dxt/DxtGenerator.js";
import { ArgParser } from "../../src/index.js";

describe("DXT Include Functionality", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = typeof process !== "undefined" ? process.cwd() : "/test";
    tempDir = fs.mkdtempSync(path.join(originalCwd, "test-dxt-include-"));
    if (typeof process !== "undefined") {
      process.chdir(tempDir);
    }

    // Create test files and directories
    fs.mkdirSync("migrations", { recursive: true });
    fs.writeFileSync("migrations/001_init.sql", "CREATE TABLE test (id INTEGER);");
    fs.writeFileSync("migrations/002_data.sql", "INSERT INTO test VALUES (1);");

    fs.mkdirSync("config", { recursive: true });
    fs.writeFileSync("config/default.json", '{"database": "test.db"}');
    fs.writeFileSync("config/production.json", '{"database": "prod.db"}');

    fs.writeFileSync("README.md", "# Test Project");
    fs.writeFileSync("package.json", '{"name": "test", "version": "1.0.0"}');
  });

  afterEach(() => {
    if (typeof process !== "undefined") {
      process.chdir(originalCwd);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should include simple string paths in DXT configuration", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for DXT include functionality",
      handler: async () => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
          description: "Test server",
        },
        dxt: {
          include: ["migrations", "config/default.json", "README.md"],
        },
      },
    });

    const mcpConfig = parser.getMcpServerConfig();
    expect(mcpConfig).toBeDefined();
    expect(mcpConfig?.dxt?.include).toBeDefined();
    expect(mcpConfig?.dxt?.include).toHaveLength(3);
    expect(mcpConfig?.dxt?.include).toContain("migrations");
    expect(mcpConfig?.dxt?.include).toContain("config/default.json");
    expect(mcpConfig?.dxt?.include).toContain("README.md");
  });

  test("should include object mapping paths in DXT configuration", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for DXT include functionality",
      handler: async () => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
          description: "Test server",
        },
        dxt: {
          include: [
            { from: "config/production.json", to: "config.json" },
            { from: "migrations", to: "db/migrations" },
          ],
        },
      },
    });

    const mcpConfig = parser.getMcpServerConfig();
    expect(mcpConfig?.dxt?.include).toBeDefined();
    expect(mcpConfig?.dxt?.include).toHaveLength(2);

    const includeItems = mcpConfig?.dxt?.include || [];
    expect(includeItems[0]).toEqual({
      from: "config/production.json",
      to: "config.json",
    });
    expect(includeItems[1]).toEqual({
      from: "migrations",
      to: "db/migrations",
    });
  });

  test("should handle mixed string and object include configurations", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for DXT include functionality",
      handler: async () => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
          description: "Test server",
        },
        dxt: {
          include: [
            "migrations",
            { from: "config/production.json", to: "config.json" },
            "README.md",
          ],
        },
      },
    });

    const mcpConfig = parser.getMcpServerConfig();
    expect(mcpConfig?.dxt?.include).toBeDefined();
    expect(mcpConfig?.dxt?.include).toHaveLength(3);

    const includeItems = mcpConfig?.dxt?.include || [];
    expect(includeItems[0]).toBe("migrations");
    expect(includeItems[1]).toEqual({
      from: "config/production.json",
      to: "config.json",
    });
    expect(includeItems[2]).toBe("README.md");
  });

  test("should work without DXT include configuration", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI without DXT include",
      handler: async () => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
          description: "Test server",
        },
      },
    });

    const mcpConfig = parser.getMcpServerConfig();
    expect(mcpConfig).toBeDefined();
    expect(mcpConfig?.dxt).toBeUndefined();
  });

  test("should work with empty DXT include array", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI with empty DXT include",
      handler: async () => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
          description: "Test server",
        },
        dxt: {
          include: [],
        },
      },
    });

    const mcpConfig = parser.getMcpServerConfig();
    expect(mcpConfig?.dxt?.include).toBeDefined();
    expect(mcpConfig?.dxt?.include).toHaveLength(0);
  });
});
