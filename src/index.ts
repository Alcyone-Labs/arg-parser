export { ArgParserBase, ArgParserError } from "./core/ArgParserBase";
export {
  ArgParser,
  type McpTransportConfig,
  type McpSubCommandOptions,
  type DxtServerInfo,
  type McpServerOptions,
  type WithMcpOptions,
  type McpToolConfig,
  type ToolConfig
} from "./core/ArgParser";
export { ArgParserMcp, createMcpArgParser } from "./mcp/ArgParserMcp";

export {
  zodFlagSchema,
  type IFlagCore,
  type IFlag,
  type ProcessedFlagCore,
  type ProcessedFlag,
  type TParsedArgsTypeFromFlagDef,
  type FlagsArray,
  type ResolveType,
  type ExtractFlagType,
  type TParsedArgs,
  type IHandlerContext,
  type MainHandler,
  type ISubCommand,
  type ArgParserInstance,
} from "./core/types";

export {
  generateMcpToolsFromArgParser,
  type IMcpToolStructure,
  type GenerateMcpToolsOptions,
  type IParseExecutionResult,
  type SimplifiedToolResponse,
  extractSimplifiedResponse,
  convertFlagToJsonSchemaProperty,
  convertFlagsToJsonSchema,
  convertFlagsToZodSchema,
  createMcpSuccessResponse,
  createMcpErrorResponse,
  type McpResponse,
} from "./mcp/mcp-integration";

// Plugin system exports
export {
  type IConfigPlugin,
  ConfigPlugin,
  JsonConfigPlugin,
  EnvConfigPlugin,
  ConfigPluginRegistry,
  globalConfigPluginRegistry,
  enableOptionalConfigPlugins,
  enableOptionalConfigPluginsAsync,
  enableConfigPlugins,
  TomlConfigPlugin,
  createTomlPlugin,
  createTomlPluginAsync,
  YamlConfigPlugin,
  createYamlPlugin,
  createYamlPluginAsync,
} from "./config/plugins";

export { ArgParserFuzzyTester } from "./testing/fuzzy-tester";
export type { FuzzyTestOptions, TestResult, FuzzyTestReport } from "./testing/fuzzy-tester";

// SimpleChalk export for chalk replacement in autonomous builds
export { default as SimpleChalk } from "@alcyone-labs/simple-chalk";

// Logger exports for MCP-compliant logging
export {
  Logger,
  logger,
  createMcpLogger,
  createCliLogger,
  type LogLevel,
  type LoggerConfig
} from "@alcyone-labs/simple-mcp-logger";
