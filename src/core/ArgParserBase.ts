import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { anyOf, char, createRegExp, oneOrMore } from "magic-regexp";
import chalk from "@alcyone-labs/simple-chalk";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { DxtGenerator } from "../dxt/DxtGenerator";
import {
  McpNotificationsManager,
  type McpChangeType,
} from "../mcp/mcp-notifications.js";
import { McpPromptsManager, type McpPromptConfig } from "../mcp/mcp-prompts.js";
import {
  McpResourcesManager,
  type McpResourceConfig,
} from "../mcp/mcp-resources.js";
import { debug } from "../utils/debug-utils";
import { FlagManager } from "./FlagManager";
import { resolveLogPath } from "./log-path-utils";
import type {
  IFlag,
  IHandlerContext,
  ISubCommand,
  ParseResult,
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

export interface IArgParserParams<THandlerReturn = any> {
  /**
   * This is the display name of the app, used in help text
   */
  appName?: string;
  subCommands?: ISubCommand[];
  handler?: (
    ctx: IHandlerContext<any, any>,
  ) => THandlerReturn | Promise<THandlerReturn>;

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
   * Whether to automatically call process.exit() based on ParseResult.
   * When true (default), maintains backward compatibility with CLI behavior.
   * When false, returns ParseResult objects for programmatic use.
   * @default true
   */
  autoExit?: boolean;
  /**
   * The command name to display in help suggestions (e.g., 'dabl').
   * If not provided, it falls back to guessing from the script path.
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

export interface IParseOptions {
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
  /**
   * When true (default), automatically awaits async handlers before returning.
   * When false, returns immediately with _asyncHandlerPromise for manual handling.
   * @default true
   */
  deep?: boolean;
  /**
   * When true, indicates this is being called from MCP mode
   * @default false
   * @internal
   */
  isMcp?: boolean;
  /**
   * Internal: when true, this parse call is only for dynamic flag preloading for help
   * Suppresses side effects and handler execution
   * @internal
   */
  dynamicHelpPreload?: boolean;
  /**
   * When true, automatically executes the CLI if the script is being run directly (not imported).
   * When false, disables auto-execution detection even if importMetaUrl is provided.
   * Uses robust detection that works across different environments and sandboxes.
   * Only takes effect when importMetaUrl is also provided.
   * @default true (when importMetaUrl is provided)
   */
  autoExecute?: boolean;
  /**
   * The import.meta.url from the calling script, required for reliable auto-execution detection.
   * Only used when autoExecute is true.
   */
  importMetaUrl?: string;
}

type TParsedArgsWithRouting<T = any> = T & {
  $commandChain?: string[];
  handlerToExecute?: { handler: Function; context: IHandlerContext };
};

type RecursiveParseResult = {
  finalArgs: TParsedArgsWithRouting<any>;
  handlerToExecute?: { handler: Function; context: IHandlerContext };
};

export class ArgParserBase<THandlerReturn = any> {
  #appName: string = "Argument Parser";
  #appCommandName?: string;
  #subCommandName: string = "";
  #parameters: IArgParserParams<THandlerReturn> = {
    extraNewLine: true,
    wrapAtWidth: 50,
    blankSpaceWidth: 30,
    mandatoryCharacter: "*",
  };
  #handler?: (ctx: IHandlerContext) => void;
  #throwForDuplicateFlags: boolean = false;
  #description?: string;
  #handleErrors: boolean = true;
  #autoExit: boolean = true;
  #parentParser?: ArgParserBase;
  #lastParseResult: TParsedArgs<ProcessedFlag[]> = {};
  #inheritParentFlags: boolean = false;
  #subCommands: Map<string, ISubCommand> = new Map();
  #flagManager: FlagManager;
  #dxtGenerator: DxtGenerator;
  #configurationManager: ConfigurationManager;
  #fuzzyMode: boolean = false;

  // Track dynamically added flags so we can clean them between parses
  #dynamicFlagNames: Set<string> = new Set();

  // MCP-related managers
  #mcpResourcesManager: McpResourcesManager = new McpResourcesManager();
  #mcpPromptsManager: McpPromptsManager = new McpPromptsManager();
  #mcpNotificationsManager: McpNotificationsManager =
    new McpNotificationsManager();

  constructor(
    options: IArgParserParams<THandlerReturn> = {},
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
    this.#autoExit = options.autoExit ?? true;
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

    // Initialize DXT generator
    this.#dxtGenerator = new DxtGenerator(this);

    // Initialize Configuration manager
    this.#configurationManager = new ConfigurationManager(this);

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
    return this.#flagManager.flagNames;
  }

  public getAppName(): string | undefined {
    return this.#appName;
  }

  public getAppCommandName(): string | undefined {
    return this.#appCommandName;
  }

  public getSubCommandName(): string {
    return this.#subCommandName;
  }

  public getDescription(): string | undefined {
    return this.#description;
  }

  public getAutoExit(): boolean {
    return this.#autoExit;
  }

  /**
   * Helper method to handle exit logic based on autoExit setting
   * Returns a ParseResult instead of calling process.exit() when autoExit is false
   */
  private _handleExit(
    exitCode: number,
    message?: string,
    type?: ParseResult["type"],
    data?: any,
  ): ParseResult | never {
    const result: ParseResult = {
      success: exitCode === 0,
      exitCode,
      message,
      type: type || (exitCode === 0 ? "success" : "error"),
      shouldExit: true,
      data,
    };

    if (
      this.#autoExit &&
      typeof process === "object" &&
      typeof process.exit === "function"
    ) {
      process.exit(exitCode as never);
    }

    return result;
  }

  public getHandler(): ((ctx: IHandlerContext) => void) | undefined {
    return this.#handler;
  }

  public getSubCommands(): Map<string, ISubCommand> {
    return this.#subCommands;
  }

  private async _addToOutput(
    flag: ProcessedFlag, // Changed from Flags[number]
    arg: any,
    output: TParsedArgs<ProcessedFlag[]>,
    _parseOptions?: IParseOptions,
  ) {
    let value: unknown = arg;

    if (flag["type"] === Boolean) {
      if (typeof arg === "boolean") {
        value = arg;
      } else if (typeof arg === "string") {
        value = /(true|yes|1)/i.test(arg);
      } else {
        value = new (flag["type"] as ObjectConstructor)(value);
      }
    } else if (typeof flag["type"] === "function") {
      const result = (flag["type"] as Function)(value as string);
      // Handle both sync and async custom parser functions
      value =
        result && typeof result.then === "function" ? await result : result;
    } else if (typeof flag["type"] === "object") {
      // Check if it's a Zod schema
      if (flag["type"] && (flag["type"] as any)._def) {
        // It's a Zod schema - parse JSON and validate
        try {
          const parsedJson =
            typeof value === "string" ? JSON.parse(value as string) : value;
          value = (flag["type"] as any).parse(parsedJson);
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new Error(
              `Invalid JSON for flag '${flag["name"]}': ${error.message}`,
            );
          } else {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            throw new Error(
              `Validation failed for flag '${flag["name"]}': ${errorMessage}`,
            );
          }
        }
      } else {
        // Regular object constructor
        value = new (flag["type"] as ObjectConstructor)(value);
      }
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

  // Register flags coming from dynamic loaders and track them for cleanup
  #registerDynamicFlags(flags: readonly IFlag[]): void {
    if (!Array.isArray(flags) || flags.length === 0) return;
    for (const flag of flags) {
      const name = (flag as any)["name"] as string;
      const existed = this.#flagManager.hasFlag(name);
      this.#flagManager.addFlag(flag);
      if (!existed) this.#dynamicFlagNames.add(name);
    }
  }

  // Remove dynamically registered flags on this parser and all sub-parsers
  #resetDynamicFlagsRecursive(parser: ArgParserBase = this): void {
    for (const name of parser.#dynamicFlagNames) {
      parser.#flagManager.removeFlag(name);
    }
    parser.#dynamicFlagNames.clear();
    for (const [, sub] of parser.#subCommands) {
      if (sub && sub.parser instanceof ArgParserBase) {
        sub.parser.#resetDynamicFlagsRecursive();
      }
    }
  }

  // Preload dynamic flags for help display without executing handlers
  async #_preloadDynamicFlagsForHelp(processArgs: string[]): Promise<void> {
    let currentParser: ArgParserBase = this;
    let remaining = [...processArgs];

    while (true) {
      // Find first index that matches a sub-command of currentParser
      let subIndex = -1;
      for (let i = 0; i < remaining.length; i++) {
        if (currentParser.#subCommands.has(remaining[i]!)) {
          subIndex = i;
          break;
        }
      }

      const segment =
        subIndex === -1 ? remaining : remaining.slice(0, subIndex);
      try {
        await currentParser.#parseFlags(segment, {
          skipHelpHandling: true,
          dynamicHelpPreload: true,
        });
      } catch {
        // ignore errors during help preloading
      }

      if (subIndex === -1) break;
      const nextName = remaining[subIndex]!;
      const sub = currentParser.#subCommands.get(nextName);
      if (!sub || !(sub.parser instanceof ArgParserBase)) break;
      currentParser = sub.parser;
      remaining = remaining.slice(subIndex + 1);
    }
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

    if (!(subParser instanceof ArgParserBase)) {
      throw new Error(
        `Parser for subcommand '${subCommandConfig.name}' is not an instance of ArgParserBase. ` +
          `Please provide 'new ArgParserBase(...)' for the 'parser' property of an ISubCommand.`,
      );
    }

    subParser.#parentParser = this;
    subParser.#subCommandName = subCommandConfig.name;
    if (!subParser.#appCommandName && this.#appCommandName) {
      subParser.#appCommandName = this.#appCommandName;
    }

    // Inherit autoExit setting from parent to ensure consistent error handling
    // across the parser hierarchy. Child parsers should follow parent's exit behavior.
    subParser.#autoExit = this.#autoExit;

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
  setHandler(
    handler: (
      ctx: IHandlerContext<any, any>,
    ) => THandlerReturn | Promise<THandlerReturn>,
  ): this {
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
    currentParser: ArgParserBase,
    commandChainSoFar: string[],
    parserChainSoFar: ArgParserBase[],
  ): {
    finalParser: ArgParserBase;
    commandChain: string[];
    parserChain: ArgParserBase[];
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
    if (
      !subCommandConfig ||
      !(subCommandConfig.parser instanceof ArgParserBase)
    ) {
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

  async #_handleGlobalChecks(
    processArgs: string[],
    options?: IParseOptions,
  ): Promise<boolean | ParseResult> {
    // Auto-help should only trigger for root parsers that are intended as main CLI entry points
    // A parser is considered a "root CLI parser" if it has appCommandName explicitly set
    // This ensures that only parsers intended as main CLI tools trigger auto-help
    const isRootCliParser = !this.#parentParser && !!this.#appCommandName;

    if (
      processArgs.length === 0 &&
      isRootCliParser &&
      !this.#handler &&
      !options?.skipHelpHandling
    ) {
      console.log(this.helpText());
      return this._handleExit(0, "Help displayed", "help");
    }

    if (processArgs.includes("--s-debug-print")) {
      this.printAll("ArgParser.full.json");
      return this._handleExit(0, "Debug information printed", "debug");
    }

    // Handle --s-enable-fuzzy system flag to enable fuzzy testing mode
    if (processArgs.includes("--s-enable-fuzzy")) {
      this.#_enableFuzzyMode();
      // Remove the flag from processArgs so it doesn't interfere with parsing
      const fuzzyIndex = processArgs.indexOf("--s-enable-fuzzy");
      processArgs.splice(fuzzyIndex, 1);
    }

    // Handle --s-with-env system flag early to modify processArgs before parsing
    const withEnvIndex = processArgs.findIndex((arg) => arg === "--s-with-env");
    if (withEnvIndex !== -1) {
      if (withEnvIndex + 1 >= processArgs.length) {
        console.error(
          chalk.red("Error: --s-with-env requires a file path argument"),
        );
        return this._handleExit(
          1,
          "--s-with-env requires a file path argument",
          "error",
        );
      }

      const filePath = processArgs[withEnvIndex + 1];
      if (!filePath || filePath.startsWith("-")) {
        console.error(
          chalk.red("Error: --s-with-env requires a file path argument"),
        );
        return this._handleExit(
          1,
          "--s-with-env requires a file path argument",
          "error",
        );
      }

      try {
        // Identify the final parser and parser chain for loading configuration
        const {
          finalParser: identifiedFinalParser,
          parserChain: identifiedParserChain,
        } = this.#_identifyCommandChainAndParsers(
          processArgs,
          this,
          [],
          [this],
        );

        const envConfigArgs =
          identifiedFinalParser.#configurationManager.loadEnvFile(
            filePath,
            identifiedParserChain,
          );
        if (envConfigArgs) {
          // Merge environment configuration with process args
          // CLI args take precedence over file configuration
          const mergedArgs =
            identifiedFinalParser.#configurationManager.mergeEnvConfigWithArgs(
              envConfigArgs,
              processArgs,
            );

          // Replace the original processArgs array contents
          processArgs.length = 0;
          processArgs.push(...mergedArgs);
        }

        // Remove the --s-with-env flag and its file path argument from processArgs
        // This must be done after merging to avoid interfering with the merge process
        const finalWithEnvIndex = processArgs.findIndex(
          (arg) => arg === "--s-with-env",
        );
        if (finalWithEnvIndex !== -1) {
          processArgs.splice(finalWithEnvIndex, 2); // Remove both --s-with-env and the file path
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error loading environment file: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        return this._handleExit(
          1,
          `Error loading environment file: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    }

    const { finalParser: identifiedFinalParser } =
      this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

    const buildDxtIndex = processArgs.findIndex(
      (arg) => (arg ?? "").toLowerCase() === "--s-build-dxt",
    );
    if (buildDxtIndex !== -1) {
      const dxtResult = await this.#_handleBuildDxtFlag(
        processArgs,
        buildDxtIndex,
      );
      if (dxtResult !== false) {
        return dxtResult === true ? true : dxtResult;
      }
    }

    // Handle --s-mcp-serve system flag to start all MCP servers
    debug.log("Checking for --s-mcp-serve flag in args:", processArgs);
    const mcpServeIndex = processArgs.findIndex(
      (arg) => arg === "--s-mcp-serve",
    );
    debug.log("mcpServeIndex:", mcpServeIndex);
    if (mcpServeIndex !== -1) {
      debug.log("Found --s-mcp-serve flag, calling handler");
      const mcpServeResult = await this.#_handleMcpServeFlag(
        processArgs,
        mcpServeIndex,
      );
      debug.log("MCP serve handler returned:", typeof mcpServeResult);
      if (mcpServeResult !== false) {
        return mcpServeResult === true ? true : mcpServeResult;
      }
    }

    if (processArgs.includes("--s-debug")) {
      console.log(
        chalk.yellow.bold("\n--- ArgParser --s-debug Runtime Context ---"),
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

      let currentParser: ArgParserBase = this;
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
        const { parsedArgs: rootParsedArgs } = await currentParser.#parseFlags(
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
            await currentParser.#parseFlags(currentLevelArgsSlice, {
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

      console.log(chalk.yellow.bold("--- End ArgParser --s-debug ---"));
      return this._handleExit(0, "Debug information displayed", "debug");
    }

    // ---- BEGIN ADDED DIAGNOSTIC LOG FOR identifiedFinalParser ----
    let parserNameForLog = "undefined_parser";
    if (identifiedFinalParser instanceof ArgParserBase) {
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
    if (!(identifiedFinalParser instanceof ArgParserBase)) {
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
        await this.#_preloadDynamicFlagsForHelp(processArgs);
        console.log(identifiedFinalParser.helpText());
        return this._handleExit(0, "Help displayed", "help");
      }
    }

    return false;
  }

  #_validateMandatoryFlags(
    finalArgs: TParsedArgsWithRouting<any>,
    parserChain: ArgParserBase[],
    commandChain: string[],
  ): void {
    const finalMandatoryFlagsMissing: {
      name: string;
      parserName: string;
      commandChain: string[];
    }[] = [];
    const checkedFlagNames = new Set<string>();

    // For both MCP and regular subcommands, use the same inheritance-based validation logic
    // Validate all parsers except the root parser when it's not the final destination
    let parsersToValidate: ArgParserBase[] = [...parserChain];

    // If there are multiple parsers and the root parser is not the final destination,
    // remove the root parser from validation (unless its flags are inherited)
    if (parserChain.length > 1) {
      const immediateChild = parserChain[1];

      // If the immediate child doesn't inherit from root, don't validate root
      if (!immediateChild.#inheritParentFlags) {
        parsersToValidate = parsersToValidate.slice(1);
      }
    }

    for (let i = 0; i < parsersToValidate.length; i++) {
      const parser = parsersToValidate[i];
      const currentCommandChain = parser.getCommandChain();

      for (const flag of parser.#flagManager.flags) {
        // Use FlagManager
        if (flag["name"] === "help" || checkedFlagNames.has(flag["name"]))
          continue;

        // Check if this flag is inherited by the immediate child
        let flagIsInheritedByChild = false;

        if (i < parsersToValidate.length - 1) {
          const immediateChild = parsersToValidate[i + 1];

          // If the immediate child inherits parent flags AND has this flag,
          // then this flag is inherited and should be validated by the child
          if (
            immediateChild.#inheritParentFlags &&
            immediateChild.#flagManager.hasFlag(flag["name"])
          ) {
            flagIsInheritedByChild = true;
          }
        }

        // Skip validation if this flag is inherited by a child (child will validate it)
        if (flagIsInheritedByChild) continue;

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
    finalParser: ArgParserBase,
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

  #_applyEnvFallback(
    finalArgs: TParsedArgsWithRouting<any>,
    finalParser: ArgParserBase,
  ): void {
    for (const flag of finalParser.#flagManager.flags) {
      const flagName = flag["name"] as string;
      
      if (!flag["env"]) continue;

      // Check if value is already set (by CLI).
      // If we move this call BEFORE defaults, then 'undefined' means truly "not set by CLI".
      if (finalArgs[flagName] !== undefined) {
          // If allowMultiple, we might append? Usually env var is just a fallback source.
          // If CLI provided check, we skip Env.
          continue; 
      }

      const envVars = Array.isArray(flag["env"]) ? flag["env"] : [flag["env"]];
      let foundVal: string | undefined;

      for (const envKey of envVars) {
        if (process.env[envKey] !== undefined) {
          foundVal = process.env[envKey];
          break; // First match wins
        }
      }

      if (foundVal !== undefined) {
        try {
          const typedVal = this.#configurationManager.convertValueToFlagType(foundVal, flag);
           if (flag["allowMultiple"]) {
             // If allowMultiple, convertValueToFlagType returns array or single.
             // We ensure it's set correctly.
              finalArgs[flagName] = Array.isArray(typedVal) ? typedVal : [typedVal];
           } else {
              finalArgs[flagName] = typedVal;
           }
        } catch (e) {
           console.warn(chalk.yellow(`Warning: Failed to parse env var for flag '${flagName}': ${e}`));
        }
      }
    }
  }

  #_syncToEnv(
     finalArgs: TParsedArgsWithRouting<any>,
     finalParser: ArgParserBase,
  ): void {
      for (const flag of finalParser.#flagManager.flags) {
          if (!flag["env"]) continue;
          
          const flagName = flag["name"];
          const value = finalArgs[flagName];
          
          if (value !== undefined) {
               const envVars = Array.isArray(flag["env"]) ? flag["env"] : [flag["env"]];
               // Convert value to string for Env
               let strVal = "";
               if (typeof value === 'object') {
                   strVal = JSON.stringify(value);
               } else {
                   strVal = String(value);
               }
               
               for (const envKey of envVars) {
                   process.env[envKey] = strVal;
               }
          }
      }
  }

  #_prepareAndExecuteHandler(
    handlerToExecute: RecursiveParseResult["handlerToExecute"],
    finalArgs: TParsedArgsWithRouting<any>,
    skipHandlers: boolean,
  ): void {
    // Skip handlers if explicitly requested, if no handler exists, or if in fuzzy mode
    if (skipHandlers || !handlerToExecute) {
      return;
    }

    // Log handler skipping in fuzzy mode for visibility
    if (this.#fuzzyMode) {
      const commandChain = handlerToExecute.context.commandChain || [];
      const args = handlerToExecute.context.args || {};

      // Try to get the original input arguments from the final args if available
      const inputArgs = (finalArgs as any)._originalInputArgs || "unknown";
      const inputArgsStr = Array.isArray(inputArgs)
        ? inputArgs.join(" ")
        : inputArgs;

      console.log(
        `[--s-enable-fuzzy] handler() skipped for command chain: ${commandChain.join(" ") || "(root)"}`,
      );
      console.log(`  Input args: [${inputArgsStr}]`);
      console.log(`  Parsed args: ${JSON.stringify(args)}`);
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

    try {
      const handlerResult = handlerToExecute.handler(handlerToExecute.context);

      // Check if result is a Promise (async handler)
      if (handlerResult && typeof handlerResult.then === "function") {
        // Store async handler info for ArgParserWithMcp to handle
        (finalArgs as any)._asyncHandlerPromise = handlerResult;
        (finalArgs as any)._asyncHandlerInfo = handlerToExecute;

        // Add a catch handler to prevent unhandled rejection warnings
        // The actual error handling will be done in parseAsync()
        handlerResult.catch(() => {
          // Silently ignore - this will be handled properly in parseAsync()
        });

        return;
      }

      (finalArgs as any).handlerResponse = handlerResult;

      // Merge handler result into final args if it's an object
      if (
        handlerResult &&
        typeof handlerResult === "object" &&
        !Array.isArray(handlerResult)
      ) {
        Object.assign(finalArgs, handlerResult);
      }
    } catch (error) {
      // For synchronous handlers, we can handle sync errors
      if (this.#handleErrors) {
        this.#displayErrorAndExit(
          new ArgParserError(`Handler error: ${error}`, []),
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Detects if the current script is being executed directly (not imported)
   * Uses a robust method that works across different environments and sandboxes
   * @param importMetaUrl The import.meta.url from the calling script (optional)
   * @returns true if the script is being executed directly, false if imported
   */
  private static isExecutedDirectly(importMetaUrl?: string): boolean {
    try {
      // Use import.meta.url if provided (most reliable for ES modules)
      if (importMetaUrl) {
        const currentFile = fileURLToPath(importMetaUrl);
        const executedFile = path.resolve(process.argv[1]);
        return currentFile === executedFile;
      }

      // Fallback
      if (typeof process !== "undefined" && process.argv && process.argv[1]) {
        // Conservative approach
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  async parse(
    processArgs?: string[],
    options?: IParseOptions,
  ): Promise<TParsedArgsWithRouting<any> | ParseResult> {
    debug.log("ArgParserBase.parse() called with args:", processArgs);

    // Handle auto-execution: only run if script is executed directly (not imported)
    // Default to true unless explicitly disabled, but only when importMetaUrl is provided
    const shouldCheckAutoExecution =
      options?.importMetaUrl && options?.autoExecute !== false;
    if (shouldCheckAutoExecution) {
      const isDirectExecution = ArgParserBase.isExecutedDirectly(
        options.importMetaUrl,
      );
      if (!isDirectExecution) {
        // Script is being imported, not executed directly - return early without parsing
        debug.log(
          "Auto-execution enabled but script is imported, skipping execution",
        );
        return {} as TParsedArgsWithRouting<any>;
      }
    }

    // Handle automatic argument detection when no arguments provided
    if (processArgs === undefined) {
      // Check if we're in a Node.js environment
      if (
        typeof process !== "undefined" &&
        process.argv &&
        Array.isArray(process.argv)
      ) {
        processArgs = process.argv.slice(2);
      } else {
        // Not in Node.js environment, throw an error
        throw new Error(
          "parse() called without arguments in non-Node.js environment. " +
            "Please provide arguments explicitly: parse(['--flag', 'value'])",
        );
      }
    }

    // Reset dynamically registered flags before each parse to avoid accumulation
    this.#resetDynamicFlagsRecursive();

    // Store original args for fuzzy mode logging
    const originalProcessArgs = [...processArgs];

    // Check if fuzzy mode is enabled (global fuzzy mode detection)
    // This allows automatic prevention of parse() execution without requiring boilerplate
    // Prevent execution if:
    // 1. ARGPARSER_FUZZY_MODE environment variable is set (during fuzzy test imports)
    // 2. OR --s-enable-fuzzy is in process.argv but not in current processArgs (global fuzzy testing)
    // 3. AND skipHelpHandling is not true (not a programmatic call from fuzzy tester)
    const shouldPreventExecution =
      typeof process !== "undefined" &&
      (process.env["ARGPARSER_FUZZY_MODE"] === "true" ||
        (process.argv &&
          process.argv.includes("--s-enable-fuzzy") &&
          !processArgs.includes("--s-enable-fuzzy"))) &&
      !options?.skipHelpHandling;

    if (shouldPreventExecution) {
      // Return a minimal result that indicates fuzzy mode prevented execution
      return {
        _fuzzyModePreventedExecution: true,
        _originalInputArgs: originalProcessArgs,
      } as TParsedArgsWithRouting<any>;
    }

    const globalCheckResult = await this.#_handleGlobalChecks(
      processArgs,
      options,
    );
    if (globalCheckResult !== false) {
      // If it's a ParseResult, return it; otherwise return empty object for backward compatibility
      return globalCheckResult === true
        ? ({} as TParsedArgsWithRouting<any>)
        : globalCheckResult;
    }

    try {
      const {
        finalParser: identifiedFinalParser,
        commandChain: identifiedCommandChain,
        parserChain: identifiedParserChain,
      } = this.#_identifyCommandChainAndParsers(processArgs, this, [], [this]);

      const saveToEnvResult = identifiedFinalParser.#_handleSaveToEnvFlag(
        processArgs,
        identifiedParserChain,
      );
      if (saveToEnvResult !== false) {
        return saveToEnvResult === true
          ? ({} as TParsedArgsWithRouting<any>)
          : saveToEnvResult;
      }

      const { finalArgs, handlerToExecute } = await this._parseRecursive(
        processArgs,
        this,
        {},
        [],
        options,
        undefined,
      );

      if (identifiedCommandChain.length > 0) {
        (finalArgs as any).$commandChain = identifiedCommandChain;
      }

      // Store original args for fuzzy mode logging
      if (this.#fuzzyMode) {
        (finalArgs as any)._originalInputArgs = originalProcessArgs;
      }

      // Skip mandatory flag validation in fuzzy mode
      if (!this.#fuzzyMode) {
        this.#_validateMandatoryFlags(
          finalArgs,
          identifiedParserChain,
          identifiedCommandChain,
        );
      }

      this.#_applyDefaultValues(finalArgs, identifiedFinalParser);

      this.#_prepareAndExecuteHandler(
        handlerToExecute,
        finalArgs,
        options?.skipHandlers ?? false,
      );

      // Handle deep option for async handlers (default: true)
      const shouldAwaitHandlers = options?.deep !== false;
      if (shouldAwaitHandlers && (finalArgs as any)._asyncHandlerPromise) {
        try {
          const handlerResult = await (finalArgs as any)._asyncHandlerPromise;
          (finalArgs as any).handlerResponse = handlerResult;

          // Merge handler result into final args if it's an object
          if (
            handlerResult &&
            typeof handlerResult === "object" &&
            !Array.isArray(handlerResult)
          ) {
            Object.assign(finalArgs, handlerResult);
          }

          // Clean up the async handler info since we've awaited it
          delete (finalArgs as any)._asyncHandlerPromise;
          delete (finalArgs as any)._asyncHandlerInfo;
        } catch (error) {
          // Handle async handler errors - respect the handleErrors setting
          if (this.#handleErrors) {
            this.#displayErrorAndExit(
              new ArgParserError(`Handler error: ${error}`, []),
            );
          } else {
            throw error;
          }
        }
      }

      return finalArgs;
    } catch (error) {
      if (error instanceof ArgParserError) {
        if (this.#handleErrors) {
          const errorResult = this.#displayErrorAndExit(error);
          // If autoExit is false, return the ParseResult; otherwise return empty object
          return this.#autoExit
            ? ({} as TParsedArgsWithRouting<any>)
            : errorResult;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Alias for parse() method for backward compatibility
   * Since parse() is already async, this just calls parse()
   *
   * @deprecated Use parse() instead. This method will be removed in a future version.
   */
  public parseAsync(
    processArgs?: string[],
    options?: IParseOptions,
  ): Promise<TParsedArgsWithRouting<any> | ParseResult> {
    return this.parse(processArgs, options);
  }

  /**
   * Recursive helper for parsing arguments and handling sub-commands.
   * This method assumes the global help check has already been performed in `parse`.
   */
  private async _parseRecursive(
    argsToParse: string[],
    currentParser: ArgParserBase,
    accumulatedParentArgs: TParsedArgs<any>,
    commandChainSoFar: string[],
    options?: IParseOptions,
    parentParser?: ArgParserBase,
  ): Promise<RecursiveParseResult> {
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
      await currentParser.#parseFlags(argsForCurrentLevel, options);

    // Apply environment variables fallback
    // Priority: CLI Flag > Env Var > Default Value
    // This runs after CLI flags are parsed (so CLI wins if present)
    // But BEFORE default values (so Env wins over Default)
    this.#_applyEnvFallback(currentLevelArgs, currentParser);

    // Apply default values for the current parser's flags to its args
    currentParser.#_applyDefaultValues(currentLevelArgs, currentParser);

    // Sync resolved values back to environment variables if configured
    this.#_syncToEnv(currentLevelArgs, currentParser);

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
            parentParser: parentParser,
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
    if (
      !subCommandConfig ||
      !(subCommandConfig.parser instanceof ArgParserBase)
    ) {
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

    return await this._parseRecursive(
      nextArgs,
      nextParser,
      combinedArgsForNextLevel,
      nextCommandChain,
      options,
      currentParser,
    );
  }

  async #parseFlags(
    args: string[],
    options?: IParseOptions,
  ): Promise<{
    parsedArgs: TParsedArgs<ProcessedFlag[]>;
    firstUnconsumedIndex: number;
  }> {
    let flags = this.#flagManager.flags;

    // Dynamic pre-pass: run loaders first to register new flags
    const dynamicCandidates = flags.filter(
      (f: any) => typeof (f as any)["dynamicRegister"] === "function",
    );
    if (dynamicCandidates.length > 0) {
      const loaderOutput: TParsedArgs<ProcessedFlag[]> = Object.fromEntries(
        dynamicCandidates.map((f) => [
          f["name"],
          f["allowMultiple"] ? [] : undefined,
        ]),
      ) as TParsedArgs<ProcessedFlag[]>;
      const tmpConsumed = new Set<number>();

      // Ligature pre-pass
      for (const flagToCheck of dynamicCandidates) {
        if (flagToCheck["allowLigature"] && !flagToCheck["flagOnly"]) {
          const regex = createRegExp(
            anyOf(
              ...flagToCheck["options"].map((option: string) => `${option}=`),
            ),
            oneOrMore(char).groupedAs("arg"),
          );
          for (let i = 0; i < args.length; i++) {
            if (tmpConsumed.has(i)) continue;
            const matches = regex.exec(`${args[i]}`);
            if (matches?.groups?.["arg"]) {
              await this._addToOutput(
                flagToCheck,
                matches.groups["arg"],
                loaderOutput,
                options,
              );
              tmpConsumed.add(i);
              if (!flagToCheck["allowMultiple"]) break;
            }
          }
        }
      }

      // Split pre-pass
      for (const flagToCheck of dynamicCandidates) {
        for (let index = 0; index < args.length; index++) {
          if (tmpConsumed.has(index)) continue;
          const value = args[index];
          const nextIndex = index + 1;
          const nextValueExists = nextIndex < args.length;
          const nextValue = nextValueExists ? args[nextIndex] : undefined;
          const nextValueIsFlag =
            typeof nextValue === "string" && nextValue.startsWith("-");
          if (flagToCheck["options"].includes(value)) {
            tmpConsumed.add(index);
            if (flagToCheck["flagOnly"]) {
              await this._addToOutput(flagToCheck, true, loaderOutput, options);
            } else if (nextValueExists && !nextValueIsFlag) {
              await this._addToOutput(
                flagToCheck,
                nextValue,
                loaderOutput,
                options,
              );
              tmpConsumed.add(nextIndex);
            } else if (flagToCheck["type"] === Boolean) {
              await this._addToOutput(flagToCheck, true, loaderOutput, options);
            }
            if (!flagToCheck["allowMultiple"]) break;
          }
        }
      }

      // Invoke dynamicRegister per candidate
      for (const flagToCheck of dynamicCandidates) {
        const val = (loaderOutput as any)[flagToCheck["name"]];
        const hasValue = flagToCheck["allowMultiple"]
          ? Array.isArray(val) && val.length > 0
          : val !== undefined;
        if (!hasValue) continue;

        const registerFlags = (newFlags: readonly IFlag[]) => {
          if (Array.isArray(newFlags) && newFlags.length) {
            this.#registerDynamicFlags(newFlags);
          }
        };

        const dyn = (flagToCheck as any)["dynamicRegister"];
        if (typeof dyn === "function") {
          const maybe = dyn({
            value: val,
            argsSoFar: loaderOutput,
            parser: this,
            processArgs: args,
            forHelp: !!options?.dynamicHelpPreload,
            registerFlags,
          });
          const awaited =
            maybe && typeof (maybe as any).then === "function"
              ? await maybe
              : maybe;
          if (Array.isArray(awaited)) registerFlags(awaited);
        }
      }

      // Refresh flags after dynamic registration
      flags = this.#flagManager.flags;
    }

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
            await this._addToOutput(
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
            await this._addToOutput(flagToCheck, true, output, options);
          } else if (nextValueExists && !nextValueIsFlag) {
            await this._addToOutput(flagToCheck, nextValue, output, options);
            consumedIndices.add(nextIndex);
          } else if (flagToCheck["type"] === Boolean) {
            await this._addToOutput(flagToCheck, true, output, options);
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
    let current: ArgParserBase | undefined = this;
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
          if (!(actualSubParserInstance instanceof ArgParserBase)) {
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
            .slice() // Create a copy before sorting (toSorted only supported by Node 20+)
            .sort((a: string, b: string) => a.length - b.length) // Sort by length (shortest first)
            .map((opt: string) => green(opt))
            .join(", ");
          const isMandatory =
            typeof flag.mandatory === "function" ? "dynamic" : flag.mandatory;
          const mandatoryIndicator =
            isMandatory === true
              ? ` ${red(this.#parameters.mandatoryCharacter || "*")}`
              : isMandatory === "dynamic"
                ? ` ${dim("(conditionally mandatory)")}`
                : "";

          const descriptionLines = Array.isArray(flag["description"])
            ? flag["description"]
            : [flag["description"]];

          const metaLines: string[] = [];

          // Determine the type name for display
          let typeName = "unknown";
          let typeDetails: string[] = [];

          if (
            flag["type"] &&
            typeof flag["type"] === "object" &&
            (flag["type"] as any)._def
          ) {
            // It's a Zod schema - show JSON object with structure
            typeName = "JSON object";
            try {
              // Try to generate a simple structure preview
              const zodSchema = flag["type"] as any;
              const def = zodSchema._def;

              // In Zod v4, check for object shape directly (typeName might be undefined)
              if (def.shape) {
                const shape =
                  typeof def.shape === "function" ? def.shape() : def.shape;
                const properties = Object.keys(shape);
                if (properties.length > 0) {
                  if (properties.length <= 4) {
                    typeDetails.push(`Properties: ${properties.join(", ")}`);
                  } else {
                    typeDetails.push(
                      `Properties: ${properties.slice(0, 4).join(", ")}, ... (${properties.length} total)`,
                    );
                  }
                }
              }

              // Add a hint about JSON format
              typeDetails.push("Expected: JSON string");
            } catch (error) {
              // Fallback if schema introspection fails
              typeDetails.push("Expected: JSON string");
            }
          } else if (typeof flag["type"] === "function") {
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

          // Usage/example hints. If repeatable, show repeat syntax; otherwise show single value.
          {
            let isRepeatable = false;
            try {
              if (
                typeof flag["type"] === "function" &&
                flag["type"].name === "Array"
              ) {
                isRepeatable = true;
              }
              const anyType: any = flag["type"] as any;
              if (
                anyType &&
                typeof anyType === "object" &&
                anyType._def &&
                anyType._def.typeName === "ZodArray"
              ) {
                isRepeatable = true;
              }
              if (flag["allowMultiple"]) isRepeatable = true;
            } catch {}

            const primaryOpt =
              flag["options"].find((o: string) => o.startsWith("--")) ??
              flag["options"][0];
            const valueHint = (flag as any)["valueHint"] as string | undefined;

            if (!flag["flagOnly"]) {
              if (isRepeatable) {
                metaLines.push("Multiple values allowed (repeat flag)");
                const v1 = valueHint ?? "value1";
                const v2 = valueHint ?? "value2";
                metaLines.push(
                  `Example: ${primaryOpt} ${v1} ${primaryOpt} ${v2}`,
                );
              } else {
                const v = valueHint ?? "value";
                metaLines.push(`Example: ${primaryOpt} ${v}`);
              }
            }
          }

          // Add type details for Zod schemas
          if (typeDetails.length > 0) {
            metaLines.push(...typeDetails);
          }

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

  /**
   * Get flag definition by name
   * @param name Flag name
   * @returns Flag definition or undefined if not found
   */
  public getFlagDefinition(name: string): ProcessedFlag | undefined {
    return this.#flagManager.getFlag(name);
  }

  public getCommandChain(): string[] {
    const chain = [];
    let currentParser: ArgParserBase | undefined = this;
    while (currentParser && currentParser.#parentParser) {
      chain.unshift(currentParser.#subCommandName);
      currentParser = currentParser.#parentParser;
    }
    return chain;
  }

  public getLastParseResult(): TParsedArgs<ProcessedFlag[]> {
    return this.#lastParseResult;
  }

  /**
   * Enables fuzzy testing mode by disabling error handling and making flags optional
   */
  #_enableFuzzyMode(): void {
    // Enable fuzzy mode flag
    this.#fuzzyMode = true;

    // Disable error handling to allow fuzzy tester to catch errors
    this.#handleErrors = false;

    // Recursively enable fuzzy mode for all subcommand parsers
    for (const [, subCommand] of this.#subCommands) {
      if (subCommand.parser instanceof ArgParserBase) {
        subCommand.parser.#_enableFuzzyMode();
      }
    }
  }

  #displayErrorAndExit(error: ArgParserError): ParseResult | never {
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

    console.error(`\n${chalk.red.bold("Error:")} ${error.message}`);
    console.error(
      `\n${chalk.dim(`Try '${commandNameToSuggest} --help' for usage details.`)}`,
    );

    if (this.#autoExit) {
      if (typeof process === "object" && typeof process.exit === "function") {
        process.exit(1 as never);
      } else {
        throw error;
      }
    } else {
      return {
        success: false,
        exitCode: 1,
        message: error.message,
        type: "error",
        shouldExit: true,
      };
    }
  }

  #_printRecursiveToConsole(
    parser: ArgParserBase,
    level: number,
    visited: Set<ArgParserBase> = new Set(),
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
    parser: ArgParserBase,
    level: number,
    visited = new Set<ArgParserBase>(),
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
        if (
          flag["type"] &&
          typeof flag["type"] === "object" &&
          (flag["type"] as any)._def
        ) {
          typeName = "Zod schema";
        } else if (typeof flag["type"] === "function") {
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
    parser: ArgParserBase,
    visited = new Set<ArgParserBase>(),
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
      if (
        flag["type"] &&
        typeof flag["type"] === "object" &&
        (flag["type"] as any)._def
      ) {
        typeName = "Zod schema";
      } else if (typeof flag["type"] === "function") {
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

  // ===== MCP API Methods =====

  /**
   * Add an MCP resource to this parser
   */
  addMcpResource(config: McpResourceConfig): this {
    this.#mcpResourcesManager.addResource(config);
    this.#mcpNotificationsManager.notifyChange(
      "resources",
      "added",
      config.name,
    );
    return this;
  }

  /**
   * Remove an MCP resource by name
   */
  removeMcpResource(name: string): this {
    const removed = this.#mcpResourcesManager.removeResource(name);
    if (removed) {
      this.#mcpNotificationsManager.notifyChange("resources", "removed", name);
    }
    return this;
  }

  /**
   * Get all registered MCP resources
   */
  getMcpResources(): McpResourceConfig[] {
    return this.#mcpResourcesManager.getResources();
  }

  /**
   * Add an MCP prompt to this parser
   */
  addMcpPrompt(config: McpPromptConfig): this {
    this.#mcpPromptsManager.addPrompt(config);
    this.#mcpNotificationsManager.notifyChange("prompts", "added", config.name);
    return this;
  }

  /**
   * Remove an MCP prompt by name
   */
  removeMcpPrompt(name: string): this {
    const removed = this.#mcpPromptsManager.removePrompt(name);
    if (removed) {
      this.#mcpNotificationsManager.notifyChange("prompts", "removed", name);
    }
    return this;
  }

  /**
   * Get all registered MCP prompts
   */
  getMcpPrompts(): McpPromptConfig[] {
    return this.#mcpPromptsManager.getPrompts();
  }

  /**
   * Add a change listener for MCP entities
   */
  onMcpChange(
    listener: (event: {
      type: McpChangeType;
      action: string;
      entityName?: string;
    }) => void,
  ): this {
    this.#mcpNotificationsManager.addGlobalListener(listener);
    return this;
  }

  /**
   * Remove a change listener for MCP entities
   */
  offMcpChange(
    listener: (event: {
      type: McpChangeType;
      action: string;
      entityName?: string;
    }) => void,
  ): this {
    this.#mcpNotificationsManager.removeGlobalListener(listener);
    return this;
  }

  /**
   * Get the MCP notifications manager (for advanced usage)
   */
  getMcpNotificationsManager(): McpNotificationsManager {
    return this.#mcpNotificationsManager;
  }

  /**
   * Get the MCP resources manager (for advanced usage)
   */
  getMcpResourcesManager(): McpResourcesManager {
    return this.#mcpResourcesManager;
  }

  /**
   * Get the MCP prompts manager (for advanced usage)
   */
  getMcpPromptsManager(): McpPromptsManager {
    return this.#mcpPromptsManager;
  }

  /**
   * Handles the --s-save-to-env system flag at the final parser level
   */
  #_handleSaveToEnvFlag(
    processArgs: string[],
    parserChain: ArgParserBase[],
  ): boolean | ParseResult {
    try {
      const result = this.#configurationManager.handleSaveToEnvFlag(
        processArgs,
        parserChain,
      );
      if (result) {
        // Configuration was saved successfully
        return this._handleExit(
          0,
          "Configuration saved successfully",
          "success",
        );
      }
      return result;
    } catch (error) {
      // Configuration save failed
      return this._handleExit(
        1,
        error instanceof Error ? error.message : String(error),
        "error",
      );
    }
  }

  /**
   * Handles the --s-build-dxt system flag to generate DXT packages for MCP servers
   */
  async #_handleBuildDxtFlag(
    processArgs: string[],
    buildDxtIndex: number,
  ): Promise<boolean | ParseResult> {
    return await this.#dxtGenerator.handleBuildDxtFlag(
      processArgs,
      buildDxtIndex,
    );
  }

  /**
   * Handles the --s-mcp-serve system flag to start all MCP servers
   */
  async #_handleMcpServeFlag(
    processArgs: string[],
    _mcpServeIndex: number,
  ): Promise<boolean | ParseResult> {
    debug.log("#_handleMcpServeFlag started");
    // Parse transport options from command line arguments first to get log path
    const transportOptions = this.#_parseMcpTransportOptions(processArgs);
    debug.log("Transport options parsed:", JSON.stringify(transportOptions));

    // Get MCP server configuration early to access programmatic logPath
    const mcpServerConfig = this.#_getMcpServerConfiguration();
    debug.log("Got MCP server config:", JSON.stringify(mcpServerConfig));

    // Determine log path: CLI flag > log.logToFile > logPath > default
    const effectiveLogPath =
      transportOptions.logPath ||
      (mcpServerConfig?.log && typeof mcpServerConfig.log === "object"
        ? mcpServerConfig.log.logToFile
        : null) ||
      mcpServerConfig?.logPath ||
      "./logs/mcp.log";
    debug.log("Effective log path:", effectiveLogPath);
    const resolvedLogPath = resolveLogPath(effectiveLogPath);
    debug.log("Resolved log path:", resolvedLogPath);

    // Setup MCP logger with console hijacking
    let mcpLogger: any;
    debug.log("About to import simple-mcp-logger");
    try {
      // Try to import simple-mcp-logger if available
      const mcpLoggerModule = await import("@alcyone-labs/simple-mcp-logger");
      debug.log("Successfully imported simple-mcp-logger");

      // Resolve logger configuration from MCP server config
      const loggerConfig = this.#_resolveLoggerConfigForServe(
        mcpServerConfig,
        resolvedLogPath,
      );

      if (typeof loggerConfig === "string") {
        mcpLogger = mcpLoggerModule.createMcpLogger("MCP Serve", loggerConfig);
      } else {
        // Use options-based API when full config is provided to honor level and mcpMode
        mcpLogger = mcpLoggerModule.createMcpLogger({
          prefix: loggerConfig.prefix || "MCP Serve",
          logToFile: loggerConfig.logToFile,
          level: loggerConfig.level,
          mcpMode: loggerConfig.mcpMode ?? true,
        });
      }

      debug.log("Created MCP logger, about to hijack console");
      // Hijack console globally to prevent STDOUT contamination in MCP mode
      (globalThis as any).console = mcpLogger;
      debug.log("Console hijacked successfully");
    } catch {
      debug.log("Failed to import simple-mcp-logger, using fallback");
      mcpLogger = {
        mcpError: (message: string) => console.error(`[MCP Serve] ${message}`),
      };
    }
    debug.log("MCP logger setup complete, starting MCP serve handler");

    try {
      mcpLogger.mcpError(
        "Starting --s-mcp-serve system flag handler - console hijacked for MCP safety",
      );

      if (!mcpServerConfig) {
        mcpLogger.mcpError(
          "No MCP server configuration found. Use withMcp() or addMcpSubCommand() to configure MCP server.",
        );
        return this._handleExit(
          1,
          "No MCP server configuration found",
          "error",
        );
      }

      mcpLogger.mcpError(
        `Found MCP server configuration: ${mcpServerConfig.serverInfo?.name || "unnamed"}`,
      );

      mcpLogger.mcpError(`Using log path: ${resolvedLogPath}`);

      mcpLogger.mcpError(
        `Transport options: ${JSON.stringify(transportOptions)}`,
      );

      // Start the unified MCP server
      try {
        debug.log("About to call #_startUnifiedMcpServer");
        mcpLogger.mcpError("Starting unified MCP server with all tools");
        await this.#_startUnifiedMcpServer(mcpServerConfig, {
          ...transportOptions,
          logPath: resolvedLogPath,
        });
        debug.log("#_startUnifiedMcpServer completed");
        mcpLogger.mcpError("Successfully started unified MCP server");
      } catch (error) {
        mcpLogger.mcpError(
          `Failed to start unified MCP server: ${error instanceof Error ? error.message : String(error)}`,
        );
        return this._handleExit(
          1,
          `Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }

      mcpLogger.mcpError(
        "MCP server started successfully, keeping process alive",
      );

      // Keep the process alive indefinitely
      return new Promise(() => {});
    } catch (error) {
      mcpLogger.mcpError(
        `Error in --s-mcp-serve handler: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        mcpLogger.mcpError(`Stack trace: ${error.stack}`);
      }
      return this._handleExit(
        1,
        `MCP serve failed: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  }

  /**
   * Resolve logger configuration for MCP serve with proper priority
   * @param mcpServerConfig MCP server configuration
   * @param resolvedLogPath Resolved log path from CLI flags and config priority
   * @returns Logger configuration object or string path
   */
  #_resolveLoggerConfigForServe(
    mcpServerConfig: any,
    resolvedLogPath: string,
  ): any {
    // Priority 1: CLI flag override (already resolved in resolvedLogPath)
    // Priority 2: New 'log' configuration from withMcp
    if (mcpServerConfig?.log) {
      if (typeof mcpServerConfig.log === "string") {
        // Simple string path - use resolved path
        return {
          prefix: "MCP Serve",
          logToFile: resolvedLogPath,
          level: "error", // Default level for backward compatibility
          mcpMode: true,
        };
      } else {
        // Full options object - merge with resolved path
        // The resolvedLogPath already includes the correct priority: CLI > log.logToFile > logPath > default
        return {
          prefix: "MCP Serve",
          level: "error", // Default level for backward compatibility
          mcpMode: true,
          ...mcpServerConfig.log,
          // Use the resolved path which respects the proper priority order
          logToFile: resolvedLogPath,
        };
      }
    }

    // Priority 3: Legacy 'logPath' configuration or CLI flag
    // (resolvedLogPath already handles this priority)
    return resolvedLogPath;
  }

  /**
   * Get MCP server configuration from withMcp() or fallback to addMcpSubCommand()
   */
  #_getMcpServerConfiguration(): any {
    // First, check if this is an ArgParser instance with withMcp() configuration
    if ((this as any).getMcpServerConfig) {
      const mcpConfig = (this as any).getMcpServerConfig();
      if (mcpConfig) {
        return mcpConfig;
      }
    }

    // Fallback: look for MCP subcommands for backward compatibility
    const mcpSubCommands = this.#_findAllMcpSubCommands();
    if (mcpSubCommands.length > 0) {
      // Use the first MCP subcommand configuration
      const firstMcpCmd = mcpSubCommands[0];
      return {
        serverInfo: firstMcpCmd.serverInfo,
        toolOptions: firstMcpCmd.toolOptions,
        // Extract transport options from subcommand if available
        defaultTransports: firstMcpCmd.subCommand.mcpOptions?.defaultTransports,
        defaultTransport: firstMcpCmd.subCommand.mcpOptions?.defaultTransport,
      };
    }

    return null;
  }

  /**
   * Start a unified MCP server with all tools from the parser
   */
  async #_startUnifiedMcpServer(
    mcpServerConfig: any,
    transportOptions: {
      transportType?: string;
      port?: number;
      host?: string;
      path?: string;
      transports?: string;
      logPath?: string;
      cors?: any;
      auth?: any;
    },
  ): Promise<void> {
    // We need to cast this to ArgParser to access MCP methods
    const mcpParser = this as any;

    if (
      !mcpParser.createMcpServer ||
      !mcpParser.startMcpServerWithTransport ||
      !mcpParser.startMcpServerWithMultipleTransports
    ) {
      throw new Error(
        "MCP server methods not available. This parser may not support MCP functionality.",
      );
    }

    const { serverInfo, toolOptions, defaultTransports, defaultTransport } =
      mcpServerConfig;

    // Determine which transport configuration to use - CLI flags take precedence over programmatic defaults
    if (transportOptions.transports) {
      // Multiple transports specified via CLI
      try {
        const transportConfigs = JSON.parse(transportOptions.transports);
        await mcpParser.startMcpServerWithMultipleTransports(
          serverInfo,
          transportConfigs,
          toolOptions,
          transportOptions.logPath,
        );
      } catch (error: any) {
        throw new Error(
          `Error parsing transports configuration: ${error.message}. Expected JSON format: '[{"type":"stdio"},{"type":"sse","port":3001}]'`,
        );
      }
    } else if (transportOptions.transportType) {
      // Single transport specified via CLI flags - takes precedence over programmatic defaults
      const transportType = transportOptions.transportType as
        | "stdio"
        | "sse"
        | "streamable-http";
      const finalTransportOptions = {
        port: transportOptions.port,
        host: transportOptions.host || "localhost",
        path: transportOptions.path || "/mcp",
        // Pass-through for streamable-http only; harmlessly ignored for others
        cors: transportOptions.cors,
        auth: transportOptions.auth,
      };

      await mcpParser.startMcpServerWithTransport(
        serverInfo,
        transportType,
        finalTransportOptions,
        toolOptions,
        transportOptions.logPath,
      );
    } else if (defaultTransports && defaultTransports.length > 0) {
      // Use preset multiple transports configuration
      await mcpParser.startMcpServerWithMultipleTransports(
        serverInfo,
        defaultTransports,
        toolOptions,
        transportOptions.logPath,
      );
    } else if (defaultTransport) {
      // Use preset single transport configuration
      await mcpParser.startMcpServerWithTransport(
        serverInfo,
        defaultTransport.type,
        {
          port: defaultTransport.port,
          host: defaultTransport.host,
          path: defaultTransport.path,
          sessionIdGenerator: defaultTransport.sessionIdGenerator,
        },
        toolOptions,
        transportOptions.logPath,
      );
    } else {
      // Default fallback to stdio when no transport configuration is provided
      await mcpParser.startMcpServerWithTransport(
        serverInfo,
        "stdio",
        {},
        toolOptions,
        transportOptions.logPath,
      );
    }
  }

  /**
   * Find all MCP subcommands in the parser tree
   */
  #_findAllMcpSubCommands(): Array<{
    subCommand: any;
    serverInfo: any;
    toolOptions: any;
  }> {
    const mcpSubCommands: Array<{
      subCommand: any;
      serverInfo: any;
      toolOptions: any;
    }> = [];

    // Check current parser's subcommands
    for (const [_name, subCommand] of this.#subCommands.entries()) {
      if (subCommand.isMcp && subCommand.mcpServerInfo) {
        mcpSubCommands.push({
          subCommand: subCommand,
          serverInfo: subCommand.mcpServerInfo,
          toolOptions: subCommand.mcpToolOptions || {},
        });
      }
    }

    // Recursively check child parsers
    for (const [_name, subCommand] of this.#subCommands.entries()) {
      if (subCommand.parser) {
        const childMcpCommands = (
          subCommand.parser as ArgParserBase
        ).#_findAllMcpSubCommands();
        mcpSubCommands.push(...childMcpCommands);
      }
    }

    return mcpSubCommands;
  }

  /**
   * Parse MCP transport options from command line arguments
   * Uses system flags (--s-mcp-*) to avoid collisions with user flags
   */
  #_parseMcpTransportOptions(processArgs: string[]): {
    transportType?: string;
    port?: number;
    host?: string;
    path?: string;
    transports?: string;
    logPath?: string;
    cors?: any;
    auth?: any;
  } {
    const options: {
      transportType?: string;
      port?: number;
      host?: string;
      path?: string;
      transports?: string;
      logPath?: string;
      cors?: any;
      auth?: any;
    } = {};

    // Look for transport-related system flags
    for (let i = 0; i < processArgs.length; i++) {
      const arg = processArgs[i];
      const nextArg = processArgs[i + 1];

      switch (arg) {
        case "--s-mcp-transport":
          if (nextArg && !nextArg.startsWith("-")) {
            options.transportType = nextArg;
            i++; // Skip next arg since we consumed it
          }
          break;
        case "--s-mcp-port":
          if (nextArg && !nextArg.startsWith("-")) {
            options.port = parseInt(nextArg, 10);
            i++; // Skip next arg since we consumed it
          }
          break;
        case "--s-mcp-host":
          if (nextArg && !nextArg.startsWith("-")) {
            options.host = nextArg;
            i++; // Skip next arg since we consumed it
          }
          break;
        case "--s-mcp-path":
          if (nextArg && !nextArg.startsWith("-")) {
            options.path = nextArg;
            i++; // Skip next arg since we consumed it
          }
          break;
        case "--s-mcp-transports":
          if (nextArg && !nextArg.startsWith("-")) {
            options.transports = nextArg;
            i++; // Skip next arg since we consumed it
          }
          break;
        case "--s-mcp-log-path":
          if (nextArg && !nextArg.startsWith("-")) {
            options.logPath = nextArg;
            i++; // Skip next arg since we consumed it
          }
          break;
        // Streamable HTTP extras (accept JSON string)
        case "--s-mcp-cors":
          if (nextArg && !nextArg.startsWith("-")) {
            try {
              options.cors = JSON.parse(nextArg);
            } catch {
              options.cors = nextArg;
            }
            i++;
          }
          break;
        case "--s-mcp-auth":
          if (nextArg && !nextArg.startsWith("-")) {
            try {
              options.auth = JSON.parse(nextArg);
            } catch {
              options.auth = nextArg;
            }
            i++;
          }
          break;
        // Backward compatibility: support old flags but with deprecation warning
        case "--transport":
        case "--port":
        case "--host":
        case "--path":
        case "--transports":
          console.warn(
            `Warning: ${arg} is deprecated. Use --s-mcp-${arg.slice(2)} instead.`,
          );
          // Fall through to handle the old flag for now
          if (arg === "--transport" && nextArg && !nextArg.startsWith("-")) {
            options.transportType = nextArg;
            i++;
          } else if (arg === "--port" && nextArg && !nextArg.startsWith("-")) {
            options.port = parseInt(nextArg, 10);
            i++;
          } else if (arg === "--host" && nextArg && !nextArg.startsWith("-")) {
            options.host = nextArg;
            i++;
          } else if (arg === "--path" && nextArg && !nextArg.startsWith("-")) {
            options.path = nextArg;
            i++;
          } else if (
            arg === "--transports" &&
            nextArg &&
            !nextArg.startsWith("-")
          ) {
            options.transports = nextArg;
            i++;
          }
          break;
      }
    }

    return options;
  }
}
