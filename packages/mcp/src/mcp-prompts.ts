/**
 * MCP Prompts Manager
 * 
 * Manages MCP prompts for the server.
 */

/**
 * Prompt configuration
 */
export interface McpPromptConfig {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (args: any) => Promise<McpPrompt> | McpPrompt;
}

/**
 * Prompt response
 */
export interface McpPrompt {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
      resource?: any;
    };
  }>;
}

/**
 * Manages MCP prompts
 */
export class McpPromptsManager {
  private prompts = new Map<string, McpPromptConfig>();
  
  /**
   * Register a prompt
   */
  register(config: McpPromptConfig): void {
    this.prompts.set(config.name, config);
  }
  
  /**
   * Unregister a prompt
   */
  unregister(name: string): boolean {
    return this.prompts.delete(name);
  }
  
  /**
   * Get a prompt by name
   */
  get(name: string): McpPromptConfig | undefined {
    return this.prompts.get(name);
  }
  
  /**
   * Get all prompts
   */
  getAll(): McpPromptConfig[] {
    return Array.from(this.prompts.values());
  }
  
  /**
   * Check if a prompt exists
   */
  has(name: string): boolean {
    return this.prompts.has(name);
  }
  
  /**
   * Clear all prompts
   */
  clear(): void {
    this.prompts.clear();
  }
}
