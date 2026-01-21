import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { DxtPathResolver, type IPathContext } from "../../src/core/dxt-path-resolver";

describe("DxtPathResolver", () => {
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
    tempDir = join(os.tmpdir(), "dxt-path-resolver-test", Date.now().toString());
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

  describe("Context Detection", () => {
    it("should detect non-DXT environment by default", () => {
      const context = DxtPathResolver.detectContext();

      expect(context.isDxt).toBe(false);
      expect(context.userHome).toBe(os.homedir());
      expect(context.cwd).toBe(process.cwd());
    });

    it("should detect DXT environment from environment variable", () => {
      process.env.DXT_EXTENSION_DIR = "/path/to/extension";

      const context = DxtPathResolver.detectContext(true); // Force refresh

      expect(context.isDxt).toBe(true);
      expect(context.extensionDir).toBe("/path/to/extension");
    });

    it("should detect DXT environment from manifest.json", async () => {
      // Create a DXT manifest.json
      const manifestPath = join(tempDir, "manifest.json");
      const manifest = {
        id: "test-dxt",
        name: "Test DXT",
        version: "1.0.0",
        server: { command: "node", args: ["index.js"] },
        user_config: {},
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      // Change to temp directory
      process.chdir(tempDir);

      const context = DxtPathResolver.detectContext(true);

      expect(context.isDxt).toBe(true);
    });

    it("should not detect DXT from invalid manifest.json", async () => {
      // Create an invalid manifest.json
      const manifestPath = join(tempDir, "manifest.json");
      await fs.writeFile(manifestPath, JSON.stringify({ invalid: true }));

      process.chdir(tempDir);

      const context = DxtPathResolver.detectContext(true);

      expect(context.isDxt).toBe(false);
    });

    it("should cache context and reuse it", () => {
      const context1 = DxtPathResolver.detectContext();
      const context2 = DxtPathResolver.detectContext();

      expect(context1).toBe(context2); // Same object reference
    });

    it("should refresh context when forced", () => {
      const context1 = DxtPathResolver.detectContext();
      const context2 = DxtPathResolver.detectContext(true);

      expect(context1).not.toBe(context2); // Different object references
    });
  });

  describe("Variable Substitution", () => {
    it("should substitute standard variables", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.substituteVariables(
        "${HOME}/documents/${pathSeparator}file.txt",
        context,
      );

      expect(result).toBe(`/home/user/documents/${require("node:path").sep}file.txt`);
    });

    it("should substitute __dirname based on context", () => {
      const context: IPathContext = {
        isDxt: true,
        extensionDir: "/extension/dir",
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.substituteVariables("${__dirname}/config.json", context);

      expect(result).toBe("/extension/dir/config.json");
    });

    it("should substitute DXT-specific variables", () => {
      const context: IPathContext = {
        isDxt: true,
        extensionDir: "/extension/dir",
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.substituteVariables("${DXT_DIR}/data", context);

      expect(result).toBe("/extension/dir/data");
    });

    it("should use custom variables", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.substituteVariables("${CUSTOM_VAR}/file.txt", context, {
        customVariables: { CUSTOM_VAR: "/custom/path" },
      });

      expect(result).toBe("/custom/path/file.txt");
    });

    it("should throw error for undefined variables", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      expect(() => {
        DxtPathResolver.substituteVariables("${UNDEFINED_VAR}/file.txt", context);
      }).toThrow("Undefined DXT variable: UNDEFINED_VAR");
    });

    it("should allow undefined variables when configured", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.substituteVariables("${UNDEFINED_VAR}/file.txt", context, {
        allowUndefined: true,
      });

      expect(result).toBe("${UNDEFINED_VAR}/file.txt");
    });
  });

  describe("Path Resolution", () => {
    it("should resolve absolute paths as-is", () => {
      const result = DxtPathResolver.resolvePath("/absolute/path/file.txt");
      expect(result).toBe("/absolute/path/file.txt");
    });

    it("should resolve relative paths in non-DXT context", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
        entryDir: "/entry/dir",
      };

      const result = DxtPathResolver.resolvePath("relative/file.txt", context);
      expect(result).toBe("/entry/dir/relative/file.txt");
    });

    it("should resolve relative paths in DXT context", () => {
      const context: IPathContext = {
        isDxt: true,
        extensionDir: "/extension/dir",
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const result = DxtPathResolver.resolvePath("relative/file.txt", context);
      expect(result).toBe("/extension/dir/relative/file.txt");
    });

    it("should resolve paths with variable substitution", () => {
      const context: IPathContext = {
        isDxt: false,
        userHome: "/home/user",
        cwd: "/current/dir",
        entryDir: "/entry/dir",
      };

      const result = DxtPathResolver.resolvePath("${HOME}/documents/file.txt", context);
      expect(result).toBe("/home/user/documents/file.txt");
    });
  });

  describe("Helper Functions", () => {
    describe("createUserDataPath", () => {
      it("should create user data path in non-DXT context", () => {
        const context: IPathContext = {
          isDxt: false,
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createUserDataPath("data.json", context);

        // Should use XDG data directory or fallback
        const expected = process.env.XDG_DATA_HOME
          ? `${process.env.XDG_DATA_HOME}/argparser-app/data.json`
          : "/home/user/.local/share/argparser-app/data.json";
        expect(result).toBe(expected);
      });

      it("should create user data path in DXT context", () => {
        const context: IPathContext = {
          isDxt: true,
          extensionDir: "/extension/dir",
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createUserDataPath("data.json", context);
        expect(result).toBe("/extension/dir/data/data.json");
      });
    });

    describe("createTempPath", () => {
      it("should create temp path in non-DXT context", () => {
        const context: IPathContext = {
          isDxt: false,
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createTempPath("temp.txt", context);
        expect(result).toBe(`${os.tmpdir()}/argparser-app/temp.txt`);
      });

      it("should create temp path in DXT context", () => {
        const context: IPathContext = {
          isDxt: true,
          extensionDir: "/extension/dir",
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createTempPath("temp.txt", context);
        expect(result).toBe("/extension/dir/temp/temp.txt");
      });
    });

    describe("createConfigPath", () => {
      it("should create config path in non-DXT context", () => {
        const context: IPathContext = {
          isDxt: false,
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createConfigPath("config.json", context);

        const expected = process.env.XDG_CONFIG_HOME
          ? `${process.env.XDG_CONFIG_HOME}/argparser-app/config.json`
          : "/home/user/.config/argparser-app/config.json";
        expect(result).toBe(expected);
      });

      it("should create config path in DXT context", () => {
        const context: IPathContext = {
          isDxt: true,
          extensionDir: "/extension/dir",
          userHome: "/home/user",
          cwd: "/current/dir",
        };

        const result = DxtPathResolver.createConfigPath("config.json", context);
        expect(result).toBe("/extension/dir/config/config.json");
      });
    });
  });

  describe("Directory Management", () => {
    it("should ensure directory exists", async () => {
      const testDir = join(tempDir, "test", "nested", "dir");

      const result = DxtPathResolver.ensureDirectory(testDir);

      expect(result).toBe(true);

      // Verify directory was created
      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should handle existing directory", async () => {
      const testDir = join(tempDir, "existing");
      await fs.mkdir(testDir);

      const result = DxtPathResolver.ensureDirectory(testDir);

      expect(result).toBe(true);
    });

    it("should handle permission errors gracefully", () => {
      // Mock fs.mkdirSync to throw an error
      const originalMkdirSync = require("node:fs").mkdirSync;
      const mockMkdirSync = vi.fn(() => {
        throw new Error("Permission denied");
      });
      require("node:fs").mkdirSync = mockMkdirSync;

      const result = DxtPathResolver.ensureDirectory("/invalid/path");

      expect(result).toBe(false);

      // Restore original function
      require("node:fs").mkdirSync = originalMkdirSync;
    });
  });

  describe("Integration Tests", () => {
    it("should work end-to-end with real context detection", () => {
      // This test uses actual context detection
      const userDataPath = DxtPathResolver.createUserDataPath("test.json");
      const tempPath = DxtPathResolver.createTempPath("temp.txt");
      const configPath = DxtPathResolver.createConfigPath("config.json");

      // All paths should be absolute
      expect(require("node:path").isAbsolute(userDataPath)).toBe(true);
      expect(require("node:path").isAbsolute(tempPath)).toBe(true);
      expect(require("node:path").isAbsolute(configPath)).toBe(true);

      // Paths should contain the filename
      expect(userDataPath).toContain("test.json");
      expect(tempPath).toContain("temp.txt");
      expect(configPath).toContain("config.json");
    });

    it("should handle complex variable substitution scenarios", () => {
      const context: IPathContext = {
        isDxt: true,
        extensionDir: "/ext/dir",
        userHome: "/home/user",
        cwd: "/current/dir",
      };

      const complexPath = "${DXT_DIR}/data${HOME}/config/${pathSeparator}file.txt";
      const result = DxtPathResolver.resolvePath(complexPath, context);

      expect(result).toBe(`/ext/dir/data/home/user/config/${require("node:path").sep}file.txt`);
    });
  });
});
