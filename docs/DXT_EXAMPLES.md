# DXT Practical Examples

This document provides real-world examples demonstrating different DXT types, path handling patterns, and common use cases for building DXT-compatible applications.

## Table of Contents

- [File Processing Tools](#file-processing-tools)
- [Web Servers & APIs](#web-servers--apis)
- [Data Analysis Tools](#data-analysis-tools)
- [Development Utilities](#development-utilities)
- [Content Management](#content-management)
- [System Administration](#system-administration)

## File Processing Tools

### Image Converter

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "image-converter",
    version: "1.0.0",
    logPath: "${HOME}/logs/image-converter.log",
  })
  .addFlag({
    name: "input",
    description: "Input image file to convert",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      title: "Select Image File",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Directory for converted images",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/converted-images",
      title: "Output Directory",
    },
  })
  .addFlag({
    name: "quality",
    description: "Image quality percentage (1-100)",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 100,
      localDefault: 85,
      title: "Quality (%)",
    },
  })
  .addFlag({
    name: "format",
    description: "Output format",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "jpg",
      title: "Output Format",
    },
  })
  .addTool({
    name: "convert",
    description: "Convert image to specified format",
    handler: async (args) => {
      const outputPath = DxtPathResolver.resolvePath(`${args.outputDir}/converted.${args.format}`);

      console.log(`Converting ${args.input} to ${outputPath}`);
      console.log(`Quality: ${args.quality}%`);

      // Image conversion logic here...

      return {
        success: true,
        outputPath,
        quality: args.quality,
      };
    },
  });
```

### Batch File Processor

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "batch-processor",
    version: "2.1.0",
    logPath: "${HOME}/logs/batch-processor.log",
  })
  .addFlag({
    name: "input-files",
    description: "Files to process",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      multiple: true,
      title: "Select Files to Process",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Output directory for processed files",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/batch-output",
    },
  })
  .addFlag({
    name: "parallel",
    description: "Enable parallel processing",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: true,
      title: "Parallel Processing",
    },
  })
  .addFlag({
    name: "max-workers",
    description: "Maximum number of worker threads",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 16,
      localDefault: 4,
    },
  })
  .addTool({
    name: "process",
    description: "Process all selected files",
    handler: async (args) => {
      const outputDir = DxtPathResolver.resolvePath(args.outputDir);
      await DxtPathResolver.ensureDirectory(outputDir);

      const results = [];
      for (const file of args.inputFiles) {
        console.log(`Processing: ${file}`);
        // Processing logic...
        results.push({ file, status: "completed" });
      }

      return {
        success: true,
        processed: results.length,
        outputDir,
        parallel: args.parallel,
      };
    },
  });
```

## Web Servers & APIs

### Development Server

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "dev-server",
    version: "1.5.0",
    logPath: "${HOME}/logs/dev-server.log",
  })
  .addFlag({
    name: "port",
    description: "Server port number",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1024,
      max: 65535,
      localDefault: 3000,
      title: "Port",
    },
  })
  .addFlag({
    name: "host",
    description: "Server hostname",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "localhost",
      title: "Hostname",
    },
  })
  .addFlag({
    name: "static-dir",
    description: "Static files directory",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${__dirname}/public",
      title: "Static Files Directory",
    },
  })
  .addFlag({
    name: "ssl-cert",
    description: "SSL certificate file (optional)",
    type: "string",
    dxtOptions: {
      type: "file",
      title: "SSL Certificate",
    },
  })
  .addFlag({
    name: "ssl-key",
    description: "SSL private key file (optional)",
    type: "string",
    dxtOptions: {
      type: "file",
      sensitive: true,
      title: "SSL Private Key",
    },
  })
  .addFlag({
    name: "debug",
    description: "Enable debug logging",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: false,
      title: "Debug Mode",
    },
  })
  .addTool({
    name: "start",
    description: "Start the development server",
    handler: async (args) => {
      const staticDir = DxtPathResolver.resolvePath(args.staticDir);

      console.log(`Starting server on ${args.host}:${args.port}`);
      console.log(`Static files: ${staticDir}`);

      if (args.sslCert && args.sslKey) {
        console.log("SSL enabled");
      }

      // Server startup logic...

      return {
        success: true,
        url: `http${args.sslCert ? "s" : ""}://${args.host}:${args.port}`,
        staticDir,
        debug: args.debug,
      };
    },
  });
