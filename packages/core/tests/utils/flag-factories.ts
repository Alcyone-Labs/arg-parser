/**
 * @fileoverview Flag factory functions for testing
 * @module @alcyone-labs/arg-parser/tests/utils/flag-factories
 */

import type { IFlag } from '../../src/index.js';

/**
 * Factory for creating string flags
 * @param name - Flag name
 * @param options - Optional flag configuration
 * @returns String flag configuration
 * 
 * @example
 * ```typescript
 * const flag = createStringFlag('username', { mandatory: true });
 * ```
 */
export function createStringFlag(
  name: string,
  options: Partial<IFlag> = {}
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: 'string',
    ...options,
  };
}

/**
 * Factory for creating boolean flags
 * @param name - Flag name
 * @param options - Optional flag configuration
 * @returns Boolean flag configuration
 * 
 * @example
 * ```typescript
 * const flag = createBooleanFlag('verbose', { defaultValue: false });
 * ```
 */
export function createBooleanFlag(
  name: string,
  options: Partial<IFlag> = {}
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: 'boolean',
    flagOnly: true,
    ...options,
  };
}

/**
 * Factory for creating number flags
 * @param name - Flag name
 * @param options - Optional flag configuration
 * @returns Number flag configuration
 * 
 * @example
 * ```typescript
 * const flag = createNumberFlag('count', { defaultValue: 1 });
 * ```
 */
export function createNumberFlag(
  name: string,
  options: Partial<IFlag> = {}
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: 'number',
    ...options,
  };
}

/**
 * Factory for creating array flags (allowMultiple)
 * @param name - Flag name
 * @param options - Optional flag configuration
 * @returns Array flag configuration
 * 
 * @example
 * ```typescript
 * const flag = createArrayFlag('tags', { options: ['-t', '--tag'] });
 * ```
 */
export function createArrayFlag(
  name: string,
  options: Partial<IFlag> = {}
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: 'string',
    allowMultiple: true,
    ...options,
  };
}

/**
 * Factory for creating enum flags
 * @param name - Flag name
 * @param values - Allowed enum values
 * @param options - Optional flag configuration
 * @returns Enum flag configuration
 * 
 * @example
 * ```typescript
 * const flag = createEnumFlag('env', ['dev', 'staging', 'prod']);
 * ```
 */
export function createEnumFlag(
  name: string,
  values: string[],
  options: Partial<IFlag> = {}
): IFlag {
  return {
    name,
    options: [`--${name}`],
    type: 'string',
    enum: values,
    ...options,
  };
}

/**
 * Factory for creating mandatory flags
 * @param flag - Base flag configuration
 * @returns Flag with mandatory set to true
 * 
 * @example
 * ```typescript
 * const flag = createMandatoryFlag(createStringFlag('username'));
 * ```
 */
export function createMandatoryFlag(flag: IFlag): IFlag {
  return {
    ...flag,
    mandatory: true,
  };
}

/**
 * Factory for creating flags with default values
 * @param flag - Base flag configuration
 * @param defaultValue - Default value
 * @returns Flag with default value
 * 
 * @example
 * ```typescript
 * const flag = createFlagWithDefault(createNumberFlag('count'), 5);
 * ```
 */
export function createFlagWithDefault<T>(
  flag: IFlag,
  defaultValue: T
): IFlag {
  return {
    ...flag,
    defaultValue,
  };
}
