import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ArgParser } from "../../src/core/ArgParser";

describe("Environment Variable Overwrite Integration", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;

  beforeEach(() => {
    // Save original CWD
    originalCwd = process.cwd();
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arg-parser-env-test-"));
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore CWD first
    process.chdir(originalCwd);
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Restore env
    process.env = originalEnv;
  });

  it("should overwrite existing environment variables when auto-discovering .env in working directory", async () => {
    // 1. Set an initial environment variable
    process.env.TEST_OVERWRITE_VAR = "original_value";

    // 2. Create a .env file in the temp directory with a new value
    const envContent = "TEST_OVERWRITE_VAR=new_value";
    fs.writeFileSync(path.join(tempDir, ".env"), envContent);

    // 3. Configure parser with setWorkingDirectory flag
    const parser = new ArgParser({
      appName: "test-app",
      version: "1.0.0",
    });

    parser.addFlag({
      name: "cwd",
      type: "string",
      description: "Set working directory",
      setWorkingDirectory: true,
      options: ["--cwd"], // Added missing options
    });

    parser.addFlag({
      name: "testOverwriteVar",
      type: "string",
      env: "TEST_OVERWRITE_VAR",
      options: ["--test-overwrite-var"],
    });

    // 4. Run parser pointing to the temp directory
    // We do NOT provide --s-with-env, triggering auto-discovery
    await parser.parse(["--cwd", tempDir]);

    // 5. Assert that the environment variable was updated
    // THIS EXPECTATION FAILS without override: true
    expect(process.env.TEST_OVERWRITE_VAR).toBe("new_value");
  });
});
