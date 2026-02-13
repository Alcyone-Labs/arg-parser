import { describe, expect, test } from "vitest";
import { ArgParser } from "../../core/src/index.js";
import { mcpPlugin } from "../src/index.js";

describe("Enhanced MCP Logging Configuration", () => {
  test("should accept log configuration with full options", () => {
    expect(() => {
      new ArgParser({
        appName: "Test Enhanced Logging",
        appCommandName: "test-enhanced-log",
      }).use(mcpPlugin({
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        log: {
          level: "debug",
          logToFile: "./logs/test.log",
          prefix: "TestServer",
          mcpMode: true,
        },
      }));
    }).not.toThrow();
  });

  test("should accept log configuration with simple string", () => {
    expect(() => {
      new ArgParser({
        appName: "Test Simple Logging",
        appCommandName: "test-simple-log",
      }).use(mcpPlugin({
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        log: "./logs/simple.log",
      }));
    }).not.toThrow();
  });

  test("should prioritize log over logPath when both are specified", () => {
    const parser: any = new ArgParser({
      appName: "Test Priority Logging",
      appCommandName: "test-priority-log",
    }).use(mcpPlugin({
      serverInfo: {
        name: "test-server",
        version: "1.0.0",
      },
      log: {
        level: "info",
        logToFile: "./logs/priority-log.log",
        prefix: "PriorityServer",
      },
      logPath: "./logs/priority-logpath.log", // Should be ignored in favor of log
    }));

    const config = parser.getMcpServerConfig();
    expect(config?.log).toBeDefined();
    expect(config?.logPath).toBeDefined();

    if (typeof config?.log === "object") {
      expect(config.log.logToFile).toBe("./logs/priority-log.log");
      expect(config.log.prefix).toBe("PriorityServer");
      expect(config.log.level).toBe("info");
    }
  });

  test("should handle all supported log levels", () => {
    const levels = ["debug", "info", "warn", "error", "silent"];

    levels.forEach((level) => {
      expect(() => {
        new ArgParser({
          appName: `Test ${level} Logging`,
          appCommandName: `test-${level}-log`,
        }).use(mcpPlugin({
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          log: {
            level,
            logToFile: `./logs/${level}.log`,
            prefix: `${level}Server`,
          },
        }));
      }).not.toThrow();
    });
  });

  test("should handle optional properties in log configuration", () => {
    expect(() => {
      new ArgParser({
        appName: "Test Minimal Logging",
        appCommandName: "test-minimal-log",
      }).use(mcpPlugin({
        serverInfo: {
          name: "test-server",
          version: "1.0.0",
        },
        log: {
          logToFile: "./logs/minimal.log",
        },
      }));
    }).not.toThrow();
  });

  test("should merge log and logPath configurations", () => {
    const parser: any = new ArgParser({
      appName: "Test Merged Logging",
      appCommandName: "test-merged-log",
    }).use(mcpPlugin({
      serverInfo: {
        name: "test-server",
        version: "1.0.0",
      },
      log: {
        level: "debug",
        prefix: "MergedServer",
      },
      logPath: {
        path: "./logs/merged.log",
        relativeTo: "entry",
      },
    }));

    const config = parser.getMcpServerConfig();
    expect(config?.log).toBeDefined();
    expect(config?.logPath).toBeDefined();

    if (typeof config?.log === "object") {
      expect(config.log.level).toBe("debug");
      expect(config.log.prefix).toBe("MergedServer");
    }

    if (typeof config?.logPath === "object") {
      expect(config.logPath.path).toBe("./logs/merged.log");
      expect(config.logPath.relativeTo).toBe("entry");
    }
  });
});
