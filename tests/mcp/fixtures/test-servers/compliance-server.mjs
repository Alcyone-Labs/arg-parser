
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Protocol Compliance Server",
  appCommandName: "compliance-server",
  description: "MCP server for protocol compliance testing",
  handler: async (ctx) => {
    return {
      status: "success",
      message: "Main handler executed",
      args: ctx.args
    };
  }
})
.addFlags([
  {
    name: "text",
    description: "Text input",
    options: ["--text", "-t"],
    type: "string",
    mandatory: true
  },
  {
    name: "number",
    description: "Number input",
    options: ["--number", "-n"],
    type: "number",
    defaultValue: 42
  },
  {
    name: "flag",
    description: "Boolean flag",
    options: ["--flag", "-f"],
    type: "boolean",
    flagOnly: true
  },
  {
    name: "choice",
    description: "Choice from enum",
    options: ["--choice", "-c"],
    type: "string",
    enum: ["option1", "option2", "option3"],
    defaultValue: "option1"
  }
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
      format: ctx.args.format
    };
  },
  parser: new ArgParser({}, [
    {
      name: "data",
      description: "Data to validate",
      options: ["--data", "-d"],
      type: "string",
      mandatory: true
    },
    {
      name: "format",
      description: "Data format",
      options: ["--format"],
      type: "string",
      enum: ["json", "xml", "yaml"],
      defaultValue: "json"
    }
  ])
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
      defaultValue: "none"
    }
  ])
})
.addMcpSubCommand("serve", {
  name: "compliance-test-server",
  version: "1.0.0",
  description: "Protocol compliance test server"
});

cli.parse(process.argv.slice(2));
