import { z, type ZodTypeAny } from "zod";

// Forward declaration for ArgParser to avoid circular dependency in HandlerContext
// This will be replaced or refined once ArgParser.ts is updated to use these types.
export type ArgParserInstance = IArgParser;

/**
 * Interface defining the MCP server methods expected by ArgParserBase.
 * This allows ArgParserBase to use these methods without depending on the concrete ArgParser class.
 */
export interface IMcpServerMethods {
  createMcpServer(
    serverInfo?: any,
    toolOptions?: any,
    logPath?: any,
  ): Promise<any>;

  startMcpServerWithTransport(
    serverInfo: any,
    transportType: string,
    transportOptions: any,
    toolOptions: any,
    logPath?: string,
  ): Promise<void>;

  startMcpServerWithMultipleTransports(
    serverInfo: any,
    transports: any[],
    toolOptions: any,
    logPath?: string,
  ): Promise<void>;

  getMcpServerConfig(): any;
}

/**
 * Interface representing the public API of ArgParser/ArgParserBase.
 */
export interface IArgParser<THandlerReturn = any> {
  // Common methods from ArgParserBase
  getAppName(): string | undefined;
  getAppCommandName(): string | undefined;
  getSubCommandName(): string;
  getDescription(): string | undefined;
  getAutoExit(): boolean;
  getHandler(): ((ctx: IHandlerContext) => void) | undefined;
  getSubCommands(): Map<string, ISubCommand>;
  get logger(): any;

  // Flag methods
  get flags(): ProcessedFlag[];
  get flagNames(): string[];
  addFlag(flag: IFlag): this;
  addFlags(flags: readonly IFlag[]): this;
  hasFlag(name: string): boolean;
  getFlagDefinition(name: string): ProcessedFlag | undefined;

  // Subcommand methods
  addSubCommand(subCommandConfig: ISubCommand): this;
  getSubCommand(name: string): ISubCommand | undefined;

  // Parsing methods
  parse(processArgs?: string[], options?: any): Promise<any>;

  // Configuration methods
  setHandler(
    handler: (
      ctx: IHandlerContext<any, any>,
    ) => THandlerReturn | Promise<THandlerReturn>,
  ): this;

  // Help
  helpText(): string;
  printAll(filePath?: string): void;
  getCommandChain(): string[];

  // MCP methods (optional or requires casting)
  addMcpResource(config: any): this;
  removeMcpResource(name: string): this;
  getMcpResources(): any[];
  addMcpPrompt(config: any): this;
  removeMcpPrompt(name: string): this;
  getMcpPrompts(): any[];

  // MCP methods from ArgParser subclass (optional in interface but present at runtime)
  getMcpServerConfig?(): any;
}

/**
 * Defines the behavior for flag inheritance in sub-commands.
 */
export const FlagInheritance = {
  /**
   * No flags are inherited from the parent.
   */
  NONE: "none",
  /**
   * Inherits flags only from the direct parent at the time of attachment (Snapshot behavior).
   * Equivalent to `true` in legacy boolean config.
   */
  DirectParentOnly: "direct-parent-only",
  /**
   * Inherits flags from the entire parent chain, ensuring grandchildren receive root flags
   * even in bottom-up construction scenarios.
   */
  AllParents: "all-parents",
} as const;

export type TFlagInheritance =
  | (typeof FlagInheritance)[keyof typeof FlagInheritance]
  | boolean;

/**
 * Zod schema for validating DXT-specific options
 */
