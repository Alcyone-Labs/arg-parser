/**
 * @alcyone-labs/arg-parser v3.0.0
 * 
 * A robust, type-safe CLI argument parser with plugin support.
 * 
 * @example
 * ```typescript
 * import { ArgParser } from '@alcyone-labs/arg-parser';
 * 
 * const parser = new ArgParser({
 *   appName: 'my-cli',
 *   handler: async (ctx) => {
 *     console.log('Args:', ctx.args);
 *   }
 * });
 * 
 * await parser.parse();
 * ```
 */

// Core exports
export { ArgParser, ArgParserError } from './core/ArgParser';
export type { IArgParserParams, IParseOptions } from './core/ArgParser';

// Flag management
export { FlagManager, type FlagManagerOptions, type FlagOptionCollision } from './core/FlagManager';

// Prompt management
export { PromptManager, type PromptManagerOptions, type PromptResult } from './core/PromptManager';

// Plugin system
export {
  type IArgParserPlugin,
  type IPluginMetadata,
  PluginRegistry,
  globalPluginRegistry,
  expose,
  type PluginMethods,
} from './plugin/types';

// Types
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
  type ParseResult,
} from './core/types';

// Config plugins
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
} from './config/plugins';

// Utilities
export { debug } from './utils/debug-utils';
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
} from './core/log-path-utils';

// SimpleChalk export for chalk replacement
export { default as SimpleChalk } from '@alcyone-labs/simple-chalk';