```

## Data Analysis Tools

### CSV Analyzer

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "csv-analyzer",
    version: "1.2.0",
    logPath: "${HOME}/logs/csv-analyzer.log",
  })
  .addFlag({
    name: "input-csv",
    description: "CSV file to analyze",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      title: "Select CSV File",
    },
  })
  .addFlag({
    name: "output-report",
    description: "Output report file",
    type: "string",
    dxtOptions: {
      type: "file",
      localDefault: "${DOCUMENTS}/analysis-report.html",
      title: "Report Output File",
    },
  })
  .addFlag({
    name: "delimiter",
    description: "CSV delimiter character",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: ",",
      title: "Delimiter",
    },
  })
  .addFlag({
    name: "sample-size",
    description: "Number of rows to sample for analysis",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 100,
      max: 1000000,
      localDefault: 10000,
      title: "Sample Size",
    },
  })
  .addFlag({
    name: "include-charts",
    description: "Generate charts in the report",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: true,
      title: "Include Charts",
    },
  })
  .addTool({
    name: "analyze",
    description: "Analyze the CSV file and generate report",
    handler: async (args) => {
      const reportPath = DxtPathResolver.resolvePath(args.outputReport);
      await DxtPathResolver.ensureDirectory(reportPath);

      console.log(`Analyzing ${args.inputCsv}`);
      console.log(`Sample size: ${args.sampleSize} rows`);
      console.log(`Report will be saved to: ${reportPath}`);

      // Analysis logic...

      return {
        success: true,
        reportPath,
        rowsAnalyzed: args.sampleSize,
        chartsIncluded: args.includeCharts,
      };
    },
  });
```

## Development Utilities

### Code Generator

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "code-generator",
    version: "2.0.0",
    logPath: "${HOME}/logs/code-generator.log",
  })
  .addFlag({
    name: "template-dir",
    description: "Directory containing code templates",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${__dirname}/templates",
      title: "Templates Directory",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Output directory for generated code",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "directory",
      title: "Output Directory",
    },
  })
  .addFlag({
    name: "config-file",
    description: "Configuration file for code generation",
    type: "string",
    dxtOptions: {
      type: "file",
      localDefault: "${__dirname}/codegen.config.json",
    },
  })
  .addFlag({
    name: "language",
    description: "Target programming language",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "typescript",
      title: "Programming Language",
    },
  })
  .addFlag({
    name: "overwrite",
    description: "Overwrite existing files",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: false,
      title: "Overwrite Existing Files",
    },
  })
  .addTool({
    name: "generate",
    description: "Generate code from templates",
    handler: async (args) => {
      const templateDir = DxtPathResolver.resolvePath(args.templateDir);
      const outputDir = DxtPathResolver.resolvePath(args.outputDir);
      const configPath = DxtPathResolver.resolvePath(args.configFile);

      await DxtPathResolver.ensureDirectory(outputDir);

      console.log(`Generating ${args.language} code`);
      console.log(`Templates: ${templateDir}`);
      console.log(`Output: ${outputDir}`);

      // Code generation logic...

      return {
        success: true,
        language: args.language,
        outputDir,
        filesGenerated: 5,
        overwrite: args.overwrite,
      };
    },
  });
