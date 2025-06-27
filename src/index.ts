export * from "./ArgParser";
export * from "./ArgParserWithMcp";

export {
  zodFlagSchema,
  type IFlagCore,
  type IFlag,
  type ProcessedFlagCore,
  type ProcessedFlag,
  type TParsedArgsTypeFromFlagDef,
  type FlagsArray,
  type ResolveType,
  type ExtractFlagType,
  type TParsedArgs,
  type IHandlerContext,
  type MainHandler,
  type ISubCommand,
  type ArgParserInstance,
} from "./types";

export {
  generateMcpToolsFromArgParser,
  type IMcpToolStructure,
  type GenerateMcpToolsOptions,
  type IParseExecutionResult,
} from "./mcp-integration";
