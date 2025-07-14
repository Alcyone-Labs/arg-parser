import { ArgParser } from "../core/ArgParser";
import type { IArgParserParams } from "../core/ArgParserBase";
import type { IFlag } from "../core/types";

/**
 * MCP-optimized ArgParser that excludes config file functionality
 * This version doesn't load any config plugins, making it suitable for
 * autonomous builds where TOML/YAML dependencies cause bundling issues.
 */
export class ArgParserMcp<THandlerReturn = any> extends ArgParser<THandlerReturn> {
  constructor(params?: IArgParserParams<THandlerReturn>, initialFlags?: IFlag[]) {
    // Set a flag to indicate this is MCP mode (no config plugins)
    const mcpParams = {
      ...params,
      _mcpMode: true // Internal flag to disable config functionality
    };
    super(mcpParams as any, initialFlags);
  }

  /**
   * Override parse to skip config file processing
   */
  public parse(processArgs: string[], options?: any): any {
    // Filter out config-related system flags before parsing
    const filteredArgs = processArgs.filter(arg =>
      !arg.startsWith('--s-with-env') &&
      !arg.startsWith('--s-save-to-env') &&
      !arg.startsWith('--s-load-env')
    );

    return super.parse(filteredArgs, options);
  }
}

/**
 * Convenience function to create MCP-optimized ArgParser
 * This is the recommended way to create ArgParser instances for MCP servers
 */
export function createMcpArgParser<THandlerReturn = any>(
  params?: IArgParserParams<THandlerReturn>, 
  initialFlags?: IFlag[]
): ArgParserMcp<THandlerReturn> {
  return ArgParserMcp.withMcp(params, initialFlags);
}
