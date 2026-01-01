import { z } from "zod";
import type { ZodRawShape, ZodTypeAny } from "zod";
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";
import { ArgParserBase } from "../core/ArgParserBase";
import type {
  IFlag,
  IHandlerContext,
  ProcessedFlag,
  TParsedArgs,
} from "../core/types";
// Import the centralized utility functions
import {
  createOutputSchema,
  getJsonSchemaTypeFromFlag,
} from "../core/types.js";
import { sanitizeMcpToolName } from "./mcp-utils";

// Assuming these types are correctly exported from src/index.ts

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
  // Handle Zod schemas specially - use Zod v4's native JSON Schema support
  if (flag.type && typeof flag.type === "object" && flag.type._def) {
    const zodSchema = flag.type as ZodTypeAny;

    try {
      const property = z.toJSONSchema(zodSchema);

      if (flag.description) {
        property.description = flag.description;
      }

      const isRequired = !!(flag.mandatory || (flag as any).required);

      return { property, isRequired };
    } catch (error) {
      // Fallback if JSON Schema conversion fails
      console.warn(`Failed to convert Zod schema to JSON Schema for flag '${flag.name}':`, error);
      const property = {
        type: "object" as const,
        description: flag.description || `${flag.name} parameter (Zod schema)`,
      };
      const isRequired = !!(flag.mandatory || (flag as any).required);
      return { property, isRequired };
    }
  }

  const property: any = {
    type: getJsonSchemaTypeFromFlag(flag.type),
    description: flag.description || `${flag.name} parameter`,
  };

  // Handle enums
  if (flag.enum && Array.isArray(flag.enum)) {
    property.enum = flag.enum;
  }

  // Handle default values
  const defaultValue = (flag as any).defaultValue || (flag as any).default;
  if (defaultValue !== undefined) {
    property.default = defaultValue;
  } else if (
    flag.flagOnly &&
    getJsonSchemaTypeFromFlag(flag.type) === "boolean"
  ) {
    // For flagOnly boolean flags, default to false when not explicitly set
    property.default = false;
  }

  // Handle array items
  if (flag.type === "array" && (flag as any).itemType) {
    property.items = {
      type: getJsonSchemaTypeFromFlag((flag as any).itemType),
    };
  }

  // Determine if required
  const isRequired = !!(flag.mandatory || (flag as any).required);

  return { property, isRequired };
}

/**
 * Convert ArgParser flags to MCP JSON Schema
 */
export function convertFlagsToJsonSchema(
  flags: readonly (IFlag | ProcessedFlag)[],
): {
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
export function convertFlagsToZodSchema(
  flags: readonly (IFlag | ProcessedFlag)[],
): ZodTypeAny {
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
export function extractSimplifiedResponse(
  mcpResponse: any,
): SimplifiedToolResponse {
  // Handle responses that are already in simplified format
  if (
    typeof mcpResponse === "object" &&
    mcpResponse !== null &&
    "success" in mcpResponse
  ) {
    return {
      success: mcpResponse.success,
      data: mcpResponse.data,
      error: mcpResponse.error || mcpResponse.message, // Ensure error is populated
      message: mcpResponse.message || mcpResponse.error, // Ensure message is populated
      exitCode: mcpResponse.exitCode,
    };
  }

  // Handle error responses
  if (mcpResponse.isError) {
    const errorMessage = mcpResponse.content?.[0]?.text || "Unknown error";
    return {
      success: false,
      error: errorMessage,
      message: errorMessage, // Include message field for test compatibility
      data: { error: errorMessage }, // Include data field for test compatibility
      exitCode: 1,
    };
  }

  // Handle structured content (when output schema is used)
  if (mcpResponse.structuredContent) {
    return {
      success: true,
      data: mcpResponse.structuredContent,
    };
  }

  // Handle standard MCP content format
  if (mcpResponse.content && Array.isArray(mcpResponse.content)) {
    try {
      // Try to parse JSON from the text content
      const textContent = mcpResponse.content[0]?.text;
      if (textContent) {
        const parsedData = JSON.parse(textContent);
        return {
          success: true,
          data: parsedData,
        };
      }
    } catch {
      // If parsing fails, return the raw text
      return {
        success: true,
        data: mcpResponse.content[0]?.text || "No content",
      };
    }
  }

  // Fallback for unexpected formats
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
  const flagTypeOpt = flag["type"];

  // Handle Zod schemas directly - return them as-is
  if (flagTypeOpt && typeof flagTypeOpt === "object" && flagTypeOpt._def) {
    return flagTypeOpt as ZodTypeAny;
  }

  let zodSchema: ZodTypeAny = z.string(); // Initialize with default value
  let typeName: string;

  if (typeof flagTypeOpt === "function") {
    typeName = flagTypeOpt.name.toLowerCase().replace("constructor", "");
  } else {
    typeName = String(flagTypeOpt).toLowerCase();
  }

  const flagEnum = flag["enum"];
  const allowMultiple = flag["allowMultiple"];

  // Handle array flags (allowMultiple: true)
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
            literalSchemas as unknown as [
              ZodTypeAny,
              ZodTypeAny,
              ...ZodTypeAny[],
            ],
          );
        }
      } else {
        itemSchema = z.string();
      }
    } else {
      // Default item type based on flag type
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
    // Handle non-array flags
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
              literalSchemas as unknown as [
                ZodTypeAny,
                ZodTypeAny,
                ...ZodTypeAny[],
              ],
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
            : z.string(); // Default item type for arrays
        zodSchema = z.array(itemSchema);
        break;
      case "object":
        zodSchema = z.record(z.string(), z.any());
        break;
      default:
        const logger = createMcpLogger("MCP Integration");
        logger.mcpError(
          `Flag '${flag["name"]}' has an unknown type '${typeName}'. Defaulting to z.string().`,
        );
        zodSchema = z.string();
        break;
    }
  }

  const description = flag["description"];
  if (description) {
    zodSchema = zodSchema.describe(
      Array.isArray(description) ? description.join("\n") : description,
    );
  }

  const defaultValue = flag["defaultValue"];
  if (defaultValue !== undefined) {
    zodSchema = zodSchema.default(defaultValue);
  } else if (!flag["mandatory"]) {
    zodSchema = zodSchema.optional();
  }
  return zodSchema;
}

