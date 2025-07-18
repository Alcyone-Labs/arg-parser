import { describe, expect, test } from "vitest";
import {
  ArgParser,
  type ArgParserBehaviorOptions,
  type ArgParserOptions,
  type ArgParserWithMcpOptions,
  type DxtServerInfo,
  type WithMcpOptions,
} from "../../src";

describe("Options Types", () => {
  test("ArgParserOptions should have basic behavior properties", () => {
    const options: ArgParserOptions = {
      autoExit: false,
      handleErrors: true,
    };

    expect(typeof options.autoExit).toBe("boolean");
    expect(typeof options.handleErrors).toBe("boolean");
  });

  test("ArgParserBehaviorOptions should be equivalent to ArgParserOptions", () => {
    const behaviorOptions: ArgParserBehaviorOptions = {
      autoExit: false,
      handleErrors: true,
    };

    const legacyOptions: ArgParserOptions = behaviorOptions;

    expect(typeof behaviorOptions.autoExit).toBe("boolean");
    expect(typeof behaviorOptions.handleErrors).toBe("boolean");
    expect(legacyOptions).toEqual(behaviorOptions);
  });

  test("WithMcpOptions should support logo through serverInfo", () => {
    const mcpOptions: WithMcpOptions = {
      appName: "Test CLI",
      appCommandName: "test-cli",
      mcp: {
        serverInfo: {
          name: "test-mcp-server",
          version: "1.0.0",
          description: "Test MCP server",
          logo: "./assets/logo.png",
        },
      },
    };

    expect(mcpOptions.mcp?.serverInfo?.logo).toBe("./assets/logo.png");
  });

  test("ArgParserWithMcpOptions should be alias for WithMcpOptions", () => {
    const mcpOptions: ArgParserWithMcpOptions = {
      appName: "Test CLI",
      appCommandName: "test-cli",
      mcp: {
        serverInfo: {
          name: "test-mcp-server",
          version: "1.0.0",
          logo: "https://example.com/logo.png",
        },
      },
    };

    // Should be assignable to WithMcpOptions
    const withMcpOptions: WithMcpOptions = mcpOptions;

    expect(withMcpOptions.mcp?.serverInfo?.logo).toBe(
      "https://example.com/logo.png",
    );
  });

  test("DxtServerInfo should support logo property", () => {
    const serverInfo: DxtServerInfo = {
      name: "my-server",
      version: "2.0.0",
      description: "A test server",
      logo: "./my-logo.svg",
      author: {
        name: "Test Author",
        email: "test@example.com",
      },
    };

    expect(serverInfo.logo).toBe("./my-logo.svg");
    expect(serverInfo.author?.name).toBe("Test Author");
  });

  test("ArgParser.withMcp should accept ArgParserWithMcpOptions", () => {
    const options: ArgParserWithMcpOptions = {
      appName: "Logo Test CLI",
      appCommandName: "logo-test",
      description: "Testing logo support",
      mcp: {
        serverInfo: {
          name: "logo-test-mcp",
          version: "1.0.0",
          description: "Logo test MCP server",
          logo: "./test-logo.png",
        },
      },
    };

    const parser = ArgParser.withMcp(options);

    expect(parser).toBeInstanceOf(ArgParser);
    // The parser should have stored the MCP config internally
    expect(parser.getMcpServerConfig()?.serverInfo?.logo).toBe(
      "./test-logo.png",
    );
  });
});
