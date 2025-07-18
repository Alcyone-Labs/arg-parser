# Output Schema Support

The ArgParser library now provides comprehensive output schema support for both TypeScript type safety and JSON-RPC response validation. This feature enables you to define the expected structure of your command handlers' return values, providing better tooling integration and MCP compliance.

## Overview

Output schemas serve multiple purposes:

1. **Type Safety**: Ensure your handlers return data in the expected format
2. **MCP Integration**: Provide `output_schema` for MCP tools to enable better client tooling
3. **Documentation**: Self-document your API responses
4. **Validation**: Runtime validation of handler responses (optional)

## Quick Start

```typescript
import { ArgParser, OutputSchemaPatterns } from "@alcyone-labs/arg-parser";

// Method 1: Set output schema directly in tool definition (RECOMMENDED)
const parser = new ArgParser({
  appName: "My CLI",
  appCommandName: "my-cli",
  handler: async (ctx) => ({ success: true, message: "Done" }),
}).addTool({
  name: "process-data",
  description: "Process input data",
  flags: [
    {
      name: "input",
      description: "Input to process",
      options: ["--input"],
      type: "string",
      mandatory: true,
    },
  ],
  // 🎉 NEW: Output schema directly in tool definition!
  outputSchema: "successWithData", // Auto-completion supported!
  handler: async (ctx) => ({
    success: true,
    data: { processed: ctx.args.input },
    message: "Processing complete",
  }),
});

// Method 2: Set default schema for all tools (alternative approach)
const parser2 = new ArgParser({
  appName: "My CLI",
  appCommandName: "my-cli",
  handler: async (ctx) => ({
    success: true,
    data: { processed: ctx.args.input },
    message: "Processing complete",
  }),
})
  .addFlags([
    {
      name: "input",
      description: "Input to process",
      options: ["--input"],
      type: "string",
      mandatory: true,
    },
  ])
  // Set output schema using predefined pattern
  .setDefaultOutputSchema("successWithData");
```

## Predefined Schema Patterns

The library provides common response patterns out of the box:

### `successError`

Basic success/error response pattern:

```typescript
{
  success: boolean,
  message?: string,
  error?: string
}
```

### `successWithData`

Success response with data payload:

```typescript
{
  success: boolean,
  data: any, // or custom schema
  message?: string,
  error?: string
}
```

### `list`

Array/list response pattern:

```typescript
{
  items: any[], // or custom item schema
  count?: number,
  hasMore?: boolean
}
```

### `fileOperation`

File operation response pattern:

```typescript
{
  path: string,
  size?: number,
  created?: boolean,
  modified?: boolean,
  exists?: boolean
}
```

### `processExecution`

Process execution response pattern:

```typescript
{
  exitCode: number,
  stdout?: string,
  stderr?: string,
  duration?: number,
  command?: string
}
```

## Configuration Methods

### Method 1: Output Schema in Tool Definition (RECOMMENDED)

The cleanest and most intuitive way is to define output schemas directly in your tool configuration:

```typescript
parser
  .addTool({
    name: "file-processor",
    description: "Process files",
    flags: [
      /* ... */
    ],
    // 🎉 Output schema with auto-completion!
    outputSchema: "fileOperation", // Predefined pattern
    handler: async (ctx) => ({
      /* ... */
    }),
  })
  .addTool({
    name: "data-analyzer",
    description: "Analyze data",
    flags: [
      /* ... */
    ],
    // Custom Zod schema
    outputSchema: z.object({
      results: z.array(z.any()),
      summary: z.object({
        total: z.number(),
        processed: z.number(),
      }),
    }),
    handler: async (ctx) => ({
      /* ... */
    }),
  })
  .addTool({
    name: "report-generator",
    description: "Generate reports",
    flags: [
      /* ... */
    ],
    // Schema definition object
    outputSchema: {
      report: z.object({
        id: z.string(),
        format: z.string(),
        size: z.number(),
      }),
      downloadUrl: z.string(),
    },
    handler: async (ctx) => ({
      /* ... */
    }),
  });
```

### Method 2: Setting Default Output Schema

Set a default schema for all tools generated from this parser:

```typescript
// Using predefined pattern
parser.setDefaultOutputSchema("successWithData");

// Using custom Zod schema
parser.setDefaultOutputSchema(
  z.object({
    result: z.string(),
    timestamp: z.string(),
  }),
);

// Using schema definition object
parser.setDefaultOutputSchema({
  result: z.string().describe("Operation result"),
  metadata: z.object({
    version: z.string(),
    timestamp: z.string(),
  }),
});
```

### Method 3: Setting Tool-Specific Schemas (Alternative)

Set different schemas for specific tools using method chaining:

```typescript
parser
  .setOutputSchema("main-command", "successError")
  .setOutputSchema("process-file", "fileOperation")
  .setOutputSchema("run-command", "processExecution");
```

### Automatic Schema Generation

Enable automatic schema generation for tools without explicit schemas:

```typescript
// Use default pattern (successWithData)
parser.enableAutoOutputSchema(true);

// Use specific pattern
parser.enableAutoOutputSchema("successError");
```

## Advanced Usage

### Custom Zod Schemas

Create complex custom schemas using Zod:

```typescript
import { z } from "zod";

const customSchema = z.object({
  queryResult: z.object({
    rows: z.array(z.any()),
    count: z.number(),
    executionTime: z.number(),
  }),
  metadata: z.object({
    database: z.string(),
    timestamp: z.string(),
  }),
});

parser.setDefaultOutputSchema(customSchema);
```

### Schema Definition Objects

Use plain objects that get converted to Zod schemas:

```typescript
parser.setDefaultOutputSchema({
  response: z.object({
    status: z.string(),
    data: z.any(),
  }),
  statusCode: z.number(),
  headers: z.record(z.string()),
  timing: z.object({
    total: z.number(),
    dns: z.number(),
    connect: z.number(),
  }),
});
```

### Patterns with Custom Data Schemas

Customize predefined patterns with specific data schemas:

```typescript
import { OutputSchemaPatterns } from "@alcyone-labs/arg-parser";

// List pattern with custom item schema
const userListSchema = OutputSchemaPatterns.list(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
);

// Success with data pattern with custom data schema
const apiResponseSchema = OutputSchemaPatterns.successWithData(
  z.object({
    users: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
    pagination: z.object({
      page: z.number(),
      total: z.number(),
    }),
  }),
);
```

## MCP Integration

Output schemas are automatically included in MCP tool definitions:

```typescript
const parser = new ArgParser({...})
  .setDefaultOutputSchema('successWithData');

// Generate MCP tools with output schemas
const mcpTools = parser.toMcpTools();

// Each tool will have an outputSchema property
mcpTools.forEach(tool => {
  console.log(`${tool.name} has output schema:`, !!tool.outputSchema);
});
```

### Priority Order

When generating MCP tools, schemas are resolved in this priority order:

1. **Explicit schema map** (passed to `toMcpTools()` options)
2. **Tool-level schemas** (defined in `addTool()` `outputSchema` property) 🎉 **NEW!**
3. **Instance-level tool-specific schemas** (set via `setOutputSchema()`)
4. **Instance-level default schema** (set via `setDefaultOutputSchema()`)
5. **Auto-generated schemas** (if enabled via `enableAutoOutputSchema()`)

```typescript
const tools = parser
  .addTool({
    name: "my-tool",
    outputSchema: "fileOperation", // Priority #2 - Tool-level schema
    // ... other config
  })
  .setOutputSchema("my-tool", "successError") // Priority #3 - Would be overridden
  .toMcpTools({
    // Priority #1 - Highest priority, explicit schema map
    outputSchemaMap: {
      "my-tool": customSchema, // This would override tool-level schema
    },
    // Priority #5 - Lowest priority, auto-generation
    autoGenerateOutputSchema: "processExecution",
  });
```

## Utility Functions

### `createOutputSchema()`

Create schemas from various input formats:

```typescript
import { createOutputSchema } from "@alcyone-labs/arg-parser";

// From pattern name
const schema1 = createOutputSchema("successError");

// From Zod schema
const schema2 = createOutputSchema(z.object({ result: z.string() }));

// From definition object
const schema3 = createOutputSchema({
  result: z.string(),
  timestamp: z.string(),
});
```

## Best Practices

1. **🎉 NEW: Define schemas directly in `addTool()`** for the cleanest, most maintainable code
2. **Use predefined patterns** when possible for consistency (`'successError'`, `'fileOperation'`, etc.)
3. **Leverage auto-completion** - your IDE will suggest available pattern names
4. **Set default schemas** at the parser level for common response formats
5. **Use tool-specific schemas** for specialized operations
6. **Include descriptions** in your schemas for better documentation
7. **Test your schemas** with actual handler responses
8. **Consider backward compatibility** when changing schemas

### Recommended Pattern

```typescript
// ✅ RECOMMENDED: Clean, self-contained tool definitions
parser.addTool({
  name: "process-file",
  description: "Process a file",
  flags: [
    /* flags */
  ],
  outputSchema: "fileOperation", // Auto-completion works here!
  handler: async (ctx) => ({
    /* response matching schema */
  }),
});

// ❌ AVOID: Scattered schema definitions
parser
  .addTool({ name: "process-file" /* ... */ })
  .setOutputSchema("process-file", "fileOperation"); // Schema defined separately
```

## Examples

See `examples/output-schema-example.ts` for comprehensive examples of all features.

## TypeScript Integration

Output schemas work seamlessly with TypeScript:

```typescript
// Handler return type is inferred and validated
const parser = new ArgParser<{
  success: boolean;
  data: { processed: string };
  message: string;
}>({
  // ... configuration
});
```

The output schema system provides both runtime validation capabilities and compile-time type safety, making your CLI applications more robust and easier to integrate with other tools.
