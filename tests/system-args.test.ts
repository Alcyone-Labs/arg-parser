import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { ArgParser } from "../src/core/ArgParser";

describe("System Flags (args.systemArgs)", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("should expose --s-debug in systemArgs when causing early return", async () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    const result = (await parser.parse(["--s-debug"])) as any;

    // --s-debug causes early return with ParseResult, but systemArgs should still be included
    expect(result.systemArgs).toBeDefined();
    expect(result.systemArgs?.debug).toBe(true);
  });

  test("should expose --s-enable-fuzzy in systemArgs when preventing execution", async () => {
    // --s-enable-fuzzy prevents handler execution by design (fuzzy testing mode)
    // The systemArgs should still be detected and returned
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async () => {
        // This should NOT be called when --s-enable-fuzzy is present
        return { executed: true };
      },
    });

    const result = (await parser.parse(["--s-enable-fuzzy"])) as any;

    // Handler should not have executed
    expect(result.executed).toBeUndefined();
    // But systemArgs should still be present
    expect(result.systemArgs).toBeDefined();
    expect(result.systemArgs?.enableFuzzy).toBe(true);
  });

  test("should expose --s-mcp-transport with value in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    await parser.parse(["--s-mcp-transport", "sse", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpTransport).toBe("sse");
  });

  test("should expose --s-mcp-port with numeric value in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    await parser.parse(["--s-mcp-port", "3000", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpPort).toBe(3000);
  });

  test("should expose --s-with-env with path in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    await parser.parse(["--s-with-env", "/path/to/env", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.withEnv).toBe("/path/to/env");
  });

  test("should expose --s-build-dxt with path in systemArgs when causing early return", async () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    const result = (await parser.parse(["--s-build-dxt", "/output/dir"])) as any;

    expect(result.systemArgs).toBeDefined();
    expect(result.systemArgs?.buildDxt).toBe("/output/dir");
  });

  test("should expose multiple system flags in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    // Use flags that don't cause early return
    await parser.parse(["--s-mcp-transport", "sse", "--input", "test", "--s-mcp-port", "8080"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpTransport).toBe("sse");
    expect(capturedSystemArgs?.mcpPort).toBe(8080);
  });

  test("should expose systemArgs in subcommand handlers", async () => {
    let capturedSystemArgs: any;
    const parent = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    const child = new ArgParser({
      appName: "Child CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    child.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    parent.addSubCommand({
      name: "child",
      parser: child,
    });

    // Use --s-mcp-port instead of --s-debug (which causes early return)
    await parent.parse(["child", "--s-mcp-port", "3000", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpPort).toBe(3000);
  });

  test("should handle system flags mixed with user flags via handler", async () => {
    let capturedSystemArgs: any;
    let capturedUserFlag: any;

    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        capturedUserFlag = ctx.args.verbose;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
      description: "Enable verbose output",
    });

    // Use --s-mcp-port instead of --s-enable-fuzzy (which prevents execution)
    await parser.parse(["--verbose", "--s-mcp-port", "8080"], {
      skipHandlers: false,
    });

    expect(capturedUserFlag).toBe(true);
    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpPort).toBe(8080);
  });

  test("should have systemArgs as undefined in context when no system flags provided", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    await parser.parse([], { skipHandlers: false });

    // When no system flags are provided, systemArgs in context should be undefined or empty
    expect(
      capturedSystemArgs === undefined || Object.keys(capturedSystemArgs || {}).length === 0,
    ).toBe(true);
  });

  test("should expose --s-debug-print in systemArgs when causing early return", async () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    const result = (await parser.parse(["--s-debug-print"])) as any;

    expect(result.systemArgs).toBeDefined();
    expect(result.systemArgs?.debugPrint).toBe(true);
  });

  test("should expose --s-mcp-host in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    await parser.parse(["--s-mcp-host", "localhost", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpHost).toBe("localhost");
  });

  test("should expose --s-mcp-path in systemArgs via handler", async () => {
    let capturedSystemArgs: any;
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
      handler: async (ctx) => {
        capturedSystemArgs = ctx.systemArgs;
        return { done: true };
      },
    });

    parser.addFlag({
      name: "input",
      options: ["--input"],
      type: "string",
      mandatory: true,
    });

    await parser.parse(["--s-mcp-path", "/mcp", "--input", "test"], {
      skipHandlers: false,
    });

    expect(capturedSystemArgs).toBeDefined();
    expect(capturedSystemArgs?.mcpPath).toBe("/mcp");
  });

  test("should expose --s-save-to-env in systemArgs when causing early return", async () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    // Add a flag so there's something to save
    parser.addFlag({
      name: "output",
      options: ["--output"],
      type: "string",
      defaultValue: "default.txt",
    });

    const result = (await parser.parse(["--s-save-to-env"])) as any;

    expect(result.systemArgs).toBeDefined();
    expect(result.systemArgs?.saveToEnv).toBe(true);
  });
});
