import { ArgParser } from "./ArgParser";
import {
  generateMcpToolsFromArgParser,
} from "./mcp-integration";
import type { GenerateMcpToolsOptions, IMcpToolStructure } from "./mcp-integration";
import type { IHandlerContext } from "./types";

/**
 * Configuration for a single MCP transport
 */
export type McpTransportConfig = {
  type: "stdio" | "sse" | "streamable-http";
  port?: number;
  host?: string;
  path?: string;
  sessionIdGenerator?: () => string;
};

/**
 * Configuration options for MCP sub-command
 */
export type McpSubCommandOptions = {
  /** Preset transport configurations to use when no CLI flags are provided */
  defaultTransports?: McpTransportConfig[];
  /** Single preset transport configuration (alternative to defaultTransports) */
  defaultTransport?: McpTransportConfig;
};

/**
 * Extended ArgParser with Model Context Protocol (MCP) integration capabilities.
 *
 * This class adds MCP server functionality on top of the standard ArgParser,
 * allowing CLI tools to be easily exposed as MCP tools with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const parser = new ArgParserWithMcp({
 *   appName: "My CLI",
 *   appCommandName: "my-cli",
 *   handler: async (ctx) => ({ result: "success" })
 * })
 *   .addFlags([...])
 *   .addMcpSubCommand("serve", {
 *     name: "my-cli-mcp-server",
 *     version: "1.0.0"
 *   });
 * ```
 */
export class ArgParserWithMcp<
  THandlerReturn = any,
