import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "@alcyone-labs/simple-chalk";
import type { ProcessedFlag, TParsedArgs } from "../core/types";
import { globalConfigPluginRegistry } from "./plugins/ConfigPluginRegistry";

/**
 * ConfigurationManager handles environment file operations, format conversion,
 * and configuration merging for ArgParser instances.
 */
export class ConfigurationManager {
  private argParserInstance: any;

  constructor(argParserInstance: any) {
    this.argParserInstance = argParserInstance;

    // Auto-register built-in plugins (JSON and ENV only by default)
    // TOML and YAML plugins are optional and must be explicitly enabled
  }

  /**
   * Generates a default environment file name based on app configuration
   */
  public generateDefaultEnvFileName(): string {
    let baseName = "config";

    const appCommandName = this.argParserInstance.getAppCommandName();
    const appName = this.argParserInstance.getAppName();

    if (appCommandName) {
      baseName = appCommandName;
    } else if (appName && appName !== "Argument Parser") {
      baseName = appName;
    }

    // Convert to a safe filename format (PascalCase for .env files)
    baseName = baseName
      .split(/[\s\-_]+/)
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");

    return `${baseName}.env`;
  }

  /**
   * Handles the --s-save-to-env system flag at the final parser level
   */
  public handleSaveToEnvFlag(
    processArgs: string[],
    parserChain: any[],
  ): boolean {
    const saveToEnvIndex = processArgs.findIndex(
      (arg) => arg === "--s-save-to-env",
    );
    if (saveToEnvIndex !== -1) {
      let filePath: string;

      // Check if a filename is provided
      if (saveToEnvIndex + 1 < processArgs.length) {
        const nextArg = processArgs[saveToEnvIndex + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          filePath = nextArg;
        } else {
          // No filename provided, auto-generate one
          filePath = this.generateDefaultEnvFileName();
        }
      } else {
        // No filename provided, auto-generate one
        filePath = this.generateDefaultEnvFileName();
      }

      this.saveToEnvFile(filePath, processArgs, parserChain);
      return true;
    }
    return false;
  }