export const zodDxtOptionsSchema = z
  .object({
    sensitive: z
      .boolean()
      .optional()
      .describe(
        "Whether this field should be marked as sensitive in DXT user_config",
      ),
    localDefault: z
      .string()
      .optional()
      .describe("Default value specific to DXT sandbox environment"),
    type: z
      .enum(["string", "directory", "file", "boolean", "number"])
      .optional()
      .describe("DXT input type - determines UI component in DXT clients"),
    multiple: z
      .boolean()
      .optional()
      .describe("Allow multiple values (for arrays)"),
    min: z.number().optional().describe("Minimum value (for number type)"),
    max: z.number().optional().describe("Maximum value (for number type)"),
    default: z
      .any()
      .optional()
      .describe(
        "DXT-specific default value (overrides localDefault if provided)",
      ),
    title: z
      .string()
      .optional()
      .describe("Custom title for the user_config field"),
  })
  .strict()
  .refine(
    (data) => {
      // If min or max are provided, type should be "number"
      if (
        (data.min !== undefined || data.max !== undefined) &&
        data.type !== "number"
      ) {
        return false;
      }
      // If min and max are both provided, min should be <= max
      if (
        data.min !== undefined &&
        data.max !== undefined &&
        data.min > data.max
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Invalid dxtOptions: min/max can only be used with type 'number', and min must be <= max",
    },
  );

export const zodFlagSchema = z
  .object({
    name: z
      .string()
      .min(1, "Flag name cannot be empty")
      .describe(
        "The output property name, used as a return key `{name: value}`. Must be unique.",
      ),
    allowLigature: z
      .boolean()
      .default(true)
      .describe(
        "Enable both forms of flag input, e.g., `./script.js -f=value` and `-f value`.",
      ),
    allowMultiple: z
      .boolean()
      .default(false)
      .describe(
        "Allow passing the same flag multiple times, e.g., `-f val1 -f val2` results in an array.",
      ),
    description: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("Textual description for help messages."),
    valueHint: z
      .string()
      .optional()
      .describe("Hint/example value shown in help and examples."),
    options: z
      .array(z.string().min(1))
      .min(1, "Flag must have at least one option (e.g., ['-f', '--flag'])")
      .describe("Array of option strings, e.g., ['-f', '--flag']."),
    defaultValue: z
      .any()
      .optional()
      .describe("Default value if the flag is not provided."),
    type: z
      .union([
        z.any().refine((val) => val === String, {
          message: "Must be String constructor",
        }),
        z.any().refine((val) => val === Number, {
          message: "Must be Number constructor",
        }),
        z.any().refine((val) => val === Boolean, {
          message: "Must be Boolean constructor",
        }),
        z.any().refine((val) => val === Array, {
          // Native Array constructor
          message: "Must be Array constructor",
        }),
        z.any().refine((val) => val === Object, {
          // Native Object constructor
          message: "Must be Object constructor",
        }),
        z.custom<(value: string) => any | Promise<any>>(
          (val) => typeof val === "function",
          "Must be a custom parser function",
        ), // Custom parser function (value: string) => any | Promise<any>
        z.custom<ZodTypeAny>(
          (val) => val && typeof val === "object" && (val as any)._def,
          "Must be a Zod schema",
        ), // Zod schema for structured JSON validation
        z.string().refine(
          // String literal types
          (value) =>
            ["boolean", "string", "number", "array", "object"].includes(
              value.toLowerCase(),
            ),
          {
            message:
              "Invalid type string. Must be one of 'boolean', 'string', 'number', 'array', 'object'.",
          },
        ),
      ])
      .default("string") // Default type is string if not specified
      .describe(
        "Expected data type (constructor, string literal, custom parser function, or Zod schema). Defaults to 'string'.",
      ),
    mandatory: z
      .union([
        z.boolean(),
        z.custom<(value?: any, parsedArgs?: any) => boolean>(
          (val) => typeof val === "function",
          "Must be a boolean or function",
        ),
      ]) // `z.any()` for parsedArgs flexibility
      .optional()
      .describe(
        "Makes the flag mandatory, can be a boolean or a function conditional on other args.",
      ),
    flagOnly: z
      .boolean()
      .default(false)
      .describe(
        "If true, the flag's presence is noted (true/false), and any subsequent value is not consumed by this flag.",
      ),
    validate: z // User-provided validation function
      .custom<
        (
          value?: any,
          parsedArgs?: any,
        ) => boolean | string | void | Promise<boolean | string | void>
      >((val) => typeof val === "function", "Must be a validation function")
      .optional()
      .describe(
        "Custom validation function for the flag's value (receives value, parsedArgs).",
      ),
    enum: z // User-provided enum values
      .array(z.any())
      .optional()
      .describe("Array of allowed values for the flag."),
    env: z // Environment variables mapping
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "Environment variable(s) to map to this flag. Logic: Fallback (Env -> Flag) and Sync (Flag -> Env). Precedence: Flag > Env > Default.",
      ),
    dxtOptions: zodDxtOptionsSchema
      .optional()
      .describe(
        "DXT-specific configuration options for enhanced DXT manifest generation",
      ),
    dynamicRegister: z
      .custom<DynamicRegisterFn>((val) => typeof val === "function")
      .optional()
      .describe(
        "Optional callback that can register additional flags dynamically when this flag is present.",
      ),
    setWorkingDirectory: z
      .boolean()
      .optional()
      .describe(
        "If true, this flag's value becomes the effective working directory for file operations.",
      ),
    positional: z
      .number()
      .int()
      .positive("Positional index must be a positive integer (1, 2, 3...)")
      .optional()
      .describe(
        "If set, this flag captures the Nth trailing positional argument (1-indexed). " +
          "Multiple flags can have different positional values to capture multiple trailing args in order.",
      ),
  })
  // Allow unrecognized properties by default in Zod v4
  .transform((obj) => {
    // Alias handling for 'default' and 'required'
    const newObj: { [key: string]: any } = { ...obj };
    if (
      "default" in newObj &&
      newObj["default"] !== undefined &&
      !("defaultValue" in newObj)
    ) {
      newObj["defaultValue"] = newObj["default"];
    }
    if (
      "required" in newObj &&
      newObj["required"] !== undefined &&
      !("mandatory" in newObj)
    ) {
      newObj["mandatory"] = newObj["required"] as
        | boolean
        | ((parsedArgs: any) => boolean);
    }
    return newObj;
  });