> extends ArgParser<THandlerReturn> {
  /**
   * Generate MCP tools from this ArgParser instance
   * @param options Optional configuration for MCP tool generation
   * @returns Array of MCP tool structures ready for server registration
   */
  public toMcpTools(options?: GenerateMcpToolsOptions): IMcpToolStructure[] {
    return generateMcpToolsFromArgParser(this, options);
  }

  /**
   * Create an MCP server with tools generated from this ArgParser
   * @param serverInfo Server configuration
   * @param toolOptions Optional MCP tool generation options
   * @returns Configured MCP server instance
   */
  public createMcpServer(
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    toolOptions?: GenerateMcpToolsOptions,
  ): any {
    // Dynamic import to avoid circular dependencies
    const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");

    const server = new McpServer({
      id: serverInfo.name,
      version: serverInfo.version,
      name: serverInfo.name,
      description: serverInfo.description,
    });

    const tools = this.toMcpTools(toolOptions);

    // Deduplicate tools by name to avoid registration conflicts
    const uniqueTools = tools.reduce((acc, tool) => {
      if (!acc.find((t) => t.name === tool.name)) {
        acc.push(tool);
      }
      return acc;
    }, [] as IMcpToolStructure[]);

    uniqueTools.forEach((tool) => {
      const toolConfig: any = {
        description: tool.description || "No description provided.",
        inputSchema: (tool.inputSchema as any).shape || tool.inputSchema,
      };

      if (tool.outputSchema) {
        toolConfig.outputSchema = (tool.outputSchema as any).shape || tool.outputSchema;
      }

      server.registerTool(tool.name, toolConfig, tool.execute);
    });

    return server;
  }

  /**
   * Start an MCP server using stdio transport
   * @param serverInfo Server configuration
   * @param toolOptions Optional MCP tool generation options
   * @returns Promise that resolves when server is connected
   */
  public async startMcpServer(
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    toolOptions?: GenerateMcpToolsOptions,
  ): Promise<void> {
    return this.startMcpServerWithTransport(serverInfo, "stdio", {}, toolOptions);
  }

  /**
   * Start an MCP server with multiple transport types simultaneously
   * @param serverInfo Server configuration
   * @param transports Array of transport configurations
   * @param toolOptions Optional MCP tool generation options
   * @returns Promise that resolves when all servers are started
   */
  public async startMcpServerWithMultipleTransports(
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    transports: Array<{
      type: "stdio" | "sse" | "streamable-http";
      port?: number;
      host?: string;
      path?: string;
      sessionIdGenerator?: () => string;
    }>,
    toolOptions?: GenerateMcpToolsOptions,
  ): Promise<void> {
    const server = this.createMcpServer(serverInfo, toolOptions);
    const startPromises: Promise<void>[] = [];

    for (const transportConfig of transports) {
      const promise = this.#_startSingleTransport(server, serverInfo, transportConfig);
      startPromises.push(promise);
    }

    await Promise.all(startPromises);
    console.error(`[${serverInfo.name}] All MCP transports started successfully`);
  }

  /**
   * Start an MCP server with a specific transport type
   * @param serverInfo Server configuration
   * @param transportType Type of transport to use
   * @param transportOptions Transport-specific options
   * @param toolOptions Optional MCP tool generation options
   * @returns Promise that resolves when server is connected
   */
  public async startMcpServerWithTransport(
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    transportType: "stdio" | "sse" | "streamable-http",
    transportOptions: {
      port?: number;
      host?: string;
      path?: string;
      sessionIdGenerator?: () => string;
    } = {},
    toolOptions?: GenerateMcpToolsOptions,
  ): Promise<void> {
    const server = this.createMcpServer(serverInfo, toolOptions);
    await this.#_startSingleTransport(server, serverInfo, {
      type: transportType,
      ...transportOptions,
    });
  }

  /**
   * Private helper method to start a single transport
   */
  async #_startSingleTransport(
    server: any,
    serverInfo: { name: string; version: string; description?: string },
    transportConfig: {
      type: "stdio" | "sse" | "streamable-http";
      port?: number;
      host?: string;
      path?: string;
      sessionIdGenerator?: () => string;
    },
  ): Promise<void> {
    switch (transportConfig.type) {
      case "stdio": {
        const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error(`[${serverInfo.name}] MCP Server started with stdio transport`);
        break;
      }

      case "sse": {
        const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
        const express = (await import("express")).default;

        const app = express();
        app.use(express.json());

        const port = transportConfig.port || 3000;
        const path = transportConfig.path || "/sse";

        app.get(path, (_req: any, res: any) => {
          const transport = new SSEServerTransport(path, res);
          server.connect(transport);
        });

        await new Promise<void>((resolve) => {
          app.listen(port, transportConfig.host || "localhost", () => {
            console.error(`[${serverInfo.name}] MCP Server listening on http://${transportConfig.host || "localhost"}:${port}${path} (SSE)`);
            resolve();
          });
        });
        break;
      }

      case "streamable-http": {
        const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
        const express = (await import("express")).default;

        const app = express();
        app.use(express.json());

        const port = transportConfig.port || 3000;
        const path = transportConfig.path || "/mcp";

        const transports: { [sessionId: string]: any } = {};

        app.all(path, async (req: any, res: any) => {
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          let transport: any;

          if (sessionId && transports[sessionId]) {
            transport = transports[sessionId];
          } else {
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: transportConfig.sessionIdGenerator || (() => Math.random().toString(36).substring(7)),
              onsessioninitialized: (sessionId: string) => {
                transports[sessionId] = transport;
              }
            });

            transport.onclose = () => {
              if (transport.sessionId) {
                delete transports[transport.sessionId];
              }
            };

            await server.connect(transport);
          }

          await transport.handleRequest(req, res, req.body);
        });

        await new Promise<void>((resolve) => {
          app.listen(port, transportConfig.host || "localhost", () => {
            console.error(`[${serverInfo.name}] MCP Server listening on http://${transportConfig.host || "localhost"}:${port}${path} (HTTP)`);
            resolve();
          });
        });
        break;
      }

      default:
        throw new Error(`Unsupported transport type: ${transportConfig.type}`);
    }
  }

  /**
   * Override parse() to handle async handlers properly
   * This allows ArgParserWithMcp to work with async handlers while keeping
   * the base ArgParser synchronous for backwards compatibility
   */
  public async parse(processArgs: string[], options?: any): Promise<any> {
    // First, call the parent parse method to get the basic parsing done
    const result = super.parse(processArgs, options);

    // Check if there's an async handler that needs to be awaited
    const anyResult = result as any;
    if (anyResult._asyncHandlerPromise) {
      try {
        const handlerResult = await anyResult._asyncHandlerPromise;
        anyResult.handlerResponse = handlerResult;
      } catch (error) {
        // Handle async handler errors
        anyResult.$error = {
          type: "handler_error",
          message: error instanceof Error ? error.message : String(error),
          details: error,
        };
      }

      // Clean up the async handler info
      delete anyResult._asyncHandlerPromise;
      delete anyResult._asyncHandlerInfo;
    }

    return result;
  }

  /**
   * Add an MCP sub-command that starts an MCP server exposing this parser's functionality
   * @param subCommandName Name of the sub-command (default: "mcp-server")
   * @param serverInfo Server configuration
   * @param options Optional configuration including preset transports and tool options
   * @returns This ArgParserWithMcp instance for chaining
   */
  public addMcpSubCommand(
    subCommandName: string | undefined,
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    options?: McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions },
  ): this;

  /**
   * Add an MCP sub-command that starts an MCP server exposing this parser's functionality
   * @param subCommandName Name of the sub-command (default: "mcp-server")
   * @param serverInfo Server configuration
   * @param toolOptions Optional MCP tool generation options (backward compatibility)
   * @returns This ArgParserWithMcp instance for chaining
   * @deprecated Use the options parameter instead for better configurability
   */
  public addMcpSubCommand(
    subCommandName: string | undefined,
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    toolOptions?: GenerateMcpToolsOptions,
  ): this;

  public addMcpSubCommand(
    subCommandName: string | undefined = "mcp-server",
    serverInfo: {
      name: string;
      version: string;
      description?: string;
    },
    optionsOrToolOptions?: (McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions }) | GenerateMcpToolsOptions,
  ): this {
    // Handle backward compatibility: if the third parameter is a GenerateMcpToolsOptions object
    // (detected by checking if it has properties that only exist in GenerateMcpToolsOptions)
    let options: McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions };

    if (optionsOrToolOptions &&
        (typeof optionsOrToolOptions === 'object') &&
        ('includeSubCommands' in optionsOrToolOptions || 'toolNamePrefix' in optionsOrToolOptions || 'toolNameSuffix' in optionsOrToolOptions)) {
      // This is the old GenerateMcpToolsOptions format
      options = { toolOptions: optionsOrToolOptions as GenerateMcpToolsOptions };
    } else {
      // This is the new options format or undefined
      options = (optionsOrToolOptions as McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions }) || {};
    }

    const { defaultTransports, defaultTransport, toolOptions } = options;

    const mcpHandler = async (ctx: IHandlerContext): Promise<void> => {
      if (!ctx.parentParser) {
        console.error(
          "[MCP Server] Critical: MCP server handler called without a parent parser context.",
        );
        process.exit(1);
      }

      console.error(`[${serverInfo.name}] Starting MCP Server...`);

      // Cast parent parser to ArgParserWithMcp to access MCP methods
      const mcpParser = ctx.parentParser as ArgParserWithMcp;

      // Check if multiple transports are specified via CLI
      const transports = ctx.args["transports"] as string;

      if (transports) {
        // Parse multiple transports configuration from CLI
        try {
          const transportConfigs = JSON.parse(transports);
          await mcpParser.startMcpServerWithMultipleTransports(serverInfo, transportConfigs, toolOptions);
        } catch (error: any) {
          console.error("❌ Error parsing transports configuration:", error.message);
          console.error("Expected JSON format: '[{\"type\":\"stdio\"},{\"type\":\"sse\",\"port\":3001}]'");
          process.exit(1);
        }
      } else if (defaultTransports && defaultTransports.length > 0) {
        // Use preset multiple transports configuration
        await mcpParser.startMcpServerWithMultipleTransports(serverInfo, defaultTransports, toolOptions);
      } else if (defaultTransport) {
        // Use preset single transport configuration
        await mcpParser.startMcpServerWithTransport(
          serverInfo,
          defaultTransport.type,
          {
            port: defaultTransport.port,
            host: defaultTransport.host,
            path: defaultTransport.path,
            sessionIdGenerator: defaultTransport.sessionIdGenerator,
          },
          toolOptions
        );
      } else {
        // Single transport mode from CLI flags (backwards compatibility)
        const transportType = (ctx.args["transport"] as "stdio" | "sse" | "streamable-http") || "stdio";
        const transportOptions = {
          port: ctx.args["port"] as number,
          host: ctx.args["host"] as string,
          path: ctx.args["path"] as string,
        };

        await mcpParser.startMcpServerWithTransport(serverInfo, transportType, transportOptions, toolOptions);
      }

      // Keep the process alive
      return new Promise(() => {});
    };

    // Create sub-command parser with transport options
    const mcpSubParser = new ArgParser({}, [
      {
        name: "transport",
        description: "Transport type for MCP server (single transport mode)",
        options: ["--transport", "-t"],
        type: "string",
        enum: ["stdio", "sse", "streamable-http"],
        defaultValue: "stdio",
      },
      {
        name: "transports",
        description: "Multiple transports configuration as JSON array (overrides single transport)",
        options: ["--transports"],
        type: "string",
      },
      {
        name: "port",
        description: "Port number for HTTP-based transports (single transport mode)",
        options: ["--port", "-p"],
        type: "number",
        defaultValue: 3000,
      },
      {
        name: "host",
        description: "Host address for HTTP-based transports (single transport mode)",
        options: ["--host"],
        type: "string",
        defaultValue: "localhost",
      },
      {
        name: "path",
        description: "Path for HTTP-based transports (single transport mode)",
        options: ["--path"],
        type: "string",
        defaultValue: "/mcp",
      },
    ]);

    this.addSubCommand({
      name: subCommandName,
      description: `Start ${serverInfo.name} as an MCP server`,
      handler: mcpHandler,
      parser: mcpSubParser,
      isMcp: true,
    });

    return this;
  }

  /**
   * Factory method to create an ArgParserWithMcp instance with MCP capabilities
   * This provides a clean API for users who want MCP functionality from the start
   */
  public static withMcp<T = any>(
    options?: ConstructorParameters<typeof ArgParser>[0],
    initialFlags?: ConstructorParameters<typeof ArgParser>[1],
  ): ArgParserWithMcp<T> {
    return new ArgParserWithMcp<T>(options as any, initialFlags);
  }

  /**
   * Convert an existing ArgParser instance to ArgParserWithMcp
   * This allows upgrading existing parsers to support MCP
   */
  public static fromArgParser<T = any>(
    parser: ArgParser<T>,
  ): ArgParserWithMcp<T> {
    const originalParser = parser as any;

    // Create new instance with the same configuration as the original
    const mcpParser = new ArgParserWithMcp<T>({
      appName: originalParser.getAppName(),
      appCommandName: originalParser.getAppCommandName(),
      description: originalParser.getDescription(),
      handler: originalParser.getHandler(),
      handleErrors: originalParser["#handleErrors"],
      throwForDuplicateFlags: originalParser["#throwForDuplicateFlags"],
    });

    // Copy flags from original parser (excluding help flag which is auto-added)
    const originalFlags = originalParser.flags.filter(
      (flag: any) => flag.name !== "help",
    );
    if (originalFlags.length > 0) {
      mcpParser.addFlags(originalFlags);
    }

    // Copy additional private fields that aren't in constructor options
    const newParser = mcpParser as any;
    newParser["#subCommandName"] = originalParser["#subCommandName"];
    newParser["#parameters"] = originalParser["#parameters"];
    newParser["#parentParser"] = originalParser["#parentParser"];
    newParser["#lastParseResult"] = originalParser["#lastParseResult"];
    newParser["#inheritParentFlags"] = originalParser["#inheritParentFlags"];
    newParser["#subCommands"] = originalParser["#subCommands"];

    return mcpParser;
  }
}
