/**
 * @fileoverview Core ArgParser tests
 * @module @alcyone-labs/arg-parser/tests/ArgParser
 * 
 * Migrated from: tests/ArgParser.test.ts
 * Migration Date: 2026-02-05
 * Changes Made:
 *   - Updated imports to use package structure
 *   - Replaced direct ArgParser instantiation with createTestParser()
 *   - Added proper test isolation with beforeEach/afterEach
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { 
  ArgParser, 
  ArgParserError,
  type IFlag,
} from '../src/index.js';
import { 
  createTestParser, 
  createTestParserWithFlags,
  standardTestFlags,
  complexTestFlags,
  mockConsole,
  mockProcessExit,
  restoreMocks,
  flexibleErrorRegex,
} from './utils/index.js';

const testCommandName = 'test-cli';

describe('ArgParser', () => {
  let parser: ArgParser;
  let consoleMocks: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  const createParser = (autoExit: boolean = false) => {
    return createTestParser({
      appCommandName: testCommandName,
      autoExit,
    }).addFlags(complexTestFlags);
  };

  beforeEach(() => {
    parser = createParser(false);
    consoleMocks = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    restoreMocks(consoleMocks.log, consoleMocks.error, exitMock);
  });

  describe('Basic Flag Parsing', () => {
    test('should parse basic flags', async () => {
      const result = await parser.parse(['--phase', 'pairing', '-b', '42', '-t', 'chunks']);
      expect(result).toMatchObject({
        phase: 'pairing',
        batch: 42,
        verbose: false,
        table: 'chunks',
      });
    });

    test('should process multiple flag values', async () => {
      const result = await parser.parse([
        '--phase',
        'analysis',
        '-t',
        'all',
        '-f',
        'file1.txt',
        '-f',
        'file2.txt',
      ]);
      expect(result.files).toEqual(['file1.txt', 'file2.txt']);
    });

    test('should handle boolean flags', async () => {
      const result = await parser.parse(['--phase', 'chunking', '-b', '1', '-t', 'metadata', '-v']);
      expect(result.verbose).toBe(true);
    });

    test('should use default values', async () => {
      const result = await parser.parse(['--phase', 'chunking', '-b', '1', '-t', 'metadata']);
      expect(result.verbose).toBe(false);
    });
  });

  describe('Mandatory Flag Validation', () => {
    test('should throw error for missing mandatory flag', async () => {
      await expect(parser.parse(['-t', 'chunks'])).rejects.toThrow(
        flexibleErrorRegex("Missing mandatory flags: phase")
      );
    });

    test('should not require batch flag for analysis phase', async () => {
      const result = await parser.parse(['--phase', 'analysis', '-t', 'all']);
      expect(result.phase).toBe('analysis');
      expect(result.batch).toBeUndefined();
    });

    test('should require batch flag for non-analysis phases', async () => {
      await expect(parser.parse(['--phase', 'chunking', '-t', 'chunks'])).rejects.toThrow(
        flexibleErrorRegex("Missing mandatory flags: batch")
      );
    });
  });

  describe('Enum Validation', () => {
    test('should accept valid enum values', async () => {
      const result = await parser.parse(['--phase', 'pairing', '-b', '1', '-t', 'metadata']);
      expect(result.table).toBe('metadata');
    });

    test('should reject invalid enum values', async () => {
      await expect(
        parser.parse(['--phase', 'pairing', '-b', '1', '-t', 'invalid_table'])
      ).rejects.toThrow(flexibleErrorRegex("Invalid value 'invalid_table' for flag"));
    });
  });

  describe('Plugin System', () => {
    test('should support plugin installation', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: (p: ArgParser) => {
          (p as any).testMethod = () => 'test';
          return p;
        },
      };

      const parserWithPlugin = createTestParser().use(mockPlugin);
      
      expect(parserWithPlugin.hasPlugin('test-plugin')).toBe(true);
      expect((parserWithPlugin as any).testMethod()).toBe('test');
    });

    test('should prevent duplicate plugin installation', () => {
      const mockPlugin = {
        name: 'test-plugin',
        install: (p: ArgParser) => p,
      };

      const parserWithPlugin = createTestParser().use(mockPlugin);
      
      expect(() => parserWithPlugin.use(mockPlugin)).toThrow(
        "Plugin 'test-plugin' is already installed"
      );
    });

    test('should list installed plugins', () => {
      const plugin1 = { name: 'plugin-1', install: (p: ArgParser) => p };
      const plugin2 = { name: 'plugin-2', install: (p: ArgParser) => p };

      const parserWithPlugins = createTestParser()
        .use(plugin1)
        .use(plugin2);

      expect(parserWithPlugins.listPlugins()).toEqual(['plugin-1', 'plugin-2']);
    });
  });

  describe('Help Generation', () => {
    test('should generate help text', () => {
      const helpText = parser.helpText();
      
      expect(helpText).toContain('test-cli');
      expect(helpText).toContain('--phase');
      expect(helpText).toContain('-b, --batch-number');
      expect(helpText).toContain('-v');
    });

    test('should display help with --help flag', async () => {
      const result = await parser.parse(['--help']);
      
      expect(consoleMocks.log).toHaveBeenCalled();
      expect(result.type).toBe('help');
    });
  });

  describe('Subcommands', () => {
    test('should support subcommands', async () => {
      const subParser = createTestParser({
        appName: 'sub-command',
        handler: async (ctx) => ({ executed: true, args: ctx.args }),
      }).addFlag({
        name: 'value',
        options: ['-v', '--value'],
        type: 'string',
        mandatory: true,
      });

      const mainParser = createTestParser()
        .addSubCommand({
          name: 'sub',
          description: 'A subcommand',
          parser: subParser,
        });

      const result = await mainParser.parse(['sub', '-v', 'test']);
      
      expect(result).toMatchObject({
        executed: true,
        args: { value: 'test' },
      });
    });
  });

  describe('Flag Management', () => {
    test('should add flags individually', () => {
      const p = createTestParser();
      p.addFlag({
        name: 'test',
        options: ['--test'],
        type: 'string',
      });

      expect(p.hasFlag('test')).toBe(true);
    });

    test('should add multiple flags at once', () => {
      const p = createTestParser();
      p.addFlags([
        { name: 'flag1', options: ['--flag1'], type: 'string' },
        { name: 'flag2', options: ['--flag2'], type: 'number' },
      ]);

      expect(p.hasFlag('flag1')).toBe(true);
      expect(p.hasFlag('flag2')).toBe(true);
    });

    test('should get flag definition', () => {
      const flag = parser.getFlagDefinition('phase');
      
      expect(flag).toBeDefined();
      expect(flag?.name).toBe('phase');
      expect(flag?.type).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should throw ArgParserError on validation failure', async () => {
      await expect(parser.parse([])).rejects.toThrow(ArgParserError);
    });

    test('should include command chain in error', async () => {
      try {
        await parser.parse([]);
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof ArgParserError) {
          expect(error.commandChain).toBeDefined();
        }
      }
    });
  });
});