export interface GenerateMcpToolsOptions {
  outputSchemaMap?: Record<string, ZodTypeAny>;
  defaultOutputSchema?: ZodTypeAny;
  /** Automatically generate output schemas for tools that don't have explicit schemas */
  autoGenerateOutputSchema?:
  | boolean
  | keyof typeof import("../core/types").OutputSchemaPatterns;
  generateToolName?: (commandPath: string[], appName?: string) => string;
  includeSubCommands?: boolean;
  toolNamePrefix?: string;
  toolNameSuffix?: string;
}

interface ISpecialParseResultProps {
  $commandChain?: string[];
  $error?: { type: string; message: string; details?: any };
  handlerResponse?: any;
}
export type IParseExecutionResult = TParsedArgs<ProcessedFlag[]> &
  ISpecialParseResultProps;

export function generateMcpToolsFromArgParser(
  rootParser: ArgParserBase,
  options?: GenerateMcpToolsOptions,
): IMcpToolStructure[] {
  const tools: IMcpToolStructure[] = [];
  const visitedParsers = new Set<ArgParserBase>();

  function buildToolsRecursively(
    currentParser: ArgParserBase,
    commandPathParts: string[],
  ) {
    if (visitedParsers.has(currentParser)) return;
    visitedParsers.add(currentParser);

    const typedRootParser = rootParser as any;
    const typedCurrentParser = currentParser as any;

    const appName = typedRootParser.getAppName
      ? typedRootParser.getAppName()
      : typedRootParser["#appName"];
    const currentParserDescription = typedCurrentParser.getDescription
      ? typedCurrentParser.getDescription()
      : typedCurrentParser["#description"];
    const currentParserHandler = typedCurrentParser.getHandler
      ? typedCurrentParser.getHandler()
      : typedCurrentParser["#handler"];

    // ArgParser.ts (line 196) has a public getter `get flags()`
    const currentParserFlags = typedCurrentParser.flags as (
      | IFlag
      | ProcessedFlag
    )[];

    const subCommandsMap = typedCurrentParser.getSubCommands
      ? typedCurrentParser.getSubCommands()
      : typedCurrentParser["#subCommands"];
    const currentParserSubCommands = subCommandsMap
      ? Array.from(subCommandsMap.values())
      : [];

    let currentParserCommandName = typedCurrentParser.getAppCommandName
      ? typedCurrentParser.getAppCommandName()
      : typedCurrentParser["#appCommandName"];
    if (!currentParserCommandName && currentParser !== rootParser) {
      currentParserCommandName = typedCurrentParser.getSubCommandName
        ? typedCurrentParser.getSubCommandName()
        : typedCurrentParser["#subCommandName"];
    }

    // For sub-commands, prefer the command path over the inherited command name
    if (currentParser !== rootParser && commandPathParts.length > 0) {
      currentParserCommandName = commandPathParts[commandPathParts.length - 1];
    }
    const currentParserCommandNameOrAppName =
      currentParserCommandName || appName;

    const effectiveCommandName =
      currentParserCommandName ||
      (commandPathParts.length > 0
        ? commandPathParts[commandPathParts.length - 1]
        : appName);

    let toolName: string;
    if (options?.generateToolName) {
      toolName = options.generateToolName(commandPathParts, appName);
    } else {
      // For root parser, use the command name directly
      if (currentParser === rootParser) {
        toolName = currentParserCommandNameOrAppName || appName || "root_cmd";
      } else {
        // For sub-parsers, use the effective command name or the last part of the path
        toolName = effectiveCommandName || "cmd";
      }

      // Clean up the tool name for MCP compatibility
      toolName = sanitizeMcpToolName(toolName);
    }
    if (!toolName)
      toolName = currentParser === rootParser && appName ? appName : "cmd";

    // Apply prefix and suffix if provided
    if (options?.toolNamePrefix) {
      toolName = options.toolNamePrefix + toolName;
    }
    if (options?.toolNameSuffix) {
      toolName = toolName + options.toolNameSuffix;
    }

    if (currentParserHandler) {
      const flags = currentParserFlags as ProcessedFlag[];
      const zodProperties: Record<string, ZodTypeAny> = {};
      const hasHelpFlag = flags.some((flag) => flag["name"] === "help");

      for (const flag of flags) {
        // Skip help flag - it doesn't make sense in MCP tool context
        if (flag["name"] === "help") continue;

        let flagSchema = mapArgParserFlagToZodSchema(flag);

        // If there's a help flag, make mandatory fields optional to allow help to work
        // This is necessary because MCP SDK validates the schema before our execute function runs
        if (hasHelpFlag && flag["mandatory"]) {
          flagSchema = flagSchema.optional();
        }

        zodProperties[flag["name"]] = flagSchema;
      }
      const inputSchema = z.object(zodProperties);

      let outputSchema: ZodTypeAny | undefined;

      // Priority order: explicit schema map > default schema > auto-generated schema
      if (options?.outputSchemaMap && options.outputSchemaMap[toolName]) {
        const customSchema = options.outputSchemaMap[toolName];
        outputSchema =
          typeof customSchema === "object" &&
            customSchema !== null &&
            !customSchema._def
            ? z.object(customSchema as unknown as ZodRawShape)
            : customSchema;
      } else if (options?.defaultOutputSchema) {
        outputSchema = options.defaultOutputSchema;
      } else if (options?.autoGenerateOutputSchema) {
        // Auto-generate output schema based on the option value
        if (typeof options.autoGenerateOutputSchema === "string") {
          // Use specific pattern
          outputSchema = createOutputSchema(options.autoGenerateOutputSchema);
        } else if (options.autoGenerateOutputSchema === true) {
          // Use default success/error pattern
          outputSchema = createOutputSchema("successWithData");
        }
      }

      const tool: IMcpToolStructure = {
        name: toolName,
        description:
          currentParserDescription || `Executes the ${toolName} command.`,
        inputSchema: inputSchema,
        outputSchema: outputSchema,
        async execute(mcpInputArgs: Record<string, any>) {
          if (process.env["MCP_DEBUG"]) {
            console.error(
              `[MCP Execute] Starting execution for tool '${toolName}'`,
            );
            console.error(
              `[MCP Execute] Input args:`,
              JSON.stringify(mcpInputArgs, null, 2),
            );
          }

          // Check if help is requested first, before any other processing
          if (mcpInputArgs["help"] === true) {
            // Generate help text for the specific command path
            let helpParser = rootParser;
            const pathParts = [...commandPathParts];

            // Navigate to the correct parser for help
            for (const part of pathParts) {
              const subCmd = (helpParser as any).getSubCommand
                ? (helpParser as any).getSubCommand(part)
                : undefined;
              if (subCmd && subCmd.parser) {
                helpParser = subCmd.parser;
              } else {
                break;
              }
            }

            const helpText = (helpParser as any).helpText
              ? (helpParser as any).helpText()
              : "Help not available";

            if (options?.outputSchemaMap?.[toolName]) {
              const helpData = {
                success: true,
                help: helpText,
                files: [],
                commandExecuted: null,
                stderrOutput: null,
              };
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(helpData, null, 2),
                  },
                ],
                structuredContent: helpData,
              };
            }
            return { success: true, message: helpText };
          }

          // The ArgParser will handle validation based on its flag definitions during parse.
          // The MCP Server uses these Zod schemas directly.
          const argv: string[] = [...commandPathParts];
          const parserFlags = currentParserFlags as ProcessedFlag[];

          for (const flagDef of parserFlags) {
            const flagName = flagDef["name"];
            if (mcpInputArgs.hasOwnProperty(flagName)) {
              const value = mcpInputArgs[flagName];
              const flagType = flagDef["type"];
              const flagOptions = flagDef["options"];
              const isFlagOnly = flagDef["flagOnly"];
              const allowMultiple = flagDef["allowMultiple"];
              let flagTypeName =
                typeof flagType === "function"
                  ? flagType.name.toLowerCase().replace("constructor", "")
                  : String(flagType).toLowerCase();

              argv.push(flagOptions[0]);

              if (flagTypeName === "boolean") {
                if (value === true && isFlagOnly === false)
                  argv.push(String(value));
                else if (value === false && isFlagOnly === false)
                  argv.push(String(value));
              } else if (flagTypeName === "array") {
                if (Array.isArray(value)) {
                  if (allowMultiple) {
                    const originalArgvLength = argv.length;
                    value.forEach((item) => {
                      argv.push(flagOptions[0]);
                      argv.push(String(item));
                    });
                    if (
                      value.length > 0 &&
                      argv[originalArgvLength - 1] === flagOptions[0]
                    ) {
                      argv.splice(originalArgvLength - 1, 1);
                    }
                  } else {
                    argv.push(value.join(","));
                  }
                } else if (value != null) argv.push(String(value));
              } else if (value !== null && value !== undefined)
                argv.push(String(value));
            }
          }

          try {
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Execute] Starting try block for tool '${toolName}'`,
              );
            }

            // Check if this is a unified tool - if so, handle it directly without recursive parsing
            const rootParserTyped = rootParser as any;
            const unifiedTools = rootParserTyped._tools;
            const isUnifiedTool = unifiedTools && unifiedTools.has(toolName);

            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Tool Debug] Checking tool '${toolName}' for unified execution`,
              );
              console.error(`[MCP Tool Debug] Has _tools:`, !!unifiedTools);
              console.error(
                `[MCP Tool Debug] Available tools:`,
                unifiedTools ? Array.from(unifiedTools.keys()) : [],
              );
              console.error(`[MCP Tool Debug] Is unified tool:`, isUnifiedTool);
            }

            let parseResult: IParseExecutionResult;

            if (isUnifiedTool) {
              // For unified tools, bypass the recursive parse call and execute directly
              const toolConfig = unifiedTools.get(toolName);
              if (process.env["MCP_DEBUG"]) {
                console.error(
                  `[MCP Tool Debug] Found unified tool config:`,
                  !!toolConfig,
                );
                console.error(
                  `[MCP Tool Debug] Has handler:`,
                  !!(toolConfig && toolConfig.handler),
                );
              }
              if (toolConfig && toolConfig.handler) {
                try {
                  if (process.env["MCP_DEBUG"]) {
                    console.error(
                      `[MCP Tool Debug] Executing unified tool handler for '${toolName}'`,
                    );
                    console.error(
                      `[MCP Tool Debug] Handler args:`,
                      JSON.stringify(mcpInputArgs, null, 2),
                    );
                  }
                  const getFlag = (name: string): any => {
                    if (mcpInputArgs && mcpInputArgs[name] !== undefined) {
                      return mcpInputArgs[name];
                    }

                    if (rootParser) {
                      const flagDef = rootParser.getFlagDefinition(name);
                      if (flagDef) {
                        const envVar = flagDef["env"];
                        if (envVar) {
                          const envKey = Array.isArray(envVar) ? envVar[0] : envVar;
                          if (envKey && process.env[envKey]) {
                            return process.env[envKey];
                          }
                        }
                        return flagDef["defaultValue"];
                      }
                    }

                    return undefined;
                  };

                  const handlerContext: IHandlerContext<any, any> = {
                    args: mcpInputArgs,
                    commandChain: [toolName],
                    parser: rootParser,
                    parentArgs: undefined,
                    isMcp: true,
                    getFlag,
                    displayHelp: () => {
                      console.error(
                        "Help display is not supported in MCP mode.",
                      );
                    },
                  };

                  const handlerResult =
                    await toolConfig.handler(handlerContext);

                  // Create a mock parse result that mimics successful execution
                  if (process.env["MCP_DEBUG"]) {
                    console.error(
                      `[MCP Tool Debug] Handler result:`,
                      JSON.stringify(handlerResult, null, 2),
                    );
                  }
                  parseResult = {
                    handlerResponse: handlerResult,
                    $commandChain: [toolName],
                    ...mcpInputArgs,
                  } as IParseExecutionResult;
                } catch (handlerError: any) {
                  // Create error parse result
                  if (process.env["MCP_DEBUG"]) {
                    console.error(
                      `[MCP Tool Debug] Handler error:`,
                      handlerError,
                    );
                  }
                  parseResult = {
                    $error: {
                      type: "handler_error",
                      message:
                        handlerError instanceof Error
                          ? handlerError.message
                          : String(handlerError),
                      details: handlerError,
                    },
                    ...mcpInputArgs,
                  } as IParseExecutionResult;
                }
              } else {
                // Tool not found error
                parseResult = {
                  $error: {
                    type: "tool_not_found",
                    message: `Unified tool '${toolName}' not found or has no handler`,
                    details: { toolName },
                  },
                  ...mcpInputArgs,
                } as IParseExecutionResult;
              }
            } else {
              // For CLI-generated tools, use the original parse approach
              // ArgParser instance (rootParser) should be configured with handleErrors: false in its constructor.
              if (process.env["MCP_DEBUG"]) {
                console.error(
                  `[MCP Tool Debug] Using CLI-generated tool parsing for '${toolName}'`,
                );
                console.error(
                  `[MCP Tool Debug] Parse argv:`,
                  JSON.stringify(argv, null, 2),
                );
              }
              parseResult = (await rootParser.parse(
                argv,
              )) as IParseExecutionResult;
            }

            if (parseResult["$error"]) {
              const errorDetails = parseResult["$error"]!;
              const errPayload = {
                message: `Cmd error: ${errorDetails.type} - ${errorDetails.message}`,
                details: errorDetails.details,
              };
              // For tools with output schemas, we need to provide structured content even for errors
              if (outputSchema) {
                // Try to create a structured error response that matches the output schema
                // We need to provide all required fields from the schema
                const structuredError: any = {
                  success: false,
                  error: errPayload.message,
                  message: errPayload.message,
                };

                // Try to extract schema requirements and provide default values
                try {
                  if (
                    outputSchema &&
                    typeof outputSchema === "object" &&
                    outputSchema !== null &&
                    outputSchema._def
                  ) {
                    const zodSchema = outputSchema as any;
                    if (process.env["MCP_DEBUG"]) {
                      console.error(
                        `[MCP Debug] Output schema type:`,
                        zodSchema._def?.typeName || zodSchema._def?.type,
                      );
                    }
                    if (
                      zodSchema._def?.typeName === "ZodObject" ||
                      zodSchema._def?.type === "object"
                    ) {
                      const shapeGetter = zodSchema._def?.shape;
                      if (shapeGetter) {
                        const shape =
                          typeof shapeGetter === "function"
                            ? shapeGetter()
                            : shapeGetter;

                        if (shape && typeof shape === "object") {
                          if (process.env["MCP_DEBUG"]) {
                            console.error(
                              `[MCP Debug] Schema shape keys:`,
                              Object.keys(shape),
                            );
                          }

                          // Provide default values for required fields
                          Object.keys(shape).forEach((key) => {
                            if (!(key in structuredError)) {
                              const fieldSchema = shape[key];
                              if (fieldSchema && fieldSchema._def) {
                                switch (
                                fieldSchema._def.typeName ||
                                fieldSchema._def.type
                                ) {
                                  case "ZodString":
                                  case "string":
                                    structuredError[key] = "";
                                    break;
                                  case "ZodNumber":
                                  case "number":
                                    structuredError[key] = 0;
                                    break;
                                  case "ZodBoolean":
                                  case "boolean":
                                    structuredError[key] = false;
                                    break;
                                  case "ZodArray":
                                  case "array":
                                    structuredError[key] = [];
                                    break;
                                  case "ZodObject":
                                  case "object":
                                    structuredError[key] = {};
                                    break;
                                  default:
                                    structuredError[key] = null;
                                }
                              }
                            }
                          });
                        }
                      }
                    }
                  }
                } catch (schemaError) {
                  if (process.env["MCP_DEBUG"]) {
                    console.error(
                      `[MCP Debug] Error processing output schema for structured error:`,
                      schemaError,
                    );
                  }
                  // Continue with basic structured error if schema processing fails
                }

                if (process.env["MCP_DEBUG"]) {
                  console.error(
                    `[MCP Debug] Final structured error:`,
                    JSON.stringify(structuredError, null, 2),
                  );
                }

                return {
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: `Error: ${errPayload.message}`,
                    },
                  ],
                  structuredContent: structuredError,
                };
              }

              // Always return standard MCP error response format for errors
              // Custom output schemas only apply to successful responses
              return createMcpErrorResponse(errPayload.message);
            }

            let handlerResponse = parseResult["handlerResponse"];

            // Check if there's an async handler that needs to be awaited
            if (!handlerResponse && parseResult["_asyncHandlerPromise"]) {
              try {
                handlerResponse = await parseResult["_asyncHandlerPromise"];
              } catch (error: any) {
                // Use standardized MCP error response for async handler errors
                return createMcpErrorResponse(
                  error instanceof Error ? error : new Error(String(error)),
                );
              }
            }

            // Check if we need to execute or re-execute the handler with proper MCP context
            // This happens when:
            // 1. No handler was executed (handlerResponse === undefined)
            // 2. Handler was executed but not with MCP context (need to re-execute with isMcp: true)

            // For root commands, the $commandChain might be undefined, so we need to construct it
            let commandChain = parseResult["$commandChain"];
            if (!commandChain) {
              // For root commands, use the app command name
              const appCommandName = (rootParser as any).getAppCommandName
                ? (rootParser as any).getAppCommandName()
                : (rootParser as any)["#appCommandName"];
              if (appCommandName) {
                commandChain = [appCommandName];
              }
            }

            const needsHandlerExecution =
              handlerResponse === undefined ||
              (handlerResponse !== undefined && commandChain);

            if (needsHandlerExecution && commandChain) {
              let finalParser: ArgParserBase | undefined = rootParser;
              let currentArgs: Record<string, any> = { ...parseResult };
              let resolvedParentArgs: Record<string, any> | undefined =
                undefined;
              const chain = commandChain;

              // Clean up special properties from currentArgs
              delete currentArgs["handlerResponse"];
              delete currentArgs["$commandChain"];
              delete currentArgs["$error"];
              delete currentArgs["_originalInputArgs"];
              delete currentArgs["_asyncHandlerPromise"];
              delete currentArgs["_asyncHandlerInfo"];
              delete currentArgs["_fuzzyModePreventedExecution"];
              delete currentArgs["help"]; // Remove help flag as well

              for (let i = 0; i < chain.length; i++) {
                const cmdName = chain[i];
                // Use ArgParser's public getSubCommand method
                const subCmdInfo = finalParser?.getSubCommand
                  ? finalParser.getSubCommand(cmdName)
                  : undefined;

                if (subCmdInfo && subCmdInfo.parser) {
                  // For sub-commands, we need to pass the arguments that belong to the sub-command
                  // Since the parseResult contains all the arguments, we'll use them directly
                  // and filter out the special properties
                  resolvedParentArgs = { ...currentArgs };
                  currentArgs = { ...currentArgs };
                  // Remove special properties to get clean sub-command args
                  delete currentArgs["handlerResponse"];
                  delete currentArgs["$commandChain"];
                  delete currentArgs["$error"];
                  delete currentArgs["_originalInputArgs"];
                  delete currentArgs["_asyncHandlerPromise"];
                  delete currentArgs["_asyncHandlerInfo"];
                  delete currentArgs["_fuzzyModePreventedExecution"];
                  delete currentArgs["help"];

                  finalParser = subCmdInfo.parser as ArgParserBase;
                } else if (
                  i === 0 &&
                  finalParser &&
                  cmdName ===
                  ((finalParser as any).getAppCommandName
                    ? (finalParser as any).getAppCommandName()
                    : (finalParser as any)["#appCommandName"]
                    ||
                    ((finalParser as any).getAppName
                      ? (finalParser as any).getAppName()
                      : (finalParser as any)["#appName"]))
                ) {
                  currentArgs = { ...parseResult };
                  // Clean up special properties again after resetting from parseResult
                  delete currentArgs["handlerResponse"];
                  delete currentArgs["$commandChain"];
                  delete currentArgs["$error"];
                  delete currentArgs["_originalInputArgs"];
                  delete currentArgs["_asyncHandlerPromise"];
                  delete currentArgs["_asyncHandlerInfo"];
                  delete currentArgs["_fuzzyModePreventedExecution"];
                  delete currentArgs["help"];
                  break;
                } else {
                  finalParser = undefined;
                  break;
                }
              }

              const finalParserTyped = finalParser as any;
              const finalHandler = finalParserTyped.getHandler
                ? finalParserTyped.getHandler()
                : finalParserTyped["#handler"];

              if (finalParser && finalHandler) {
                const handlerToCall = finalHandler as Function;

                // For MCP execution, use the original MCP input args instead of the merged parse result
                // This prevents the nested args issue where handler response gets merged into args
                const cleanArgs = { ...mcpInputArgs };
                delete cleanArgs["help"]; // Remove help flag

                const getFlag = (name: string): any => {
                  if (cleanArgs && cleanArgs[name] !== undefined) {
                    return cleanArgs[name];
                  }

                  if (finalParser) {
                    const flagDef = finalParser.getFlagDefinition(name);
                    if (flagDef) {
                      const envVar = flagDef["env"];
                      if (envVar) {
                        const envKey = Array.isArray(envVar) ? envVar[0] : envVar;
                        if (envKey && process.env[envKey]) {
                          return process.env[envKey];
                        }
                      }
                      return flagDef["defaultValue"];
                    }
                  }

                  return undefined;
                };

                const handlerContext: IHandlerContext<any, any> = {
                  args: cleanArgs,
                  commandChain: chain,
                  parser: finalParser,
                  parentArgs: resolvedParentArgs,
                  isMcp: true,
                  getFlag,
                  displayHelp: () => {
                    console.error(
                      "Help display is not supported in MCP mode.",
                    );
                  },
                };
                try {
                  handlerResponse = await handlerToCall(handlerContext);
                } catch (handlerError: any) {
                  // Use standardized MCP error response
                  return createMcpErrorResponse(handlerError);
                }
              }
            }

            // Automatically format response for MCP
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Execute] Formatting response for tool '${toolName}'`,
              );
              console.error(
                `[MCP Execute] Handler response:`,
                JSON.stringify(handlerResponse, null, 2),
              );
            }

            if (handlerResponse && typeof handlerResponse === "object") {
              try {
                require('fs').appendFileSync('/tmp/mcp-debug.log', `[DEBUG] Handler response: ${JSON.stringify(handlerResponse, null, 2)}\n`);
              } catch (e) { } // Ignore errors during debug logging
              // If handler already returned MCP format with content field, use it
              if (
                handlerResponse.content &&
                Array.isArray(handlerResponse.content)
              ) {
                // If tool has output schema, ensure structuredContent is present
                if (outputSchema && !handlerResponse.structuredContent) {
                  handlerResponse.structuredContent = handlerResponse;
                }

                if (process.env["MCP_DEBUG"]) {
                  console.error(
                    `[MCP Execute] Returning MCP format response for '${toolName}'`,
                  );
                }
                return handlerResponse;
              } else {
                // Handler returned plain data, wrap it in MCP format
                // Always include structuredContent for object responses to ensure MCP compliance
                // This is safe because structuredContent is optional in the MCP spec
                const mcpResponse = {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(handlerResponse, null, 2),
                    },
                  ],
                  structuredContent: handlerResponse,
                };

                if (process.env["MCP_DEBUG"]) {
                  console.error(
                    `[MCP Execute] Wrapping plain response in MCP format for '${toolName}'`,
                  );
                  console.error(
                    `[MCP Execute] Final MCP response:`,
                    JSON.stringify(mcpResponse, null, 2),
                  );
                }
                return mcpResponse;
              }
            }

            // For non-object responses, wrap in MCP format
            const defaultResponse = handlerResponse || { success: true };

            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Execute] Using default response for tool '${toolName}'`,
              );
              console.error(
                `[MCP Execute] Default response:`,
                JSON.stringify(defaultResponse, null, 2),
              );
            }

            // Always include structuredContent for object responses to ensure MCP compliance
            if (typeof defaultResponse === "object") {
              const finalResponse = {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(defaultResponse, null, 2),
                  },
                ],
                structuredContent: defaultResponse,
              };

              if (process.env["MCP_DEBUG"]) {
                console.error(
                  `[MCP Execute] Returning structured default response for '${toolName}'`,
                );
                console.error(
                  `[MCP Execute] Final response:`,
                  JSON.stringify(finalResponse, null, 2),
                );
              }
              return finalResponse;
            }

            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Execute] Returning success response for '${toolName}'`,
              );
            }
            return createMcpSuccessResponse(defaultResponse);
          } catch (e: any) {
            if (process.env["MCP_DEBUG"]) {
              console.error(
                `[MCP Execute] Exception caught in tool '${toolName}':`,
                e,
              );
            }

            // Check if this is a handler error that was thrown due to handleErrors: false
            // In this case, we want to format it consistently with the $error handling above
            let errorMsg: string;

            if (e instanceof Error && e.message) {
              // This is likely a handler error thrown when handleErrors: false
              errorMsg = `Cmd error: handler_error - ${e.message}`;
            } else {
              // Other types of errors (parsing errors, etc.)
              errorMsg = `MCP tool exec failed: ${e.message || String(e)}`;
            }

            // For tools with output schemas, we need to provide structured content even for errors
            // to satisfy MCP SDK validation requirements
            if (outputSchema) {
              // Try to create a structured error response that matches the output schema
              const structuredError: any = {
                success: false,
                error: errorMsg,
                message: errorMsg,
              };

              // Try to extract schema requirements and provide default values
              try {
                if (
                  outputSchema &&
                  typeof outputSchema === "object" &&
                  outputSchema !== null &&
                  outputSchema._def
                ) {
                  const zodSchema = outputSchema as any;
                  if (
                    zodSchema._def?.typeName === "ZodObject" ||
                    zodSchema._def?.type === "object"
                  ) {
                    const shapeGetter = zodSchema._def?.shape;
                    if (shapeGetter) {
                      const shape =
                        typeof shapeGetter === "function"
                          ? shapeGetter()
                          : shapeGetter;

                      if (shape && typeof shape === "object") {
                        // Provide default values for required fields
                        Object.keys(shape).forEach((key) => {
                          if (!(key in structuredError)) {
                            const fieldSchema = shape[key];
                            if (fieldSchema && fieldSchema._def) {
                              const typeName =
                                fieldSchema._def.typeName ||
                                fieldSchema._def.type;

                              switch (typeName) {
                                case "ZodString":
                                case "string":
                                  structuredError[key] = "";
                                  break;
                                case "ZodNumber":
                                case "number":
                                  structuredError[key] = 0;
                                  break;
                                case "ZodBoolean":
                                case "boolean":
                                  structuredError[key] = false;
                                  break;
                                case "ZodArray":
                                case "array":
                                  structuredError[key] = [];
                                  break;
                                case "ZodObject":
                                case "object":
                                  structuredError[key] = {};
                                  break;
                                default:
                                  structuredError[key] = null;
                              }
                            }
                          }
                        });
                      }
                    }
                  }
                }
              } catch (schemaError) {
                // Ignore schema processing errors during error handling
              }

              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: `Error: ${errorMsg}`,
                  },
                ],
                structuredContent: structuredError,
              };
            }

            // Always return standard MCP error response format for errors
            // Custom output schemas only apply to successful responses
            return createMcpErrorResponse(errorMsg);
          }
        },
        async executeForTesting(
          mcpInputArgs: Record<string, any>,
        ): Promise<SimplifiedToolResponse> {
          try {
            const mcpResponse = await this.execute(mcpInputArgs);
            return extractSimplifiedResponse(mcpResponse);
          } catch (error: any) {
            return {
              success: false,
              error: error.message || String(error),
              exitCode: 1,
            };
          }
        },
      };
      tools.push(tool);
    }

    const subCommands = currentParserSubCommands;
    if (subCommands && options?.includeSubCommands !== false) {
      for (const subCmdObj of subCommands) {
        // Skip MCP server sub-commands to avoid infinite recursion
        if ((subCmdObj as any).isMcp === true) {
          continue;
        }

        const nextPathParts = [...commandPathParts, (subCmdObj as any).name];
        buildToolsRecursively(
          (subCmdObj as any).parser as ArgParserBase,
          nextPathParts.filter((p) => p),
        );
      }
    }
  }
  buildToolsRecursively(rootParser, []);
  return tools;
}