/**
 * The raw input type for defining a flag, before Zod processing (aliases, defaults).
 */
export type IFlagCore = z.input<typeof zodFlagSchema>;

/**
 * The type of the `type` property in a ProcessedFlagCore object.
 * This represents all valid forms the `type` property can take after Zod processing.
 */
export type TParsedArgsTypeFromFlagDef =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor
  | ((value: string) => any) // Sync custom parser function
  | ((value: string) => Promise<any>) // Async custom parser function
  | ZodTypeAny // Zod schema for structured JSON validation
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"; // String literal types

/**
 * The core type of a flag after Zod processing (defaults applied, aliases resolved),
 * but before some properties are made more specific (like `type` constructor to actual type).
 * This type is output by `zodFlagSchema.parse()`.
 */
export type ProcessedFlagCore = Omit<z.output<typeof zodFlagSchema>, "type"> & {
  type: TParsedArgsTypeFromFlagDef;
};

/**
 * DXT-specific configuration options for flags that will be included in DXT manifests.
 * These options control how the flag appears in DXT user_config and how it behaves in DXT environments.
 */
export interface IDxtOptions {
  /** Whether this field should be marked as sensitive in DXT user_config (default: true for ENV-linked flags) */
  sensitive?: boolean;

  /** Default value specific to DXT sandbox environment (different from regular default) */
  localDefault?: string;

  /** DXT input type - determines UI component in DXT clients (default: inferred from IFlag.type) */
  type?: "string" | "directory" | "file" | "boolean" | "number";

  /** Allow multiple values (for arrays) */
  multiple?: boolean;

  /** Minimum value (for number type) */
  min?: number;

  /** Maximum value (for number type) */
  max?: number;

  /** DXT-specific default value (overrides localDefault if provided) */
  default?: any;

  /** Custom title for the user_config field (overrides auto-generated title) */
  title?: string;
}

/**
 * The user-facing type for defining a flag. It includes aliases like `default` and `required`.
 * The `handler` property is removed as handlers are typically associated with commands/subcommands, not individual flags.
 */
