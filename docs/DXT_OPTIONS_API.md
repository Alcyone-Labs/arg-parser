# dxtOptions API Documentation

This document provides comprehensive documentation for the `dxtOptions` property in ArgParser flags, which enables enhanced DXT (Desktop Extension Toolkit) package generation with rich user configuration interfaces.

## Table of Contents

- [Overview](#overview)
- [IDxtOptions Interface](#idxtoptions-interface)
- [DXT Types](#dxt-types)
- [Property Reference](#property-reference)
- [Examples by Type](#examples-by-type)
- [Validation Rules](#validation-rules)
- [Best Practices](#best-practices)

## Overview

The `dxtOptions` property extends ArgParser flags with DXT-specific metadata that controls how flags are presented in DXT user interfaces and how they're processed during package generation.

### Key Features

- **🎨 Rich UI Types** - File pickers, directory selectors, number inputs, toggles
- **🔒 Sensitivity Control** - Mark sensitive data (passwords, API keys) for secure handling
- **📝 Enhanced Descriptions** - Custom titles and detailed descriptions for better UX
- **✅ Input Validation** - Min/max constraints, multiple value support
- **🔄 Smart Defaults** - DXT variable support in default values

## IDxtOptions Interface

```typescript
interface IDxtOptions {
  /** DXT user interface type */
  type?: "string" | "directory" | "file" | "boolean" | "number";

  /** Mark as sensitive data (passwords, API keys) */
  sensitive?: boolean;

  /** Default value for local development (supports DXT variables) */
  localDefault?: string | number | boolean;

  /** Allow multiple values */
  multiple?: boolean;

  /** Minimum value (for numbers) or length (for strings) */
  min?: number;

  /** Maximum value (for numbers) or length (for strings) */
  max?: number;

  /** Custom title for DXT UI (overrides flag name) */
  title?: string;
}
```

## DXT Types

### string

Default text input for general string values.

**Use Cases:** Names, descriptions, URLs, general text input
**UI:** Single-line text input field

### directory

Directory picker interface for folder selection.

**Use Cases:** Output directories, workspace paths, data folders
**UI:** Directory browser with folder selection

### file

File picker interface for file selection.

**Use Cases:** Input files, configuration files, templates
**UI:** File browser with file selection dialog

### boolean

Toggle/checkbox interface for true/false values.

**Use Cases:** Feature flags, enable/disable options, yes/no choices
**UI:** Toggle switch or checkbox

### number

Numeric input with optional min/max constraints.

**Use Cases:** Ports, timeouts, limits, counts, percentages
**UI:** Number input field with validation

## Property Reference

### type

Controls the DXT user interface component.

```typescript
dxtOptions: {
  type: "file"; // Creates file picker in DXT UI
}
```

### sensitive

Marks data as sensitive for secure handling.

```typescript
dxtOptions: {
  sensitive: true; // Masks input, excludes from logs
}
```

**Important:** Sensitive flags are automatically excluded from DXT manifests for security.

### localDefault

Provides default values for development environments.

```typescript
dxtOptions: {
  localDefault: "${HOME}/projects/myapp"; // Supports DXT variables
}
```

### multiple

Allows multiple values for array-type inputs.

```typescript
dxtOptions: {
  type: 'file',
  multiple: true // Allows selecting multiple files
}
```

### min / max

Sets validation constraints for numbers and strings.

```typescript
dxtOptions: {
  type: 'number',
  min: 1,
  max: 100 // Port range validation
}
```

### title

Custom display name in DXT UI.

```typescript
dxtOptions: {
  title: "API Endpoint URL"; // Overrides flag name in UI
}
```

## Examples by Type

### String Type

```typescript
// Basic string input
parser.addFlag({
  name: "api-url",
  description: "API endpoint URL",
  type: "string",
  dxtOptions: {
    type: "string",
    title: "API Endpoint",
    localDefault: "https://api.example.com",
  },
});

// String with length constraints
parser.addFlag({
  name: "username",
  description: "Username for authentication",
  type: "string",
  dxtOptions: {
    type: "string",
    min: 3,
    max: 50,
  },
});

// Sensitive string (password, API key)
parser.addFlag({
  name: "api-key",
  description: "API authentication key",
  type: "string",
  dxtOptions: {
    type: "string",
    sensitive: true, // Masked input, excluded from manifest
  },
});
```

### Directory Type

```typescript
// Output directory
parser.addFlag({
  name: "output-dir",
  description: "Directory for generated files",
  type: "string",
  dxtOptions: {
    type: "directory",
    title: "Output Directory",
    localDefault: "${DOCUMENTS}/myapp/output",
  },
});

// Workspace directory
parser.addFlag({
  name: "workspace",
  description: "Project workspace directory",
  type: "string",
  dxtOptions: {
    type: "directory",
    localDefault: "${HOME}/workspace",
  },
});

// Multiple directories
parser.addFlag({
  name: "include-dirs",
  description: "Additional directories to include",
  type: "string",
  dxtOptions: {
    type: "directory",
    multiple: true,
  },
});
```

### File Type

```typescript
// Single file input
parser.addFlag({
  name: "config-file",
  description: "Configuration file path",
  type: "string",
  dxtOptions: {
    type: "file",
    localDefault: "${__dirname}/config.json",
  },
});

// Multiple file selection
parser.addFlag({
  name: "input-files",
  description: "Files to process",
  type: "string",
  dxtOptions: {
    type: "file",
    multiple: true,
    title: "Select Input Files",
  },
});

// Template file
parser.addFlag({
  name: "template",
  description: "Template file for generation",
  type: "string",
  dxtOptions: {
    type: "file",
    localDefault: "${__dirname}/templates/default.hbs",
  },
});
```

### Boolean Type

```typescript
// Feature toggle
parser.addFlag({
  name: "enable-cache",
  description: "Enable caching for better performance",
  type: "boolean",
  dxtOptions: {
    type: "boolean",
    localDefault: true,
  },
});

// Debug mode
parser.addFlag({
  name: "debug",
  description: "Enable debug logging",
  type: "boolean",
  dxtOptions: {
    type: "boolean",
    title: "Debug Mode",
    localDefault: false,
  },
});

// Confirmation flag
parser.addFlag({
  name: "force",
  description: "Force operation without confirmation",
  type: "boolean",
  dxtOptions: {
    type: "boolean",
    title: "Force Operation",
  },
});
```

### Number Type

```typescript
// Port number
parser.addFlag({
  name: "port",
  description: "Server port number",
  type: "number",
  dxtOptions: {
    type: "number",
    min: 1024,
    max: 65535,
    localDefault: 3000,
  },
});

// Timeout value
parser.addFlag({
  name: "timeout",
  description: "Request timeout in seconds",
  type: "number",
  dxtOptions: {
    type: "number",
    min: 1,
    max: 300,
    localDefault: 30,
    title: "Timeout (seconds)",
  },
});

// Percentage value
parser.addFlag({
  name: "quality",
  description: "Image quality percentage",
  type: "number",
  dxtOptions: {
    type: "number",
    min: 1,
    max: 100,
    localDefault: 85,
  },
});
```

## Validation Rules

### Type Compatibility

- `type: 'number'` requires flag `type: "number"`
- `type: 'boolean'` requires flag `type: "boolean"`
- Other DXT types work with flag `type: "string"`

### Constraint Validation

- `min <= max` (when both specified)
- `min >= 0` for string length constraints
- `multiple: true` only valid for `string`, `file`, `directory` types

### Sensitive Data

- `sensitive: true` flags are excluded from DXT manifests
- Use for passwords, API keys, tokens, or other confidential data

### Default Values

- `localDefault` supports DXT variables (`${HOME}`, `${DOCUMENTS}`, etc.)
- Must match the flag's expected type
- Used only in development; DXT uses user-configured values

## Best Practices

### ✅ Do

```typescript
// Use appropriate DXT types
dxtOptions: {
  type: "file" // For file inputs
}

// Provide helpful titles
dxtOptions: {
  title: "Database Connection String" // Clear, descriptive
}

// Use DXT variables in defaults
dxtOptions: {
  localDefault: "${DOCUMENTS}/myapp/data" // Portable paths
}

// Set reasonable constraints
dxtOptions: {
  type: "number",
  min: 1,
  max: 100 // Prevent invalid values
}

// Mark sensitive data
dxtOptions: {
  sensitive: true // For passwords, API keys
}
```

### ❌ Don't

```typescript
// Don't use wrong types
dxtOptions: {
  type: "file" // For a port number - use "number"
}

// Don't use vague titles
dxtOptions: {
  title: "Input" // Too generic - be specific
}

// Don't hardcode paths
dxtOptions: {
  localDefault: "/Users/john/data" // Use DXT variables instead
}

// Don't set impossible constraints
dxtOptions: {
  min: 100,
  max: 50 // Invalid: min > max
}

// Don't expose sensitive defaults
dxtOptions: {
  localDefault: "secret-api-key-123" // Use sensitive: true instead
}
```

### Common Patterns

```typescript
// File processing tool
parser.addFlag({
  name: "input",
  description: "Input file to process",
  type: "string",
  mandatory: true,
  dxtOptions: {
    type: "file",
    title: "Select Input File",
  },
});

// Configuration with smart defaults
parser.addFlag({
  name: "output-dir",
  description: "Output directory for results",
  type: "string",
  dxtOptions: {
    type: "directory",
    localDefault: "${DOCUMENTS}/myapp/output",
    title: "Output Directory",
  },
});

// Server configuration
parser.addFlag({
  name: "port",
  description: "Server port",
  type: "number",
  dxtOptions: {
    type: "number",
    min: 1024,
    max: 65535,
    localDefault: 8080,
  },
});
```

---

For more information, see the [DXT Path Handling Guide](./DXT_PATH_HANDLING.md) and [Migration Guide](./DXT_MIGRATION.md).
