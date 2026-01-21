import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";
import { ArgParser } from "../src";

describe("Data-Safe Logging Integration", () => {
  let stderrSpy: any;
  let stdoutSpy: any;

  beforeEach(() => {
    // Spy on stdout and stderr
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    vi.restoreAllMocks();
  });

  test("ArgParser should use provided logger", async () => {
    const customLogger = createMcpLogger({ prefix: "CUSTOM" });
    const infoSpy = vi.spyOn(customLogger, "info");

    const parser = new ArgParser({
      appName: "test-app",
      logger: customLogger,
    });

    // parser.logger should return our custom logger
    expect(parser.logger).toBe(customLogger);

    // Call a method that logs
    parser.printAll();

    expect(infoSpy).toHaveBeenCalled();
  });

  test("ArgParser should inject logger into handler context", async () => {
    let contextLogger: any;
    const parser = new ArgParser({ appName: "test-app" });

    parser.setHandler((ctx) => {
      contextLogger = ctx.logger;
      ctx.logger.error("Hello from context");
    });

    await parser.parseAsync([]);

    expect(contextLogger).toBeDefined();
    expect(contextLogger).toBe(parser.logger);

    // Check that info was actually called on stderr (default behavior)
    expect(stderrSpy).toHaveBeenCalled();
    const stderrOutput = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrOutput).toContain("Hello from context");
    // Ensure STDOUT is clean
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  test("MCP mode handles log silencing correctly", async () => {
    // Create a logger that is silent
    const silentLogger = createMcpLogger({ silent: true });

    const parser = new ArgParser({
      appName: "silent-app",
      logger: silentLogger,
    });

    parser.setHandler((ctx) => {
      ctx.logger.info("This should not appear anywhere");
      ctx.logger.error("This should also not appear");
    });

    await parser.parseAsync([]);

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  test("Logger can redirect to file", async () => {
    const tempLogFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);

    // The option name is logToFile, not logFile
    const fileLogger = createMcpLogger({
      logToFile: tempLogFile,
      prefix: "FILE-TEST",
      level: "info",
    });

    const parser = new ArgParser({
      appName: "file-app",
      logger: fileLogger,
    });

    parser.setHandler((ctx) => {
      ctx.logger.info("Logged to file");
    });

    await parser.parseAsync([]);

    // Close the logger to ensure logs are flushed to disk
    await fileLogger.close();

    // Check if file exists and contains the message
    expect(fs.existsSync(tempLogFile)).toBe(true);
    const content = fs.readFileSync(tempLogFile, "utf8");
    expect(content).toContain("Logged to file");

    // Clean up
    if (fs.existsSync(tempLogFile)) {
      fs.unlinkSync(tempLogFile);
    }
  });

  test("ArgParserBase internal methods use logger", async () => {
    // fast-fail: false is important so handleErrors doesn't exit the process
    const parser = new ArgParser({ appName: "internal-test", autoExit: false });
    const infoSpy = vi.spyOn(parser.logger, "info");
    const errorSpy = vi.spyOn(parser.logger, "error");

    // trigger printAll which internally calls logger.info
    parser.printAll();
    expect(infoSpy).toHaveBeenCalled();

    // trigger some error logic
    try {
      // Try to trigger a real error that goes through handleError logic
      await parser.parseAsync(["--unknown-flag-xyz"], { handleErrors: true });
    } catch (e) {
      // Expected
    }

    expect(errorSpy).toHaveBeenCalled();
  });
});
