import { z } from "zod";
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Protocol Compliance Server",
  appCommandName: "compliance-server",
  description: "MCP server for protocol compliance testing",
  mcp: {
    serverInfo: {
      name: "compliance-test-server",
      version: "1.0.0",
      description: "Protocol compliance test server",
    },
  },
  handler: async (ctx) => {
    return {
      status: "success",
      message: "Main handler executed",
      args: ctx.args,
    };
  },
})
  .addFlags([
    {
      name: "text",
      description: "Text input",
      options: ["--text", "-t"],
      type: "string",
      mandatory: true,
    },
    {
      name: "number",
      description: "Number input",
      options: ["--number", "-n"],
      type: "number",
      defaultValue: 42,
    },
    {
      name: "flag",
      description: "Boolean flag",
      options: ["--flag", "-f"],
      type: "boolean",
      flagOnly: true,
    },
    {
      name: "choice",
      description: "Choice from enum",
      options: ["--choice", "-c"],
      type: "string",
      enum: ["option1", "option2", "option3"],
      defaultValue: "option1",
    },
  ])
  .addSubCommand({
    name: "validate",
    description: "Validate input data",
    handler: async (ctx) => {
      const errors = [];
      if (!ctx.args.data) errors.push("Data is required");
      if (ctx.args.format && !["json", "xml", "yaml"].includes(ctx.args.format)) {
        errors.push("Invalid format");
      }

      return {
        valid: errors.length === 0,
        errors,
        data: ctx.args.data,
        format: ctx.args.format,
      };
    },
    parser: new ArgParser({}, [
      {
        name: "data",
        description: "Data to validate",
        options: ["--data", "-d"],
        type: "string",
        mandatory: true,
      },
      {
        name: "format",
        description: "Data format",
        options: ["--format"],
        type: "string",
        enum: ["json", "xml", "yaml"],
        defaultValue: "json",
      },
    ]),
  })
  .addSubCommand({
    name: "error-test",
    description: "Test error handling",
    handler: async (ctx) => {
      if (ctx.args.trigger === "validation") {
        throw new Error("Validation error triggered");
      }
      if (ctx.args.trigger === "runtime") {
        throw new Error("Runtime error triggered");
      }
      return { message: "No error triggered" };
    },
    parser: new ArgParser({}, [
      {
        name: "trigger",
        description: "Error type to trigger",
        options: ["--trigger"],
        type: "string",
        enum: ["validation", "runtime", "none"],
        defaultValue: "none",
      },
    ]),
  })
  .addTool({
    name: "echo",
    description: "Echo back the input text",
    flags: [
      {
        name: "text",
        description: "Text to echo back",
        options: ["--text"],
        type: "string",
        mandatory: true,
      },
    ],
    outputSchema: z.object({
      echoed: z.string().describe("The echoed text"),
      timestamp: z.string().describe("When the echo was performed"),
    }),
    handler: async (ctx) => {
      return {
        echoed: ctx.args.text,
        timestamp: new Date().toISOString(),
      };
    },
  })
  .addTool({
    name: "add",
    description: "Add two numbers together",
    flags: [
      {
        name: "a",
        description: "First number",
        options: ["--a"],
        type: "number",
        mandatory: true,
      },
      {
        name: "b",
        description: "Second number",
        options: ["--b"],
        type: "number",
        mandatory: true,
      },
    ],
    outputSchema: z.object({
      result: z.number().describe("Sum of the two numbers"),
      operation: z.string().describe("Description of the operation"),
    }),
    handler: async (ctx) => {
      return {
        result: ctx.args.a + ctx.args.b,
        operation: `${ctx.args.a} + ${ctx.args.b} = ${ctx.args.a + ctx.args.b}`,
      };
    },
  });

cli.parse(process.argv.slice(2));
