/**
 * MCP Change Notifications System
 * 
 * This module provides functionality for managing MCP change notifications,
 * allowing clients to subscribe to changes in tools, resources, and prompts.
 */

/**
 * Types of MCP entities that can change
 */
export type McpChangeType = 'tools' | 'resources' | 'prompts';

/**
 * Change notification event
 */
export interface McpChangeEvent {
  type: McpChangeType;
  timestamp: Date;
  action: 'added' | 'removed' | 'updated';
  entityName?: string;
}

/**
 * Change listener function type
 */
export type McpChangeListener = (event: McpChangeEvent) => void;

/**
 * Client subscription information
 */
export interface McpClientSubscription {
  clientId: string;
  subscriptions: Set<McpChangeType>;
  connection: any; // MCP server connection object
}

/**
 * MCP Change Notifications Manager
 * 
 * Manages client subscriptions and change notifications for MCP entities
 */
export class McpNotificationsManager {
  private clients = new Map<string, McpClientSubscription>();
  private globalListeners = new Set<McpChangeListener>();
  private changeHistory: McpChangeEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Add a client connection
   */
  addClient(clientId: string, connection: any): void {
    this.clients.set(clientId, {
      clientId,
      subscriptions: new Set(),
      connection
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Subscribe a client to changes of a specific type
   */
  subscribe(clientId: string, type: McpChangeType): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(type);
    }
  }

  /**
   * Unsubscribe a client from changes of a specific type
   */
  unsubscribe(clientId: string, type: McpChangeType): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(type);
    }
  }

  /**
   * Subscribe a client to all change types
   */
  subscribeToAll(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add('tools');
      client.subscriptions.add('resources');
      client.subscriptions.add('prompts');
    }
  }

  /**
   * Unsubscribe a client from all change types
   */
  unsubscribeFromAll(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.clear();
    }
  }

  /**
   * Get client subscription status
   */
  getClientSubscriptions(clientId: string): Set<McpChangeType> | undefined {
    return this.clients.get(clientId)?.subscriptions;
  }

  /**
   * Check if a client is subscribed to a specific change type
   */
  isClientSubscribed(clientId: string, type: McpChangeType): boolean {
    const client = this.clients.get(clientId);
    return client ? client.subscriptions.has(type) : false;
  }

  /**
   * Notify all subscribed clients of a change
   */
  notifyChange(type: McpChangeType, action: 'added' | 'removed' | 'updated', entityName?: string): void {
    const event: McpChangeEvent = {
      type,
      timestamp: new Date(),
      action,
      entityName
    };

    // Add to history
    this.addToHistory(event);

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in global change listener:', error);
      }
    }

    // Notify subscribed clients
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(type)) {
        this.sendNotificationToClient(client, type);
      }
    }
  }

  /**
   * Add a global change listener (not client-specific)
   */
  addGlobalListener(listener: McpChangeListener): void {
    this.globalListeners.add(listener);
  }

  /**
   * Remove a global change listener
   */
  removeGlobalListener(listener: McpChangeListener): void {
    this.globalListeners.delete(listener);
  }

  /**
   * Get change history
   */
  getChangeHistory(limit?: number): McpChangeEvent[] {
    const history = [...this.changeHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear change history
   */
  clearHistory(): void {
    this.changeHistory = [];
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): Record<McpChangeType, number> {
    const stats: Record<McpChangeType, number> = {
      tools: 0,
      resources: 0,
      prompts: 0
    };

    for (const client of this.clients.values()) {
      for (const type of client.subscriptions) {
        stats[type]++;
      }
    }

    return stats;
  }

  /**
   * Send notification to a specific client
   */
  private sendNotificationToClient(client: McpClientSubscription, type: McpChangeType): void {
    try {
      // Send MCP notification using the connection
      if (client.connection && typeof client.connection.sendNotification === 'function') {
        client.connection.sendNotification(`notifications/${type}/list_changed`, {});
      }
    } catch (error) {
      console.error(`Error sending notification to client ${client.clientId}:`, error);
      // Consider removing the client if connection is broken
      this.removeClient(client.clientId);
    }
  }

  /**
   * Add event to change history
   */
  private addToHistory(event: McpChangeEvent): void {
    this.changeHistory.push(event);
    
    // Trim history if it exceeds max size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(0, size);
    
    // Trim current history if needed
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Clear all subscriptions and clients
   */
  clear(): void {
    this.clients.clear();
    this.globalListeners.clear();
    this.changeHistory = [];
  }
}

/**
 * Utility functions for working with change notifications
 */

/**
 * Create a debounced change notifier to batch rapid changes
 */
export function createDebouncedNotifier(
  manager: McpNotificationsManager,
  delay: number = 100
): (type: McpChangeType, action: 'added' | 'removed' | 'updated', entityName?: string) => void {
  const pending = new Map<string, { type: McpChangeType; action: 'added' | 'removed' | 'updated'; entityName?: string }>();
  let timeoutId: NodeJS.Timeout | null = null;

  return (type: McpChangeType, action: 'added' | 'removed' | 'updated', entityName?: string) => {
    const key = `${type}:${action}:${entityName || ''}`;
    pending.set(key, { type, action, entityName });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      for (const { type, action, entityName } of pending.values()) {
        manager.notifyChange(type, action, entityName);
      }
      pending.clear();
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a filtered change listener that only responds to specific types
 */
export function createFilteredListener(
  types: McpChangeType[],
  listener: McpChangeListener
): McpChangeListener {
  return (event: McpChangeEvent) => {
    if (types.includes(event.type)) {
      listener(event);
    }
  };
}

/**
 * Create a logging change listener for debugging
 */
export function createLoggingListener(prefix: string = '[MCP]'): McpChangeListener {
  return (event: McpChangeEvent) => {
    const entityInfo = event.entityName ? ` (${event.entityName})` : '';
    console.log(`${prefix} ${event.type} ${event.action}${entityInfo} at ${event.timestamp.toISOString()}`);
  };
}

/**
 * Default global notifications manager instance
 */
export const globalNotificationsManager = new McpNotificationsManager();
