# Getting Started with ArgParser TUI SDK

This guide will help you get started with building beautiful terminal user interfaces using the ArgParser TUI SDK.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Concepts](#basic-concepts)
- [Core Components](#core-components)
- [Layout System](#layout-system)
- [Event Handling](#event-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Advanced Patterns](#advanced-patterns)

---

## Installation

### Prerequisites

- Node.js 18+ or Bun
- TypeScript support
- Terminal with ANSI color support

### Install ArgParser

```bash
npm install @alcyone-labs/arg-parser
# or
pnpm add @alcyone-labs/arg-parser
```

### Quick Start

Create a new TypeScript file:

```typescript
import { UI } from "@alcyone-labs/arg-parser";

// Set theme
UI.ThemeManager.setTheme("Default");

// Create your first TUI app
const app = new UI.App();
const input = new UI.Input({
  placeholder: "What's your name?",
  onSubmit: (name) => {
    console.log(`Hello, ${name}!`);
    app.exit();
  },
});

// Run the app
app.run(input);
```

---

## Basic Concepts

### Component-Based Architecture

The TUI SDK follows a component-based architecture where everything is a `UI.Component`:

- **Components**: Building blocks like Input, List, Button, ScrollArea
- **Layouts**: Containers that arrange components (SplitLayout, StackNavigator)
- **App**: Main application controller
- **Theme System**: Centralized styling and theming

### Component Lifecycle

1. **Initialization**: Component constructor with configuration
2. **Layout**: `resize(x, y, width, height)` called by parent
3. **Rendering**: `render()` method returns display content
4. **Input Handling**: `handleInput()` processes keyboard/mouse events
5. **Cleanup**: Automatic when component is destroyed

### Event-Driven Programming

TUI applications are event-driven:

```typescript
// Component responds to user actions
const button = new UI.Button({
  onPress: () => {
    console.log("Button clicked!");
  },
});

// When user presses Enter or clicks button
input.onSubmit((value) => {
  button.onPress(); // Trigger button action
});
```

---

## Core Components

### Input Component

The most fundamental component for user interaction.

**Features:**

- Text input with cursor
- Real-time validation
- Placeholder text
- Prefix/suffix support
- Change and submit callbacks

**Usage:**

```typescript
const input = new UI.Input({
  placeholder: "Enter search term...",
  onChange: (value) => updateResults(value),
  onSubmit: (value) => executeSearch(value),
});

function updateResults(searchTerm: string) {
  // Update search results
  const results = searchAPI(searchTerm);
  // Display results
}
```

### List Component

Interactive list for navigation and selection.

**Features:**

- Keyboard navigation (arrows, Enter, Escape)
- Mouse support
- Multi-selection capability
- Custom rendering per item

**Usage:**

```typescript
const list = new UI.List({
  items: [
    { label: "File A", value: "file-a" },
    { label: "File B", value: "file-b" },
  ],
  onSelect: (item) => {
    console.log("Selected:", item.label);
  },
  onSubmit: (item) => {
    console.log("Executing:", item.label);
  },
});
```

### ScrollArea Component

Scrollable content display with visual feedback.

**Features:**

- Mouse wheel support
- Visual scrollbar
- Programmatic scrolling
- Touch gestures
- Custom scrollbar styling

**Usage:**

```typescript
const scrollArea = new UI.ScrollArea({
  content: "Long content here...",
});

// Update content dynamically
scrollArea.setContent("New content...");
```

### Layout System

### SplitLayout

Divides space between components with configurable ratios.

**Features:**

- Horizontal and vertical layouts
- Nested layouts support
- Responsive design

**Usage:**

```typescript
const layout = new UI.SplitLayout({
  direction: "horizontal",
  splitRatio: 0.7,
  first: sidebar,
  second: mainContent,
});
```

### StackNavigator

Manages navigation history with back/forward functionality.

**Features:**

- Push/pop components
- Navigation history
- Breadcrumb support

**Usage:**

```typescript
const navigator = new UI.StackNavigator({
  initialComponent: homeScreen,
});

// Navigate to new screen
navigator.push(settingsScreen);

// Go back
navigator.pop();
```

### App Component

Main application controller.

**Features:**

- Terminal management
- Event loop handling
- Graceful shutdown
- Error handling

**Usage:**

```typescript
const app = new UI.App();

// Start the application
app.run(rootComponent);

// Exit when done
app.exit();
```

---

## Theme System

Centralized styling with multiple built-in themes.

### Available Themes

- `"Default"` - Dark theme
- `"Light"` - Light theme
- `"Monokai"` - Popular dark theme
- `"Dracula"` - Dark purple theme

### Theme Management

```typescript
// Set theme
UI.ThemeManager.setTheme("Default");

// Get current theme
const currentTheme = UI.ThemeManager.current;

// Register custom theme
UI.ThemeManager.registerTheme(customTheme);
```

### Theme Colors

Semantic color palette for consistent UI design.

| Color        | Purpose           |
| ------------ | ----------------- |
| `primary`    | Main actions      |
| `secondary`  | Secondary actions |
| `accent`     | Highlights        |
| `success`    | Success states    |
| `warning`    | Warning states    |
| `error`      | Error states      |
| `muted`      | Disabled text     |
| `background` | Background colors |
| `text`       | Primary text      |

---

## Event Handling

### Keyboard Events

| Key             | Action                 |
| --------------- | ---------------------- |
| `↑` `↓` `←` `→` | Navigation             |
| `Enter`         | Selection/Confirmation |
| `Escape`        | Cancel/Go back         |
| `Tab`           | Switch focus           |
| `Ctrl+C`        | Exit application       |

### Mouse Events

| Event    | Description          |
| -------- | -------------------- |
| `click`  | Button press         |
| `scroll` | Mouse wheel movement |

---

## Best Practices

### 1. Component Composition

Build complex UIs by combining simple components.

### 2. Responsive Design

Handle different terminal sizes and adapt layouts.

### 3. Event Delegation

Use proper event handling patterns and callbacks.

### 4. Performance

Only call `markDirty()` when state changes.

### 5. Accessibility

Use semantic colors and clear labels.

### 6. Error Handling

Implement proper validation and error states.

---

## Examples

### Simple Form

```typescript
import { UI } from "@alcyone-labs/arg-parser";

const input = new UI.Input({
  placeholder: "Enter your name...",
  validator: (value) => {
    return value.length >= 2 ? null : "Name must be at least 2 characters";
  },
  onSubmit: (value) => {
    console.log(`Form submitted with: ${value}`);
  },
});

const button = new UI.Button({
  label: "Submit",
  onPress: () => {
    console.log("Form submitted!");
  },
});

const layout = new UI.SplitLayout({
  direction: "vertical",
  splitRatio: 0.2,
  first: input,
  second: button,
});

const app = new UI.App();
app.run(layout);
```

### File Browser

```typescript
import { UI } from "@alcyone-labs/arg-parser";
import { readdir, stat } from "fs/promises";

class FileBrowser extends UI.Component {
  private currentPath: string = process.cwd();
  private files: any[] = [];
  private selectedIndex = 0;

  constructor(private currentPath: string) {
    super({});
    this.loadDirectory(currentPath);
  }

  private async loadDirectory() {
    try {
      this.files = await readdir(this.currentPath, { withFileTypes: true });
      this.selectedIndex = 0;
    this.markDirty();
    } catch (error) {
      console.error("Failed to load directory:", error.message);
    }
  }

  private render() {
    const t = UI.ThemeManager.current;
    const files = this.files.map((file, index) => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      icon: file.isDirectory() ? "📁" : "📄",
      label: `${file.name}${file.isDirectory() ? "/" : ""}`
    }));

    return [
      t.muted("Current Directory: "),
      ...files
    ];
  }

  public override handleInput(key: string) {
    if (key === "up" && this.selectedIndex > 0) {
      this.selectedIndex--;
      this.markDirty();
    } else if (key === "down" && this.selectedIndex < this.files.length - 1) {
      this.selectedIndex++;
      this.markDirty();
    } else if (key === "enter") {
      const selected = this.files[this.selectedIndex];
      if (selected) {
        this.openFile(selected);
      }
    }
    } else if (key === "pageup" && this.selectedIndex < this.files.length - 10) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 10);
      this.markDirty();
    } else if (key === "pagedown" && this.selectedIndex > 0) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 10);
      this.markDirty();
    } else if (key === "home") {
      this.selectedIndex = 0;
      this.currentPath = process.cwd();
      await this.loadDirectory();
    }
    }

    super.handleInput(key);
  }

  public override render() {
    const t = UI.ThemeManager.current;
    const files = this.files.map((file, index) => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      icon: file.isDirectory() ? "📁" : "📄",
      label: `${file.name}${file.isDirectory() ? "/" : ""}`
    }));

    return [
      t.muted("Current Directory: "),
      ...files
    ];
  }
  }
}
```

### Dashboard

```typescript
import { UI } from "@alcyone-labs/arg-parser";

class Dashboard extends UI.Component {
  private metrics = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  };
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super({});
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    this.interval = setInterval(() => {
      // Simulate metrics changes
      this.metrics.cpu = Math.random() * 100;
      this.metrics.memory = Math.random() * 100;
      this.metrics.disk = Math.random() * 100;
      this.metrics.network = Math.random() * 100;
      this.markDirty();
    }, 1000);
  }

  private stopMetricsCollection() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public override render() {
    const t = UI.ThemeManager.current;
    const cpuBar = this.createProgressBar(this.metrics.cpu, "CPU", t.success);
    const memBar = this.createProgressBar(
      this.metrics.memory,
      "Memory",
      t.warning,
    );
    const diskBar = this.createProgressBar(this.metrics.disk, "Disk", t.error);
    const netBar = this.createProgressBar(
      this.metrics.network,
      "Network",
      t.accent,
    );

    return [
      t.accent("System Dashboard"),
      "",
      cpuBar,
      "",
      memBar,
      "",
      diskBar,
      netBar,
      "",
    ];
  }

  private createProgressBar(
    value: number,
    label: string,
    showPercentage: boolean = false,
  ) {
    const percentage = Math.round(value);
    const filledLength = Math.round(value * 20);
    const emptyLength = 20 - filledLength;

    const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

    return `${label}: ${bar} ${showPercentage ? `${percentage}%` : ""}`;
  }

  public override handleInput(key: string) {
    if (key === "q") {
      this.stopMetricsCollection();
      app.exit();
    }

    super.handleInput(key);
  }

  public override render() {
    const t = UI.ThemeManager.current;
    const metrics = this.metrics;

    return [
      t.accent("System Dashboard"),
      "",
      this.createProgressBar(metrics.cpu, "CPU", t.success),
      this.createProgressBar(metrics.memory, "Memory", t.warning),
      this.createProgressBar(metrics.disk, "Disk", t.error),
      this.createProgressBar(metrics.network, "Network", t.accent),
    ];
  }
}
```

---

## Advanced Patterns

### Custom Components

```typescript
class SearchableList extends UI.Component {
  private items: any[] = [];
  private selectedIndex = 0;
  private filter = "";

  constructor(items: any[]) {
    super({});
    this.items = items;
    this.filter = "";
  }

  public override setFilter(filter: string) {
    this.filter = filter;
    this.markDirty();
  }

  public override render() {
    const t = UI.ThemeManager.current;
    const filteredItems = this.items.filter(item =>
      item.label.toLowerCase().includes(this.filter.toLowerCase())
    );

    return [
      ...filteredItems.map((item, index) => ({
        label: `${item.label}`,
        value: item.value
      }))
    ];
  }

  public override handleInput(key: string) {
    if (key === "escape") {
      this.selectedIndex = 0;
    } else if (key === "enter") {
      const selected = this.filteredItems[this.selectedIndex];
      if (selected) {
        this.openFile(selected);
      }
    }
    }

    super.handleInput(key);
  }
}
```

### Data Binding

```typescript
class DataBoundComponent extends UI.Component {
  private data: any[] = [];

  constructor(data: any[]) {
    super({});
    this.data = data;
  }

  public updateData(newData: any[]) {
    this.data = newData;
    this.markDirty();
  }

  public override render() {
    return this.data.map((item) => item.toString());
  }
}
```

### Async Operations

```typescript
class AsyncComponent extends UI.Component {
  private loading = false;
  private data: any = null;

  async loadData() {
    this.loading = true;
    this.markDirty();

    try {
      this.data = await this.fetchData();
    } catch (error) {
      this.data = { error: "Failed to load data" };
    } finally {
      this.loading = false;
    }

    this.markDirty();
  }

  private async fetchData() {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => resolve({ data: "Sample data" }), 1000);
    });
  }

  public override render() {
    if (this.loading) {
      return "Loading...";
    }

    return this.data ? this.data.toString() : "No data available";
  }
  }
}
```

---

## Integration Examples

### CLI with TUI

```typescript
import { UI } from "@alcyone-labs/arg-parser";
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  name: "myapp",
  description: "A sample CLI application",
  version: "1.0.0"
});

// Add commands
parser
  .flag("--search", {
    description: "Search for files",
    type: "string",
    required: false
  })
  .flag("--verbose", {
    description: "Enable verbose output",
    type: "boolean"
  })
  .flag("--output", {
    description: "Output format",
    type: "string",
    choices: ["json", "table", "csv"]
  })
  .flag("--interactive", {
    description: "Run in interactive mode",
    type: "boolean"
  })
  .addTool("search-files", {
    description: "Search for files",
    input: {
      description: "Search term",
      type: "string",
      required: true
    },
    output: {
      description: "Output format",
      schema: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                size: { type: "number" },
                modified: { type: "string" }
              }
            }
          }
        }
      }
      }
    }
    }
  });

// Parse arguments
const args = parser.parse();

// Use the parsed arguments
if (args.search) {
  // Handle search
  const results = args.search as any[];
  console.log("Search results:", results);
} else {
  // Handle other commands
  console.log("Command:", args.command);
}
```

### MCP Integration

```typescript
import { UI } from "@alcyone-labs/arg-parser";
import { ArgParser } from "@alcyone-labs/arg-parser";

const parser = new ArgParser({
  name: "mcp-server",
  description: "MCP server with TUI interface",
  version: "1.0.0"
});

// Add MCP tools
parser
  .addTool("list-files", {
    description: "List available files",
    input: {
      description: "Filter pattern (optional)",
      type: "string",
      required: false
    },
    output: {
      description: "Output format",
      schema: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                size: { type: "number" },
                modified: { type: "string" }
              }
            }
          }
        }
      }
    }
    }
  });

// Start MCP server
parser.startMcpServer();
```

---

## Testing

### Unit Tests

```typescript
import { UI } from "@alcyone-labs/arg-parser";

// Test component rendering
const testComponent = new UI.Component({
  content: "Test content",
});

// Test in isolation
const isolatedApp = new UI.App();
isolatedApp.run(testComponent);
```

---

## Performance Considerations

- Use `markDirty()` only when state changes
- Avoid expensive operations in `render()`
- Implement proper cleanup in `destroy()`
- Use requestAnimationFrame for animations
- Consider virtual scrolling for large datasets

---

## Accessibility

- Use semantic colors from theme system
- Provide keyboard alternatives to mouse operations
- Include ARIA labels where appropriate
- Ensure high contrast ratios
- Test with screen readers

---

## Migration from v1.x

The TUI SDK has evolved significantly. Key changes include:

- **Unified Component API**: `addTool()` method replaces separate tool definitions
- **Enhanced Type System**: Built-in Zod schema support
- **Improved MCP Integration**: Native MCP server generation
- **Better Performance**: Optimized rendering and event handling

For migration guides, see `docs/DXT_MIGRATION.md`.

---

## Troubleshooting

### Common Issues

#### Component Not Rendering

**Problem**: Component shows blank or outdated content

**Solution**:

1. Check `markDirty()` is called when state changes
2. Verify `render()` method returns updated content
3. Ensure component constructor receives proper configuration
4. Check for TypeScript compilation errors

#### Event Handling Issues

**Problem**: Events not triggering or incorrect behavior

**Solution**:

1. Verify event handler methods are properly overridden
2. Check event propagation to parent components
3. Test with different input types

#### Layout Issues

**Problem**: Components not sizing correctly

**Solution**:

1. Use `resize()` method to update component dimensions
2. Test with different terminal sizes
3. Verify split ratios work as expected

---

## Resources

- [Examples Directory](examples/)
- [Complex TUI Demo](examples/complex-tui-demo.ts)
- [File Browser](examples/community/canny-cli/)
- [MCP Examples](examples/MCP/)
- [CLI Examples](examples/)

- [Documentation](docs/)
  - [TUI Components](docs/TUI_COMPONENTS.md)
  - [Getting Started](docs/TUI_GETTING_STARTED.md)
  - [Layout System](docs/TUI_LAYOUT_DOCS.md)
  - [Advanced Patterns](docs/TUI_PATTERNS_GUIDE.md)

---

## Community

- [GitHub Repository](https://github.com/alcyone-labs/arg-parser)
- [Issues](https://github.com/alcyone-labs/arg-parser/issues)
- [Discussions](https://github.com/alcyone-labs/arg-parser/discussions)

---

## Contributing

We welcome contributions! Please:

- Report bugs via GitHub Issues
- Suggest features via GitHub Discussions
- Submit PRs for enhancements
- Share your TUI applications with the community

---

## Getting Help

For more information:

- Run: `bun run examples/complex-tui-demo.ts --help`
- Check: `bun run examples/simple-cli.ts --help`
- Read: `bun run examples/getting-started.ts --help`

For API documentation:

- Check: `bun run docs/TUI_COMPONENTS.md`
- Browse: `open https://github.com/alcyone-labs/arg-parser/blob/main/docs/TUI_COMPONENTS.md`

For community examples:

- Visit: `open https://github.com/alcyone-labs/arg-parser/tree/main/examples`

---

Happy TUI building! 🎉
