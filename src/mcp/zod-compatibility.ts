/**
 * Zod v3/v4 compatibility layer for MCP SDK integration
 *
 * The MCP SDK currently expects Zod v3 "raw shape" types for input schemas,
 * but this project uses Zod v4. This module provides compatibility functions
 * to convert Zod v4 schemas to formats that the MCP SDK can understand.
 */

import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from "zod";
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";

const logger = createMcpLogger("Zod Compatibility");

/**
 * Type representing a Zod v3 compatible raw shape
 */
type ZodV3CompatibleShape = Record<string, ZodTypeAny>;

/**
 * Type representing what the MCP SDK expects for tool registration
 */
interface McpSdkCompatibleSchema {
  shape?: ZodV3CompatibleShape;
  _def?: any;
  _zod?: any; // MCP SDK may look for this property
  parse?: (input: any) => any;
  safeParse?: (input: any) => any;
}

/**
 * Converts a Zod v4 schema to a format compatible with the MCP SDK's expectations
 * for Zod v3 raw shape types.
 *
 * @param zodSchema - The Zod v4 schema to convert
 * @returns A schema format compatible with MCP SDK
 */
export function convertToMcpCompatibleSchema(
  zodSchema: ZodTypeAny,
): McpSdkCompatibleSchema {
  // Helper to get def property from either _def (v3) or def (v4)
  const getDefProperty = (schema: any) => schema._def || schema.def;

  // If it's already a ZodObject, try to extract the shape
  if (zodSchema instanceof z.ZodObject) {
    try {
      // In Zod v4, the shape is accessible via the shape property
      const shape = (zodSchema as any).shape;
      if (shape && typeof shape === "object") {
        return {
          shape,
          _def: getDefProperty(zodSchema),
          _zod: zodSchema, // Include reference to original Zod schema
          parse: zodSchema.parse.bind(zodSchema),
          safeParse: zodSchema.safeParse.bind(zodSchema),
        };
      }
    } catch (error) {
      logger.error(
        "[Zod Compatibility] Failed to extract shape from ZodObject:",
        error,
      );
    }
  }

  // Try to extract shape from _def (v3) or def (v4) if available
  const defProperty = getDefProperty(zodSchema);
  if (defProperty && defProperty.shape) {
    try {
      const shapeGetter = defProperty.shape;
      const shape =
        typeof shapeGetter === "function" ? shapeGetter() : shapeGetter;
      return {
        shape: shape,
        _def: defProperty,
        _zod: zodSchema, // Include reference to original Zod schema
        parse: zodSchema.parse.bind(zodSchema),
        safeParse: zodSchema.safeParse.bind(zodSchema),
      };
    } catch (error) {
      logger.error(
        "[Zod Compatibility] Failed to extract shape from def property:",
        error,
      );
    }
  }

  // Fallback: create a wrapper that mimics Zod v3 behavior
  return {
    shape: {},
    _def: getDefProperty(zodSchema) || {},
    _zod: zodSchema, // Include reference to original Zod schema
    parse: zodSchema.parse.bind(zodSchema),
    safeParse: zodSchema.safeParse.bind(zodSchema),
  };
}

/**
 * Creates an empty schema compatible with MCP SDK for tools with no parameters
 */
export function createEmptyMcpSchema(): McpSdkCompatibleSchema {
  const emptySchema = z.object({});
  return convertToMcpCompatibleSchema(emptySchema);
}

/**
 * Extracts the raw shape from a Zod v4 object schema in a way that's
 * compatible with what MCP SDK expects from Zod v3.
 *
 * @param zodObjectSchema - A Zod object schema
 * @returns The raw shape or empty object if extraction fails
 */
