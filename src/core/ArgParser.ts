import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";
import {
  convertFlagsToZodSchema,
  createMcpErrorResponse,
  createMcpSuccessResponse,
  generateMcpToolsFromArgParser,
} from "../mcp/mcp-integration";
import type {
  GenerateMcpToolsOptions,
  IMcpToolStructure,
} from "../mcp/mcp-integration";
import {
  compareVersions,
  CURRENT_MCP_PROTOCOL_VERSION,
} from "../mcp/mcp-protocol-versions";
import { ArgParserBase, type IArgParserParams } from "./ArgParserBase";
import type {
  IFlag,
  IHandlerContext,
  OutputSchemaConfig,
  ParseResult,
} from "./types";
import { createOutputSchema } from "./types";

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
 * Extended server information for DXT package generation and MCP server metadata
 * This type includes logo support for MCP servers and DXT packages
 */
export type DxtServerInfo = {
  name: string;
  version: string;
  description?: string;
  /** Author information for DXT manifest */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  /** Repository information for DXT manifest */
  repository?: {
    type: string;
    url: string;
  };
  /** License identifier for DXT manifest */
  license?: string;
  /** Homepage URL for DXT manifest */
  homepage?: string;
  /** Documentation URL for DXT manifest */
  documentation?: string;
  /** Support/issues URL for DXT manifest */
  support?: string;
  /** Keywords for DXT manifest */
  keywords?: string[];
  /**
   * Logo/icon for DXT manifest and MCP server - can be a local file path or URL
   * This is where logo support is provided for MCP-enabled ArgParser instances
   */
  logo?: string;
};

/**
 * MCP server configuration options for withMcp() method
 * This centralizes MCP server metadata that was previously scattered across addMcpSubCommand calls
 */
export type McpServerOptions = {
  /** MCP server metadata */
  serverInfo?: DxtServerInfo;
  /** Default transport configurations for the MCP server */
  defaultTransports?: McpTransportConfig[];
  /** Single default transport configuration (alternative to defaultTransports) */
  defaultTransport?: McpTransportConfig;
  /** Tool generation options for the MCP server */
  toolOptions?: GenerateMcpToolsOptions;
};

/**
 * Combined options for withMcp() method
 */
export type WithMcpOptions<THandlerReturn = any> =
  IArgParserParams<THandlerReturn> & {
    /** MCP-specific server configuration */
    mcp?: McpServerOptions;
  };

/**
 * Type alias for clarity - ArgParser options with MCP capabilities
 * This provides a clearer name for WithMcpOptions
 */
export type ArgParserWithMcpOptions<THandlerReturn = any> =
  WithMcpOptions<THandlerReturn>;

/**
 * Configuration for an individual MCP tool (deprecated - use ToolConfig instead)
 * @deprecated Use ToolConfig and addTool() instead. Will be removed in v2.0.
 */
export type McpToolConfig = {
  /** Tool name (must be unique within the server) */
  name: string;
  /** Tool description */
  description?: string;
  /** Input schema for the tool (Zod schema) */
  inputSchema?: any; // ZodTypeAny from zod
  /** Output schema for the tool (Zod schema) */
  outputSchema?: any; // ZodTypeAny from zod
  /** Handler function for the tool */
  handler: (args: any) => Promise<any> | any;
};

/**
 * Configuration for a unified tool that works in both CLI and MCP modes
 */
export type ToolConfig = {
  /** Tool name (CLI subcommand name & MCP tool name) */
  name: string;
  /** Tool description */
  description?: string;
  /** Flags for this tool (auto-converted to MCP schema) */
  flags: readonly IFlag[];
  /** Handler function for the tool */
  handler: (ctx: IHandlerContext) => Promise<any> | any;
  /** Output schema for this tool (predefined pattern, Zod schema, or schema definition object) */
  outputSchema?: OutputSchemaConfig;
};

