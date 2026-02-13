/**
 * Core ArgParser implementation
 * 
 * This is the main ArgParser class with full CLI parsing capabilities.
 * It has NO dependencies on MCP, DXT, or TUI - those are provided by plugins.
 */

import chalk from '@alcyone-labs/simple-chalk';
import type { IArgParserPlugin } from '../plugin/types';
import { FlagManager } from './FlagManager';
import { PromptManager } from './PromptManager';
import type {
  IFlag,
  IHandlerContext,
  ISubCommand,
  ParseResult,
  ProcessedFlag,
  PromptWhen,
  TFlagInheritance,
  ISystemArgs,
} from './types';

/**
 * Error thrown by ArgParser
 */
export class ArgParserError extends Error {
  public commandChain: string[];
  
  constructor(message: string, public cmdChain: string[] = []) {
    super(message);
    this.name = 'ArgParserError';
    this.commandChain = cmdChain;
  }
}

/**
 * Parameters for creating an ArgParser
 */
export interface IArgParserParams<THandlerReturn = any> {
  /** Display name of the application */
  appName?: string;
  /** Command name for help text */
  appCommandName?: string;
  /** Description of the application */
  description?: string;
  /** Handler function */
  handler?: (ctx: IHandlerContext<any, any>) => THandlerReturn | Promise<THandlerReturn>;
  /** Subcommands */
  subCommands?: ISubCommand[];
  /** Extra newline between flag groups in help */
  extraNewLine?: boolean;
  /** Wrap help text at this width */
  wrapAtWidth?: number;
  /** Width of blank space in help */
  blankSpaceWidth?: number;
  /** Character for mandatory flags */
  mandatoryCharacter?: string;
  /** Throw error for duplicate flags */
  throwForDuplicateFlags?: boolean;
  /** Handle errors automatically */
  handleErrors?: boolean;
  /** Auto exit on parse result */
  autoExit?: boolean;
  /** Trigger auto-help if no handler */
  triggerAutoHelpIfNoHandler?: boolean;
  /** Flag inheritance behavior */
  inheritParentFlags?: TFlagInheritance;
  /** When to trigger interactive prompts */
  promptWhen?: PromptWhen;
  /** Cancel callback for prompts */
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}

/**
 * Parse options
 */
export interface IParseOptions {
  /** Skip help handling */
  skipHelpHandling?: boolean;
  /** Skip handler execution */
  skipHandlers?: boolean;
  /** Await async handlers */
  deep?: boolean;
  /** MCP mode flag */
  isMcp?: boolean;
  /** Dynamic help preload */
  dynamicHelpPreload?: boolean;
  /** Auto execute */
  autoExecute?: boolean;
  /** Import meta URL */
  importMetaUrl?: string;
}

/**
 * Core ArgParser class
 * 
 * Provides complete CLI argument parsing with support for:
 * - Flags (with types, validation, defaults)
 * - Subcommands
 * - Interactive prompts
 * - Help generation
 * - Plugin system
 */
export class ArgParser<THandlerReturn = any> {
  // Private fields
  #appName: string = 'Argument Parser';
  #appCommandName?: string;
  #subCommandName: string = '';
  #description?: string;
  #handler?: (ctx: IHandlerContext) => any;
  #subCommands: Map<string, ISubCommand> = new Map();
  #flagManager: FlagManager;
  #promptManager: PromptManager;
  #plugins: Map<string, IArgParserPlugin> = new Map();
  
  // Configuration
  #mandatoryCharacter: string = '*';
  #throwForDuplicateFlags: boolean = false;
  #handleErrors: boolean = true;
  #autoExit: boolean = true;
  #inheritParentFlags: TFlagInheritance = false;
  #promptWhen: PromptWhen = 'interactive-flag';

  // State
  #parentParser?: ArgParser;
  #rootPath: string | null = null;
  