export function extractRawShape(
  zodObjectSchema: ZodObject<ZodRawShape>,
): ZodV3CompatibleShape {
  try {
    // Try multiple methods to extract the shape

    // Method 1: Direct shape property access (Zod v4)
    if ((zodObjectSchema as any).shape) {
      return (zodObjectSchema as any).shape;
    }

    // Method 2: Shape from _def (fallback for Zod v3)
    if (
      (zodObjectSchema as any)._def &&
      typeof (zodObjectSchema as any)._def.shape === "function"
    ) {
      return (zodObjectSchema as any)._def.shape();
    }

    // Method 3: Shape from def (Zod v4)
    if (
      (zodObjectSchema as any).def &&
      typeof (zodObjectSchema as any).def.shape === "function"
    ) {
      return (zodObjectSchema as any).def.shape();
    }

    // Method 4: Static shape property from _def (Zod v3)
    if ((zodObjectSchema as any)._def && (zodObjectSchema as any)._def.shape) {
      const shapeValue = (zodObjectSchema as any)._def.shape;
      return typeof shapeValue === "function" ? shapeValue() : shapeValue;
    }

    // Method 5: Static shape property from def (Zod v4)
    if ((zodObjectSchema as any).def && (zodObjectSchema as any).def.shape) {
      const shapeValue = (zodObjectSchema as any).def.shape;
      return typeof shapeValue === "function" ? shapeValue() : shapeValue;
    }

    logger.warn(
      "[Zod Compatibility] Could not extract raw shape, returning empty object",
    );
    return {};
  } catch (error) {
    logger.error("[Zod Compatibility] Error extracting raw shape:", error);
    return {};
  }
}

/**
 * Checks if a schema is a Zod object schema
 */
export function isZodObjectSchema(
  schema: any,
): schema is ZodObject<ZodRawShape> {
  return (
    schema instanceof z.ZodObject ||
    (schema &&
      ((schema._def &&
        (schema._def.typeName === "ZodObject" ||
          schema._def.type === "object")) ||
        (schema.def &&
          (schema.def.typeName === "ZodObject" ||
            schema.def.type === "object"))))
  );
}

/**
 * Converts Zod v4 schemas to the specific format expected by MCP SDK tool registration.
 * This function handles the conversion for the server.registerTool() call.
 *
 * @param zodSchema - The Zod v4 schema to convert
 * @returns A schema format that MCP SDK can work with
 */
export function prepareMcpToolSchema(zodSchema: ZodTypeAny): any {
  // For MCP SDK compatibility, we need to provide something that looks like Zod v3

  // Add null/undefined check at the beginning
  if (!zodSchema) {
    logger.error(
      "[prepareMcpToolSchema] ERROR: zodSchema is null or undefined!",
    );
    logger.error("[prepareMcpToolSchema] Stack trace:", new Error().stack);
    throw new Error(
      "prepareMcpToolSchema called with null or undefined zodSchema",
    );
  }

  // Helper to get def property from either _def (v3) or def (v4)
  const getDefProperty = (schema: any) => schema._def || schema.def;

  if (process.env["MCP_DEBUG"]) {
    logger.error("[prepareMcpToolSchema] Input schema:");
    logger.error(`  - Type: ${typeof zodSchema}`);
    logger.error(`  - Constructor: ${zodSchema?.constructor?.name}`);
    logger.error(`  - Has _def: ${!!zodSchema?._def}`);
    logger.error(`  - Has def: ${!!zodSchema?.def}`);
    logger.error(`  - _def content:`, zodSchema?._def);
    logger.error(`  - def content:`, zodSchema?.def);
    logger.error(`  - Has shape: ${!!(zodSchema as any)?.shape}`);
  }

  if (isZodObjectSchema(zodSchema)) {
    if (process.env["MCP_DEBUG"]) {
      logger.error("[prepareMcpToolSchema] Processing as ZodObject schema");
    }
    // For object schemas, try to return the raw shape or a compatible wrapper
    const rawShape = extractRawShape(zodSchema);

    if (process.env["MCP_DEBUG"]) {
      logger.error("[prepareMcpToolSchema] Extracted raw shape:", rawShape);
      logger.error(
        "[prepareMcpToolSchema] Raw shape keys:",
        Object.keys(rawShape || {}),
      );
    }

    // Create a completely clean Zod v3-like object that MCP SDK can understand
    const defProperty = getDefProperty(zodSchema);

    // Create object with clean prototype to avoid any Zod v4 properties
    const compatibleSchema = Object.create(null);

    // Only add the essential properties that MCP SDK expects
    compatibleSchema._def = defProperty;
    compatibleSchema.shape = rawShape;

    // Essential methods
    compatibleSchema.parse = zodSchema.parse.bind(zodSchema);
    compatibleSchema.safeParse = zodSchema.safeParse.bind(zodSchema);

    // Optional methods (only if they exist)
    if (zodSchema.optional) {
      compatibleSchema.optional = zodSchema.optional.bind(zodSchema);
    }
    if (zodSchema.nullable) {
      compatibleSchema.nullable = zodSchema.nullable.bind(zodSchema);
    }

    // Store reference for debugging (but not as _zod to avoid conflicts)
    compatibleSchema._originalSchema = zodSchema;

    if (process.env["MCP_DEBUG"]) {
      logger.error("[prepareMcpToolSchema] Created compatible schema:");
      logger.error(`  - Has _def: ${!!compatibleSchema._def}`);
      logger.error(`  - Has shape: ${!!compatibleSchema.shape}`);
      logger.error(
        `  - Shape keys: ${Object.keys(compatibleSchema.shape || {})}`,
      );
    }

    return compatibleSchema;
  }

  if (process.env["MCP_DEBUG"]) {
    logger.error("[prepareMcpToolSchema] Processing as non-object schema");
  }

  // For non-object schemas, return minimal compatible object
  const defProperty = getDefProperty(zodSchema);

  // Create clean object without any Zod v4 properties
  const result = Object.create(null);

  // Only add essential properties
  result._def = defProperty;
  result.parse = zodSchema.parse.bind(zodSchema);
  result.safeParse = zodSchema.safeParse.bind(zodSchema);

  // Optional methods (only if they exist)
  if (zodSchema.optional) {
    result.optional = zodSchema.optional.bind(zodSchema);
  }
  if (zodSchema.nullable) {
    result.nullable = zodSchema.nullable.bind(zodSchema);
  }

  // Store reference for debugging
  result._originalSchema = zodSchema;

  if (process.env["MCP_DEBUG"]) {
    logger.error("[prepareMcpToolSchema] Non-object result:");
    logger.error(`  - Has _def: ${!!result._def}`);
    logger.error(`  - Type: ${typeof result}`);
  }

  return result;
}