```

## Content Management

### Documentation Builder

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "docs-builder",
    version: "1.3.0",
    logPath: "${HOME}/logs/docs-builder.log",
  })
  .addFlag({
    name: "source-dir",
    description: "Source documentation directory",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "directory",
      title: "Documentation Source",
    },
  })
  .addFlag({
    name: "output-dir",
    description: "Built documentation output directory",
    type: "string",
    dxtOptions: {
      type: "directory",
      localDefault: "${DOCUMENTS}/built-docs",
      title: "Output Directory",
    },
  })
  .addFlag({
    name: "theme",
    description: "Documentation theme",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "default",
      title: "Theme",
    },
  })
  .addFlag({
    name: "base-url",
    description: "Base URL for the documentation site",
    type: "string",
    dxtOptions: {
      type: "string",
      localDefault: "/",
      title: "Base URL",
    },
  })
  .addFlag({
    name: "watch",
    description: "Watch for changes and rebuild automatically",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: false,
      title: "Watch Mode",
    },
  })
  .addFlag({
    name: "minify",
    description: "Minify output files",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: true,
      title: "Minify Output",
    },
  })
  .addTool({
    name: "build",
    description: "Build the documentation site",
    handler: async (args) => {
      const sourceDir = DxtPathResolver.resolvePath(args.sourceDir);
      const outputDir = DxtPathResolver.resolvePath(args.outputDir);

      await DxtPathResolver.ensureDirectory(outputDir);

      console.log(`Building documentation from ${sourceDir}`);
      console.log(`Output: ${outputDir}`);
      console.log(`Theme: ${args.theme}`);

      // Documentation building logic...

      return {
        success: true,
        sourceDir,
        outputDir,
        theme: args.theme,
        pagesBuilt: 25,
        minified: args.minify,
      };
    },
  });
```

## System Administration

### Log Analyzer

```typescript
import { ArgParser, DxtPathResolver } from "@alcyone-labs/arg-parser";

const parser = new ArgParser()
  .withMcp({
    name: "log-analyzer",
    version: "1.4.0",
    logPath: "${HOME}/logs/log-analyzer.log",
  })
  .addFlag({
    name: "log-files",
    description: "Log files to analyze",
    type: "string",
    mandatory: true,
    dxtOptions: {
      type: "file",
      multiple: true,
      title: "Select Log Files",
    },
  })
  .addFlag({
    name: "output-report",
    description: "Analysis report output file",
    type: "string",
    dxtOptions: {
      type: "file",
      localDefault: "${DOCUMENTS}/log-analysis-report.json",
      title: "Report File",
    },
  })
  .addFlag({
    name: "time-range",
    description: "Time range in hours to analyze",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 8760, // 1 year
      localDefault: 24,
      title: "Time Range (hours)",
    },
  })
  .addFlag({
    name: "error-threshold",
    description: "Error count threshold for alerts",
    type: "number",
    dxtOptions: {
      type: "number",
      min: 1,
      max: 10000,
      localDefault: 100,
      title: "Error Threshold",
    },
  })
  .addFlag({
    name: "include-debug",
    description: "Include debug level logs in analysis",
    type: "boolean",
    dxtOptions: {
      type: "boolean",
      localDefault: false,
      title: "Include Debug Logs",
    },
  })
  .addTool({
    name: "analyze",
    description: "Analyze log files and generate report",
    handler: async (args) => {
      const reportPath = DxtPathResolver.resolvePath(args.outputReport);
      await DxtPathResolver.ensureDirectory(reportPath);

      console.log(`Analyzing ${args.logFiles.length} log files`);
      console.log(`Time range: ${args.timeRange} hours`);
      console.log(`Error threshold: ${args.errorThreshold}`);

      // Log analysis logic...

      return {
        success: true,
        filesAnalyzed: args.logFiles.length,
        reportPath,
        errorsFound: 45,
        warningsFound: 123,
        timeRange: args.timeRange,
      };
    },
  });
```

## Common Patterns Summary

### File Input/Output Pattern

```typescript
// Input file selection
dxtOptions: {
  type: "file",
  title: "Select Input File"
}

// Output directory with smart default
dxtOptions: {
  type: "directory",
  localDefault: "${DOCUMENTS}/app-output"
}
```

### Server Configuration Pattern

```typescript
// Port with validation
dxtOptions: {
  type: "number",
  min: 1024,
  max: 65535,
  localDefault: 3000
}

// Host configuration
dxtOptions: {
  type: "string",
  localDefault: "localhost"
}
```

### Security Pattern

```typescript
// Sensitive data handling
dxtOptions: {
  type: "string",
  sensitive: true // Excluded from DXT manifest
}
```

### Multi-value Pattern

```typescript
// Multiple file selection
dxtOptions: {
  type: "file",
  multiple: true,
  title: "Select Files"
}
```

These examples demonstrate how to build robust, user-friendly applications that work seamlessly in both development and DXT environments while providing rich configuration interfaces for end users.
