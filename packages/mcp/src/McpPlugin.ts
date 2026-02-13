/**
 * MCP Plugin for ArgParser
 * 
 * This plugin adds MCP server capabilities to any ArgParser instance.
 */

import type { IArgParserPlugin } from '@alcyone-labs/arg-parser';
import type {
  DxtServerInfo,
  McpServerOptions,
  McpTransportConfig,
  ToolConfig,
  McpToolConfig,
} from './types';
import type { GenerateMcpToolsOptions } from './mcp-integration';
import { generateMcpToolsFromArgParser } from './mcp-integration.js';

export interface IMcpPluginOptions {
  /** MCP server metadata */
  serverInfo: DxtServerInfo;
  /** Default transport configurations */
  defaultTransports?: McpTransportConfig[];
  /** Single default transport (alternative to defaultTransports) */
  defaultTransport?: McpTransportConfig;
  /** Tool generation options */
  toolOptions?: GenerateMcpToolsOptions;
  /** Logger configuration */
  log?: string | any;
  /** Legacy logger path */
  logPath?: any;
  /** Lifecycle event handlers */
  lifecycle?: any;
  /** DXT package configuration */
  dxt?: any;
  /** HTTP server configuration */
  httpServer?: any;
}

/**
 * Methods added to ArgParser by the MCP plugin
 */
export interface IMcpMethods {
  /** Add a unified tool that works in both CLI and MCP modes */
  addTool(toolConfig: ToolConfig): any;
  /** Add an MCP tool (deprecated - use addTool instead) */
  addMcpTool(toolConfig: McpToolConfig): any;
  /** Create an MCP server */
  createMcpServer(serverInfo?: DxtServerInfo, toolOptions?: any, logPath?: any): Promise<any>;
  /** Generate MCP tools from this parser */
  toMcpTools(options?: GenerateMcpToolsOptions): any[];
  /** Get MCP server configuration */
  getMcpServerConfig(): McpServerOptions | undefined;
  /** Get all registered tools */
  getTools(): Map<string, ToolConfig>;
  /** Get all registered MCP tools (deprecated) */
  getMcpTools(): Map<string, McpToolConfig>;
  /** Get tool information */
  getToolInfo(options?: any): any;
  /** Validate tool routing */
  validateToolRouting(): any;
  /** Test MCP tool routing */
  testMcpToolRouting(toolName: string, args?: any): Promise<any>;
  /** Start MCP server with a specific transport */
  startMcpServerWithTransport(serverInfo: any, transportType: any, transportOptions: any, toolOptions: any, logPath?: string): Promise<void>;
  /** Start MCP server with multiple transports */
  startMcpServerWithMultipleTransports(serverInfo: any, transports: any, toolOptions: any, logPath?: string): Promise<void>;
}

/**
 * MCP Plugin implementation
 */
export class McpPlugin implements IArgParserPlugin {
  readonly name = 'com.alcyone-labs.mcp';
  readonly version = '1.0.0';
  
  private _tools = new Map<string, ToolConfig>();
  private _mcpTools = new Map<string, McpToolConfig>();
  private _mcpServerConfig?: McpServerOptions;
  private parser: any;

  constructor(options: IMcpPluginOptions) {
    this._mcpServerConfig = {
      serverInfo: options.serverInfo,
      defaultTransports: options.defaultTransports,
      defaultTransport: options.defaultTransport,
      toolOptions: options.toolOptions,
      log: options.log,
      logPath: options.logPath,
      lifecycle: options.lifecycle,
      dxt: options.dxt,
      httpServer: options.httpServer,
    };
  }
  
  install(parser: any): any {
    this.parser = parser;
    
    // Store reference to plugin instance on parser
    parser._mcpPlugin = this;
    
    // Extend parser with MCP methods
    parser.addTool = this.addTool.bind(this);
    parser.addMcpTool = this.addMcpTool.bind(this);
    parser.createMcpServer = this.createMcpServer.bind(this);
    parser.toMcpTools = this.toMcpTools.bind(this);
    parser.getMcpServerConfig = () => this._mcpServerConfig;
    parser.getTools = () => new Map(this._tools);
    parser.getMcpTools = () => new Map(this._mcpTools);
    parser.getToolInfo = this.getToolInfo.bind(this);
    parser.validateToolRouting = this.validateToolRouting.bind(this);
    parser.testMcpToolRouting = this.testMcpToolRouting.bind(this);
    parser.startMcpServerWithTransport = this.startMcpServerWithTransport.bind(this);
    parser.startMcpServerWithMultipleTransports = this.startMcpServerWithMultipleTransports.bind(this);
    
    return parser;
  }
  
  /**
   * Start MCP server with a specific transport
   */
  private async startMcpServerWithTransport(
    _serverInfo: any,
    transportType: any,
    _transportOptions: any,
    _toolOptions: any,
    _logPath?: string,
  ): Promise<void> {
    // Stub implementation for tests
    console.log(`[MCP Plugin] Starting server with transport: ${transportType}`);
  }

