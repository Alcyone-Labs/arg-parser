/**
 * Plugin system for ArgParser
 * 
 * This module provides the foundation for extending ArgParser functionality
 * through a plugin architecture. Plugins can add new methods, modify behavior,
 * or integrate with external systems like MCP, DXT, or TUI.
 */

// Forward reference to avoid circular dependency
// The actual type will be available at runtime
type ArgParserBase<_T = any> = any;

/**
 * Plugin interface for extending ArgParser functionality
 * 
 * @example
 * ```typescript
 * const myPlugin = (options: MyOptions): IArgParserPlugin => ({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   install(parser) {
 *     // Extend parser with custom functionality
 *     (parser as any).myMethod = () => {
 *       // Implementation
 *     };
 *   }
 * });
 * 
 * const parser = new ArgParser({...})
 *   .use(myPlugin({...}));
 * ```
 */
export interface IArgParserPlugin {
  /** Unique plugin identifier (should be reverse-DNS style, e.g., 'com.alcyone.mcp') */
  readonly name: string;
  
  /** Plugin version (semver) */
  readonly version?: string;
  
  /**
   * Install the plugin into an ArgParser instance
   * @param parser - The ArgParser instance to extend
   * @returns The modified parser or void
   */
  install<T>(parser: ArgParserBase<T>): ArgParserBase<T> | void;
  
  /**
   * Optional cleanup when parser is destroyed
   */
  destroy?(): void;
}

/**
 * Plugin metadata for introspection and dependency management
 */
export interface IPluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  peerDependencies?: string[];
}

/**
 * Plugin registry for managing installed plugins
 * 
 * This class tracks which plugins are installed on a parser instance
 * and provides methods for introspection.
 */
export class PluginRegistry {
  private plugins = new Map<string, IArgParserPlugin>();
  private metadata = new Map<string, IPluginMetadata>();
  
  /**
   * Register a plugin in the registry
   */
  register(plugin: IArgParserPlugin, metadata?: IPluginMetadata): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[ArgParser] Plugin '${plugin.name}' is already registered`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    if (metadata) {
      this.metadata.set(plugin.name, metadata);
    }
  }
  
  /**
   * Get a registered plugin by name
   */
  get(name: string): IArgParserPlugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * List all registered plugin names
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Get metadata for a plugin
   */
  getMetadata(name: string): IPluginMetadata | undefined {
    return this.metadata.get(name);
  }
  
  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (plugin?.destroy) {
      plugin.destroy();
    }
    this.metadata.delete(name);
    return this.plugins.delete(name);
  }
  
  /**
   * Clear all registered plugins
   */
  clear(): void {
    for (const [, plugin] of this.plugins) {
      if (plugin.destroy) {
        plugin.destroy();
      }
    }
    this.plugins.clear();
    this.metadata.clear();
  }
}

/**
 * Global plugin registry for system-wide plugin management
 */
export const globalPluginRegistry = new PluginRegistry();

/**
 * Decorator for plugin methods that should be exposed on the parser
 * 
 * @example
 * ```typescript
 * class MyPlugin implements IArgParserPlugin {
 *   name = 'my-plugin';
 *   
   @expose()
 *   myMethod(parser: ArgParserBase, ...args: any[]) {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function expose(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  // Mark the method as exposed
  descriptor.value._isExposed = true;
  descriptor.value._exposedName = propertyKey;
  return descriptor;
}

/**
 * Utility type for extracting plugin methods
 */
export type PluginMethods<T> = T extends IArgParserPlugin 
  ? { [K in keyof T as T[K] extends Function ? K : never]: T[K] }
  : never;
