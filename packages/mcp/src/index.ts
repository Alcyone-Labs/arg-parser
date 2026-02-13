/**
 * @alcyone-labs/arg-parser-mcp v1.0.0
 * 
 * MCP (Model Context Protocol) plugin for @alcyone-labs/arg-parser.
 * 
 * This plugin adds MCP server capabilities to ArgParser, allowing you to
 * expose your CLI tools as MCP tools with minimal boilerplate.
 * 
 * @example
 * ```typescript
 * import { ArgParser } from '@alcyone-labs/arg-parser';
 * import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
 * 
 * const parser = new ArgParser({
 *   appName: 'my-cli',
 *   handler: async (ctx) => ({ result: 'success' })
 * })
 *   .use(mcpPlugin({
 *     serverInfo: {
 *       name: 'my-mcp-server',
 *       version: '1.0.0'
 *     }
 *   }));
 * 
 * await parser.parse();
 * ```
 */

// Main plugin export
export { mcpPlugin, McpPlugin } from './McpPlugin';
export type { IMcpPluginOptions, IMcpMethods } from './McpPlugin';

// Types
export type {
  DxtServerInfo,
  McpTransportConfig,
  McpSubCommandOptions,
  CorsOptions,
  AuthOptions,
  JwtVerifyOptions,
  HttpServerOptions,
  McpServerOptions,
  WithMcpOptions,
  ArgParserWithMcpOptions,
  McpToolConfig,
  ToolConfig,
  DxtCopyEntry,
  DxtCopyOptions,
  DxtOptions,
} from './types';

// Integration utilities
export {
  generateMcpToolsFromArgParser,
  convertFlagToJsonSchemaProperty,
  convertFlagsToJsonSchema,
  convertFlagsToZodSchema,
  createMcpSuccessResponse,
  createMcpErrorResponse,
  extractSimplifiedResponse,
} from './mcp-integration';
export type {
  IMcpToolStructure,
  GenerateMcpToolsOptions,
  SimplifiedToolResponse,
  McpResponse,
} from './mcp-integration';

// Utilities
export {
  sanitizeMcpToolName,
  isValidMcpToolName,
} from './mcp-utils';

// Protocol versions
export {
  CURRENT_MCP_PROTOCOL_VERSION,
  compareVersions,
} from './mcp-protocol-versions';

// Zod compatibility
export {
  validateMcpSchemaCompatibility,
  debugSchemaStructure,
} from './zod-compatibility';

// Resources and Prompts
export {
  McpResourcesManager,
  type McpResourceConfig,
  type McpResource,
} from './mcp-resources';
export {
  McpPromptsManager,
  type McpPromptConfig,
  type McpPrompt,
} from './mcp-prompts';

// Lifecycle
export {
  McpLifecycleManager,
  type McpLifecycleEvents,
} from './mcp-lifecycle';

// Notifications
export {
  McpNotificationsManager,
  type McpChangeType,
} from './mcp-notifications';
