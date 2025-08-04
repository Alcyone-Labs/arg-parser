import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectEntryPoint } from "./log-path-utils";

/**
 * Context information for path resolution
 */
export interface IPathContext {
  /** Whether the code is running in a DXT environment */
  isDxt: boolean;
  /** DXT extension directory (when running in DXT) */
  extensionDir?: string;
  /** User's home directory */
  userHome?: string;
  /** Current working directory */
  cwd?: string;
  /** Entry point directory */
  entryDir?: string;
}

/**
 * Configuration for DXT variable substitution
 */
export interface IDxtVariableConfig {
  /** Custom variable values to override defaults */
  customVariables?: Record<string, string>;
  /** Whether to allow undefined variables (default: false) */
  allowUndefined?: boolean;
}

/**
 * DXT-aware path resolver with context detection and variable substitution
 */
export class DxtPathResolver {
  private static _cachedContext: IPathContext | null = null;

  /**
   * Detects the current execution context
   * @param forceRefresh - Force refresh of cached context
   * @returns Path context information
   */
  public static detectContext(forceRefresh = false): IPathContext {
    if (!forceRefresh && this._cachedContext) {
      return this._cachedContext;
    }

    const context: IPathContext = {
      isDxt: this.isDxtEnvironment(),
      userHome: typeof os.homedir === 'function' ? os.homedir() : undefined,
      cwd: typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : undefined,
    };

    // Detect entry point directory
    const entryPoint = detectEntryPoint();
    if (entryPoint) {
      context.entryDir = path.dirname(entryPoint);
    }

    // Detect DXT extension directory if in DXT environment
    if (context.isDxt) {
      context.extensionDir = this.detectDxtExtensionDir();
    }

    this._cachedContext = context;
    return context;
  }

  /**
   * Checks if the current environment is a DXT environment
   * @returns True if running in DXT, false otherwise
   */
  public static isDxtEnvironment(): boolean {
    // Check for DXT-specific environment variables
    if (process.env['DXT_EXTENSION_DIR'] || process.env['CLAUDE_DESKTOP_DXT']) {
      return true;
    }

    // Check for DXT-specific file patterns in the current directory
    const dxtIndicators = [
      "manifest.json", // DXT packages have manifest.json
      ".dxt", // DXT marker file
    ];

    for (const indicator of dxtIndicators) {
      const indicatorPath = path.join(process.cwd(), indicator);
      if (fs.existsSync(indicatorPath)) {
        // Additional validation for manifest.json to ensure it's a DXT manifest
        if (indicator === "manifest.json") {
          try {
            const manifest = JSON.parse(fs.readFileSync(indicatorPath, "utf-8"));
            if (manifest.server && manifest.user_config) {
              return true;
            }
          } catch {
            // Not a valid DXT manifest, continue checking
          }
        } else {
          return true;
        }
      }
    }

    // Check if running from a path that looks like a DXT extension
    const cwd = process.cwd();
    if (cwd.includes("claude-desktop") || cwd.includes("extensions")) {
      return true;
    }

    return false;
  }

  /**
   * Detects the DXT extension directory
   * @returns DXT extension directory path or undefined
   */
  private static detectDxtExtensionDir(): string | undefined {
    // Check environment variable first
    if (process.env['DXT_EXTENSION_DIR']) {
      return process.env['DXT_EXTENSION_DIR'];
    }

    // Try to detect from current working directory
    const cwd = process.cwd();
    
    // If we're in a DXT package, the extension dir is typically the parent or current directory
    if (fs.existsSync(path.join(cwd, "manifest.json"))) {
      return cwd;
    }

    // Look for parent directories that might be the extension dir
    let currentDir = cwd;
    for (let i = 0; i < 3; i++) { // Check up to 3 levels up
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root

      if (fs.existsSync(path.join(parentDir, "manifest.json"))) {
        return parentDir;
      }
      currentDir = parentDir;
    }

    return undefined;
  }

  /**
   * Resolves a path with DXT variable substitution
   * @param inputPath - Path that may contain DXT variables
   * @param context - Optional context (will be detected if not provided)
   * @param config - Optional configuration for variable substitution
   * @returns Resolved absolute path
   */
  public static resolvePath(
    inputPath: string,
    context?: IPathContext,
    config?: IDxtVariableConfig
  ): string {
    const ctx = context || this.detectContext();
    const resolvedPath = this.substituteVariables(inputPath, ctx, config);

    // If already absolute, return as-is
    if (path.isAbsolute(resolvedPath)) {
      return resolvedPath;
    }

    // Resolve relative paths based on context
    if (ctx.isDxt && ctx.extensionDir) {
      return path.resolve(ctx.extensionDir, resolvedPath);
    } else if (ctx.entryDir) {
      return path.resolve(ctx.entryDir, resolvedPath);
    } else {
      return path.resolve(ctx.cwd || process.cwd(), resolvedPath);
    }
  }

