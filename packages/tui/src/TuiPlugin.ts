/**
 * TUI Plugin for ArgParser
 * 
 * This plugin adds OpenTUI integration to ArgParser.
 */

import type { IArgParserPlugin } from '@alcyone-labs/arg-parser';

export interface ITuiPluginOptions {
  /** Default theme */
  theme?: 'dark' | 'light';
  /** Enable mouse support */
  mouseSupport?: boolean;
  /** App title */
  title?: string;
}

/**
 * TUI Plugin implementation
 */
export class TuiPlugin implements IArgParserPlugin {
  readonly name = 'com.alcyone-labs.tui';
  readonly version = '1.0.0';
  
  private options: ITuiPluginOptions;
  
  constructor(options: ITuiPluginOptions = {}) {
    this.options = {
      theme: 'dark',
      mouseSupport: true,
      ...options,
    };
  }
  
  install(parser: any): any {
    // Store reference
    parser._tuiPlugin = this;
    
    // Extend parser with TUI methods
    parser.createTuiApp = this.createTuiApp.bind(this);
    parser.getTuiOptions = () => this.options;
    
    console.log('[TUI Plugin] OpenTUI integration enabled');
    
    return parser;
  }
  
  /**
   * Create a TUI app
   */
  private createTuiApp(config: any): any {
    // This would integrate with OpenTUI
    // For now, return a placeholder
    return {
      run: async () => {
        console.log('[TUI] Would start TUI app:', config);
        console.log('[TUI] Note: OpenTUI integration requires @opentui/core and @opentui/solid');
      },
      stop: () => {
        console.log('[TUI] Stopping TUI app');
      },
    };
  }
}

/**
 * Factory function for creating TUI plugin
 * 
 * @example
 * ```typescript
 * import { ArgParser } from '@alcyone-labs/arg-parser';
 * import { tuiPlugin } from '@alcyone-labs/arg-parser-tui';
 * 
 * const parser = new ArgParser({...})
 *   .use(tuiPlugin({
 *     theme: 'dark',
 *     mouseSupport: true
 *   }));
 * ```
 */
export function tuiPlugin(options?: ITuiPluginOptions): TuiPlugin {
  return new TuiPlugin(options);
}
