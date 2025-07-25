import { beforeEach, describe, expect, test } from "vitest";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";
import { ArgParser } from "../../src/index";

describe("DXT Environment Variable Generation", () => {
  let dxtGenerator: DxtGenerator;

  beforeEach(() => {
    // Fresh instance for each test to avoid cross-contamination
  });

  test("should extract environment variables from main ArgParser flags", () => {
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
    }).addFlags([
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
      title: "API KEY",
      description: "API key for service",
      required: false, // Not mandatory by default for top-level flags
      sensitive: true, // Sensitive because tied to ENV
    });

    expect(userConfig.AUTH_TOKEN).toEqual({
      type: "string",
      title: "AUTH TOKEN",
      description: "Authentication token",
      required: true, // Mandatory because flag has mandatory: true
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should extract environment variables from unified tool flags", () => {
    const parser = ArgParser.withMcp({
      appName: "Test CLI",
      appCommandName: "test-cli",
      description: "Test CLI for tool env vars",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "test-tool-server",
          version: "1.0.0",
          description: "Test server for tool env vars",
        },
      },
    }).addTool({
      name: "process",
      description: "Process data",
      flags: [
        {
          name: "secretKey",
          description: "Secret key for processing",
          options: ["--secret-key"],
          type: "string",
          mandatory: false,
          env: "SECRET_KEY",
        },
        {
          name: "dbPassword",
          description: "Database password",
          options: ["--db-password"],
          type: "string",
          mandatory: true,
          env: "DB_PASSWORD",
        },
      ],
      handler: async (ctx) => ({ processed: true }),
    });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Verify environment variables mapping
    expect(envVars).toHaveProperty("SECRET_KEY", "${user_config.SECRET_KEY}");
    expect(envVars).toHaveProperty("DB_PASSWORD", "${user_config.DB_PASSWORD}");

    // Verify user config properties
    expect(userConfig.SECRET_KEY).toEqual({
      type: "string",
      title: "SECRET KEY",
      description: "Secret key for processing",
      required: false, // Not mandatory in the flag definition
      sensitive: true, // Sensitive because tied to ENV
    });

    expect(userConfig.DB_PASSWORD).toEqual({
      type: "string",
      title: "DB PASSWORD",
      description: "Database password",
      required: true, // Mandatory in the flag definition
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should handle mixed main flags and tool flags without duplication", () => {
    const parser = ArgParser.withMcp({
      appName: "Mixed Test CLI",
      appCommandName: "mixed-cli",
      description: "CLI with both main and tool env vars",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "mixed-server",
          version: "1.0.0",
          description: "Mixed env var server",
        },
      },
    })
      .addFlags([
        {
          name: "mainApiKey",
          description: "Main API key",
          options: ["--main-api-key"],
          type: "string",
          env: "MAIN_API_KEY",
        },
        {
          name: "sharedVar",
          description: "Shared variable from main",
          options: ["--shared"],
          type: "string",
          env: "SHARED_VAR",
        },
      ])
      .addTool({
        name: "tool1",
        description: "Tool with env vars",
        flags: [
          {
            name: "toolSecret",
            description: "Tool secret",
            options: ["--tool-secret"],
            type: "string",
            env: "TOOL_SECRET",
          },
          {
            name: "duplicateVar",
            description: "This should not override main flag",
            options: ["--duplicate"],
            type: "string",
            env: "SHARED_VAR", // Same as main flag
          },
        ],
        handler: async (ctx) => ({ result: "tool1" }),
      });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should have all three unique env vars
    expect(Object.keys(envVars)).toHaveLength(3);
    expect(envVars).toHaveProperty(
      "MAIN_API_KEY",
      "${user_config.MAIN_API_KEY}",
    );
    expect(envVars).toHaveProperty("SHARED_VAR", "${user_config.SHARED_VAR}");
    expect(envVars).toHaveProperty("TOOL_SECRET", "${user_config.TOOL_SECRET}");

    // Should have all three in user config
    expect(Object.keys(userConfig)).toHaveLength(3);

    // Main flag should take precedence for SHARED_VAR
    expect(userConfig.SHARED_VAR).toEqual({
      type: "string",
      title: "SHARED VAR",
      description: "Shared variable from main",
      required: false, // Not mandatory by default for top-level flags
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should handle flags without environment variables", () => {
    const parser = ArgParser.withMcp({
      appName: "No Env CLI",
      appCommandName: "no-env-cli",
      description: "CLI without env vars",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "no-env-server",
          version: "1.0.0",
          description: "Server without env vars",
        },
      },
    }).addFlags([
      {
        name: "regularFlag",
        description: "Regular flag without env",
        options: ["--regular"],
        type: "string",
      },
      {
        name: "anotherFlag",
        description: "Another regular flag",
        options: ["--another"],
        type: "boolean",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should have no environment variables
    expect(Object.keys(envVars)).toHaveLength(0);
    expect(Object.keys(userConfig)).toHaveLength(0);
  });

  test("should use flag description in user config", () => {
    const parser = ArgParser.withMcp({
      appName: "Fallback Test CLI",
      appCommandName: "fallback-cli",
      description: "CLI to test fallback descriptions",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "fallback-server",
          version: "1.0.0",
          description: "Server for fallback tests",
        },
      },
    }).addFlags([
      {
        name: "noDescFlag",
        description: "Flag with description",
        options: ["--no-desc"],
        type: "string",
        env: "NO_DESC_VAR",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    expect(userConfig.NO_DESC_VAR).toEqual({
      type: "string",
      title: "NO DESC VAR",
      description: "Flag with description",
      required: false, // Not mandatory by default for top-level flags
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should handle complex environment variable names", () => {
    const parser = ArgParser.withMcp({
      appName: "Complex Env CLI",
      appCommandName: "complex-env",
      description: "CLI with complex env var names",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "complex-env-server",
          version: "1.0.0",
          description: "Server with complex env vars",
        },
      },
    }).addFlags([
      {
        name: "complexVar",
        description: "Variable with complex name",
        options: ["--complex"],
        type: "string",
        env: "MY_APP_API_KEY_V2_PRODUCTION",
      },
      {
        name: "singleWord",
        description: "Single word env var",
        options: ["--single"],
        type: "string",
        env: "TOKEN",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Verify complex name formatting
    expect(userConfig.MY_APP_API_KEY_V2_PRODUCTION).toEqual({
      type: "string",
      title: "MY APP API KEY V2 PRODUCTION",
      description: "Variable with complex name",
      required: false, // Not mandatory by default for top-level flags
      sensitive: true, // Sensitive because tied to ENV
    });

    // Verify simple name formatting
    expect(userConfig.TOKEN).toEqual({
      type: "string",
      title: "TOKEN",
      description: "Single word env var",
      required: false, // Not mandatory by default for top-level flags
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should respect flag mandatory setting and mark env vars as sensitive", () => {
    const parser = ArgParser.withMcp({
      appName: "Required Test CLI",
      appCommandName: "required-test",
      description: "CLI to test required behavior",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "required-test-server",
          version: "1.0.0",
          description: "Server for required tests",
        },
      },
    }).addFlags([
      {
        name: "optionalFlag",
        description: "Optional CLI flag",
        options: ["--optional"],
        type: "string",
        mandatory: false, // Not mandatory as CLI flag
        env: "OPTIONAL_ENV",
      },
      {
        name: "mandatoryFlag",
        description: "Mandatory CLI flag",
        options: ["--mandatory"],
        type: "string",
        mandatory: true, // Mandatory as CLI flag
        env: "MANDATORY_ENV",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Optional flag should not be required in user_config but should be sensitive (tied to ENV)
    expect(userConfig.OPTIONAL_ENV).toHaveProperty("required", false);
    expect(userConfig.OPTIONAL_ENV).toHaveProperty("sensitive", true);

    // Mandatory flag should be required in user_config and sensitive (tied to ENV)
    expect(userConfig.MANDATORY_ENV).toHaveProperty("required", true);
    expect(userConfig.MANDATORY_ENV).toHaveProperty("sensitive", true);
  });

  test("should detect sensitive environment variables based on naming patterns", () => {
    const parser = ArgParser.withMcp({
      appName: "Sensitivity Test CLI",
      appCommandName: "sensitivity-test",
      description: "CLI to test sensitivity detection",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "sensitivity-test-server",
          version: "1.0.0",
          description: "Server for sensitivity tests",
        },
      },
    }).addFlags([
      {
        name: "apiKey",
        description: "API key",
        options: ["--api-key"],
        type: "string",
        env: "API_KEY",
      },
      {
        name: "authToken",
        description: "Authentication token",
        options: ["--auth-token"],
        type: "string",
        env: "AUTH_TOKEN",
      },
      {
        name: "secretValue",
        description: "Secret value",
        options: ["--secret"],
        type: "string",
        env: "SECRET_VALUE",
      },
      {
        name: "password",
        description: "User password",
        options: ["--password"],
        type: "string",
        env: "USER_PASSWORD",
      },
      {
        name: "regularConfig",
        description: "Regular configuration",
        options: ["--config"],
        type: "string",
        env: "CONFIG_URL",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // All environment variables should be marked as sensitive for security
    expect(userConfig.API_KEY).toHaveProperty("sensitive", true);
    expect(userConfig.AUTH_TOKEN).toHaveProperty("sensitive", true);
    expect(userConfig.SECRET_VALUE).toHaveProperty("sensitive", true);
    expect(userConfig.USER_PASSWORD).toHaveProperty("sensitive", true);
    expect(userConfig.CONFIG_URL).toHaveProperty("sensitive", true);

    // Verify all are not required by default (top-level flags default to non-mandatory)
    expect(userConfig.API_KEY).toHaveProperty("required", false);
    expect(userConfig.AUTH_TOKEN).toHaveProperty("required", false);
    expect(userConfig.SECRET_VALUE).toHaveProperty("required", false);
    expect(userConfig.USER_PASSWORD).toHaveProperty("required", false);
    expect(userConfig.CONFIG_URL).toHaveProperty("required", false);
  });

  test("should handle tools with no flags", () => {
    const parser = ArgParser.withMcp({
      appName: "No Flags Tool CLI",
      appCommandName: "no-flags-tool",
      description: "CLI with tool that has no flags",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "no-flags-tool-server",
          version: "1.0.0",
          description: "Server with no-flag tools",
        },
      },
    }).addTool({
      name: "simple-tool",
      description: "Tool without any flags",
      flags: [],
      handler: async (ctx) => ({ result: "simple" }),
    });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should have no environment variables from tools without flags
    expect(Object.keys(envVars)).toHaveLength(0);
    expect(Object.keys(userConfig)).toHaveLength(0);
  });

  test("should handle multiple tools with same environment variable names", () => {
    const parser = ArgParser.withMcp({
      appName: "Multi Tool CLI",
      appCommandName: "multi-tool",
      description: "CLI with multiple tools sharing env vars",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "multi-tool-server",
          version: "1.0.0",
          description: "Server with multiple tools",
        },
      },
    })
      .addTool({
        name: "tool1",
        description: "First tool",
        flags: [
          {
            name: "apiKey1",
            description: "API key for tool1",
            options: ["--api-key-1"],
            type: "string",
            env: "SHARED_API_KEY",
          },
        ],
        handler: async (ctx) => ({ result: "tool1" }),
      })
      .addTool({
        name: "tool2",
        description: "Second tool",
        flags: [
          {
            name: "apiKey2",
            description: "API key for tool2 (should be ignored)",
            options: ["--api-key-2"],
            type: "string",
            env: "SHARED_API_KEY", // Same env var name
          },
        ],
        handler: async (ctx) => ({ result: "tool2" }),
      });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should only have one entry for the shared env var
    expect(Object.keys(envVars)).toHaveLength(1);
    expect(Object.keys(userConfig)).toHaveLength(1);
    expect(envVars).toHaveProperty(
      "SHARED_API_KEY",
      "${user_config.SHARED_API_KEY}",
    );

    // First tool's description should be used (first wins)
    expect(userConfig.SHARED_API_KEY).toEqual({
      type: "string",
      title: "SHARED API KEY",
      description: "API key for tool1",
      required: false, // Not mandatory by default for tool flags
      sensitive: true, // Sensitive because tied to ENV
    });
  });

  test("should handle different flag types with environment variables", () => {
    const parser = ArgParser.withMcp({
      appName: "Different Types CLI",
      appCommandName: "different-types",
      description: "CLI with different flag types",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "different-types-server",
          version: "1.0.0",
          description: "Server with different flag types",
        },
      },
    }).addFlags([
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
        type: "number",
        env: "NUMBER_ENV",
      },
      {
        name: "booleanFlag",
        description: "Boolean flag with env",
        options: ["--boolean"],
        type: "boolean",
        env: "BOOLEAN_ENV",
      },
    ]);

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // All should be treated as string type in user_config regardless of original type
    expect(userConfig.STRING_ENV).toHaveProperty("type", "string");
    expect(userConfig.NUMBER_ENV).toHaveProperty("type", "string");
    expect(userConfig.BOOLEAN_ENV).toHaveProperty("type", "string");

    // All should have proper descriptions
    expect(userConfig.STRING_ENV).toHaveProperty(
      "description",
      "String flag with env",
    );
    expect(userConfig.NUMBER_ENV).toHaveProperty(
      "description",
      "Number flag with env",
    );
    expect(userConfig.BOOLEAN_ENV).toHaveProperty(
      "description",
      "Boolean flag with env",
    );
  });

  test("should handle empty parser with no flags or tools", () => {
    const parser = ArgParser.withMcp({
      appName: "Empty CLI",
      appCommandName: "empty",
      description: "CLI with no flags or tools",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "empty-server",
          version: "1.0.0",
          description: "Empty server",
        },
      },
    });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should have no environment variables
    expect(Object.keys(envVars)).toHaveLength(0);
    expect(Object.keys(userConfig)).toHaveLength(0);
    expect(envVars).toEqual({});
    expect(userConfig).toEqual({});
  });

  test("should demonstrate new behavior: respect mandatory flags and mark env vars as sensitive", () => {
    const parser = ArgParser.withMcp({
      appName: "New Behavior Demo CLI",
      appCommandName: "demo-cli",
      description: "CLI to demonstrate new DXT behavior",
      handler: async (ctx) => ({ result: "success" }),
      mcp: {
        serverInfo: {
          name: "demo-server",
          version: "1.0.0",
          description: "Demo server",
        },
      },
    })
      .addFlags([
        {
          name: "optionalEnvFlag",
          description: "Optional flag with env var",
          options: ["--optional-env"],
          type: "string",
          mandatory: false, // Not mandatory
          env: "OPTIONAL_ENV_VAR",
        },
        {
          name: "mandatoryEnvFlag",
          description: "Mandatory flag with env var",
          options: ["--mandatory-env"],
          type: "string",
          mandatory: true, // Mandatory
          env: "MANDATORY_ENV_VAR",
        },
        {
          name: "noEnvFlag",
          description: "Flag without env var",
          options: ["--no-env"],
          type: "string",
          mandatory: true, // Mandatory but no env var
        },
      ])
      .addTool({
        name: "demo-tool",
        description: "Demo tool",
        flags: [
          {
            name: "toolOptionalEnv",
            description: "Tool optional flag with env",
            options: ["--tool-optional"],
            type: "string",
            mandatory: false,
            env: "TOOL_OPTIONAL_ENV",
          },
          {
            name: "toolMandatoryEnv",
            description: "Tool mandatory flag with env",
            options: ["--tool-mandatory"],
            type: "string",
            mandatory: true,
            env: "TOOL_MANDATORY_ENV",
          },
        ],
        handler: async (ctx) => ({ result: "tool-success" }),
      });

    dxtGenerator = new DxtGenerator(parser);
    const { envVars, userConfig } = dxtGenerator.generateEnvAndUserConfig();

    // Should have 4 env vars (only flags with env property)
    expect(Object.keys(envVars)).toHaveLength(4);
    expect(envVars).toHaveProperty("OPTIONAL_ENV_VAR", "${user_config.OPTIONAL_ENV_VAR}");
    expect(envVars).toHaveProperty("MANDATORY_ENV_VAR", "${user_config.MANDATORY_ENV_VAR}");
    expect(envVars).toHaveProperty("TOOL_OPTIONAL_ENV", "${user_config.TOOL_OPTIONAL_ENV}");
    expect(envVars).toHaveProperty("TOOL_MANDATORY_ENV", "${user_config.TOOL_MANDATORY_ENV}");

    // Should have 4 user config entries (only flags with env property)
    expect(Object.keys(userConfig)).toHaveLength(4);

    // Top-level optional flag with env: not required, but sensitive
    expect(userConfig.OPTIONAL_ENV_VAR).toEqual({
      type: "string",
      title: "OPTIONAL ENV VAR",
      description: "Optional flag with env var",
      required: false, // Respects flag's mandatory: false
      sensitive: true, // Sensitive because tied to ENV
    });

    // Top-level mandatory flag with env: required and sensitive
    expect(userConfig.MANDATORY_ENV_VAR).toEqual({
      type: "string",
      title: "MANDATORY ENV VAR",
      description: "Mandatory flag with env var",
      required: true, // Respects flag's mandatory: true
      sensitive: true, // Sensitive because tied to ENV
    });

    // Tool optional flag with env: not required, but sensitive
    expect(userConfig.TOOL_OPTIONAL_ENV).toEqual({
      type: "string",
      title: "TOOL OPTIONAL ENV",
      description: "Tool optional flag with env",
      required: false, // Respects flag's mandatory: false
      sensitive: true, // Sensitive because tied to ENV
    });

    // Tool mandatory flag with env: required and sensitive
    expect(userConfig.TOOL_MANDATORY_ENV).toEqual({
      type: "string",
      title: "TOOL MANDATORY ENV",
      description: "Tool mandatory flag with env",
      required: true, // Respects flag's mandatory: true
      sensitive: true, // Sensitive because tied to ENV
    });

    // Flag without env var should not appear in user config
    expect(userConfig).not.toHaveProperty("NO_ENV_FLAG");
  });
});