import { z } from "zod";
import type { ZodRawShape, ZodTypeAny } from "zod";
import { ArgParser } from "./";
import type { IFlag, IHandlerContext, ProcessedFlag, TParsedArgs } from "./";

// Assuming these types are correctly exported from src/index.ts

// Structural type for what MCP server.tool() expects
export interface IMcpToolStructure {
  name: string;
  description?: string;
  inputSchema: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  execute: (args: any) => Promise<any>;
}

function mapArgParserFlagToZodSchema(flag: IFlag | ProcessedFlag): ZodTypeAny {
  let zodSchema: ZodTypeAny;
  const flagTypeOpt = flag["type"];
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
        console.warn(
          `[MCP Integration] Flag '${flag["name"]}' has an unknown type '${typeName}'. Defaulting to z.string().`,
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
  rootParser: ArgParser,
  options?: GenerateMcpToolsOptions,
): IMcpToolStructure[] {
  const tools: IMcpToolStructure[] = [];
  const visitedParsers = new Set<ArgParser>();

  function buildToolsRecursively(
    currentParser: ArgParser,
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

      // Clean up the tool name
      toolName = toolName.replace(/[^a-zA-Z0-9_-]/g, "_");
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
      const zodProperties: ZodRawShape = {};
      const hasHelpFlag = flags.some(flag => flag["name"] === "help");

      for (const flag of flags) {
        let flagSchema = mapArgParserFlagToZodSchema(flag);

        // If there's a help flag, make mandatory fields optional to allow help to work
        // This is necessary because MCP SDK validates the schema before our execute function runs
        if (hasHelpFlag && flag["name"] !== "help" && flag["mandatory"]) {
          flagSchema = flagSchema.optional();
        }

        zodProperties[flag["name"]] = flagSchema;
      }
      const inputSchema = z.object(zodProperties);

      let outputSchema: ZodTypeAny | undefined;

      if (options?.outputSchemaMap && options.outputSchemaMap[toolName]) {
        const customSchema = options.outputSchemaMap[toolName];
        outputSchema =
          typeof customSchema === "object" && !customSchema._def
            ? z.object(customSchema as unknown as ZodRawShape)
            : customSchema;
      } else if (options?.defaultOutputSchema) {
        outputSchema = options.defaultOutputSchema;
      }



      const tool: IMcpToolStructure = {
        name: toolName,
        description:
          currentParserDescription || `Executes the ${toolName} command.`,
        inputSchema: inputSchema,
        outputSchema: outputSchema,
        async execute(mcpInputArgs: Record<string, any>) {
          // Check if help is requested first, before any other processing
          if (mcpInputArgs['help'] === true) {
            // Generate help text for the specific command path
            let helpParser = rootParser;
            const pathParts = [...commandPathParts];

            // Navigate to the correct parser for help
            for (const part of pathParts) {
              const subCmd = (helpParser as any).getSubCommand ? (helpParser as any).getSubCommand(part) : undefined;
              if (subCmd && subCmd.parser) {
                helpParser = subCmd.parser;
              } else {
                break;
              }
            }

            const helpText = (helpParser as any).helpText ? (helpParser as any).helpText() : "Help not available";

            if (options?.outputSchemaMap?.[toolName]) {
              return {
                success: true,
                help: helpText,
                files: [],
                commandExecuted: null,
                stderrOutput: null,
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
            // ArgParser instance (rootParser) should be configured with handleErrors: false in its constructor.
            const parseResult = (await rootParser.parse(
              argv,
            )) as IParseExecutionResult;

            if (parseResult["$error"]) {
              const errorDetails = parseResult["$error"]!;
              const errPayload = {
                message: `Cmd error: ${errorDetails.type} - ${errorDetails.message}`,
                details: errorDetails.details,
              };
              if (options?.outputSchemaMap?.[toolName]) {
                // Return structured data directly when custom output schema is defined
                return {
                  error: errPayload.message,
                  files: [],
                  commandExecuted: null,
                  stderrOutput: errPayload.details?.stderr || null,
                };
              }
              return {
                success: false,
                message: errPayload.message,
                data: errPayload.details,
              };
            }

            let handlerResponse = parseResult["handlerResponse"];
            if (handlerResponse === undefined && parseResult["$commandChain"]) {
              let finalParser: ArgParser | undefined = rootParser;
              let currentArgs: Record<string, any> = { ...parseResult };
              let resolvedParentArgs: Record<string, any> | undefined =
                undefined;
              const chain = parseResult["$commandChain"]!;

              for (let i = 0; i < chain.length; i++) {
                const cmdName = chain[i];
                // Use ArgParser's public getSubCommand method
                const subCmdInfo = finalParser?.getSubCommand
                  ? finalParser.getSubCommand(cmdName)
                  : undefined;

                if (subCmdInfo && subCmdInfo.parser) {
                  resolvedParentArgs = { ...currentArgs };
                  currentArgs = currentArgs[cmdName] || {};
                  finalParser = subCmdInfo.parser as ArgParser;
                } else if (
                  i === 0 &&
                  finalParser &&
                  cmdName ===
                    ((finalParser as any).getAppCommandName
                      ? (finalParser as any).getAppCommandName()
                      : (finalParser as any)["#appCommandName"] ||
                        ((finalParser as any).getAppName
                          ? (finalParser as any).getAppName()
                          : (finalParser as any)["#appName"]))
                ) {
                  currentArgs = { ...parseResult };
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
                const handlerContext: IHandlerContext<any, any> = {
                  args: currentArgs,
                  commandChain: chain,
                  parser: finalParser,
                  parentArgs: resolvedParentArgs,
                };
                try {
                  handlerResponse = await handlerToCall(handlerContext);
                } catch (handlerError: any) {
                  const errorMsg = `Handler error: ${handlerError.message || String(handlerError)}`;
                  if (options?.outputSchemaMap?.[toolName]) {
                    // Return an object matching the expected output schema with error populated
                    return {
                      error: errorMsg,
                      files: [],
                      commandExecuted: null,
                      stderrOutput: null,
                    };
                  }
                  return { success: false, message: errorMsg };
                }
              }
            }

            if (options?.outputSchemaMap?.[toolName]) {
              // Return structured data directly when custom output schema is defined
              return handlerResponse;
            }
            return { success: true, data: handlerResponse };
          } catch (e: any) {
            const errorMsg = `MCP tool exec failed: ${e.message || String(e)}`;
            if (options?.outputSchemaMap?.[toolName]) {
              // Return an object matching the expected output schema with error populated
              return {
                error: errorMsg,
                files: [],
                commandExecuted: null,
                stderrOutput: null,
              };
            }
            return { success: false, message: errorMsg };
          }
        },
      };
      tools.push(tool);
    }

    const subCommands = currentParserSubCommands;
    if (subCommands && (options?.includeSubCommands !== false)) {
      for (const subCmdObj of subCommands) {
        // Skip MCP server sub-commands to avoid infinite recursion
        if ((subCmdObj as any).isMcp === true) {
          continue;
        }

        const nextPathParts = [...commandPathParts, (subCmdObj as any).name];
        buildToolsRecursively(
          (subCmdObj as any).parser as ArgParser,
          nextPathParts.filter((p) => p),
        );
      }
    }
  }
  buildToolsRecursively(rootParser, []);
  return tools;
}