export type IFlag = IFlagCore & {
  /** @alias defaultValue */
  default?: any;
  /** @alias mandatory */
  required?: boolean | ((parsedArgs: TParsedArgs<any>) => boolean);
  /** Environment variables that should be set from this flag's value in DXT packages */
  env?: string | string[];
  /** DXT-specific configuration options for enhanced DXT manifest generation */
  dxtOptions?: IDxtOptions;
  /** Optional callback to dynamically register additional flags when this flag is present */
  dynamicRegister?: DynamicRegisterFn;
  /**
   * If true, this flag's value becomes the effective working directory.
   * When set, all file operations (including .env loading) will be relative to this path.
   * Last flag with this property in the command chain wins.
   *
   * @alias chdir
   *
   * @example
   * ```typescript
   * .addFlag({
   *   name: "workspace",
   *   description: "Workspace directory to operate in",
   *   options: ["--workspace", "-w"],
   *   type: "string",
   *   setWorkingDirectory: true,
   * })
   * ```
   *
   * @example
   * ```typescript
   * // User runs: my-cli --workspace ./packages/my-app
   * // Effective cwd becomes: /repo/packages/my-app/
   * // All .env files are loaded from: /repo/packages/my-app/
   * ```
   */
  setWorkingDirectory?: boolean;
  /**
   * Captures the Nth trailing positional argument (1-indexed).
   *
   * - `positional: 1` captures the first trailing arg
   * - `positional: 2` captures the second trailing arg
   * - etc.
   *
   * Positional args are assigned AFTER all flags and subcommands are parsed.
   * The flag's `options` array still works as a fallback (e.g., `--id xxx`).
   *
   * @example
   * ```typescript
   * .addFlag({
   *   name: "id",
   *   type: "string",
   *   mandatory: true,
   *   options: ["--id"],      // Fallback: --id xxx
   *   positional: 1,          // Primary: workflow show xxx
   *   description: "Workflow ID to show",
   * })
   * ```
   */
  positional?: number;
};

/**
 * Context for dynamic flag registration callbacks.
 */
export type DynamicRegisterContext = {
  value: any | any[];
  argsSoFar: Record<string, any>;
  parser: ArgParserInstance;
  processArgs: string[];
  forHelp?: boolean;
  registerFlags: (flags: readonly IFlag[]) => void;
};

/**
 * Function signature for dynamic flag loader/registrar.
 */
export type DynamicRegisterFn = (
  ctx: DynamicRegisterContext,
) => Promise<readonly IFlag[] | void> | readonly IFlag[] | void;

/**
 * A more refined type for a flag after it has been fully processed by ArgParser,
 * particularly its `type` property and validation/enum/mandatory functions.
 * This is the type that ArgParser would internally work with for parsing and type extraction.
 */
export type ProcessedFlag = Omit<
  ProcessedFlagCore,
  "validate" | "enum" | "mandatory"
> & {
  // `type` is already correctly typed via ProcessedFlagCore.
  validate?: (
    value: any,
    parsedArgs?: TParsedArgs<ProcessedFlag[]>, // Parsed args up to this point
  ) => boolean | string | void | Promise<boolean | string | void>;
  enum?: any[]; // Enum values, type-checked by user or ArgParser
  mandatory?: boolean | ((parsedArgs: TParsedArgs<ProcessedFlag[]>) => boolean);
  env?: string | string[]; // Environment variables for DXT packages
  dynamicRegister?: DynamicRegisterFn;
  positional?: number; // Captures Nth trailing positional argument (1-indexed)
};

/**
 * Resolves the TypeScript type from a flag's `type` definition.
 */
export type ResolveType<T extends TParsedArgsTypeFromFlagDef> =
  T extends StringConstructor
    ? string
    : T extends NumberConstructor
      ? number
      : T extends BooleanConstructor
        ? boolean
        : T extends ArrayConstructor
          ? any[] // Default to array of any if not further specified
          : T extends ObjectConstructor
            ? Record<string, any> // Default to object with any properties
            : T extends ZodTypeAny
              ? z.infer<T> // Infer TypeScript type from Zod schema
              : T extends "string"
                ? string
                : T extends "number"
                  ? number
                  : T extends "boolean"
                    ? boolean
                    : T extends "array"
                      ? any[] // Default for string literal 'array'
                      : T extends "object"
                        ? Record<string, any> // Default for string literal 'object'
                        : T extends (value: string) => infer R // Custom parser function
                          ? R // The return type of the custom parser
                          : any; // Fallback type

/**
 * Extracts the final TypeScript type for a flag's value based on its definition,
 * considering `flagOnly` and `allowMultiple` properties.
 */