/**
 * ArgParser with Model Context Protocol (MCP) integration capabilities.
 *
 * This class adds MCP server functionality on top of the standard ArgParser,
 * allowing CLI tools to be easily exposed as MCP tools with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const parser = new ArgParser({
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
export class ArgParser<
  THandlerReturn = any,
> extends ArgParserBase<THandlerReturn> {
  /** Stored MCP server configuration from withMcp() */
  private _mcpServerConfig?: McpServerOptions;

  /** Registered MCP tools (deprecated) */
  private _mcpTools: Map<string, McpToolConfig> = new Map();

  /** Registered unified tools */
  private _tools: Map<string, ToolConfig> = new Map();

  /** Output schema management */
  private _defaultOutputSchema?: import("zod").ZodTypeAny;
  private _outputSchemaMap: Map<string, import("zod").ZodTypeAny> = new Map();
  private _autoGenerateOutputSchema?:
    | boolean
    | keyof typeof import("./types").OutputSchemaPatterns;

  /** MCP version for output schema compatibility */
  private _mcpProtocolVersion: string = CURRENT_MCP_PROTOCOL_VERSION;

  /**
   * Get the stored MCP server configuration
   * @returns MCP server configuration if set via withMcp(), undefined otherwise
   */
  public getMcpServerConfig(): McpServerOptions | undefined {
    return this._mcpServerConfig;
  }

  /**
   * Set a default output schema for all MCP tools generated from this parser
   * @param schema - Predefined pattern name, Zod schema, or schema definition object
   * @returns This ArgParser instance for chaining
   */
  public setDefaultOutputSchema(schema: OutputSchemaConfig): this {
    this._defaultOutputSchema = createOutputSchema(schema);
    return this;
  }

  /**
   * Set an output schema for a specific tool/command
   * @param toolName - Name of the tool/command
   * @param schema - Predefined pattern name, Zod schema, or schema definition object
   * @returns This ArgParser instance for chaining
   */
  public setOutputSchema(toolName: string, schema: OutputSchemaConfig): this {
    this._outputSchemaMap.set(toolName, createOutputSchema(schema));
    return this;
  }

  /**
   * Enable automatic output schema generation for MCP tools
   * @param pattern - True for default pattern, or specific pattern name
   * @returns This ArgParser instance for chaining
   */
  public enableAutoOutputSchema(
    pattern:
      | boolean
      | keyof typeof import("./types").OutputSchemaPatterns = true,
  ): this {
    this._autoGenerateOutputSchema = pattern;
    return this;
  }

  /**
   * Set the MCP protocol version for compatibility checks
   * @param version - MCP protocol version (e.g., "2025-06-18")
   * @returns This ArgParser instance for chaining
   */
  public setMcpProtocolVersion(version: string): this {
    this._mcpProtocolVersion = version;
    return this;
  }

  /**
   * Check if the current MCP protocol version supports output schemas
   * Output schemas were introduced in MCP version 2025-06-18
   * @returns true if output schemas are supported
   */
  private supportsOutputSchemas(): boolean {
    // Output schemas were introduced in MCP version 2025-06-18
    return compareVersions(this._mcpProtocolVersion, "2025-06-18") >= 0;
  }

  /**
   * Add a unified tool that works in both CLI and MCP modes
   * In CLI mode, the tool becomes a subcommand with its own flags
   * In MCP mode, the tool becomes an MCP tool with auto-generated schema
   *
   * @param toolConfig Configuration for the tool
   * @returns This ArgParser instance for chaining
   */
  public addTool(toolConfig: ToolConfig): this {
    if (this._tools.has(toolConfig.name)) {
      throw new Error(`Tool with name '${toolConfig.name}' already exists`);
    }

    // Validate tool configuration
    if (!toolConfig.name || typeof toolConfig.name !== "string") {
      throw new Error("Tool name is required and must be a string");
    }

    if (!toolConfig.handler || typeof toolConfig.handler !== "function") {
      throw new Error("Tool handler is required and must be a function");
    }

    if (!Array.isArray(toolConfig.flags)) {
      throw new Error("Tool flags must be an array");
    }

    // Store the tool configuration
    this._tools.set(toolConfig.name, toolConfig);

    // Register the tool as a CLI subcommand
    this.#registerToolAsSubCommand(toolConfig);

    return this;
  }

  /**
   * Register a tool as a CLI subcommand
   * @private
   */
  #registerToolAsSubCommand(toolConfig: ToolConfig): void {
    // Create a new ArgParser instance for this tool's subcommand
    const toolParser = new ArgParserBase(
      {
        appName: `${this.getAppName()} ${toolConfig.name}`,
        description:
          toolConfig.description || `Execute ${toolConfig.name} tool`,
        handler: toolConfig.handler,
      },
      toolConfig.flags,
    );

    // Add the subcommand to this parser
    this.addSubCommand({
      name: toolConfig.name,
      description: toolConfig.description || `Execute ${toolConfig.name} tool`,
      parser: toolParser,
      handler: toolConfig.handler,
    });
  }

  /**
   * Add an MCP tool to this parser (deprecated)
   * @deprecated Use addTool() instead. This method will be removed in v2.0.
   * @param toolConfig Configuration for the MCP tool
   * @returns This ArgParser instance for chaining
   */
  public addMcpTool(toolConfig: McpToolConfig): this {
    console.warn(`[DEPRECATED] addMcpTool() is deprecated and will be removed in v2.0.
Please use addTool() instead for a unified CLI/MCP experience.
Migration guide: https://github.com/alcyone-labs/arg-parser/blob/main/docs/MCP-MIGRATION.md`);

    if (this._mcpTools.has(toolConfig.name)) {
      throw new Error(`MCP tool with name '${toolConfig.name}' already exists`);
    }

    this._mcpTools.set(toolConfig.name, toolConfig);
    return this;
  }

  /**
   * Get all registered unified tools
   * @returns Map of tool names to tool configurations
   */
  public getTools(): Map<string, ToolConfig> {
    return new Map(this._tools);
  }

  /**
   * Get all registered MCP tools (deprecated)
   * @deprecated Use getTools() instead
   * @returns Map of tool names to tool configurations
   */
  public getMcpTools(): Map<string, McpToolConfig> {
    return new Map(this._mcpTools);
  }

  /**
   * Get information about all available tools (unified, legacy MCP, and CLI-generated)
   * @param options Optional configuration for MCP tool generation
   * @returns Object with tool counts and names for debugging
   */
  public getToolInfo(options?: GenerateMcpToolsOptions): {
    unifiedTools: string[];
    legacyMcpTools: string[];
    cliTools: string[];
    totalTools: number;
    duplicates: string[];
  } {
    const cliTools = generateMcpToolsFromArgParser(this, options);
    const unifiedToolNames = Array.from(this._tools.keys());
    const legacyMcpToolNames = Array.from(this._mcpTools.keys());
    const cliToolNames = cliTools.map((t) => t.name);

    // Find duplicates (tools that exist in multiple categories)
    const allToolNames = [
      ...unifiedToolNames,
      ...legacyMcpToolNames,
      ...cliToolNames,
    ];
    const duplicates = allToolNames.filter(
      (name, index) => allToolNames.indexOf(name) !== index,
    );

    // Calculate total unique tools (unified tools take precedence)
    const uniqueToolNames = new Set(allToolNames);

    return {
      unifiedTools: unifiedToolNames,
      legacyMcpTools: legacyMcpToolNames,
      cliTools: cliToolNames,
      totalTools: uniqueToolNames.size,
      duplicates: Array.from(new Set(duplicates)),
    };
  }

  /**
   * Get information about all available MCP tools (legacy method)
   * @deprecated Use getToolInfo() instead
   * @param options Optional configuration for MCP tool generation
   * @returns Object with tool counts and names for debugging
   */
  public getMcpToolInfo(options?: GenerateMcpToolsOptions): {
    manualTools: string[];
    cliTools: string[];
    totalTools: number;
    duplicates: string[];
  } {
    const toolInfo = this.getToolInfo(options);
    return {
      manualTools: [...toolInfo.unifiedTools, ...toolInfo.legacyMcpTools],
      cliTools: toolInfo.cliTools,
      totalTools: toolInfo.totalTools,
      duplicates: toolInfo.duplicates,
    };
  }

  /**
   * Validate that all tools are properly registered and routable
   * @returns Validation results
   */
  public validateToolRouting(): {
    isValid: boolean;
    issues: string[];
    cliSubcommands: string[];
    mcpTools: string[];
  } {
    const issues: string[] = [];
    const cliSubcommands: string[] = [];
    const mcpTools: string[] = [];

    // Check CLI subcommand registration
    const subCommands = this.getSubCommands();
    if (subCommands) {
      for (const [name] of subCommands) {
        cliSubcommands.push(name);
      }
    }

    // Check MCP tool registration
    const mcpToolStructures = this.toMcpTools();
    for (const tool of mcpToolStructures) {
      mcpTools.push(tool.name);
    }

    // Validate that unified tools are registered in both CLI and MCP
    for (const [toolName] of this._tools) {
      if (!cliSubcommands.includes(toolName)) {
        issues.push(
          `Unified tool '${toolName}' is not registered as CLI subcommand`,
        );
      }
      if (!mcpTools.includes(toolName)) {
        issues.push(`Unified tool '${toolName}' is not registered as MCP tool`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      cliSubcommands,
      mcpTools,
    };
  }

  /**
   * Test tool routing by simulating a tool call
   * This is useful for debugging and ensuring tools are properly registered
   * @param toolName Name of the tool to test
   * @param args Arguments to pass to the tool
   * @returns Promise with the tool execution result or error
   */
  public async testMcpToolRouting(
    toolName: string,
    args: any = {},
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    executionTime?: number;
  }> {
    try {
      const tools = this.toMcpTools();
      const tool = tools.find((t) => t.name === toolName);

      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found. Available tools: ${tools.map((t) => t.name).join(", ")}`,
        };
      }

      const startTime = Date.now();
      const result = await tool.execute(args);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate MCP tools from this ArgParser instance
   * @param options Optional configuration for MCP tool generation
   * @returns Array of MCP tool structures ready for server registration
   */
  public toMcpTools(options?: GenerateMcpToolsOptions): IMcpToolStructure[] {
    // Merge instance-level output schema settings with options
    const mergedOptions: GenerateMcpToolsOptions = {
      ...options,
      // Merge output schema maps (options take precedence)
      outputSchemaMap: {
        ...Object.fromEntries(this._outputSchemaMap),
        ...options?.outputSchemaMap,
      },
      // Use instance default if not specified in options
      defaultOutputSchema:
        options?.defaultOutputSchema || this._defaultOutputSchema,
      // Use instance auto-generate setting if not specified in options
      autoGenerateOutputSchema:
        options?.autoGenerateOutputSchema ?? this._autoGenerateOutputSchema,
    };

    // Generate tools from CLI structure (legacy approach)
    const cliTools = generateMcpToolsFromArgParser(this, mergedOptions);

    // Convert unified tools to MCP tool structures
    const unifiedTools: IMcpToolStructure[] = Array.from(
      this._tools.values(),
    ).map((toolConfig) => {
      // Determine output schema for this tool
      let outputSchema: import("zod").ZodTypeAny | undefined;

      // Priority: explicit schema map > tool-level schema > default schema > auto-generated schema
      if (mergedOptions.outputSchemaMap?.[toolConfig.name]) {
        outputSchema = mergedOptions.outputSchemaMap[toolConfig.name];
      } else if (toolConfig.outputSchema) {
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] Tool '${toolConfig.name}' has outputSchema:`,
            typeof toolConfig.outputSchema,
          );
          console.error(
            `[MCP Debug] outputSchema has _def:`,
            !!(
              toolConfig.outputSchema &&
              typeof toolConfig.outputSchema === "object" &&
              "_def" in toolConfig.outputSchema
            ),
          );
        }
        outputSchema = createOutputSchema(toolConfig.outputSchema);
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] Created output schema for '${toolConfig.name}':`,
            !!outputSchema,
          );
        }
      } else if (mergedOptions.defaultOutputSchema) {
        outputSchema = mergedOptions.defaultOutputSchema;
      } else if (mergedOptions.autoGenerateOutputSchema) {
        if (typeof mergedOptions.autoGenerateOutputSchema === "string") {
          outputSchema = createOutputSchema(
            mergedOptions.autoGenerateOutputSchema,
          );
        } else if (mergedOptions.autoGenerateOutputSchema === true) {
          outputSchema = createOutputSchema("successWithData");
        }
      }

      // Only include output schema if the MCP protocol version supports it
      if (outputSchema && !this.supportsOutputSchemas()) {
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] Output schema for '${toolConfig.name}' removed due to MCP version ${this._mcpProtocolVersion} not supporting output schemas`,
          );
        }
        outputSchema = undefined;
      }

      return {
        name: toolConfig.name,
        description:
          toolConfig.description || `Executes the ${toolConfig.name} tool.`,
        inputSchema: convertFlagsToZodSchema(toolConfig.flags),
        outputSchema,
        execute: async (args: any) => {
          // Hijack console for MCP mode to prevent STDOUT contamination
          const originalConsole = globalThis.console;
          let mcpLogger: any = null;

          try {
            // Try to import and setup MCP logger for this tool execution
            try {
              const mcpLoggerModule = await Function(
                'return import("@alcyone-labs/simple-mcp-logger")',
              )();
              mcpLogger = mcpLoggerModule.createMcpLogger(
                `MCP-Tool-${toolConfig.name}`,
              );
              // Hijack console globally to prevent STDOUT contamination
              (globalThis as any).console = mcpLogger;
            } catch {
              // Fallback: create a minimal logger that redirects to stderr
              // Use originalConsole to avoid circular reference
              mcpLogger = {
                log: (...args: any[]) =>
                  originalConsole.error(`[${toolConfig.name}]`, ...args),
                info: (...args: any[]) =>
                  originalConsole.error(`[${toolConfig.name}]`, ...args),
                warn: (...args: any[]) =>
                  originalConsole.error(`[${toolConfig.name}]`, ...args),
                error: (...args: any[]) =>
                  originalConsole.error(`[${toolConfig.name}]`, ...args),
                debug: (...args: any[]) =>
                  originalConsole.error(`[${toolConfig.name}]`, ...args),
              };
              (globalThis as any).console = mcpLogger;
            }

            // Create handler context similar to CLI mode
            const context: IHandlerContext = {
              args,
              parentArgs: {},
              commandChain: [toolConfig.name],
              parser: this,
              isMcp: true,
            };

            const startTime = Date.now();
            const result = await toolConfig.handler(context);
            const executionTime = Date.now() - startTime;

            // Log successful execution for debugging
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Tool] '${toolConfig.name}' executed successfully in ${executionTime}ms`,
              );
            }

            // Ensure the result is properly formatted for MCP
            if (result && typeof result === "object" && "content" in result) {
              // Already in MCP format - ensure structuredContent is present if output schema exists and is supported
              if (
                outputSchema &&
                this.supportsOutputSchemas() &&
                !result.structuredContent
              ) {
                result.structuredContent = result;
              }
              return result;
            } else {
              // Format response consistently - include structuredContent when output schema is present and supported
              if (
                outputSchema &&
                this.supportsOutputSchemas() &&
                result &&
                typeof result === "object"
              ) {
                // Include structuredContent when output schema is present and version supports it
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                  structuredContent: result,
                };
              } else {
                // Wrap in standard MCP response format
                return createMcpSuccessResponse(result);
              }
            }
          } catch (error) {
            // Enhanced error handling with proper MCP error response format
            const errorMessage = `Tool '${toolConfig.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`;

            if (process.env["MCP_DEBUG"]) {
              console.error(`[MCP Tool Error] ${errorMessage}`);
              if (error instanceof Error && error.stack) {
                console.error(`[MCP Tool Stack] ${error.stack}`);
              }
            }

            // Return MCP-compliant error response
            return createMcpErrorResponse(errorMessage);
          } finally {
            // Restore original console
            globalThis.console = originalConsole;
          }
        },
      };
    });

    // Convert legacy MCP tools to MCP tool structures (deprecated)
    const legacyMcpTools: IMcpToolStructure[] = Array.from(
      this._mcpTools.values(),
    ).map((toolConfig) => ({
      name: toolConfig.name,
      description:
        toolConfig.description || `Executes the ${toolConfig.name} tool.`,
      inputSchema: toolConfig.inputSchema || { type: "object", properties: {} },
      outputSchema: toolConfig.outputSchema,
      execute: async (args: any) => {
        try {
          const startTime = Date.now();
          const result = await toolConfig.handler(args);
          const executionTime = Date.now() - startTime;

          if (process.env["MCP_DEBUG"]) {
            console.error(
              `[MCP Tool] '${toolConfig.name}' (legacy) executed successfully in ${executionTime}ms`,
            );
          }

          if (result && typeof result === "object" && "content" in result) {
            // If tool has output schema and version supports it, ensure structuredContent is present
            if (
              toolConfig.outputSchema &&
              this.supportsOutputSchemas() &&
              !result.structuredContent
            ) {
              result.structuredContent = result;
            }
            return result;
          } else {
            // Format response consistently with CLI-generated tools
            if (
              toolConfig.outputSchema &&
              this.supportsOutputSchemas() &&
              result &&
              typeof result === "object"
            ) {
              // Include structuredContent when output schema is present and version supports it
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                  },
                ],
                structuredContent: result,
              };
            } else {
              return createMcpSuccessResponse(result);
            }
          }
        } catch (error) {
          const errorMessage = `Tool '${toolConfig.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`;

          if (process.env["MCP_DEBUG"]) {
            console.error(`[MCP Tool Error] ${errorMessage}`);
          }

          return createMcpErrorResponse(errorMessage);
        }
      },
    }));

    // Combine all tools (unified tools take precedence over legacy tools, which take precedence over CLI-generated tools)
    const allTools = [...unifiedTools, ...legacyMcpTools, ...cliTools];
    const uniqueTools = allTools.reduce((acc, tool) => {
      const existingTool = acc.find((t) => t.name === tool.name);
      if (!existingTool) {
        acc.push(tool);
      } else {
        // Log when a tool is being overridden
        const toolSource = unifiedTools.find((t) => t.name === tool.name)
          ? "unified"
          : legacyMcpTools.find((t) => t.name === tool.name)
            ? "legacy MCP"
            : "CLI-generated";
        console.warn(
          `[MCP Tool Registration] ${toolSource} tool '${tool.name}' overrides other tool definitions`,
        );
      }
      return acc;
    }, [] as IMcpToolStructure[]);

    return uniqueTools;
  }

  /**
   * Create an MCP server with tools generated from this ArgParser
   * @param serverInfo Server configuration
   * @param toolOptions Optional MCP tool generation options
   * @returns Configured MCP server instance
   */
  public async createMcpServer(
    serverInfo?: DxtServerInfo,
    toolOptions?: GenerateMcpToolsOptions,
  ): Promise<any> {
    const logger = createMcpLogger("MCP Server Creation", "./logs/mcp.log");

    try {
      // Use provided serverInfo or fall back to internal MCP configuration
      const effectiveServerInfo =
        serverInfo || this._mcpServerConfig?.serverInfo;

      if (!effectiveServerInfo) {
        throw new Error(
          "No MCP server configuration found. Use withMcp() to configure server info or provide serverInfo parameter.",
        );
      }

      logger.mcpError(
        `Creating MCP server: ${effectiveServerInfo.name} v${effectiveServerInfo.version}`,
      );

      // Dynamic import to avoid circular dependencies and support ES modules
      const { McpServer } = await import(
        "@modelcontextprotocol/sdk/server/mcp.js"
      );
      logger.mcpError("Successfully imported McpServer from SDK");

      const server = new McpServer({
        id: effectiveServerInfo.name,
        version: effectiveServerInfo.version,
        name: effectiveServerInfo.name,
        description: effectiveServerInfo.description,
      });

      logger.mcpError("Successfully created McpServer instance");

      // Note: We now register actual resources and prompts below, so no need for internal handlers
      logger.mcpError(
        "MCP server will register actual resources and prompts for full capability support",
      );

      // Generate tools from this ArgParser instance
      logger.mcpError("Generating MCP tools from ArgParser");
      const tools = this.toMcpTools(toolOptions);
      logger.mcpError(`Generated ${tools.length} MCP tools`);

      // Deduplicate tools by name to avoid registration conflicts
      const uniqueTools = tools.reduce((acc, tool) => {
        if (!acc.find((t) => t.name === tool.name)) {
          acc.push(tool);
        }
        return acc;
      }, [] as IMcpToolStructure[]);

      logger.mcpError(
        `After deduplication: ${uniqueTools.length} unique tools`,
      );

      // Register tools
      uniqueTools.forEach((tool) => {
        logger.mcpError(`Registering tool: ${tool.name}`);

        // Convert Zod object schema to the format MCP SDK expects: { key: zodSchema, ... }
        let inputSchema: any;

        if (tool.inputSchema === null || tool.inputSchema === undefined) {
          // Empty object for tools with no input parameters
          inputSchema = {};
        } else if (
          tool.inputSchema &&
          typeof tool.inputSchema === "object" &&
          tool.inputSchema !== null &&
          tool.inputSchema._def
        ) {
          // For Zod object schemas, extract the shape directly as the MCP SDK expects
          const zodObjectSchema = tool.inputSchema as any;
          if (zodObjectSchema._def.typeName === "ZodObject") {
            // In newer versions of Zod, _def.shape is a function that needs to be called
            const shapeGetter = zodObjectSchema._def.shape;
            const shape =
              typeof shapeGetter === "function" ? shapeGetter() : shapeGetter;

            // Use the shape directly - this matches the working minimal MCP server format
            inputSchema = shape;
          } else {
            // Not a Zod object, use as-is
            inputSchema = tool.inputSchema;
          }
        } else {
          // Use as-is if it's not a Zod object
          inputSchema = tool.inputSchema || {};
        }

        const toolConfig: any = {
          title: tool.name, // MCP SDK requires title field
          description: tool.description || "No description provided.",
          inputSchema: inputSchema, // Use Zod shape directly for MCP SDK compatibility
        };

        // TODO: Include output schema in MCP tool registration for MCP 2025-06-18+ clients
        // Currently commented out as MCP SDK v1.15.1 doesn't support outputSchema in registerTool
        // This should be conditionally enabled based on negotiated protocol version
        // Unlike input schemas, output schemas should remain as Zod schema objects
        // for proper validation by the MCP integration layer
        /*
        if (tool.outputSchema) {
          toolConfig.outputSchema = tool.outputSchema;
        }
        */

        // Simple tool execution that matches the working minimal MCP server pattern
        const simpleExecute = async (args: any) => {
          if (process.env["MCP_DEBUG"]) {
            console.error(
              `[MCP Simple Execute] 🎯 TOOL CALLED: '${tool.name}' with args:`,
              JSON.stringify(args, null, 2),
            );
          }

          try {
            // Call the tool's execute method directly
            const result = await tool.execute(args);

            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Simple Execute] Tool '${tool.name}' returned:`,
                JSON.stringify(result, null, 2),
              );
            }

            // If result already has content field, return as-is
            if (
              result &&
              typeof result === "object" &&
              result.content &&
              Array.isArray(result.content)
            ) {
              return result;
            }

            // Otherwise, wrap in MCP content format
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    typeof result === "string"
                      ? result
                      : JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Simple Execute] Tool '${tool.name}' error:`,
                errorMessage,
              );
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${errorMessage}`,
                },
              ],
              isError: true,
            };
          }
        };

        server.registerTool(tool.name, toolConfig, simpleExecute);
      });

      logger.mcpError("Successfully registered all tools with MCP server");

      // TODO: Register resources (temporarily disabled due to MCP SDK type compatibility issues)
      const resources = this.getMcpResources();
      logger.mcpError(
        `Found ${resources.length} MCP resources (registration temporarily disabled)`,
      );

      // Note: Resource registration will be implemented in a future update once MCP SDK types are resolved
      if (resources.length > 0) {
        logger.mcpError(
          "Resource registration is temporarily disabled due to MCP SDK type compatibility",
        );
        logger.mcpError(
          "Resources are stored and will be available once SDK integration is completed",
        );
      }

      logger.mcpError(
        "Resource registration step completed (temporarily disabled)",
      );

      // TODO: Register prompts (temporarily disabled due to MCP SDK type compatibility issues)
      const prompts = this.getMcpPrompts();
      logger.mcpError(
        `Found ${prompts.length} MCP prompts (registration temporarily disabled)`,
      );

      // Note: Prompt registration will be implemented in a future update once MCP SDK types are resolved
      if (prompts.length > 0) {
        logger.mcpError(
          "Prompt registration is temporarily disabled due to MCP SDK type compatibility",
        );
        logger.mcpError(
          "Prompts are stored and will be available once SDK integration is completed",
        );
      }

      logger.mcpError(
        "Prompt registration step completed (temporarily disabled)",
      );

      // Set up change notifications
      this.setupMcpChangeNotifications(server);
      logger.mcpError("Successfully set up MCP change notifications");

      return server;
    } catch (error) {
      logger.mcpError(
        `Error creating MCP server: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.mcpError(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Set up change notifications for the MCP server
   * @param _server The MCP server instance (unused for now, but reserved for future client connection tracking)
   */
  private setupMcpChangeNotifications(_server: any): void {
    // Set up connection tracking (this would be enhanced with actual client connections)
    // For now, we'll set up the infrastructure for future client management

    // Add listeners for resource/prompt changes to notify the server
    this.onMcpChange((event) => {
      // When resources/prompts change, we could notify connected clients
      // The actual notification sending would happen when clients are connected
      const logger = createMcpLogger("MCP Change Notifications");
      logger.mcpError(
        `MCP ${event.type} ${event.action}: ${event.entityName || "unknown"}`,
      );
    });
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
    return this.startMcpServerWithTransport(
      serverInfo,
      "stdio",
      {},
      toolOptions,
    );
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
    const server = await this.createMcpServer(serverInfo, toolOptions);
    const startPromises: Promise<void>[] = [];

    for (const transportConfig of transports) {
      const promise = this.#_startSingleTransport(
        server,
        serverInfo,
        transportConfig,
      );
      startPromises.push(promise);
    }

    await Promise.all(startPromises);
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
    const server = await this.createMcpServer(serverInfo, toolOptions);
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
    const logger = createMcpLogger("MCP Transport", "./logs/mcp.log");

    try {
      logger.mcpError(
        `Starting ${transportConfig.type} transport for server: ${serverInfo.name}`,
      );

      switch (transportConfig.type) {
        case "stdio": {
          logger.mcpError("Importing StdioServerTransport from SDK");
          const { StdioServerTransport } = await import(
            "@modelcontextprotocol/sdk/server/stdio.js"
          );
          logger.mcpError("Creating StdioServerTransport instance");
          const transport = new StdioServerTransport();
          logger.mcpError("Connecting server to stdio transport");
          await server.connect(transport);
          logger.mcpError("Successfully connected to stdio transport");
          break;
        }

        case "sse": {
          const { SSEServerTransport } = await import(
            "@modelcontextprotocol/sdk/server/sse.js"
          );
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
              console.error(
                `[${serverInfo.name}] MCP Server listening on http://${transportConfig.host || "localhost"}:${port}${path} (SSE)`,
              );
              resolve();
            });
          });
          break;
        }

        case "streamable-http": {
          const { StreamableHTTPServerTransport } = await import(
            "@modelcontextprotocol/sdk/server/streamableHttp.js"
          );
          const express = (await import("express")).default;

          const app = express();
          app.use(express.json());

          const port = transportConfig.port || 3000;
          const path = transportConfig.path || "/mcp";

          const transports: { [sessionId: string]: any } = {};

          app.all(path, async (req: any, res: any) => {
            const sessionId = req.headers["mcp-session-id"] as
              | string
              | undefined;
            let transport: any;

            if (sessionId && transports[sessionId]) {
              transport = transports[sessionId];
            } else {
              transport = new StreamableHTTPServerTransport({
                sessionIdGenerator:
                  transportConfig.sessionIdGenerator ||
                  (() => Math.random().toString(36).substring(7)),
                onsessioninitialized: (sessionId: string) => {
                  transports[sessionId] = transport;
                },
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
              resolve();
            });
          });
          break;
        }

        default:
          logger.mcpError(
            `Unsupported transport type: ${transportConfig.type}`,
          );
          throw new Error(
            `Unsupported transport type: ${transportConfig.type}`,
          );
      }

      logger.mcpError(`Successfully started ${transportConfig.type} transport`);
    } catch (error) {
      logger.mcpError(
        `Error starting ${transportConfig.type} transport: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.mcpError(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  public async parse(processArgs: string[], options?: any): Promise<any> {
    // Call the base class parse method directly to avoid any override issues
    let result = await ArgParserBase.prototype.parse.call(
      this,
      processArgs,
      options,
    );

    // If fuzzy mode prevented execution, return the result as-is
    const anyResult = result as any;
    if (anyResult._fuzzyModePreventedExecution) {
      return result;
    }

    // Only process async handler promise if deep option is true (default) and ArgParserBase didn't handle it
    // When deep is false, leave _asyncHandlerPromise for manual handling
    const shouldAutoProcess = options?.deep !== false;
    if (shouldAutoProcess && (result as any)._asyncHandlerPromise) {
      result = await this.#processAsyncHandlerPromise(result);
    }

    return result;
  }

  /**
   * CLI-friendly parse method that automatically handles ParseResult objects
   * When autoExit is false, this method will call process.exit() based on ParseResult
   * This ensures backward compatibility for CLI applications
   */
  public parseForCli(processArgs: string[], options?: any): any {
    const result = this.parse(processArgs, options);

    // Handle ParseResult objects when autoExit is false
    if (
      result &&
      typeof result === "object" &&
      "success" in result &&
      "exitCode" in result
    ) {
      const parseResult = result as ParseResult;
      if (
        parseResult.shouldExit &&
        typeof process === "object" &&
        typeof process.exit === "function"
      ) {
        process.exit(parseResult.exitCode as never);
      }
    }

    return result;
  }

  /**
   * Alias for parse() method for backward compatibility
   * Since parse() is already async, this just calls parse()
   *
   * @deprecated Use parse() instead. This method will be removed in a future version.
   */
  public parseAsync(processArgs: string[], options?: any): Promise<any> {
    return this.parse(processArgs, options);
  }

  async #processAsyncHandlerPromise(result: any): Promise<any> {
    const anyResult = result as any;

    // Check if there's an async handler that needs to be awaited
    if (anyResult._asyncHandlerPromise) {
      try {
        const handlerResult = await anyResult._asyncHandlerPromise;
        anyResult.handlerResponse = handlerResult;

        // Merge handler result into final args if it's an object
        if (
          handlerResult &&
          typeof handlerResult === "object" &&
          !Array.isArray(handlerResult)
        ) {
          Object.assign(anyResult, handlerResult);
        }
      } catch (error) {
        // Handle async handler errors - respect the handleErrors setting
        if ((this as any)["#handleErrors"]) {
          // When handleErrors is true, catch and wrap the error
          anyResult.$error = {
            type: "handler_error",
            message: error instanceof Error ? error.message : String(error),
            details: error,
          };
        } else {
          // When handleErrors is false, throw the error (consistent with sync behavior)
          throw error;
        }
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
   * @param serverInfo Server configuration (supports extended DXT fields)
   * @param options Optional configuration including preset transports and tool options
   * @returns This ArgParserWithMcp instance for chaining
   * @deprecated Use withMcp() to configure server metadata and --s-mcp-serve system flag instead. This method will be removed in v2.0.
   */
  public addMcpSubCommand(
    subCommandName: string | undefined,
    serverInfo: DxtServerInfo,
    options?: McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions },
  ): this;

  /**
   * Add an MCP sub-command that starts an MCP server exposing this parser's functionality
   * @param subCommandName Name of the sub-command (default: "mcp-server")
   * @param serverInfo Server configuration (supports extended DXT fields)
   * @param toolOptions Optional MCP tool generation options (backward compatibility)
   * @returns This ArgParserWithMcp instance for chaining
   * @deprecated Use withMcp() to configure server metadata and --s-mcp-serve system flag instead. This method will be removed in v2.0.
   */
  public addMcpSubCommand(
    subCommandName: string | undefined,
    serverInfo: DxtServerInfo,
    toolOptions?: GenerateMcpToolsOptions,
  ): this;

  public addMcpSubCommand(
    subCommandName: string | undefined = "mcp-server",
    serverInfo: DxtServerInfo,
    optionsOrToolOptions?:
      | (McpSubCommandOptions & { toolOptions?: GenerateMcpToolsOptions })
      | GenerateMcpToolsOptions,
  ): this {
    // Emit deprecation warning
    console.warn(`[DEPRECATED] addMcpSubCommand() is deprecated and will be removed in v2.0.
Please use withMcp() to configure server metadata and the --s-mcp-serve system flag instead.
Migration guide: https://github.com/alcyone-labs/arg-parser/blob/main/docs/MCP-MIGRATION.md`);

    // Handle backward compatibility: if the third parameter is a GenerateMcpToolsOptions object
    // (detected by checking if it has properties that only exist in GenerateMcpToolsOptions)
    let options: McpSubCommandOptions & {
      toolOptions?: GenerateMcpToolsOptions;
    };

    if (
      optionsOrToolOptions &&
      typeof optionsOrToolOptions === "object" &&
      ("includeSubCommands" in optionsOrToolOptions ||
        "toolNamePrefix" in optionsOrToolOptions ||
        "toolNameSuffix" in optionsOrToolOptions)
    ) {
      // This is the old GenerateMcpToolsOptions format
      options = {
        toolOptions: optionsOrToolOptions as GenerateMcpToolsOptions,
      };
    } else {
      // This is the new options format or undefined
      options =
        (optionsOrToolOptions as McpSubCommandOptions & {
          toolOptions?: GenerateMcpToolsOptions;
        }) || {};
    }

    const { defaultTransports, defaultTransport, toolOptions } = options;

    // Store server configuration for backward compatibility with --s-mcp-serve
    if (!this._mcpServerConfig) {
      this._mcpServerConfig = {
        serverInfo,
        defaultTransports,
        defaultTransport,
        toolOptions,
      };
    }

    const mcpHandler = async (ctx: IHandlerContext): Promise<void> => {
      // Hijack console globally to prevent STDOUT contamination in MCP mode
      const logger = createMcpLogger("MCP Handler");
      // Ensure the logger is properly cast as Console interface
      (globalThis as any).console = logger;

      try {
        logger.mcpError(
          "MCP handler started - console hijacked for MCP safety",
        );
        logger.mcpError(`Handler context args: ${JSON.stringify(ctx.args)}`);

        if (!ctx.parentParser) {
          logger.mcpError(
            "Critical: MCP server handler called without a parent parser context.",
          );
          process.exit(1);
        }

        logger.mcpError("Parent parser found, casting to ArgParser");
        // Cast parent parser to ArgParser to access MCP methods
        const mcpParser = ctx.parentParser as ArgParser;

        // Check if multiple transports are specified via CLI
        logger.mcpError("Checking transport configuration");
        const transports = ctx.args["transports"] as string;

        if (transports) {
          logger.mcpError(
            `Multiple transports specified via CLI: ${transports}`,
          );
          // Parse multiple transports configuration from CLI
          try {
            const transportConfigs = JSON.parse(transports);
            logger.mcpError(
              `Parsed transport configs: ${JSON.stringify(transportConfigs)}`,
            );
            await mcpParser.startMcpServerWithMultipleTransports(
              serverInfo,
              transportConfigs,
              toolOptions,
            );
          } catch (error: any) {
            logger.mcpError(
              `Error parsing transports configuration: ${error.message}`,
            );
            logger.mcpError(
              'Expected JSON format: \'[{"type":"stdio"},{"type":"sse","port":3001}]\'',
            );
            process.exit(1);
          }
        } else if (defaultTransports && defaultTransports.length > 0) {
          logger.mcpError(
            `Using preset multiple transports: ${JSON.stringify(defaultTransports)}`,
          );
          // Use preset multiple transports configuration
          await mcpParser.startMcpServerWithMultipleTransports(
            serverInfo,
            defaultTransports,
            toolOptions,
          );
        } else if (defaultTransport) {
          logger.mcpError(
            `Using preset single transport: ${JSON.stringify(defaultTransport)}`,
          );
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
            toolOptions,
          );
        } else {
          // Single transport mode from CLI flags (backwards compatibility)
          const transportType =
            (ctx.args["transport"] as "stdio" | "sse" | "streamable-http") ||
            "stdio";
          const transportOptions = {
            port: ctx.args["port"] as number,
            host: ctx.args["host"] as string,
            path: ctx.args["path"] as string,
          };

          logger.mcpError(
            `Using single transport mode: ${transportType} with options: ${JSON.stringify(transportOptions)}`,
          );
          await mcpParser.startMcpServerWithTransport(
            serverInfo,
            transportType,
            transportOptions,
            toolOptions,
          );
        }

        logger.mcpError("MCP server setup completed, keeping process alive");
        // Keep the process alive
        return new Promise(() => {});
      } catch (error) {
        logger.mcpError(
          `Error in MCP handler: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (error instanceof Error && error.stack) {
          logger.mcpError(`Stack trace: ${error.stack}`);
        }
        process.exit(1);
      }
    };

    // Create sub-command parser without transport options (now handled as system flags)
    const mcpSubParser = new ArgParserBase({}, []);

    this.addSubCommand({
      name: subCommandName,
      description: `Start ${serverInfo.name} as an MCP server`,
      handler: mcpHandler,
      parser: mcpSubParser,
      isMcp: true,
      mcpServerInfo: serverInfo,
      mcpToolOptions: toolOptions,
    });

    return this;
  }

  /**
   * Factory method to create an ArgParser instance with MCP capabilities
   * This provides a clean API for users who want MCP functionality from the start
   * Automatically sets handleErrors: false for MCP compatibility
   *
   * @param options Combined ArgParser and MCP server configuration options
   * @param initialFlags Optional array of initial flags to add
   * @returns ArgParser instance with MCP capabilities and stored server metadata
   */
  public static withMcp<T = any>(
    options?: WithMcpOptions<T>,
    initialFlags?: readonly IFlag[],
  ): ArgParser<T> {
    // Extract MCP-specific options
    const { mcp: mcpConfig, ...argParserOptions } = options || {};

    // Ensure handleErrors is false for MCP compatibility unless explicitly overridden
    const mcpOptions = {
      handleErrors: false,
      ...argParserOptions,
    };

    const parser = new ArgParser<T>(mcpOptions as any, initialFlags);

    // Store MCP server configuration for later use
    if (mcpConfig) {
      (parser as any)._mcpServerConfig = mcpConfig;
    }

    return parser;
  }

  /**
   * Create an ArgParser instance optimized for CLI usage
   * This sets autoExit: true by default for traditional CLI behavior
   */
  public static forCli<T = any>(
    options?: ConstructorParameters<typeof ArgParserBase>[0],
    initialFlags?: ConstructorParameters<typeof ArgParserBase>[1],
  ): ArgParser<T> {
    const cliOptions = {
      autoExit: true,
      handleErrors: true,
      ...options,
    };
    return new ArgParser<T>(cliOptions as any, initialFlags);
  }

  /**
   * Create an ArgParser instance optimized for library usage
   * This sets autoExit: false by default for programmatic control
   */
  public static forLibrary<T = any>(
    options?: ConstructorParameters<typeof ArgParserBase>[0],
    initialFlags?: ConstructorParameters<typeof ArgParserBase>[1],
  ): ArgParser<T> {
    const libraryOptions = {
      autoExit: false,
      handleErrors: false,
      ...options,
    };
    return new ArgParser<T>(libraryOptions as any, initialFlags);
  }

  public static fromArgParser<T = any>(parser: ArgParserBase<T>): ArgParser<T> {
    const originalParser = parser as any;

    const mcpParser = new ArgParser<T>({
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
