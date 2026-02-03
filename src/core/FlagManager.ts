import { zodFlagSchema } from "./types";
import type { IFlag, ProcessedFlag } from "./types";

/**
 * Options for FlagManager configuration.
 */
export interface FlagManagerOptions {
  /** Whether to throw an error when a flag with a duplicate name is added. If false, a warning is logged and the duplicate is skipped. @default false */
  throwForDuplicateFlags?: boolean;
  /**
   * Whether to detect and report collisions between flag option strings (e.g., two flags both using `-f` or `--file`).
   * When enabled, adding a flag with an option string that conflicts with an existing flag will trigger a warning or error.
   * @default true
   */
  detectOptionCollisions?: boolean;
  /**
   * Whether to throw an error when flag option collisions are detected.
   * If false, a warning is logged but the flag is still added.
   * Only applies when detectOptionCollisions is true.
   * @default false
   */
  throwForOptionCollisions?: boolean;
}

/**
 * Represents a collision between flag option strings.
 */
export interface FlagOptionCollision {
  /** The option string that collides (e.g., "-f" or "--file") */
  option: string;
  /** The name of the flag that was already registered with this option */
  existingFlagName: string;
  /** The name of the flag being added that causes the collision */
  newFlagName: string;
}

/**
 * Manages flag definitions and detects collisions between flag names and option strings.
 *
 * @example
 * ```typescript
 * const manager = new FlagManager({
 *   throwForDuplicateFlags: true,
 *   detectOptionCollisions: true,
 *   throwForOptionCollisions: true
 * });
 *
 * manager.addFlag({
 *   name: "file",
 *   options: ["-f", "--file"],
 *   type: "string"
 * });
 *
 * // This will throw because "-f" is already used:
 * manager.addFlag({
 *   name: "force",
 *   options: ["-f", "--force"],
 *   type: "boolean"
 * });
 * ```
 */
export class FlagManager {
  #_flags: Map<string, ProcessedFlag> = new Map();
  #_optionToFlagName: Map<string, string> = new Map();
  #throwForDuplicateFlags: boolean;
  #detectOptionCollisions: boolean;
  #throwForOptionCollisions: boolean;

  /**
   * Creates a new FlagManager instance.
   *
   * @param options - Configuration options for the manager
   * @param initialFlags - Optional array of flags to add immediately
   */
  constructor(options: FlagManagerOptions = {}, initialFlags: readonly IFlag[] = []) {
    this.#throwForDuplicateFlags = options.throwForDuplicateFlags ?? false;
    this.#detectOptionCollisions = options.detectOptionCollisions ?? true;
    this.#throwForOptionCollisions = options.throwForOptionCollisions ?? false;
    this.addFlags(initialFlags);
  }

