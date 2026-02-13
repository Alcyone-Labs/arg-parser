/**
 * MCP Notifications Manager
 * 
 * Manages MCP notifications for resource and prompt changes.
 */

export type McpChangeType = 'resource' | 'prompt' | 'tool';

/**
 * Manages MCP notifications
 */
export class McpNotificationsManager {
  private subscribers = new Map<McpChangeType, Set<(callback: any) => void>>();
  
  /**
   * Subscribe to change notifications
   */
  subscribe(type: McpChangeType, callback: (change: any) => void): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    
    this.subscribers.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(type)?.delete(callback);
    };
  }
  
  /**
   * Notify subscribers of a change
   */
  notify(type: McpChangeType, change: any): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(change);
        } catch (error) {
          console.error(`[MCP Notifications] Error in ${type} callback:`, error);
        }
      }
    }
  }
  
  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }
}
