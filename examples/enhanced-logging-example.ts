#!/usr/bin/env node

/**
 * Example demonstrating the new enhanced logging configuration options
 * for MCP servers using @alcyone-labs/simple-mcp-logger
 */

import { ArgParser, type McpLoggerOptions } from "@alcyone-labs/arg-parser";

// Example 1: Using the new 'log' property with full options (with type safety)
// The McpLoggerOptions type ensures compatibility with @alcyone-labs/simple-mcp-logger
const logConfig: McpLoggerOptions = {
  level: "debug",        // Captures debug, info, warn, error
  logToFile: "./examples/logs/enhanced-comprehensive.log",
  prefix: "ComprehensiveServer",
  mcpMode: true          // MCP compliant (default)
};

const comprehensiveLoggingParser = ArgParser.withMcp({
  appName: "Enhanced Logging Example",
  appCommandName: "enhanced-log-example",
  description: "Demonstrates enhanced MCP logging configuration",
  handler: async (ctx) => {
    console.log("Main handler executed:", ctx.args);
    console.info("This will be captured at info level");
    console.debug("This will be captured at debug level");
    console.warn("This is a warning");
    console.error("This is an error");
    
    return {
      success: true,
      message: "Command completed successfully",
      timestamp: new Date().toISOString(),
    };
  },
  mcp: {
    serverInfo: {
      name: "enhanced-logging-example",
      version: "1.0.0",
      description: "Example showing enhanced logging configuration",
    },
    defaultTransport: { type: "stdio" },
    // NEW: Enhanced logging configuration with full options (using type-safe config)
    log: logConfig
  },
});

// Example 2: Using the new 'log' property with simple string (backward compatible)
const simpleLoggingParser = ArgParser.withMcp({
  appName: "Simple Logging Example", 
  appCommandName: "simple-log-example",
  description: "Demonstrates simple string logging configuration",
  handler: async (ctx) => {
    console.log("Simple handler executed:", ctx.args);
    return { success: true };
  },
  mcp: {
    serverInfo: {
      name: "simple-logging-example",
      version: "1.0.0",
    },
    defaultTransport: { type: "stdio" },
    // NEW: Simple string path (equivalent to logPath)
    log: "./examples/logs/enhanced-simple.log"
  },
});

// Example 3: Legacy logPath still works (backward compatibility)
const legacyLoggingParser = ArgParser.withMcp({
  appName: "Legacy Logging Example",
  appCommandName: "legacy-log-example", 
  description: "Demonstrates legacy logPath configuration",
  handler: async (ctx) => {
    console.log("Legacy handler executed:", ctx.args);
    return { success: true };
  },
  mcp: {
    serverInfo: {
      name: "legacy-logging-example",
      version: "1.0.0",
    },
    defaultTransport: { type: "stdio" },
    // LEGACY: Still works but deprecated
    logPath: "./examples/logs/enhanced-legacy.log"
  },
});

// Example 4: Intelligent merging - 'log' + 'logPath' work together
const mergedLoggingParser = ArgParser.withMcp({
  appName: "Merged Logging Example",
  appCommandName: "merged-log-example",
  description: "Demonstrates intelligent merging of log and logPath",
  handler: async (ctx) => {
    console.log("Merged handler executed:", ctx.args);
    return { success: true };
  },
  mcp: {
    serverInfo: {
      name: "merged-logging-example",
      version: "1.0.0",
    },
    defaultTransport: { type: "stdio" },
    // log provides logger configuration
    log: {
      level: "debug",        // Captures all log levels
      prefix: "MergedServer",
      mcpMode: true,
      // No logToFile here - let logPath handle the path
    },
    // logPath provides flexible path resolution
    logPath: {
      path: "./examples/logs/enhanced-merged.log",
      relativeTo: "entry",   // Relative to entry point
      // Could also use "cwd" or "absolute"
    }
  },
});

// Example 5: logPath overrides log.logToFile for better path control
const pathPriorityParser = ArgParser.withMcp({
  appName: "Path Priority Example",
  appCommandName: "path-priority-example",
  description: "Demonstrates logPath taking precedence for path resolution",
  handler: async (ctx) => {
    console.log("Path priority handler executed:", ctx.args);
    return { success: true };
  },
  mcp: {
    serverInfo: {
      name: "path-priority-example",
      version: "1.0.0",
    },
    defaultTransport: { type: "stdio" },
    log: {
      level: "info",
      logToFile: "./examples/logs/will-be-overridden.log", // This path will be overridden
      prefix: "PathPriorityServer"
    },
    logPath: {
      path: "./examples/logs/enhanced-path-priority.log", // This takes precedence
      relativeTo: "cwd",     // Relative to current working directory
    }
  },
});

// Add some tools to demonstrate logging during tool execution
comprehensiveLoggingParser.addTool({
  name: "test-logging",
  description: "Test tool to demonstrate logging at different levels",
  flags: [
    {
      name: "message",
      options: ["--message", "-m"],
      type: "string",
      description: "Message to log",
      defaultValue: "Hello, enhanced logging!"
    }
  ],
  handler: async (ctx) => {
    const message = ctx.args.message;
    
    console.debug(`Debug: Processing message: ${message}`);
    console.info(`Info: Tool execution started`);
    console.warn(`Warning: This is a test warning`);
    console.log(`Log: Processing complete`);
    
    return {
      success: true,
      message: `Processed: ${message}`,
      loggingLevels: ["debug", "info", "warn", "log"],
      timestamp: new Date().toISOString()
    };
  }
});

// Export the parsers for testing
export {
  comprehensiveLoggingParser,
  simpleLoggingParser,
  legacyLoggingParser,
  mergedLoggingParser,
  pathPriorityParser
};

// If run directly, use the comprehensive logging parser
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveLoggingParser.parse();
}
