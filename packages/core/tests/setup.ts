/**
 * @fileoverview Test setup and utilities for @alcyone-labs/arg-parser
 * @module @alcyone-labs/arg-parser/tests/setup
 */

import { vi } from 'vitest';

/**
 * Global test environment
 */
globalThis.testEnv = {
  isTest: true,
};

/**
 * Mock console methods to avoid noise during tests
 * @returns Object with mock spies for console methods
 */
export function mockConsole() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };
}

/**
 * Mock process.exit to prevent test termination
 * @returns Mock spy for process.exit
 */
export function mockProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code}) called`);
  });
}

/**
 * Restore all mocks
 * @param mocks - Array of mocks to restore
 */
export function restoreMocks(...mocks: any[]) {
  mocks.forEach(mock => mock?.mockRestore?.());
}

/**
 * Create a flexible error regex for matching error messages
 * @param message - The message to match
 * @returns RegExp that matches the message case-insensitively
 */
export function flexibleErrorRegex(message: string): RegExp {
  const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escapedMessage, 'i');
}
