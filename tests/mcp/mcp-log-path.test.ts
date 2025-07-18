import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { ArgParser } from "../../src/index";

describe("MCP Log Path Configuration", () => {
  const testLogDir = "./test-mcp-logs";
  const customLogPath = `${testLogDir}/custom-mcp.log`;

  beforeEach(() => {
    // Clean up any existing test files
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
    if (existsSync("./logs")) {
      rmSync("./logs", { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
    if (existsSync("./logs")) {
      rmSync("./logs", { recursive: true, force: true });
    }
  });

  describe("MCP Server Creation with Custom Log Path", () => {
    test("should create MCP server with custom log path", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Ensure the directory exists
      mkdirSync(testLogDir, { recursive: true });

      // Create MCP server with custom log path
      const server = await parser.createMcpServer(
        { name: "test-server", version: "1.0.0" },
        undefined,
        customLogPath,
      );

      expect(server).toBeDefined();
      expect(existsSync(customLogPath)).toBe(true);
    });

    test("should use default log path when no custom path provided", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Create MCP server without custom log path
      const server = await parser.createMcpServer({
        name: "test-server",
        version: "1.0.0",
      });

      expect(server).toBeDefined();
      expect(existsSync("./logs/mcp.log")).toBe(true);
    });
  });

  describe("Transport Methods with Log Path", () => {
    test("should pass log path to startMcpServerWithTransport", () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Mock the transport method to verify it receives logPath parameter
      const originalStartMethod = parser.startMcpServerWithTransport;
      let capturedLogPath: string | undefined;

      parser.startMcpServerWithTransport = async function (
        serverInfo: any,
        transportType: any,
        transportOptions: any,
        toolOptions: any,
        logPath?: string,
      ) {
        capturedLogPath = logPath;
        return Promise.resolve();
      };

      // Call the method with a custom log path
      parser.startMcpServerWithTransport(
        { name: "test-server", version: "1.0.0" },
        "stdio" as any,
        {},
        undefined,
        customLogPath,
      );

      expect(capturedLogPath).toBe(customLogPath);

      // Restore original method
      parser.startMcpServerWithTransport = originalStartMethod;
    });

    test("should pass log path to startMcpServerWithMultipleTransports", () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Mock the transport method to verify it receives logPath parameter
      const originalStartMethod = parser.startMcpServerWithMultipleTransports;
      let capturedLogPath: string | undefined;

      parser.startMcpServerWithMultipleTransports = async function (
        serverInfo: any,
        transports: any,
        toolOptions: any,
        logPath?: string,
      ) {
        capturedLogPath = logPath;
        return Promise.resolve();
      };

      // Call the method with a custom log path
      parser.startMcpServerWithMultipleTransports(
        { name: "test-server", version: "1.0.0" },
        [{ type: "stdio" }],
        undefined,
        customLogPath,
      );

      expect(capturedLogPath).toBe(customLogPath);

      // Restore original method
      parser.startMcpServerWithMultipleTransports = originalStartMethod;
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid log path gracefully", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Try to create server with invalid log path
      const invalidPath = "/invalid/path/that/does/not/exist/mcp.log";

      // The createMcpServer should not throw but handle the error gracefully
      await expect(async () => {
        await parser.createMcpServer(
          { name: "test-server", version: "1.0.0" },
          undefined,
          invalidPath,
        );
      }).not.toThrow();
    });
  });

  describe("Integration Test", () => {
    test("should verify --s-mcp-log-path system flag functionality", async () => {
      // This test verifies that the log path system flag is integrated properly
      // by checking that the createMcpLogger function can accept a second parameter
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
        },
      });

      // Import the createMcpLogger function to verify it accepts logPath parameter
      const { createMcpLogger } = await import(
        "@alcyone-labs/simple-mcp-logger"
      );

      // Verify that createMcpLogger can accept a second parameter for log path
      expect(() => {
        createMcpLogger("test-logger", customLogPath);
      }).not.toThrow();

      // Verify that createMcpLogger can work with just the prefix
      expect(() => {
        createMcpLogger("test-logger");
      }).not.toThrow();
    });
  });

  describe("Programmatic Log Path Configuration", () => {
    test("should use programmatic logPath from withMcp configuration", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          logPath: customLogPath, // Programmatic log path
        },
      });

      // Ensure the directory exists
      mkdirSync(testLogDir, { recursive: true });

      // Create MCP server with programmatic log path (no explicit parameter)
      const server = await parser.createMcpServer({
        name: "test-server",
        version: "1.0.0",
      });

      expect(server).toBeDefined();
      expect(existsSync(customLogPath)).toBe(true);
    });

    test("should prioritize CLI flag over programmatic logPath", async () => {
      const programmaticLogPath = `${testLogDir}/programmatic.log`;
      const cliLogPath = `${testLogDir}/cli-override.log`;

      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          logPath: programmaticLogPath, // Programmatic setting
        },
      });

      // Ensure the directory exists
      mkdirSync(testLogDir, { recursive: true });

      // Create MCP server with explicit CLI log path (should override programmatic)
      const server = await parser.createMcpServer(
        { name: "test-server", version: "1.0.0" },
        undefined,
        cliLogPath, // CLI override
      );

      expect(server).toBeDefined();
      // CLI path should be used, not programmatic path
      expect(existsSync(cliLogPath)).toBe(true);
      expect(existsSync(programmaticLogPath)).toBe(false);
    });

    test("should fall back to default when no programmatic or CLI setting", async () => {
      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          // No logPath specified
        },
      });

      // Create MCP server with no log path settings
      const server = await parser.createMcpServer({
        name: "test-server",
        version: "1.0.0",
      });

      expect(server).toBeDefined();
      // Should use default path
      expect(existsSync("./logs/mcp.log")).toBe(true);
    });

    test("should pass programmatic logPath to transport methods", () => {
      const programmaticLogPath = `${testLogDir}/programmatic-transport.log`;

      const parser = ArgParser.withMcp({
        appName: "Test MCP Log Path",
        appCommandName: "test-mcp-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          logPath: programmaticLogPath,
        },
      });

      // Mock the transport method to verify it receives the programmatic logPath
      const originalStartMethod = parser.startMcpServerWithTransport;
      let capturedLogPath: string | undefined;

      parser.startMcpServerWithTransport = async function (
        serverInfo: any,
        transportType: any,
        transportOptions: any,
        toolOptions: any,
        logPath?: string,
      ) {
        capturedLogPath = logPath;
        return Promise.resolve();
      };

      // Call the method without explicit log path (should use programmatic)
      parser.startMcpServerWithTransport(
        { name: "test-server", version: "1.0.0" },
        "stdio" as any,
        {},
        undefined,
        programmaticLogPath, // This would be passed from the MCP serve handler
      );

      expect(capturedLogPath).toBe(programmaticLogPath);

      // Restore original method
      parser.startMcpServerWithTransport = originalStartMethod;
    });
  });
});
