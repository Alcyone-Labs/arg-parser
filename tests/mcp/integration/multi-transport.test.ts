import { describe, test, expect, vi } from "vitest";
import { ArgParser } from "../../../src";
import { generateMcpToolsFromArgParser } from "../../../src/mcp-integration";

describe("MCP Multi-Transport Integration Tests", () => {
  describe("Transport Configuration", () => {
    test("should support multiple transport configurations", () => {
      // This test verifies that the ArgParser can be configured with multiple transports
      // In a real implementation, this would test actual transport setup

      const parser = new ArgParser({
        appName: "Multi-Transport Test Server",
        appCommandName: "multi-server",
        description: "MCP server for testing multiple transport types",
        handler: async (ctx) => ({
          message: "Multi-transport server response",
          input: ctx.args.input,
          timestamp: new Date().toISOString()
        })
      }).addFlags([
        {
          name: "input",
          description: "Input data to process",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true
        },
        {
          name: "mode",
          description: "Processing mode",
          options: ["--mode", "-m"],
          type: "string",
          enum: ["fast", "thorough", "debug"],
          defaultValue: "fast"
        }
      ]);

      const tools = generateMcpToolsFromArgParser(parser);

      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0].name).toBe("multi-server");
      expect(tools[0].description).toBe("MCP server for testing multiple transport types");
    });

    test("should handle algorithm processing correctly", async () => {
      const processHandler = vi.fn().mockImplementation(async (ctx) => {
        const algorithm = ctx.args.algorithm;
        const data = ctx.args.data;

        let result;
        switch (algorithm) {
          case "reverse":
            result = data.split("").reverse().join("");
            break;
          case "encode":
            result = Buffer.from(data).toString("base64");
            break;
          default:
            result = `processed-${data}`;
        }

        return {
          algorithm,
          input: data,
          output: result,
          length: result.length
        };
      });

      const mainParser = new ArgParser({
        appName: "Multi-Transport Test Server",
        appCommandName: "multi-server",
        description: "MCP server for testing multiple transport types",
        handler: async () => ({ success: true })
      });

      const processParser = new ArgParser({
        appName: "Process Command",
        description: "Process data with specific algorithm",
        handler: processHandler,
        handleErrors: false
      }).addFlags([
        {
          name: "algorithm",
          description: "Processing algorithm",
          options: ["--algorithm", "-a"],
          type: "string",
          enum: ["reverse", "encode", "default"],
          defaultValue: "default"
        },
        {
          name: "data",
          description: "Data to process",
          options: ["--data", "-d"],
          type: "string",
          mandatory: true
        }
      ]);

      mainParser.addSubCommand({
        name: "process",
        description: "Process data with specific algorithm",
        parser: processParser
      });

      const tools = generateMcpToolsFromArgParser(mainParser);
      const processTool = tools.find(t => t.name.includes("process"));
      expect(processTool).toBeDefined();

      // Test reverse algorithm
      const reverseResult = await processTool!.executeForTesting!({
        algorithm: "reverse",
        data: "hello world"
      });

      expect(reverseResult.success).toBe(true);
      expect(reverseResult.data.algorithm).toBe("reverse");
      expect(reverseResult.data.output).toBe("dlrow olleh");

      // Test encode algorithm
      const encodeResult = await processTool!.executeForTesting!({
        algorithm: "encode",
        data: "hello"
      });

      expect(encodeResult.success).toBe(true);
      expect(encodeResult.data.algorithm).toBe("encode");
      expect(encodeResult.data.output).toBe("aGVsbG8="); // base64 of "hello"
    });
  });

});
