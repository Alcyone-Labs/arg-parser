#!/usr/bin/env node

import { ArgParser } from "../dist/src/index.js";

// Demo of the new unified tool architecture
// This example shows how to create tools that work in both CLI and MCP modes

const cli = ArgParser.withMcp({
  appName: "Unified Tools Demo",
  appCommandName: "demo",
  description: "Demonstration of unified CLI/MCP tools",
  mcp: {
    serverInfo: {
      name: "demo-mcp-server",
      version: "1.0.0",
      description: "Demo MCP server with unified tools"
    },
    defaultTransports: [
      { type: "stdio" },
    ]
  }
})
.addTool({
  name: "greet",
  description: "Greet someone with a personalized message",
  flags: [
    {
      name: "name",
      description: "Name of the person to greet",
      options: ["--name", "-n"],
      type: "string",
      mandatory: true,
    },
    {
      name: "style",
      description: "Greeting style",
      options: ["--style", "-s"],
      type: "string",
      enum: ["formal", "casual", "enthusiastic"],
      defaultValue: "casual",
    },
    {
      name: "language",
      description: "Language for greeting",
      options: ["--language", "-l"],
      type: "string",
      enum: ["en", "es", "fr", "de"],
      defaultValue: "en",
    },
  ],
  handler: async (ctx) => {
    const { name, style, language } = ctx.args;

    const greetings = {
      en: {
        formal: `Good day, ${name}. It is a pleasure to meet you.`,
        casual: `Hey ${name}! How's it going?`,
        enthusiastic: `WOW! Hi there ${name}! So excited to meet you! 🎉`,
      },
      es: {
        formal: `Buenos días, ${name}. Es un placer conocerle.`,
        casual: `¡Hola ${name}! ¿Cómo estás?`,
        enthusiastic: `¡WOW! ¡Hola ${name}! ¡Qué emocionante conocerte! 🎉`,
      },
      fr: {
        formal: `Bonjour, ${name}. C'est un plaisir de vous rencontrer.`,
        casual: `Salut ${name}! Comment ça va?`,
        enthusiastic: `WOW! Salut ${name}! Je suis ravi de te rencontrer! 🎉`,
      },
      de: {
        formal: `Guten Tag, ${name}. Es ist mir eine Freude, Sie kennenzulernen.`,
        casual: `Hallo ${name}! Wie geht's?`,
        enthusiastic: `WOW! Hallo ${name}! Ich freue mich so, dich kennenzulernen! 🎉`,
      },
    };

    const greeting = greetings[language][style];
    
    // In CLI mode, this will be printed to console
    // In MCP mode, this will be returned as structured data
    console.log(greeting);

    return {
      success: true,
      greeting,
      name,
      style,
      language,
      timestamp: new Date().toISOString(),
    };
  },
})
.addTool({
  name: "calculate",
  description: "Perform basic mathematical calculations",
  flags: [
    {
      name: "operation",
      description: "Mathematical operation to perform",
      options: ["--operation", "-o"],
      type: "string",
      enum: ["add", "subtract", "multiply", "divide"],
      mandatory: true,
    },
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
  handler: async (ctx) => {
    const { operation, a, b } = ctx.args;

    let result;
    let expression;

    switch (operation) {
      case "add":
        result = a + b;
        expression = `${a} + ${b} = ${result}`;
        break;
      case "subtract":
        result = a - b;
        expression = `${a} - ${b} = ${result}`;
        break;
      case "multiply":
        result = a * b;
        expression = `${a} × ${b} = ${result}`;
        break;
      case "divide":
        if (b === 0) {
          throw new Error("Cannot divide by zero");
        }
        result = a / b;
        expression = `${a} ÷ ${b} = ${result}`;
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log(`📊 ${expression}`);

    return {
      success: true,
      operation,
      operands: { a, b },
      result,
      expression,
      timestamp: new Date().toISOString(),
    };
  },
})
.addTool({
  name: "info",
  description: "Get information about this demo",
  flags: [
    {
      name: "verbose",
      description: "Show detailed information",
      options: ["--verbose", "-v"],
      type: "boolean",
      flagOnly: true,
    },
  ],
  handler: async (ctx) => {
    const { verbose } = ctx.args;

    const basicInfo = {
      name: "Unified Tools Demo",
      version: "1.0.0",
      description: "Demonstration of ArgParser's unified CLI/MCP architecture",
      tools: ["greet", "calculate", "info"],
    };

    const detailedInfo = {
      ...basicInfo,
      features: [
        "CLI subcommands",
        "MCP tool integration",
        "Automatic schema generation",
        "Unified flag definitions",
        "Multi-language support",
        "Type validation",
      ],
      usage: {
        cli: [
          "demo greet --name John --style enthusiastic",
          "demo calculate --operation add --a 5 --b 3",
          "demo info --verbose",
        ],
        mcp: [
          "demo --s-mcp-serve",
          "# Then use MCP client to call tools: greet, calculate, info",
        ],
      },
    };

    const info = verbose ? detailedInfo : basicInfo;

    console.log("ℹ️  Demo Information:");
    console.log(JSON.stringify(info, null, 2));

    return {
      success: true,
      ...info,
      timestamp: new Date().toISOString(),
    };
  },
});

// Parse and execute
const result = cli.parse(process.argv.slice(2));

// Handle async results (MCP server mode)
if (result && typeof result.then === "function") {
  result.catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
}
