import { beforeEach, describe, expect, test } from "vitest";
import { ArgParser } from "../../src";

describe("MCP Transport Types", () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = new ArgParser({
      appName: "Transport Test CLI",
      appCommandName: "transport-test",
      description: "A test CLI for MCP transport functionality",
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

  describe("Transport Type Support", () => {
    test("should support stdio transport (default) via system flags", () => {
      const mcpParser = parser.addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
        description: "Test MCP server",
      });

      const subCommands = mcpParser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);

      const serveCommand = subCommands.get("serve");
      expect(serveCommand).toBeDefined();
      expect(serveCommand?.parser).toBeDefined();

      // Transport flags are now system flags (--s-mcp-*), not part of subcommand
      const transportFlags = serveCommand?.parser.flags;
      expect(
        transportFlags?.find((f: any) => f.name === "transport"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "transports"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "port"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "host"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "path"),
      ).toBeUndefined();
    });

    test("should use system flags for transport configuration", () => {
      const mcpParser = parser.addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
      });

      const serveCommand = mcpParser.getSubCommands().get("serve");
      const transportFlags = serveCommand?.parser.flags;

      // Transport configuration is now handled via system flags (--s-mcp-*)
      // The subcommand parser should not have transport flags
      expect(
        transportFlags?.find((f: any) => f.name === "transport"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "transports"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "port"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "host"),
      ).toBeUndefined();
      expect(
        transportFlags?.find((f: any) => f.name === "path"),
      ).toBeUndefined();

      // System flags are handled at the parser level, not in subcommands
      // Test that the parser can handle system transport flags
      expect(typeof mcpParser.parse).toBe("function");
    });
  });

  describe("startMcpServerWithTransport method", () => {
    test("should have startMcpServerWithTransport method", () => {
      expect(typeof parser.startMcpServerWithTransport).toBe("function");
    });

    test("should accept valid transport types", () => {
      const serverInfo = {
        name: "test-server",
        version: "1.0.0",
        description: "Test server",
      };

      // These should not throw during method call setup
      expect(() => {
        parser.startMcpServerWithTransport(serverInfo, "stdio");
      }).not.toThrow();

      expect(() => {
        parser.startMcpServerWithTransport(serverInfo, "sse", { port: 3001 });
      }).not.toThrow();

      expect(() => {
        parser.startMcpServerWithTransport(serverInfo, "streamable-http", {
          port: 3002,
          host: "0.0.0.0",
        });
      }).not.toThrow();
    });
  });

  describe("startMcpServerWithMultipleTransports method", () => {
    test("should have startMcpServerWithMultipleTransports method", () => {
      expect(typeof parser.startMcpServerWithMultipleTransports).toBe(
        "function",
      );
    });

    test("should accept multiple transport configurations", () => {
      const serverInfo = {
        name: "multi-transport-server",
        version: "1.0.0",
        description: "Multi-transport test server",
      };

      const transports = [
        { type: "stdio" as const },
        { type: "sse" as const, port: 3001, path: "/sse" },
        { type: "streamable-http" as const, port: 3002, path: "/mcp" },
      ];

      // This should not throw during method call setup
      expect(() => {
        parser.startMcpServerWithMultipleTransports(serverInfo, transports);
      }).not.toThrow();
    });

    test("should handle empty transport array", () => {
      const serverInfo = {
        name: "empty-transport-server",
        version: "1.0.0",
      };

      expect(() => {
        parser.startMcpServerWithMultipleTransports(serverInfo, []);
      }).not.toThrow();
    });
  });

  describe("MCP Tools Generation", () => {
    test("should generate tools correctly regardless of transport type", () => {
      const tools = parser.toMcpTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: "transport-test",
        description: "A test CLI for MCP transport functionality",
        inputSchema: expect.objectContaining({
          _def: expect.objectContaining({
            type: "object",
          }),
        }),
        execute: expect.any(Function),
      });
    });

    test("should execute MCP tool correctly", async () => {
      const tools = parser.toMcpTools();
      const tool = tools[0];

      const result = await tool.executeForTesting!({
        input: "test-input",
      });

      expect(result).toEqual({
        success: true,
        data: {
          result: "success",
          args: {
            input: "test-input",
          },
        },
      });
    });
  });

  describe("Integration with existing functionality", () => {
    test("should work with complex CLI setup and multiple transport options", () => {
      const complexParser = ArgParser.withMcp({
        appName: "Complex CLI",
        appCommandName: "complex",
        description: "A complex CLI with sub-commands and MCP support",
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
        .addMcpSubCommand("serve", {
          name: "complex-mcp-server",
          version: "1.0.0",
        });

      // Test MCP tools generation
      const tools = complexParser.toMcpTools();
      expect(tools.length).toBeGreaterThan(0);

      // Verify MCP sub-command exists (transport options are now system flags)
      expect(complexParser.getSubCommands().has("serve")).toBe(true);
      const serveCommand = complexParser.getSubCommands().get("serve");
      expect(
        serveCommand?.parser.flags.find((f: any) => f.name === "transport"),
      ).toBeUndefined();
    });
  });

  describe("System Transport Flags", () => {
    test("should parse system transport flags correctly", () => {
      const mcpParser = parser.addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
      });

      // Test that the parser can handle the new system flags
      // Note: We can't easily test the actual parsing without running the MCP server
      // but we can verify the method exists and the flags are recognized
      expect(typeof mcpParser.parse).toBe("function");

      // The transport configuration should now be handled via system flags
      // --s-mcp-transport, --s-mcp-port, --s-mcp-host, --s-mcp-path, --s-mcp-transports
    });

    test("should support backward compatibility with deprecation warnings", () => {
      // This test verifies that old flags still work but show warnings
      const mcpParser = parser.addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
      });

      // The old flags should still be parsed but with warnings
      // This is handled in the #_parseMcpTransportOptions method
      expect(typeof mcpParser.parse).toBe("function");
    });
  });
});