export type ExtractFlagType<TFlag extends ProcessedFlag> =
  TFlag["flagOnly"] extends true // If the flag is a "flag-only" (presence) type
    ? TFlag["allowMultiple"] extends true
      ? boolean[] // Multiple presence flags result in an array of booleans
      : boolean // Single presence flag results in a boolean
    : TFlag["allowMultiple"] extends true // If the flag can have multiple values
      ? Array<ResolveType<TFlag["type"]>> // Results in an array of the resolved type
      : ResolveType<TFlag["type"]>; // Single value of the resolved type

/**
 * Represents the structured object of parsed arguments.
 * Keys are flag names, and values are their parsed and typed values.
 * `TFlags` should be the array of `ProcessedFlag` definitions for the specific command.
 */
export type TParsedArgs<TFlags extends readonly ProcessedFlag[]> = {
  [K in TFlags[number]["name"]]: ExtractFlagType<
    Extract<TFlags[number], { name: K }>
  >;
};

/**
 * Generic context object passed to command handlers.
 * @template TCurrentCommandArgs Shape of `args` for the current command, derived from its flags.
 * @template TParentCommandArgs Shape of `parentArgs` from the parent command, if any.
 */
export type IHandlerContext<
  TCurrentCommandArgs = any,
  TParentCommandArgs = any,
> = {
  /** Parsed arguments specific to the current command. */
  args: TCurrentCommandArgs;
  /** Parsed arguments from the parent command, if this is a subcommand. */
  parentArgs?: TParentCommandArgs;
  /** The sequence of command names that led to this handler. */
  commandChain: string[];
  /** The `ArgParser` instance that invoked this handler (could be a subcommand's parser). */
  parser: ArgParserInstance;
  /** The parent `ArgParser` instance, if this is a subcommand handler. */
  parentParser?: ArgParserInstance;
  /** Optional: The root `ArgParser` instance of the CLI. */
  // rootParser?: ArgParserInstance;
  /** Indicates if the handler is being called from MCP mode (true) or CLI mode (false). */
  isMcp?: boolean;
  /**
   * Get a flag value with proper resolution priority (CLI flag > ENV > default).
   * Only available in MCP mode when isMcp is true.
   */
  getFlag?: (name: string) => any;
  /**
   * Display the help message for the current command context.
   */
  displayHelp: () => void;
  /**
   * The root path from the user's CLI command perspective.
   * This is the original current working directory when the CLI was invoked.
   *
   * Use this when you need to reference paths relative to where the user ran the command,
   * as opposed to the effective working directory (which may have been changed by
   * flags with `setWorkingDirectory`).
   *
   * @example
   * // User runs: my-cli --workspace ./packages/app --input ./data/file.txt
   * // From /repo/ directory
   *
   * // In handler:
   * console.log(ctx.rootPath);           // "/repo/" (where user ran command)
   * console.log(process.cwd());           // "/repo/packages/app/" (effective cwd)
   * console.log(ctx.args.input);          // "./data/file.txt" (relative to effective cwd)
   *
   * // To resolve ctx.args.input relative to user's cwd:
   * const userInputPath = path.resolve(ctx.rootPath, ctx.args.input);
   */
  rootPath?: string;
  /**
   * Data-safe logger instance.
   * In MCP mode, this logger ensures STDOUT safety by routing logs to STDERR or a file.
   */
  logger: any; // Using any to avoid circular dependency or complex type imports in types.ts
};

/**
 * Generic type for the collection of processed flags that an ArgParser instance manages.
 */
export type FlagsArray = readonly ProcessedFlag[];

/**
 * Converts a flag type to a JSON Schema type string.
 * This function handles all possible flag type formats and returns a valid JSON Schema type.
 *
 * @param flagType - The flag type from IFlag or ProcessedFlag
 * @returns A JSON Schema type string: "string" | "number" | "boolean" | "array" | "object"
 *
 * @example
 * ```typescript
 * getJsonSchemaTypeFromFlag(String) // returns "string"
 * getJsonSchemaTypeFromFlag("number") // returns "number"
 * getJsonSchemaTypeFromFlag((val) => parseInt(val)) // returns "string" (fallback for custom functions)
 * ```
 */
