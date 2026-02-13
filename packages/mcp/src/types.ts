/**
 * MCP Plugin Types
 */

import type { IFlag, IHandlerContext, OutputSchemaConfig } from '@alcyone-labs/arg-parser';

/**
 * CORS configuration for streamable HTTP transport
 */
export type CorsOptions = {
  origins?: '*' | string | RegExp | Array<string | RegExp>;
  methods?: string[];
  headers?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
};

/**
 * JWT verification options
 */
export type JwtVerifyOptions = {
  algorithms?: ('HS256' | 'RS256')[];
  secret?: string;
  publicKey?: string;
  getPublicKey?: (header: any, payload: any) => Promise<string> | string;
  audience?: string | string[];
  issuer?: string | string[];
  clockToleranceSec?: number;
};

/**
 * Authentication options
 */
export type AuthOptions = {
  required?: boolean;
  scheme?: 'bearer' | 'jwt';
  allowedTokens?: string[];
  validator?: (req: any, token: string | undefined) => boolean | Promise<boolean>;
  jwt?: JwtVerifyOptions;
  publicPaths?: string[];
  protectedPaths?: string[];
  customMiddleware?: (req: any, res: any, next: any) => any;
};

/**
 * MCP transport configuration
 */
export type McpTransportConfig = {
  type: 'stdio' | 'sse' | 'streamable-http';
  port?: number;
  host?: string;
  path?: string;
  sessionIdGenerator?: () => string;
  cors?: CorsOptions;
  auth?: AuthOptions;
};

/**
 * MCP subcommand options
 */
export type McpSubCommandOptions = {
  defaultTransports?: McpTransportConfig[];
  defaultTransport?: McpTransportConfig;
};

/**
 * Server information for DXT manifest and MCP server
 */
export type DxtServerInfo = {
  name: string;
  version: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
  homepage?: string;
  documentation?: string;
  support?: string;
  keywords?: string[];
  logo?: string;
};

/**
 * DXT copy entry
 */
export type DxtCopyEntry = {
  from: string;
  to: string;
};

/**
 * DXT copy options
 */
export type DxtCopyOptions = Array<string | DxtCopyEntry>;

/**
 * DXT-specific configuration
 */
export type DxtOptions = {
  include?: DxtCopyOptions;
};

/**
 * HTTP server options
 */
export type HttpServerOptions = {
  configureExpress?: (app: any) => void;
};

/**
 * MCP server configuration options
 */
export type McpServerOptions = {
  serverInfo?: DxtServerInfo;
  defaultTransports?: McpTransportConfig[];
  defaultTransport?: McpTransportConfig;
  toolOptions?: any;
  logPath?: any;
  log?: string | any;
  lifecycle?: any;
  dxt?: DxtOptions;
  httpServer?: HttpServerOptions;
};

/**
 * Combined options for withMcp() method
 */
export type WithMcpOptions<_THandlerReturn = any> = {
  mcp?: McpServerOptions;
};

/**
 * Type alias for clarity
 */
export type ArgParserWithMcpOptions<_THandlerReturn = any> = WithMcpOptions<_THandlerReturn>;

/**
 * MCP tool configuration (deprecated)
 */
export type McpToolConfig = {
  name: string;
  description?: string;
  inputSchema?: any;
  outputSchema?: any;
  handler: (args: any) => Promise<any> | any;
};

/**
 * Unified tool configuration
 */
export type ToolConfig = {
  name: string;
  description?: string;
  flags: readonly IFlag[];
  handler: (ctx: IHandlerContext) => Promise<any> | any;
  outputSchema?: OutputSchemaConfig;
};
