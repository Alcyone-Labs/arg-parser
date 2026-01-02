import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArgParser } from "../../src";

describe("Automatic Argument Detection", () => {
  let originalProcessArgv: string[];
  let consoleWarnSpy: any;
  let originalProcess: any;

  beforeEach(() => {
    // Store original process and process.argv
    originalProcess = globalThis.process;
    if (typeof process !== "undefined") {
      originalProcessArgv = process.argv;
    } else {
      // Mock process if it doesn't exist
      globalThis.process = {
        argv: ["node", "script.js"],
        env: {},
        stderr: { write: vi.fn() },
        cwd: vi.fn(() => "/test"),
        chdir: vi.fn(),
      };
      originalProcessArgv = globalThis.process.argv;
    }
    // Mock console.warn to capture warnings
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original process.argv and process
    if (originalProcess) {
      globalThis.process = originalProcess;
    } else if (typeof process !== "undefined") {
      process.argv = originalProcessArgv;
    }
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  describe("Node.js Environment", () => {
    test("should auto-detect arguments from process.argv when no arguments provided", async () => {
      // Mock process.argv with test arguments
      globalThis.process.argv = ["node", "script.js", "--test", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      // Call parse() without arguments - should auto-detect
      const result = await parser.parse();

      expect(result.test).toBe("value");
      expect(result.success).toBe(true);
    });

    test("should not display warning when not in CLI mode", async () => {
      // Mock process.argv with test arguments
      globalThis.process.argv = ["node", "script.js", "--test", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        // No appCommandName - not CLI mode
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      await parser.parse();

      // Should not have displayed warning
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test("should not display warning in MCP mode", async () => {
      // Mock process.argv with test arguments
      globalThis.process.argv = ["node", "script.js", "--test", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli", // This would normally trigger CLI mode
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      // Call with isMcp option to simulate MCP mode
      await parser.parse(undefined, { isMcp: true });

      // Should not have displayed warning in MCP mode
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test("should work with parseForCli method", async () => {
      // Mock process.argv with test arguments
      globalThis.process.argv = ["node", "script.js", "--test", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      // Call parseForCli() without arguments - should auto-detect
      const result = await parser.parseForCli();

      expect(result.test).toBe("value");
      expect(result.success).toBe(true);
    });

    test("should work with deprecated parseAsync method", async () => {
      // Mock process.argv with test arguments
      globalThis.process.argv = ["node", "script.js", "--test", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      // Call parseAsync() without arguments - should auto-detect
      const result = await parser.parseAsync();

      expect(result.test).toBe("value");
      expect(result.success).toBe(true);
    });
  });

  describe("Non-Node.js Environment", () => {
    test("should throw error when no arguments provided in non-Node.js environment", async () => {
      // Mock non-Node.js environment
      const originalProcess = global.process;
      // @ts-ignore
      delete global.process;

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      await expect(parser.parse()).rejects.toThrow(
        "parse() called without arguments in non-Node.js environment",
      );

      // Restore process
      global.process = originalProcess;
    });

    test("should throw error when process.argv is not available", async () => {
      // Mock Node.js environment but without process.argv
      const originalArgv = globalThis.process.argv;
      // @ts-ignore
      delete globalThis.process.argv;

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      await expect(parser.parse()).rejects.toThrow(
        "parse() called without arguments in non-Node.js environment",
      );

      // Restore process.argv
      globalThis.process.argv = originalArgv;
    });
  });

  describe("Explicit Arguments Still Work", () => {
    test("should use provided arguments when explicitly passed", async () => {
      // Mock process.argv with different arguments
      globalThis.process.argv = ["node", "script.js", "--wrong", "value"];

      const parser = new ArgParser({
        appName: "Test CLI",
        appCommandName: "test-cli",
        handler: async (ctx) => ({ success: true, args: ctx.args }),
        autoExit: false,
        handleErrors: false,
      }).addFlag({
        name: "test",
        description: "Test flag",
        options: ["--test"],
        type: "string",
      });

      // Explicitly provide different arguments
      const result = await parser.parse(["--test", "explicit"]);

      expect(result.test).toBe("explicit");
      expect(result.success).toBe(true);

      // Should not have displayed warning when arguments are explicitly provided
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