export function getJsonSchemaTypeFromFlag(
  flagType: TParsedArgsTypeFromFlagDef,
): "string" | "number" | "boolean" | "array" | "object" {
  // Handle Zod schemas first
  if (flagType && typeof flagType === "object" && flagType._def) {
    // For Zod schemas, we'll return "object" as they represent structured data
    // The actual JSON Schema will be generated by the MCP integration layer
    return "object";
  }

  // Handle constructor functions
  if (typeof flagType === "function") {
    // Check if it's a built-in constructor
    if (flagType === String) return "string";
    if (flagType === Number) return "number";
    if (flagType === Boolean) return "boolean";
    if (flagType === Array) return "array";
    if (flagType === Object) return "object";

    // For custom parser functions, we can't determine the return type at compile time
    // so we default to "string" as the safest fallback for JSON Schema
    return "string";
  }

  // Handle string literals
  if (typeof flagType === "string") {
    const normalizedType = flagType.toLowerCase();
    switch (normalizedType) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return "array";
      case "object":
        return "object";
      default:
        // Unknown string type, default to string
        return "string";
    }
  }

  // Fallback for any other type
  return "string";
}

/**
 * Common output schema patterns for typical CLI/MCP tool responses
 */
export const OutputSchemaPatterns = {
  /**
   * Simple success/error response pattern
   * @example { success: true, message: "Operation completed" }
   */
  successError: () =>
    z.object({
      success: z.boolean().describe("Whether the operation was successful"),
      message: z
        .string()
        .optional()
        .describe("Optional message about the operation"),
      error: z
        .string()
        .optional()
        .describe("Error message if operation failed"),
    }),

  /**
   * Success response with data payload
   * @example { success: true, data: {...}, message: "Data retrieved" }
   */
  successWithData: (dataSchema?: z.ZodTypeAny) =>
    z.object({
      success: z.boolean().describe("Whether the operation was successful"),
      data: dataSchema || z.any().describe("The response data"),
      message: z
        .string()
        .optional()
        .describe("Optional message about the operation"),
      error: z
        .string()
        .optional()
        .describe("Error message if operation failed"),
    }),

  /**
   * List/array response pattern
   * @example { items: [...], count: 5, hasMore: false }
   */
  list: (itemSchema?: z.ZodTypeAny) =>
    z.object({
      items: z.array(itemSchema || z.any()).describe("Array of items"),
      count: z.number().optional().describe("Total number of items"),
      hasMore: z
        .boolean()
        .optional()
        .describe("Whether there are more items available"),
    }),

  /**
   * File operation response pattern
   * @example { path: "/path/to/file", size: 1024, created: true }
   */
  fileOperation: () =>
    z.object({
      path: z.string().describe("File path"),
      size: z.number().optional().describe("File size in bytes"),
      created: z.boolean().optional().describe("Whether the file was created"),
      modified: z
        .boolean()
        .optional()
        .describe("Whether the file was modified"),
      exists: z.boolean().optional().describe("Whether the file exists"),
    }),

  /**
   * Process execution response pattern
   * @example { exitCode: 0, stdout: "output", stderr: "", duration: 1500 }
   */
  processExecution: () =>
    z.object({
      exitCode: z.number().describe("Process exit code"),
      stdout: z.string().optional().describe("Standard output"),
      stderr: z.string().optional().describe("Standard error output"),
      duration: z
        .number()
        .optional()
        .describe("Execution duration in milliseconds"),
      command: z.string().optional().describe("The command that was executed"),
    }),
} as const;

/**
 * Type for output schema pattern names with auto-completion support
 */
export type OutputSchemaPatternName = keyof typeof OutputSchemaPatterns;

/**
 * Type for output schema configuration - supports pattern names, Zod schemas, or schema definition objects
 */
export type OutputSchemaConfig =
  | OutputSchemaPatternName
  | z.ZodTypeAny
  | Record<string, z.ZodTypeAny>;

/**
 * Creates a Zod output schema from a pattern or custom definition
 *
 * @param pattern - Either a predefined pattern name, a Zod schema, or a schema definition object
 * @returns A Zod schema for output validation
 *
 * @example
 * ```typescript
 * // Using a predefined pattern
 * const schema1 = createOutputSchema('successError');
 *
 * // Using a custom Zod schema
 * const schema2 = createOutputSchema(z.object({ result: z.string() }));
 *
 * // Using a schema definition object
 * const schema3 = createOutputSchema({
 *   result: z.string().describe("The result"),
 *   timestamp: z.string().describe("When the operation completed")
 * });
 * ```
 */