  constructor(params: IArgParserParams<THandlerReturn> = {}, initialFlags?: readonly IFlag[]) {
    // Set basic properties
    this.#appName = params.appName || 'app';
    this.#appCommandName = params.appCommandName;
    this.#description = params.description;
    this.#handler = params.handler;
    
    // Set formatting options
    if (params.mandatoryCharacter !== undefined) this.#mandatoryCharacter = params.mandatoryCharacter;

    // Set behavior options
    if (params.throwForDuplicateFlags !== undefined) this.#throwForDuplicateFlags = params.throwForDuplicateFlags;
    if (params.handleErrors !== undefined) this.#handleErrors = params.handleErrors;
    if (params.autoExit !== undefined) this.#autoExit = params.autoExit;
    if (params.inheritParentFlags !== undefined) this.#inheritParentFlags = params.inheritParentFlags;
    if (params.promptWhen !== undefined) this.#promptWhen = params.promptWhen;
    
    // Initialize managers
    this.#flagManager = new FlagManager(
      { throwForDuplicateFlags: this.#throwForDuplicateFlags },
      initialFlags || []
    );
    this.#promptManager = new PromptManager();
    
    // Add help flag
    this.addFlag({
      name: 'help',
      description: 'Display this help message and exit',
      mandatory: false,
      type: Boolean,
      options: ['-h', '--help'],
      flagOnly: true,
    });
    
    // Add subcommands
    if (params.subCommands) {
      for (const sub of params.subCommands) {
        this.addSubCommand(sub);
      }
    }
  }
  
  // ==================== Plugin System ====================
  
  /**
   * Install a plugin
   */
  use(plugin: IArgParserPlugin): this {
    if (this.#plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already installed`);
    }
    
    const result = plugin.install(this);
    this.#plugins.set(plugin.name, plugin);
    
    return (result as ArgParser) as this || this;
  }
  
  /**
   * Check if a plugin is installed
   */
  hasPlugin(name: string): boolean {
    return this.#plugins.has(name);
  }
  
  /**
   * Get an installed plugin
   */
  getPlugin(name: string): IArgParserPlugin | undefined {
    return this.#plugins.get(name);
  }
  
