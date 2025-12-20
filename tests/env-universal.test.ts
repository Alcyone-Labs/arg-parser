import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ArgParser } from "../src";
import type { IFlag } from "../src";

describe("Universal Env Support", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    const flags: IFlag[] = [
        {
            name: "apiKey",
            description: "API Key",
            options: ["--api-key"],
            type: "string",
            env: ["TEST_API_KEY", "LEGACY_API_KEY"],
        },
        {
            name: "verbose",
            description: "Verbose mode",
            options: ["--verbose"],
            type: "boolean",
            env: "TEST_VERBOSE",
            defaultValue: false,
        },
        {
            name: "count",
            description: "Count",
            options: ["--count"],
            type: "number",
            env: "TEST_COUNT",
            defaultValue: 1,
        },
    ];

    it("should prioritize CLI flag over Env and Default", async () => {
        process.env["TEST_VERBOSE"] = "false";
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);
        
        const result = await parser.parse(["--verbose", "true"], { skipHelpHandling: true });
        expect(result.verbose).toBe(true);
    });

    it("should prioritize Env over Default when Flag is missing", async () => {
        process.env["TEST_COUNT"] = "42";
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);

        const result = await parser.parse([], { skipHelpHandling: true });
        expect(result.count).toBe(42);
    });

    it("should fall back to Default when Flag and Env are missing", async () => {
        delete process.env["TEST_COUNT"];
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);

        const result = await parser.parse([], { skipHelpHandling: true });
        expect(result.count).toBe(1);
    });

    it("should respect Env array priority (first match wins)", async () => {
        process.env["TEST_API_KEY"] = "primary";
        process.env["LEGACY_API_KEY"] = "legacy";
        
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);
        const result = await parser.parse([], { skipHelpHandling: true });
        
        expect(result.apiKey).toBe("primary");
    });

    it("should fallback to secondary env var if primary is missing", async () => {
        delete process.env["TEST_API_KEY"];
        process.env["LEGACY_API_KEY"] = "legacy";
        
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);
        const result = await parser.parse([], { skipHelpHandling: true });
        
        expect(result.apiKey).toBe("legacy");
    });

    it("should sync resolved flag value back to all Env vars (Reverse Sync)", async () => {
        delete process.env["TEST_API_KEY"];
        delete process.env["LEGACY_API_KEY"];
        
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);
        // User provides flag
        await parser.parse(["--api-key", "new-key"], { skipHelpHandling: true });
        
        expect(process.env["TEST_API_KEY"]).toBe("new-key");
        expect(process.env["LEGACY_API_KEY"]).toBe("new-key");
    });

    it("should sync resolved Env value back to other Env vars", async () => {
        process.env["TEST_API_KEY"] = "env-val";
        delete process.env["LEGACY_API_KEY"];
        
        const parser = new ArgParser({ appName: "Test" }).addFlags(flags);
        // Fallback to TEST_API_KEY
        await parser.parse([], { skipHelpHandling: true });
        
        expect(process.env["LEGACY_API_KEY"]).toBe("env-val");
    });
});
