import { z } from "zod";

// Forward declaration for ArgParser to avoid circular dependency in HandlerContext
// This will be replaced or refined once ArgParser.ts is updated to use these types.
type ArgParserInstance = any;

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
          message: "Must be Array constructor",
        }),
        z.any().refine((val) => val === Object, {
          message: "Must be Object constructor",
        }),
        z.function().args(z.string()).returns(z.any()), // Custom parser function
        z
          .string()
          .refine(
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
      .default("string")
      .describe(
        "Expected data type or a custom parser function. Defaults to 'string'.",
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

export type IFlagCore = z.input<typeof zodFlagSchema>;

export type IFlag = IFlagCore & {
  /** @alias defaultValue */
  default?: any;
  /** @alias mandatory */
  required?: boolean | ((parsedArgs: TParsedArgs<any>) => boolean); // `any` for now for TParsedArgs generic
  // This handler seems to be for sub-commands, not specific to flag definition itself
  // It was part of the original IFlag in ArgParser.ts.
  // Consider moving to ISubCommand interface if it's only used there.
  handler?: (ctx: HandlerContext) => void | Promise<void>;
};

export type ProcessedFlagCore = z.output<typeof zodFlagSchema>;

export type ProcessedFlag = Omit<
  ProcessedFlagCore,
  "type" | "validate" | "enum" | "mandatory"
> & {
  type:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | ArrayConstructor
    | ObjectConstructor
    | ((value: string) => any);
  validate?: (
    value: any,
    parsedArgs?: TParsedArgs<ProcessedFlag[]>,
  ) => boolean | string | void | Promise<boolean | string | void>;
  enum?: any[];
  mandatory?: boolean | ((parsedArgs: TParsedArgs<ProcessedFlag[]>) => boolean);
};

export type ResolveType<T> = T extends (...args: any[]) => infer R
  ? R // Function
  : T extends new (...args: any[]) => infer S
    ? S // Constructor
    : T extends "string"
      ? string
      : T extends "number"
        ? number
        : T extends "boolean"
          ? boolean
          : T extends "array"
            ? any[]
            : T extends "object"
              ? Record<string, any>
              : any; // Fallback

export type ExtractFlagType<Flag extends ProcessedFlag> =
  Flag["flagOnly"] extends true
    ? Flag["allowMultiple"] extends true
      ? boolean[] // Array of booleans if flagOnly and allowMultiple
      : boolean // Single boolean if flagOnly
    : Flag["allowMultiple"] extends true
      ? Array<ResolveType<Flag["type"]>> // Array of resolved type
      : ResolveType<Flag["type"]>; // Single resolved type

export type TParsedArgs<Flags extends readonly (IFlag | ProcessedFlag)[]> = {
  // Made generic to support both IFlag and ProcessedFlag arrays
  [K in Flags[number]["name"]]: Flags[number] extends ProcessedFlag // Type assertion to help compiler
    ? ExtractFlagType<Extract<Flags[number], { name: K } & ProcessedFlag>>
    : any; // Fallback for IFlag, though ideally, TParsedArgs uses ProcessedFlag
};

export type HandlerContext = {
  args: TParsedArgs<ProcessedFlag[]>;
  parentArgs?: TParsedArgs<ProcessedFlag[]>;
  commandChain: string[];
  parser: ArgParserInstance; // Using the forward declared 'any' type
};

// Forward-declare ArgParser for ISubCommand to use
// We use 'any' here as ArgParser itself imports types from this file,
// creating a potential circular dependency for type-checking at this specific point.
// The actual ArgParser<SubCmdFlags> type will be used in ArgParser.ts.
type ArgParserForSubcommand = any;

export interface ISubCommand {
  name: string;
  description?: string;
  parser: ArgParserForSubcommand;
  handler?: (ctx: HandlerContext) => void | Promise<void>;
}

// Generic type for the collection of flags an ArgParser instance will manage.
// Using ProcessedFlag as these are the flags after initial validation and transformation.
export type FlagsArray = readonly ProcessedFlag[];