/**
 * Simple approach: Create a clean copy of Zod schema without v4-specific properties
 * This is a non-recursive version to avoid infinite loops
 */
export function createCleanZodSchema(zodSchema: ZodTypeAny): any {
  if (!zodSchema) {
    if (process.env["MCP_DEBUG"]) {
      logger.error(
        "[createCleanZodSchema] ERROR: zodSchema is null or undefined!",
      );
    }
    // Return a simple default schema
    return z.object({});
  }

  if (process.env["MCP_DEBUG"]) {
    logger.error("[createCleanZodSchema] Input schema:");
    logger.error(`  - Type: ${typeof zodSchema}`);
    logger.error(`  - Constructor: ${zodSchema?.constructor?.name}`);
    logger.error(`  - Has ~standard: ${!!(zodSchema as any)["~standard"]}`);
    logger.error(`  - Has def: ${!!(zodSchema as any).def}`);
    logger.error(`  - Has _def: ${!!(zodSchema as any)._def}`);
  }

  // Create a minimal Zod-like object with just the essential properties
  const cleanSchema: any = {};

  // Copy essential properties that MCP SDK needs
  cleanSchema._def = (zodSchema as any)._def || (zodSchema as any).def;
  cleanSchema.parse = (zodSchema as any).parse?.bind(zodSchema);
  cleanSchema.safeParse = (zodSchema as any).safeParse?.bind(zodSchema);

  // Copy shape if it exists (for object schemas)
  if ((zodSchema as any).shape) {
    cleanSchema.shape = (zodSchema as any).shape;
  }

  // Set the prototype to match the original schema
  Object.setPrototypeOf(cleanSchema, Object.getPrototypeOf(zodSchema));

  if (process.env["MCP_DEBUG"]) {
    logger.error("[createCleanZodSchema] Clean schema created:");
    logger.error(`  - Has ~standard: ${!!(cleanSchema as any)["~standard"]}`);
    logger.error(`  - Has def: ${!!(cleanSchema as any).def}`);
    logger.error(`  - Has _def: ${!!(cleanSchema as any)._def}`);
    logger.error(`  - Has parse: ${typeof cleanSchema.parse}`);
    logger.error(`  - Has safeParse: ${typeof cleanSchema.safeParse}`);
    logger.error(`  - Has shape: ${!!(cleanSchema as any).shape}`);
  }

  return cleanSchema;
}

