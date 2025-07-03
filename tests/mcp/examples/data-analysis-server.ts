#!/usr/bin/env node
/**
 * Real-World MCP Example: Data Analysis Server
 * 
 * This example demonstrates a sophisticated MCP server for data analysis tasks.
 * It showcases:
 * - Statistical analysis of datasets
 * - Data validation and cleaning
 * - Multiple data format support (JSON, CSV-like)
 * - Complex calculations and aggregations
 * - Error handling for malformed data
 * 
 * Usage:
 *   # CLI mode - analyze JSON data
 *   echo '{"values": [1,2,3,4,5]}' | bun tests/mcp/examples/data-analysis-server.ts --data-source stdin --format json
 *   
 *   # MCP server mode
 *   bun tests/mcp/examples/data-analysis-server.ts serve
 */

import { ArgParser } from "../../../src";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface DataPoint {
  [key: string]: number | string | boolean | null;
}

interface StatisticalSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  range: number;
  variance: number;
  standardDeviation: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
  };
}

const cli = ArgParser.withMcp({
  appName: "Data Analysis Server",
  appCommandName: "data-analyzer",
  description: "Advanced data analysis and statistical computation server for AI assistants. Provides comprehensive data processing, validation, and statistical analysis capabilities.",
  handler: async (ctx) => {
    const dataSource = ctx.args.dataSource;
    const format = ctx.args.format;
    const operation = ctx.args.operation || "summary";

    let rawData: string;

    // Get data from source
    if (dataSource === "stdin") {
      // In a real implementation, this would read from stdin
      throw new Error("STDIN data source not implemented in this example");
    } else {
      const filePath = resolve(dataSource);
      if (!existsSync(filePath)) {
        throw new Error(`Data file not found: ${filePath}`);
      }
      rawData = readFileSync(filePath, "utf-8");
    }

    // Parse data based on format
    let data: DataPoint[];
    try {
      if (format === "json") {
        const parsed = JSON.parse(rawData);
        data = Array.isArray(parsed) ? parsed : [parsed];
      } else if (format === "csv") {
        data = parseCsvData(rawData);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to parse ${format} data: ${error.message}`);
    }

    // Perform operation
    switch (operation) {
      case "summary":
        return generateDataSummary(data);
      case "validate":
        return validateData(data);
      case "clean":
        return cleanData(data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
})
.addFlags([
  {
    name: "dataSource",
    description: "Data source (file path or 'stdin')",
    options: ["--data-source", "-d"],
    type: "string",
    mandatory: true
  },
  {
    name: "format",
    description: "Data format",
    options: ["--format", "-f"],
    type: "string",
    enum: ["json", "csv"],
    mandatory: true
  },
  {
    name: "operation",
    description: "Analysis operation to perform",
    options: ["--operation", "-o"],
    type: "string",
    enum: ["summary", "validate", "clean"],
    defaultValue: "summary"
  }
])
.addSubCommand({
  name: "statistics",
  description: "Compute statistical measures for numeric data",
  handler: async (ctx) => {
    const values = parseNumberArray(ctx.args.values);
    const measures = ctx.args.measures;

    if (values.length === 0) {
      throw new Error("No valid numeric values provided");
    }

    const stats = computeStatistics(values);
    
    if (measures === "all") {
      return {
        operation: "statistics",
        inputCount: values.length,
        measures: "all",
        statistics: stats
      };
    } else {
      const requestedMeasures = measures.split(",").map(m => m.trim());
      const filteredStats: any = {};
      
      requestedMeasures.forEach(measure => {
        if (measure in stats) {
          filteredStats[measure] = (stats as any)[measure];
        }
      });

      return {
        operation: "statistics",
        inputCount: values.length,
        measures: requestedMeasures,
        statistics: filteredStats
      };
    }
  },
  parser: new ArgParser({}, [
    {
      name: "values",
      description: "Comma-separated numeric values or JSON array",
      options: ["--values", "-v"],
      type: "string",
      mandatory: true
    },
    {
      name: "measures",
      description: "Statistical measures to compute (comma-separated or 'all')",
      options: ["--measures", "-m"],
      type: "string",
      defaultValue: "mean,median,standardDeviation"
    }
  ])
})
.addSubCommand({
  name: "correlation",
  description: "Compute correlation between two datasets",
  handler: async (ctx) => {
    const dataset1 = parseNumberArray(ctx.args.dataset1);
    const dataset2 = parseNumberArray(ctx.args.dataset2);

    if (dataset1.length !== dataset2.length) {
      throw new Error("Datasets must have the same length");
    }

    if (dataset1.length < 2) {
      throw new Error("Datasets must contain at least 2 values");
    }

    const correlation = computeCorrelation(dataset1, dataset2);
    const covariance = computeCovariance(dataset1, dataset2);

    return {
      operation: "correlation",
      dataset1Length: dataset1.length,
      dataset2Length: dataset2.length,
      correlation: {
        pearson: correlation,
        covariance,
        strength: interpretCorrelation(correlation)
      },
      summary: {
        dataset1: computeStatistics(dataset1),
        dataset2: computeStatistics(dataset2)
      }
    };
  },
  parser: new ArgParser({}, [
    {
      name: "dataset1",
      description: "First dataset (comma-separated values or JSON array)",
      options: ["--dataset1", "-x"],
      type: "string",
      mandatory: true
    },
    {
      name: "dataset2",
      description: "Second dataset (comma-separated values or JSON array)",
      options: ["--dataset2", "-y"],
      type: "string",
      mandatory: true
    }
  ])
})
.addSubCommand({
  name: "outliers",
  description: "Detect outliers in numeric data",
  handler: async (ctx) => {
    const values = parseNumberArray(ctx.args.values);
    const method = ctx.args.method;
    const threshold = parseFloat(ctx.args.threshold);

    if (values.length < 4) {
      throw new Error("Need at least 4 values to detect outliers");
    }

    let outliers: Array<{value: number, index: number, score?: number}> = [];
    let stats = computeStatistics(values);

    if (method === "iqr") {
      const q1 = stats.quartiles.q1;
      const q3 = stats.quartiles.q3;
      const iqr = stats.quartiles.iqr;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      outliers = values
        .map((value, index) => ({ value, index }))
        .filter(item => item.value < lowerBound || item.value > upperBound);

    } else if (method === "zscore") {
      const mean = stats.mean;
      const stdDev = stats.standardDeviation;

      outliers = values
        .map((value, index) => {
          const zscore = Math.abs((value - mean) / stdDev);
          return { value, index, score: zscore };
        })
        .filter(item => item.score! > threshold);
    }

    return {
      operation: "outlier_detection",
      method,
      threshold: method === "zscore" ? threshold : undefined,
      inputCount: values.length,
      outlierCount: outliers.length,
      outlierPercentage: (outliers.length / values.length) * 100,
      outliers,
      statistics: stats
    };
  },
  parser: new ArgParser({}, [
    {
      name: "values",
      description: "Numeric values to analyze (comma-separated or JSON array)",
      options: ["--values", "-v"],
      type: "string",
      mandatory: true
    },
    {
      name: "method",
      description: "Outlier detection method",
      options: ["--method", "-m"],
      type: "string",
      enum: ["iqr", "zscore"],
      defaultValue: "iqr"
    },
    {
      name: "threshold",
      description: "Threshold for z-score method (default: 2.0)",
      options: ["--threshold", "-t"],
      type: "string",
      defaultValue: "2.0"
    }
  ])
})
.addMcpSubCommand("serve", {
  name: "data-analysis-mcp-server",
  version: "1.0.0",
  description: "Data analysis and statistical computation MCP server providing comprehensive data processing capabilities"
}, {
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3002, host: "localhost", path: "/data-analysis" }
  ],
  toolOptions: {
    includeSubCommands: true,
    toolNamePrefix: "data-"
  }
});

// Helper functions
function parseCsvData(csvData: string): DataPoint[] {
  const lines = csvData.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV data must have at least a header and one data row");
  }

  const headers = lines[0].split(",").map(h => h.trim());
  const data: DataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: DataPoint = {};

    headers.forEach((header, index) => {
      const value = values[index];
      // Try to parse as number, otherwise keep as string
      const numValue = parseFloat(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });

    data.push(row);
  }

  return data;
}

function parseNumberArray(input: string): number[] {
  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map(v => {
        const num = parseFloat(v);
        if (isNaN(num)) throw new Error(`Invalid number: ${v}`);
        return num;
      });
    }
  } catch {
    // Fall back to comma-separated parsing
  }

  return input.split(",").map(v => {
    const num = parseFloat(v.trim());
    if (isNaN(num)) throw new Error(`Invalid number: ${v.trim()}`);
    return num;
  });
}

function computeStatistics(values: number[]): StatisticalSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // Median
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Mode (most frequent value)
  const frequency: Record<number, number> = {};
  values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
  const maxFreq = Math.max(...Object.values(frequency));
  const modes = Object.keys(frequency).filter(key => frequency[parseFloat(key)] === maxFreq);
  const mode = modes.length === n ? null : parseFloat(modes[0]); // No mode if all values are unique

  // Variance and standard deviation
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);

  // Quartiles
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return {
    count: n,
    sum,
    mean,
    median,
    mode,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    variance,
    standardDeviation,
    quartiles: {
      q1,
      q2: median,
      q3,
      iqr
    }
  };
}

function computeCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

function computeCovariance(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  return x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0) / n;
}

function interpretCorrelation(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.9) return "very strong";
  if (abs >= 0.7) return "strong";
  if (abs >= 0.5) return "moderate";
  if (abs >= 0.3) return "weak";
  return "very weak";
}

function generateDataSummary(data: DataPoint[]): any {
  const summary: any = {
    recordCount: data.length,
    fields: {},
    dataTypes: {},
    completeness: {}
  };

  if (data.length === 0) {
    return summary;
  }

  const fields = Object.keys(data[0]);
  
  fields.forEach(field => {
    const values = data.map(record => record[field]).filter(val => val !== null && val !== undefined);
    const nonNullCount = values.length;
    
    summary.completeness[field] = {
      nonNull: nonNullCount,
      null: data.length - nonNullCount,
      completeness: (nonNullCount / data.length) * 100
    };

    // Determine data type
    const numericValues = values.filter(val => typeof val === "number" && !isNaN(val as number));
    const stringValues = values.filter(val => typeof val === "string");
    const booleanValues = values.filter(val => typeof val === "boolean");

    if (numericValues.length === values.length) {
      summary.dataTypes[field] = "numeric";
      summary.fields[field] = computeStatistics(numericValues as number[]);
    } else if (stringValues.length > 0) {
      summary.dataTypes[field] = "string";
      summary.fields[field] = {
        uniqueValues: new Set(stringValues).size,
        mostCommon: getMostCommon(stringValues as string[]),
        averageLength: stringValues.reduce((sum, str) => sum + (str as string).length, 0) / stringValues.length
      };
    } else if (booleanValues.length > 0) {
      summary.dataTypes[field] = "boolean";
      const trueCount = booleanValues.filter(val => val === true).length;
      summary.fields[field] = {
        trueCount,
        falseCount: booleanValues.length - trueCount,
        truePercentage: (trueCount / booleanValues.length) * 100
      };
    } else {
      summary.dataTypes[field] = "mixed";
      summary.fields[field] = { uniqueValues: new Set(values).size };
    }
  });

  return summary;
}

function validateData(data: DataPoint[]): any {
  const issues: Array<{type: string, field?: string, record?: number, message: string}> = [];
  
  if (data.length === 0) {
    issues.push({ type: "structure", message: "Dataset is empty" });
    return { valid: false, issues };
  }

  const fields = Object.keys(data[0]);
  
  // Check for consistent structure
  data.forEach((record, index) => {
    const recordFields = Object.keys(record);
    if (recordFields.length !== fields.length) {
      issues.push({
        type: "structure",
        record: index,
        message: `Record ${index} has ${recordFields.length} fields, expected ${fields.length}`
      });
    }
  });

  // Check for data quality issues
  fields.forEach(field => {
    const values = data.map(record => record[field]);
    const nullCount = values.filter(val => val === null || val === undefined).length;
    
    if (nullCount > data.length * 0.5) {
      issues.push({
        type: "quality",
        field,
        message: `Field '${field}' has ${nullCount} null values (${((nullCount/data.length)*100).toFixed(1)}%)`
      });
    }
  });

  return {
    valid: issues.length === 0,
    recordCount: data.length,
    fieldCount: fields.length,
    issues
  };
}

function cleanData(data: DataPoint[]): any {
  const cleaned = data.filter(record => {
    // Remove records where all values are null
    return Object.values(record).some(val => val !== null && val !== undefined);
  });

  const removedCount = data.length - cleaned.length;

  return {
    operation: "clean",
    originalCount: data.length,
    cleanedCount: cleaned.length,
    removedCount,
    data: cleaned
  };
}

function getMostCommon(values: string[]): { value: string; count: number } {
  const frequency: Record<string, number> = {};
  values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
  
  const maxCount = Math.max(...Object.values(frequency));
  const mostCommon = Object.keys(frequency).find(key => frequency[key] === maxCount)!;
  
  return { value: mostCommon, count: maxCount };
}

// Export for testing
export default cli;

// Run the CLI when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse(process.argv.slice(2));
}