  /**
   * Converts a raw IFlag to a ProcessedFlag with resolved types.
   *
   * @param flag - The flag definition to process
   * @returns The processed flag with resolved types
   * @internal
   */
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
      prompt: parsedFromZod["prompt"],
      promptSequence: parsedFromZod["promptSequence"],
    };
  }

  /**
   * Finds collisions between the options of a new flag and existing flags.
   *
   * @param newFlag - The flag being added
   * @returns An array of detected collisions, empty if none
   * @internal
   */
  #findOptionCollisions(newFlag: ProcessedFlag): FlagOptionCollision[] {
    const collisions: FlagOptionCollision[] = [];

    for (const option of newFlag["options"]) {
      const existingFlagName = this.#_optionToFlagName.get(option);
      if (existingFlagName && existingFlagName !== newFlag["name"]) {
        collisions.push({
          option,
          existingFlagName,
          newFlagName: newFlag["name"],
        });
      }
    }

    return collisions;
  }

  /**
   * Registers all options of a flag in the option-to-flag mapping.
   *
   * @param flag - The flag whose options should be registered
   * @internal
   */
  #registerFlagOptions(flag: ProcessedFlag): void {
    for (const option of flag["options"]) {
      this.#_optionToFlagName.set(option, flag["name"]);
    }
  }

  /**
   * Adds a flag to the manager.
   *
   * Detects name collisions (if throwForDuplicateFlags is true) and
   * option string collisions (if detectOptionCollisions is true).
   *
   * @param flag - The flag definition to add
   * @returns The FlagManager instance for chaining
   * @throws {Error} If throwForDuplicateFlags is true and a flag with the same name exists
   * @throws {Error} If throwForOptionCollisions is true and option collisions are detected
   *
   * @example
   * ```typescript
   * manager.addFlag({
   *   name: "verbose",
   *   options: ["-v", "--verbose"],
   *   type: "boolean",
   *   description: "Enable verbose output"
   * });
   * ```
   */
  addFlag(flag: IFlag): this {
    const safeFlag = FlagManager._safeFlag(flag);

    // Check for duplicate flag name
    if (this.#_flags.has(safeFlag["name"])) {
      if (this.#throwForDuplicateFlags) {
        throw new Error(`FlagManager: Flag '${safeFlag["name"]}' already exists.`);
      } else {
        console.warn(
          `Warning: FlagManager: Flag '${safeFlag["name"]}' already exists. Duplicate not added.`,
        );
        return this;
      }
    }

    // Check for option collisions
    if (this.#detectOptionCollisions) {
      const collisions = this.#findOptionCollisions(safeFlag);
      if (collisions.length > 0) {
        const collisionMessages = collisions.map(
          (c: FlagOptionCollision) => `'${c.option}' (conflicts with '${c.existingFlagName}')`,
        );
        const message =
          `Flag '${safeFlag["name"]}' has option collision(s): ${collisionMessages.join(", ")}. ` +
          `Each option string can only be used by one flag.`;

        if (this.#throwForOptionCollisions) {
          throw new Error(`FlagManager: ${message}`);
        } else {
          console.warn(`Warning: FlagManager: ${message}`);
          // Continue adding the flag even with collision warning
        }
      }
    }

    this.#_flags.set(safeFlag["name"], safeFlag);
    this.#registerFlagOptions(safeFlag);
    return this;
  }

  /**
   * Sets a processed flag for inheritance from a parent parser.
   * This bypasses collision detection since inherited flags are intentional.
   *
   * @param processedFlag - The processed flag to add
   * @returns The FlagManager instance for chaining
   * @internal
   */
  _setProcessedFlagForInheritance(processedFlag: ProcessedFlag): this {
    if (this.#_flags.has(processedFlag["name"])) {
      return this;
    }
    this.#_flags.set(processedFlag["name"], processedFlag);
    this.#registerFlagOptions(processedFlag);
    return this;
  }

  /**
   * Adds multiple flags to the manager.
   *
   * @param flags - Array of flag definitions to add
   * @returns The FlagManager instance for chaining
   */
  addFlags(flags: readonly IFlag[]): this {
    for (const flag of flags) {
      this.addFlag(flag);
    }
    return this;
  }

  /**
   * Checks if a flag with the given name exists.
   *
   * @param name - The flag name to check
   * @returns True if the flag exists, false otherwise
   */
  hasFlag(name: string): boolean {
    return this.#_flags.has(name);
  }

  /**
   * Removes a flag by name.
   *
   * @param name - The name of the flag to remove
   * @returns True if the flag was removed, false if it didn't exist
   */
  removeFlag(name: string): boolean {
    const flag = this.#_flags.get(name);
    if (flag) {
      // Remove options from mapping
      for (const option of flag["options"]) {
        this.#_optionToFlagName.delete(option);
      }
      return this.#_flags.delete(name);
    }
    return false;
  }

  /**
   * Gets a flag by name.
   *
   * @param name - The name of the flag to retrieve
   * @returns The flag definition, or undefined if not found
   */
  getFlag(name: string): ProcessedFlag | undefined {
    return this.#_flags.get(name);
  }

  /**
   * Gets all registered flags.
   *
   * @returns An array of all registered flags
   */
  get flags(): ProcessedFlag[] {
    return Array.from(this.#_flags.values());
  }

  /**
   * Gets all registered flag names.
   *
   * @returns An array of all flag names
   */
  get flagNames(): string[] {
    return Array.from(this.#_flags.values()).map((flag) => flag["name"]);
  }

  /**
   * Gets all registered option strings and their associated flag names.
   *
   * @returns A map of option strings to flag names
   */
  get optionMappings(): ReadonlyMap<string, string> {
    return new Map(this.#_optionToFlagName);
  }

  /**
   * Gets all collisions between the given flag and existing flags.
   * Useful for pre-validation before adding a flag.
   *
   * @param flag - The flag to check for collisions
   * @returns An array of detected collisions, empty if none
   *
   * @example
   * ```typescript
   * const collisions = manager.getCollisionsForFlag({
   *   name: "force",
   *   options: ["-f", "--force"],
   *   type: "boolean"
   * });
   *
   * if (collisions.length > 0) {
   *   console.log("Collisions detected:", collisions);
   * }
   * ```
   */
  getCollisionsForFlag(flag: IFlag): FlagOptionCollision[] {
    const safeFlag = FlagManager._safeFlag(flag);
    return this.#findOptionCollisions(safeFlag);
  }
}
