import { z, type ZodTypeAny } from "zod";
import {
  createMcpLogger,
  type McpLoggerOptions,
} from "@alcyone-labs/simple-mcp-logger";
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
import type { McpLifecycleEvents } from "../mcp/mcp-lifecycle";
import {
  compareVersions,
  CURRENT_MCP_PROTOCOL_VERSION,
} from "../mcp/mcp-protocol-versions";
import { sanitizeMcpToolName } from "../mcp/mcp-utils";
import {
  debugSchemaStructure,
  validateMcpSchemaCompatibility,
} from "../mcp/zod-compatibility";
import { debug } from "../utils/debug-utils";
import { ArgParserBase, type IArgParserParams } from "./ArgParserBase";
import { type IMcpServerMethods } from "./types";
import { resolveLogPath, type LogPath } from "./log-path-utils";
import type {
  IFlag,
  IHandlerContext,
  OutputSchemaConfig,
  ParseResult,
} from "./types";
import { createOutputSchema } from "./types";
import type { Application as ExpressApplication } from "express";

export type { Application as ExpressApplication } from "express";

/**
 * Configuration for a single MCP transport
 */
export type CorsOptions = {
  origins?: "*" | string | RegExp | Array<string | RegExp>;
  methods?: string[];
  headers?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
};

export type JwtVerifyOptions = {
  algorithms?: ("HS256" | "RS256")[];
  secret?: string; // for HS256
  publicKey?: string; // for RS256
  getPublicKey?: (
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) => Promise<string> | string;
  audience?: string | string[];
  issuer?: string | string[];
  clockToleranceSec?: number;
};

export type AuthOptions = {
  required?: boolean; // default true for MCP endpoint
  scheme?: "bearer" | "jwt";
  allowedTokens?: string[]; // simple bearer allowlist
  validator?: (req: any, token: string | undefined) => boolean | Promise<boolean>;
  jwt?: JwtVerifyOptions;
  publicPaths?: string[]; // paths that skip auth
  protectedPaths?: string[]; // if provided, only these paths require auth
  customMiddleware?: (req: any, res: any, next: any) => any; // full control hook
};

