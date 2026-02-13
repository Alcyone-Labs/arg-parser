/**
 * MCP Resources Manager
 * 
 * Manages MCP resources for the server.
 */

/**
 * Resource configuration
 */
export interface McpResourceConfig {
  name: string;
  uriTemplate: string;
  title?: string;
  description?: string;
  mimeType?: string;
  handler: (uri: URL, params: any) => Promise<McpResource> | McpResource;
}

/**
 * Resource response
 */
export interface McpResource {
  contents: Array<{
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  }>;
}

/**
 * Manages MCP resources
 */
export class McpResourcesManager {
  private resources = new Map<string, McpResourceConfig>();
  
  /**
   * Register a resource
   */
  register(config: McpResourceConfig): void {
    this.resources.set(config.name, config);
  }
  
  /**
   * Unregister a resource
   */
  unregister(name: string): boolean {
    return this.resources.delete(name);
  }
  
  /**
   * Get a resource by name
   */
  get(name: string): McpResourceConfig | undefined {
    return this.resources.get(name);
  }
  
  /**
   * Get all resources
   */
  getAll(): McpResourceConfig[] {
    return Array.from(this.resources.values());
  }
  
  /**
   * Check if a resource exists
   */
  has(name: string): boolean {
    return this.resources.has(name);
  }
  
  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
  }
}
