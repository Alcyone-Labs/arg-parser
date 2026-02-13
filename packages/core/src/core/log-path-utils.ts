/**
 * Log path utilities for ArgParser
 * 
 * Provides flexible path resolution for log files, supporting
 * relative paths (to entry point or cwd), absolute paths, and
 * configuration objects.
 */

import * as path from 'node:path';

/**
 * Log path can be a simple string or a configuration object
 */
export type LogPath = string | LogPathConfig;

/**
 * Configuration for log path resolution
 */
export interface LogPathConfig {
  /** The path string */
  path: string;
  /** How to resolve the path */
  relativeTo?: 'entry' | 'cwd' | 'absolute';
  /** Optional base path for 'entry' resolution */
  basePath?: string;
}

/**
 * Detect the entry point of the application
 */
export function detectEntryPoint(): string {
  // Try to get from process.argv[1]
  if (process.argv[1]) {
    return path.resolve(process.argv[1]);
  }
  
  // Fallback to cwd
  return process.cwd();
}

/**
 * Get entry point from import.meta.url
 */
export function getEntryPointFromImportMeta(importMetaUrl: string): string {
  try {
    const url = new URL(importMetaUrl);
    return url.pathname;
  } catch {
    return process.cwd();
  }
}

/**
 * Resolve a log path to an absolute path
 */
export function resolveLogPath(logPath: LogPath): string {
  if (typeof logPath === 'string') {
    // Handle explicit prefixes
    if (logPath.startsWith('cwd:')) {
      return path.resolve(process.cwd(), logPath.slice(4));
    }
    
    if (logPath.startsWith('entry:')) {
      const entryPoint = detectEntryPoint();
      const entryDir = path.dirname(entryPoint);
      return path.resolve(entryDir, logPath.slice(6));
    }
    
    if (path.isAbsolute(logPath)) {
      return logPath;
    }
    
    // Default: relative to entry point
    const entryPoint = detectEntryPoint();
    const entryDir = path.dirname(entryPoint);
    return path.resolve(entryDir, logPath);
  }
  
  // Handle LogPathConfig
  const { path: pathStr, relativeTo = 'entry', basePath } = logPath;
  
  if (relativeTo === 'absolute') {
    return pathStr;
  }
  
  if (relativeTo === 'cwd') {
    return path.resolve(process.cwd(), pathStr);
  }
  
  // relativeTo === 'entry'
  const entryPoint = basePath || detectEntryPoint();
  const entryDir = path.dirname(entryPoint);
  return path.resolve(entryDir, pathStr);
}

/**
 * Create a path relative to the entry point
 */
export function entryRelative(subPath: string): string {
  const entryPoint = detectEntryPoint();
  const entryDir = path.dirname(entryPoint);
  return path.resolve(entryDir, subPath);
}

/**
 * Create a path relative to the current working directory
 */
export function cwdRelative(subPath: string): string {
  return path.resolve(process.cwd(), subPath);
}

/**
 * Create an absolute path
 */
export function absolutePath(pathStr: string): string {
  return path.resolve(pathStr);
}

/**
 * Legacy cwd-relative path (for backward compatibility)
 */
export function legacyCwdPath(subPath: string): string {
  return cwdRelative(subPath);
}
