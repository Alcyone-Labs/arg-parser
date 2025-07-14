import { z } from "zod";

// Forward declaration for ArgParser to avoid circular dependency in HandlerContext
// This will be replaced or refined once ArgParser.ts is updated to use these types.
// It represents an instance of the ArgParser class.
export type ArgParserInstance = any;

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
      .describe("Textual description for help messages."),
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
        z.function().args(z.string()).returns(z.any()), // Custom parser function (value: string) => any
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
        "Expected data type (constructor or string literal) or a custom parser function. Defaults to 'string'.",
      ),
    mandatory: z
      .union([z.boolean(), z.function().args(z.any()).returns(z.boolean())]) // `z.any()` for parsedArgs flexibility
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
      .function()
      .args(z.any().optional(), z.any().optional()) // value, parsedArgs?
      .returns(
        z.union([
          z.boolean(),
          z.string(),
          z.void(),
          z.promise(z.union([z.boolean(), z.string(), z.void()])),
        ]),
      )
      .optional()
      .describe(
        "Custom validation function for the flag's value (receives value, parsedArgs).",
      ),
    enum: z // User-provided enum values
      .array(z.any())
      .optional()
      .describe("Array of allowed values for the flag."),
  })
  .passthrough() // Allow unrecognized properties, they won't be validated or processed beyond alias handling.
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
  | ((value: string) => any) // Custom parser function
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
};

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
  TCurrentCommandArgs extends Record<string, any> = Record<string, any>,
  TParentCommandArgs extends Record<string, any> = Record<string, any>,
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
};

/**
 * Generic type for the collection of processed flags that an ArgParser instance manages.
 */
export type FlagsArray = readonly ProcessedFlag[];

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
  type?: 'success' | 'error' | 'help' | 'version' | 'debug';
}

/**
 * Configuration options for ArgParser behavior
 */
export interface ArgParserOptions {
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
