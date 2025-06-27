import { beforeEach, describe, expect, test } from "vitest";
import { ArgParserWithMcp } from "../../src";

describe("MCP Transport Types", () => {
  let parser: ArgParserWithMcp;

  beforeEach(() => {
    parser = new ArgParserWithMcp({
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
    test("should support stdio transport (default)", () => {
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

      // Check that transport flags are available
      const transportFlags = serveCommand?.parser.flags;
      expect(transportFlags?.find((f: any) => f.name === "transport")).toBeDefined();
      expect(transportFlags?.find((f: any) => f.name === "transports")).toBeDefined();
      expect(transportFlags?.find((f: any) => f.name === "port")).toBeDefined();
      expect(transportFlags?.find((f: any) => f.name === "host")).toBeDefined();
      expect(transportFlags?.find((f: any) => f.name === "path")).toBeDefined();
    });

    test("should have correct transport flag configuration", () => {
      const mcpParser = parser.addMcpSubCommand("serve", {
        name: "test-mcp-server",
        version: "1.0.0",
      });

      const serveCommand = mcpParser.getSubCommands().get("serve");
      const transportFlags = serveCommand?.parser.flags;

      const transportFlag = transportFlags?.find((f: any) => f.name === "transport");
      expect(transportFlag).toMatchObject({
        name: "transport",
        description: "Transport type for MCP server (single transport mode)",
        options: ["--transport", "-t"],
        type: String,
        enum: ["stdio", "sse", "streamable-http"],
        defaultValue: "stdio",
      });

      const transportsFlag = transportFlags?.find((f: any) => f.name === "transports");
      expect(transportsFlag).toMatchObject({
        name: "transports",
        description: "Multiple transports configuration as JSON array (overrides single transport)",
        options: ["--transports"],
        type: String,
      });

      const portFlag = transportFlags?.find((f: any) => f.name === "port");
      expect(portFlag).toMatchObject({
        name: "port",
        description: "Port number for HTTP-based transports (single transport mode)",
        options: ["--port", "-p"],
        type: Number,
        defaultValue: 3000,
      });

      const hostFlag = transportFlags?.find((f: any) => f.name === "host");
      expect(hostFlag).toMatchObject({
        name: "host",
        description: "Host address for HTTP-based transports (single transport mode)",
        options: ["--host"],
        type: String,
        defaultValue: "localhost",
      });

      const pathFlag = transportFlags?.find((f: any) => f.name === "path");
      expect(pathFlag).toMatchObject({
        name: "path",
        description: "Path for HTTP-based transports (single transport mode)",
        options: ["--path"],
        type: String,
        defaultValue: "/mcp",
      });
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
          host: "0.0.0.0"
        });
      }).not.toThrow();
    });
  });

  describe("startMcpServerWithMultipleTransports method", () => {
    test("should have startMcpServerWithMultipleTransports method", () => {
      expect(typeof parser.startMcpServerWithMultipleTransports).toBe("function");
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
            typeName: "ZodObject",
          }),
        }),
        execute: expect.any(Function),
      });
    });

    test("should execute MCP tool correctly", async () => {
      const tools = parser.toMcpTools();
      const tool = tools[0];

      const result = await tool.execute({
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
      const complexParser = ArgParserWithMcp.withMcp({
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
          parser: new ArgParserWithMcp({}, [
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

      // Verify MCP sub-command exists with transport options
      expect(complexParser.getSubCommands().has("serve")).toBe(true);
      const serveCommand = complexParser.getSubCommands().get("serve");
      expect(serveCommand?.parser.flags.find((f: any) => f.name === "transport")).toBeDefined();
    });
  });
});
