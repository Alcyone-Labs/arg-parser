/**
 * @alcyone-labs/arg-parser-dxt v1.0.0
 * 
 * DXT (Desktop Extension) plugin for @alcyone-labs/arg-parser.
 * 
 * This plugin adds DXT package generation capabilities, allowing you to
 * bundle your MCP servers for distribution through Claude Desktop.
 * 
 * @example
 * ```typescript
 * import { ArgParser } from '@alcyone-labs/arg-parser';
 * import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
 * import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';
 * 
 * const parser = new ArgParser({...})
 *   .use(mcpPlugin({ serverInfo: {...} }))
 *   .use(dxtPlugin());
 * 
 * // Build DXT package with: --s-build-dxt
 * await parser.parse();
 * ```
 */

// Main plugin export
export { dxtPlugin, DxtPlugin } from './DxtPlugin';
export type { IDxtPluginOptions } from './DxtPlugin';

// DXT Generator
export { DxtGenerator } from './DxtGenerator';

// Path resolver
export {
  DxtPathResolver,
  type IPathContext,
  type IDxtVariableConfig,
} from './DxtPathResolver';

// Types
export type {
  DxtBuildOptions,
  DxtManifest,
  DxtToolInfo,
  DxtUserConfig,
  DxtBuildResult,
} from './types';