export function createOutputSchema(pattern: OutputSchemaConfig): z.ZodTypeAny {
  // Handle predefined patterns
  if (typeof pattern === "string" && pattern in OutputSchemaPatterns) {
    return OutputSchemaPatterns[pattern]();
  }

  // Handle Zod schema directly
  if (pattern && typeof pattern === "object" && "_def" in pattern) {
    return pattern as z.ZodTypeAny;
  }

  // Handle schema definition object
  if (pattern && typeof pattern === "object") {
    return z.object(pattern as Record<string, z.ZodTypeAny>);
  }

  // Fallback to a generic success pattern
  return OutputSchemaPatterns.successError();
}

/**
 * Defines a subcommand within an ArgParser setup.
 * @template TSubCommandFlags Flags defined specifically FOR this subcommand.
 * @template TParentCommandFlags Flags defined for the PARENT of this subcommand.
 * @template THandlerReturn The expected return type of the subcommand's handler.
 */
export interface ISubCommand<
  TSubCommandFlags extends FlagsArray = FlagsArray,
  TParentCommandFlags extends FlagsArray = FlagsArray,
  THandlerReturn = any,
> {
  name: string;
  description?: string;
  /** The ArgParser instance for this subcommand, typed with its own flags. */
  // Ideally: parser: ArgParser<TSubCommandFlags>; (if ArgParser class is made generic)
  parser: ArgParserInstance;
  /** Handler function for this subcommand. */
  handler?: (
    ctx: IHandlerContext<
      TParsedArgs<TSubCommandFlags>,
      TParsedArgs<TParentCommandFlags>
    >,
  ) => THandlerReturn | Promise<THandlerReturn>;
  /** Internal flag to identify MCP subcommands for proper exclusion from tool generation */
  isMcp?: boolean;
  /** MCP server information for DXT generation */
  mcpServerInfo?: {
    name: string;
    version: string;
    description?: string;
  };
  /** MCP tool generation options for DXT generation */
  mcpToolOptions?: any;
}

/**
 * Result of parsing operations that replaces process.exit() calls.
 * Provides structured information about the parsing outcome.
 */
export interface ParseResult<T = any> {
  /** Whether the parsing was successful */
  success: boolean;
  /** Exit code that would have been used with process.exit() */
  exitCode: number;
  /** The parsed data/result when successful */
  data?: T;
  /** Human-readable message about the result */
  message?: string;
  /** Whether the process should exit (for help, version, etc.) */
  shouldExit?: boolean;
  /** Type of result for better handling */
  type?: "success" | "error" | "help" | "version" | "debug";
}

/**
 * Configuration options for ArgParser behavior
 * @deprecated Use IArgParserParams for full configuration options. This interface will be removed in v3.0.
 */
export interface ArgParserOptions {
  /** Whether to automatically call process.exit() based on ParseResult (default: true for backward compatibility) */
  autoExit?: boolean;
  /** Whether to handle errors by exiting or throwing (default: true for backward compatibility) */
  handleErrors?: boolean;
}

/**
 * Configuration options for ArgParser runtime behavior
 * This is a more clearly named version of ArgParserOptions
 */
export interface ArgParserBehaviorOptions {
  /** Whether to automatically call process.exit() based on ParseResult (default: true for backward compatibility) */
  autoExit?: boolean;
  /** Whether to handle errors by exiting or throwing (default: true for backward compatibility) */
  handleErrors?: boolean;
}

/**
 * Type for the main handler of an ArgParser instance (root command or a command defined by an ArgParser).
 * @template TParserFlags Flags defined for this ArgParser instance.
 * @template TParentParserFlags Flags of the parent parser, if this parser is used as a subcommand.
 * @template THandlerReturn The expected return type of the handler.
 */
export type MainHandler<
  TParserFlags extends FlagsArray = FlagsArray,
  TParentParserFlags extends FlagsArray = FlagsArray,
  THandlerReturn = any,
> = (
  ctx: IHandlerContext<
    TParsedArgs<TParserFlags>,
    TParsedArgs<TParentParserFlags>
  >,
) => THandlerReturn | Promise<THandlerReturn>;
