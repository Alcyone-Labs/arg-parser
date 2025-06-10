var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __flags, _throwForDuplicateFlags, _appName, _appCommandName, _subCommandName, _parameters, _handler, _throwForDuplicateFlags2, _description, _handleErrors, _parentParser, _lastParseResult, _inheritParentFlags, _subCommands, _flagManager, _ArgParser_instances, _identifyCommandChainAndParsers_fn, _handleGlobalChecks_fn, _validateMandatoryFlags_fn, _applyDefaultValues_fn, _prepareAndExecuteHandler_fn, parseFlags_fn, displayErrorAndExit_fn, _printRecursiveToConsole_fn, _buildRecursiveString_fn, _buildRecursiveJson_fn;
import chalk from "chalk";
import { createRegExp, anyOf, oneOrMore, char } from "magic-regexp";
import { z } from "zod";
const path = {};
const zodFlagSchema = z.object({
  name: z.string().min(1, "Flag name cannot be empty").describe(
    "The output property name, used as a return key `{name: value}`. Must be unique."
  ),
  allowLigature: z.boolean().default(true).describe(
    "Enable both forms of flag input, e.g., `./script.js -f=value` and `-f value`."
  ),
  allowMultiple: z.boolean().default(false).describe(
    "Allow passing the same flag multiple times, e.g., `-f val1 -f val2` results in an array."
  ),
  description: z.union([z.string(), z.array(z.string())]).describe("Textual description for help messages."),
  options: z.array(z.string().min(1)).min(1, "Flag must have at least one option (e.g., ['-f', '--flag'])").describe("Array of option strings, e.g., ['-f', '--flag']."),
  defaultValue: z.any().optional().describe("Default value if the flag is not provided."),
  type: z.union([
    z.any().refine((val) => val === String, { message: "Must be String constructor" }),
    z.any().refine((val) => val === Number, { message: "Must be Number constructor" }),
    z.any().refine((val) => val === Boolean, { message: "Must be Boolean constructor" }),
    z.any().refine((val) => val === Array, { message: "Must be Array constructor" }),
    z.any().refine((val) => val === Object, { message: "Must be Object constructor" }),
    z.function().args(z.string()).returns(z.any()),
    // Custom parser function
    z.string().refine(
      (value) => ["boolean", "string", "number", "array", "object"].includes(
        value.toLowerCase()
      ),
      { message: "Invalid type string. Must be one of 'boolean', 'string', 'number', 'array', 'object'." }
    )
  ]).default("string").describe("Expected data type or a custom parser function. Defaults to 'string'."),
  mandatory: z.union([z.boolean(), z.function().args(z.any()).returns(z.boolean())]).optional().describe("Makes the flag mandatory, can be a boolean or a function conditional on other args."),
  flagOnly: z.boolean().default(false).describe(
    "If true, the flag's presence is noted (true/false), and any subsequent value is not consumed by this flag."
  ),
  validate: z.function().args(z.any().optional(), z.any().optional()).returns(z.union([z.boolean(), z.string(), z.void(), z.promise(z.union([z.boolean(), z.string(), z.void()]))])).optional().describe("Custom validation function for the flag's value (receives value, parsedArgs)."),
  enum: z.array(z.any()).optional().describe("Array of allowed values for the flag.")
}).passthrough().transform((obj) => {
  const newObj = { ...obj };
  if ("default" in newObj && newObj["default"] !== void 0 && !("defaultValue" in newObj)) {
    newObj["defaultValue"] = newObj["default"];
  }
  if ("required" in newObj && newObj["required"] !== void 0 && !("mandatory" in newObj)) {
    newObj["mandatory"] = newObj["required"];
  }
  return newObj;
});
const _FlagManager = class _FlagManager {
  constructor(options = {}, initialFlags = []) {
    __privateAdd(this, __flags, /* @__PURE__ */ new Map());
    __privateAdd(this, _throwForDuplicateFlags);
    __privateSet(this, _throwForDuplicateFlags, options.throwForDuplicateFlags ?? false);
    this.addFlags(initialFlags);
  }
  static _safeFlag(flag) {
    const parsedFromZod = zodFlagSchema.parse(flag);
    let resolvedType;
    const inputTypeFromZod = parsedFromZod["type"];
    if (typeof inputTypeFromZod === "string") {
      switch (inputTypeFromZod.toLowerCase()) {
        case "boolean":
          resolvedType = Boolean;
          break;
        case "string":
          resolvedType = String;
          break;
        case "number":
          resolvedType = Number;
          break;
        case "array":
          resolvedType = Array;
          break;
        case "object":
          resolvedType = Object;
          break;
        default:
          throw new Error(`Invalid type string: ${inputTypeFromZod}`);
      }
    } else {
      resolvedType = inputTypeFromZod;
    }
    return {
      ...parsedFromZod,
      options: parsedFromZod["options"],
      type: resolvedType,
      validate: parsedFromZod["validate"],
      enum: parsedFromZod["enum"],
      mandatory: parsedFromZod["mandatory"]
    };
  }
  addFlag(flag) {
    const safeFlag = _FlagManager._safeFlag(flag);
    if (__privateGet(this, __flags).has(safeFlag["name"])) {
      if (__privateGet(this, _throwForDuplicateFlags)) {
        throw new Error(
          `FlagManager: Flag '${safeFlag["name"]}' already exists.`
        );
      } else {
        console.warn(
          `Warning: FlagManager: Flag '${safeFlag["name"]}' already exists. Duplicate not added.`
        );
        return this;
      }
    }
    __privateGet(this, __flags).set(safeFlag["name"], safeFlag);
    return this;
  }
  _setProcessedFlagForInheritance(processedFlag) {
    if (__privateGet(this, __flags).has(processedFlag["name"])) {
      return this;
    }
    __privateGet(this, __flags).set(processedFlag["name"], processedFlag);
    return this;
  }
  addFlags(flags) {
    for (const flag of flags) {
      this.addFlag(flag);
    }
    return this;
  }
  hasFlag(name) {
    return __privateGet(this, __flags).has(name);
  }
  getFlag(name) {
    return __privateGet(this, __flags).get(name);
  }
  get flags() {
    return Array.from(__privateGet(this, __flags).values());
  }
  get flagNames() {
    return Array.from(__privateGet(this, __flags).values()).map((flag) => flag["name"]);
  }
};
__flags = new WeakMap();
_throwForDuplicateFlags = new WeakMap();
let FlagManager = _FlagManager;
class ArgParserError extends Error {
  constructor(message, cmdChain = []) {
    super(message);
    this.cmdChain = cmdChain;
    this.name = "ArgParserError";
    this.commandChain = cmdChain;
  }
}
const _ArgParser = class _ArgParser {
  constructor(options = {}, initialFlags) {
    __privateAdd(this, _ArgParser_instances);
    __privateAdd(this, _appName, "Argument Parser");
    __privateAdd(this, _appCommandName);
    __privateAdd(this, _subCommandName, "");
    __privateAdd(this, _parameters, {
      extraNewLine: true,
      wrapAtWidth: 50,
      blankSpaceWidth: 30,
      mandatoryCharacter: "*"
    });
    __privateAdd(this, _handler);
    __privateAdd(this, _throwForDuplicateFlags2, false);
    __privateAdd(this, _description);
    __privateAdd(this, _handleErrors, true);
    __privateAdd(this, _parentParser);
    __privateAdd(this, _lastParseResult, {});
    __privateAdd(this, _inheritParentFlags, false);
    __privateAdd(this, _subCommands, /* @__PURE__ */ new Map());
    __privateAdd(this, _flagManager);
    __privateSet(this, _appName, options.appName || "app");
    if (options.blankSpaceWidth && !isNaN(Number(options.blankSpaceWidth)) && Number(options.blankSpaceWidth) > 20)
      __privateGet(this, _parameters).blankSpaceWidth = Number(options.blankSpaceWidth);
    if (options.wrapAtWidth && !isNaN(Number(options.wrapAtWidth)) && Number(options.wrapAtWidth) > 30)
      __privateGet(this, _parameters).wrapAtWidth = Number(options.wrapAtWidth);
    if (typeof options.extraNewLine === "boolean")
      __privateGet(this, _parameters).extraNewLine = Boolean(options.extraNewLine);
    if (typeof options.mandatoryCharacter === "string")
      __privateGet(this, _parameters).mandatoryCharacter = options.mandatoryCharacter;
    if (typeof options.throwForDuplicateFlags === "boolean")
      __privateSet(this, _throwForDuplicateFlags2, options.throwForDuplicateFlags);
    __privateSet(this, _flagManager, new FlagManager(
      {
        throwForDuplicateFlags: __privateGet(this, _throwForDuplicateFlags2)
      },
      initialFlags || []
    ));
    __privateSet(this, _handleErrors, options.handleErrors ?? true);
    __privateSet(this, _inheritParentFlags, options.inheritParentFlags ?? false);
    __privateSet(this, _description, options.description);
    __privateSet(this, _handler, options.handler);
    __privateSet(this, _appCommandName, options.appCommandName);
    const helpFlag = {
      name: "help",
      description: "Display this help message and exits",
      mandatory: false,
      type: Boolean,
      options: ["-h", "--help"],
      defaultValue: void 0,
      allowLigature: false,
      allowMultiple: false,
      flagOnly: true,
      enum: [],
      validate: (_value, _parsedArgs) => true
      // Ensure signature matches Zod schema for .args()
    };
    __privateGet(this, _flagManager).addFlag(helpFlag);
    if (options.subCommands) {
      for (const sub of options.subCommands) {
        this.addSubCommand(sub);
      }
    }
  }
  get flags() {
    return __privateGet(this, _flagManager).flags;
  }
  get flagNames() {
    return __privateGet(this, _flagManager).flagNames;
  }
  _addToOutput(flag, arg, output, _parseOptions) {
    let value = arg;
    if (flag.type === Boolean) {
      if (typeof arg === "boolean") {
        value = arg;
      } else if (typeof arg === "string") {
        value = /(true|yes|1)/i.test(arg);
      } else {
        value = new flag["type"](value);
      }
    } else if (typeof flag["type"] === "function") {
      value = flag["type"](value);
    } else if (typeof flag["type"] === "object") {
      value = new flag["type"](value);
    }
    if (flag["enum"] && flag["enum"].length > 0) {
      const allowedValues = flag["enum"].map((v) => typeof v === "string" ? `'${v}'` : v).join(", ");
      if (!flag["enum"].includes(value)) {
        throw new ArgParserError(
          `Invalid value '${value}' for flag '${chalk.yellow(flag["name"])}'. Allowed values: ${allowedValues}`,
          this.getCommandChain()
        );
      }
    }
    if (flag["validate"]) {
      const validationResult = flag["validate"](value, output);
      if (validationResult === false) {
        throw new ArgParserError(
          `Validation failed for flag '${chalk.yellow(flag["name"])}' with value '${value}'`,
          this.getCommandChain()
        );
      } else if (typeof validationResult === "string") {
        throw new ArgParserError(validationResult, this.getCommandChain());
      }
    }
    if (flag["allowMultiple"] && !Array.isArray(output[flag["name"]])) {
      output[flag["name"]] = [];
    }
    return flag["allowMultiple"] ? output[flag["name"]].push(value) : output[flag["name"]] = value;
  }
  addFlags(flags) {
    __privateGet(this, _flagManager).addFlags(flags);
    return this;
  }
  addFlag(flag) {
    __privateGet(this, _flagManager).addFlag(flag);
    return this;
  }
  addSubCommand(subCommandConfig) {
    if (__privateGet(this, _subCommands).has(subCommandConfig.name)) {
      throw new Error(`Sub-command '${subCommandConfig.name}' already exists`);
    }
    const subParser = subCommandConfig.parser;
    if (!(subParser instanceof _ArgParser)) {
      throw new Error(
        `Parser for subcommand '${subCommandConfig.name}' is not an instance of ArgParser. Please provide 'new ArgParser(...)' for the 'parser' property of an ISubCommand.`
      );
    }
    __privateSet(subParser, _parentParser, this);
    __privateSet(subParser, _subCommandName, subCommandConfig.name);
    if (!__privateGet(subParser, _appCommandName) && __privateGet(this, _appCommandName)) {
      __privateSet(subParser, _appCommandName, __privateGet(this, _appCommandName));
    }
    if (__privateGet(subParser, _inheritParentFlags)) {
      const parentFlags = __privateGet(this, _flagManager).flags;
      for (const parentFlag of parentFlags) {
        if (!__privateGet(subParser, _flagManager).hasFlag(parentFlag["name"])) {
          __privateGet(subParser, _flagManager)._setProcessedFlagForInheritance(parentFlag);
        }
      }
    }
    __privateGet(this, _subCommands).set(subCommandConfig.name, subCommandConfig);
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
  setHandler(handler) {
    __privateSet(this, _handler, handler);
    return this;
  }
  printAll(filePath) {
    if (filePath) {
      try {
        const dir = path.dirname(filePath);
        if (!path.existsSync(dir)) {
          path.mkdirSync(dir, { recursive: true });
        }
        if (filePath.toLowerCase().endsWith(".json")) {
          const outputObject = __privateMethod(this, _ArgParser_instances, _buildRecursiveJson_fn).call(this, this);
          const jsonString = JSON.stringify(outputObject, null, 2);
          path.writeFileSync(filePath, jsonString);
          console.log(`ArgParser configuration JSON dumped to: ${filePath}`);
        } else {
          const outputString = __privateMethod(this, _ArgParser_instances, _buildRecursiveString_fn).call(this, this, 0);
          const plainText = outputString.replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
            ""
          );
          path.writeFileSync(filePath, plainText);
          console.log(`ArgParser configuration text dumped to: ${filePath}`);
        }
      } catch (error) {
        console.error(
          `Error writing ArgParser configuration to file '${filePath}':`,
          error
        );
      }
    } else {
      console.log("\n--- ArgParser Configuration Dump ---");
      __privateMethod(this, _ArgParser_instances, _printRecursiveToConsole_fn).call(this, this, 0);
      console.log("--- End Configuration Dump ---\\n");
    }
  }
  parse(processArgs, options) {
    if (__privateMethod(this, _ArgParser_instances, _handleGlobalChecks_fn).call(this, processArgs, options)) {
      return {};
    }
    try {
      const {
        finalParser: identifiedFinalParser,
        commandChain: identifiedCommandChain,
        parserChain: identifiedParserChain
      } = __privateMethod(this, _ArgParser_instances, _identifyCommandChainAndParsers_fn).call(this, processArgs, this, [], [this]);
      const { finalArgs, handlerToExecute } = this._parseRecursive(
        processArgs,
        this,
        {},
        [],
        options
      );
      if (identifiedCommandChain.length > 0) {
        finalArgs.$commandChain = identifiedCommandChain;
      }
      __privateMethod(this, _ArgParser_instances, _validateMandatoryFlags_fn).call(this, finalArgs, identifiedParserChain, identifiedCommandChain);
      __privateMethod(this, _ArgParser_instances, _applyDefaultValues_fn).call(this, finalArgs, identifiedFinalParser);
      __privateMethod(this, _ArgParser_instances, _prepareAndExecuteHandler_fn).call(this, handlerToExecute, finalArgs, (options == null ? void 0 : options.skipHandlers) ?? false);
      return finalArgs;
    } catch (error) {
      if (error instanceof ArgParserError) {
        if (__privateGet(this, _handleErrors)) {
          __privateMethod(this, _ArgParser_instances, displayErrorAndExit_fn).call(this, error);
          return {};
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
  _parseRecursive(argsToParse, currentParser, accumulatedParentArgs, commandChainSoFar, options) {
    var _a, _b;
    let subCommandIndex = -1;
    let subCommandName = null;
    for (let i = 0; i < argsToParse.length; i++) {
      const potentialSubCommand = argsToParse[i];
      if (__privateGet(currentParser, _subCommands).has(potentialSubCommand)) {
        subCommandIndex = i;
        subCommandName = potentialSubCommand;
        break;
      }
    }
    const argsForCurrentLevel = subCommandIndex === -1 ? argsToParse : argsToParse.slice(0, subCommandIndex);
    const { parsedArgs: currentLevelArgs, firstUnconsumedIndex } = __privateMethod(_a = currentParser, _ArgParser_instances, parseFlags_fn).call(_a, argsForCurrentLevel, options);
    __privateMethod(_b = currentParser, _ArgParser_instances, _applyDefaultValues_fn).call(_b, currentLevelArgs, currentParser);
    const combinedArgsFromThisAndParents = {
      ...accumulatedParentArgs,
      ...currentLevelArgs
    };
    if (subCommandIndex === -1 || subCommandName === null) {
      if (firstUnconsumedIndex < argsForCurrentLevel.length) {
        const unknownCommand = argsForCurrentLevel[firstUnconsumedIndex];
        throw new ArgParserError(
          `Unknown command: '${chalk.yellow(unknownCommand)}'`,
          commandChainSoFar
        );
      }
      const finalParseResultArgs = { ...combinedArgsFromThisAndParents };
      if (commandChainSoFar.length > 0) {
        finalParseResultArgs["$commandChain"] = commandChainSoFar;
      }
      let handlerToExecute = void 0;
      if (__privateGet(currentParser, _handler)) {
        handlerToExecute = {
          handler: __privateGet(currentParser, _handler),
          context: {
            args: currentLevelArgs,
            parentArgs: accumulatedParentArgs,
            commandChain: commandChainSoFar,
            parser: currentParser
          }
        };
      }
      return { finalArgs: finalParseResultArgs, handlerToExecute };
    }
    if (firstUnconsumedIndex < argsForCurrentLevel.length) {
      const unknownCommand = argsForCurrentLevel[firstUnconsumedIndex];
      throw new ArgParserError(
        `Unknown command: '${chalk.yellow(unknownCommand)}'`,
        commandChainSoFar
      );
    }
    const subCommandConfig = __privateGet(currentParser, _subCommands).get(subCommandName);
    if (!subCommandConfig || !(subCommandConfig.parser instanceof _ArgParser)) {
      throw new ArgParserError(
        `Internal error: Subcommand '${subCommandName}' is misconfigured or its parser is not a valid ArgParser instance.`,
        commandChainSoFar
      );
    }
    const nextParser = subCommandConfig.parser;
    const nextArgs = argsToParse.slice(subCommandIndex + 1);
    const nextCommandChain = [...commandChainSoFar, subCommandName];
    const combinedArgsForNextLevel = {
      ...accumulatedParentArgs,
      ...currentLevelArgs
    };
    return this._parseRecursive(
      nextArgs,
      nextParser,
      combinedArgsForNextLevel,
      nextCommandChain,
      options
    );
  }
  helpText() {
    const cyan = chalk.cyan;
    const green = chalk.green;
    const white = chalk.white;
    const red = chalk.red;
    const dim = chalk.dim;
    let rootAppName = __privateGet(this, _appName);
    let current = this;
    while (__privateGet(current, _parentParser)) {
      current = __privateGet(current, _parentParser);
    }
    if (current) {
      rootAppName = __privateGet(current, _appName);
    }
    const helpTitle = __privateGet(this, _subCommandName) ? `${rootAppName} ${__privateGet(this, _subCommandName)}` : rootAppName;
    let help = `${cyan(`${helpTitle} Help`)} (${__privateGet(this, _parameters).mandatoryCharacter} = Mandatory fields):

`;
    if (__privateGet(this, _description)) {
      help += `${white(__privateGet(this, _description))}

`;
    }
    const indent = (level = 1) => "  ".repeat(level);
    if (__privateGet(this, _subCommands).size > 0) {
      help += `${cyan("Available sub-commands:")}
`;
      help += Array.from(__privateGet(this, _subCommands).entries()).sort(([nameA], [nameB]) => nameA.localeCompare(nameB)).map(([name, subCommandConfig]) => {
        const actualSubParserInstance = subCommandConfig.parser;
        if (!(actualSubParserInstance instanceof _ArgParser)) {
          return `${indent()}${green(name.padEnd(20))} [Error: Subcommand '${name}' has an invalid parser configuration]`;
        }
        let subHelp = `${indent()}${green(name.padEnd(20))} ${white(__privateGet(actualSubParserInstance, _description) || "")}`;
        const flagsFromSubManager = actualSubParserInstance && __privateGet(actualSubParserInstance, _flagManager) ? __privateGet(actualSubParserInstance, _flagManager).flags : void 0;
        const subFlags = (flagsFromSubManager || []).filter(
          (f) => f["name"] !== "help"
        );
        if (subFlags.length > 0) {
          subHelp += `
${indent(2)}${dim("Flags:")}`;
          subFlags.sort(
            (a, b) => a["name"].localeCompare(b["name"])
          ).forEach((f) => {
            const flagOptions = f["options"].map((opt) => green(opt)).join(", ");
            const flagDesc = Array.isArray(f["description"]) ? f["description"][0] : f["description"];
            subHelp += `
${indent(3)}${flagOptions} - ${dim(flagDesc)}`;
          });
        } else {
          subHelp += `
${indent(2)}${dim("Flags:")} none`;
        }
        const subSubCommandNames = Array.from(
          __privateGet(actualSubParserInstance, _subCommands).keys()
        );
        if (subSubCommandNames.length > 0) {
          subHelp += `
${indent(2)}${dim("Sub-commands:")} ${subSubCommandNames.join(", ")}`;
        } else {
          subHelp += `
${indent(2)}${dim("Sub-commands:")} none`;
        }
        return subHelp;
      }).join("\n\n");
      help += "\n";
    }
    help += `
${cyan("Flags:")}
`;
    const localFlags = __privateGet(this, _flagManager).flags;
    if (localFlags.length > 0) {
      help += localFlags.sort((flagA, flagB) => flagA["name"].localeCompare(flagB["name"])).map((flag) => {
        const optionsText = flag["options"].toSorted((a, b) => a.length - b.length).map((opt) => green(opt)).join(", ");
        const isMandatory = typeof flag.mandatory === "function" ? "dynamic" : flag.mandatory;
        const mandatoryIndicator = isMandatory === true ? ` ${red(__privateGet(this, _parameters).mandatoryCharacter)}` : isMandatory === "dynamic" ? ` ${dim("(conditionally mandatory)")}` : "";
        const descriptionLines = Array.isArray(flag["description"]) ? flag["description"] : [flag["description"]];
        const metaLines = [];
        let typeName = "unknown";
        if (typeof flag["type"] === "function") {
          typeName = flag["type"].name || "custom function";
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
        if (flag["defaultValue"] !== void 0 && flag["defaultValue"] !== null) {
          metaLines.push(`Default: ${JSON.stringify(flag["defaultValue"])}`);
        }
        if (flag["enum"] && flag["enum"].length > 0) {
          metaLines.push(
            `Allowed values: ${flag["enum"].map((v) => `'${v}'`).join(", ")}`
          );
        }
        const maxOptionLength = Math.max(
          ...localFlags.map(
            (f) => f["options"].join(", ").length
          ),
          0
        );
        const formattedOptions = optionsText.padEnd(maxOptionLength + 5) + mandatoryIndicator;
        return `
${indent()}${formattedOptions}
${indent(2)}${white(descriptionLines[0])}
${metaLines.map((line) => `${indent(3)}${dim(line)}`).join("\n")}
${descriptionLines.slice(1).map((line) => `
${indent(2)}${white(line)}`).join("")}
  `.trim();
      }).join("\n\n");
    } else {
      help += `${indent()}${dim("none")}`;
    }
    return help;
  }
  getSubCommand(name) {
    return __privateGet(this, _subCommands).get(name);
  }
  hasFlag(name) {
    return __privateGet(this, _flagManager).hasFlag(name);
  }
  getCommandChain() {
    const chain = [];
    let currentParser = this;
    while (currentParser && __privateGet(currentParser, _parentParser)) {
      chain.unshift(__privateGet(currentParser, _subCommandName));
      currentParser = __privateGet(currentParser, _parentParser);
    }
    return chain;
  }
  getLastParseResult() {
    return __privateGet(this, _lastParseResult);
  }
};
_appName = new WeakMap();
_appCommandName = new WeakMap();
_subCommandName = new WeakMap();
_parameters = new WeakMap();
_handler = new WeakMap();
_throwForDuplicateFlags2 = new WeakMap();
_description = new WeakMap();
_handleErrors = new WeakMap();
_parentParser = new WeakMap();
_lastParseResult = new WeakMap();
_inheritParentFlags = new WeakMap();
_subCommands = new WeakMap();
_flagManager = new WeakMap();
_ArgParser_instances = new WeakSet();
_identifyCommandChainAndParsers_fn = function(argsToParse, currentParser, commandChainSoFar, parserChainSoFar) {
  let subCommandIndex = -1;
  let subCommandName = null;
  for (let i = 0; i < argsToParse.length; i++) {
    const potentialSubCommand = argsToParse[i];
    if (__privateGet(currentParser, _subCommands).has(potentialSubCommand)) {
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
      remainingArgs: argsToParse
    };
  }
  const subCommandConfig = __privateGet(currentParser, _subCommands).get(subCommandName);
  if (!subCommandConfig || !(subCommandConfig.parser instanceof _ArgParser)) {
    throw new Error(
      `Internal error: Subcommand '${subCommandName}' configuration is invalid or parser is missing.`
    );
  }
  const nextParser = subCommandConfig.parser;
  const nextArgs = argsToParse.slice(subCommandIndex + 1);
  const nextCommandChain = [...commandChainSoFar, subCommandName];
  const nextParserChain = [...parserChainSoFar, nextParser];
  return __privateMethod(this, _ArgParser_instances, _identifyCommandChainAndParsers_fn).call(this, nextArgs, nextParser, nextCommandChain, nextParserChain);
};
_handleGlobalChecks_fn = function(processArgs, options) {
  var _a, _b, _c, _d;
  if (processArgs.length === 0 && !__privateGet(this, _parentParser) && !__privateGet(this, _handler)) {
    console.log(this.helpText());
    if (typeof process === "object" && typeof process.exit === "function") {
      process.exit(0);
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
  const { finalParser: identifiedFinalParser } = __privateMethod(this, _ArgParser_instances, _identifyCommandChainAndParsers_fn).call(this, processArgs, this, [], [this]);
  if (processArgs.includes("--LIB-debug")) {
    console.log(
      chalk.yellow.bold("\n--- ArgParser --LIB-debug Runtime Context ---")
    );
    const {
      commandChain: identifiedCommandChain,
      parserChain: _identifiedParserChain
    } = __privateMethod(this, _ArgParser_instances, _identifyCommandChainAndParsers_fn).call(this, processArgs, this, [], [this]);
    console.log(
      `Identified Command Chain: ${chalk.cyan(identifiedCommandChain.join(" -> ") || "(root)")}`
    );
    console.log(
      `Identified Final Parser: ${chalk.cyan(__privateGet(identifiedFinalParser, _subCommandName) || __privateGet(identifiedFinalParser, _appName))}`
    );
    let currentParser = this;
    let remainingArgs = [...processArgs];
    let accumulatedArgs = {};
    const parsingSteps = [];
    const rootSubCommandIndex = remainingArgs.findIndex(
      (arg) => __privateGet(currentParser, _subCommands).has(arg)
    );
    const rootArgsSlice = rootSubCommandIndex === -1 ? remainingArgs : remainingArgs.slice(0, rootSubCommandIndex);
    parsingSteps.push({ level: "(root)", argsSlice: rootArgsSlice });
    try {
      const { parsedArgs: rootParsedArgs } = __privateMethod(_a = currentParser, _ArgParser_instances, parseFlags_fn).call(_a, rootArgsSlice, { skipHelpHandling: true });
      parsingSteps[0].parsed = rootParsedArgs;
      accumulatedArgs = { ...accumulatedArgs, ...rootParsedArgs };
    } catch (e) {
      parsingSteps[0].error = e.message;
    }
    remainingArgs = rootSubCommandIndex === -1 ? [] : remainingArgs.slice(rootSubCommandIndex);
    for (let i = 0; i < identifiedCommandChain.length; i++) {
      const subCommandName = identifiedCommandChain[i];
      if (!__privateGet(currentParser, _subCommands).has(subCommandName)) {
        parsingSteps.push({
          level: `Error`,
          argsSlice: [],
          error: `Could not find sub-command parser for '${subCommandName}'`
        });
        break;
      }
      currentParser = (_b = __privateGet(currentParser, _subCommands).get(subCommandName)) == null ? void 0 : _b.parser;
      remainingArgs = remainingArgs.slice(1);
      const nextSubCommandIndex = remainingArgs.findIndex(
        (arg) => __privateGet(currentParser, _subCommands).has(arg)
      );
      const currentLevelArgsSlice = nextSubCommandIndex === -1 ? remainingArgs : remainingArgs.slice(0, nextSubCommandIndex);
      const stepInfo = {
        level: subCommandName,
        argsSlice: currentLevelArgsSlice
      };
      parsingSteps.push(stepInfo);
      try {
        const { parsedArgs: currentLevelParsedArgs } = __privateMethod(_c = currentParser, _ArgParser_instances, parseFlags_fn).call(_c, currentLevelArgsSlice, {
          skipHelpHandling: true
        });
        stepInfo.parsed = currentLevelParsedArgs;
        accumulatedArgs = { ...accumulatedArgs, ...currentLevelParsedArgs };
      } catch (e) {
        stepInfo.error = e.message;
      }
      remainingArgs = nextSubCommandIndex === -1 ? [] : remainingArgs.slice(nextSubCommandIndex);
    }
    console.log(chalk.yellow("\nParsing Simulation Steps:"));
    parsingSteps.forEach((step) => {
      console.log(`  Level: ${chalk.cyan(step.level)}`);
      console.log(
        `    Args Slice Considered: ${JSON.stringify(step.argsSlice)}`
      );
      if (step.parsed) {
        console.log(
          `    Parsed Args at this Level: ${JSON.stringify(step.parsed)}`
        );
      }
      if (step.error) {
        console.log(
          `    ${chalk.red("Error during parse simulation:")} ${step.error}`
        );
      }
    });
    console.log(
      chalk.yellow(
        "\nFinal Accumulated Args State (before final validation):"
      )
    );
    console.log(JSON.stringify(accumulatedArgs, null, 2));
    console.log(chalk.yellow("\nArguments Remaining After Simulation:"));
    console.log(JSON.stringify(remainingArgs, null, 2));
    console.log(
      chalk.yellow.bold(
        "\n--- ArgParser Static Configuration (Final Parser) ---"
      )
    );
    identifiedFinalParser.printAll();
    console.log(chalk.yellow.bold("--- End ArgParser --LIB-debug ---"));
    if (typeof process === "object" && typeof process.exit === "function") {
      process.exit(0);
    }
    return true;
  }
  let parserNameForLog = "undefined_parser";
  if (identifiedFinalParser instanceof _ArgParser) {
    parserNameForLog = identifiedFinalParser["#subCommandName"] || identifiedFinalParser["#appName"];
  } else if (identifiedFinalParser) {
    parserNameForLog = identifiedFinalParser.name || identifiedFinalParser.appName || "unknown_type";
  }
  if (!(identifiedFinalParser instanceof _ArgParser)) {
    console.error(
      `[ArgParser #_handleGlobalChecks Critical Error] identifiedFinalParser is not an instance of ArgParser. Cannot process help. Name: ${parserNameForLog}, Constructor: ${identifiedFinalParser ? (_d = identifiedFinalParser.constructor) == null ? void 0 : _d.name : "undefined"}`
    );
    return false;
  }
  const helpFlagDefinition = __privateGet(identifiedFinalParser, _flagManager).getFlag("help");
  if (helpFlagDefinition && !(options == null ? void 0 : options.skipHelpHandling)) {
    const helpOptions = helpFlagDefinition["options"];
    const helpRequested = processArgs.some(
      (arg) => helpOptions.includes(arg)
    );
    if (helpRequested) {
      console.log(identifiedFinalParser.helpText());
      if (typeof process === "object" && typeof process.exit === "function") {
        process.exit(0);
      }
      return true;
    }
  }
  return false;
};
_validateMandatoryFlags_fn = function(finalArgs, parserChain, commandChain) {
  const finalMandatoryFlagsMissing = [];
  const checkedFlagNames = /* @__PURE__ */ new Set();
  for (const parser of parserChain) {
    const currentCommandChain = parser.getCommandChain();
    for (const flag of __privateGet(parser, _flagManager).flags) {
      if (flag["name"] === "help" || checkedFlagNames.has(flag["name"]))
        continue;
      const isMandatory = typeof flag["mandatory"] === "function" ? flag["mandatory"](finalArgs) : flag["mandatory"];
      if (!isMandatory) continue;
      const value = finalArgs[flag["name"]];
      let currentFlagIsMissing = false;
      if (flag["allowMultiple"]) {
        if (value === void 0 || Array.isArray(value) && value.length === 0) {
          currentFlagIsMissing = true;
        }
      } else {
        if (value === void 0) {
          currentFlagIsMissing = true;
        }
      }
      if (currentFlagIsMissing) {
        if (!checkedFlagNames.has(flag["name"])) {
          finalMandatoryFlagsMissing.push({
            name: flag["name"],
            parserName: __privateGet(parser, _subCommandName) || __privateGet(parser, _appName),
            commandChain: currentCommandChain
          });
          checkedFlagNames.add(flag["name"]);
        }
      }
    }
  }
  if (finalMandatoryFlagsMissing.length > 0) {
    throw new ArgParserError(
      `Missing mandatory flags: ${finalMandatoryFlagsMissing.map((flag) => chalk.yellow(flag["name"])).join(", ")}`,
      commandChain
    );
  }
};
_applyDefaultValues_fn = function(finalArgs, finalParser) {
  for (const flag of __privateGet(finalParser, _flagManager).flags) {
    const flagName = flag["name"];
    if (finalArgs[flagName] === void 0 && flag["defaultValue"] !== void 0) {
      if (flag["allowMultiple"]) {
        finalArgs[flagName] = Array.isArray(flag["defaultValue"]) ? flag["defaultValue"] : [flag["defaultValue"]];
      } else {
        finalArgs[flagName] = flag["defaultValue"];
      }
    }
  }
};
_prepareAndExecuteHandler_fn = function(handlerToExecute, finalArgs, skipHandlers) {
  if (skipHandlers || !handlerToExecute) {
    return;
  }
  const finalParserWhoseHandlerWillRun = handlerToExecute.context.parser;
  const finalParserFlags = __privateGet(finalParserWhoseHandlerWillRun, _flagManager).flags;
  const handlerArgs = handlerToExecute.context.args;
  for (const flag of finalParserFlags) {
    const flagName = flag["name"];
    if (finalArgs.hasOwnProperty(flagName)) {
      handlerArgs[flagName] = finalArgs[flagName];
    } else if (flag["allowMultiple"] && !handlerArgs.hasOwnProperty(flagName)) {
      handlerArgs[flagName] = [];
    }
  }
  handlerToExecute.context.args = handlerArgs;
  handlerToExecute.handler(handlerToExecute.context);
};
parseFlags_fn = function(args, options) {
  var _a, _b;
  const flags = __privateGet(this, _flagManager).flags;
  const output = Object.fromEntries(
    flags.map((flag) => [
      flag["name"],
      flag["allowMultiple"] ? [] : void 0
    ])
  );
  let consumedIndices = /* @__PURE__ */ new Set();
  for (const flagToCheck of flags) {
    if (flagToCheck["allowLigature"] && !flagToCheck["flagOnly"]) {
      const regex = createRegExp(
        anyOf(
          ...flagToCheck["options"].map((option) => `${option}=`)
        ),
        oneOrMore(char).groupedAs("arg")
      );
      for (let i = 0; i < args.length; i++) {
        if (consumedIndices.has(i)) continue;
        const itemToCheck = args[i];
        const matches = regex.exec(`${itemToCheck}`);
        if ((_a = matches == null ? void 0 : matches.groups) == null ? void 0 : _a["arg"]) {
          this._addToOutput(
            flagToCheck,
            (_b = matches == null ? void 0 : matches.groups) == null ? void 0 : _b["arg"],
            output,
            options
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
      const nextValue = nextValueExists ? args[nextIndex] : void 0;
      const nextValueIsFlag = typeof nextValue === "string" && nextValue.startsWith("-");
      if (flagToCheck["options"].includes(value)) {
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
};
displayErrorAndExit_fn = function(error) {
  let commandNameToSuggest = "your-script";
  if (__privateGet(this, _appCommandName)) {
    commandNameToSuggest = __privateGet(this, _appCommandName);
  } else if (__privateGet(this, _appName) && __privateGet(this, _appName) !== "Argument Parser") {
    commandNameToSuggest = __privateGet(this, _appName);
  } else if (typeof process !== "undefined" && process.argv && process.argv[1]) {
    try {
      commandNameToSuggest = path.basename(process.argv[1]);
    } catch {
    }
  }
  const commandPath = [
    commandNameToSuggest,
    ...error.commandChain || []
  ].join(" ");
  console.error(`
${chalk.red.bold("Error:")} ${error.message}`);
  console.error(
    `
${chalk.dim(`Try '${commandPath} --help' for usage details.`)}`
  );
  if (typeof process === "object" && typeof process.exit === "function") {
    process.exit(1);
  } else {
    throw error;
  }
};
_printRecursiveToConsole_fn = function(parser, level, visited = /* @__PURE__ */ new Set()) {
  const indent = "  ".repeat(level);
  const subIndent = "  ".repeat(level + 1);
  const flagIndent = "  ".repeat(level + 2);
  console.log(
    `${indent}Parser: ${chalk.blueBright(__privateGet(parser, _subCommandName) || __privateGet(parser, _appName))}`
  );
  if (__privateGet(parser, _description)) {
    console.log(`${subIndent}Description: ${__privateGet(parser, _description)}`);
  }
  console.log(`${subIndent}Options:`);
  console.log(`${flagIndent}appName: ${__privateGet(parser, _appName)}`);
  console.log(
    `${flagIndent}appCommandName: ${__privateGet(parser, _appCommandName) ?? chalk.dim("undefined")}`
  );
  console.log(`${flagIndent}handleErrors: ${__privateGet(parser, _handleErrors)}`);
  console.log(
    `${flagIndent}throwForDuplicateFlags: ${__privateGet(parser, _throwForDuplicateFlags2)}`
  );
  console.log(
    `${flagIndent}inheritParentFlags: ${__privateGet(parser, _inheritParentFlags)}`
  );
  console.log(`${flagIndent}Handler Defined: ${!!__privateGet(parser, _handler)}`);
  console.log(
    `${subIndent}Internal Params: ${JSON.stringify(__privateGet(parser, _parameters))}`
  );
  const flags = __privateGet(parser, _flagManager).flags;
  if (flags.length > 0) {
    console.log(`${subIndent}Flags (${flags.length}):`);
    flags.forEach((flag) => {
      console.log(`${flagIndent}* ${chalk.green(flag["name"])}:`);
      console.log(`${flagIndent}  Options: ${flag["options"].join(", ")}`);
      console.log(
        `${flagIndent}  Description: ${Array.isArray(flag["description"]) ? flag["description"].join(" | ") : flag["description"]}`
      );
      console.log(
        `${flagIndent}  Type: ${typeof flag["type"] === "function" ? flag["type"].name || "custom function" : flag["type"]}`
      );
      console.log(
        `${flagIndent}  Mandatory: ${typeof flag["mandatory"] === "function" ? "dynamic" : flag["mandatory"] ?? false}`
      );
      console.log(
        `${flagIndent}  Default: ${JSON.stringify(flag["defaultValue"])}`
      );
      console.log(`${flagIndent}  Flag Only: ${flag["flagOnly"]}`);
      console.log(`${flagIndent}  Allow Multiple: ${flag["allowMultiple"]}`);
      console.log(`${flagIndent}  Allow Ligature: ${flag["allowLigature"]}`);
      console.log(
        `${flagIndent}  Enum: ${flag["enum"] && flag["enum"].length > 0 ? flag["enum"].join(", ") : "none"}`
      );
      console.log(`${flagIndent}  Validator Defined: ${!!flag["validate"]}`);
    });
  } else {
    console.log(`${subIndent}Flags: ${chalk.dim("none")}`);
  }
  const subCommandParsers = Array.from(__privateGet(parser, _subCommands).values());
  if (subCommandParsers.length > 0) {
    console.log(`${subIndent}Sub-Commands (${subCommandParsers.length}):`);
    subCommandParsers.forEach((subCommand) => {
      __privateMethod(this, _ArgParser_instances, _printRecursiveToConsole_fn).call(this, subCommand.parser, level + 1, visited);
    });
  } else {
    console.log(`${subIndent}Sub-Commands: ${chalk.dim("none")}`);
  }
};
_buildRecursiveString_fn = function(parser, level, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(parser)) return "";
  visited.add(parser);
  let output = "";
  const indent = "  ".repeat(level);
  const subIndent = "  ".repeat(level + 1);
  const flagIndent = "  ".repeat(level + 2);
  const addLine = (line) => {
    output += line + "\\n";
  };
  addLine(
    `${indent}Parser: ${__privateGet(parser, _subCommandName) || __privateGet(parser, _appName)}`
    // #appName is guaranteed
  );
  if (__privateGet(parser, _description)) {
    addLine(`${subIndent}Description: ${__privateGet(parser, _description)}`);
  }
  addLine(`${subIndent}Options:`);
  addLine(`${flagIndent}appName: ${__privateGet(parser, _appName)}`);
  addLine(
    `${flagIndent}appCommandName: ${__privateGet(parser, _appCommandName) ?? "undefined"}`
  );
  addLine(`${flagIndent}handleErrors: ${__privateGet(parser, _handleErrors)}`);
  addLine(
    `${flagIndent}throwForDuplicateFlags: ${__privateGet(parser, _throwForDuplicateFlags2)}`
  );
  addLine(`${flagIndent}inheritParentFlags: ${__privateGet(parser, _inheritParentFlags)}`);
  addLine(`${flagIndent}Handler Defined: ${!!__privateGet(parser, _handler)}`);
  addLine(
    `${subIndent}Internal Params: ${JSON.stringify(__privateGet(parser, _parameters))}`
  );
  const flags = __privateGet(parser, _flagManager).flags;
  if (flags.length > 0) {
    addLine(`${subIndent}Flags (${flags.length}):`);
    flags.forEach((flag) => {
      var _a;
      addLine(`${flagIndent}* ${flag["name"]}:`);
      addLine(`${flagIndent}  Options: ${flag["options"].join(", ")}`);
      addLine(
        `${flagIndent}  Description: ${Array.isArray(flag["description"]) ? flag["description"].join(" | ") : flag["description"]}`
      );
      let typeName = "unknown";
      if (typeof flag["type"] === "function") {
        typeName = flag["type"].name || "custom function";
      } else if (typeof flag["type"] === "string") {
        typeName = flag["type"];
      } else if (typeof flag["type"] === "object" && flag["type"]) {
        try {
          typeName = ((_a = flag["type"].constructor) == null ? void 0 : _a.name) || "object";
        } catch {
          typeName = "object";
        }
      }
      addLine(`${flagIndent}  Type: ${typeName}`);
      addLine(
        `${flagIndent}  Mandatory: ${typeof flag["mandatory"] === "function" ? "dynamic" : flag["mandatory"] ?? false}`
      );
      addLine(
        `${flagIndent}  Default: ${JSON.stringify(flag["defaultValue"])}`
      );
      addLine(`${flagIndent}  Flag Only: ${flag["flagOnly"]}`);
      addLine(`${flagIndent}  Allow Multiple: ${flag["allowMultiple"]}`);
      addLine(`${flagIndent}  Allow Ligature: ${flag["allowLigature"]}`);
      addLine(
        `${flagIndent}  Enum: ${flag["enum"] && flag["enum"].length > 0 ? flag["enum"].join(", ") : "none"}`
      );
      addLine(`${flagIndent}  Validator Defined: ${!!flag["validate"]}`);
    });
  } else {
    addLine(`${subIndent}Flags: none`);
  }
  const subCommandParsers = Array.from(__privateGet(parser, _subCommands).values());
  if (subCommandParsers.length > 0) {
    addLine(`${subIndent}Sub-Commands (${subCommandParsers.length}):`);
    subCommandParsers.forEach((subCommand) => {
      output += __privateMethod(this, _ArgParser_instances, _buildRecursiveString_fn).call(this, subCommand.parser, level + 1, visited);
    });
  } else {
    addLine(`${subIndent}Sub-Commands: none`);
  }
  return output;
};
_buildRecursiveJson_fn = function(parser, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(parser))
    return {
      note: `Reference to already processed parser: ${__privateGet(parser, _subCommandName) || __privateGet(parser, _appName)}`
    };
  visited.add(parser);
  const config = {
    parserName: __privateGet(parser, _subCommandName) || __privateGet(parser, _appName),
    // #appName is guaranteed
    description: __privateGet(parser, _description),
    options: {
      appName: __privateGet(parser, _appName),
      appCommandName: __privateGet(parser, _appCommandName) ?? void 0,
      handleErrors: __privateGet(parser, _handleErrors),
      throwForDuplicateFlags: __privateGet(parser, _throwForDuplicateFlags2),
      inheritParentFlags: __privateGet(parser, _inheritParentFlags)
    },
    handlerDefined: !!__privateGet(parser, _handler),
    internalParams: __privateGet(parser, _parameters),
    flags: [],
    subCommands: {}
    // Will be an object where keys are sub-command names
  };
  const flags = __privateGet(parser, _flagManager).flags;
  config.flags = flags.map((flag) => {
    var _a;
    let typeName = "unknown";
    if (typeof flag["type"] === "function") {
      typeName = flag["type"].name || "custom function";
    } else if (typeof flag["type"] === "string") {
      typeName = flag["type"];
    } else if (typeof flag["type"] === "object" && flag["type"]) {
      try {
        typeName = ((_a = flag["type"].constructor) == null ? void 0 : _a.name) || "object";
      } catch {
        typeName = "object";
      }
    }
    return {
      name: flag["name"],
      options: flag["options"],
      description: flag["description"],
      type: typeName,
      mandatory: typeof flag["mandatory"] === "function" ? "dynamic" : flag["mandatory"] ?? false,
      defaultValue: flag["defaultValue"],
      flagOnly: flag["flagOnly"],
      allowMultiple: flag["allowMultiple"],
      allowLigature: flag["allowLigature"],
      enum: flag["enum"],
      validatorDefined: !!flag["validate"]
    };
  });
  const subCommands = Array.from(__privateGet(parser, _subCommands).values());
  if (subCommands.length > 0) {
    subCommands.forEach((sub) => {
      config.subCommands[sub.name] = __privateMethod(this, _ArgParser_instances, _buildRecursiveJson_fn).call(this, sub.parser, visited);
    });
  }
  return config;
};
let ArgParser = _ArgParser;
export {
  ArgParser,
  ArgParserError
};
//# sourceMappingURL=index.mjs.map
