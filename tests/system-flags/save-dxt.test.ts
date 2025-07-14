import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArgParser } from "../../src/ArgParser";

describe("--s-build-dxt System Flag", () => {
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

  test("should generate DXT package for single MCP server", async () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for DXT generation",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
      autoExit: false, // Use new return-based approach
      mcp: {
        serverInfo: {
          name: "test-mcp-server",
          version: "1.0.0",
          description: "Test MCP server",
          author: {
            name: "Test Author",
            email: "test@example.com"
          }
        }
      }
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
    .addTool({
      name: "process",
      description: "Process input file",
      flags: [
        {
          name: "output",
          description: "Output file",
          options: ["--output", "-o"],
          type: "string",
          mandatory: false,
        },
      ],
      handler: async (ctx) => ({ processed: ctx.args.input, output: ctx.args.output })
    });

    // With autoExit: false, this should return a ParseResult
    const result = await parser.parse(["--s-build-dxt", testOutputDir]);

    // Verify it's a ParseResult with success
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('exitCode', 0);
    expect(result).toHaveProperty('shouldExit', true);
    expect(result).toHaveProperty('type', 'success');
    expect(fs.existsSync(testOutputDir)).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, "test-mcp-server-dxt"))).toBe(true);

    // Verify DXT folder contents
    const dxtPath = path.join(testOutputDir, "test-mcp-server-dxt");
    expect(fs.existsSync(path.join(dxtPath, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(dxtPath, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(dxtPath, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(dxtPath, "build-dxt-package.sh"))).toBe(true);

    // Verify manifest content
    const manifestPath = path.join(dxtPath, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check DXT-compliant manifest structure
    expect(manifest.dxt_version).toBe("0.1");
    expect(manifest.name).toBe("test-mcp-server");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.description).toBe("Test MCP server");
    expect(manifest.author).toBeDefined();
    expect(manifest.author.name).toBeDefined();
    expect(manifest.server.type).toBe("node");
    expect(manifest.server.entry_point).toBe("server/index.mjs");
    expect(manifest.server.mcp_config).toBeDefined();
    expect(manifest.server.mcp_config.command).toBe("node");
    expect(manifest.server.mcp_config.args).toEqual(["${__dirname}/server/index.mjs", "--s-mcp-serve"]);
    expect(manifest.tools).toBeInstanceOf(Array);
    expect(manifest.tools.length).toBeGreaterThan(0);
  });








});
