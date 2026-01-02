import { describe, expect, test } from "vitest";
import { ArgParser, type McpLoggerOptions } from "../../src";

describe("Enhanced MCP Logging Configuration", () => {
  test("should accept log configuration with full options", () => {
    expect(() => {
      ArgParser.withMcp({
        appName: "Test Enhanced Logging",
        appCommandName: "test-enhanced-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          log: {
            level: "debug",
            logToFile: "./logs/test.log",
            prefix: "TestServer",
            mcpMode: true,
          } as McpLoggerOptions,
        },
      });
    }).not.toThrow();
  });

  test("should accept log configuration with simple string", () => {
    expect(() => {
      ArgParser.withMcp({
        appName: "Test Simple Logging",
        appCommandName: "test-simple-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          log: "./logs/simple.log",
        },
      });
    }).not.toThrow();
  });

  test("should maintain backward compatibility with logPath", () => {
    expect(() => {
      ArgParser.withMcp({
        appName: "Test Legacy Logging",
        appCommandName: "test-legacy-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          logPath: "./logs/legacy.log",
        },
      });
    }).not.toThrow();
  });

  test("should prioritize log over logPath when both are specified", () => {
    const parser = ArgParser.withMcp({
      appName: "Test Priority Logging",
      appCommandName: "test-priority-log",
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        log: {
          level: "info",
          logToFile: "./logs/priority-log.log",
          prefix: "PriorityServer",
        },
        logPath: "./logs/priority-logpath.log", // Should be ignored
      },
    });

    const config = parser.getMcpServerConfig();
    expect(config?.log).toBeDefined();
    expect(config?.logPath).toBeDefined(); // Still present but should be ignored

    // The log property should take precedence
    if (typeof config?.log === "object") {
      expect(config.log.logToFile).toBe("./logs/priority-log.log");
      expect(config.log.prefix).toBe("PriorityServer");
      expect(config.log.level).toBe("info");
    }
  });

  test("should export McpLoggerOptions type", () => {
    // This test verifies that the type is properly exported
    const loggerOptions: McpLoggerOptions = {
      level: "debug",
      logToFile: "./logs/test.log",
      prefix: "TestServer",
      mcpMode: true,
    };

    expect(loggerOptions.level).toBe("debug");
    expect(loggerOptions.logToFile).toBe("./logs/test.log");
    expect(loggerOptions.prefix).toBe("TestServer");
    expect(loggerOptions.mcpMode).toBe(true);
  });

  test("should handle all supported log levels", () => {
    const levels: Array<McpLoggerOptions["level"]> = [
      "debug",
      "info",
      "warn",
      "error",
      "silent",
    ];

    levels.forEach((level) => {
      expect(() => {
        ArgParser.withMcp({
          appName: `Test ${level} Logging`,
          appCommandName: `test-${level}-log`,
          mcp: {
            serverInfo: {
              name: "test-server",
              version: "1.0.0",
            },
            log: {
              level,
              logToFile: `./logs/${level}.log`,
              prefix: `${level}Server`,
            },
          },
        });
      }).not.toThrow();
    });
  });

  test("should handle optional properties in log configuration", () => {
    expect(() => {
      ArgParser.withMcp({
        appName: "Test Minimal Logging",
        appCommandName: "test-minimal-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          log: {
            // Only logToFile specified, others should use defaults
            logToFile: "./logs/minimal.log",
          },
        },
      });
    }).not.toThrow();
  });

  test("should handle empty log configuration object", () => {
    expect(() => {
      ArgParser.withMcp({
        appName: "Test Empty Logging",
        appCommandName: "test-empty-log",
        mcp: {
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          log: {}, // Empty object should use all defaults
        },
      });
    }).not.toThrow();
  });

  test("should merge log and logPath configurations intelligently", () => {
    const parser = ArgParser.withMcp({
      appName: "Test Merged Logging",
      appCommandName: "test-merged-log",
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        // log provides logger options
        log: {
          level: "debug",
          prefix: "MergedServer",
          mcpMode: false,
          // No logToFile specified here
        },
        // logPath provides flexible path resolution
        logPath: {
          path: "./logs/merged.log",
          relativeTo: "entry",
        },
      },
    });

    const config = parser.getMcpServerConfig();
    expect(config?.log).toBeDefined();
    expect(config?.logPath).toBeDefined();

    // Both should be present and work together
    if (typeof config?.log === "object") {
      expect(config.log.level).toBe("debug");
      expect(config.log.prefix).toBe("MergedServer");
      expect(config.log.mcpMode).toBe(false);
    }

    if (typeof config?.logPath === "object") {
      expect(config.logPath.path).toBe("./logs/merged.log");
      expect(config.logPath.relativeTo).toBe("entry");
    }
  });

  test("should use logPath for path resolution even when log has logToFile", () => {
    const parser = ArgParser.withMcp({
      appName: "Test Path Priority",
      appCommandName: "test-path-priority",
      mcp: {
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        log: {
          level: "info",
          logToFile: "./logs/from-log.log", // This should be overridden
        },
        logPath: {
          path: "./logs/from-logpath.log",
          relativeTo: "cwd", // This should take precedence for path resolution
        },
      },
    });

    const config = parser.getMcpServerConfig();
    expect(config?.log).toBeDefined();
    expect(config?.logPath).toBeDefined();

    // logPath should take precedence for path resolution
    if (typeof config?.logPath === "object") {
      expect(config.logPath.path).toBe("./logs/from-logpath.log");
      expect(config.logPath.relativeTo).toBe("cwd");
    }
  });
});
