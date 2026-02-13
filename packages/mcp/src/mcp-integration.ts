import { z } from "zod";
import type { ZodRawShape, ZodTypeAny } from "zod";
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";
import {
  ArgParser,
  type IFlag,
  type ProcessedFlag,
  createOutputSchema,
  getJsonSchemaTypeFromFlag
} from "@alcyone-labs/arg-parser";
import { sanitizeMcpToolName } from "./mcp-utils.js";

const logger = createMcpLogger("MCP Integration");

/**
 * Standard MCP response format
 */
export interface McpResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  structuredContent?: any;
}

/**
 * Create a standardized MCP success response
 */
export function createMcpSuccessResponse(data: any): McpResponse {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: typeof data === "object" ? data : undefined,
  };
}

/**
 * Create a standardized MCP error response
 */
export function createMcpErrorResponse(error: string | Error): McpResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorData = { error: errorMessage, success: false };
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Error: ${errorMessage}`,
      },
    ],
    structuredContent: errorData,
  };
}

/**
 * Convert a single ArgParser flag to JSON Schema property
 */
export function convertFlagToJsonSchemaProperty(flag: IFlag | ProcessedFlag): {
  property: any;
  isRequired: boolean;
} {
  const property: any = {
    type: getJsonSchemaTypeFromFlag(flag.type as any),
    description: (flag.description as string) || `${flag.name} parameter`,
  };

  // Handle enums
  if (flag.enum && Array.isArray(flag.enum)) {
    property.enum = flag.enum;
  }

  // Handle default values
  const defaultValue = flag.defaultValue;
  if (defaultValue !== undefined) {
    property.default = defaultValue;
  } else if (flag.flagOnly && getJsonSchemaTypeFromFlag(flag.type as any) === "boolean") {
    // For flagOnly boolean flags, default to false when not explicitly set
    property.default = false;
  }

  // Determine if required
  const isRequired = !!flag.mandatory;

  return { property, isRequired };
}

/**
 * Convert ArgParser flags to MCP JSON Schema
 */
export function convertFlagsToJsonSchema(flags: readonly (IFlag | ProcessedFlag)[]): {
  type: "object";
  properties: Record<string, any>;
  required: string[];
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const flag of flags) {
    // Skip help flag and system flags
    if (flag.name === "help" || flag.name.startsWith("s-")) {
      continue;
    }

    const { property, isRequired } = convertFlagToJsonSchemaProperty(flag);
    properties[flag.name] = property;

    if (isRequired) {
      required.push(flag.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}

/**
 * Convert ArgParser flags to Zod schema for MCP tools
 */
export function convertFlagsToZodSchema(flags: readonly (IFlag | ProcessedFlag)[]): ZodTypeAny {
  const zodProperties: Record<string, ZodTypeAny> = {};

  for (const flag of flags) {
    // Skip help flag and system flags
    if (flag.name === "help" || flag.name.startsWith("s-")) {
      continue;
    }

    const zodSchema = mapArgParserFlagToZodSchema(flag);
    zodProperties[flag.name] = zodSchema;
  }

  return z.object(zodProperties);
}

/**
 * Simplified response format for testing and validation
 */
export interface SimplifiedToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  exitCode?: number;
}

/**
 * Extract simplified response from MCP protocol response
 */
export function extractSimplifiedResponse(mcpResponse: any): SimplifiedToolResponse {
  // Handle responses that are already in simplified format
  if (typeof mcpResponse === "object" && mcpResponse !== null && "success" in mcpResponse) {
    return {
      success: mcpResponse.success,
      data: mcpResponse.data,
      error: mcpResponse.error || mcpResponse.message,
      message: mcpResponse.message || mcpResponse.error,
      exitCode: mcpResponse.exitCode,
    };
  }

  // Handle error responses
  if (mcpResponse.isError) {
    const errorMessage = mcpResponse.content?.[0]?.text || "Unknown error";
    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
      data: { error: errorMessage },
      exitCode: 1,
    };
  }

  // Handle structured content
  if (mcpResponse.structuredContent) {
    return {
      success: true,
      data: mcpResponse.structuredContent,
    };
  }

  // Handle standard MCP content format
  if (mcpResponse.content && Array.isArray(mcpResponse.content)) {
    try {
      const textContent = mcpResponse.content[0]?.text;
      if (textContent) {
        const parsedData = JSON.parse(textContent);
        return {
          success: true,
          data: parsedData,
        };
      }
    } catch {
      return {
        success: true,
        data: mcpResponse.content[0]?.text || "No content",
      };
    }
  }

  return {
    success: false,
    error: "Unexpected response format",
    exitCode: 1,
  };
}

// Structural type for what MCP server.tool() expects
export interface IMcpToolStructure {
  name: string;
  description?: string;
  inputSchema: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  execute: (args: any) => Promise<any>;
  executeForTesting?: (args: any) => Promise<SimplifiedToolResponse>;
}

function mapArgParserFlagToZodSchema(flag: IFlag | ProcessedFlag): ZodTypeAny {
  const flagTypeOpt = flag.type;

  // Handle Zod schemas directly
  if (flagTypeOpt && typeof flagTypeOpt === "object" && (flagTypeOpt as any)._def) {
    return flagTypeOpt as ZodTypeAny;
  }

  let zodSchema: ZodTypeAny = z.string();
  let typeName: string;

  if (typeof flagTypeOpt === "function") {
    typeName = flagTypeOpt.name.toLowerCase().replace("constructor", "");
  } else {
    typeName = String(flagTypeOpt).toLowerCase();
  }

  const flagEnum = flag.enum;
  const allowMultiple = flag.allowMultiple;

  // Handle array flags
  if (allowMultiple) {
    let itemSchema: ZodTypeAny;

    if (flagEnum && Array.isArray(flagEnum) && flagEnum.length > 0) {
      if (flagEnum.every((e) => typeof e === "string")) {
        itemSchema = z.enum(flagEnum as [string, ...string[]]);
      } else if (flagEnum.every((e) => typeof e === "number")) {
        const literalSchemas = flagEnum.map((val) => z.literal(val));
        if (literalSchemas.length === 1) {
          itemSchema = literalSchemas[0];
        } else {
          itemSchema = z.union(
            literalSchemas as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]],
          );
        }
      } else {
        itemSchema = z.string();
      }
    } else {
      switch (typeName) {
        case "number":
          itemSchema = z.number();
          break;
        case "boolean":
          itemSchema = z.boolean();
          break;
        default:
          itemSchema = z.string();
          break;
      }
    }

    zodSchema = z.array(itemSchema);
  } else {
    switch (typeName) {
      case "string":
        zodSchema =
          flagEnum &&
          Array.isArray(flagEnum) &&
          flagEnum.length > 0 &&
          flagEnum.every((e) => typeof e === "string")
            ? z.enum(flagEnum as [string, ...string[]])
            : z.string();
        break;
      case "number":
        if (
          flagEnum &&
          Array.isArray(flagEnum) &&
          flagEnum.length > 0 &&
          flagEnum.every((e) => typeof e === "number")
        ) {
          const literalSchemas = flagEnum.map((val) => z.literal(val));
          if (literalSchemas.length === 1) {
            zodSchema = literalSchemas[0];
          } else if (literalSchemas.length >= 2) {
            zodSchema = z.union(
              literalSchemas as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]],
            );
          } else {
            zodSchema = z.number();
          }
        } else {
          zodSchema = z.number();
        }
        break;
      case "boolean":
        zodSchema = z.boolean();
        break;
      case "array":
        const itemSchema =
          flagEnum &&
          Array.isArray(flagEnum) &&
          flagEnum.length > 0 &&
          flagEnum.every((e) => typeof e === "string")
            ? z.enum(flagEnum as [string, ...string[]])
            : z.string();
        zodSchema = z.array(itemSchema);
        break;
      case "object":
        zodSchema = z.record(z.string(), z.any());
        break;
      default:
        logger.error(
          `Flag '${flag.name}' has an unknown type '${typeName}'. Defaulting to z.string().`,
        );
        zodSchema = z.string();
        break;
    }
  }

  const description = flag.description;
  if (description) {
    zodSchema = zodSchema.describe(
      Array.isArray(description) ? description.join("\n") : description,
    );
  }

  const defaultValue = flag.defaultValue;
  if (defaultValue !== undefined) {
    zodSchema = zodSchema.default(defaultValue);
  } else if (!flag.mandatory) {
    zodSchema = zodSchema.optional();
  }
  return zodSchema;
}

export interface GenerateMcpToolsOptions {
  outputSchemaMap?: Record<string, ZodTypeAny>;
  defaultOutputSchema?: ZodTypeAny;
  autoGenerateOutputSchema?: boolean | string;
  generateToolName?: (commandPath: string[], appName?: string) => string;
  includeSubCommands?: boolean;
  toolNamePrefix?: string;
  toolNameSuffix?: string;
}

export function generateMcpToolsFromArgParser(
  rootParser: ArgParser,
  options?: GenerateMcpToolsOptions,
): IMcpToolStructure[] {
  const tools: IMcpToolStructure[] = [];
  const visitedParsers = new Set<ArgParser>();

  function buildToolsRecursively(currentParser: ArgParser, commandPathParts: string[]) {
    if (visitedParsers.has(currentParser)) return;
    visitedParsers.add(currentParser);

    const appName = currentParser.getAppName();
    const currentParserDescription = currentParser.getDescription();
    const currentParserHandler = currentParser.getHandler();
    const currentParserFlags = currentParser.flags;
    const subCommandsMap = currentParser.getSubCommands();
    const currentParserSubCommands = Array.from(subCommandsMap.values());

    let currentParserCommandName = currentParser.getAppCommandName();
    if (!currentParserCommandName && currentParser !== rootParser) {
      currentParserCommandName = currentParser.getSubCommandName();
    }

    if (currentParser !== rootParser && commandPathParts.length > 0) {
      currentParserCommandName = commandPathParts[commandPathParts.length - 1];
    }
    const currentParserCommandNameOrAppName = currentParserCommandName || appName;

    const effectiveCommandName =
      currentParserCommandName ||
      (commandPathParts.length > 0 ? commandPathParts[commandPathParts.length - 1] : appName);

    let toolName: string;
    if (options?.generateToolName) {
      toolName = options.generateToolName(commandPathParts, appName);
    } else {
      if (currentParser === rootParser) {
        toolName = currentParserCommandNameOrAppName || appName || "root_cmd";
      } else {
        toolName = effectiveCommandName || "cmd";
      }
      toolName = sanitizeMcpToolName(toolName);
    }
    if (!toolName) toolName = currentParser === rootParser && appName ? appName : "cmd";

    if (options?.toolNamePrefix) {
      toolName = options.toolNamePrefix + toolName;
    }
    if (options?.toolNameSuffix) {
      toolName = toolName + options.toolNameSuffix;
    }

    if (currentParserHandler) {
      const flags = currentParserFlags;
      const zodProperties: Record<string, ZodTypeAny> = {};
      const hasHelpFlag = flags.some((flag) => flag.name === "help");

      for (const flag of flags) {
        if (flag.name === "help") continue;

        let flagSchema = mapArgParserFlagToZodSchema(flag);

        if (hasHelpFlag && flag.mandatory) {
          flagSchema = flagSchema.optional();
        }

        zodProperties[flag.name] = flagSchema;
      }
      const inputSchema = z.object(zodProperties);

      let outputSchema: ZodTypeAny | undefined;

      if (options?.outputSchemaMap && options.outputSchemaMap[toolName]) {
        const customSchema = options.outputSchemaMap[toolName];
        outputSchema =
          typeof customSchema === "object" && customSchema !== null && !(customSchema as any)._def
            ? z.object(customSchema as unknown as ZodRawShape)
            : customSchema;
      } else if (options?.defaultOutputSchema) {
        outputSchema = options.defaultOutputSchema;
      } else if (options?.autoGenerateOutputSchema) {
        if (typeof options.autoGenerateOutputSchema === "string") {
          outputSchema = createOutputSchema(options.autoGenerateOutputSchema as any);
        } else if (options.autoGenerateOutputSchema === true) {
          outputSchema = createOutputSchema("successWithData");
        }
      }

      const tool: IMcpToolStructure = {
        name: toolName,
        description: currentParserDescription || `Executes the ${toolName} command.`,
        inputSchema: inputSchema,
        outputSchema: outputSchema,
        async execute(mcpInputArgs: Record<string, any>) {
          // Execution logic
          const argv: string[] = [...commandPathParts];
          
          for (const flagDef of currentParserFlags) {
            const flagName = flagDef.name;
            if (mcpInputArgs.hasOwnProperty(flagName)) {
              const value = mcpInputArgs[flagName];
              const flagOptions = flagDef.options;
              
              argv.push(flagOptions[0]);
              if (value !== true || flagDef.flagOnly === false) {
                if (Array.isArray(value)) {
                  value.forEach(v => {
                    argv.push(flagOptions[0]);
                    argv.push(String(v));
                  });
                  argv.pop(); // Remove extra flag option from last element
                } else {
                  argv.push(String(value));
                }
              }
            }
          }

          try {
            const parseResult = await rootParser.parse(argv, { isMcp: true });
            
            // This is a simplified version of the execution logic
            // In a real implementation, we would handle handlers, etc.
            return createMcpSuccessResponse(parseResult);
          } catch (e: any) {
            return createMcpErrorResponse(e);
          }
        },
        async executeForTesting(
          mcpInputArgs: Record<string, any>,
        ): Promise<SimplifiedToolResponse> {
          try {
            const mcpResponse = await this.execute(mcpInputArgs);
            return extractSimplifiedResponse(mcpResponse) as any;
          } catch (error: any) {
            return {
              success: false,
              error: error.message || String(error),
              exitCode: 1,
            } as any;
          }
        },
      };
      tools.push(tool);
    }

    const subCommands = currentParserSubCommands;
    if (subCommands && options?.includeSubCommands !== false) {
      for (const subCmdObj of subCommands) {
        if (subCmdObj.isMcp === true) continue;

        const nextPathParts = [...commandPathParts, subCmdObj.name];
        buildToolsRecursively(
          subCmdObj.parser as ArgParser,
          nextPathParts.filter((p) => p),
        );
      }
    }
  }
  buildToolsRecursively(rootParser, []);
  return tools;
}