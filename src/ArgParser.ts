import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { anyOf, char, createRegExp, oneOrMore } from "magic-regexp";
import { FlagManager } from "./FlagManager";
import {
  HandlerContext,
  IFlag,
  ISubCommand,
  ProcessedFlag,
  TParsedArgs,
} from "./types";

export class ArgParserError extends Error {
  public commandChain: string[];
  constructor(
    message: string,
    public cmdChain: string[] = [],
  ) {
    super(message);
    this.name = "ArgParserError";
    this.commandChain = cmdChain;
  }
}

// zodFlagSchema, IFlag (zod-derived), ResolveType, ExtractFlagType, TParsedArgs (original)
// have been moved to types.ts or are superseded by types from types.ts

interface IArgParserParams {
  /**
   * Add an extra new line between each flag group,
   * makes the text more readable but uses more space
   *
   * Default: true
   */
  extraNewLine?: boolean;
  /**
   * Wraps the line at width, if shorter, wrapping will be more
   * aggressive. Wrapping is based on words.
   *
   * Default: 50
   * Minimum: 30
   */
  wrapAtWidth?: number;
  /**
   * Controls the placing of right text on the screen.
   * The higher the value, the more to the right the text will be.
   *
   * Default: 30
   * Minimum: 20
   */
  blankSpaceWidth?: number;
  /**
   * Character to display next to the flag to express mandatory fields.
   *
   * Default: *
   */
  mandatoryCharacter?: string;
  /**
   * Throw an error if a flag is added more than once
   * @default false
   */
  throwForDuplicateFlags?: boolean;
  description?: string; // New property for the description
  /**
   * Automatically handle ArgParserErrors by printing a formatted message
   * and exiting. Set to false to catch ArgParserError manually.
   * @default true
   */
  handleErrors?: boolean;
  /**
   * The command name to display in help suggestions (e.g., 'dabl').
   * If not provided, it falls back to appName or guessing from the script path.
   * @since 1.5.1
   */
  appCommandName?: string;
  /**
   * If true, when this parser is added as a sub-command, it will inherit
   * flags from its direct parent *unless* a flag with the same name
   * already exists in this parser. Child flags take precedence.
   * @default false
   */
  inheritParentFlags?: boolean;
}

interface IParseOptions {
  /**
   * When true, skips help flag processing (doesn't exit or show help)
   * @default false
   */
  skipHelpHandling?: boolean;
  /**
   * When true, skips the execution of any command handlers.
   * @default false
   */
  skipHandlers?: boolean;
}

type TParsedArgsWithRouting<T = any> = T & {
  $commandChain?: string[];
  handlerToExecute?: { handler: Function; context: HandlerContext };
};

type RecursiveParseResult = {
  finalArgs: TParsedArgsWithRouting<any>;
  handlerToExecute?: { handler: Function; context: HandlerContext };
};

