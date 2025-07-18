import { afterEach, beforeEach, describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";
import { ArgParser } from "../../src/index";

describe("DXT Environment Variables Mandatory Behavior", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(__dirname, "temp-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should mark all environment variables as required in user_config regardless of flag mandatory status", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for env var handling",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-env-server",
          version: "1.0.0",
          description: "Test server for env vars",
          author: { name: "Test Author" },
        },
      },
    })
      .addFlags([
        {
          name: "apiKey",
          description: "API key for service",
          options: ["--api-key"],
          type: "string",
          mandatory: false, // Not mandatory as CLI flag
          env: "API_KEY",
        },
        {
          name: "token",
          description: "Authentication token",
          options: ["--token"],
          type: "string",
          mandatory: true, // Mandatory as CLI flag
          env: "AUTH_TOKEN",
        },
        {
          name: "endpoint",
          description: "API endpoint URL",
          options: ["--endpoint"],
          type: "string",
          mandatory: false, // Not mandatory as CLI flag
          env: "API_ENDPOINT",
        },
      ])
      .addTool({
        name: "process",
        description: "Process data",
        flags: [
          {
            name: "secretKey",
            description: "Secret key for processing",
            options: ["--secret-key"],
            type: "string",
            mandatory: false, // Not mandatory as CLI flag
            env: "SECRET_KEY",
          },
        ],
        handler: async (ctx) => ({ processed: true }),
      });

    const dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = (
      dxtGenerator as any
    ).generateEnvAndUserConfig();

    // Verify all environment variables are present
    expect(envVars).toHaveProperty("API_KEY", "${user_config.API_KEY}");
    expect(envVars).toHaveProperty("AUTH_TOKEN", "${user_config.AUTH_TOKEN}");
    expect(envVars).toHaveProperty(
      "API_ENDPOINT",
      "${user_config.API_ENDPOINT}",
    );
    expect(envVars).toHaveProperty("SECRET_KEY", "${user_config.SECRET_KEY}");

    // Verify ALL environment variables are marked as required in user_config
    // regardless of their mandatory status as CLI flags
    expect(userConfig.API_KEY).toHaveProperty("required", true);
    expect(userConfig.AUTH_TOKEN).toHaveProperty("required", true);
    expect(userConfig.API_ENDPOINT).toHaveProperty("required", true);
    expect(userConfig.SECRET_KEY).toHaveProperty("required", true);

    // Verify sensitive fields are marked correctly based on name patterns
    expect(userConfig.API_KEY).toHaveProperty("sensitive", true); // Contains "key"
    expect(userConfig.AUTH_TOKEN).toHaveProperty("sensitive", true); // Contains "auth" and "token"
    expect(userConfig.API_ENDPOINT).toHaveProperty("sensitive", false); // Doesn't match sensitive patterns
    expect(userConfig.SECRET_KEY).toHaveProperty("sensitive", true); // Contains "secret" and "key"

    // Verify proper titles and descriptions
    expect(userConfig.API_KEY).toHaveProperty("title", "Api Key");
    expect(userConfig.AUTH_TOKEN).toHaveProperty("title", "Auth Token");
    expect(userConfig.API_ENDPOINT).toHaveProperty("title", "Api Endpoint");
    expect(userConfig.SECRET_KEY).toHaveProperty("title", "Secret Key");

    expect(userConfig.API_KEY).toHaveProperty(
      "description",
      "API key for service",
    );
    expect(userConfig.AUTH_TOKEN).toHaveProperty(
      "description",
      "Authentication token",
    );
    expect(userConfig.API_ENDPOINT).toHaveProperty(
      "description",
      "API endpoint URL",
    );
    expect(userConfig.SECRET_KEY).toHaveProperty(
      "description",
      "Secret key for processing",
    );
  });

  test("should generate complete DXT manifest with mandatory env vars", async () => {
    const parser = ArgParser.withMcp({
      appName: "Env Test CLI",
      appCommandName: "env-test",
      description: "CLI for testing env var behavior",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "env-test-server",
          version: "1.0.0",
          description: "Test server with env vars",
          author: { name: "Test Author", email: "test@example.com" },
        },
      },
    }).addFlags([
      {
        name: "apiKey",
        description: "API key",
        options: ["--api-key"],
        type: "string",
        mandatory: false, // CLI flag is optional
        env: "API_KEY",
      },
    ]);

    const dxtGenerator = new DxtGenerator(parser);

    // Create a test entry point file
    const entryFile = path.join(tempDir, "test-cli.ts");
    fs.writeFileSync(
      entryFile,
      `
import { ArgParser } from '@alcyone-labs/arg-parser';
const parser = ArgParser.withMcp({
  appName: "Test CLI",
  handler: async () => ({ success: true })
});
parser.parse(process.argv.slice(2));
    `,
    );

    // Generate DXT package
    await dxtGenerator.generateDxtPackage(entryFile, tempDir);

    // Verify manifest was created
    const manifestPath = path.join(
      tempDir,
      "env-test-server-dxt",
      "manifest.json",
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Read and verify manifest content
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Verify user_config has the env var marked as required
    expect(manifest).toHaveProperty("user_config");
    expect(manifest.user_config).toHaveProperty("API_KEY");
    expect(manifest.user_config.API_KEY).toHaveProperty("required", true);
    expect(manifest.user_config.API_KEY).toHaveProperty("sensitive", true);
    expect(manifest.user_config.API_KEY).toHaveProperty("type", "string");
    expect(manifest.user_config.API_KEY).toHaveProperty(
      "description",
      "API key",
    );

    // Verify server env mapping
    expect(manifest.server.mcp_config).toHaveProperty("env");
    expect(manifest.server.mcp_config.env).toHaveProperty(
      "API_KEY",
      "${user_config.API_KEY}",
    );
  });
});
