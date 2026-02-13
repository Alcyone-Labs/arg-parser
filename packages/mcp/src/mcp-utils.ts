/**
 * MCP Utility Functions
 */

/**
 * Sanitize a tool name for MCP compatibility
 * MCP tool names must match ^[a-zA-Z0-9_-]{1,64}$
 */
export function sanitizeMcpToolName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
}

/**
 * Check if a tool name is valid for MCP
 */
export function isValidMcpToolName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(name);
}
