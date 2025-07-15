import type { IConfigPlugin } from './ConfigPlugin';
import { JsonConfigPlugin, EnvConfigPlugin } from './ConfigPlugin';

/**
 * Registry for configuration plugins
 * Manages available config format plugins and provides plugin lookup
 */
export class ConfigPluginRegistry {
  private plugins: Map<string, IConfigPlugin> = new Map();
  private extensionMap: Map<string, IConfigPlugin> = new Map();
  
  constructor() {
    // Register built-in plugins (no external dependencies)
    this.registerPlugin(new JsonConfigPlugin());
    this.registerPlugin(new EnvConfigPlugin());
  }
  
  /**
   * Register a configuration plugin
   */
  public registerPlugin(plugin: IConfigPlugin): void {
    this.plugins.set(plugin.name, plugin);
    
    // Map extensions to plugin
    for (const ext of plugin.supportedExtensions) {
      this.extensionMap.set(ext.toLowerCase(), plugin);
    }
  }
  
  /**
   * Get plugin by name
   */
  public getPlugin(name: string): IConfigPlugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get plugin by file extension
   */
  public getPluginByExtension(extension: string): IConfigPlugin | undefined {
    return this.extensionMap.get(extension.toLowerCase());
  }
  
  /**
   * Check if a file extension is supported
   */
  public isExtensionSupported(extension: string): boolean {
    return this.extensionMap.has(extension.toLowerCase());
  }
  
  /**
   * Get all registered plugin names
   */
  public getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Get all supported extensions
   */
  public getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }
  
  /**
   * Unregister a plugin
   */
  public unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }
    
    // Remove from plugins map
    this.plugins.delete(name);
    
    // Remove extensions from extension map
    for (const ext of plugin.supportedExtensions) {
      this.extensionMap.delete(ext.toLowerCase());
    }
    
    return true;
  }
  
  /**
   * Clear all plugins (useful for testing)
   */
  public clear(): void {
    this.plugins.clear();
    this.extensionMap.clear();
  }
  
  /**
   * Auto-register optional plugins if their dependencies are available
   * This method attempts to load TOML and YAML plugins without throwing errors
   */
  public autoRegisterOptionalPlugins(): void {
    // Try to register TOML plugin
    try {
      const { createTomlPlugin } = require('./TomlConfigPlugin');
      const tomlPlugin = createTomlPlugin();
      if (tomlPlugin) {
        this.registerPlugin(tomlPlugin);
      }
    } catch (error) {
      // TOML plugin not available, continue without it
    }

    // Try to register YAML plugin
    try {
      const { createYamlPlugin } = require('./YamlConfigPlugin');
      const yamlPlugin = createYamlPlugin();
      if (yamlPlugin) {
        this.registerPlugin(yamlPlugin);
      }
    } catch (error) {
      // YAML plugin not available, continue without it
    }
  }

  /**
   * Async version of auto-register optional plugins with ESM support
   * This method attempts to load TOML and YAML plugins without throwing errors
   */
  public async autoRegisterOptionalPluginsAsync(): Promise<void> {
    // Try to register TOML plugin
    try {
      const { createTomlPluginAsync } = await import('./TomlConfigPlugin');
      const tomlPlugin = await createTomlPluginAsync();
      if (tomlPlugin) {
        this.registerPlugin(tomlPlugin);
      }
    } catch (error) {
      // TOML plugin not available, continue without it
    }

    // Try to register YAML plugin
    try {
      const { createYamlPluginAsync } = await import('./YamlConfigPlugin');
      const yamlPlugin = await createYamlPluginAsync();
      if (yamlPlugin) {
        this.registerPlugin(yamlPlugin);
      }
    } catch (error) {
      // YAML plugin not available, continue without it
    }
  }
}

/**
 * Global plugin registry instance
 * This can be used throughout the application
 */
export const globalConfigPluginRegistry = new ConfigPluginRegistry();

/**
 * Convenience function to register optional plugins
 * Call this once at application startup if you want TOML/YAML support
 */
export function enableOptionalConfigPlugins(): void {
  globalConfigPluginRegistry.autoRegisterOptionalPlugins();
}

/**
 * Async convenience function to register optional plugins with ESM support
 * Call this once at application startup if you want TOML/YAML support in ESM environments
 */
export async function enableOptionalConfigPluginsAsync(): Promise<void> {
  await globalConfigPluginRegistry.autoRegisterOptionalPluginsAsync();
}

/**
 * Convenience function to register only specific plugins
 */
export function enableConfigPlugins(pluginNames: string[]): void {
  for (const pluginName of pluginNames) {
    switch (pluginName.toLowerCase()) {
      case 'toml':
        try {
          const { createTomlPlugin } = require('./TomlConfigPlugin');
          const tomlPlugin = createTomlPlugin();
          if (tomlPlugin) {
            globalConfigPluginRegistry.registerPlugin(tomlPlugin);
          }
        } catch (error) {
          console.warn(`Failed to enable TOML plugin: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;
        
      case 'yaml':
        try {
          const { createYamlPlugin } = require('./YamlConfigPlugin');
          const yamlPlugin = createYamlPlugin();
          if (yamlPlugin) {
            globalConfigPluginRegistry.registerPlugin(yamlPlugin);
          }
        } catch (error) {
          console.warn(`Failed to enable YAML plugin: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;
        
      default:
        console.warn(`Unknown config plugin: ${pluginName}`);
    }
  }
}
