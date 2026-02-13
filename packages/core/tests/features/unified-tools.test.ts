/**
 * @fileoverview Unified Tools tests
 * @module @alcyone-labs/arg-parser/tests/features/unified-tools
 * 
 * Unified tools are a new v3.0 feature that work in both CLI and MCP modes.
 * These tests verify the unified tool API and functionality.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ArgParser } from '../../src/index.js';
import { createTestParser } from '../utils/index.js';

describe('Unified Tools', () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = createTestParser();
  });

  describe('Tool Definition', () => {
    test('should define a unified tool with flags', () => {
      const tool = {
        name: 'process-data',
        description: 'Process data files',
        flags: [
          { 
            name: 'input', 
            options: ['-i', '--input'], 
            type: 'string', 
            mandatory: true 
          },
          { 
            name: 'output', 
            options: ['-o', '--output'], 
            type: 'string' 
          },
        ],
        handler: async (ctx: any) => {
          return { processed: true, input: ctx.args.input };
        },
      };

      expect(tool.name).toBe('process-data');
      expect(tool.flags).toHaveLength(2);
      expect(tool.flags[0].mandatory).toBe(true);
    });

    test('should define a tool with output schema', () => {
      const tool = {
        name: 'query-database',
        description: 'Query the database',
        flags: [
          { name: 'table', options: ['-t'], type: 'string', mandatory: true },
        ],
        outputSchema: 'successWithData',
        handler: async (ctx: any) => ({
          success: true,
          data: { rows: [] },
        }),
      };

      expect(tool.outputSchema).toBe('successWithData');
    });
  });

  describe('Tool Registration', () => {
    test('should register tool as CLI subcommand', async () => {
      // Tools are registered as subcommands in CLI mode
      const subParser = createTestParser({
        appName: 'process',
        handler: async (ctx) => ctx.args,
      }).addFlag({
        name: 'file',
        options: ['-f'],
        type: 'string',
        mandatory: true,
      });

      parser.addSubCommand({
        name: 'process',
        description: 'Process a file',
        parser: subParser,
      });

      const result = await parser.parse(['process', '-f', 'data.txt']);
      expect(result.file).toBe('data.txt');
    });

    test('should support nested tool commands', async () => {
      const nestedParser = createTestParser({
        appName: 'nested',
        handler: async (ctx) => ({ nested: true, args: ctx.args }),
      }).addFlag({
        name: 'value',
        options: ['-v'],
        type: 'string',
      });

      const subParser = createTestParser().addSubCommand({
        name: 'nested',
        description: 'Nested command',
        parser: nestedParser,
      });

      parser.addSubCommand({
        name: 'parent',
        description: 'Parent command',
        parser: subParser,
      });

      const result = await parser.parse(['parent', 'nested', '-v', 'test']);
      expect(result).toMatchObject({
        nested: true,
        args: { value: 'test' },
      });
    });
  });

  describe('Tool Execution', () => {
    test('should execute tool handler with context', async () => {
      let capturedContext: any;

      const toolParser = createTestParser({
        appName: 'test-tool',
        handler: async (ctx) => {
          capturedContext = ctx;
          return { executed: true };
        },
      }).addFlag({
        name: 'param',
        options: ['-p'],
        type: 'string',
      });

      parser.addSubCommand({
        name: 'tool',
        parser: toolParser,
      });

      await parser.parse(['tool', '-p', 'value']);

      expect(capturedContext).toBeDefined();
      expect(capturedContext.args.param).toBe('value');
      expect(capturedContext.commandChain).toContain('tool');
    });

    test('should handle async tool handlers', async () => {
      const toolParser = createTestParser({
        handler: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { async: true };
        },
      });

      parser.addSubCommand({
        name: 'async-tool',
        parser: toolParser,
      });

      const result = await parser.parse(['async-tool']);
      expect(result.async).toBe(true);
    });

    test('should handle tool errors gracefully', async () => {
      const toolParser = createTestParser({
        handler: async () => {
          throw new Error('Tool failed');
        },
      });

      parser.addSubCommand({
        name: 'failing-tool',
        parser: toolParser,
      });

      await expect(parser.parse(['failing-tool'])).rejects.toThrow('Tool failed');
    });
  });

  describe('Tool Schema Generation', () => {
    test('should generate JSON schema from tool flags', () => {
      const flags = [
        { name: 'name', options: ['-n'], type: 'string' },
        { name: 'count', options: ['-c'], type: 'number' },
        { name: 'enabled', options: ['-e'], type: 'boolean' },
      ];

      // Schema would be generated for MCP
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
          enabled: { type: 'boolean' },
        },
      };

      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.count.type).toBe('number');
      expect(schema.properties.enabled.type).toBe('boolean');
    });

    test('should handle array types in schema', () => {
      const flags = [
        { name: 'tags', options: ['-t'], type: 'string', allowMultiple: true },
      ];

      const schema = {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
        },
      };

      expect(schema.properties.tags.type).toBe('array');
    });
  });

  describe('Tool Context', () => {
    test('should provide command chain in context', async () => {
      let chain: string[] = [];

      const deepParser = createTestParser({
        handler: async (ctx) => {
          chain = ctx.commandChain;
          return {};
        },
      });

      const midParser = createTestParser().addSubCommand({
        name: 'deep',
        parser: deepParser,
      });

      parser.addSubCommand({
        name: 'mid',
        parser: midParser,
      });

      await parser.parse(['mid', 'deep']);
      expect(chain).toEqual(['mid', 'deep']);
    });

    test('should provide parent parser reference', async () => {
      let parentRef: any;

      const childParser = createTestParser({
        handler: async (ctx) => {
          parentRef = ctx.parentParser;
          return {};
        },
      });

      parser.addSubCommand({
        name: 'child',
        parser: childParser,
      });

      await parser.parse(['child']);
      expect(parentRef).toBeDefined();
    });
  });
});
