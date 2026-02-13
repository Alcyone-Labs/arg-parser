/**
 * DXT Plugin for ArgParser
 * 
 * This plugin adds DXT package generation capabilities to ArgParser.
 */

import type { IArgParserPlugin } from '@alcyone-labs/arg-parser';
import { DxtGenerator } from './DxtGenerator';

export interface IDxtPluginOptions {
  /** Output directory for DXT packages (default: './dxt') */
  outputDir?: string;
  /** Additional files to include */
  include?: Array<string | { from: string; to: string }>;
  /** Whether to include node_modules */
  withNodeModules?: boolean;
}

/**
 * DXT Plugin implementation
 */
export class DxtPlugin implements IArgParserPlugin {
  readonly name = 'com.alcyone-labs.dxt';
  readonly version = '1.0.0';

  private options: IDxtPluginOptions;
  private generator: DxtGenerator | null = null;

  constructor(options: IDxtPluginOptions = {}) {
    this.options = {
      outputDir: './dxt',
      withNodeModules: false,
      ...options,
    };
  }

  install(parser: any): any {
    // Store reference
    parser._dxtPlugin = this;

    // Create generator with the parser instance
    this.generator = new DxtGenerator(parser);

    // Add DXT build flag handling
    this.addDxtBuildFlag(parser);

    // Extend parser with DXT methods
    parser.buildDxt = this.buildDxt.bind(this);
    parser.getDxtOptions = () => this.options;

    return parser;
  }

  /**
   * Build DXT package
   */
  async buildDxt(entryPoint: string, outputDir?: string): Promise<any> {
    if (!this.generator) {
      throw new Error('DxtPlugin has not been installed yet. Call install() first.');
    }
    const targetDir = outputDir || this.options.outputDir || './dxt';
    const processArgs = ['--s-build-dxt', targetDir];
    if (this.options.withNodeModules) {
      processArgs.push('--s-with-node-modules');
    }
    // Temporarily set process.argv[1] to the entry point for handleBuildDxtFlag
    const originalArgv1 = process.argv[1];
    process.argv[1] = entryPoint;
    try {
      return await this.generator.handleBuildDxtFlag(processArgs, 0);
    } finally {
      process.argv[1] = originalArgv1;
    }
  }

  /**
   * Add DXT build flag to parser
   */
  private addDxtBuildFlag(_parser: any): void {
    // The DXT plugin works with the --s-build-dxt flag
    // This would be handled during parsing
    console.log('[DXT Plugin] DXT build support enabled');
  }
}

/**
 * Factory function for creating DXT plugin
 * 
 * @example
 * ```typescript
 * import { ArgParser } from '@alcyone-labs/arg-parser';
 * import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
 * import { dxtPlugin } from '@alcyone-labs/arg-parser-dxt';
 * 
 * const parser = new ArgParser({...})
 *   .use(mcpPlugin({...}))
 *   .use(dxtPlugin({
 *     outputDir: './dist/dxt',
 *     include: ['assets', 'config.json']
 *   }));
 * ```
 */
export function dxtPlugin(options?: IDxtPluginOptions): DxtPlugin {
  return new DxtPlugin(options);
}