  /**
   * Saves current configuration to an environment file
   */
  public saveToEnvFile(
    filePath: string,
    _processArgs: string[],
    parserChain: any[],
  ): void {
    try {
      // Parse the current arguments to get the values
      const finalParser = parserChain[parserChain.length - 1];
      const parsedArgs = finalParser.getLastParseResult();

      if (!parsedArgs || !parsedArgs.data) {
        console.log(
          chalk.yellow(
            "No parsed arguments available. Run the command first to generate configuration.",
          ),
        );
        return;
      }

      // Collect all flags from the parser chain
      const allFlags: ProcessedFlag[] = [];
      for (const parser of parserChain) {
        allFlags.push(...parser.flags);
      }

      // Determine file format based on extension
      const ext = path.extname(filePath).toLowerCase();
      let content: string;

      // Try to use plugin system first
      const plugin = globalConfigPluginRegistry.getPluginByExtension(ext);
      if (plugin) {
        content = plugin.generate({}, allFlags, parsedArgs.data);
      } else {
        // Fallback to legacy methods for unsupported formats
        switch (ext) {
          case ".yaml":
          case ".yml":
            content = this.generateYamlFormat(allFlags, parsedArgs);
            break;
          case ".json":
            content = this.generateJsonFormat(allFlags, parsedArgs);
            break;
          case ".toml":
            content = this.generateTomlFormat(allFlags, parsedArgs);
            break;
          case ".env":
          default:
            content = this.generateEnvFormat(allFlags, parsedArgs);
            break;
        }
      }

      // Write the file
      fs.writeFileSync(filePath, content, "utf8");

      console.log(chalk.green(`✅ Configuration saved to: ${filePath}`));
      console.log(chalk.gray(`Format: ${ext || ".env"}`));
      console.log(
        chalk.gray(`Flags saved: ${Object.keys(parsedArgs.data).length}`),
      );
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Loads configuration from an environment file
   */
  public loadEnvFile(
    filePath: string,
    parserChain: any[],
  ): Record<string, any> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, "utf8");
      const ext = path.extname(filePath).toLowerCase();

      let rawConfig: Record<string, any>;

      // Try to use plugin system first
      const plugin = globalConfigPluginRegistry.getPluginByExtension(ext);
      if (plugin) {
        rawConfig = plugin.parse(content);
      } else {
        // Fallback to legacy methods for unsupported formats
        switch (ext) {
          case ".yaml":
          case ".yml":
            rawConfig = this.parseYamlFile(content);
            break;
          case ".json":
            rawConfig = this.parseJsonFile(content);
            break;
          case ".toml":
            rawConfig = this.parseTomlFile(content);
            break;
          case ".env":
          default:
            rawConfig = this.parseEnvFile(content);
            break;
        }
      }

      // Convert the raw config to flag values
      return this.convertConfigToFlagValues(rawConfig, parserChain);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not load config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return {};
    }
  }

  /**
   * Parses environment file content
   */
  public parseEnvFile(content: string): Record<string, any> {
    const config: Record<string, any> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Parses YAML file content (legacy method - now uses plugin system)
   */
  public parseYamlFile(content: string): Record<string, any> {
    const plugin = globalConfigPluginRegistry.getPluginByExtension(".yaml");
    if (plugin) {
      return plugin.parse(content);
    }

    // Fallback: Simple YAML parsing for basic key-value pairs and arrays
    console.warn(
      "YAML plugin not available, using simple parser. Install js-yaml and enable YAML plugin for full support.",
    );
    const config: Record<string, any> = {};
    const lines = content.split("\n");
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Check if this is an array item
      if (trimmed.startsWith("- ")) {
        if (currentKey) {
          const arrayValue = trimmed.substring(2).trim();
          // Remove quotes if present
          const cleanValue =
            (arrayValue.startsWith('"') && arrayValue.endsWith('"')) ||
            (arrayValue.startsWith("'") && arrayValue.endsWith("'"))
              ? arrayValue.slice(1, -1)
              : arrayValue;
          currentArray.push(cleanValue);
        }
        continue;
      }

      // Check if this is a key-value pair
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        // If we were building an array, save it
        if (currentKey && currentArray.length > 0) {
          config[currentKey] = currentArray;
          currentArray = [];
        }

        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();

        // If value is empty, this might be the start of an array
        if (!value) {
          currentKey = key;
          currentArray = [];
          continue;
        }

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        config[key] = value;
        currentKey = null;
      }
    }

    // Handle any remaining array
    if (currentKey && currentArray.length > 0) {
      config[currentKey] = currentArray;
    }

    return config;
  }

  /**
   * Parses JSON file content
   */
  public parseJsonFile(content: string): Record<string, any> {
    try {
      return JSON.parse(content) || {};
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parses TOML file content (legacy method - now uses plugin system)
   */
  public parseTomlFile(content: string): Record<string, any> {
    const plugin = globalConfigPluginRegistry.getPluginByExtension(".toml");
    if (plugin) {
      return plugin.parse(content);
    }

    // Fallback: Simple TOML parsing for basic key-value pairs
    console.warn(
      "TOML plugin not available, using simple parser. Install smol-toml and enable TOML plugin for full support.",
    );
    const config: Record<string, any> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Converts raw configuration to flag values with proper type conversion
   */
  public convertConfigToFlagValues(
    rawConfig: Record<string, any>,
    parserChain: any[],
  ): Record<string, any> {
    const flagValues: Record<string, any> = {};

    // Collect all flags from the parser chain
    const allFlags: ProcessedFlag[] = [];
    for (const parser of parserChain) {
      allFlags.push(...parser.flags);
    }

    // Convert each config value to the appropriate flag type
    for (const [key, value] of Object.entries(rawConfig)) {
      // Try exact match first, then case-insensitive match
      let flag = allFlags.find((f) => f["name"] === key);
      if (!flag) {
        flag = allFlags.find(
          (f) => f["name"].toLowerCase() === key.toLowerCase(),
        );
      }

      if (flag) {
        try {
          // Use the actual flag name (not the config key) for consistency
          flagValues[flag["name"]] = this.convertValueToFlagType(value, flag);
        } catch (error) {
          console.warn(
            chalk.yellow(
              `Warning: Could not convert config value for flag '${key}': ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
      }
    }

    return flagValues;
  }

  /**
   * Converts a value to the appropriate flag type
   */
  public convertValueToFlagType(value: any, flag: ProcessedFlag): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle both string literal and String constructor function
    const flagType = flag["type"];
    const isStringType = flagType === "string" || flagType === String;
    const isNumberType = flagType === "number" || flagType === Number;
    const isBooleanType = flagType === "boolean" || flagType === Boolean;

    if (isStringType) {
      // Handle allowMultiple flags that expect arrays
      if (flag["allowMultiple"]) {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            // Try to parse as JSON array
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            // Try to split by comma
            return value.split(",").map((v) => v.trim());
          }
        }
        return [String(value)];
      }
      return String(value);
    } else if (isNumberType) {
      // If it's already a number, return it as-is
      if (typeof value === "number") {
        return value;
      }
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(
          `Cannot convert '${value}' to number for flag '${flag["name"]}'`,
        );
      }
      return num;
    } else if (isBooleanType) {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (
          lower === "true" ||
          lower === "1" ||
          lower === "yes" ||
          lower === "on"
        )
          return true;
        if (
          lower === "false" ||
          lower === "0" ||
          lower === "no" ||
          lower === "off"
        )
          return false;
      }
      throw new Error(
        `Cannot convert '${value}' to boolean for flag '${flag["name"]}'`,
      );
    } else if (flagType === "table") {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          // Try to parse as JSON array
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // Try to split by comma
          return value.split(",").map((v) => v.trim());
        }
      }
      throw new Error(
        `Cannot convert '${value}' to table for flag '${flag["name"]}'`,
      );
    } else {
      // Handle custom type functions or fallback to string
      if (typeof flagType === "function") {
        try {
          return flagType(value);
        } catch (error) {
          throw new Error(
            `Custom type conversion failed for flag '${flag["name"]}': ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      return String(value);
    }
  }

  /**
   * Merges environment configuration with command line arguments
   */
  public mergeEnvConfigWithArgs(
    envConfig: Record<string, any>,
    processArgs: string[],
  ): string[] {
    const mergedArgs = [...processArgs];

    // Add environment config values as flags if they're not already present
    for (const [key, value] of Object.entries(envConfig)) {
      const flagPattern = new RegExp(`^--${key}(=|$)`);
      const hasFlag = mergedArgs.some((arg) => flagPattern.test(arg));

      if (!hasFlag) {
        if (typeof value === "boolean") {
          if (value) {
            mergedArgs.push(`--${key}`);
          }
        } else if (Array.isArray(value)) {
          // For table/array values, add multiple flags
          for (const item of value) {
            mergedArgs.push(`--${key}`, String(item));
          }
        } else {
          mergedArgs.push(`--${key}`, String(value));
        }
      }
    }

    return mergedArgs;
  }

  /**
   * Generates environment file format
   */
  public generateEnvFormat(
    flags: ProcessedFlag[],
    parsedArgs: TParsedArgs<any>,
  ): string {
    const lines: string[] = [];
    lines.push("# Environment configuration file");
    lines.push(`# Generated on ${new Date().toISOString()}`);
    lines.push("");

    for (const flag of flags) {
      const value = parsedArgs["data"][flag["name"]];
      if (value !== undefined) {
        lines.push(`# ${flag["description"] || flag["name"]} `);
        lines.push(`# Type: ${this.getTypeString(flag["type"])}`);

        if (Array.isArray(value)) {
          lines.push(`${flag["name"].toUpperCase()}=${JSON.stringify(value)}`);
        } else if (typeof value === "string" && value.includes(" ")) {
          lines.push(`${flag["name"].toUpperCase()}="${value}"`);
        } else {
          lines.push(`${flag["name"].toUpperCase()}=${value}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generates YAML file format (legacy method - now uses plugin system)
   */
  public generateYamlFormat(
    flags: ProcessedFlag[],
    parsedArgs: TParsedArgs<any>,
  ): string {
    const plugin = globalConfigPluginRegistry.getPluginByExtension(".yaml");
    if (plugin) {
      // Plugin expects raw data object, not TParsedArgs
      return plugin.generate({}, flags, parsedArgs.data || parsedArgs);
    }

    // Fallback: Simple YAML generation
    const lines: string[] = [];
    lines.push("# YAML configuration file");
    lines.push(`# Generated on ${new Date().toISOString()}`);
    lines.push("");

    for (const flag of flags) {
      const value = parsedArgs["data"][flag["name"]];
      if (value !== undefined) {
        lines.push(`# ${flag["description"] || flag["name"]} `);
        lines.push(`# Type: ${this.getTypeString(flag["type"])}`);

        if (Array.isArray(value)) {
          lines.push(`${flag["name"]}:`);
          for (const item of value) {
            lines.push(
              `  - ${typeof item === "string" && item.includes(" ") ? `"${item}"` : item}`,
            );
          }
        } else if (typeof value === "string" && value.includes(" ")) {
          lines.push(`${flag["name"]}: "${value}"`);
        } else {
          lines.push(`${flag["name"]}: ${value}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generates JSON file format
   */
  public generateJsonFormat(
    flags: ProcessedFlag[],
    parsedArgs: TParsedArgs<any>,
  ): string {
    const config: Record<string, any> = {};

    for (const flag of flags) {
      const value = parsedArgs["data"][flag["name"]];
      if (value !== undefined) {
        config[flag["name"]] = value;
      }
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generates TOML file format (legacy method - now uses plugin system)
   */
  public generateTomlFormat(
    flags: ProcessedFlag[],
    parsedArgs: TParsedArgs<any>,
  ): string {
    const plugin = globalConfigPluginRegistry.getPluginByExtension(".toml");
    if (plugin) {
      // Plugin expects raw data object, not TParsedArgs
      return plugin.generate({}, flags, parsedArgs.data || parsedArgs);
    }

    // Fallback: Simple TOML generation
    const lines: string[] = [];
    lines.push("# TOML configuration file");
    lines.push(`# Generated on ${new Date().toISOString()}`);
    lines.push("");

    for (const flag of flags) {
      const value = parsedArgs["data"][flag["name"]];
      if (value !== undefined) {
        lines.push(`# ${flag["description"] || flag["name"]} `);
        lines.push(`# Type: ${this.getTypeString(flag["type"])}`);

        if (Array.isArray(value)) {
          const arrayStr = value
            .map((item) =>
              typeof item === "string" ? `"${item}"` : String(item),
            )
            .join(", ");
          lines.push(`${flag["name"]} = [${arrayStr}]`);
        } else if (typeof value === "string") {
          lines.push(`${flag["name"]} = "${value}"`);
        } else {
          lines.push(`${flag["name"]} = ${value}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Gets a string representation of a flag type
   */
  private getTypeString(type: any): string {
    if (typeof type === "string") {
      return type;
    } else if (typeof type === "function") {
      return type.name || "function";
    } else {
      return "unknown";
    }
  }
}
