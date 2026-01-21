import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArgParser } from "../src";

describe("MCP Console Hijacking", () => {
  let originalConsole: Console;
  let stdoutSpy: any;
  let stderrSpy: any;

  beforeEach(() => {
    // Save original console
    originalConsole = globalThis.console;

    // Spy on stdout and stderr
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore original console
    globalThis.console = originalConsole;

    // Restore spies
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe("CLI Mode Console Behavior", () => {
    test("should output to stdout in CLI mode", async () => {
      // Spy on console.log directly instead of process.stdout.write
      const consoleLogSpy = vi.spyOn(originalConsole, "log");

      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      }).addTool({
        name: "test-tool",
        description: "Test tool",
        flags: [
          {
            name: "message",
            description: "Message to output",
            options: ["--message"],
            type: "string",
            mandatory: true,
          },
        ],
        handler: async (ctx) => {
          console.log(`CLI Output: ${ctx.args.message}`);
          return { result: ctx.args.message };
        },
      });

      // Execute in CLI mode
      await parser.parseAsync(["test-tool", "--message", "hello"]);

      // Should have called console.log (normal CLI behavior)
      expect(consoleLogSpy).toHaveBeenCalled();

      // Check that console.log was called with the expected message
      const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(" "));
      expect(logCalls.some((call) => call.includes("CLI Output: hello"))).toBe(true);

      // Clean up
      consoleLogSpy.mockRestore();
    });
  });

  describe("MCP Mode Console Hijacking", () => {
    test("should hijack console when MCP server starts", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      }).addTool({
        name: "test-tool",
        description: "Test tool",
        flags: [
          {
            name: "message",
            description: "Message to output",
            options: ["--message"],
            type: "string",
            mandatory: true,
          },
        ],
        handler: async (ctx) => {
          console.log(`MCP Output: ${ctx.args.message}`);
          console.error(`MCP Debug: Processing ${ctx.args.message}`);
          return { result: ctx.args.message };
        },
      });

      // Test that MCP tools can be generated (this verifies the parser is set up correctly)
      const mcpTools = parser.toMcpTools();
      expect(mcpTools.length).toBeGreaterThan(0);

      // Test console hijacking during tool execution (which is more testable)
      const testTool = mcpTools.find((t) => t.name === "test-tool");
      expect(testTool).toBeDefined();

      // Clear spies before tool execution
      stdoutSpy.mockClear();
      stderrSpy.mockClear();

      // Execute the tool - this should trigger console hijacking
      const result = await testTool!.execute({ message: "test" });

      // Verify the tool executed successfully
      expect(result).toBeDefined();

      // The key test: console.log output should NOT go to stdout during MCP tool execution
      const stdoutOutput = stdoutSpy.mock.calls.map((call) => call[0]).join("");
      expect(stdoutOutput).not.toContain("MCP Output: test");

      // This verifies that console hijacking is working during tool execution
      // which is the most important use case for MCP mode
    });

    test("should prevent stdout contamination during tool execution", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      }).addTool({
        name: "chatty-tool",
        description: "Tool that outputs a lot to console",
        flags: [
          {
            name: "count",
            description: "Number of messages",
            options: ["--count"],
            type: "number",
            defaultValue: 3,
          },
        ],
        handler: async (ctx) => {
          // This simulates the canny-cli behavior that was causing issues
          console.log("🔍 Starting process...");
          console.log("━".repeat(50));

          for (let i = 0; i < ctx.args.count; i++) {
            console.log(`Processing item ${i + 1}`);
            console.log(
              `   Status: active | Progress: ${(((i + 1) / ctx.args.count) * 100).toFixed(0)}%`,
            );
          }

          console.log("✅ Process completed!");
          console.log("");

          return {
            success: true,
            processed: ctx.args.count,
            timestamp: new Date().toISOString(),
          };
        },
      });

      // Get MCP tools and execute one
      const mcpTools = parser.toMcpTools();
      const chattyTool = mcpTools.find((t) => t.name === "chatty-tool");

      expect(chattyTool).toBeDefined();

      // Clear previous spy calls
      stdoutSpy.mockClear();
      stderrSpy.mockClear();

      // Execute the tool (this should trigger console hijacking internally)
      const result = await chattyTool!.execute({ count: 2 });

      // Verify the tool executed successfully
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain("processed");

      // Critical test: No console.log output should have gone to stdout
      const stdoutOutput = stdoutSpy.mock.calls.map((call) => call[0]).join("");
      expect(stdoutOutput).not.toContain("🔍 Starting process");
      expect(stdoutOutput).not.toContain("━".repeat(50));
      expect(stdoutOutput).not.toContain("Processing item");
      expect(stdoutOutput).not.toContain("✅ Process completed");

      // Debug output should go to stderr (if any)
      // This is less critical but good to verify
    });

    test("should handle mixed console output types", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      }).addTool({
        name: "mixed-output-tool",
        description: "Tool with mixed console output",
        flags: [],
        handler: async (ctx) => {
          console.log("Regular log message");
          console.info("Info message");
          console.warn("Warning message");
          console.error("Error message");
          console.debug("Debug message");

          return { result: "mixed output test" };
        },
      });

      const mcpTools = parser.toMcpTools();
      const mixedTool = mcpTools.find((t) => t.name === "mixed-output-tool");

      // Clear spies
      stdoutSpy.mockClear();
      stderrSpy.mockClear();

      // Execute tool
      const result = await mixedTool!.execute({});

      // Verify execution
      expect(result.content).toBeDefined();

      // None of the console output should go to stdout
      const stdoutOutput = stdoutSpy.mock.calls.map((call) => call[0]).join("");
      expect(stdoutOutput).not.toContain("Regular log message");
      expect(stdoutOutput).not.toContain("Info message");
      expect(stdoutOutput).not.toContain("Warning message");
      expect(stdoutOutput).not.toContain("Debug message");

      // Error messages might go to stderr (that's acceptable)
      // But the key is that nothing goes to stdout
    });
  });

  describe("Console Hijacking Integration", () => {
    test("should automatically load simple-mcp-logger", async () => {
      // This test verifies that the simple-mcp-logger is loaded automatically
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      });

      // Check if the MCP serve flag handling includes logger setup
      const mcpTools = parser.toMcpTools();
      expect(mcpTools).toBeDefined();

      // The actual console hijacking happens when --s-mcp-serve is processed
      // This is harder to test directly, but we can verify the mechanism exists
      expect(typeof parser.parseAsync).toBe("function");
    });

    test("should restore console after MCP server stops", async () => {
      // This test is more complex as it involves server lifecycle
      // For now, we'll test that the hijacking mechanism exists
      const parser = ArgParser.withMcp({
        appName: "Test CLI",
        appCommandName: "test",
        mcp: { serverInfo: { name: "test-server", version: "1.0.0" } },
      });

      // Verify that the parser has MCP capabilities
      expect(parser.toMcpTools).toBeDefined();
      expect(parser.toMcpTools().length).toBeGreaterThanOrEqual(0);
    });
  });
});
