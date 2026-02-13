/**
 * Zod Compatibility Utilities for MCP
 * 
 * Handles compatibility between different Zod versions and MCP SDK requirements.
 */

import type { ZodTypeAny } from 'zod';

/**
 * Validate that a Zod schema is compatible with MCP SDK
 */
export function validateMcpSchemaCompatibility(schema: ZodTypeAny): boolean {
  // Basic validation - check that schema has required Zod properties
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  
  // Check for _def property (present in all Zod schemas)
  if (!('_def' in schema)) {
    return false;
  }
  
  return true;
}

/**
 * Debug schema structure
 */
export function debugSchemaStructure(schema: ZodTypeAny, label: string): void {
  if (process.env['MCP_DEBUG']) {
    console.log(`[MCP Debug] ${label}:`, {
      type: typeof schema,
      hasDef: '_def' in (schema || {}),
      defType: (schema as any)?._def?.typeName,
      shape: (schema as any)?.shape ? 'present' : 'missing',
    });
  }
}