  /**
   * List all installed plugins
   */
  listPlugins(): string[] {
    return Array.from(this.#plugins.keys());
  }
  
  // ==================== Flag Management ====================
  
  /**
   * Add a flag
   */
  addFlag(flag: IFlag): this {
    this.#flagManager.addFlag(flag);
    
    // Register with prompt manager if promptable
    if ('prompt' in flag && typeof flag.prompt === 'function') {
      this.#promptManager.registerPromptableFlag(flag as any);
    }
    
    return this;
  }
  
  /**
   * Add multiple flags
   */
  addFlags(flags: readonly IFlag[]): this {
    for (const flag of flags) {
      this.addFlag(flag);
    }
    return this;
  }
  
  /**
   * Check if a flag exists
   */
  hasFlag(name: string): boolean {
    return this.#flagManager.hasFlag(name);
  }
  
  /**
   * Get a flag definition
   */
  getFlagDefinition(name: string): ProcessedFlag | undefined {
    return this.#flagManager.getFlag(name);
  }
  
  /**
   * Get all flags
   */
  get flags(): ProcessedFlag[] {
    return this.#flagManager.getAllFlags();
  }
  
  /**
   * Get all flag names
   */
  get flagNames(): string[] {
    return this.#flagManager.getFlagNames();
  }
  
  // ==================== Subcommand Management ====================
  
  /**
   * Add a subcommand
   */
  addSubCommand(subCommand: ISubCommand): this {
    if (this.#subCommands.has(subCommand.name)) {
      throw new Error(`Subcommand '${subCommand.name}' already exists`);
    }
    
    // Set up parent relationship
    const subParser = subCommand.parser as ArgParser;
    if (subParser) {
      subParser.#parentParser = this;
      subParser.#subCommandName = subCommand.name;
      
      // Inherit flags if configured
      if (subParser.#inheritParentFlags) {
        this.inheritFlagsToSubParser(subParser);
      }
    }
    
    this.#subCommands.set(subCommand.name, subCommand);
    return this;
  }
  
  /**
   * Get a subcommand
   */
  getSubCommand(name: string): ISubCommand | undefined {
    return this.#subCommands.get(name);
  }
  
  /**
   * Get all subcommands
   */
  getSubCommands(): Map<string, ISubCommand> {
    return new Map(this.#subCommands);
  }
  
  /**
   * Inherit flags to a sub-parser
   */
  private inheritFlagsToSubParser(subParser: ArgParser): void {
    const parentFlags = this.#flagManager.getAllFlags();
    for (const flag of parentFlags) {
      if (!subParser.hasFlag(flag.name)) {
        (subParser.#flagManager as any)._setProcessedFlagForInheritance(flag);
      }
    }
  }
  
  // ==================== Handler Management ====================
  
  /**
   * Set the handler
   */
  setHandler(handler: (ctx: IHandlerContext<any, any>) => THandlerReturn | Promise<THandlerReturn>): this {
    this.#handler = handler;
    return this;
  }
  
  /**
   * Get the handler
   */
  getHandler(): ((ctx: IHandlerContext) => any) | undefined {
    return this.#handler;
  }
  
  // ==================== Getters ====================
  
  getAppName(): string {
    return this.#appName;
  }
  
  getAppCommandName(): string | undefined {
    return this.#appCommandName;
  }
  
  getDescription(): string | undefined {
    return this.#description;
  }
  
  getSubCommandName(): string {
    return this.#subCommandName;
  }
  
  getAutoExit(): boolean {
    return this.#autoExit;
  }
  
  getPromptWhen(): PromptWhen {
    return this.#promptWhen;
  }
  
  // ==================== Parsing ====================
  
  /**
   * Parse command line arguments
   */
  async parse(processArgs?: string[], options: IParseOptions = {}): Promise<any> {
    const args = processArgs || process.argv.slice(2);
    
    try {
      // Detect and strip system flags
      const { systemArgs, filteredArgs } = this.detectAndStripSystemFlags(args);
      
      // Handle help
      if (!options.skipHelpHandling && filteredArgs.includes('--help')) {
        console.log(this.helpText());
        return this.handleExit(0, 'Help displayed', 'help');
      }
      
      // Find subcommand chain
      const { finalParser, commandChain, remainingArgs } = this.findCommandChain(filteredArgs);
      
      // Parse flags
      const parsedArgs = await finalParser.parseFlags(remainingArgs, options);
      
      // Create handler context
      const context: IHandlerContext = {
        args: parsedArgs,
        commandChain,
        parser: finalParser,
        parentParser: finalParser.#parentParser,
        isMcp: options.isMcp || false,
        displayHelp: () => console.log(finalParser.helpText()),
        rootPath: this.#rootPath || process.cwd(),
        systemArgs,
        logger: console,
      };
      
      // Execute handler
      if (finalParser.#handler && !options.skipHandlers) {
        const result = await finalParser.#handler(context);
        return result;
      }
      
      return parsedArgs;
    } catch (error) {
      if (error instanceof ArgParserError) {
        if (!this.#handleErrors) {
          throw error;
        }
        console.error(chalk.red(error.message));
        return this.handleExit(1, error.message, 'error');
      }
      throw error;
    }
  }
  
  /**
   * Parse flags only
   */
  private async parseFlags(args: string[], _options: IParseOptions = {}): Promise<any> {
    const result: any = {};
    const flags = this.#flagManager.getAllFlags();

    // Set defaults
    for (const flag of flags) {
      if (flag.defaultValue !== undefined) {
        result[flag.name] = flag.defaultValue;
      }
    }

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      const flag = this.#flagManager.findFlagByOption(arg);

      if (flag) {
        if (flag.flagOnly) {
          result[flag.name] = true;
        } else {
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            const value = this.parseFlagValue(nextArg, flag.type);

            // Handle allowMultiple - accumulate into array
            if (flag.allowMultiple) {
              if (!Array.isArray(result[flag.name])) {
                result[flag.name] = result[flag.name] !== undefined ? [result[flag.name]] : [];
              }
              result[flag.name].push(value);
            } else {
              result[flag.name] = value;
            }

            i++;
          } else if (flag.type === Boolean) {
            result[flag.name] = true;
          }
        }
      }

      i++;
    }

    // Validate enum values
    for (const flag of flags) {
      if (flag.enum && flag.enum.length > 0 && result[flag.name] !== undefined) {
        const value = result[flag.name];
        if (!flag.enum.includes(value)) {
          throw new ArgParserError(
            `Invalid value '${value}' for flag '${flag.name}'. Allowed values: ${flag.enum.join(', ')}`,
            [this.#appName]
          );
        }
      }
    }

    // Validate mandatory flags
    const missingFlags: string[] = [];
    for (const flag of flags) {
      if (flag.mandatory && result[flag.name] === undefined) {
        if (typeof flag.mandatory === 'function') {
          if (flag.mandatory(result)) {
            missingFlags.push(flag.name);
          }
        } else {
          missingFlags.push(flag.name);
        }
      }
    }

    if (missingFlags.length > 0) {
      throw new ArgParserError(
        `Missing mandatory flags: ${missingFlags.join(', ')}`,
        [this.#appName]
      );
    }

    return result;
  }
  
  /**
   * Parse a flag value based on type
   */
  private parseFlagValue(value: string, type: any): any {
    if (type === Boolean || type === 'boolean') {
      return /^(true|yes|1)$/i.test(value);
    }
    if (type === Number || type === 'number') {
      return Number(value);
    }
    if (type === String || type === 'string') {
      return value;
    }
    if (typeof type === 'function') {
      return type(value);
    }
    return value;
  }
  
  /**
   * Find the command chain for subcommands
   */
  private findCommandChain(args: string[]): {
    finalParser: ArgParser;
    commandChain: string[];
    remainingArgs: string[];
  } {
    let currentParser: ArgParser = this;
    const commandChain: string[] = [];
    let remainingArgs = [...args];
    
    while (remainingArgs.length > 0) {
      const subName = remainingArgs[0];
      const subCommand = currentParser.#subCommands.get(subName);
      
      if (!subCommand) break;
      
      commandChain.push(subName);
      currentParser = subCommand.parser as ArgParser;
      remainingArgs = remainingArgs.slice(1);
    }
    
    return { finalParser: currentParser, commandChain, remainingArgs };
  }
  
  /**
   * Detect and strip system flags
   */
  private detectAndStripSystemFlags(args: string[]): {
    systemArgs: ISystemArgs;
    filteredArgs: string[];
  } {
    const systemArgs: ISystemArgs = {};
    const filteredArgs: string[] = [];
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];
      
      switch (arg) {
        case '--s-debug':
          systemArgs.debug = true;
          break;
        case '--s-with-env':
          systemArgs.withEnv = nextArg && !nextArg.startsWith('-') ? nextArg : true;
          if (nextArg && !nextArg.startsWith('-')) i++;
          break;
        default:
          filteredArgs.push(arg);
      }
    }
    
    return { systemArgs, filteredArgs };
  }
  
  /**
   * Handle exit
   */
  private handleExit(exitCode: number, message?: string, type?: ParseResult['type']): ParseResult {
    const result: ParseResult = {
      success: exitCode === 0,
      exitCode,
      message,
      type: type || (exitCode === 0 ? 'success' : 'error'),
      shouldExit: true,
    };
    
    if (this.#autoExit && typeof process !== 'undefined' && process.exit) {
      process.exit(exitCode);
    }
    
    return result;
  }
  
  // ==================== Help Generation ====================
  
  /**
   * Generate help text
   */
  helpText(): string {
    const lines: string[] = [];
    
    // Title
    lines.push(chalk.bold(this.#appName));
    if (this.#description) {
      lines.push(this.#description);
    }
    lines.push('');
    
    // Usage
    const commandName = this.#appCommandName || this.#appName.toLowerCase();
    lines.push(chalk.bold('Usage:'));
    lines.push(`  ${commandName} [options] [command]`);
    lines.push('');
    
    // Options
    const flags = this.#flagManager.getAllFlags();
    if (flags.length > 0) {
      lines.push(chalk.bold('Options:'));
      for (const flag of flags) {
        const options = flag.options.join(', ');
        const defaultStr = flag.defaultValue !== undefined ? ` (default: ${flag.defaultValue})` : '';
        const mandatoryStr = flag.mandatory ? ` ${this.#mandatoryCharacter}` : '';
        lines.push(`  ${options.padEnd(20)} ${flag.description || ''}${defaultStr}${mandatoryStr}`);
      }
      lines.push('');
    }
    
    // Subcommands
    if (this.#subCommands.size > 0) {
      lines.push(chalk.bold('Commands:'));
      for (const [name, sub] of this.#subCommands) {
        lines.push(`  ${name.padEnd(20)} ${sub.description || ''}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}
