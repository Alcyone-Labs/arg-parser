import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ArgParser } from "../../src/core/ArgParser";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

describe("Environment Variable Overwrite Integration", () => {
    let tempDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Create a unique temporary directory for each test
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arg-parser-env-test-"));
        // Save original env
        originalEnv = { ...process.env };
    });

    afterEach(() => {
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
            options: ["--cwd"] // Added missing options
        });

        // 4. Run parser pointing to the temp directory
        // We do NOT provide --s-with-env, triggering auto-discovery
        await parser.parse(["--cwd", tempDir]);

        // 5. Assert that the environment variable was updated
        // THIS EXPECTATION FAILS without override: true
        expect(process.env.TEST_OVERWRITE_VAR).toBe("new_value");
    });
});
