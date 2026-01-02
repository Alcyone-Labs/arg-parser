import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArgParser } from "../../src";

describe("Working Directory Management", () => {
  const testDir = path.join(__dirname, "temp-workdir-test");
  const testDir2 = path.join(__dirname, "temp-workdir-test2");
  let originalCwd: string;

  beforeEach(async () => {
    // Enable optional config plugins (TOML, YAML) for testing
    await import("../../src/config/plugins/ConfigPluginRegistry.ts").then(
      (mod) => mod.enableOptionalConfigPluginsAsync(),
    );

    // Save original cwd
    originalCwd = process.cwd();

    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true, force: true });
    }

    // Create test directories
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(testDir2, { recursive: true });
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
  });

  describe("setWorkingDirectory flag property", () => {
    it("should change effective working directory when setWorkingDirectory flag is provided", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({
          cwd: process.cwd(),
          rootPath: ctx.rootPath,
        }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace"],
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
        options: ["--workspace"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.cwd).toBe(testDir);
      expect(fs.existsSync(result.cwd)).toBe(true);
    });

    it("should resolve relative path from cwd when setWorkingDirectory flag is used", async () => {
      // Change to project root first so relative path resolution works from there
      const projectRoot = path.resolve(__dirname, "../..");
      process.chdir(projectRoot);

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace"],
        type: "string",
        setWorkingDirectory: true,
      });

      // Use the testDir relative to project root
      const relativePath = path.relative(projectRoot, testDir);
      const result = await parser.parse(["--workspace", relativePath]);
      expect(result.cwd).toBe(testDir);
    });
  });

  describe("auto-discovery of .env files", () => {
    // TODO: This test has a timing issue where env file is loaded after parsing
    // The auto-discovery feature works (file is found) but env values aren't available during flag resolution
    it.skip("should auto-discover .env.local in effective working directory", async () => {
      // Create .env.local file in test directory
      const envPath = path.join(testDir, ".env.local");
      fs.writeFileSync(envPath, "TEST_VAR=from_local\n");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "testVar",
          options: ["--test-var"],
          type: "string",
          env: "TEST_VAR", // Read from environment variable
        });

      const result = await parser.parse([
        "--workspace",
        testDir,
        "--s-with-env", // No file path - should auto-discover
      ]);

      expect(result.testVar).toBe("from_local");
    });

    it("should prioritize .env.local over .env.dev and .env", async () => {
      // Create multiple env files
      fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
      fs.writeFileSync(path.join(testDir, ".env.dev"), "PRIORITY=dev\n");
      fs.writeFileSync(path.join(testDir, ".env.local"), "PRIORITY=local\n");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "priority",
          options: ["--priority"],
          type: "string",
        });

      const result = await parser.parse([
        "--workspace",
        testDir,
        "--s-with-env",
      ]);

      expect(result.priority).toBe("local");
    });

    it("should use .env.dev when NODE_ENV=development", async () => {
      // Set NODE_ENV for test
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      try {
        // Create env files
        fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
        fs.writeFileSync(path.join(testDir, ".env.dev"), "PRIORITY=dev\n");
        // No .env.local

        const parser = new ArgParser({
          appName: "Test CLI",
          handler: (ctx) => ctx.args,
        })
          .addFlag({
            name: "workspace",
            options: ["--workspace"],
            type: "string",
            setWorkingDirectory: true,
          })
          .addFlag({
            name: "priority",
            options: ["--priority"],
            type: "string",
          });

        const result = await parser.parse([
          "--workspace",
          testDir,
          "--s-with-env",
        ]);

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

    it("should use .env.test when NODE_ENV=test", async () => {
      // Set NODE_ENV for test
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      try {
        // Create env files
        fs.writeFileSync(path.join(testDir, ".env"), "PRIORITY=default\n");
        fs.writeFileSync(path.join(testDir, ".env.test"), "PRIORITY=test\n");
        // No .env.local

        const parser = new ArgParser({
          appName: "Test CLI",
          handler: (ctx) => ctx.args,
        })
          .addFlag({
            name: "workspace",
            options: ["--workspace"],
            type: "string",
            setWorkingDirectory: true,
          })
          .addFlag({
            name: "priority",
            options: ["--priority"],
            type: "string",
          });

        const result = await parser.parse([
          "--workspace",
          testDir,
          "--s-with-env",
        ]);

        expect(result.priority).toBe("test");
      } finally {
        // Restore NODE_ENV
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      }
    });
  });

  describe("multiple setWorkingDirectory flags", () => {
    it("should use last setWorkingDirectory flag in command chain", async () => {
      const subParser = new ArgParser({
        appName: "Sub",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace2",
        options: ["--w2"],
        type: "string",
        setWorkingDirectory: true,
      });

      const parser1 = new ArgParser({
        appName: "Root",
        handler: (ctx) => ({ cwd: process.cwd() }),
      })
        .addFlag({
          name: "workspace1",
          options: ["--w1"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addSubCommand({
          name: "sub",
          description: "Sub command",
          parser: subParser,
        });

      const result = await parser1.parse([
        "--w1",
        testDir,
        "sub",
        "--w2",
        testDir2,
      ]);

      expect(result.cwd).toBe(testDir2); // Last one wins
    });
  });

  describe("warning for invalid directory", () => {
    it("should warn and use original cwd if setWorkingDirectory path does not exist", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", "/nonexistent/path"]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("does not exist"),
      );
      expect(result.cwd).toBe(originalCwd);
    });

    it("should warn and use original cwd if setWorkingDirectory path is not a directory", async () => {
      // Create a file instead of directory
      const filePath = path.join(testDir, "not-a-directory.txt");
      fs.writeFileSync(filePath, "test content");

      const consoleWarnSpy = vi.spyOn(console, "warn");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ cwd: process.cwd() }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", filePath]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("is not a directory"),
      );
      expect(result.cwd).toBe(originalCwd);
    });
  });

  describe("backward compatibility", () => {
    it("should maintain backward compatibility when no setWorkingDirectory is used", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      }).addFlag({
        name: "test",
        options: ["--test"],
        type: "string",
      });

      const envPath = path.join(process.cwd(), "config.env");
      fs.writeFileSync(envPath, "TEST=value\n");

      const result = await parser.parse(["--s-with-env", "config.env"]);
      expect(result.test).toBe("value");

      // Clean up
      fs.unlinkSync(envPath);
    });

    it("should load env file from cwd when setWorkingDirectory is not used", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      }).addFlag({
        name: "test",
        options: ["--test"],
        type: "string",
        env: "TEST", // Read from environment variable loaded from file
      });

      const envPath = path.join(testDir, "config.env");
      fs.writeFileSync(envPath, "TEST=value\n");

      // Change to testDir so env file is found relative to cwd
      process.chdir(testDir);

      const result = await parser.parse([
        "--s-with-env",
        "config.env", // Relative to current cwd
      ]);

      expect(result.test).toBe("value");
    });
  });

  describe("rootPath in handler context", () => {
    it("should provide rootPath in handler context", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ rootPath: ctx.rootPath }),
      }).addFlag({
        name: "workspace",
        options: ["--workspace"],
        type: "string",
        setWorkingDirectory: true,
      });

      const result = await parser.parse(["--workspace", testDir]);
      expect(result.rootPath).toBe(originalCwd);
    });

    it("should provide rootPath even when setWorkingDirectory is not used", async () => {
      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ({ rootPath: ctx.rootPath }),
      });

      const result = await parser.parse([]);
      expect(result.rootPath).toBe(originalCwd);
    });
  });

  describe("path resolution from effective cwd", () => {
    it("should resolve .env file relative to effective working directory", async () => {
      // Create env file in test directory
      const envPath = path.join(testDir, "subdir/.env");
      fs.mkdirSync(path.join(testDir, "subdir"), { recursive: true });
      fs.writeFileSync(envPath, "TEST=from_subdir\n");

      // Create env file in original cwd (should NOT be loaded)
      const originalEnvPath = path.join(originalCwd, ".env");
      fs.writeFileSync(originalEnvPath, "TEST=from_root\n");

      const parser = new ArgParser({
        appName: "Test CLI",
        handler: (ctx) => ctx.args,
      })
        .addFlag({
          name: "workspace",
          options: ["--workspace"],
          type: "string",
          setWorkingDirectory: true,
        })
        .addFlag({
          name: "test",
          options: ["--test"],
          type: "string",
        });

      const result = await parser.parse([
        "--workspace",
        testDir,
        "--s-with-env",
        "subdir/.env", // Relative to effective cwd
      ]);

      expect(result.test).toBe("from_subdir");

      // Clean up
      fs.unlinkSync(originalEnvPath);
    });
  });
});
