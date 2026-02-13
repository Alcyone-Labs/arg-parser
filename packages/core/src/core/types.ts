/**
 * Core types for ArgParser
 * 
 * These types define the shape of flags, commands, and configuration
 * for the argument parser.
 */

import { z, type ZodTypeAny } from 'zod';

// ============================================================================
// Flag Types
// ============================================================================

/**
 * Defines the behavior for flag inheritance in sub-commands.
 */
export const FlagInheritance = {
  NONE: 'none',
  DirectParentOnly: 'direct-parent-only',
  AllParents: 'all-parents',
} as const;

export type TFlagInheritance = (typeof FlagInheritance)[keyof typeof FlagInheritance] | boolean;

/**
 * Zod schema for validating DXT-specific options
 */
export const zodDxtOptionsSchema = z
  .object({
    sensitive: z.boolean().optional(),
    localDefault: z.string().optional(),
    type: z.enum(['string', 'directory', 'file', 'boolean', 'number']).optional(),
    multiple: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    default: z.any().optional(),
    title: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: 'min cannot be greater than max',
      path: ['min'],
    },
  );

export const zodFlagSchema = z.object({
  name: z.string().min(1),
  allowLigature: z.boolean().default(true),
  allowMultiple: z.boolean().default(false),
  description: z.union([z.string(), z.array(z.string())]).optional(),
  valueHint: z.string().optional(),
  options: z.array(z.string().min(1)).min(1),
  defaultValue: z.any().optional(),
  type: z.union([
    z.custom((val) => val === String),
    z.custom((val) => val === Number),
    z.custom((val) => val === Boolean),
    z.custom((val) => val === Array),
    z.custom((val) => val === Object),
    z.custom((val) => typeof val === 'function'),
    z.custom((val) => val && typeof val === 'object' && (val as any)._def),
    z.string(),
  ]).default('string'),
  mandatory: z.union([z.boolean(), z.custom((val) => typeof val === 'function')]).optional(),
  flagOnly: z.boolean().default(false),
  validate: z.custom((val) => typeof val === 'function').optional(),
  enum: z.array(z.any()).optional(),
  env: z.union([z.string(), z.array(z.string())]).optional(),
  dxtOptions: zodDxtOptionsSchema.optional(),
  dynamicRegister: z.custom((val) => typeof val === 'function').optional(),
  setWorkingDirectory: z.boolean().optional(),
  positional: z.number().int().positive().optional(),
  prompt: z.custom((val) => typeof val === 'function').optional(),
  promptSequence: z.number().int().positive().optional(),
});

export type IFlagCore = z.input<typeof zodFlagSchema>;
export type ProcessedFlagCore = z.output<typeof zodFlagSchema>;

export interface IDxtOptions {
  sensitive?: boolean;
  localDefault?: string;
  type?: 'string' | 'directory' | 'file' | 'boolean' | 'number';
  multiple?: boolean;
  min?: number;
  max?: number;
  default?: any;
  title?: string;
}

export type IFlag = IFlagCore & {
  default?: any;
  required?: boolean | ((parsedArgs: any) => boolean);
  env?: string | string[];
  dxtOptions?: IDxtOptions;
  dynamicRegister?: DynamicRegisterFn;
  setWorkingDirectory?: boolean;
  positional?: number;
};

export type DynamicRegisterContext = {
  value: any | any[];
  argsSoFar: Record<string, any>;
  parser: any;
  processArgs: string[];
  forHelp?: boolean;
  registerFlags: (flags: readonly IFlag[]) => void;
};

export type DynamicRegisterFn = (
  ctx: DynamicRegisterContext,
) => Promise<readonly IFlag[] | void> | readonly IFlag[] | void;

export type ProcessedFlag = ProcessedFlagCore;

// ============================================================================
// Type Resolution
// ============================================================================

export type TParsedArgsTypeFromFlagDef =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor
  | ((value: string) => any)
  | ((value: string) => Promise<any>)
  | ZodTypeAny
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object';

export type ResolveType<T extends TParsedArgsTypeFromFlagDef> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
      ? boolean
      : T extends ArrayConstructor
        ? any[]
        : T extends ObjectConstructor
          ? Record<string, any>
          : T extends ZodTypeAny
            ? z.infer<T>
            : T extends 'string'
              ? string
              : T extends 'number'
                ? number
                : T extends 'boolean'
                  ? boolean
                  : T extends 'array'
                    ? any[]
                    : T extends 'object'
                      ? Record<string, any>
                      : T extends (value: string) => infer R
                        ? R
                        : any;

export type ExtractFlagType<_TFlag extends ProcessedFlag> = any;

export type FlagsArray = readonly ProcessedFlag[];

export type TParsedArgs<TFlags extends readonly ProcessedFlag[]> = {
  [K in TFlags[number]['name']]: ExtractFlagType<Extract<TFlags[number], { name: K }>>;
};

// ============================================================================
// Handler Context
// ============================================================================

export interface ISystemArgs {
  debug?: boolean;
  debugPrint?: boolean;
  enableFuzzy?: boolean;
  withEnv?: string | true;
  saveToEnv?: boolean;
  buildDxt?: string | true;
  mcpServe?: boolean;
  mcpTransport?: string;
  mcpPort?: number;
  mcpHost?: string;
  mcpPath?: string;
  mcpTransports?: string;
  mcpLogPath?: string;
  mcpCors?: any;
  mcpAuth?: any;
  [key: string]: any;
}