export class ArgParser {
  #appName: string = "Argument Parser";
  #appCommandName?: string;
  #subCommandName: string = "";
  #parameters: IArgParserParams = {
    extraNewLine: true,
    wrapAtWidth: 50,
    blankSpaceWidth: 30,
    mandatoryCharacter: "*",
  };
  #handler?: (ctx: HandlerContext) => void;
  #throwForDuplicateFlags: boolean = false;
  #description?: string;
  #handleErrors: boolean = true;
  #parentParser?: ArgParser;
  #lastParseResult: TParsedArgs<ProcessedFlag[]> = {};
  #inheritParentFlags: boolean = false;
  #subCommands: Map<string, ISubCommand> = new Map();
  #flagManager: FlagManager;

  constructor(
    options: IArgParserParams & {
      appName?: string;
      subCommands?: ISubCommand[];
      handler?: (ctx: HandlerContext) => void;
    } = {},
    initialFlags?: readonly IFlag[],
  ) {
    this.#appName = options.appName || "app";
    if (
      options.blankSpaceWidth &&
      !isNaN(Number(options.blankSpaceWidth)) &&
      Number(options.blankSpaceWidth) > 20
    )
      this.#parameters.blankSpaceWidth = Number(options.blankSpaceWidth);

    if (
      options.wrapAtWidth &&
      !isNaN(Number(options.wrapAtWidth)) &&
      Number(options.wrapAtWidth) > 30
    )
      this.#parameters.wrapAtWidth = Number(options.wrapAtWidth);

    if (typeof options.extraNewLine === "boolean")
      this.#parameters.extraNewLine = Boolean(options.extraNewLine);

    if (typeof options.mandatoryCharacter === "string")
      this.#parameters.mandatoryCharacter = options.mandatoryCharacter;

    if (typeof options.throwForDuplicateFlags === "boolean")
      this.#throwForDuplicateFlags = options.throwForDuplicateFlags;

    this.#flagManager = new FlagManager(
      {
        throwForDuplicateFlags: this.#throwForDuplicateFlags,
      },
      initialFlags || [],
    );

    this.#handleErrors = options.handleErrors ?? true;
    this.#inheritParentFlags = options.inheritParentFlags ?? false;
    this.#description = options.description;
    this.#handler = options.handler;
    this.#appCommandName = options.appCommandName;

    const helpFlag: IFlag = {
      name: "help",
      description: "Display this help message and exits",
      mandatory: false,
      type: Boolean,
      options: ["-h", "--help"],
      defaultValue: undefined,
      allowLigature: false,
      allowMultiple: false,
      flagOnly: true,
      enum: [],
      validate: (_value?: any, _parsedArgs?: any) => true, // Ensure signature matches Zod schema for .args()
    };
    this.#flagManager.addFlag(helpFlag); // Add the help flag via FlagManager

    if (options.subCommands) {
      for (const sub of options.subCommands) {
        this.addSubCommand(sub);
      }
    }
  }

  get flags(): ProcessedFlag[] {
    return this.#flagManager.flags;
  }

  get flagNames(): string[] {
    return this.#flagManager.flagNames; // Delegates to FlagManager
  }

  private _addToOutput(
    flag: ProcessedFlag, // Changed from Flags[number]
    arg: any,
    output: TParsedArgs<ProcessedFlag[]>,
    _parseOptions?: IParseOptions,
  ) {
    let value: unknown = arg;

    if (flag.type === Boolean) {
      if (typeof arg === "boolean") {
        value = arg;
      } else if (typeof arg === "string") {
        value = /(true|yes|1)/i.test(arg);
      } else {
        value = new (flag["type"] as ObjectConstructor)(value);
      }
    } else if (typeof flag["type"] === "function") {
      value = (flag["type"] as Function)(value as string);
    } else if (typeof flag["type"] === "object") {
      value = new (flag["type"] as ObjectConstructor)(value);
    }

    if (flag["enum"] && flag["enum"].length > 0) {
      const allowedValues = flag["enum"]
        .map((v: any) => (typeof v === "string" ? `'${v}'` : v))
        .join(", ");

      if (!flag["enum"].includes(value)) {
        throw new ArgParserError(
          `Invalid value '${value}' for flag '${chalk.yellow(flag["name"])}'. ` +
            `Allowed values: ${allowedValues}`,
          this.getCommandChain(),
        );
      }
    }

    if (flag["validate"]) {
      const validationResult = flag["validate"](value, output);
      if (validationResult === false) {
        throw new ArgParserError(
          `Validation failed for flag '${chalk.yellow(flag["name"])}' with value '${value}'`,
          this.getCommandChain(),
        );
      } else if (typeof validationResult === "string") {
        throw new ArgParserError(validationResult, this.getCommandChain());
      }
    }

    if (flag["allowMultiple"] && !Array.isArray(output[flag["name"]])) {
      output[flag["name"]] = [] as any;
    }

    return flag["allowMultiple"]
      ? (output[flag["name"]] as any[]).push(value)
      : (output[flag["name"]] = value as any);
  }

  addFlags(flags: readonly IFlag[]): this {
    this.#flagManager.addFlags(flags);
    return this;
  }

  addFlag(flag: IFlag): this {
    this.#flagManager.addFlag(flag);
    return this;
  }

  addSubCommand(subCommandConfig: ISubCommand): this {
    if (this.#subCommands.has(subCommandConfig.name)) {
      throw new Error(`Sub-command '${subCommandConfig.name}' already exists`);
    }

    const subParser = subCommandConfig.parser;

    if (!(subParser instanceof ArgParser)) {
      throw new Error(
        `Parser for subcommand '${subCommandConfig.name}' is not an instance of ArgParser. ` +
          `Please provide 'new ArgParser(...)' for the 'parser' property of an ISubCommand.`,
      );
    }

    subParser.#parentParser = this;
    subParser.#subCommandName = subCommandConfig.name;
    if (!subParser.#appCommandName && this.#appCommandName) {
      subParser.#appCommandName = this.#appCommandName;
    }

    if (subParser.#inheritParentFlags) {
      const parentFlags = this.#flagManager.flags;
      for (const parentFlag of parentFlags) {
        if (!subParser.#flagManager.hasFlag(parentFlag["name"])) {
          subParser.#flagManager._setProcessedFlagForInheritance(parentFlag);
        }
      }
    }

    this.#subCommands.set(subCommandConfig.name, subCommandConfig);

    if (subCommandConfig.handler) {
      subParser.setHandler(subCommandConfig.handler);
    }

    return this;
  }

  /**
   * Sets the handler function for this specific parser instance.
   * This handler will be executed if this parser is the final one
   * in the command chain and `executeHandlers` is enabled on the root parser.
   *
   * @param handler - The function to execute.
   * @returns The ArgParser instance for chaining.
   */
  setHandler(handler: (ctx: HandlerContext) => void): this {
    this.#handler = handler;
    return this;
  }

  printAll(filePath?: string): void {
    if (filePath) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (filePath.toLowerCase().endsWith(".json")) {
          const outputObject = this.#_buildRecursiveJson(this);
          const jsonString = JSON.stringify(outputObject, null, 2);
          fs.writeFileSync(filePath, jsonString);
          console.log(`ArgParser configuration JSON dumped to: ${filePath}`);
        } else {
          const outputString = this.#_buildRecursiveString(this, 0);
          const plainText = outputString.replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
            "",
          );
          fs.writeFileSync(filePath, plainText);
          console.log(`ArgParser configuration text dumped to: ${filePath}`);
        }
      } catch (error) {
        console.error(
          `Error writing ArgParser configuration to file '${filePath}':`,
          error,
        );
      }
    } else {
      console.log("\n--- ArgParser Configuration Dump ---");
      this.#_printRecursiveToConsole(this, 0);
      console.log("--- End Configuration Dump ---\\n");
    }
  }

  #_identifyCommandChainAndParsers(
    argsToParse: string[],
    currentParser: ArgParser,
    commandChainSoFar: string[],
    parserChainSoFar: ArgParser[],
  ): {
    finalParser: ArgParser;
    commandChain: string[];
    parserChain: ArgParser[];
    remainingArgs: string[];
  } {
    let subCommandIndex = -1;
    let subCommandName: string | null = null;

    for (let i = 0; i < argsToParse.length; i++) {
      const potentialSubCommand = argsToParse[i];
      if (currentParser.#subCommands.has(potentialSubCommand)) {
        subCommandIndex = i;
        subCommandName = potentialSubCommand;
        break;
      }
    }

    if (subCommandIndex === -1 || subCommandName === null) {
      return {
        finalParser: currentParser,
        commandChain: commandChainSoFar,
        parserChain: parserChainSoFar,
        remainingArgs: argsToParse,
      };
    }

    const subCommandConfig = currentParser.#subCommands.get(subCommandName);
    if (!subCommandConfig || !(subCommandConfig.parser instanceof ArgParser)) {
      throw new Error(
        `Internal error: Subcommand '${subCommandName!}' configuration is invalid or parser is missing.`,
      );
    }
    const nextParser = subCommandConfig.parser;
    const nextArgs = argsToParse.slice(subCommandIndex + 1);
    const nextCommandChain = [...commandChainSoFar, subCommandName];
    const nextParserChain = [...parserChainSoFar, nextParser];

    return this.#_identifyCommandChainAndParsers(
      nextArgs,
      nextParser,
      nextCommandChain,
      nextParserChain,
    );
  }

  #_handleGlobalChecks(
    processArgs: string[],
    options?: IParseOptions,
  ): boolean {
    if (processArgs.length === 0 && !this.#parentParser && !this.#handler) {
      console.log(this.helpText());
      if (typeof process === "object" && typeof process.exit === "function") {
        process.exit(0 as never);
      }
      return true;
    }

    if (processArgs.includes("--LIB-debug-print")) {
      this.printAll("ArgParser.full.json");
      if (typeof process === "object" && typeof process.exit === "function") {
        process.exit(0);
      }
      return true;
    }

    const { finalParser: identifiedFinalParser } =
      this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

    if (processArgs.includes("--LIB-debug")) {
      console.log(
        chalk.yellow.bold("\n--- ArgParser --LIB-debug Runtime Context ---"),
      );

      const {
        commandChain: identifiedCommandChain,
        parserChain: _identifiedParserChain,
      } = this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

      console.log(
        `Identified Command Chain: ${chalk.cyan(identifiedCommandChain.join(" -> ") || "(root)")}`,
      );
      console.log(
        `Identified Final Parser: ${chalk.cyan(identifiedFinalParser.#subCommandName || identifiedFinalParser.#appName)}`,
      );

      let currentParser: ArgParser = this;
      let remainingArgs = [...processArgs];
      let accumulatedArgs: TParsedArgs<any> = {};
      const parsingSteps: {
        level: string;
        argsSlice: string[];
        parsed?: TParsedArgs<any>;
        error?: string;
      }[] = [];

      const rootSubCommandIndex = remainingArgs.findIndex((arg) =>
        currentParser.#subCommands.has(arg),
      );
      const rootArgsSlice =
        rootSubCommandIndex === -1
          ? remainingArgs
          : remainingArgs.slice(0, rootSubCommandIndex);
      parsingSteps.push({ level: "(root)", argsSlice: rootArgsSlice });
      try {
        const { parsedArgs: rootParsedArgs } = currentParser.#parseFlags(
          rootArgsSlice,
          { skipHelpHandling: true },
        );
        parsingSteps[0].parsed = rootParsedArgs;
        accumulatedArgs = { ...accumulatedArgs, ...rootParsedArgs };
      } catch (e: any) {
        parsingSteps[0].error = e.message;
      }
      remainingArgs =
        rootSubCommandIndex === -1
          ? []
          : remainingArgs.slice(rootSubCommandIndex);

      for (let i = 0; i < identifiedCommandChain.length; i++) {
        const subCommandName = identifiedCommandChain[i];
        if (!currentParser.#subCommands.has(subCommandName)) {
          parsingSteps.push({
            level: `Error`,
            argsSlice: [],
            error: `Could not find sub-command parser for '${subCommandName}'`,
          });
          break;
        }
        currentParser = currentParser.#subCommands.get(subCommandName)?.parser;
        remainingArgs = remainingArgs.slice(1);

        const nextSubCommandIndex = remainingArgs.findIndex((arg) =>
          currentParser.#subCommands.has(arg),
        );
        const currentLevelArgsSlice =
          nextSubCommandIndex === -1
            ? remainingArgs
            : remainingArgs.slice(0, nextSubCommandIndex);
        const stepInfo: {
          level: string;
          argsSlice: string[];
          parsed?: TParsedArgs<any>;
          error?: string;
        } = {
          level: subCommandName,
          argsSlice: currentLevelArgsSlice,
        };
        parsingSteps.push(stepInfo);

        try {
          const { parsedArgs: currentLevelParsedArgs } =
            currentParser.#parseFlags(currentLevelArgsSlice, {
              skipHelpHandling: true,
            });
          stepInfo.parsed = currentLevelParsedArgs;
          accumulatedArgs = { ...accumulatedArgs, ...currentLevelParsedArgs };
        } catch (e: any) {
          stepInfo.error = e.message;
        }
        remainingArgs =
          nextSubCommandIndex === -1
            ? []
            : remainingArgs.slice(nextSubCommandIndex);
      }

      console.log(chalk.yellow("\nParsing Simulation Steps:"));
      parsingSteps.forEach((step) => {
        console.log(`  Level: ${chalk.cyan(step.level)}`);
        console.log(
          `    Args Slice Considered: ${JSON.stringify(step.argsSlice)}`,
        );
        if (step.parsed) {
          console.log(
            `    Parsed Args at this Level: ${JSON.stringify(step.parsed)}`,
          );
        }
        if (step.error) {
          console.log(
            `    ${chalk.red("Error during parse simulation:")} ${step.error}`,
          );
        }
      });

      console.log(
        chalk.yellow(
          "\nFinal Accumulated Args State (before final validation):",
        ),
      );
      console.log(JSON.stringify(accumulatedArgs, null, 2));

      console.log(chalk.yellow("\nArguments Remaining After Simulation:"));
      console.log(JSON.stringify(remainingArgs, null, 2));

      console.log(
        chalk.yellow.bold(
          "\n--- ArgParser Static Configuration (Final Parser) ---",
        ),
      );
      identifiedFinalParser.printAll();

      console.log(chalk.yellow.bold("--- End ArgParser --LIB-debug ---"));
      if (typeof process === "object" && typeof process.exit === "function") {
        process.exit(0);
      }
      return true;
    }

    // ---- BEGIN ADDED DIAGNOSTIC LOG FOR identifiedFinalParser ----
    let parserNameForLog = "undefined_parser";
    if (identifiedFinalParser instanceof ArgParser) {
      // Access private fields only if it's a confirmed ArgParser instance
      parserNameForLog =
        (identifiedFinalParser as any)["#subCommandName"] ||
        (identifiedFinalParser as any)["#appName"];
    } else if (identifiedFinalParser) {
      parserNameForLog =
        (identifiedFinalParser as any).name ||
        (identifiedFinalParser as any).appName ||
        "unknown_type";
    }
    // console.log(
    //   `[ArgParser #_handleGlobalChecks Debug] identifiedFinalParser: constructor=${identifiedFinalParser ? 'defined' : 'undefined'}, isArgParser=${identifiedFinalParser instanceof ArgParser}, name=${parserNameForLog}`
    // );
    // ---- END ADDED DIAGNOSTIC LOG FOR identifiedFinalParser ----

    // ---- BEGIN GUARD FOR identifiedFinalParser ----
    if (!(identifiedFinalParser instanceof ArgParser)) {
      console.error(
        `[ArgParser #_handleGlobalChecks Critical Error] identifiedFinalParser is not an instance of ArgParser. Cannot process help. Name: ${parserNameForLog}, Constructor: ${identifiedFinalParser ? (identifiedFinalParser as any).constructor?.name : "undefined"}`,
      );
      // Returning false to prevent further processing with an invalid parser,
      // which could lead to more cryptic errors or incorrect behavior.
      return false;
    }
    // ---- END GUARD FOR identifiedFinalParser ----

    const helpFlagDefinition =
      identifiedFinalParser.#flagManager.getFlag("help");
    if (helpFlagDefinition && !options?.skipHelpHandling) {
      const helpOptions = helpFlagDefinition["options"];

      // ---- BEGIN ADDED DEBUG AND DEFENSIVE CHECK ----
      // if (!Array.isArray(helpOptions) || helpOptions.length === 0) {
      //   console.warn(
      //     `[ArgParser Debug] helpOptions is not a valid array or is empty. Value: ${JSON.stringify(helpOptions)}, Type: ${typeof helpOptions}`,
      //     `Parser: ${parserNameForLog}`, // Use the determined parserNameForLog
      //   );
      //   // Potentially, we might even want to return false here or throw,
      //   // as help cannot be processed correctly. For now, just log and continue.
      // } else {
      //   // Optional: Log the valid helpOptions for debugging successful cases
      //   // console.log(`[ArgParser Debug] Valid helpOptions: ${JSON.stringify(helpOptions)} for parser ${parserNameForLog}`);
      // }
      // ---- END ADDED DEBUG AND DEFENSIVE CHECK ----

      const helpRequested = processArgs.some((arg) =>
        helpOptions.includes(arg),
      );

      if (helpRequested) {
        console.log(identifiedFinalParser.helpText());
        if (typeof process === "object" && typeof process.exit === "function") {
          process.exit(0 as never);
        }
        return true;
      }
    }

    return false;
  }

  #_validateMandatoryFlags(
    finalArgs: TParsedArgsWithRouting<any>,
    parserChain: ArgParser[],
    commandChain: string[],
  ): void {
    const finalMandatoryFlagsMissing: {
      name: string;
      parserName: string;
      commandChain: string[];
    }[] = [];
    const checkedFlagNames = new Set<string>();

    for (const parser of parserChain) {
      const currentCommandChain = parser.getCommandChain();
      for (const flag of parser.#flagManager.flags) {
        // Use FlagManager
        if (flag["name"] === "help" || checkedFlagNames.has(flag["name"]))
          continue;

        const isMandatory =
          typeof flag["mandatory"] === "function"
            ? flag["mandatory"](finalArgs)
            : flag["mandatory"];

        if (!isMandatory) continue;

        const value = finalArgs[flag["name"] as keyof typeof finalArgs];
        let currentFlagIsMissing = false;

        if (flag["allowMultiple"]) {
          // For allowMultiple, it's missing if undefined OR an empty array
          if (
            value === undefined ||
            (Array.isArray(value) && value.length === 0)
          ) {
            currentFlagIsMissing = true;
          }
        } else {
          // For non-allowMultiple, it's missing if undefined
          if (value === undefined) {
            currentFlagIsMissing = true;
          }
        }

        if (currentFlagIsMissing) {
          if (!checkedFlagNames.has(flag["name"])) {
            finalMandatoryFlagsMissing.push({
              name: flag["name"],
              parserName: parser.#subCommandName || parser.#appName,
              commandChain: currentCommandChain,
            });
            checkedFlagNames.add(flag["name"]);
          }
        }
      }
    }

    if (finalMandatoryFlagsMissing.length > 0) {
      throw new ArgParserError(
        `Missing mandatory flags: ${finalMandatoryFlagsMissing
          .map((flag) => chalk.yellow(flag["name"]))
          .join(", ")}`,
        commandChain,
      );
    }
  }

  #_applyDefaultValues(
    finalArgs: TParsedArgsWithRouting<any>,
    finalParser: ArgParser,
  ): void {
    for (const flag of finalParser.#flagManager.flags) {
      // Use FlagManager
      const flagName = flag["name"] as string;
      if (
        finalArgs[flagName] === undefined &&
        flag["defaultValue"] !== undefined
      ) {
        if (flag["allowMultiple"]) {
          finalArgs[flagName] = Array.isArray(flag["defaultValue"])
            ? flag["defaultValue"]
            : [flag["defaultValue"]];
        } else {
          finalArgs[flagName] = flag["defaultValue"];
        }
      }
    }
  }

  #_prepareAndExecuteHandler(
    handlerToExecute: RecursiveParseResult["handlerToExecute"],
    finalArgs: TParsedArgsWithRouting<any>,
    skipHandlers: boolean,
  ): void {
    if (skipHandlers || !handlerToExecute) {
      return;
    }

    const finalParserWhoseHandlerWillRun = handlerToExecute.context.parser;
    const finalParserFlags = finalParserWhoseHandlerWillRun.#flagManager.flags;
    const handlerArgs = handlerToExecute.context.args;

    for (const flag of finalParserFlags) {
      const flagName = flag["name"] as keyof typeof finalArgs;
      if (finalArgs.hasOwnProperty(flagName)) {
        (handlerArgs as any)[flagName] = (finalArgs as any)[flagName];
      } else if (
        flag["allowMultiple"] &&
        !handlerArgs.hasOwnProperty(flagName)
      ) {
        (handlerArgs as any)[flagName] = [];
      }
    }
    handlerToExecute.context.args = handlerArgs;

    handlerToExecute.handler(handlerToExecute.context);
  }

  parse(
    processArgs: string[],
    options?: IParseOptions,
  ): TParsedArgsWithRouting<any> {
    if (this.#_handleGlobalChecks(processArgs, options)) {
      return {} as TParsedArgsWithRouting<any>;
    }

    try {
      const {
        finalParser: identifiedFinalParser,
        commandChain: identifiedCommandChain,
        parserChain: identifiedParserChain,
      } = this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

      const { finalArgs, handlerToExecute } = this._parseRecursive(
        processArgs,
        this,
        {},
        [],
        options,
      );

      // Set command chain in final args
      if (identifiedCommandChain.length > 0) {
        (finalArgs as any).$commandChain = identifiedCommandChain;
      }

      this.#_validateMandatoryFlags(
        finalArgs,
        identifiedParserChain,
        identifiedCommandChain,
      );

      this.#_applyDefaultValues(finalArgs, identifiedFinalParser);

      this.#_prepareAndExecuteHandler(
        handlerToExecute,
        finalArgs,
        options?.skipHandlers ?? false,
      );

      return finalArgs;
    } catch (error) {
      if (error instanceof ArgParserError) {
        if (this.#handleErrors) {
          this.#displayErrorAndExit(error);
          return {} as TParsedArgsWithRouting<any>;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Recursive helper for parsing arguments and handling sub-commands.
   * This method assumes the global help check has already been performed in `parse`.
   */
  private _parseRecursive(
    argsToParse: string[],
    currentParser: ArgParser,
    accumulatedParentArgs: TParsedArgs<any>,
    commandChainSoFar: string[],
    options?: IParseOptions,
  ): RecursiveParseResult {
    let subCommandIndex = -1;
    let subCommandName: string | null = null;

    // Find the index of the first argument that matches a defined sub-command name
    for (let i = 0; i < argsToParse.length; i++) {
      const potentialSubCommand = argsToParse[i];
      if (currentParser.#subCommands.has(potentialSubCommand)) {
        subCommandIndex = i;
        subCommandName = potentialSubCommand;
        break;
      }
    }

    // Determine which arguments belong to the current parser level
    const argsForCurrentLevel =
      subCommandIndex === -1
        ? argsToParse
        : argsToParse.slice(0, subCommandIndex);

    // Parse flags for the current level using #parseFlags
    const { parsedArgs: currentLevelArgs, firstUnconsumedIndex } =
      currentParser.#parseFlags(argsForCurrentLevel, options);

    // Apply default values for the current parser's flags to its args
    currentParser.#_applyDefaultValues(currentLevelArgs, currentParser);

    const combinedArgsFromThisAndParents = {
      ...accumulatedParentArgs,
      ...currentLevelArgs,
    };

    if (subCommandIndex === -1 || subCommandName === null) {
      if (firstUnconsumedIndex < argsForCurrentLevel.length) {
        const unknownCommand = argsForCurrentLevel[firstUnconsumedIndex];
        throw new ArgParserError(
          `Unknown command: '${chalk.yellow(unknownCommand)}'`,
          commandChainSoFar,
        );
      }

      const finalParseResultArgs = { ...combinedArgsFromThisAndParents };
      if (commandChainSoFar.length > 0) {
        finalParseResultArgs["$commandChain"] = commandChainSoFar;
      }

      let handlerToExecute: RecursiveParseResult["handlerToExecute"] =
        undefined;
      if (currentParser.#handler) {
        handlerToExecute = {
          handler: currentParser.#handler,
          context: {
            args: currentLevelArgs,
            parentArgs: accumulatedParentArgs,
            commandChain: commandChainSoFar,
            parser: currentParser,
          },
        };
      }
      return { finalArgs: finalParseResultArgs, handlerToExecute };
    }
    if (firstUnconsumedIndex < argsForCurrentLevel.length) {
      const unknownCommand = argsForCurrentLevel[firstUnconsumedIndex];
      throw new ArgParserError(
        `Unknown command: '${chalk.yellow(unknownCommand)}'`,
        commandChainSoFar,
      );
    }

    const subCommandConfig = currentParser.#subCommands.get(subCommandName!);
    if (!subCommandConfig || !(subCommandConfig.parser instanceof ArgParser)) {
      // This should ideally not be reached if addSubCommand validated the parser instance
      throw new ArgParserError(
        `Internal error: Subcommand '${subCommandName!}' is misconfigured or its parser is not a valid ArgParser instance.`,
        commandChainSoFar,
      );
    }
    const nextParser = subCommandConfig.parser;
    const nextArgs = argsToParse.slice(subCommandIndex + 1);
    const nextCommandChain = [...commandChainSoFar, subCommandName];
    const combinedArgsForNextLevel = {
      ...accumulatedParentArgs,
      ...currentLevelArgs,
    };

    return this._parseRecursive(
      nextArgs,
      nextParser,
      combinedArgsForNextLevel,
      nextCommandChain,
      options,
    );
  }

  #parseFlags(
    args: string[],
    options?: IParseOptions,
  ): {
    parsedArgs: TParsedArgs<ProcessedFlag[]>;
    firstUnconsumedIndex: number;
  } {
    const flags = this.#flagManager.flags;

    const output: TParsedArgs<ProcessedFlag[]> = Object.fromEntries(
      flags.map((flag) => [
        flag["name"],
        flag["allowMultiple"] ? [] : undefined,
      ]),
    ) as TParsedArgs<ProcessedFlag[]>;

    let consumedIndices = new Set<number>();

    for (const flagToCheck of flags) {
      if (flagToCheck["allowLigature"] && !flagToCheck["flagOnly"]) {
        const regex = createRegExp(
          anyOf(
            ...flagToCheck["options"].map((option: string) => `${option}=`),
          ),
          oneOrMore(char).groupedAs("arg"),
        );
        for (let i = 0; i < args.length; i++) {
          if (consumedIndices.has(i)) continue;
          const itemToCheck = args[i];
          const matches = regex.exec(`${itemToCheck}`);
          if (matches?.groups?.["arg"]) {
            this._addToOutput(
              flagToCheck,
              matches?.groups?.["arg"],
              output,
              options,
            );
            consumedIndices.add(i);
            if (!flagToCheck["allowMultiple"]) break;
          }
        }
      }
    }

    for (const flagToCheck of flags) {
      for (let index = 0; index < args.length; index++) {
        if (consumedIndices.has(index)) continue;

        const value = args[index];
        const nextIndex = index + 1;
        const nextValueExists = nextIndex < args.length;
        const nextValue = nextValueExists ? args[nextIndex] : undefined;
        const nextValueIsFlag =
          typeof nextValue === "string" && nextValue.startsWith("-");

        if (flagToCheck["options"].includes(value)) {
          // Mark the flag itself as consumed immediately
          consumedIndices.add(index);

          if (flagToCheck["flagOnly"]) {
            this._addToOutput(flagToCheck, true, output, options);
          } else if (nextValueExists && !nextValueIsFlag) {
            this._addToOutput(flagToCheck, nextValue, output, options);
            consumedIndices.add(nextIndex);
          } else if (flagToCheck["type"] === Boolean) {
            this._addToOutput(flagToCheck, true, output, options);
          }
          if (!flagToCheck["allowMultiple"]) break;
        }
      }
    }

    let firstUnconsumedIndex = args.length;
    for (let i = 0; i < args.length; i++) {
      if (!consumedIndices.has(i)) {
        firstUnconsumedIndex = i;
        break;
      }
    }

    return { parsedArgs: output, firstUnconsumedIndex };
  }

  helpText(): string {
    const cyan = chalk.cyan;
    const green = chalk.green;
    const white = chalk.white;
    const red = chalk.red;
    const dim = chalk.dim;

    let rootAppName = this.#appName;
    let current: ArgParser | undefined = this;
    while (current.#parentParser) {
      current = current.#parentParser;
    }
    if (current) {
      rootAppName = current.#appName;
    }

    const helpTitle = this.#subCommandName
      ? `${rootAppName} ${this.#subCommandName}`
      : rootAppName;

    let help = `${cyan(`${helpTitle} Help`)} (${this.#parameters.mandatoryCharacter} = Mandatory fields):\n\n`;

    // ---- BEGIN ADDED DIAGNOSTIC LOG ----
    // console.log(
    //   `[ArgParser helpText Debug] 'this' context: constructor.name = ${this?.constructor?.name}, is ArgParser instance = ${this instanceof ArgParser}, subCommandName = ${this.#subCommandName || '(root)'}`,
    // );
    // ---- END ADDED DIAGNOSTIC LOG ----

    if (this.#description) {
      help += `${white(this.#description)}\n\n`;
    }

    const indent = (level: number = 1) => "  ".repeat(level);

    if (this.#subCommands.size > 0) {
      // Use Map.size
      help += `${cyan("Available sub-commands:")}\n`;
      // Iterate over Map entries, then sort
      help += Array.from(this.#subCommands.entries())
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .map(([name, subCommandConfig]) => {
          // subCommandConfig is an ISubCommand object from the map
          const actualSubParserInstance = subCommandConfig.parser;

          // Guard against misconfiguration, though addSubCommand should prevent non-ArgParser instances
          if (!(actualSubParserInstance instanceof ArgParser)) {
            return `${indent()}${green(name.padEnd(20))} [Error: Subcommand '${name}' has an invalid parser configuration]`;
          }

          let subHelp = `${indent()}${green(name.padEnd(20))} ${white(actualSubParserInstance.#description || "")}`;

          const flagsFromSubManager =
            actualSubParserInstance && actualSubParserInstance.#flagManager
              ? actualSubParserInstance.#flagManager.flags
              : undefined;
          const subFlags = (flagsFromSubManager || []).filter(
            (f: ProcessedFlag) => f["name"] !== "help",
          );
          if (subFlags.length > 0) {
            subHelp += `\n${indent(2)}${dim("Flags:")}`;
            subFlags
              .sort((a: ProcessedFlag, b: ProcessedFlag) =>
                a["name"].localeCompare(b["name"]),
              )
              .forEach((f: ProcessedFlag) => {
                const flagOptions = f["options"]
                  .map((opt: string) => green(opt))
                  .join(", ");
                const flagDesc = Array.isArray(f["description"])
                  ? f["description"][0]
                  : f["description"];
                subHelp += `\n${indent(3)}${flagOptions} - ${dim(flagDesc)}`;
              });
          } else {
            subHelp += `\n${indent(2)}${dim("Flags:")} none`;
          }

          const subSubCommandNames = Array.from(
            actualSubParserInstance.#subCommands.keys(),
          ); // Get keys from actualSubParserInstance's Map
          if (subSubCommandNames.length > 0) {
            subHelp += `\n${indent(2)}${dim("Sub-commands:")} ${subSubCommandNames.join(", ")}`;
          } else {
            subHelp += `\n${indent(2)}${dim("Sub-commands:")} none`;
          }

          return subHelp;
        })
        .join("\n\n");
      help += "\n";
    }

    help += `\n${cyan("Flags:")}\n`;
    const localFlags = this.#flagManager.flags; // Use FlagManager for local flags
    if (localFlags.length > 0) {
      help += localFlags
        .sort((flagA, flagB) => flagA["name"].localeCompare(flagB["name"]))
        .map((flag: ProcessedFlag) => {
          // Flag type is ProcessedFlag
          const optionsText = flag["options"]
            .toSorted((a: string, b: string) => a.length - b.length) // Sort by length (shortest first)
            .map((opt: string) => green(opt))
            .join(", ");
          const isMandatory =
            typeof flag.mandatory === "function" ? "dynamic" : flag.mandatory;
          const mandatoryIndicator =
            isMandatory === true
              ? ` ${red(this.#parameters.mandatoryCharacter)}`
              : isMandatory === "dynamic"
                ? ` ${dim("(conditionally mandatory)")}`
                : "";

          const descriptionLines = Array.isArray(flag["description"])
            ? flag["description"]
            : [flag["description"]];

          const metaLines: string[] = [];

          // Determine the type name for display
          let typeName = "unknown";
          if (typeof flag["type"] === "function") {
            typeName = flag["type"].name || "custom function";
            // Make the type names more user-friendly
            if (typeName === "Boolean") typeName = "boolean";
            if (typeName === "String") typeName = "string";
            if (typeName === "Number") typeName = "number";
            if (typeName === "Array") typeName = "array";
            if (typeName === "Object") typeName = "object";
          } else if (typeof flag["type"] === "string") {
            typeName = flag["type"];
          }

          metaLines.push(`Type: ${typeName}`);

          if (flag["flagOnly"]) {
            metaLines.push("Flag only (no value expected)");
          }
          if (
            flag["defaultValue"] !== undefined &&
            flag["defaultValue"] !== null
          ) {
            metaLines.push(`Default: ${JSON.stringify(flag["defaultValue"])}`);
          }
          if (flag["enum"] && flag["enum"].length > 0) {
            metaLines.push(
              `Allowed values: ${flag["enum"].map((v: any) => `'${v}'`).join(", ")}`,
            );
          }

          const maxOptionLength = Math.max(
            ...localFlags.map(
              (f: ProcessedFlag) => f["options"].join(", ").length,
            ),
            0,
          );
          const formattedOptions =
            optionsText.padEnd(maxOptionLength + 5) + mandatoryIndicator;

          return `
${indent()}${formattedOptions}
${indent(2)}${white(descriptionLines[0])}
${metaLines.map((line) => `${indent(3)}${dim(line)}`).join("\n")}
${descriptionLines
  .slice(1)
  .map((line) => `\n${indent(2)}${white(line)}`)
  .join("")}
  `.trim();
        })
        .join("\n\n");
    } else {
      help += `${indent()}${dim("none")}`;
    }

    return help;
  }

  public getSubCommand(name: string): ISubCommand | undefined {
    return this.#subCommands.get(name);
  }

  public hasFlag(name: string): boolean {
    // Delegates to FlagManager
    return this.#flagManager.hasFlag(name);
  }

  public getCommandChain(): string[] {
    const chain = [];
    let currentParser: ArgParser | undefined = this;
    while (currentParser && currentParser.#parentParser) {
      chain.unshift(currentParser.#subCommandName);
      currentParser = currentParser.#parentParser;
    }
    return chain;
  }

  public getLastParseResult(): TParsedArgs<ProcessedFlag[]> {
    return this.#lastParseResult;
  }

  #displayErrorAndExit(error: ArgParserError): void {
    let commandNameToSuggest = "your-script";

    if (this.#appCommandName) {
      commandNameToSuggest = this.#appCommandName;
    } else if (this.#appName && this.#appName !== "Argument Parser") {
      commandNameToSuggest = this.#appName;
    } else if (
      typeof process !== "undefined" &&
      process.argv &&
      process.argv[1]
    ) {
      try {
        commandNameToSuggest = path.basename(process.argv[1]);
      } catch {}
    }

    const commandPath = [
      commandNameToSuggest,
      ...(error.commandChain || []),
    ].join(" ");

    console.error(`\n${chalk.red.bold("Error:")} ${error.message}`);
    console.error(
      `\n${chalk.dim(`Try '${commandPath} --help' for usage details.`)}`,
    );

    if (typeof process === "object" && typeof process.exit === "function") {
      process.exit(1 as never);
    } else {
      throw error;
    }
  }

  #_printRecursiveToConsole(
    parser: ArgParser,
    level: number,
    visited: Set<ArgParser> = new Set(),
  ): void {
    const indent = "  ".repeat(level);
    const subIndent = "  ".repeat(level + 1);
    const flagIndent = "  ".repeat(level + 2);

    console.log(
      `${indent}Parser: ${chalk.blueBright(parser.#subCommandName || parser.#appName)}`,
    );
    if (parser.#description) {
      console.log(`${subIndent}Description: ${parser.#description}`);
    }
    console.log(`${subIndent}Options:`);
    console.log(`${flagIndent}appName: ${parser.#appName}`);
    console.log(
      `${flagIndent}appCommandName: ${parser.#appCommandName ?? chalk.dim("undefined")}`,
    );
    console.log(`${flagIndent}handleErrors: ${parser.#handleErrors}`);
    console.log(
      `${flagIndent}throwForDuplicateFlags: ${parser.#throwForDuplicateFlags}`,
    );
    console.log(
      `${flagIndent}inheritParentFlags: ${parser.#inheritParentFlags}`,
    );
    console.log(`${flagIndent}Handler Defined: ${!!parser.#handler}`);
    console.log(
      `${subIndent}Internal Params: ${JSON.stringify(parser.#parameters)}`,
    );

    const flags = parser.#flagManager.flags;
    if (flags.length > 0) {
      console.log(`${subIndent}Flags (${flags.length}):`);
      flags.forEach((flag: ProcessedFlag) => {
        console.log(`${flagIndent}* ${chalk.green(flag["name"])}:`);
        console.log(`${flagIndent}  Options: ${flag["options"].join(", ")}`);
        console.log(
          `${flagIndent}  Description: ${Array.isArray(flag["description"]) ? flag["description"].join(" | ") : flag["description"]}`,
        );
        console.log(
          `${flagIndent}  Type: ${typeof flag["type"] === "function" ? flag["type"].name || "custom function" : flag["type"]}`,
        );
        console.log(
          `${flagIndent}  Mandatory: ${typeof flag["mandatory"] === "function" ? "dynamic" : (flag["mandatory"] ?? false)}`,
        );
        console.log(
          `${flagIndent}  Default: ${JSON.stringify(flag["defaultValue"])}`,
        );
        console.log(`${flagIndent}  Flag Only: ${flag["flagOnly"]}`);
        console.log(`${flagIndent}  Allow Multiple: ${flag["allowMultiple"]}`);
        console.log(`${flagIndent}  Allow Ligature: ${flag["allowLigature"]}`);
        console.log(
          `${flagIndent}  Enum: ${flag["enum"] && flag["enum"].length > 0 ? flag["enum"].join(", ") : "none"}`,
        );
        console.log(`${flagIndent}  Validator Defined: ${!!flag["validate"]}`);
      });
    } else {
      console.log(`${subIndent}Flags: ${chalk.dim("none")}`);
    }

    const subCommandParsers = Array.from(parser.#subCommands.values());
    if (subCommandParsers.length > 0) {
      console.log(`${subIndent}Sub-Commands (${subCommandParsers.length}):`);
      subCommandParsers.forEach((subCommand: any) => {
        this.#_printRecursiveToConsole(subCommand.parser, level + 1, visited);
      });
    } else {
      console.log(`${subIndent}Sub-Commands: ${chalk.dim("none")}`);
    }
  }

  #_buildRecursiveString(
    parser: ArgParser,
    level: number,
    visited = new Set<ArgParser>(),
  ): string {
    // Add visited set
    if (visited.has(parser)) return ""; // Prevent infinite loops for circular structures (if ever possible)
    visited.add(parser);

    let output = "";
    const indent = "  ".repeat(level);
    const subIndent = "  ".repeat(level + 1);
    const flagIndent = "  ".repeat(level + 2);

    const addLine = (line: string) => {
      output += line + "\\n";
    };

    addLine(
      `${indent}Parser: ${parser.#subCommandName || parser.#appName}`, // #appName is guaranteed
    );
    if (parser.#description) {
      addLine(`${subIndent}Description: ${parser.#description}`);
    }
    addLine(`${subIndent}Options:`);
    addLine(`${flagIndent}appName: ${parser.#appName}`);
    addLine(
      `${flagIndent}appCommandName: ${parser.#appCommandName ?? "undefined"}`,
    );
    addLine(`${flagIndent}handleErrors: ${parser.#handleErrors}`);
    addLine(
      `${flagIndent}throwForDuplicateFlags: ${parser.#throwForDuplicateFlags}`,
    );
    addLine(`${flagIndent}inheritParentFlags: ${parser.#inheritParentFlags}`);
    addLine(`${flagIndent}Handler Defined: ${!!parser.#handler}`);
    addLine(
      `${subIndent}Internal Params: ${JSON.stringify(parser.#parameters)}`,
    );

    const flags = parser.#flagManager.flags;
    if (flags.length > 0) {
      addLine(`${subIndent}Flags (${flags.length}):`);
      flags.forEach((flag: ProcessedFlag) => {
        addLine(`${flagIndent}* ${flag["name"]}:`);
        addLine(`${flagIndent}  Options: ${flag["options"].join(", ")}`);
        addLine(
          `${flagIndent}  Description: ${Array.isArray(flag["description"]) ? flag["description"].join(" | ") : flag["description"]}`,
        );
        let typeName = "unknown";
        if (typeof flag["type"] === "function") {
          typeName = flag["type"].name || "custom function";
        } else if (typeof flag["type"] === "string") {
          typeName = flag["type"];
        } else if (typeof flag["type"] === "object" && flag["type"]) {
          try {
            typeName = (flag["type"] as any).constructor?.name || "object";
          } catch {
            typeName = "object";
          }
        }
        addLine(`${flagIndent}  Type: ${typeName}`);
        addLine(
          `${flagIndent}  Mandatory: ${typeof flag["mandatory"] === "function" ? "dynamic" : (flag["mandatory"] ?? false)}`,
        );
        addLine(
          `${flagIndent}  Default: ${JSON.stringify(flag["defaultValue"])}`,
        );
        addLine(`${flagIndent}  Flag Only: ${flag["flagOnly"]}`);
        addLine(`${flagIndent}  Allow Multiple: ${flag["allowMultiple"]}`);
        addLine(`${flagIndent}  Allow Ligature: ${flag["allowLigature"]}`);
        addLine(
          `${flagIndent}  Enum: ${flag["enum"] && flag["enum"].length > 0 ? flag["enum"].join(", ") : "none"}`,
        );
        addLine(`${flagIndent}  Validator Defined: ${!!flag["validate"]}`);
      });
    } else {
      addLine(`${subIndent}Flags: none`);
    }

    const subCommandParsers = Array.from(parser.#subCommands.values());
    if (subCommandParsers.length > 0) {
      addLine(`${subIndent}Sub-Commands (${subCommandParsers.length}):`);
      subCommandParsers.forEach((subCommand: any) => {
        output += this.#_buildRecursiveString(
          subCommand.parser,
          level + 1,
          visited,
        );
      });
    } else {
      addLine(`${subIndent}Sub-Commands: none`);
    }
    return output;
  }

  #_buildRecursiveJson(
    parser: ArgParser,
    visited = new Set<ArgParser>(),
  ): object {
    if (visited.has(parser))
      return {
        note: `Reference to already processed parser: ${parser.#subCommandName || parser.#appName}`,
      };
    visited.add(parser);

    const config: any = {
      parserName: parser.#subCommandName || parser.#appName, // #appName is guaranteed
      description: parser.#description,
      options: {
        appName: parser.#appName,
        appCommandName: parser.#appCommandName ?? undefined,
        handleErrors: parser.#handleErrors,
        throwForDuplicateFlags: parser.#throwForDuplicateFlags,
        inheritParentFlags: parser.#inheritParentFlags,
      },
      handlerDefined: !!parser.#handler,
      internalParams: parser.#parameters,
      flags: [],
      subCommands: {}, // Will be an object where keys are sub-command names
    };

    const flags = parser.#flagManager.flags;
    config.flags = flags.map((flag: ProcessedFlag) => {
      let typeName = "unknown";
      if (typeof flag["type"] === "function") {
        typeName = flag["type"].name || "custom function";
      } else if (typeof flag["type"] === "string") {
        typeName = flag["type"];
      } else if (typeof flag["type"] === "object" && flag["type"]) {
        try {
          typeName = (flag["type"] as any).constructor?.name || "object";
        } catch {
          typeName = "object";
        }
      }

      return {
        name: flag["name"],
        options: flag["options"],
        description: flag["description"],
        type: typeName,
        mandatory:
          typeof flag["mandatory"] === "function"
            ? "dynamic"
            : (flag["mandatory"] ?? false),
        defaultValue: flag["defaultValue"],
        flagOnly: flag["flagOnly"],
        allowMultiple: flag["allowMultiple"],
        allowLigature: flag["allowLigature"],
        enum: flag["enum"],
        validatorDefined: !!flag["validate"],
      };
    });

    const subCommands = Array.from(parser.#subCommands.values());
    if (subCommands.length > 0) {
      subCommands.forEach((sub: any) => {
        config.subCommands[sub.name] = this.#_buildRecursiveJson(
          sub.parser,
          visited,
        );
      });
    }

    return config;
  }
}
