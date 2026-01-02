import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArgParser, enableOptionalConfigPluginsAsync } from "../../src";

describe("Working Directory Management - setWorkingDirectory Integration", () => {
  const testDir = path.join(__dirname, "temp-workdir-integration");
  const testDir2 = path.join(__dirname, "temp-workdir-integration2");
  // For relative path test - created at process.cwd() (project root)
  let relativeTestDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Enable optional config plugins for .env loading
    await enableOptionalConfigPluginsAsync();

    // Save original cwd
    originalCwd = process.cwd();

    // Directory for relative path test - at project root
    relativeTestDir = path.join(originalCwd, "temp-workdir-integration");

    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true, force: true });
    }
    if (fs.existsSync(relativeTestDir)) {
      fs.rmSync(relativeTestDir, { recursive: true, force: true });
    }

    // Create test directories
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(testDir2, { recursive: true });
    fs.mkdirSync(relativeTestDir, { recursive: true });
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true, force: true });
    }
    if (fs.existsSync(relativeTestDir)) {
      fs.rmSync(relativeTestDir, { recursive: true, force: true });
    }
  });

  describe("Basic setWorkingDirectory functionality", () => {
    it("should change effective working directory when setWorkingDirectory flag is provided", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({
          cwd: process.cwd(),
          rootPath: ctx.rootPath,
        }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.cwd).toBe(testDir);
      expect(result.rootPath).toBe(originalCwd);
      expect(result.cwd).not.toBe(originalCwd);
    });

    it("should use absolute path for setWorkingDirectory flag", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.cwd).toBe(testDir);
      expect(fs.existsSync(result.cwd)).toBe(true);
    });

    it("should resolve relative path from cwd", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse([
        "--workspace",
        "temp-workdir-integration",
      ]);
      const expectedPath = path.resolve(
        originalCwd,
        "temp-workdir-integration",
      );
      expect(result.cwd).toBe(expectedPath);
    });
  });

  describe("Auto-discovery of .env files", () => {
    it("should auto-discover .env.local when setWorkingDirectory is set and no --s-with-env provided", async () => {
      // Create .env.local file in test directory
      const envPath = path.join(testDir, ".env.local");
      fs.writeFileSync(envPath, "TEST_VAR=from_local\n");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace", "-w"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "testVar",
          options: ["--test-var"],
          type: "string",
        });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.testVar).toBe("from_local");
    });

    it("should prioritize .env.local over .env", async () => {
      // Create multiple env files
      fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
      fs.writeFileSync(path.join(testDir, ".env.local"), "PRIORITY=local\n");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace", "-w"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "priority",
          options: ["--priority"],
          type: "string",
        });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.priority).toBe("local");
    });

    it("should use .env.dev when NODE_ENV=development", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "development";

        // Create env files
        fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
        fs.writeFileSync(path.join(testDir, ".env.dev"), "PRIORITY=dev\n");

        const parser = new ArgParser({
          appName: "Test CLI",
          handler: (ctx) => ctx.args,
        })
          .addFlag({
            name: "workspace",
            options: ["--workspace", "-w"],
            type: "string",
            setWorkingDirectory: true,
          })
          .addFlag({
            name: "priority",
            options: ["--priority"],
            type: "string",
          });

        const result = await parser.parse(["--workspace", testDir]);
        expect(result.priority).toBe("dev");
      } finally {
        // Restore NODE_ENV
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      }
    });

    it("should not auto-discover when setWorkingDirectory is NOT set", async () => {
      // Create .env.local in original cwd (not in testDir)
      const envPath = path.join(originalCwd, ".env.local");
      fs.writeFileSync(envPath, "TEST_VAR=from_cwd\n");

      // Create .env.local in testDir (should NOT be loaded)
      fs.writeFileSync(
        path.join(testDir, ".env.local"),
        "TEST_VAR=from_test_dir\n",
      );

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace", "-w"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "testVar",
          options: ["--test-var"],
          type: "string",
        });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.testVar).toBe("from_test_dir");
    });
  });

  describe("Warning behavior", () => {
    it("should warn when setWorkingDirectory path does not exist", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", "/nonexistent/path"]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("does not exist"),
      );
      expect(result.cwd).toBe(originalCwd); // Falls back to original cwd
      consoleWarnSpy.mockRestore();
    });

    it("should warn when setWorkingDirectory path is not a directory", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // Create a file instead of directory
      const filePath = path.join(testDir, "not-a-directory.txt");
      fs.writeFileSync(filePath, "test content");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", filePath]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("is not a directory"),
      );
      expect(result.cwd).toBe(originalCwd); // Falls back to original cwd
      consoleWarnSpy.mockRestore();
    });
  });

  describe("rootPath in handler context", () => {
    it("should provide rootPath in handler context when setWorkingDirectory is used", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ rootPath: ctx.rootPath }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace", "-w"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.rootPath).toBe(originalCwd);
    });

    it("should provide rootPath when setWorkingDirectory is NOT used", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ rootPath: ctx.rootPath }),
      });

      const result = await parser.parse([]);
      expect(result.rootPath).toBe(originalCwd);
    });
  });

  describe("Env-to-flag binding with auto-discovery", () => {
    it("should load env values into flags with env property via process.env", async () => {
      // Create .env.local file in test directory with an env var
      const envPath = path.join(testDir, ".env.local");
      fs.writeFileSync(envPath, "MY_API_KEY=secret123\n");

      // Clear any existing value
      delete process.env["MY_API_KEY"];

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({
          apiKey: ctx.args.apiKey,
          envValue: process.env["MY_API_KEY"],
        }),
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace", "-w"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "apiKey",
          options: ["--api-key"],
          type: "string",
          env: "MY_API_KEY", // This flag reads from MY_API_KEY env var
        });

      const result = await parser.parse(["--workspace", testDir]);

      // The env var should be loaded into process.env
      expect(result.envValue).toBe("secret123");

      // The flag should pick up the value from process.env via env fallback
      expect(result.apiKey).toBe("secret123");
    });
  });
});
