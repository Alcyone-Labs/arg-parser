/**
 * MCP Protocol Version Management
 */

/**
 * Current MCP protocol version supported
 */
export const CURRENT_MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Compare two MCP protocol versions
 * @returns negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('-').map(Number);
  const parts2 = v2.split('-').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}
