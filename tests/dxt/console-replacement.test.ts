import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DxtGenerator } from '../../src/DxtGenerator';
import { ArgParser } from '../../src/ArgParser';

describe('DXT Console Replacement', () => {
  let tempDir: string;
  let dxtGenerator: DxtGenerator;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = path.join(__dirname, 'temp-console-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a mock ArgParser instance
    const mockArgParser = new ArgParser({ appName: 'test-app' });
    dxtGenerator = new DxtGenerator(mockArgParser);

    // Store original LOCAL_BUILD env var
    originalEnv = process.env['LOCAL_BUILD'];
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore original env var
    if (originalEnv !== undefined) {
      process.env['LOCAL_BUILD'] = originalEnv;
    } else {
      delete process.env['LOCAL_BUILD'];
    }
  });

  describe('processCliSourceForMcp', () => {
    it('should replace global console with MCP-compliant logger', () => {
      const input = `
import { ArgParser } from '@alcyone-labs/arg-parser';

function test() {
  console.log('Hello world');
  console.log('Multiple', 'arguments', 123);
}
`;

      // Access the private method using bracket notation
      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      expect(result).toContain('import { createMcpLogger } from \'@alcyone-labs/arg-parser\';');
      expect(result).toContain('const mcpLogger = createMcpLogger(\'[CLI]\');');
      expect(result).toContain('globalThis.console = {');
      expect(result).toContain('log: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('error: originalConsole.error');
      // Original console.log calls should remain unchanged since we're replacing the global object
      expect(result).toContain('console.log(\'Hello world\');');
    });

    it('should set up global console replacement for warn/info/debug', () => {
      const input = `
console.warn('This is a warning');
console.info('Info message');
console.debug('Debug message');
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      expect(result).toContain('warn: (...args) => mcpLogger.warn(...args)');
      expect(result).toContain('info: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('debug: (...args) => mcpLogger.debug(...args)');
      // Original calls should remain unchanged since we're replacing the global object
      expect(result).toContain('console.warn(\'This is a warning\');');
      expect(result).toContain('console.info(\'Info message\');');
      expect(result).toContain('console.debug(\'Debug message\');');
    });

    it('should preserve console.error and other console methods', () => {
      const input = `
console.error('This should remain');
console.trace('This should remain');
console.log('This gets redirected');
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      expect(result).toContain('error: originalConsole.error');
      expect(result).toContain('trace: originalConsole.trace');
      expect(result).toContain('log: (...args) => mcpLogger.info(...args)');
      // Original calls should remain unchanged
      expect(result).toContain('console.error(\'This should remain\');');
      expect(result).toContain('console.trace(\'This should remain\');');
      expect(result).toContain('console.log(\'This gets redirected\');');
    });

    it('should handle dynamic console usage through global replacement', () => {
      const input = `
const count = 5;
const method = 'log';
console[method](\`Found \${count} items\`);
console.warn(\`Warning: \${count} issues detected\`);
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      // Global replacement should handle dynamic property access
      expect(result).toContain('globalThis.console = {');
      expect(result).toContain('log: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('warn: (...args) => mcpLogger.warn(...args)');
      // Original calls should remain unchanged
      expect(result).toContain('console[method](`Found ${count} items`);');
      expect(result).toContain('console.warn(`Warning: ${count} issues detected`);');
    });

    it('should insert console replacement after existing imports', () => {
      const input = `import { ArgParser } from '@alcyone-labs/arg-parser';
import chalk from 'chalk';

console.log('test');
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      const lines = result.split('\n');
      const argParserImportIndex = lines.findIndex(line => line.includes('ArgParser'));
      const chalkImportIndex = lines.findIndex(line => line.includes('chalk'));
      const loggerImportIndex = lines.findIndex(line => line.includes('createMcpLogger'));

      expect(argParserImportIndex).toBeGreaterThan(-1);
      expect(chalkImportIndex).toBeGreaterThan(-1);
      expect(loggerImportIndex).toBeGreaterThan(-1);
      expect(loggerImportIndex).toBeGreaterThan(Math.max(argParserImportIndex, chalkImportIndex));
    });

    it('should add console replacement at the beginning if no imports exist', () => {
      const input = `
// Configuration
const API_BASE = 'https://api.example.com';

console.log('Starting application');
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      expect(result.trim().startsWith('import { createMcpLogger }')).toBe(true);
    });

    it('should handle all console methods through global replacement', () => {
      const input = `
if (condition) { console.log('true'); } else { console.log('false'); }
console.warn('warning'); console.info('info'); console.debug('debug');
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](input);

      // Global replacement should handle all console methods
      expect(result).toContain('globalThis.console = {');
      expect(result).toContain('log: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('warn: (...args) => mcpLogger.warn(...args)');
      expect(result).toContain('info: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('debug: (...args) => mcpLogger.debug(...args)');
      // Original calls should remain unchanged
      expect(result).toContain('console.log(\'true\');');
      expect(result).toContain('console.log(\'false\');');
    });
  });

  describe('LOCAL_BUILD environment variable', () => {
    it('should use local file path when LOCAL_BUILD=1', () => {
      process.env['LOCAL_BUILD'] = '1';

      const serverInfo = {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server'
      };

      const packageJson = (dxtGenerator as any)['createDxtPackageJson'](serverInfo);

      expect(packageJson.dependencies['@alcyone-labs/arg-parser']).toBe('file:../../arg-parser-local.tgz');
    });

    it('should use version number when LOCAL_BUILD is not set', () => {
      delete process.env['LOCAL_BUILD'];

      const serverInfo = {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server'
      };

      const packageJson = (dxtGenerator as any)['createDxtPackageJson'](serverInfo);

      expect(packageJson.dependencies['@alcyone-labs/arg-parser']).toBe('^1.3.0');
    });

    it('should use version number when LOCAL_BUILD=0', () => {
      process.env['LOCAL_BUILD'] = '0';

      const serverInfo = {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server'
      };

      const packageJson = (dxtGenerator as any)['createDxtPackageJson'](serverInfo);

      expect(packageJson.dependencies['@alcyone-labs/arg-parser']).toBe('^1.3.0');
    });
  });

  describe('Integration test with real CLI source', () => {
    it('should process a realistic CLI file correctly with global console replacement', () => {
      const realisticCliSource = `
import { ArgParser } from '@alcyone-labs/arg-parser';
import chalk from 'chalk';

const cli = ArgParser.withMcp({
  appName: 'example-cli',
  handler: async (ctx) => {
    console.log(chalk.green('Processing request...'));

    if (ctx.args.verbose) {
      console.info('Verbose mode enabled');
      console.debug('Debug information');
    }

    try {
      const result = await processData(ctx.args.input);
      console.log(chalk.bold.green(\`Success: \${result.count} items processed\`));
      return { success: true, data: result };
    } catch (error) {
      console.error('Processing failed:', error);
      console.warn('Falling back to default behavior');
      return { success: false, error: error.message };
    }
  }
});

async function processData(input) {
  console.log('Processing data:', input);
  return { count: 42 };
}
`;

      const result = (dxtGenerator as any)['processCliSourceForMcp'](realisticCliSource);

      // Check that global console replacement is set up
      expect(result).toContain('import { createMcpLogger } from \'@alcyone-labs/arg-parser\';');
      expect(result).toContain('const mcpLogger = createMcpLogger(\'[CLI]\');');
      expect(result).toContain('globalThis.console = {');
      expect(result).toContain('log: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('info: (...args) => mcpLogger.info(...args)');
      expect(result).toContain('debug: (...args) => mcpLogger.debug(...args)');
      expect(result).toContain('warn: (...args) => mcpLogger.warn(...args)');
      expect(result).toContain('error: originalConsole.error');

      // Check that original console calls remain unchanged (they'll be handled by global replacement)
      expect(result).toContain('console.log(chalk.green(\'Processing request...\'));');
      expect(result).toContain('console.info(\'Verbose mode enabled\');');
      expect(result).toContain('console.debug(\'Debug information\');');
      expect(result).toContain('console.error(\'Processing failed:\', error);');
      expect(result).toContain('console.warn(\'Falling back to default behavior\');');
      expect(result).toContain('console.log(\'Processing data:\', input);');
    });
  });
});