  /**
   * Substitutes DXT variables in a path string
   * @param inputPath - Path containing variables like ${HOME}, ${__dirname}, etc.
   * @param context - Path context
   * @param config - Variable substitution configuration
   * @returns Path with variables substituted
   */
  public static substituteVariables(
    inputPath: string,
    context: IPathContext,
    config?: IDxtVariableConfig
  ): string {
    const safeHomedir = () => typeof os.homedir === 'function' ? os.homedir() : '/tmp';
    const homeDir = context.userHome || safeHomedir();

    const variables: Record<string, string> = {
      // Standard DXT variables
      HOME: homeDir,
      DOCUMENTS: path.join(homeDir, "Documents"),
      DOWNLOADS: path.join(homeDir, "Downloads"),
      DESKTOP: path.join(homeDir, "Desktop"),
      pathSeparator: path.sep,
      
      // Context-specific variables
      __dirname: context.isDxt && context.extensionDir 
        ? context.extensionDir 
        : context.entryDir || context.cwd || process.cwd(),
      
      // DXT-specific variables
      ...(context.isDxt && context.extensionDir && {
        DXT_DIR: context.extensionDir,
        EXTENSION_DIR: context.extensionDir,
      }),

      // Custom variables override defaults
      ...config?.customVariables,
    };

    // Replace variables in the format ${VARIABLE_NAME}
    return inputPath.replace(/\$\{([^}]*)\}/g, (match, variableName) => {
      // Handle empty variable names
      if (!variableName.trim()) {
        if (config?.allowUndefined) {
          return match;
        }
        throw new Error(
          `Undefined DXT variable: ${variableName}. Available variables: ${Object.keys(variables).join(", ")}`
        );
      }

      const value = variables[variableName];

      if (value !== undefined) {
        return value;
      }

      if (config?.allowUndefined) {
        return match; // Keep the original variable if undefined is allowed
      }

      throw new Error(
        `Undefined DXT variable: ${variableName}. Available variables: ${Object.keys(variables).join(", ")}`
      );
    });
  }

  /**
   * Creates a path for user data storage
   * @param filename - Name of the file or subdirectory
   * @param context - Optional context (will be detected if not provided)
   * @returns Absolute path for user data
   */
  public static createUserDataPath(filename: string, context?: IPathContext): string {
    const ctx = context || this.detectContext();
    
    if (ctx.isDxt && ctx.extensionDir) {
      // In DXT environment, store in extension directory
      return path.join(ctx.extensionDir, "data", filename);
    } else {
      // In development, store in user's data directory
      const safeHomedir = () => typeof os.homedir === 'function' ? os.homedir() : '/tmp';
      const userDataDir = process.env['XDG_DATA_HOME'] ||
        path.join(ctx.userHome || safeHomedir(), ".local", "share");
      const appName = this.getAppName(ctx);
      return path.join(userDataDir, appName, filename);
    }
  }

  /**
   * Creates a path for temporary files
   * @param filename - Name of the temporary file
   * @param context - Optional context (will be detected if not provided)
   * @returns Absolute path for temporary file
   */
  public static createTempPath(filename: string, context?: IPathContext): string {
    const ctx = context || this.detectContext();
    
    if (ctx.isDxt && ctx.extensionDir) {
      // In DXT environment, use extension temp directory
      return path.join(ctx.extensionDir, "temp", filename);
    } else {
      // In development, use system temp directory
      const safeTmpdir = () => typeof os.tmpdir === 'function' ? os.tmpdir() : '/tmp';
      const appName = this.getAppName(ctx);
      return path.join(safeTmpdir(), appName, filename);
    }
  }

  /**
   * Creates a path for configuration files
   * @param filename - Name of the configuration file
   * @param context - Optional context (will be detected if not provided)
   * @returns Absolute path for configuration file
   */
  public static createConfigPath(filename: string, context?: IPathContext): string {
    const ctx = context || this.detectContext();
    
    if (ctx.isDxt && ctx.extensionDir) {
      // In DXT environment, store in extension directory
      return path.join(ctx.extensionDir, "config", filename);
    } else {
      // In development, store in user's config directory
      const safeHomedir = () => typeof os.homedir === 'function' ? os.homedir() : '/tmp';
      const configDir = process.env['XDG_CONFIG_HOME'] ||
        path.join(ctx.userHome || safeHomedir(), ".config");
      const appName = this.getAppName(ctx);
      return path.join(configDir, appName, filename);
    }
  }

  /**
   * Gets the application name for directory creation
   * @param context - Path context
   * @returns Application name or default
   */
  private static getAppName(context: IPathContext): string {
    // Try to get app name from package.json
    try {
      const packageJsonPath = path.join(context.entryDir || context.cwd || process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        return packageJson.name || "argparser-app";
      }
    } catch {
      // Ignore errors
    }

    return "argparser-app";
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param dirPath - Directory path to ensure
   * @returns True if directory exists or was created successfully
   */
  public static ensureDirectory(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.warn(`Failed to create directory: ${dirPath}`, error);
      return false;
    }
  }

  /**
   * Clears the cached context (useful for testing)
   */
  public static clearCache(): void {
    this._cachedContext = null;
  }
}