/**
 * Convert a Zod schema to a JSON Schema object that the MCP SDK expects
 * This is the correct approach - the MCP SDK expects JSON Schema, not Zod schemas
 */
export function zodToJsonSchema(zodSchema: ZodTypeAny): any {
  if (!zodSchema) {
    return { type: "object", properties: {} };
  }

  if (process.env["MCP_DEBUG"]) {
    logger.error("[zodToJsonSchema] Converting Zod schema to JSON Schema");
    logger.error(`  - Input type: ${typeof zodSchema}`);
    logger.error(`  - Constructor: ${zodSchema?.constructor?.name}`);
  }

  // For now, create a basic JSON Schema structure
  // This is a simplified implementation - we can enhance it later
  const def = (zodSchema as any)._def || (zodSchema as any).def;

  if (def?.typeName === "ZodObject") {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Get the shape
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;

    for (const [key, value] of Object.entries(shape || {})) {
      const fieldDef = (value as any)?._def || (value as any)?.def;

      if (fieldDef?.typeName === "ZodString") {
        properties[key] = { type: "string" };
        if (fieldDef.description) {
          properties[key].description = fieldDef.description;
        }
      } else if (fieldDef?.typeName === "ZodNumber") {
        properties[key] = { type: "number" };
      } else if (fieldDef?.typeName === "ZodBoolean") {
        properties[key] = { type: "boolean" };
      } else {
        // Fallback for unknown types
        properties[key] = { type: "string" };
      }

      // Check if field is required (not optional)
      if (fieldDef?.typeName && !fieldDef?.typeName?.includes("Optional")) {
        required.push(key);
      }
    }

    const jsonSchema = {
      type: "object" as const,
      properties,
      ...(required.length > 0 && { required }),
    };

    if (process.env["MCP_DEBUG"]) {
      logger.error(
        "[zodToJsonSchema] Generated JSON Schema:",
        JSON.stringify(jsonSchema, null, 2),
      );
    }

    return jsonSchema;
  }

  // Fallback for non-object schemas
  return { type: "object", properties: {} };
}

/**
 * Debug function to log schema structure for troubleshooting
 */
export function debugSchemaStructure(
  schema: any,
  label: string = "Schema",
): void {
  if (process.env["MCP_DEBUG"]) {
    logger.error(`[Zod Compatibility Debug] ${label} structure:`);
    logger.error(`  - Type: ${typeof schema}`);
    logger.error(`  - Constructor: ${schema?.constructor?.name}`);
    logger.error(`  - Has shape: ${!!schema?.shape}`);
    logger.error(`  - Has _def: ${!!schema?._def}`);
    logger.error(`  - _def.typeName: ${schema?._def?.typeName}`);
    logger.error(`  - _def.type: ${schema?._def?.type}`);
    logger.error(`  - Has parse: ${typeof schema?.parse}`);
    logger.error(`  - Has safeParse: ${typeof schema?.safeParse}`);

    if (schema?.shape) {
      logger.error(`  - Shape keys: ${Object.keys(schema.shape)}`);
    }
  }
}

/**
 * Validates that a schema is compatible with MCP SDK expectations
 */
export function validateMcpSchemaCompatibility(schema: any): boolean {
  try {
    // Check for required methods
    if (typeof schema?.parse !== "function") {
      logger.warn("[Zod Compatibility] Schema missing parse method");
      return false;
    }

    if (typeof schema?.safeParse !== "function") {
      logger.warn("[Zod Compatibility] Schema missing safeParse method");
      return false;
    }

    // For object schemas, check for shape
    if (
      (schema?._def?.typeName === "ZodObject" ||
        schema?._def?.type === "object") &&
      !schema?.shape
    ) {
      logger.warn(
        "[Zod Compatibility] ZodObject schema missing shape property",
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.error(
      "[Zod Compatibility] Error validating schema compatibility:",
      error,
    );
    return false;
  }
}
