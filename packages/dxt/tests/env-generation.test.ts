import { describe, expect, test } from "vitest";
import { ArgParser } from "../../core/src/index.js";
import { mcpPlugin } from "../../mcp/src/index.js";
import { DxtGenerator } from "../src/index.js";

describe("DXT Environment Variable Generation", () => {
  let dxtGenerator: DxtGenerator;

  test("should extract environment variables from main ArgParser flags", () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for env var handling",
      handler: async (ctx) => ({ result: "success" }),
    })
    .use(mcpPlugin({
      serverInfo: {
        name: "test-env-server",
        version: "1.0.0",
        description: "Test server for env vars",
        author: { name: "Test Author" },
      },
    }))
    .addFlags([
      {
        name: "apiKey",
        description: "API key for service",
        options: ["--api-key"],
        type: "string",
        mandatory: false,
        env: "API_KEY",
      },
      {
        name: "token",
        description: "Authentication token",
        options: ["--token"],
        type: "string",
        mandatory: true,
        env: "AUTH_TOKEN",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Verify environment variables mapping
    expect(envVars).toHaveProperty("API_KEY", "${user_config.API_KEY}");
    expect(envVars).toHaveProperty("AUTH_TOKEN", "${user_config.AUTH_TOKEN}");

    // Verify user config properties
    expect(userConfig.API_KEY).toEqual({
      type: "string",
      title: "Api Key",
      description: "API key for service",
      required: false,
      sensitive: true,
      default: undefined,
      min: undefined,
      max: undefined,
      multiple: undefined,
    });

    expect(userConfig.AUTH_TOKEN).toEqual({
      type: "string",
      title: "Auth Token",
      description: "Authentication token",
      required: true,
      sensitive: true,
      default: undefined,
      min: undefined,
      max: undefined,
      multiple: undefined,
    });
  });

  test("should handle flags without environment variables", () => {
    const parser = new ArgParser({
      appName: "No Env CLI",
      appCommandName: "no-env-cli",
    })
    .use(mcpPlugin({
      serverInfo: {
        name: "no-env-server",
        version: "1.0.0",
      },
    }))
    .addFlags([
      {
        name: "regularFlag",
        description: "Regular flag without env",
        options: ["--regular"],
        type: "string",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    expect(Object.keys(envVars)).toHaveLength(0);
    expect(Object.keys(userConfig)).toHaveLength(0);
  });

  test("should handle different flag types with environment variables", () => {
    const parser = new ArgParser({
      appName: "Different Types CLI",
    })
    .use(mcpPlugin({
      serverInfo: {
        name: "different-types-server",
        version: "1.0.0",
      },
    }))
    .addFlags([
      {
        name: "stringFlag",
        description: "String flag with env",
        options: ["--string"],
        type: "string",
        env: "STRING_ENV",
      },
      {
        name: "numberFlag",
        description: "Number flag with env",
        options: ["--number"],
        type: Number,
        env: "NUMBER_ENV",
      },
      {
        name: "booleanFlag",
        description: "Boolean flag with env",
        options: ["--boolean"],
        type: Boolean,
        env: "BOOLEAN_ENV",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    expect(userConfig.STRING_ENV).toHaveProperty("type", "string");
    expect(userConfig.NUMBER_ENV).toHaveProperty("type", "number");
    expect(userConfig.BOOLEAN_ENV).toHaveProperty("type", "boolean");
  });
});
