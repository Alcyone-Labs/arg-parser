import { zodFlagSchema } from "./types";
import type { IFlag, ProcessedFlag } from "./types";

export class FlagManager {
  #_flags: Map<string, ProcessedFlag> = new Map();
  #throwForDuplicateFlags: boolean;

  constructor(
    options: { throwForDuplicateFlags?: boolean } = {},
    initialFlags: readonly IFlag[] = [],
  ) {
    this.#throwForDuplicateFlags = options.throwForDuplicateFlags ?? false;
    this.addFlags(initialFlags);
  }

  static _safeFlag(flag: IFlag): ProcessedFlag {
    const parsedFromZod = zodFlagSchema.parse(flag);

    let resolvedType: ProcessedFlag["type"];
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
      resolvedType = inputTypeFromZod as ProcessedFlag["type"];
    }

    return {
      ...parsedFromZod,
      options: parsedFromZod["options"],
      type: resolvedType,
      validate: parsedFromZod["validate"],
      enum: parsedFromZod["enum"],
      mandatory: parsedFromZod["mandatory"],
      env: parsedFromZod["env"],
      dxtOptions: parsedFromZod["dxtOptions"],
    };
  }

  addFlag(flag: IFlag): this {
    const safeFlag = FlagManager._safeFlag(flag);

    if (this.#_flags.has(safeFlag["name"])) {
      if (this.#throwForDuplicateFlags) {
        throw new Error(
          `FlagManager: Flag '${safeFlag["name"]}' already exists.`,
        );
      } else {
        console.warn(
          `Warning: FlagManager: Flag '${safeFlag["name"]}' already exists. Duplicate not added.`,
        );
        return this;
      }
    }

    this.#_flags.set(safeFlag["name"], safeFlag);
    return this;
  }

  _setProcessedFlagForInheritance(processedFlag: ProcessedFlag): this {
    if (this.#_flags.has(processedFlag["name"])) {
      return this;
    }
    this.#_flags.set(processedFlag["name"], processedFlag);
    return this;
  }

  addFlags(flags: readonly IFlag[]): this {
    for (const flag of flags) {
      this.addFlag(flag);
    }
    return this;
  }

  hasFlag(name: string): boolean {
    return this.#_flags.has(name);
  }

  removeFlag(name: string): boolean {
    return this.#_flags.delete(name);
  }

  getFlag(name: string): ProcessedFlag | undefined {
    return this.#_flags.get(name);
  }

  get flags(): ProcessedFlag[] {
    return Array.from(this.#_flags.values());
  }

  get flagNames(): string[] {
    return Array.from(this.#_flags.values()).map((flag) => flag["name"]);
  }
}
