/**
 * @fileoverview README Examples Verification
 * @module @alcyone-labs/arg-parser/tests/docs/readme-examples
 * 
 * These tests verify that all code examples in the README work correctly.
 */

import { describe, test, expect } from 'vitest';
import { ArgParser } from '../../src/index.js';

describe('README Examples', () => {
  describe('Basic CLI Example', () => {
    test('basic example from README should work', async () => {
      const parser = new ArgParser({
        appName: 'my-cli',
        autoExit: false,
        handler: async (ctx) => {
          return { greeting: `Hello ${ctx.args.name}` };
        }
      });

      parser.addFlag({
        name: 'name',
        options: ['-n', '--name'],
        type: 'string',
        mandatory: true,
      });

      const result = await parser.parse(['--name', 'World']);
      expect(result.greeting).toBe('Hello World');
    });
  });

  describe('Plugin Example', () => {
    test('plugin installation example should work', () => {
      const parser = new ArgParser({ autoExit: false });
      
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: (p: ArgParser) => {
          (p as any).customMethod = () => 'works';
          return p;
        },
      };

      parser.use(mockPlugin);
      
      expect(parser.hasPlugin('test-plugin')).toBe(true);
      expect((parser as any).customMethod()).toBe('works');
    });
  });

  describe('Flag Types Example', () => {
    test('string flag example should work', async () => {
      const parser = new ArgParser({ autoExit: false });
      
      parser.addFlag({
        name: 'config',
        options: ['-c', '--config'],
        type: 'string',
        description: 'Config file path',
      });

      const result = await parser.parse(['-c', './config.json']);
      expect(result.config).toBe('./config.json');
    });

    test('boolean flag example should work', async () => {
      const parser = new ArgParser({ autoExit: false });
      
      parser.addFlag({
        name: 'verbose',
        options: ['-v', '--verbose'],
        type: 'boolean',
        flagOnly: true,
        defaultValue: false,
      });

      const result1 = await parser.parse([]);
      expect(result1.verbose).toBe(false);

      const result2 = await parser.parse(['-v']);
      expect(result2.verbose).toBe(true);
    });

    test('number flag example should work', async () => {
      const parser = new ArgParser({ autoExit: false });
      
      parser.addFlag({
        name: 'port',
        options: ['-p', '--port'],
        type: 'number',
        defaultValue: 3000,
      });

      const result = await parser.parse(['-p', '8080']);
      expect(result.port).toBe(8080);
    });

    test('array flag example should work', async () => {
      const parser = new ArgParser({ autoExit: false });
      
      parser.addFlag({
        name: 'tags',
        options: ['-t', '--tag'],
        type: 'string',
        allowMultiple: true,
      });

      const result = await parser.parse(['-t', 'a', '-t', 'b']);
      expect(result.tags).toEqual(['a', 'b']);
    });
  });

  describe('Subcommand Example', () => {
    test('subcommand example should work', async () => {
      const deployParser = new ArgParser({
        appName: 'deploy',
        autoExit: false,
        handler: async (ctx) => ({
          command: 'deploy',
          env: ctx.args.env,
        }),
      }).addFlag({
        name: 'env',
        options: ['-e', '--env'],
        type: 'string',
        mandatory: true,
      });

      const mainParser = new ArgParser({ autoExit: false })
        .addSubCommand({
          name: 'deploy',
          description: 'Deploy the application',
          parser: deployParser,
        });

      const result = await mainParser.parse(['deploy', '-e', 'production']);
      expect(result.command).toBe('deploy');
      expect(result.env).toBe('production');
    });
  });

  describe('Help Generation Example', () => {
    test('help text generation should work', () => {
      const parser = new ArgParser({
        appName: 'my-cli',
        description: 'A sample CLI tool',
        autoExit: false,
      });

      parser.addFlag({
        name: 'input',
        options: ['-i', '--input'],
        type: 'string',
        description: 'Input file',
      });

      const helpText = parser.helpText();
      
      expect(helpText).toContain('my-cli');
      expect(helpText).toContain('A sample CLI tool');
      expect(helpText).toContain('--input');
      expect(helpText).toContain('Input file');
    });
  });

  describe('Complex Example', () => {
    test('complex CLI with multiple features', async () => {
      const parser = new ArgParser({
        appName: 'data-processor',
        description: 'Process data files',
        autoExit: false,
        handler: async (ctx) => ({
          processed: true,
          files: ctx.args.files,
          verbose: ctx.args.verbose,
        }),
      });

      parser
        .addFlag({
          name: 'files',
          options: ['-f', '--file'],
          type: 'string',
          allowMultiple: true,
          mandatory: true,
          description: 'Files to process',
        })
        .addFlag({
          name: 'verbose',
          options: ['-v', '--verbose'],
          type: 'boolean',
          flagOnly: true,
          defaultValue: false,
          description: 'Enable verbose output',
        })
        .addFlag({
          name: 'output',
          options: ['-o', '--output'],
          type: 'string',
          defaultValue: './output',
          description: 'Output directory',
        });

      const result = await parser.parse([
        '-f', 'data1.csv',
        '-f', 'data2.csv',
        '-v',
        '-o', './results',
      ]);

      expect(result.processed).toBe(true);
      expect(result.files).toEqual(['data1.csv', 'data2.csv']);
      expect(result.verbose).toBe(true);
    });
  });
});
