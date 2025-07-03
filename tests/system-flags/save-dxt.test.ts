import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip from "adm-zip";
import { ArgParser } from "../../src/ArgParser";

describe("--s-save-DXT System Flag", () => {
  const testOutputDir = "./test-dxt-output";

  beforeEach(() => {
    // Clean up any existing test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  test("should generate DXT package for single MCP server", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for DXT generation",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
    })
    .addFlags([
      {
        name: "input",
        description: "Input file",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
    ])
    .addMcpSubCommand("serve", {
      name: "test-mcp-server",
      version: "1.0.0",
      description: "Test MCP server",
    });

    // This should exit the process, so we need to catch it
    let exitCalled = false;
    const originalExit = process.exit;
    process.exit = ((code: any) => {
      exitCalled = true;
      return undefined as never;
    }) as any;

    try {
      parser.parse(["--s-save-DXT", testOutputDir]);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCalled).toBe(true);
    expect(fs.existsSync(testOutputDir)).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, "test-mcp-server.dxt"))).toBe(true);

    // Verify DXT file contents
    const dxtPath = path.join(testOutputDir, "test-mcp-server.dxt");
    const zip = new AdmZip(dxtPath);
    const entries = zip.getEntries();
    
    expect(entries.length).toBe(2);
    expect(entries.some(entry => entry.entryName === "manifest.json")).toBe(true);
    expect(entries.some(entry => entry.entryName === "server/index.js")).toBe(true);

    // Verify manifest content
    const manifestEntry = zip.getEntry("manifest.json");
    expect(manifestEntry).toBeTruthy();
    
    const manifestContent = manifestEntry!.getData().toString();
    const manifest = JSON.parse(manifestContent);
    
    expect(manifest.name).toBe("test-mcp-server");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.description).toBe("Test MCP server");
    expect(manifest.server.entry_point).toBe("server/index.js");
    expect(manifest.server.runtime).toBe("node");
    expect(manifest.server.transport).toBe("stdio");
    expect(manifest.tools).toBeInstanceOf(Array);
    expect(manifest.tools.length).toBeGreaterThan(0);
    expect(manifest.metadata.generator).toBe("@alcyone-labs/arg-parser");
  });

  test("should generate multiple DXT packages for multiple MCP servers", () => {
    const parser = ArgParser.withMcp({
      appName: "Multi MCP CLI",
      appCommandName: "multi-mcp",
      description: "CLI with multiple MCP servers",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
    })
    .addFlags([
      {
        name: "input",
        description: "Input file",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
    ])
    .addMcpSubCommand("serve-primary", {
      name: "primary-server",
      version: "1.0.0",
      description: "Primary MCP server",
    })
    .addMcpSubCommand("serve-secondary", {
      name: "secondary-server",
      version: "2.0.0",
      description: "Secondary MCP server",
    });

    let exitCalled = false;
    const originalExit = process.exit;
    process.exit = ((code: any) => {
      exitCalled = true;
      return undefined as never;
    }) as any;

    try {
      parser.parse(["--s-save-DXT", testOutputDir]);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCalled).toBe(true);
    expect(fs.existsSync(testOutputDir)).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, "primary-server.dxt"))).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, "secondary-server.dxt"))).toBe(true);
  });

  test("should handle CLI with no MCP servers gracefully", () => {
    const parser = new ArgParser({
      appName: "No MCP CLI",
      appCommandName: "no-mcp",
      description: "CLI without MCP servers",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
    })
    .addFlags([
      {
        name: "input",
        description: "Input file",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
    ]);

    let exitCalled = false;
    const originalExit = process.exit;
    process.exit = ((code: any) => {
      exitCalled = true;
      return undefined as never;
    }) as any;

    try {
      parser.parse(["--s-save-DXT"]);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCalled).toBe(true);
    // Should not create any DXT files
    expect(fs.existsSync(testOutputDir)).toBe(false);
  });

  test("should use current directory when no directory specified", () => {
    const parser = ArgParser.withMcp({
      appName: "Default Dir CLI",
      appCommandName: "default-dir",
      description: "CLI for testing default directory",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
    })
    .addMcpSubCommand("serve", {
      name: "default-dir-server",
      version: "1.0.0",
      description: "Server for default directory test",
    });

    let exitCalled = false;
    const originalExit = process.exit;
    process.exit = ((code: any) => {
      exitCalled = true;
      return undefined as never;
    }) as any;

    try {
      parser.parse(["--s-save-DXT"]);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCalled).toBe(true);
    expect(fs.existsSync("default-dir-server.dxt")).toBe(true);
    
    // Clean up the file created in current directory
    if (fs.existsSync("default-dir-server.dxt")) {
      fs.unlinkSync("default-dir-server.dxt");
    }
  });
});
