/**
 * Utilities for MCP (Model Context Protocol) compatibility
 */

/**
 * Sanitizes a tool name to comply with MCP naming requirements.
 * MCP tool names must match the pattern: ^[a-zA-Z0-9_-]{1,64}$
 * 
 * @param name The original tool name
 * @returns A sanitized tool name that complies with MCP requirements
 */
export function sanitizeMcpToolName(name: string): string {
  if (!name || typeof name !== "string") {
    throw new Error("Tool name must be a non-empty string");
  }

  // Replace invalid characters with underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Ensure the name is not empty or only underscores after sanitization
  if (!sanitized || /^_+$/.test(sanitized)) {
    sanitized = "tool";
  }

  // Truncate to 64 characters if necessary
  if (sanitized.length > 64) {
    sanitized = sanitized.substring(0, 64);
  }

  return sanitized;
}

/**
 * Validates if a tool name complies with MCP naming requirements.
 * MCP tool names must match the pattern: ^[a-zA-Z0-9_-]{1,64}$
 * 
 * @param name The tool name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidMcpToolName(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  
  const mcpNamePattern = /^[a-zA-Z0-9_-]{1,64}$/;
  return mcpNamePattern.test(name);
}