export type IHandlerContext<TCurrentCommandArgs = any, TParentCommandArgs = any> = {
  args: TCurrentCommandArgs;
  parentArgs?: TParentCommandArgs;
  commandChain: string[];
  parser: any;
  parentParser?: any;
  isMcp?: boolean;
  isInteractive?: boolean;
  getFlag?: (name: string) => any;
  displayHelp: () => void;
  rootPath?: string;
  systemArgs?: ISystemArgs;
  promptAnswers?: Record<string, any>;
  logger: any;
};

export type MainHandler<
  TParserFlags extends FlagsArray = FlagsArray,
  TParentParserFlags extends FlagsArray = FlagsArray,
  THandlerReturn = any,
> = (
  ctx: IHandlerContext<TParsedArgs<TParserFlags>, TParsedArgs<TParentParserFlags>>,
) => THandlerReturn | Promise<THandlerReturn>;

// ============================================================================
// Subcommand Types
// ============================================================================

export interface ISubCommand {
  name: string;
  description?: string;
  parser: any;
  handler?: (ctx: IHandlerContext) => any;
  isMcp?: boolean;
  mcpServerInfo?: {
    name: string;
    version: string;
    description?: string;
  };
  mcpToolOptions?: any;
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}

export type PromptType = 'text' | 'password' | 'confirm' | 'select' | 'multiselect';

export interface PromptFieldConfig {
  type: PromptType;
  message: string;
  placeholder?: string;
  initial?: any;
  validate?: (value: any, ctx: IHandlerContext) => boolean | string | Promise<boolean | string>;
  options?: Array<string | { label: string; value: any; hint?: string }>;
  maxItems?: number;
  skip?: boolean;
}

export type PromptWhen = 'interactive-flag' | 'missing' | 'always';

export interface IPromptableFlag extends IFlag {
  prompt?: (ctx: IHandlerContext) => PromptFieldConfig | Promise<PromptFieldConfig>;
  promptSequence?: number;
}

export interface IInteractiveSubCommand extends ISubCommand {
  promptWhen?: PromptWhen;
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}

// ============================================================================
// Parser Types
// ============================================================================

export type ArgParserInstance = any;

export interface ParseResult<T = any> {
  success: boolean;
  exitCode: number;
  data?: T;
  message?: string;
  shouldExit?: boolean;
  type?: 'success' | 'error' | 'help' | 'version' | 'debug';
}

export interface ArgParserOptions {
  autoExit?: boolean;
  handleErrors?: boolean;
}

export interface ArgParserBehaviorOptions {
  autoExit?: boolean;
  handleErrors?: boolean;
}

// ============================================================================
// JSON Schema Utilities
// ============================================================================

export function getJsonSchemaTypeFromFlag(
  flagType: TParsedArgsTypeFromFlagDef,
): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  if (flagType && typeof flagType === 'object' && (flagType as ZodTypeAny)._def) {
    return 'object';
  }

  if (typeof flagType === 'function') {
    if (flagType === String) return 'string';
    if (flagType === Number) return 'number';
    if (flagType === Boolean) return 'boolean';
    if (flagType === Array) return 'array';
    if (flagType === Object) return 'object';
    return 'string';
  }

  if (typeof flagType === 'string') {
    const normalizedType = flagType.toLowerCase();
    switch (normalizedType) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  }

  return 'string';
}

// ============================================================================
// Output Schema Patterns
// ============================================================================

export const OutputSchemaPatterns = {
  successError: () =>
    z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional(),
    }),

  successWithData: (dataSchema?: z.ZodTypeAny) =>
    z.object({
      success: z.boolean(),
      data: dataSchema || z.any(),
      message: z.string().optional(),
      error: z.string().optional(),
    }),

  list: (itemSchema?: z.ZodTypeAny) =>
    z.object({
      items: z.array(itemSchema || z.any()),
      count: z.number().optional(),
      hasMore: z.boolean().optional(),
    }),

  fileOperation: () =>
    z.object({
      path: z.string(),
      size: z.number().optional(),
      created: z.boolean().optional(),
      modified: z.boolean().optional(),
      exists: z.boolean().optional(),
    }),

  processExecution: () =>
    z.object({
      exitCode: z.number(),
      stdout: z.string().optional(),
      stderr: z.string().optional(),
      duration: z.number().optional(),
      command: z.string().optional(),
    }),
} as const;

export type OutputSchemaPatternName = keyof typeof OutputSchemaPatterns;

export type OutputSchemaConfig = OutputSchemaPatternName | z.ZodTypeAny | Record<string, z.ZodTypeAny>;

export function createOutputSchema(pattern: OutputSchemaConfig): z.ZodTypeAny {
  if (typeof pattern === 'string' && pattern in OutputSchemaPatterns) {
    return OutputSchemaPatterns[pattern as OutputSchemaPatternName]();
  }

  if (pattern && typeof pattern === 'object' && '_def' in pattern) {
    return pattern as z.ZodTypeAny;
  }

  if (pattern && typeof pattern === 'object') {
    return z.object(pattern as Record<string, z.ZodTypeAny>);
  }

  return OutputSchemaPatterns.successError();
}

/**
 * Result of executing prompts
 */
export interface PromptResult {
  /** Collected answers */
  answers: Record<string, any>;
  /** Individual prompt results */
  results: Array<{
    flagName: string;
    success: boolean;
    value?: any;
    error?: string;
  }>;
  /** Whether the user cancelled */
  cancelled: boolean;
}
