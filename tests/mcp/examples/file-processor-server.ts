#!/usr/bin/env node
/**
 * Real-World MCP Example: File Processor Server
 *
 * This example demonstrates a practical MCP server that provides file processing
 * capabilities to AI assistants. It showcases:
 * - Complex file operations (read, write, analyze, transform)
 * - Error handling and validation
 * - Multiple sub-commands with different parameter sets
 * - Real-world use cases for AI-assisted file processing
 *
 * Usage:
 *   # CLI mode
 *   bun tests/mcp/examples/file-processor-server.ts --file input.txt --operation read
 *
 *   # MCP server mode
 *   bun tests/mcp/examples/file-processor-server.ts serve
 *
 *   # MCP server with specific transport
 *   bun tests/mcp/examples/file-processor-server.ts serve --transport sse --port 3001
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { ArgParser } from "../../../src";

const cli = ArgParser.withMcp({
  appName: "File Processor",
  appCommandName: "file-processor",
  description:
    "Advanced file processing tools for AI assistants. Provides file analysis, transformation, and management capabilities.",
  handler: async (ctx) => {
    const filePath = resolve(ctx.args.file);
    const operation = ctx.args.operation;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    switch (operation) {
      case "read":
        const content = readFileSync(filePath, "utf-8");
        return {
          operation: "read",
          file: filePath,
          content,
          size: content.length,
          lines: content.split("\n").length,
          encoding: "utf-8",
        };

      case "info":
        return {
          operation: "info",
          file: filePath,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          extension: extname(filePath),
          basename: basename(filePath),
          directory: dirname(filePath),
        };

      case "hash":
        const fileContent = readFileSync(filePath);
        const hash = createHash("sha256").update(fileContent).digest("hex");
        return {
          operation: "hash",
          file: filePath,
          hash,
          algorithm: "sha256",
          size: stats.size,
        };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
})
  .addFlags([
    {
      name: "file",
      description: "Path to the file to process",
      options: ["--file", "-f"],
      type: "string",
      mandatory: true,
    },
    {
      name: "operation",
      description: "Operation to perform on the file",
      options: ["--operation", "-o"],
      type: "string",
      enum: ["read", "info", "hash"],
      mandatory: true,
    },
  ])
  .addSubCommand({
    name: "analyze",
    description: "Analyze file content and structure",
    handler: async (ctx) => {
      const filePath = resolve(ctx.args.file);
      const analysisType = ctx.args.type;

      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const words = content.split(/\s+/).filter((word) => word.length > 0);
      const chars = content.length;

      let analysis: any = {
        file: filePath,
        type: analysisType,
        basic: {
          lines: lines.length,
          words: words.length,
          characters: chars,
          size: Buffer.byteLength(content, "utf-8"),
        },
      };

      if (analysisType === "detailed" || analysisType === "full") {
        analysis.detailed = {
          emptyLines: lines.filter((line) => line.trim() === "").length,
          longestLine: Math.max(...lines.map((line) => line.length)),
          averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
          wordFrequency: getWordFrequency(words.slice(0, 100)), // Top 100 words
          extension: extname(filePath),
          encoding: "utf-8",
        };
      }

      if (analysisType === "full") {
        analysis.advanced = {
          uniqueWords: new Set(words.map((w) => w.toLowerCase())).size,
          averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
          sentenceCount: content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
          paragraphCount: content.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length,
        };
      }

      return analysis;
    },
    parser: new ArgParser({}, [
      {
        name: "file",
        description: "Path to the file to analyze",
        options: ["--file", "-f"],
        type: "string",
        mandatory: true,
      },
      {
        name: "type",
        description: "Type of analysis to perform",
        options: ["--type", "-t"],
        type: "string",
        enum: ["basic", "detailed", "full"],
        defaultValue: "basic",
      },
    ]),
  })
  .addSubCommand({
    name: "transform",
    description: "Transform file content",
    handler: async (ctx) => {
      const inputPath = resolve(ctx.args.input);
      const outputPath = ctx.args.output ? resolve(ctx.args.output) : null;
      const transformation = ctx.args.transform;

      if (!existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      const content = readFileSync(inputPath, "utf-8");
      let transformedContent: string;

      switch (transformation) {
        case "uppercase":
          transformedContent = content.toUpperCase();
          break;
        case "lowercase":
          transformedContent = content.toLowerCase();
          break;
        case "reverse-lines":
          transformedContent = content.split("\n").reverse().join("\n");
          break;
        case "remove-empty-lines":
          transformedContent = content
            .split("\n")
            .filter((line) => line.trim() !== "")
            .join("\n");
          break;
        case "add-line-numbers":
          transformedContent = content
            .split("\n")
            .map((line, index) => `${(index + 1).toString().padStart(4, " ")}: ${line}`)
            .join("\n");
          break;
        default:
          throw new Error(`Unknown transformation: ${transformation}`);
      }

      const result: any = {
        transformation,
        input: inputPath,
        originalSize: content.length,
        transformedSize: transformedContent.length,
        preview:
          transformedContent.substring(0, 200) + (transformedContent.length > 200 ? "..." : ""),
      };

      if (outputPath) {
        writeFileSync(outputPath, transformedContent);
        result.output = outputPath;
        result.saved = true;
      } else {
        result.content = transformedContent;
        result.saved = false;
      }

      return result;
    },
    parser: new ArgParser({}, [
      {
        name: "input",
        description: "Input file path",
        options: ["--input", "-i"],
        type: "string",
        mandatory: true,
      },
      {
        name: "output",
        description: "Output file path (optional, returns content if not specified)",
        options: ["--output", "-o"],
        type: "string",
      },
      {
        name: "transform",
        description: "Transformation to apply",
        options: ["--transform", "-t"],
        type: "string",
        enum: ["uppercase", "lowercase", "reverse-lines", "remove-empty-lines", "add-line-numbers"],
        mandatory: true,
      },
    ]),
  })
  .addSubCommand({
    name: "search",
    description: "Search within files and directories",
    handler: async (ctx) => {
      const searchPath = resolve(ctx.args.path);
      const pattern = ctx.args.pattern;
      const recursive = ctx.args.recursive;
      const caseSensitive = ctx.args.caseSensitive;

      if (!existsSync(searchPath)) {
        throw new Error(`Path not found: ${searchPath}`);
      }

      const stats = statSync(searchPath);
      const results: any[] = [];

      if (stats.isFile()) {
        const matches = searchInFile(searchPath, pattern, caseSensitive);
        if (matches.length > 0) {
          results.push({
            file: searchPath,
            matches: matches.length,
            lines: matches,
          });
        }
      } else if (stats.isDirectory()) {
        const files = recursive ? getFilesRecursively(searchPath) : getFilesInDirectory(searchPath);

        for (const file of files) {
          try {
            const matches = searchInFile(file, pattern, caseSensitive);
            if (matches.length > 0) {
              results.push({
                file,
                matches: matches.length,
                lines: matches.slice(0, 10), // Limit to first 10 matches per file
              });
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }

      return {
        searchPath,
        pattern,
        recursive,
        caseSensitive,
        totalFiles: stats.isDirectory()
          ? recursive
            ? getFilesRecursively(searchPath).length
            : getFilesInDirectory(searchPath).length
          : 1,
        matchingFiles: results.length,
        results: results.slice(0, 50), // Limit results
      };
    },
    parser: new ArgParser({}, [
      {
        name: "path",
        description: "File or directory path to search",
        options: ["--path", "-p"],
        type: "string",
        mandatory: true,
      },
      {
        name: "pattern",
        description: "Search pattern (string or regex)",
        options: ["--pattern"],
        type: "string",
        mandatory: true,
      },
      {
        name: "recursive",
        description: "Search recursively in subdirectories",
        options: ["--recursive", "-r"],
        type: "boolean",
        flagOnly: true,
      },
      {
        name: "caseSensitive",
        description: "Case-sensitive search",
        options: ["--case-sensitive", "-c"],
        type: "boolean",
        flagOnly: true,
      },
    ]),
  })
  .addMcpSubCommand(
    "serve",
    {
      name: "file-processor-mcp-server",
      version: "1.0.0",
      description:
        "File processing MCP server providing advanced file analysis, transformation, and search capabilities for AI assistants",
    },
    {
      defaultTransports: [
        { type: "stdio" },
        { type: "sse", port: 3001, host: "localhost", path: "/file-processor" },
      ],
      toolOptions: {
        includeSubCommands: true,
        toolNamePrefix: "file-",
      },
    },
  );

// Helper functions
function getWordFrequency(words: string[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
    if (cleanWord.length > 0) {
      frequency[cleanWord] = (frequency[cleanWord] || 0) + 1;
    }
  });
  return frequency;
}

function searchInFile(
  filePath: string,
  pattern: string,
  caseSensitive: boolean,
): Array<{ lineNumber: number; line: string; match: string }> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const matches: Array<{ lineNumber: number; line: string; match: string }> = [];

  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  lines.forEach((line, index) => {
    const searchLine = caseSensitive ? line : line.toLowerCase();
    if (searchLine.includes(searchPattern)) {
      matches.push({
        lineNumber: index + 1,
        line: line.trim(),
        match: pattern,
      });
    }
  });

  return matches;
}

function getFilesInDirectory(dirPath: string): string[] {
  return readdirSync(dirPath)
    .map((file) => resolve(dirPath, file))
    .filter((filePath) => {
      try {
        return statSync(filePath).isFile();
      } catch {
        return false;
      }
    });
}

function getFilesRecursively(dirPath: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    try {
      const items = readdirSync(currentPath);
      items.forEach((item) => {
        const itemPath = resolve(currentPath, item);
        const stats = statSync(itemPath);

        if (stats.isFile()) {
          files.push(itemPath);
        } else if (stats.isDirectory()) {
          traverse(itemPath);
        }
      });
    } catch {
      // Skip directories that can't be read
    }
  }

  traverse(dirPath);
  return files;
}

// Export for testing
export default cli;

// Auto-execute only when run directly
await cli.parse(undefined, { importMetaUrl: import.meta.url });
