/**
 * MCP Lifecycle Manager
 * 
 * Handles MCP server lifecycle events.
 */

/**
 * Lifecycle event handlers
 */
export interface McpLifecycleEvents {
  /** Called when server is initializing */
  onInitialize?: (clientInfo: any, protocolVersion: string, capabilities: any) => Promise<void> | void;
  /** Called when server is initialized */
  onInitialized?: () => Promise<void> | void;
  /** Called when server is shutting down */
  onShutdown?: () => Promise<void> | void;
  /** Called when a tool is invoked */
  onToolInvoke?: (toolName: string, args: any) => Promise<void> | void;
  /** Called when a tool completes */
  onToolComplete?: (toolName: string, result: any, duration: number) => Promise<void> | void;
  /** Called when a tool errors */
  onToolError?: (toolName: string, error: Error) => Promise<void> | void;
}

/**
 * Manages MCP server lifecycle
 */
export class McpLifecycleManager {
  private events: McpLifecycleEvents;
  private logger: any;

  constructor(
    events: McpLifecycleEvents,
    logger: any,
    _serverInfo: any,
    _parser: any,
  ) {
    this.events = events;
    this.logger = logger;
  }

  /**
   * Set parsed arguments for context
   */
  setParsedArgs(_args: any): void {
    // Reserved for future lifecycle context
  }
  
  /**
   * Handle initialize event
   */
  async handleInitialize(clientInfo: any, protocolVersion: string, capabilities: any): Promise<void> {
    if (this.events.onInitialize) {
      try {
        await this.events.onInitialize(clientInfo, protocolVersion, capabilities);
        this.logger?.mcpError?.('Lifecycle: onInitialize completed');
      } catch (error) {
        this.logger?.mcpError?.(`Lifecycle: onInitialize error: ${error}`);
        throw error;
      }
    }
  }
  
  /**
   * Handle initialized event
   */
  async handleInitialized(): Promise<void> {
    if (this.events.onInitialized) {
      try {
        await this.events.onInitialized();
        this.logger?.mcpError?.('Lifecycle: onInitialized completed');
      } catch (error) {
        this.logger?.mcpError?.(`Lifecycle: onInitialized error: ${error}`);
      }
    }
  }
  
  /**
   * Handle shutdown event
   */
  async handleShutdown(): Promise<void> {
    if (this.events.onShutdown) {
      try {
        await this.events.onShutdown();
        this.logger?.mcpError?.('Lifecycle: onShutdown completed');
      } catch (error) {
        this.logger?.mcpError?.(`Lifecycle: onShutdown error: ${error}`);
      }
    }
  }
  
  /**
   * Handle tool invoke event
   */
  async handleToolInvoke(toolName: string, args: any): Promise<void> {
    if (this.events.onToolInvoke) {
      try {
        await this.events.onToolInvoke(toolName, args);
      } catch (error) {
        this.logger?.mcpError?.(`Lifecycle: onToolInvoke error: ${error}`);
      }
    }
  }
  
  /**
   * Handle tool complete event
   */
  async handleToolComplete(toolName: string, result: any, duration: number): Promise<void> {
    if (this.events.onToolComplete) {
      try {
        await this.events.onToolComplete(toolName, result, duration);
      } catch (error) {
        this.logger?.mcpError?.(`Lifecycle: onToolComplete error: ${error}`);
      }
    }
  }
  
  /**
   * Handle tool error event
   */
  async handleToolError(toolName: string, error: Error): Promise<void> {
    if (this.events.onToolError) {
      try {
        await this.events.onToolError(toolName, error);
      } catch (err) {
        this.logger?.mcpError?.(`Lifecycle: onToolError error: ${err}`);
      }
    }
  }
}
