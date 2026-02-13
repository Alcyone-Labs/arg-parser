/**
 * @fileoverview Test utilities index
 * @module @alcyone-labs/arg-parser/tests/utils
 */

export {
  mockConsole,
  mockProcessExit,
  restoreMocks,
  flexibleErrorRegex,
} from '../setup.js';

export {
  createTestParser,
  createTestParserWithFlags,
  parseArgs,
  standardTestFlags,
  complexTestFlags,
} from './test-helpers.js';

export {
  createStringFlag,
  createBooleanFlag,
  createNumberFlag,
  createArrayFlag,
  createEnumFlag,
  createMandatoryFlag,
  createFlagWithDefault,
} from './flag-factories.js';
