import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Tool Execution Test Server",
  appCommandName: "tool-server",
  description: "MCP server for testing tool execution scenarios",
  handler: async (ctx) => {
    return {
      operation: "main",
      input: ctx.args.input,
      processed: true,
      timestamp: new Date().toISOString(),
    };
  },
})
  .addFlags([
    {
      name: "input",
      description: "Input data to process",
      options: ["--input", "-i"],
      type: "string",
      mandatory: true,
    },
  ])
  .addSubCommand({
    name: "file",
    description: "File operations",
    handler: async (ctx) => {
      const operation = ctx.args.operation;
      const filePath = ctx.args.path;

      try {
        switch (operation) {
          case "read":
            if (!existsSync(filePath)) {
              throw new Error(`File not found: ${filePath}`);
            }
            const content = readFileSync(filePath, "utf-8");
            return {
              operation: "read",
              path: filePath,
              content,
              size: content.length,
            };

          case "write":
            const data = ctx.args.data || "";
            writeFileSync(filePath, data);
            return {
              operation: "write",
              path: filePath,
              bytesWritten: data.length,
            };

          case "exists":
            return {
              operation: "exists",
              path: filePath,
              exists: existsSync(filePath),
            };

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        throw new Error(`File operation failed: ${error.message}`);
      }
    },
    parser: new ArgParser({}, [
      {
        name: "operation",
        description: "File operation to perform",
        options: ["--operation", "-o"],
        type: "string",
        enum: ["read", "write", "exists"],
        mandatory: true,
      },
      {
        name: "path",
        description: "File path",
        options: ["--path", "-p"],
        type: "string",
        mandatory: true,
      },
      {
        name: "data",
        description: "Data to write (for write operation)",
        options: ["--data", "-d"],
        type: "string",
      },
    ]),
  })
  .addSubCommand({
    name: "math",
    description: "Mathematical operations",
    handler: async (ctx) => {
      const operation = ctx.args.operation;
      const a = parseFloat(ctx.args.a);
      const b = parseFloat(ctx.args.b);

      if (isNaN(a) || isNaN(b)) {
        throw new Error("Invalid numbers provided");
      }

      let result;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) throw new Error("Division by zero");
          result = a / b;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        operation,
        operands: { a, b },
        result,
        timestamp: new Date().toISOString(),
      };
    },
    parser: new ArgParser({}, [
      {
        name: "operation",
        description: "Mathematical operation",
        options: ["--operation", "-o"],
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        mandatory: true,
      },
      {
        name: "a",
        description: "First number",
        options: ["--a"],
        type: "string",
        mandatory: true,
      },
      {
        name: "b",
        description: "Second number",
        options: ["--b"],
        type: "string",
        mandatory: true,
      },
    ]),
  })
  .addSubCommand({
    name: "async-test",
    description: "Test async operations",
    handler: async (ctx) => {
      const delay = parseInt(ctx.args.delay) || 1000;
      const shouldFail = ctx.args.fail === "true";

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (shouldFail) {
        throw new Error("Async operation failed as requested");
      }

      return {
        operation: "async-test",
        delay,
        completed: true,
        timestamp: new Date().toISOString(),
      };
    },
    parser: new ArgParser({}, [
      {
        name: "delay",
        description: "Delay in milliseconds",
        options: ["--delay", "-d"],
        type: "string",
        defaultValue: "1000",
      },
      {
        name: "fail",
        description: "Whether to fail the operation",
        options: ["--fail", "-f"],
        type: "string",
        enum: ["true", "false"],
        defaultValue: "false",
      },
    ]),
  })
  .addMcpSubCommand("serve", {
    name: "tool-execution-test-server",
    version: "1.0.0",
    description: "Tool execution test server",
  });

cli.parse(process.argv.slice(2));