export type McpTransportConfig = {
  type: "stdio" | "sse" | "streamable-http";
  port?: number;
  host?: string;
  path?: string;
  sessionIdGenerator?: () => string;
  cors?: CorsOptions; // streamable-http only
  auth?: AuthOptions; // streamable-http only
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
 * Copy entry for DXT package bundling, compatible with TSDown's copy options
 */
export type DxtCopyEntry = {
  from: string;
  to: string;
};

/**
 * Copy options for DXT package bundling, compatible with TSDown's copy options
 * @example
 * ```ts
 * [
 *   'migrations',
 *   { from: 'migrations', to: 'migrations' },
 *   { from: 'config/default.json', to: 'config/default.json' }
 * ]
 * ```
 */
export type DxtCopyOptions = Array<string | DxtCopyEntry>;

/**
 * DXT-specific configuration options
 */
export type DxtOptions = {
  /**
   * Additional files and directories to include in the DXT package.
   * Paths are relative to the project root (where package.json/tsconfig.json are located).
   *
   * @example
   * ```ts
   * include: [
   *   'migrations',                                    // Copy entire migrations folder
   *   { from: 'config/prod.json', to: 'config.json' }, // Copy and rename file
   *   'assets/logo.png'                               // Copy specific file
   * ]
   * ```
   */
  include?: DxtCopyOptions;
};

/**
 * MCP server configuration options for withMcp() method
 * This centralizes MCP server metadata that was previously scattered across addMcpSubCommand calls
 */
export type HttpServerOptions = {
  configureExpress?: (app: ExpressApplication) => void;
};

export type McpServerOptions = {
  /** MCP server metadata */
  serverInfo?: DxtServerInfo;
  /** Default transport configurations for the MCP server */
  defaultTransports?: McpTransportConfig[];
  /** Single default transport configuration (alternative to defaultTransports) */
  defaultTransport?: McpTransportConfig;
  /** Tool generation options for the MCP server */
  toolOptions?: GenerateMcpToolsOptions;
  /**
   * Custom log file path for MCP server logs (default: "./logs/mcp.log" relative to entry point)
   *
   * @deprecated Use 'log' property instead for more comprehensive logging configuration
   *
   * Can be:
   * - Simple string: "./logs/app.log" (relative to entry point)
   * - Absolute path: "/tmp/app.log"
   * - Explicit cwd: "cwd:./logs/app.log" (relative to process.cwd())
   * - Config object: { path: "./logs/app.log", relativeTo: "entry" | "cwd" | "absolute" }
   */
  logPath?: LogPath;
  /**
   * MCP logger configuration options
   *
   * Can be:
   * - Simple string: "./logs/app.log" (equivalent to logPath for backward compatibility)
   * - Full options object: { level: "debug", logToFile: "./logs/app.log", prefix: "MyServer" }
   *
   * When both 'log' and 'logPath' are specified, they are merged intelligently:
   * - 'log' provides logger options (level, prefix, mcpMode)
   * - 'logPath' provides flexible path resolution (relativeTo, basePath)
   * - If 'log' has logToFile, 'logPath' still takes precedence for path resolution
   */
  log?: string | McpLoggerOptions;
  /**
   * Lifecycle event handlers for MCP server operations
   * These provide hooks for initialization, cleanup, and other lifecycle events
   */
  lifecycle?: McpLifecycleEvents;
  /** DXT package configuration options */
  dxt?: DxtOptions;
  /** Optional HTTP server configuration hooks */
  httpServer?: HttpServerOptions;
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
  /**
   * Tool name (must be unique within the server)
   * Note: For MCP compatibility, names will be automatically sanitized to match ^[a-zA-Z0-9_-]{1,64}$
   * Invalid characters will be replaced with underscores
   */
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
  /**
   * Tool name (CLI subcommand name & MCP tool name)
   * Note: For MCP compatibility, names will be automatically sanitized to match ^[a-zA-Z0-9_-]{1,64}$
   * Invalid characters will be replaced with underscores
   */
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
> extends ArgParserBase<THandlerReturn> implements IMcpServerMethods {
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
   * Resolve logger configuration from various sources with proper priority
   * @param logPathOverride Optional log path override parameter
   * @returns Logger configuration object for createMcpLogger
   */
  #_resolveLoggerConfig(logPathOverride?: LogPath): McpLoggerOptions | string {
    const mcpConfig = this._mcpServerConfig;

    // Priority 1: Parameter override (for backward compatibility)
    if (logPathOverride) {
      const resolvedPath = resolveLogPath(logPathOverride);
      return {
        prefix: "MCP Server Creation",
        logToFile: resolvedPath,
        level: "error", // Default level for backward compatibility
        mcpMode: true,
      };
    }

    // Enhanced logic: Merge 'log' configuration with 'logPath' for flexible path resolution
    const hasLogConfig = mcpConfig?.log;
    const hasLogPath = mcpConfig?.logPath;

    if (hasLogConfig || hasLogPath) {
      // Start with base configuration
      let config: McpLoggerOptions = {
        prefix: "MCP Server Creation",
        level: "error", // Default level for backward compatibility
        mcpMode: true,
      };

      // Apply log configuration if present
      if (hasLogConfig && mcpConfig.log) {
        if (typeof mcpConfig.log === "string") {
          // Simple string path - use it as logToFile
          config.logToFile = resolveLogPath(mcpConfig.log);
        } else {
          // Full options object - merge with defaults
          config = {
            ...config,
            ...mcpConfig.log,
            // Resolve logToFile path if provided in log config
            ...(mcpConfig.log.logToFile && {
              logToFile: resolveLogPath(mcpConfig.log.logToFile),
            }),
          };
        }
      }

      // Apply logPath configuration if present and no logToFile was set by log config
      if (hasLogPath && mcpConfig.logPath && !config.logToFile) {
        config.logToFile = resolveLogPath(mcpConfig.logPath);
      }

      // If logPath is present but log config also specified a logToFile,
      // use logPath for more flexible path resolution (this preserves the nice LogPath features)
      if (
        hasLogPath &&
        mcpConfig.logPath &&
        hasLogConfig &&
        mcpConfig.log &&
        typeof mcpConfig.log === "object" &&
        mcpConfig.log.logToFile
      ) {
        // Use logPath for path resolution, but keep the logToFile from log config as fallback
        config.logToFile = resolveLogPath(mcpConfig.logPath);
      }

      return config;
    }

    // Priority 4: Default fallback
    const defaultPath = resolveLogPath("./logs/mcp.log");
    return {
      prefix: "MCP Server Creation",
      logToFile: defaultPath,
      level: "error", // Default level for backward compatibility
      mcpMode: true,
    };
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
    // Validate tool configuration
    if (!toolConfig.name || typeof toolConfig.name !== "string") {
      throw new Error("Tool name is required and must be a string");
    }

    if (!toolConfig.handler || typeof toolConfig.handler !== "function") {
      throw new Error("Tool handler is required and must be a function");
    }

    // Sanitize the tool name for MCP compatibility
    const sanitizedName = sanitizeMcpToolName(toolConfig.name);

    // Suppress sanitization warnings in MCP mode to avoid STDOUT contamination
    if (sanitizedName !== toolConfig.name) {
      // Only warn in non-MCP contexts
      const isMcpMode = (globalThis as any).console?.mcpError;
      if (!isMcpMode) {
        console.warn(
          `[ArgParser] Tool name '${toolConfig.name}' was sanitized to '${sanitizedName}' for MCP compatibility`,
        );
      }
    }

    if (this._tools.has(sanitizedName)) {
      throw new Error(`Tool with name '${sanitizedName}' already exists`);
    }

    if (!Array.isArray(toolConfig.flags)) {
      throw new Error("Tool flags must be an array");
    }

    // Create a new tool config with the sanitized name
    const sanitizedToolConfig: ToolConfig = {
      ...toolConfig,
      name: sanitizedName,
    };

    // Store the tool configuration with sanitized name
    this._tools.set(sanitizedName, sanitizedToolConfig);

    // Register the tool as a CLI subcommand (using original name for CLI)
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
    // Use stderr to avoid STDOUT contamination in MCP mode
    try {
      if (typeof process !== "undefined" && process.stderr) {
        process.stderr
          .write(`[DEPRECATED] addMcpTool() is deprecated and will be removed in v2.0.
Please use addTool() instead for a unified CLI/MCP experience.
Migration guide: https://github.com/alcyone-labs/arg-parser/blob/main/docs/MCP-MIGRATION.md\n`);
      } else {
        console.warn(`[DEPRECATED] addMcpTool() is deprecated and will be removed in v2.0.
Please use addTool() instead for a unified CLI/MCP experience.
Migration guide: https://github.com/alcyone-labs/arg-parser/blob/main/docs/MCP-MIGRATION.md`);
      }
    } catch {
      // Fallback for environments where process is not available
      console.warn(`[DEPRECATED] addMcpTool() is deprecated and will be removed in v2.0.
Please use addTool() instead for a unified CLI/MCP experience.
Migration guide: https://github.com/alcyone-labs/arg-parser/blob/main/docs/MCP-MIGRATION.md`);
    }

    // Sanitize the tool name for MCP compatibility
    const sanitizedName = sanitizeMcpToolName(toolConfig.name);

    // Suppress sanitization warnings in MCP mode to avoid STDOUT contamination
    if (sanitizedName !== toolConfig.name) {
      // Only warn in non-MCP contexts
      const isMcpMode = (globalThis as any).console?.mcpError;
      if (!isMcpMode) {
        console.warn(
          `[ArgParser] Tool name '${toolConfig.name}' was sanitized to '${sanitizedName}' for MCP compatibility`,
        );
      }
    }

    if (this._mcpTools.has(sanitizedName)) {
      throw new Error(`MCP tool with name '${sanitizedName}' already exists`);
    }

    // Create a new tool config with the sanitized name
    const sanitizedToolConfig: McpToolConfig = {
      ...toolConfig,
      name: sanitizedName,
    };

    this._mcpTools.set(sanitizedName, sanitizedToolConfig);
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
              displayHelp: () => {
                console.error("Help display is not supported in MCP mode.");
              },
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
      inputSchema: toolConfig.inputSchema || z.object({}),
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
   * @param logPath Optional log path (deprecated, use log config in withMcp instead)
   * @returns Configured MCP server instance
   */
  public async createMcpServer(
    serverInfo?: DxtServerInfo,
    toolOptions?: GenerateMcpToolsOptions,
    logPath?: LogPath,
  ): Promise<any> {
    // Resolve logger configuration with priority: parameter > log config > logPath config > default
    const loggerConfig = this.#_resolveLoggerConfig(logPath);

    // Use the appropriate createMcpLogger API based on configuration type
    // Note: Current version only supports legacy API (prefix, logToFile)
    const logger =
      typeof loggerConfig === "string"
        ? createMcpLogger("MCP Server Creation", loggerConfig)
        : createMcpLogger(
            loggerConfig.prefix || "MCP Server Creation",
            loggerConfig.logToFile,
          );

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
      const { McpServer, ResourceTemplate } = await import(
        "@alcyone-labs/modelcontextprotocol-sdk/server/mcp.js"
      );
      logger.mcpError(
        "Successfully imported McpServer and ResourceTemplate from SDK",
      );

      const server = new McpServer({
        id: effectiveServerInfo.name,
        version: effectiveServerInfo.version,
        name: effectiveServerInfo.name,
        description: effectiveServerInfo.description,
      });

      logger.mcpError("Successfully created McpServer instance");

      // Set up lifecycle manager if lifecycle events are configured
      // Skip lifecycle setup during MCP server creation to prevent infinite recursion
      const isInMcpServeMode = process.argv.includes("--s-mcp-serve");
      if (this._mcpServerConfig?.lifecycle && !isInMcpServeMode) {
        const { McpLifecycleManager } = await import("../mcp/mcp-lifecycle");

        const lifecycleManager = new McpLifecycleManager(
          this._mcpServerConfig.lifecycle,
          logger,
          effectiveServerInfo,
          this,
        );

        // Parse the current process arguments to provide to lifecycle manager
        try {
          // Parse arguments without executing handlers to get flag values
          // Filter out system flags that could cause infinite recursion during server creation
          const filteredArgs = process.argv
            .slice(2)
            .filter(
              (arg) => !arg.startsWith("--s-mcp-") && arg !== "--s-mcp-serve",
            );
          const parsedResult = await this.parse(filteredArgs, {
            skipHandlerExecution: true,
            isMcp: true,
          });

          // Extract the parsed arguments from the result
          const parsedArgs = (parsedResult as any)?.args || parsedResult || {};
          lifecycleManager.setParsedArgs(parsedArgs);

          logger.mcpError(
            `Lifecycle manager initialized with parsed args: ${Object.keys(parsedArgs).join(", ")}`,
          );
        } catch (parseError) {
          logger.mcpError(
            `Warning: Could not parse arguments for lifecycle manager: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          );
          // Continue without parsed args - will fall back to environment variables
        }

        // Wrap the server's connect method to trigger lifecycle events
        const originalConnect = server.connect.bind(server);
        server.connect = async (transport: any) => {
          logger.mcpError("MCP server connecting with lifecycle events...");

          // Call the original connect method
          const result = await originalConnect(transport);

          // Trigger onInitialize event immediately after connection
          // This simulates the initialize request since we can't intercept it directly
          try {
            await lifecycleManager.handleInitialize(
              { name: "mcp-client", version: "1.0.0" }, // Default client info
              "2024-11-05", // Default protocol version
              {}, // Default capabilities
            );

            // Trigger onInitialized event after a short delay
            setTimeout(async () => {
              try {
                await lifecycleManager.handleInitialized();
              } catch (error) {
                logger.mcpError(
                  `Lifecycle onInitialized error: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }, 100);
          } catch (error) {
            logger.mcpError(
              `Lifecycle onInitialize error: ${error instanceof Error ? error.message : String(error)}`,
            );
          }

          return result;
        };

        // Store lifecycle manager for shutdown handling
        (server as any)._lifecycleManager = lifecycleManager;

        logger.mcpError("Successfully set up MCP lifecycle manager");
      }

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

        // MCP SDK expects Zod v3 compatible schemas
        let zodSchema: ZodTypeAny;

        // Find the tool configuration to get the flags
        const toolFromUnified = Array.from(this._tools.values()).find(
          (t) => t.name === tool.name,
        );
        const toolFromLegacy = Array.from(this._mcpTools.values()).find(
          (t) => t.name === tool.name,
        );

        if (toolFromUnified && toolFromUnified.flags) {
          // Convert flags to Zod schema for unified tools
          zodSchema = convertFlagsToZodSchema(toolFromUnified.flags);
        } else if (toolFromLegacy && toolFromLegacy.inputSchema) {
          // For legacy tools, use the existing Zod schema directly
          zodSchema = toolFromLegacy.inputSchema;
        } else {
          // Fallback for tools with no input parameters - create empty Zod object
          zodSchema = z.object({});
        }

        // Convert Zod schema to JSON Schema for MCP SDK
        let mcpCompatibleSchema;
        try {
          if (process.env["MCP_DEBUG"]) {
            console.error(`[MCP Debug] Preparing schema for tool ${tool.name}`);
            console.error(`[MCP Debug] Input zodSchema:`, zodSchema);
          }

          // Use the original Zod v4 schema directly (MCP SDK now supports v4)
          mcpCompatibleSchema = zodSchema;

          if (process.env["MCP_DEBUG"]) {
            console.error(
              `[MCP Debug] Successfully prepared schema for tool ${tool.name}`,
            );
          }
        } catch (schemaError) {
          console.error(
            `[MCP Debug] Error preparing schema for tool ${tool.name}:`,
            schemaError,
          );
          throw schemaError;
        }

        // Add detailed debug logging for the prepared schema
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] Prepared mcpCompatibleSchema for tool ${tool.name}:`,
            JSON.stringify(mcpCompatibleSchema, null, 2),
          );
          console.error(
            `[MCP Debug] Schema properties:`,
            Object.keys(mcpCompatibleSchema || {}),
          );
          console.error(
            `[MCP Debug] Schema def:`,
            (mcpCompatibleSchema as any)?.def,
          );
          console.error(
            `[MCP Debug] Schema shape:`,
            (mcpCompatibleSchema as any)?.shape,
          );
          console.error(
            `[MCP Debug] Schema parse function:`,
            typeof mcpCompatibleSchema?.parse,
          );
        }

        // Add debug logging before schema preparation
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] About to prepare schema for tool ${tool.name}`,
          );
          console.error(`[MCP Debug] zodSchema type:`, typeof zodSchema);
          console.error(`[MCP Debug] zodSchema:`, zodSchema);
          console.error(
            `[MCP Debug] zodSchema constructor:`,
            zodSchema?.constructor?.name,
          );
        }

        // Debug schema structure if MCP_DEBUG is enabled
        debugSchemaStructure(mcpCompatibleSchema, `Tool ${tool.name} schema`);

        // Validate compatibility
        if (!validateMcpSchemaCompatibility(mcpCompatibleSchema)) {
          logger.mcpError(
            `Warning: Schema for tool ${tool.name} may not be fully compatible with MCP SDK`,
          );
        }

        const toolConfig: any = {
          title: tool.name, // MCP SDK requires title field
          description: tool.description || "No description provided.",
          inputSchema: mcpCompatibleSchema, // Use Zod v3 compatible schema for MCP SDK
        };

        // Debug the final toolConfig being passed to registerTool
        if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] Final toolConfig for ${tool.name}:`,
            JSON.stringify(toolConfig, null, 2),
          );
          console.error(
            `[MCP Debug] toolConfig.inputSchema type:`,
            typeof toolConfig.inputSchema,
          );
          console.error(
            `[MCP Debug] toolConfig.inputSchema constructor:`,
            toolConfig.inputSchema?.constructor?.name,
          );
          console.error(
            `[MCP Debug] toolConfig.inputSchema._def:`,
            toolConfig.inputSchema?._def,
          );
          console.error(
            `[MCP Debug] toolConfig.inputSchema.shape:`,
            toolConfig.inputSchema?.shape,
          );
          console.error(
            `[MCP Debug] toolConfig.inputSchema._zod:`,
            toolConfig.inputSchema?._zod,
          );
          console.error(
            `[MCP Debug] Schema keys:`,
            Object.keys(mcpCompatibleSchema || {}),
          );
          console.error(`[MCP Debug] About to call server.registerTool with:`, {
            name: tool.name,
            description: tool.description,
            inputSchema: mcpCompatibleSchema,
          });
        }

        // Include output schema in MCP tool registration for MCP 2025-06-18+ clients
        // The Alcyone Labs MCP SDK fork v1.16.0+ supports outputSchema in registerTool
        // This is conditionally enabled based on negotiated protocol version
        // Output schemas must be converted to Zod schema objects before passing to MCP SDK
        if (tool.outputSchema && this.supportsOutputSchemas()) {
          // Convert outputSchema to Zod schema (handles plain objects, patterns, and existing Zod schemas)
          const convertedOutputSchema = createOutputSchema(tool.outputSchema);
          toolConfig.outputSchema = convertedOutputSchema;

          if (process.env["MCP_DEBUG"]) {
            console.error(
              `[MCP Debug] Including outputSchema for tool '${tool.name}':`,
              typeof tool.outputSchema
            );
            console.error(
              `[MCP Debug] Converted outputSchema constructor:`,
              convertedOutputSchema?.constructor?.name
            );
            console.error(
              `[MCP Debug] supportsOutputSchemas():`,
              this.supportsOutputSchemas()
            );
          }
        } else if (process.env["MCP_DEBUG"]) {
          console.error(
            `[MCP Debug] NOT including outputSchema for tool '${tool.name}':`,
            `hasOutputSchema=${!!tool.outputSchema}, supportsOutputSchemas=${this.supportsOutputSchemas()}`
          );
        }

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

      // Register MCP resources
      const resources = this.getMcpResources();
      logger.mcpError(`Registering ${resources.length} MCP resources`);

      resources.forEach((resource) => {
        try {
          const resourceConfig = {
            title: resource.title || resource.name,
            description: resource.description || `Resource: ${resource.name}`,
            mimeType: resource.mimeType || "application/json",
          };

          // Handle different URI template types
          if (resource.uriTemplate.includes("{")) {
            // URI template with parameters
            const resourceTemplate = new ResourceTemplate(
              resource.uriTemplate,
              { list: undefined },
            );
            const templateHandler = async (uri: any, params: any = {}) => {
              try {
                const result = await resource.handler(
                  new URL(uri.href || uri),
                  params,
                );
                // Convert our format to MCP SDK format
                return {
                  contents: result.contents.map((content) => {
                    const mcpContent: any = {
                      uri: content.uri,
                    };
                    if (content.text !== undefined) {
                      mcpContent.text = content.text;
                    }
                    if (content.blob !== undefined) {
                      mcpContent.blob = content.blob;
                    }
                    if (content.mimeType !== undefined) {
                      mcpContent.mimeType = content.mimeType;
                    }
                    return mcpContent;
                  }),
                };
              } catch (error) {
                logger.mcpError(
                  `Resource template handler error for ${resource.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
                throw error;
              }
            };
            server.registerResource(
              resource.name,
              resourceTemplate,
              resourceConfig,
              templateHandler,
            );
          } else {
            // Simple URI string
            const resourceHandler = async (uri: any) => {
              try {
                const result = await resource.handler(
                  new URL(uri.href || uri),
                  {},
                );
                // Convert our format to MCP SDK format
                return {
                  contents: result.contents.map((content) => {
                    const mcpContent: any = {
                      uri: content.uri,
                    };
                    if (content.text !== undefined) {
                      mcpContent.text = content.text;
                    }
                    if (content.blob !== undefined) {
                      mcpContent.blob = content.blob;
                    }
                    if (content.mimeType !== undefined) {
                      mcpContent.mimeType = content.mimeType;
                    }
                    return mcpContent;
                  }),
                };
              } catch (error) {
                logger.mcpError(
                  `Resource handler error for ${resource.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
                throw error;
              }
            };
            server.registerResource(
              resource.name,
              resource.uriTemplate,
              resourceConfig,
              resourceHandler,
            );
          }

          logger.mcpError(`Successfully registered resource: ${resource.name}`);
        } catch (error) {
          logger.mcpError(
            `Failed to register resource ${resource.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });

      logger.mcpError("Successfully registered all resources with MCP server");

      // Register MCP prompts
      const prompts = this.getMcpPrompts();
      logger.mcpError(`Registering ${prompts.length} MCP prompts`);

      prompts.forEach((prompt) => {
        try {
          // Convert Zod v4 schema to MCP SDK compatible format (Zod v3 style)
          let mcpCompatibleSchema;
          try {
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Debug] Preparing schema for prompt ${prompt.name}`,
              );
              console.error(`[MCP Debug] Input argsSchema:`, prompt.argsSchema);
            }
            mcpCompatibleSchema = prompt.argsSchema;
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Debug] Successfully prepared schema for prompt ${prompt.name}`,
              );
            }
          } catch (schemaError) {
            console.error(
              `[MCP Debug] Error preparing schema for prompt ${prompt.name}:`,
              schemaError,
            );
            throw schemaError;
          }

          // Validate the converted schema
          if (!validateMcpSchemaCompatibility(mcpCompatibleSchema)) {
            throw new Error(
              `Schema validation failed for prompt ${prompt.name}`,
            );
          }

          if (process.env["MCP_DEBUG"]) {
            debugSchemaStructure(mcpCompatibleSchema, `prompt ${prompt.name}`);
          }

          const promptConfig: any = {
            title: prompt.title || prompt.name, // MCP SDK requires title field
            description: prompt.description || "No description provided.",
            argsSchema: mcpCompatibleSchema, // Use Zod v3 compatible schema for MCP SDK
          };

          // Create prompt handler that wraps the original handler
          const promptHandler = async (args: any) => {
            try {
              // Validate arguments using the original Zod v4 schema
              const validatedArgs = prompt.argsSchema.parse(args);

              // Call the original handler with validated arguments
              const result = await prompt.handler(validatedArgs);

              if (process.env["MCP_DEBUG"]) {
                console.error(
                  `[MCP Debug] Prompt '${prompt.name}' executed successfully`,
                );
              }

              return result;
            } catch (error) {
              if (process.env["MCP_DEBUG"]) {
                console.error(
                  `[MCP Debug] Prompt '${prompt.name}' execution error:`,
                  error,
                );
              }
              throw error;
            }
          };

          server.registerPrompt(
            prompt.name,
            promptConfig,
            promptHandler as any,
          );

          logger.mcpError(`Successfully registered prompt: ${prompt.name}`);
        } catch (error) {
          logger.mcpError(
            `Failed to register prompt ${prompt.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });

      logger.mcpError("Successfully registered all prompts with MCP server");

      // Set up change notifications
      this.setupMcpChangeNotifications(server);
      logger.mcpError("Successfully set up MCP change notifications");

      // Add shutdown handler for lifecycle cleanup
      if ((server as any)._lifecycleManager) {
        const originalClose = server.close?.bind(server);
        server.close = async () => {
          logger.mcpError("MCP server shutdown initiated");
          try {
            await (server as any)._lifecycleManager.handleShutdown(
              "server_shutdown",
            );
          } catch (error) {
            logger.mcpError(
              `Error during lifecycle shutdown: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          if (originalClose) {
            await originalClose();
          }
        };
      }

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
      cors?: CorsOptions;
      auth?: AuthOptions;
    }>,
    toolOptions?: GenerateMcpToolsOptions,
    logPath?: LogPath,
  ): Promise<void> {
    const server = await this.createMcpServer(serverInfo, toolOptions, logPath);
    const startPromises: Promise<void>[] = [];

    for (const transportConfig of transports) {
      const promise = this.#_startSingleTransport(
        server,
        serverInfo,
        transportConfig,
        logPath,
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
      cors?: CorsOptions;
      auth?: AuthOptions;
    } = {},
    toolOptions?: GenerateMcpToolsOptions,
    logPath?: LogPath,
  ): Promise<void> {
    const server = await this.createMcpServer(serverInfo, toolOptions, logPath);
    await this.#_startSingleTransport(
      server,
      serverInfo,
      {
        type: transportType,
        ...transportOptions,
      },
      logPath,
    );
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
      cors?: CorsOptions;
      auth?: AuthOptions;
    },
    logPath?: LogPath,
  ): Promise<void> {
    const resolvedLogPath = resolveLogPath(logPath || "./logs/mcp.log");
    const logger = createMcpLogger("MCP Transport", resolvedLogPath);

    try {
      logger.mcpError(
        `Starting ${transportConfig.type} transport for server: ${serverInfo.name}`,
      );

      switch (transportConfig.type) {
        case "stdio": {
          logger.mcpError("Importing StdioServerTransport from SDK");
          const { StdioServerTransport } = await import(
            "@alcyone-labs/modelcontextprotocol-sdk/server/stdio.js"
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
            "@alcyone-labs/modelcontextprotocol-sdk/server/sse.js"
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
            "@alcyone-labs/modelcontextprotocol-sdk/server/streamableHttp.js"
          );
          const express = (await import("express")).default;

          const app = express();
          app.disable("x-powered-by");
          app.use(express.json());

          // Add a simple favicon to prevent 404 errors
          app.get("/favicon.ico", (_req, res) => {
            // Simple red dot on white background as SVG
            const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
              <rect width="16" height="16" fill="white"/>
              <circle cx="8" cy="8" r="4" fill="red"/>
            </svg>`;
            res.setHeader("Content-Type", "image/svg+xml");
            res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
            res.send(favicon);
          });

          // Allow user to customize Express before we register routes
          try {
            this._mcpServerConfig?.httpServer?.configureExpress?.(app);
          } catch (e) {
            // ignore hook errors to avoid breaking server start
          }

          const port = transportConfig.port || 3000;
          const path = transportConfig.path || "/mcp";

          // CORS middleware (optional)
          if (transportConfig.cors) {
            const cors = transportConfig.cors;
            const allowMethods = cors.methods?.join(", ") || "GET,POST,PUT,PATCH,DELETE,OPTIONS";
            const allowHeaders = (req: any) =>
              cors.headers?.join(", ") || req.headers["access-control-request-headers"] || "Content-Type, Authorization, MCP-Session-Id";
            const exposed = cors.exposedHeaders?.join(", ") || undefined;

            const resolveOrigin = (req: any): string | undefined => {
              const reqOrigin = req.headers.origin as string | undefined;
              const origins = cors.origins ?? "*";
              if (origins === "*") return cors.credentials ? reqOrigin : "*";
              if (!reqOrigin) return undefined;
              const list = Array.isArray(origins) ? origins : [origins];
              for (const o of list) {
                if (typeof o === "string" && o === reqOrigin) return reqOrigin;
                if (o instanceof RegExp && o.test(reqOrigin)) return reqOrigin;
              }
              return undefined;
            };

            const applyCorsHeaders = (req: any, res: any) => {
              const origin = resolveOrigin(req);
              if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
              if (cors.credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
              res.setHeader("Vary", "Origin");
              res.setHeader("Access-Control-Allow-Methods", allowMethods);
              const hdrs = allowHeaders(req);
              if (hdrs) res.setHeader("Access-Control-Allow-Headers", hdrs);
              if (exposed) res.setHeader("Access-Control-Expose-Headers", exposed);
              if (typeof cors.maxAge === "number") res.setHeader("Access-Control-Max-Age", String(cors.maxAge));
            };

            app.options(path, (req: any, res: any) => {
              applyCorsHeaders(req, res);
              res.status(204).end();
            });

            app.use((req: any, res: any, next: any) => {
              if (req.path === path) applyCorsHeaders(req, res);
              next();
            });
          }

          // Custom auth middleware hook (optional)
          if (transportConfig.auth?.customMiddleware) {
            app.use(transportConfig.auth.customMiddleware);
          }

          // Built-in auth (optional)
          const authOpts = transportConfig.auth;
          const shouldRequireAuthFor = (req: any): boolean => {
            if (!authOpts) return false;
            const reqPath = req.path;
            const pub = authOpts.publicPaths || [];
            const prot = authOpts.protectedPaths;
            if (pub.includes(reqPath)) return false;
            if (prot && !prot.includes(reqPath)) return false;
            return authOpts.required !== false; // default true
          };

          // Minimal JWT verifier supporting HS256 and RS256
          const base64urlDecode = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const verifyJwt = async (token: string): Promise<boolean> => {
            if (!authOpts?.jwt) return false;
            const [h, p, sig] = token.split(".");
            if (!h || !p || !sig) return false;
            const header = JSON.parse(base64urlDecode(h).toString("utf8"));
            const payload = JSON.parse(base64urlDecode(p).toString("utf8"));
            const alg = header.alg as "HS256" | "RS256";
            if (authOpts.jwt.algorithms && !authOpts.jwt.algorithms.includes(alg)) return false;
            const data = Buffer.from(`${h}.${p}`);
            const signature = base64urlDecode(sig);
            if (alg === "HS256") {
              const secret = authOpts.jwt.secret;
              if (!secret) return false;
              const hmac = (await import("node:crypto")).createHmac("sha256", secret).update(data).digest();
              if (!hmac.equals(signature)) return false;
            } else if (alg === "RS256") {
              const crypto = await import("node:crypto");
              let key = authOpts.jwt.publicKey;
              if (!key && authOpts.jwt.getPublicKey) {
                key = await authOpts.jwt.getPublicKey(header, payload);
              }
              if (!key) return false;
              const verify = crypto.createVerify("RSA-SHA256");
              verify.update(data);
              verify.end();
              const ok = verify.verify(key, signature);
              if (!ok) return false;
            } else {
              return false;
            }
            // Optional audience/issuer checks
            if (authOpts.jwt.audience) {
              const allowed = Array.isArray(authOpts.jwt.audience) ? authOpts.jwt.audience : [authOpts.jwt.audience];
              if (!allowed.includes(payload.aud)) return false;
            }
            if (authOpts.jwt.issuer) {
              const allowed = Array.isArray(authOpts.jwt.issuer) ? authOpts.jwt.issuer : [authOpts.jwt.issuer];
              if (!allowed.includes(payload.iss)) return false;
            }
            const nowSec = Math.floor(Date.now() / 1000);
            const tol = authOpts.jwt.clockToleranceSec || 0;
            if (payload.nbf && nowSec + tol < payload.nbf) return false;
            if (payload.exp && nowSec - tol >= payload.exp) return false;
            return true;
          };

          const authenticate = async (req: any): Promise<boolean> => {
            if (!authOpts) return true;
            const authz = req.headers.authorization as string | undefined;
            const token = authz?.startsWith("Bearer ") ? authz.slice(7) : undefined;
            if (!token) {
              // allow custom validator to decide on missing token
              if (authOpts.validator) return !!(await authOpts.validator(req, token));
              return false;
            }
            if (authOpts.scheme === "jwt" || authOpts.jwt) {
              const ok = await verifyJwt(token);
              if (!ok) return false;
            } else if (authOpts.scheme === "bearer" || !authOpts.scheme) {
              if (authOpts.allowedTokens && !authOpts.allowedTokens.includes(token)) {
                // fall through to validator if provided
                if (authOpts.validator) return !!(await authOpts.validator(req, token));
                return false;
              }
            }
            if (authOpts.validator) {
              const ok = await authOpts.validator(req, token);
              if (!ok) return false;
            }
            return true;
          };

          const transports: { [sessionId: string]: any } = {};

          app.all(path, async (req: any, res: any) => {
            if (shouldRequireAuthFor(req)) {
              const ok = await authenticate(req);
              if (!ok) {
                res.status(401).json({ error: "Unauthorized" });
                return;
              }
            }

            const sessionId = req.headers["mcp-session-id"] as string | undefined;
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
                if (transport.sessionId) delete transports[transport.sessionId];
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

  public async parse(processArgs?: string[], options?: any): Promise<any> {
    debug.log("ArgParser.parse() called with args:", processArgs);
    // Call the base class parse method directly to avoid any override issues
    debug.log("About to call ArgParserBase.prototype.parse.call()");
    let result = await ArgParserBase.prototype.parse.call(
      this,
      processArgs,
      options,
    );
    debug.log("ArgParserBase.prototype.parse.call() returned:", typeof result);

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
  public parseForCli(processArgs?: string[], options?: any): any {
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
  public parseAsync(processArgs?: string[], options?: any): Promise<any> {
    return this.parse(processArgs, options);
  }

  /**
   * Convenience method for auto-execution: only runs if the script is executed directly (not imported).
   * This eliminates the need for boilerplate code to check if the script is being run directly.
   *
   * @param importMetaUrl Pass import.meta.url from your script for reliable detection
   * @param processArgs Optional arguments to parse (defaults to process.argv.slice(2))
   * @param options Additional parse options
   * @returns Promise that resolves to the parse result, or empty object if script is imported
   *
   * @example
   * ```typescript
   * // At the bottom of your CLI script:
   * await cli.parseIfExecutedDirectly(import.meta.url);
   *
   * // With error handling:
   * await cli.parseIfExecutedDirectly(import.meta.url).catch((error) => {
   *   console.error("Fatal error:", error instanceof Error ? error.message : String(error));
   *   process.exit(1);
   * });
   * ```
   */
  public async parseIfExecutedDirectly(
    importMetaUrl: string,
    processArgs?: string[],
    options?: any
  ): Promise<any> {
    return this.parse(processArgs, {
      ...options,
      autoExecute: true,
      importMetaUrl,
    });
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
      // TODO: upgrade to options-based API
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