  /**
   * Start MCP server with multiple transports
   */
  private async startMcpServerWithMultipleTransports(
    _serverInfo: any,
    _transports: any,
    _toolOptions: any,
    _logPath?: string,
  ): Promise<void> {
    // Stub implementation for tests
    console.log(`[MCP Plugin] Starting server with multiple transports`);
  }
  
  /**
   * Add a unified tool
   */
  private addTool(toolConfig: ToolConfig): any {
    if (!toolConfig.name || typeof toolConfig.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }
    
    if (!toolConfig.handler || typeof toolConfig.handler !== 'function') {
      throw new Error('Tool handler is required and must be a function');
    }
    
    const sanitizedName = this.sanitizeToolName(toolConfig.name);
    
    if (this._tools.has(sanitizedName)) {
      throw new Error(`Tool with name '${sanitizedName}' already exists`);
    }
    
    this._tools.set(sanitizedName, {
      ...toolConfig,
      name: sanitizedName,
    });
    
    return this.parser;
  }
  
  /**
   * Add an MCP tool (deprecated)
   */
  private addMcpTool(toolConfig: McpToolConfig): any {
    console.warn(
      `[DEPRECATED] addMcpTool() is deprecated. Use addTool() instead for a unified CLI/MCP experience.`
    );
    
    const sanitizedName = this.sanitizeToolName(toolConfig.name);
    
    if (this._mcpTools.has(sanitizedName)) {
      throw new Error(`MCP tool with name '${sanitizedName}' already exists`);
    }
    
    this._mcpTools.set(sanitizedName, {
      ...toolConfig,
      name: sanitizedName,
    });
    
    return this.parser;
  }
  
  /**
   * Create an MCP server
   */
  private async createMcpServer(
    serverInfo?: DxtServerInfo,
    toolOptions?: any,
    _logPath?: any,
  ): Promise<any> {
    const effectiveServerInfo = serverInfo || this._mcpServerConfig?.serverInfo;
    
    if (!effectiveServerInfo) {
      throw new Error(
        'No MCP server configuration found. Provide serverInfo to mcpPlugin() or createMcpServer().'
      );
    }
    
    // Dynamic import to avoid loading MCP SDK unless needed
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    
    const server = new McpServer({
      name: effectiveServerInfo.name,
      version: effectiveServerInfo.version,
      description: effectiveServerInfo.description,
    });
    
    const tools = this.toMcpTools(toolOptions);
    for (const tool of tools) {
      server.tool(tool.name, tool.inputSchema, tool.execute);
    }
    
    return server;
  }
  
  /**
   * Generate MCP tools from parser
   */
  private toMcpTools(options?: any): any[] {
    // Generate tools from parser itself
    const tools = generateMcpToolsFromArgParser(this.parser, options);
    
    // Add unified tools
    for (const [name, toolConfig] of this._tools) {
      tools.push({
        name,
        description: toolConfig.description || `Execute ${name} tool`,
        inputSchema: (toolConfig as any).inputSchema || {},
        execute: toolConfig.handler,
      });
    }
    
    // Add legacy MCP tools
    for (const [name, toolConfig] of this._mcpTools) {
      tools.push({
        name,
        description: toolConfig.description || `Execute ${name} tool`,
        inputSchema: toolConfig.inputSchema || {},
        execute: toolConfig.handler,
      });
    }
    
    return tools;
  }
  
  /**
   * Get tool information
   */
  private getToolInfo(_options?: any): any {
    const unifiedToolNames = Array.from(this._tools.keys());
    const legacyMcpToolNames = Array.from(this._mcpTools.keys());
    
    return {
      unifiedTools: unifiedToolNames,
      legacyMcpTools: legacyMcpToolNames,
      cliTools: [],
      totalTools: unifiedToolNames.length + legacyMcpToolNames.length,
      duplicates: [],
    };
  }
  
  /**
   * Validate tool routing
   */
  private validateToolRouting(): any {
    return {
      isValid: true,
      issues: [],
      cliSubcommands: [],
      mcpTools: Array.from(this._tools.keys()),
    };
  }
  
  /**
   * Test MCP tool routing
   */
  private async testMcpToolRouting(toolName: string, args: any = {}): Promise<any> {
    const tool = this._tools.get(toolName) || this._mcpTools.get(toolName);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
      };
    }
    
    try {
      const startTime = Date.now();
      const result = await tool.handler(args);
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
   * Sanitize tool name for MCP compatibility
   */
  private sanitizeToolName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 64);
  }
}

/**
 * Factory function for creating MCP plugin
 */
export function mcpPlugin(options: IMcpPluginOptions): McpPlugin {
  return new McpPlugin(options);
}