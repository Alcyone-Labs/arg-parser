import { beforeEach, describe, expect, test } from "vitest";
import { ArgParser } from "../../core/src/index.js";
import { mcpPlugin } from "../src/index.js";
import type { McpTransportConfig } from "../src/index.js";

describe("MCP Preset Transports Configuration", () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = new ArgParser({
      appName: "Preset Transport Test CLI",
      appCommandName: "preset-test",
      description: "A test CLI for preset MCP transport functionality",
      handler: async (ctx) => ({ result: "success", args: ctx.args }),
      handleErrors: false,
    }).addFlags([
      {
        name: "input",
        description: "Input parameter",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
    ]);
  });

  describe("McpTransportConfig type", () => {
    test("should accept valid transport configurations", () => {
      const stdioConfig: McpTransportConfig = { type: "stdio" };
      const sseConfig: McpTransportConfig = {
        type: "sse",
        port: 3001,
        host: "localhost",
        path: "/mcp",
      };
      const httpConfig: McpTransportConfig = {
        type: "streamable-http",
        port: 3002,
        sessionIdGenerator: () => "test-session",
      };

      expect(stdioConfig.type).toBe("stdio");
      expect(sseConfig.type).toBe("sse");
      expect(sseConfig.port).toBe(3001);
      expect(httpConfig.type).toBe("streamable-http");
      expect(httpConfig.sessionIdGenerator?.()).toBe("test-session");
    });
  });

  describe("mcpPlugin with preset transports", () => {
    test("should accept defaultTransport configuration", () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 3001,
        host: "0.0.0.0",
        path: "/custom-mcp",
      };

      expect(() => {
        new ArgParser({
          appName: "Preset Transport Test CLI",
          appCommandName: "preset-test",
        }).use(mcpPlugin({
          serverInfo: {
            name: "test-mcp-server",
            version: "1.0.0",
          },
          defaultTransport,
        }));
      }).not.toThrow();
    });

    test("should accept defaultTransports array configuration", () => {
      const defaultTransports: McpTransportConfig[] = [
        { type: "stdio" },
        { type: "sse", port: 3001 },
        { type: "streamable-http", port: 3002, path: "/api/mcp" },
      ];

      expect(() => {
        new ArgParser({
          appName: "Preset Transport Test CLI",
          appCommandName: "preset-test",
        }).use(mcpPlugin({
          serverInfo: {
            name: "multi-transport-server",
            version: "1.0.0",
          },
          defaultTransports,
        }));
      }).not.toThrow();
    });

    test("should accept both preset transports and toolOptions", () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 4000,
      };

      expect(() => {
        new ArgParser({
          appName: "Preset Transport Test CLI",
          appCommandName: "preset-test",
        }).use(mcpPlugin({
          serverInfo: {
            name: "configured-server",
            version: "1.0.0",
          },
          defaultTransport,
          toolOptions: {
            includeSubCommands: true,
            toolNamePrefix: "test-",
          },
        }));
      }).not.toThrow();
    });
  });

  describe("Integration with existing functionality", () => {
    test("should work with complex CLI setup and preset transports", () => {
      const complexParser = new ArgParser({
        appName: "Complex CLI with Presets",
        appCommandName: "complex-preset",
        description: "A complex CLI with sub-commands and preset MCP transports",
      })
        .use(mcpPlugin({
          serverInfo: {
            name: "complex-preset-server",
            version: "1.0.0",
          },
          defaultTransports: [{ type: "stdio" }, { type: "sse", port: 3001, host: "0.0.0.0" }],
          toolOptions: {
            includeSubCommands: true,
          },
        }))
        .addFlags([
          {
            name: "global",
            description: "Global flag",
            options: ["--global", "-g"],
            type: "string",
          },
        ])
        .addSubCommand({
          name: "process",
          description: "Process data",
          handler: async (ctx) => ({
            action: "process",
            global: ctx.parentArgs?.["global"],
            file: ctx.args["file"],
          }),
          parser: new ArgParser({
            appName: "Process Subcommand",
          }).addFlags([
            {
              name: "file",
              description: "File to process",
              options: ["--file", "-f"],
              type: "string",
              mandatory: true,
            },
          ]),
        });

      expect(complexParser).toBeInstanceOf(ArgParser);
      expect(complexParser.getSubCommands().has("process")).toBe(true);
    });
  });
});
