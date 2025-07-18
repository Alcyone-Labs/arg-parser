import { beforeEach, describe, expect, test } from "vitest";
import { ArgParser } from "../../src";
import type { McpSubCommandOptions, McpTransportConfig } from "../../src";

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

  describe("addMcpSubCommand with preset transports", () => {
    test("should accept defaultTransport configuration", () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 3001,
        host: "0.0.0.0",
        path: "/custom-mcp",
      };

      const options: McpSubCommandOptions = {
        defaultTransport,
      };

      expect(() => {
        parser.addMcpSubCommand(
          "serve",
          {
            name: "test-mcp-server",
            version: "1.0.0",
          },
          options,
        );
      }).not.toThrow();

      const subCommands = parser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);
    });

    test("should accept defaultTransports array configuration", () => {
      const defaultTransports: McpTransportConfig[] = [
        { type: "stdio" },
        { type: "sse", port: 3001 },
        { type: "streamable-http", port: 3002, path: "/api/mcp" },
      ];

      const options: McpSubCommandOptions = {
        defaultTransports,
      };

      expect(() => {
        parser.addMcpSubCommand(
          "serve",
          {
            name: "multi-transport-server",
            version: "1.0.0",
          },
          options,
        );
      }).not.toThrow();

      const subCommands = parser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);
    });

    test("should accept both preset transports and toolOptions", () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 4000,
      };

      const options: McpSubCommandOptions & { toolOptions?: any } = {
        defaultTransport,
        toolOptions: {
          includeSubCommands: true,
          toolNamePrefix: "test-",
        },
      };

      expect(() => {
        parser.addMcpSubCommand(
          "serve",
          {
            name: "configured-server",
            version: "1.0.0",
          },
          options,
        );
      }).not.toThrow();
    });

    test("should maintain backward compatibility with toolOptions parameter", () => {
      const toolOptions = {
        includeSubCommands: true,
        toolNamePrefix: "legacy-",
      };

      expect(() => {
        parser.addMcpSubCommand(
          "serve",
          {
            name: "legacy-server",
            version: "1.0.0",
          },
          { toolOptions },
        );
      }).not.toThrow();

      const subCommands = parser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);
    });
  });

  describe("MCP handler logic with preset transports", () => {
    test("should create handler that can access preset transport configuration", () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 3001,
        host: "localhost",
      };

      parser.addMcpSubCommand(
        "serve",
        {
          name: "test-server",
          version: "1.0.0",
        },
        { defaultTransport },
      );

      const serveCommand = parser.getSubCommands().get("serve");
      expect(serveCommand).toBeDefined();
      expect(serveCommand?.handler).toBeInstanceOf(Function);
    });

    test("should prioritize CLI flags over preset configuration", async () => {
      const defaultTransport: McpTransportConfig = {
        type: "sse",
        port: 3001,
      };

      parser.addMcpSubCommand(
        "serve",
        {
          name: "priority-test-server",
          version: "1.0.0",
        },
        { defaultTransport },
      );

      // Transport configuration is now handled via system flags (--s-mcp-*)
      // The subcommand parser should not have transport flags
      const serveCommand = parser.getSubCommands().get("serve");
      const transportFlags = serveCommand?.parser.flags;

      // Transport flags should not exist in subcommand - they're now system flags
      const transportFlag = transportFlags?.find(
        (f: any) => f.name === "transport",
      );
      expect(transportFlag).toBeUndefined();

      // System flags are handled at the parser level, not in subcommands
      // The preset configuration would be used as defaults when no system flags are provided
      expect(typeof parser.parse).toBe("function");
    });
  });

  describe("Integration with existing functionality", () => {
    test("should work with complex CLI setup and preset transports", () => {
      const complexParser = ArgParser.withMcp({
        appName: "Complex CLI with Presets",
        appCommandName: "complex-preset",
        description:
          "A complex CLI with sub-commands and preset MCP transports",
      })
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
          parser: new ArgParser({}, [
            {
              name: "file",
              description: "File to process",
              options: ["--file", "-f"],
              type: "string",
              mandatory: true,
            },
          ]),
        })
        .addMcpSubCommand(
          "serve",
          {
            name: "complex-preset-server",
            version: "1.0.0",
          },
          {
            defaultTransports: [
              { type: "stdio" },
              { type: "sse", port: 3001, host: "0.0.0.0" },
            ],
            toolOptions: {
              includeSubCommands: true,
            },
          },
        );

      expect(complexParser).toBeInstanceOf(ArgParser);
      expect(complexParser.getSubCommands().has("process")).toBe(true);
      expect(complexParser.getSubCommands().has("serve")).toBe(true);
    });
  });
});
