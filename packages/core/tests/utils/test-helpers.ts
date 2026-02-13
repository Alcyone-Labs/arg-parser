/**
 * @fileoverview Test helpers for @alcyone-labs/arg-parser
 * @module @alcyone-labs/arg-parser/tests/utils/test-helpers
 */

import { ArgParser } from '../../src/index.js';
import type { IFlag, IArgParserParams } from '../../src/index.js';

/**
 * Create a test parser with sensible defaults for testing
 * @param params - Optional parameters to override defaults
 * @returns Configured ArgParser instance
 * 
 * @example
 * ```typescript
 * const parser = createTestParser({ appName: 'my-test' });
 * ```
 */
export function createTestParser(params: Partial<IArgParserParams> = {}) {
  return new ArgParser({
    appName: 'test-cli',
    appCommandName: 'test-cli',
    autoExit: false,
    handleErrors: false,
    ...params,
  });
}

/**
 * Create a test parser with predefined flags
 * @param flags - Array of flags to add
 * @param params - Optional parser parameters
 * @returns Configured ArgParser with flags
 * 
 * @example
 * ```typescript
 * const parser = createTestParserWithFlags([
 *   { name: 'verbose', options: ['-v'], type: 'boolean' }
 * ]);
 * ```
 */
export function createTestParserWithFlags(
  flags: IFlag[],
  params: Partial<IArgParserParams> = {}
) {
  return createTestParser(params).addFlags(flags);
}

/**
 * Parse arguments and return the result
 * @param parser - ArgParser instance
 * @param args - Arguments to parse
 * @param options - Parse options
 * @returns Parse result
 */
export async function parseArgs(
  parser: ArgParser,
  args: string[],
  options = {}
) {
  return parser.parse(args, { autoExecute: false, ...options });
}

/**
 * Standard test flags for common test scenarios
 */
export const standardTestFlags: IFlag[] = [
  {
    name: 'name',
    options: ['-n', '--name'],
    type: 'string',
    mandatory: true,
    description: 'Name parameter',
  },
  {
    name: 'verbose',
    options: ['-v', '--verbose'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
    description: 'Enable verbose mode',
  },
  {
    name: 'count',
    options: ['-c', '--count'],
    type: 'number',
    defaultValue: 1,
    description: 'Count parameter',
  },
  {
    name: 'tags',
    options: ['-t', '--tag'],
    type: 'string',
    allowMultiple: true,
    description: 'Tags (can be specified multiple times)',
  },
];

/**
 * Complex test flags for advanced scenarios
 */
export const complexTestFlags: IFlag[] = [
  {
    name: 'phase',
    description: 'Phase of the process',
    options: ['--phase'],
    type: 'string',
    mandatory: true,
    enum: ['chunking', 'pairing', 'analysis'],
  },
  {
    name: 'batch',
    description: 'Batch number (required except for analysis phase)',
    options: ['-b', '--batch-number'],
    type: 'number',
    mandatory: (args) => args.phase !== 'analysis',
  },
  {
    name: 'verbose',
    description: 'Enable verbose mode',
    options: ['-v'],
    type: 'boolean',
    flagOnly: true,
    defaultValue: false,
  },
  {
    name: 'files',
    description: 'Files',
    options: ['-f'],
    allowMultiple: true,
    type: 'string',
  },
  {
    name: 'table',
    description: 'Table to query',
    options: ['--table', '-t'],
    type: 'string',
    mandatory: true,
    enum: ['metadata', 'chunks', 'qaPairs', 'processingBatches', 'all'],
  },
];
