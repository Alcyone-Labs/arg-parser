import { HandlerContext, IFlag, ISubCommand, ProcessedFlag, TParsedArgs } from "./types";
export declare class ArgParserError extends Error {
    cmdChain: string[];
    commandChain: string[];
    constructor(message: string, cmdChain?: string[]);
}
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
    description?: string;
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
    handlerToExecute?: {
        handler: Function;
        context: HandlerContext;
    };
};
export declare class ArgParser {
    #private;
    constructor(options?: IArgParserParams & {
        appName?: string;
        subCommands?: ISubCommand[];
        handler?: (ctx: HandlerContext) => void;
    }, initialFlags?: readonly IFlag[]);
    get flags(): ProcessedFlag[];
    get flagNames(): string[];
    private _addToOutput;
    addFlags(flags: readonly IFlag[]): this;
    addFlag(flag: IFlag): this;
    addSubCommand(subCommandConfig: ISubCommand): this;
    /**
     * Sets the handler function for this specific parser instance.
     * This handler will be executed if this parser is the final one
     * in the command chain and `executeHandlers` is enabled on the root parser.
     *
     * @param handler - The function to execute.
     * @returns The ArgParser instance for chaining.
     */
    setHandler(handler: (ctx: HandlerContext) => void): this;
    printAll(filePath?: string): void;
    parse(processArgs: string[], options?: IParseOptions): TParsedArgsWithRouting<any>;
    /**
     * Recursive helper for parsing arguments and handling sub-commands.
     * This method assumes the global help check has already been performed in `parse`.
     */
    private _parseRecursive;
    helpText(): string;
    getSubCommand(name: string): ISubCommand | undefined;
    hasFlag(name: string): boolean;
    getCommandChain(): string[];
    getLastParseResult(): TParsedArgs<ProcessedFlag[]>;
}
export {};
//# sourceMappingURL=ArgParser.d.ts.map