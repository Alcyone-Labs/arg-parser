/**
 * Configuration plugin system
 * 
 * Provides extensible configuration loading from various sources
 * like JSON files, environment variables, YAML, and TOML.
 */

// Base plugin interface
export interface IConfigPlugin {
  name: string;
  canLoad(source: string): boolean;
  load(source: string): Promise<Record<string, any>> | Record<string, any>;
}

// Base plugin class
export abstract class ConfigPlugin implements IConfigPlugin {
  abstract name: string;
  abstract canLoad(source: string): boolean;
  abstract load(source: string): Promise<Record<string, any>> | Record<string, any>;
}

// JSON plugin
export class JsonConfigPlugin extends ConfigPlugin {
  name = 'json';
  
  canLoad(source: string): boolean {
    return source.endsWith('.json');
  }
  
  load(source: string): Record<string, any> {
    const fs = require('node:fs');
    const content = fs.readFileSync(source, 'utf-8');
    return JSON.parse(content);
  }
}

// Environment variable plugin
export class EnvConfigPlugin extends ConfigPlugin {
  name = 'env';
  
  canLoad(source: string): boolean {
    return source === '.env' || source.endsWith('.env');
  }
  
  load(_source: string): Record<string, any> {
    // Placeholder - would use dotenv in actual implementation
    return {};
  }
}

// Plugin registry
export class ConfigPluginRegistry {
  private plugins: Map<string, IConfigPlugin> = new Map();
  
  register(plugin: IConfigPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  get(name: string): IConfigPlugin | undefined {
    return this.plugins.get(name);
  }
  
  findForSource(source: string): IConfigPlugin | undefined {
    for (const plugin of this.plugins.values()) {
      if (plugin.canLoad(source)) {
        return plugin;
      }
    }
    return undefined;
  }
}

// Global registry
export const globalConfigPluginRegistry = new ConfigPluginRegistry();

// Register default plugins
globalConfigPluginRegistry.register(new JsonConfigPlugin());
globalConfigPluginRegistry.register(new EnvConfigPlugin());

// Enable optional plugins (YAML, TOML)
export async function enableOptionalConfigPlugins(): Promise<void> {
  // Would dynamically import and register YAML/TOML plugins
}

export async function enableOptionalConfigPluginsAsync(): Promise<void> {
  await enableOptionalConfigPlugins();
}

export function enableConfigPlugins(): void {
  // Synchronous version
}
