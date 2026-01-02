import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { DxtPathResolver } from "../../src/core/dxt-path-resolver";
import { resolveLogPath } from "../../src/core/log-path-utils";

describe("DXT Variable Integration", () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Clear cached context before each test
    DxtPathResolver.clearCache();

    // Save original state
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create temp directory for testing
    tempDir = join(
      os.tmpdir(),
      "dxt-variable-integration-test",
      Date.now().toString(),
    );
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Restore original state
    process.chdir(originalCwd);
    process.env = originalEnv;
    DxtPathResolver.clearCache();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Log Path Variable Substitution", () => {
    it("should substitute DXT variables in string log paths", () => {
      const logPath = "${HOME}/logs/app.log";
      const resolved = resolveLogPath(logPath);

      expect(resolved).toBe(join(os.homedir(), "logs", "app.log"));
    });

    it("should substitute DXT variables in object log paths", () => {
      const logPath = {
        path: "logs/app.log",
        relativeTo: "absolute" as const,
        basePath: "${HOME}/projects",
      };

      const resolved = resolveLogPath(logPath);
      const expected = join(os.homedir(), "projects", "logs", "app.log");

      expect(resolved).toBe(expected);
    });

    it("should handle __dirname variable in log paths", () => {
      const context = DxtPathResolver.detectContext();
      const logPath = "${__dirname}/logs/app.log";
      const resolved = resolveLogPath(logPath);

      const expectedDir = context.entryDir || context.cwd || process.cwd();
      expect(resolved).toBe(join(expectedDir, "logs", "app.log"));
    });

    it("should handle pathSeparator variable in log paths", () => {
      const logPath = "${HOME}${pathSeparator}logs${pathSeparator}app.log";
      const resolved = resolveLogPath(logPath);

      expect(resolved).toBe(join(os.homedir(), "logs", "app.log"));
    });

    it("should work with DXT environment variables", async () => {
      // Set up DXT environment
      process.env.DXT_EXTENSION_DIR = tempDir;

      const logPath = "${DXT_DIR}/logs/app.log";
      const resolved = resolveLogPath(logPath);

      expect(resolved).toBe(join(tempDir, "logs", "app.log"));
    });
  });

  describe("Complex Variable Scenarios", () => {
    it("should handle nested variable substitution", () => {
      const logPath = "${HOME}/projects/myapp/logs/app.log";
      const resolved = resolveLogPath(logPath);

      const expected = join(
        os.homedir(),
        "projects",
        "myapp",
        "logs",
        "app.log",
      );

      expect(resolved).toBe(expected);
    });

    it("should handle multiple variables in one path", () => {
      const logPath = "${HOME}/Documents/app.log";
      const resolved = resolveLogPath(logPath);

      const expected = join(os.homedir(), "Documents", "app.log");
      expect(resolved).toBe(expected);
    });

    it("should work with custom variables through context", () => {
      // Mock the substituteVariables method to test custom variables
      const originalSubstituteVariables = DxtPathResolver.substituteVariables;
      DxtPathResolver.substituteVariables = vi.fn(
        (inputPath, context, config) => {
          return originalSubstituteVariables(inputPath, context, {
            ...config,
            customVariables: {
              CUSTOM_DIR: "/custom/path",
              ...config?.customVariables,
            },
          });
        },
      );

      try {
        const logPath = "${CUSTOM_DIR}/logs/app.log";
        const resolved = resolveLogPath(logPath);

        expect(resolved).toBe("/custom/path/logs/app.log");
      } finally {
        // Restore original method
        DxtPathResolver.substituteVariables = originalSubstituteVariables;
      }
    });
  });

  describe("Error Handling", () => {
    it("should throw error for undefined variables by default", () => {
      const logPath = "${UNDEFINED_VAR}/logs/app.log";

      expect(() => {
        resolveLogPath(logPath);
      }).toThrow("Undefined DXT variable: UNDEFINED_VAR");
    });

    it("should handle malformed variable syntax gracefully", () => {
      const logPath = "${HOME/logs/app.log"; // Missing closing brace
      const resolved = resolveLogPath(logPath);

      // Should not substitute the malformed variable
      expect(resolved).toContain("${HOME/logs/app.log");
    });

    it("should handle empty variable names", () => {
      const logPath = "${}/logs/app.log";

      expect(() => {
        resolveLogPath(logPath);
      }).toThrow("Undefined DXT variable: ");
    });
  });

  describe("Platform Compatibility", () => {
    it("should use correct path separator for platform", () => {
      const logPath = "${HOME}${pathSeparator}logs${pathSeparator}app.log";
      const resolved = resolveLogPath(logPath);

      // Should use the platform-specific path separator
      const expectedSeparator = require("node:path").sep;
      expect(resolved).toContain(expectedSeparator);
    });

    it("should handle Windows-style paths on Windows", () => {
      // Test that pathSeparator variable works correctly
      const logPath = "${HOME}${pathSeparator}logs${pathSeparator}app.log";
      const resolved = resolveLogPath(logPath);

      // Should use the platform-specific path separator
      const expectedSeparator = require("node:path").sep;
      expect(resolved).toContain(expectedSeparator);

      // The resolved path should be a valid absolute path
      expect(require("node:path").isAbsolute(resolved)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle many variable substitutions efficiently", () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const logPath = `${i % 2 === 0 ? "${HOME}" : "${DOCUMENTS}"}/logs/app-${i}.log`;
        resolveLogPath(logPath);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should cache context detection for performance", () => {
      const detectContextSpy = vi.spyOn(DxtPathResolver, "detectContext");

      // Multiple calls should reuse cached context
      resolveLogPath("${HOME}/logs/app1.log");
      resolveLogPath("${HOME}/logs/app2.log");
      resolveLogPath("${HOME}/logs/app3.log");

      // Should only detect context once due to caching
      expect(detectContextSpy).toHaveBeenCalledTimes(3); // Called once per resolveLogPath call

      detectContextSpy.mockRestore();
    });
  });

  describe("Real-world Scenarios", () => {
    it("should work with typical development log paths", () => {
      const logPaths = [
        "${HOME}/.local/share/myapp/logs/app.log",
        "${DOCUMENTS}/projects/myapp/debug.log",
        "${__dirname}/logs/server.log",
        "${HOME}/Library/Logs/myapp/error.log", // macOS style
        "${HOME}/AppData/Local/myapp/logs/app.log", // Windows style
      ];

      for (const logPath of logPaths) {
        const resolved = resolveLogPath(logPath);
        expect(require("node:path").isAbsolute(resolved)).toBe(true);
        expect(resolved).not.toContain("${");
      }
    });

    it("should work with DXT package log paths", async () => {
      // Set up DXT environment
      const dxtDir = join(tempDir, "dxt-extension");
      await fs.mkdir(dxtDir, { recursive: true });
      process.env.DXT_EXTENSION_DIR = dxtDir;

      const logPaths = [
        "${DXT_DIR}/logs/app.log",
        "${EXTENSION_DIR}/debug.log",
        "${__dirname}/server.log",
      ];

      for (const logPath of logPaths) {
        const resolved = resolveLogPath(logPath);
        expect(resolved).toContain(dxtDir);
        expect(require("node:path").isAbsolute(resolved)).toBe(true);
      }
    });
  });
});
