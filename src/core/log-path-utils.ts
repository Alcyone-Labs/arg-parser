import * as fs from "node:fs";
import * as path from "node:path";
import { DxtPathResolver } from "./dxt-path-resolver";

/**
 * Configuration object for log path with explicit relative base
 */
export interface LogPathConfig {
  /** The log file path */
  path: string;
  /** What the path should be relative to */
  relativeTo?: "entry" | "cwd" | "absolute";
  /** Manual base path override (used with relativeTo: 'absolute') */
  basePath?: string;
}

/**
 * Log path can be a simple string or a configuration object
 */
export type LogPath = string | LogPathConfig;

/**
 * Attempts to detect the entry point script using multiple methods
 * @returns The detected entry point path or null if detection fails
 */
export function detectEntryPoint(): string | null {
  try {
    // Method 1: Check process.argv[1] (most reliable for direct execution)
    if (process.argv[1] && fs.existsSync(process.argv[1])) {
      return process.argv[1];
    }

    // Method 2: ES modules - import.meta.url (when available)
    // Note: This needs to be handled by the caller since import.meta is not available in all contexts

    // Method 3: CommonJS - __filename (when available)
    // Note: This also needs to be handled by the caller since __filename is not available in ES modules

    // Method 4: Try to find main module from require.main (CommonJS)
    if (
      typeof require !== "undefined" &&
      require.main &&
      require.main.filename
    ) {
      return require.main.filename;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to get entry point from import.meta.url when in ES module context
 * @param importMetaUrl The import.meta.url value
 * @returns The file path
 */
export function getEntryPointFromImportMeta(importMetaUrl: string): string {
  // Simple URL to path conversion for file:// URLs
  if (importMetaUrl.startsWith("file://")) {
    return decodeURIComponent(importMetaUrl.replace("file://", ""));
  }
  return importMetaUrl;
}

/**
 * Helper to validate and normalize a log path string
 * @param path The path to validate
 * @returns The normalized path
 */
function normalizePath(path: string): string {
  // Remove any trailing/leading whitespace
  return path.trim();
}

/**
 * Resolves a log path configuration to an absolute file path
 * @param logPath The log path configuration (string or object)
 * @param fallbackEntryPoint Optional fallback entry point if detection fails
 * @returns Absolute path to the log file
 */
export function resolveLogPath(
  logPath: LogPath,
  fallbackEntryPoint?: string,
): string {
  // Handle string inputs
  if (typeof logPath === "string") {
    // First, substitute any DXT variables in the path
    const pathWithVariables = DxtPathResolver.substituteVariables(
      logPath,
      DxtPathResolver.detectContext()
    );
    const normalizedPath = normalizePath(pathWithVariables);

    // Absolute paths - return as-is
    if (path.isAbsolute(normalizedPath)) {
      return normalizedPath;
    }

    // Explicit process.cwd() relative paths
    if (normalizedPath.startsWith("cwd:")) {
      const relativePath = normalizedPath.slice(4); // Remove "cwd:" prefix
      return path.resolve(process.cwd(), relativePath);
    }

    // Default behavior: relative to entry point
    const entryPoint = detectEntryPoint() || fallbackEntryPoint;
    if (entryPoint) {
      return path.resolve(path.dirname(entryPoint), normalizedPath);
    }

    // Fallback to process.cwd() if entry point detection fails
    console.warn(
      `Warning: Could not detect entry point for log path resolution. ` +
        `Using process.cwd() as fallback. Path: ${normalizedPath}`,
    );
    return path.resolve(process.cwd(), normalizedPath);
  }

  // Handle object form
  const { path: logFilePath, relativeTo = "entry", basePath } = logPath;
  // Substitute DXT variables in the path
  const pathWithVariables = DxtPathResolver.substituteVariables(
    logFilePath,
    DxtPathResolver.detectContext()
  );
  const normalizedPath = normalizePath(pathWithVariables);

  switch (relativeTo) {
    case "absolute":
      if (basePath) {
        // Substitute DXT variables in basePath as well
        const resolvedBasePath = DxtPathResolver.substituteVariables(
          basePath,
          DxtPathResolver.detectContext()
        );
        return path.resolve(resolvedBasePath, normalizedPath);
      }
      if (path.isAbsolute(normalizedPath)) {
        return normalizedPath;
      }
      // If no basePath provided and path is not absolute, fall back to process.cwd()
      console.warn(
        `Warning: relativeTo 'absolute' specified but no basePath provided and path is not absolute. ` +
          `Using process.cwd() as fallback. Path: ${normalizedPath}`,
      );
      return path.resolve(process.cwd(), normalizedPath);

    case "cwd":
      return path.resolve(process.cwd(), normalizedPath);

    case "entry":
    default:
      const entryPoint = detectEntryPoint() || fallbackEntryPoint;
      if (entryPoint) {
        return path.resolve(path.dirname(entryPoint), normalizedPath);
      }

      // Fallback to process.cwd() if entry point detection fails
      console.warn(
        `Warning: Could not detect entry point for log path resolution. ` +
          `Using process.cwd() as fallback. Path: ${normalizedPath}`,
      );
      return path.resolve(process.cwd(), normalizedPath);
  }
}

/**
 * Creates a log path configuration for entry-point relative logging
 * @param path The relative path from the entry point
 * @returns LogPathConfig object
 */
export function entryRelative(path: string): LogPathConfig {
  return {
    path,
    relativeTo: "entry",
  };
}

/**
 * Creates a log path configuration for process.cwd() relative logging
 * @param path The relative path from process.cwd()
 * @returns LogPathConfig object
 */
export function cwdRelative(path: string): LogPathConfig {
  return {
    path,
    relativeTo: "cwd",
  };
}

/**
 * Creates a log path configuration for absolute path logging
 * @param path The absolute path or relative path
 * @param basePath Optional base path to resolve relative paths against
 * @returns LogPathConfig object
 */
export function absolutePath(path: string, basePath?: string): LogPathConfig {
  return {
    path,
    relativeTo: "absolute",
    basePath,
  };
}

/**
 * Utility to help migrate from old relative-to-cwd behavior
 * @param path The path that was previously relative to cwd
 * @returns String with explicit cwd: prefix
 */
export function legacyCwdPath(path: string): string {
  return `cwd:${path}`;
}
