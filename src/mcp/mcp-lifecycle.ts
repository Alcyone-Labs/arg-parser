/**
 * MCP Lifecycle Events System
 *
 * This module provides lifecycle event hooks for MCP servers, allowing applications
 * to perform initialization, cleanup, and other lifecycle-related operations at
 * specific points in the MCP protocol flow.
 */

/**
 * Base context interface shared by all lifecycle events
 */
export interface McpLifecycleBaseContext {
  /** Get a parsed flag value by name */
  getFlag(name: string): any;
  /** MCP logger instance for this context */
  logger: any;
  /** Server information */
  serverInfo: {
    name: string;
    version: string;
    description?: string;
  };
}

/**
 * Context provided during the MCP initialize request
 * This is called when a client sends the "initialize" request
 */
export interface McpInitializeContext extends McpLifecycleBaseContext {
  /** Client information from the initialize request */
  clientInfo: {
    name: string;
    version: string;
    title?: string;
  };
  /** Protocol version being used */
  protocolVersion: string;
  /** Client capabilities */
  clientCapabilities: Record<string, any>;
}

/**
 * Context provided after the MCP initialized notification
 * This is called when a client sends the "initialized" notification
 */
export interface McpInitializedContext extends McpLifecycleBaseContext {
  /** Client information from the previous initialize request */
  clientInfo: {
    name: string;
    version: string;
    title?: string;
  };
  /** Protocol version being used */
  protocolVersion: string;
}

/**
 * Context provided during server shutdown
 * This is called when the MCP server is being shut down
 */
export interface McpShutdownContext extends McpLifecycleBaseContext {
  /** Reason for shutdown */
  reason: "client_disconnect" | "server_shutdown" | "error" | "signal";
  /** Optional error if shutdown was due to an error */
  error?: Error;
}

/**
 * Lifecycle event handlers interface
 */
export interface McpLifecycleEvents {
  /**
   * Called when a client sends an "initialize" request
   * This is the first lifecycle event and is ideal for:
   * - Database connection setup
   * - Resource initialization
   * - Configuration validation
   * - Authentication setup
   */
  onInitialize?: (context: McpInitializeContext) => Promise<void>;

  /**
   * Called when a client sends an "initialized" notification
   * This indicates the client is ready for normal operations
   * This is ideal for:
   * - Final setup steps
   * - Background task initialization
   * - Health checks
   */
  onInitialized?: (context: McpInitializedContext) => Promise<void>;

  /**
   * Called when the MCP server is shutting down
   * This is ideal for:
   * - Database connection cleanup
   * - Resource disposal
   * - Graceful shutdown procedures
   */
  onShutdown?: (context: McpShutdownContext) => Promise<void>;
}

/**
 * Internal state tracking for lifecycle events
 */
export interface McpLifecycleState {
  /** Whether the initialize event has been called */
  initialized: boolean;
  /** Whether the initialized event has been called */
  ready: boolean;
  /** Whether shutdown has been initiated */
  shuttingDown: boolean;
  /** Stored client info from initialize */
  clientInfo?: {
    name: string;
    version: string;
    title?: string;
  };
  /** Protocol version being used */
  protocolVersion?: string;
  /** Client capabilities */
  clientCapabilities?: Record<string, any>;
}

/**
 * Lifecycle manager class for handling MCP lifecycle events
 */
export class McpLifecycleManager {
  private state: McpLifecycleState = {
    initialized: false,
    ready: false,
    shuttingDown: false,
  };

  private parsedArgs: any = {};

  constructor(
    private events: McpLifecycleEvents,
    private logger: any,
    private serverInfo: { name: string; version: string; description?: string },
    private argParser?: any,
  ) {}

  /**
   * Set the parsed arguments for flag access
   */
  setParsedArgs(parsedArgs: any): void {
    this.parsedArgs = parsedArgs;
  }

  /**
   * Get a flag value from parsed arguments or environment variables
   */
  private getFlag(name: string): any {
    // First try parsed arguments if available
    if (this.parsedArgs && this.parsedArgs[name] !== undefined) {
      return this.parsedArgs[name];
    }

    // Fall back to environment variables if arg parser is available
    if (this.argParser) {
      const flagDef = this.argParser.getFlagDefinition(name);
      if (flagDef) {
        // Try environment variable
        if (flagDef.env && process.env[flagDef.env]) {
          return process.env[flagDef.env];
        }
        // Fall back to default value
        return flagDef.defaultValue;
      }
    }

    return undefined;
  }

  /**
   * Handle the initialize request
   */
  async handleInitialize(
    clientInfo: { name: string; version: string; title?: string },
    protocolVersion: string,
    clientCapabilities: Record<string, any>,
  ): Promise<void> {
    if (this.state.initialized) {
      this.logger.mcpError("Initialize called multiple times");
      return;
    }

    this.state.clientInfo = clientInfo;
    this.state.protocolVersion = protocolVersion;
    this.state.clientCapabilities = clientCapabilities;
    this.state.initialized = true;

    if (this.events.onInitialize) {
      const context: McpInitializeContext = {
        getFlag: (name: string) => this.getFlag(name),
        logger: this.logger,
        serverInfo: this.serverInfo,
        clientInfo,
        protocolVersion,
        clientCapabilities,
      };

      try {
        await this.events.onInitialize(context);
        this.logger.mcpError("Lifecycle onInitialize completed successfully");
      } catch (error) {
        this.logger.mcpError(
          `Lifecycle onInitialize failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Handle the initialized notification
   */
  async handleInitialized(): Promise<void> {
    if (!this.state.initialized) {
      this.logger.mcpError("Initialized called before initialize");
      return;
    }

    if (this.state.ready) {
      this.logger.mcpError("Initialized called multiple times");
      return;
    }

    this.state.ready = true;

    if (this.events.onInitialized && this.state.clientInfo) {
      const context: McpInitializedContext = {
        getFlag: (name: string) => this.getFlag(name),
        logger: this.logger,
        serverInfo: this.serverInfo,
        clientInfo: this.state.clientInfo,
        protocolVersion: this.state.protocolVersion!,
      };

      try {
        await this.events.onInitialized(context);
        this.logger.mcpError("Lifecycle onInitialized completed successfully");
      } catch (error) {
        this.logger.mcpError(
          `Lifecycle onInitialized failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Handle server shutdown
   */
  async handleShutdown(
    reason: "client_disconnect" | "server_shutdown" | "error" | "signal",
    error?: Error,
  ): Promise<void> {
    if (this.state.shuttingDown) {
      return; // Already shutting down
    }

    this.state.shuttingDown = true;

    if (this.events.onShutdown) {
      const context: McpShutdownContext = {
        getFlag: (name: string) => this.getFlag(name),
        logger: this.logger,
        serverInfo: this.serverInfo,
        reason,
        error,
      };

      try {
        await this.events.onShutdown(context);
        this.logger.mcpError("Lifecycle onShutdown completed successfully");
      } catch (shutdownError) {
        this.logger.mcpError(
          `Lifecycle onShutdown failed: ${shutdownError instanceof Error ? shutdownError.message : String(shutdownError)}`,
        );
        // Don't throw during shutdown - just log the error
      }
    }
  }

  /**
   * Get current lifecycle state
   */
  getState(): Readonly<McpLifecycleState> {
    return { ...this.state };
  }

  /**
   * Check if the server is ready for operations
   */
  isReady(): boolean {
    return this.state.ready && !this.state.shuttingDown;
  }
}
