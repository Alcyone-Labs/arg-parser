/**
 * MCP Resources Management
 * 
 * This module provides functionality for managing MCP resources - server-side data sources
 * that clients can access using URI templates. Resources are similar to GET endpoints
 * in a REST API and should provide data without significant computation or side effects.
 */

// Note: zod imports removed as they're not used in this file

/**
 * Resource response content item
 */
export interface McpResourceContent {
  uri: string;
  text?: string;
  blob?: Uint8Array;
  mimeType?: string;
}

/**
 * Resource response structure
 */
export interface McpResourceResponse {
  contents: McpResourceContent[];
}

/**
 * Resource handler function type
 */
export type McpResourceHandler = (
  uri: URL,
  params: Record<string, string>
) => Promise<McpResourceResponse>;

/**
 * Resource configuration for registration
 */
export interface McpResourceConfig {
  name: string;
  uriTemplate: string;
  title?: string;
  description?: string;
  mimeType?: string;
  handler: McpResourceHandler;
}

/**
 * Internal resource storage structure
 */
export interface McpResourceEntry {
  config: McpResourceConfig;
  registeredAt: Date;
}

/**
 * Resource template parser for URI patterns like "users://{userId}/profile"
 */
export class ResourceTemplateParser {
  private pattern: RegExp;
  private paramNames: string[];

  constructor(template: string) {
    // Extract parameter names from template like "users://{userId}/profile"
    const paramMatches = template.match(/\{([^}]+)\}/g) || [];
    this.paramNames = paramMatches.map(match => match.slice(1, -1));

    // Create regex pattern to match URIs
    const regexPattern = template.replace(/\{[^}]+\}/g, '([^/]+)');
    this.pattern = new RegExp(`^${regexPattern}$`);
  }

  /**
   * Parse a URI against this template and extract parameters
   */
  parse(uri: string): Record<string, string> | null {
    const match = uri.match(this.pattern);
    if (!match) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < this.paramNames.length; i++) {
      params[this.paramNames[i]] = match[i + 1];
    }
    return params;
  }

  /**
   * Check if a URI matches this template
   */
  matches(uri: string): boolean {
    return this.pattern.test(uri);
  }

  /**
   * Get the parameter names for this template
   */
  getParameterNames(): string[] {
    return [...this.paramNames];
  }
}

/**
 * MCP Resources Manager
 * 
 * Manages registration, storage, and retrieval of MCP resources
 */
export class McpResourcesManager {
  private resources = new Map<string, McpResourceEntry>();
  private changeListeners = new Set<() => void>();

  /**
   * Register a new resource
   */
  addResource(config: McpResourceConfig): void {
    // Validate configuration
    this.validateResourceConfig(config);

    // Store resource
    this.resources.set(config.name, {
      config,
      registeredAt: new Date()
    });

    // Notify listeners of change
    this.notifyChange();
  }

  /**
   * Remove a resource by name
   */
  removeResource(name: string): boolean {
    const removed = this.resources.delete(name);
    if (removed) {
      this.notifyChange();
    }
    return removed;
  }

  /**
   * Get all registered resources
   */
  getResources(): McpResourceConfig[] {
    return Array.from(this.resources.values()).map(entry => entry.config);
  }

  /**
   * Get a specific resource by name
   */
  getResource(name: string): McpResourceConfig | undefined {
    return this.resources.get(name)?.config;
  }

  /**
   * Check if a resource exists
   */
  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Find resource that matches a URI
   */
  findResourceForUri(uri: string): { config: McpResourceConfig; params: Record<string, string> } | null {
    for (const entry of this.resources.values()) {
      const parser = new ResourceTemplateParser(entry.config.uriTemplate);
      const params = parser.parse(uri);
      if (params !== null) {
        return { config: entry.config, params };
      }
    }
    return null;
  }

  /**
   * Add change listener
   */
  onResourcesChange(listener: () => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove change listener
   */
  offResourcesChange(listener: () => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Clear all resources
   */
  clear(): void {
    const hadResources = this.resources.size > 0;
    this.resources.clear();
    if (hadResources) {
      this.notifyChange();
    }
  }

  /**
   * Get resource count
   */
  count(): number {
    return this.resources.size;
  }

  /**
   * Validate resource configuration
   */
  private validateResourceConfig(config: McpResourceConfig): void {
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Resource name is required and must be a string');
    }

    if (!config.uriTemplate || typeof config.uriTemplate !== 'string') {
      throw new Error('Resource uriTemplate is required and must be a string');
    }

    if (typeof config.handler !== 'function') {
      throw new Error('Resource handler is required and must be a function');
    }

    if (this.resources.has(config.name)) {
      throw new Error(`Resource with name '${config.name}' already exists`);
    }

    // Validate URI template format
    try {
      new ResourceTemplateParser(config.uriTemplate);
    } catch (error) {
      throw new Error(`Invalid URI template '${config.uriTemplate}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in resource change listener:', error);
      }
    }
  }
}

/**
 * Helper function to create common resource configurations
 */
export const createFileResource = (basePath: string = ""): McpResourceConfig => ({
  name: "file-content",
  uriTemplate: "file://{path}",
  title: "File Content",
  description: "Read file contents from the filesystem",
  mimeType: "text/plain",
  handler: async (uri, { path }) => {
    const fs = await import('fs/promises');
    const fullPath = basePath ? `${basePath}/${path}` : path;
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return {
        contents: [{
          uri: uri.href,
          text: content,
          mimeType: "text/plain"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read file '${fullPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

/**
 * Helper function to create JSON data resource
 */
export const createJsonResource = (name: string, data: any): McpResourceConfig => ({
  name,
  uriTemplate: `${name}://data`,
  title: `${name} Data`,
  description: `Access ${name} data as JSON`,
  mimeType: "application/json",
  handler: async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify(data, null, 2),
      mimeType: "application/json"
    }]
  })
});
