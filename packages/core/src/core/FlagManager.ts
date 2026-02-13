/**
 * FlagManager - Manages flag definitions and collision detection
 * 
 * This class handles the registration, storage, and retrieval of CLI flags.
 * It provides collision detection to prevent duplicate flag definitions.
 */

import { zodFlagSchema, type IFlag, type ProcessedFlag } from './types';

export interface FlagManagerOptions {
  /** Throw an error if a flag is added more than once */
  throwForDuplicateFlags?: boolean;
}

export interface FlagOptionCollision {
  flagName: string;
  option: string;
  existingFlagName: string;
}

/**
 * Manages flag definitions for an ArgParser instance
 */
export class FlagManager {
  private flags: Map<string, ProcessedFlag> = new Map();
  private optionToFlagMap: Map<string, string> = new Map();
  private options: FlagManagerOptions;
  
  constructor(options: FlagManagerOptions = {}, initialFlags: readonly IFlag[] = []) {
    this.options = {
      throwForDuplicateFlags: false,
      ...options,
    };
    
    // Add initial flags
    for (const flag of initialFlags) {
      this.addFlag(flag);
    }
  }
  
  /**
   * Add a single flag
   */
  addFlag(flag: IFlag): void {
    const processedFlag = this.processFlag(flag);
    
    // Check for name collision
    if (this.flags.has(processedFlag.name)) {
      if (this.options.throwForDuplicateFlags) {
        throw new Error(`Flag with name '${processedFlag.name}' already exists`);
      }
      console.warn(`[FlagManager] Flag '${processedFlag.name}' is being overwritten`);
    }
    
    // Check for option collisions
    for (const option of processedFlag.options) {
      const existingFlag = this.optionToFlagMap.get(option);
      if (existingFlag && existingFlag !== processedFlag.name) {
        if (this.options.throwForDuplicateFlags) {
          throw new Error(
            `Option '${option}' is already used by flag '${existingFlag}'`
          );
        }
        console.warn(
          `[FlagManager] Option '${option}' is already used by flag '${existingFlag}'. ` +
          `Reassigning to '${processedFlag.name}'`
        );
      }
      this.optionToFlagMap.set(option, processedFlag.name);
    }
    
    this.flags.set(processedFlag.name, processedFlag);
  }
  
  /**
   * Add multiple flags
   */
  addFlags(flags: readonly IFlag[]): void {
    for (const flag of flags) {
      this.addFlag(flag);
    }
  }
  
  /**
   * Remove a flag by name
   */
  removeFlag(name: string): boolean {
    const flag = this.flags.get(name);
    if (!flag) return false;
    
    // Remove option mappings
    for (const option of flag.options) {
      this.optionToFlagMap.delete(option);
    }
    
    return this.flags.delete(name);
  }
  
  /**
   * Check if a flag exists
   */
  hasFlag(name: string): boolean {
    return this.flags.has(name);
  }
  
  /**
   * Get a flag by name
   */
  getFlag(name: string): ProcessedFlag | undefined {
    return this.flags.get(name);
  }
  
  /**
   * Get all flags as an array
   */
  getAllFlags(): ProcessedFlag[] {
    return Array.from(this.flags.values());
  }
  
  /**
   * Get all flag names
   */
  getFlagNames(): string[] {
    return Array.from(this.flags.keys());
  }
  
  /**
   * Find flag by option
   */
  findFlagByOption(option: string): ProcessedFlag | undefined {
    const flagName = this.optionToFlagMap.get(option);
    if (!flagName) return undefined;
    return this.flags.get(flagName);
  }
  
  /**
   * Process a raw flag into a ProcessedFlag
   */
  private processFlag(flag: IFlag): ProcessedFlag {
    // Basic mapping for aliases before validation
    const rawFlag: any = { ...flag };
    
    if ('default' in rawFlag && rawFlag.default !== undefined && !('defaultValue' in rawFlag)) {
      rawFlag.defaultValue = rawFlag.default;
    }
    
    if ('required' in rawFlag && rawFlag.required !== undefined && !('mandatory' in rawFlag)) {
      rawFlag.mandatory = rawFlag.required;
    }

    // Validate with Zod
    return zodFlagSchema.parse(rawFlag) as ProcessedFlag;
  }
  
  /**
   * Internal method to set a processed flag directly (for inheritance)
   */
  _setProcessedFlagForInheritance(flag: ProcessedFlag): void {
    this.flags.set(flag.name, flag);
    for (const option of flag.options) {
      this.optionToFlagMap.set(option, flag.name);
    }
  }
  
  /**
   * Clear all flags
   */
  clear(): void {
    this.flags.clear();
    this.optionToFlagMap.clear();
  }
  
  /**
   * Get collision report
   */
  getCollisions(): FlagOptionCollision[] {
    const collisions: FlagOptionCollision[] = [];
    const seen = new Map<string, string>();
    
    for (const [name, flag] of this.flags) {
      for (const option of flag.options) {
        const existing = seen.get(option);
        if (existing && existing !== name) {
          collisions.push({
            flagName: name,
            option,
            existingFlagName: existing,
          });
        }
        seen.set(option, name);
      }
    }
    
    return collisions;
  }
}
