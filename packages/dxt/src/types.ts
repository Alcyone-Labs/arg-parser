/**
 * DXT Plugin Types
 */

/**
 * DXT build options
 */
export interface DxtBuildOptions {
  outputDir?: string;
  include?: Array<string | { from: string; to: string }>;
  withNodeModules?: boolean;
}

/**
 * DXT manifest structure
 */
export interface DxtManifest {
  dxt_version: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  server: {
    type: string;
    entry_point: string;
    mcp_config: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
  tools: DxtToolInfo[];
  icon?: string;
  user_config?: DxtUserConfig;
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
}

/**
 * DXT tool information
 */
export interface DxtToolInfo {
  name: string;
  description?: string;
}

/**
 * DXT user configuration
 */
export interface DxtUserConfig {
  [key: string]: {
    type: 'string' | 'directory' | 'file' | 'boolean' | 'number';
    title: string;
    description: string;
    required: boolean;
    sensitive: boolean;
    multiple?: boolean;
    min?: number;
    max?: number;
    default?: any;
  };
}

/**
 * DXT build result
 */
export interface DxtBuildResult {
  success: boolean;
  outputPath: string;
  manifest: DxtManifest;
}
