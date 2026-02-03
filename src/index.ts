export {
  ArgParserBase,
  ArgParserError,
  autoHelpHandler,
  type IParseOptions,
} from "./core/ArgParserBase";
export {
  ArgParser,
  type McpTransportConfig,
  type McpSubCommandOptions,
  type DxtServerInfo,
  type McpServerOptions,
  type WithMcpOptions,
  type ArgParserWithMcpOptions,
  type McpToolConfig,
  type ToolConfig,
  type DxtCopyEntry,
  type DxtCopyOptions,
  type DxtOptions,
  type CorsOptions,
  type AuthOptions,
  type JwtVerifyOptions,
  type HttpServerOptions,
  type ExpressApplication,
} from "./core/ArgParser";

// Re-export McpLoggerOptions directly from the library for user convenience
export type { McpLoggerOptions } from "@alcyone-labs/simple-mcp-logger";

// Log path configuration exports
export {
  resolveLogPath,
  detectEntryPoint,
  getEntryPointFromImportMeta,
  entryRelative,
  cwdRelative,
  absolutePath,
  legacyCwdPath,
  type LogPath,
  type LogPathConfig,
} from "./core/log-path-utils";

// DXT path resolution exports
export {
  DxtPathResolver,
  type IPathContext,
  type IDxtVariableConfig,
} from "./core/dxt-path-resolver";

// Debug utility exports
export { debug } from "./utils/debug-utils";

export { ArgParserMcp, createMcpArgParser } from "./mcp/ArgParserMcp";

// MCP utility functions
export { sanitizeMcpToolName, isValidMcpToolName } from "./mcp/mcp-utils";

export {
  zodFlagSchema,
  zodDxtOptionsSchema,
  FlagInheritance,
  type TFlagInheritance,
  type IFlagCore,
  type IFlag,
  type IDxtOptions,
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
  type DynamicRegisterContext,
  type DynamicRegisterFn,
  getJsonSchemaTypeFromFlag,
  OutputSchemaPatterns,
  type OutputSchemaPatternName,
  type OutputSchemaConfig,
  createOutputSchema,
  type ArgParserOptions,
  type ArgParserBehaviorOptions,
  type ISystemArgs,
  // Interactive prompts types
  type PromptType,
  type PromptFieldConfig,
  type PromptWhen,
  type IPromptableFlag,
  type IInteractiveSubCommand,
} from "./core/types";

// FlagManager exports for advanced flag management and collision detection
export { FlagManager, type FlagManagerOptions, type FlagOptionCollision } from "./core/FlagManager";

// PromptManager exports for interactive prompts with @clack/prompts
export {
  PromptManager,
  type PromptManagerOptions,
  type PromptResult,
} from "./core/PromptManager";

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
  type LoggerConfig,
} from "@alcyone-labs/simple-mcp-logger";

// TUI System exports (OpenTUI v2 with SolidJS)
// NOTE: TUI runtime (createTuiApp) is available via separate import: "@alcyone-labs/arg-parser/tui"
// This avoids loading @opentui/core during normal arg-parser usage.
export type { TuiAppConfig, TuiTheme, ShortcutBinding, ToastType } from "./tui/types";
