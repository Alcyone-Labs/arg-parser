# ArgParser TUI SDK - Building Beautiful Terminal User Interfaces

The ArgParser TUI SDK provides a powerful, component-based framework for building sophisticated terminal user interfaces. This guide will help you create beautiful, responsive TUIs with ease.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Component Library](#component-library)
- [Layout System](#layout-system)
- [Theming and Styling](#theming-and-styling)
- [Event Handling](#event-handling)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Quick Start

### Installation

```bash
npm install @alcyone-labs/arg-parser
# or
pnpm add @alcyone-labs/arg-parser
```

### Basic TUI Application

```typescript
import { UI } from "@alcyone-labs/arg-parser";

// Set up theme
UI.ThemeManager.setTheme("Default");

// Create a simple app
const app = new UI.App();
const input = new UI.Input({
  placeholder: "Enter your name...",
  onSubmit: (value) => {
    console.log(`Hello, ${value}!`);
    app.exit();
  },
});

// Run the app
app.run(input);
```

## Core Concepts

### Component-Based Architecture

The TUI SDK is built around a component system where everything is a `UI.Component`:

- **Components**: Building blocks like Input, List, Button, etc.
- **Layouts**: Containers that arrange components (SplitLayout, StackLayout)
- **App**: The main application controller
- **ThemeManager**: Handles styling and colors

### The Component Lifecycle

Every component goes through these stages:

1. **Initialization**: Component is created with configuration
2. **Layout**: Component receives size and position via `resize()`
3. **Rendering**: Component generates visual output via `render()`
4. **Interaction**: Component handles user input via `handleInput()` and `handleMouse()`

### Event-Driven Programming

TUI applications are event-driven:

- **Keyboard Events**: Arrow keys, Enter, Escape, etc.
- **Mouse Events**: Clicks, scrolls, drags
- **Custom Events**: Component-specific callbacks (onSubmit, onSelect, etc.)

## Component Library

### Input Component

Text input field with validation and callbacks.

```typescript
const input = new UI.Input({
  placeholder: "Type something...",
  prefix: "🔍 ",
  suffix: "[Enter to submit]",
  onChange: (value) => {
    console.log("Current value:", value);
  },
  onSubmit: (value) => {
    console.log("Submitted:", value);
  },
  validator: (value) => {
    return value.length >= 3 || "Minimum 3 characters required";
  },
});
```

**Options:**

- `placeholder`: Text shown when empty
- `prefix`: Text shown before input
- `suffix`: Text shown after input
- `onChange`: Callback on value change
- `onSubmit`: Callback on Enter key
- `validator`: Function to validate input

### List Component

Interactive list with keyboard navigation.

```typescript
const list = new UI.List({
  items: [
    { label: "Option 1", value: "opt1", description: "First option" },
    { label: "Option 2", value: "opt2", description: "Second option" },
    { label: "Option 3", value: "opt3", description: "Third option" },
  ],
  onSelect: (item) => {
    console.log("Selected:", item);
  },
  onSubmit: (item) => {
    console.log("Chosen:", item);
  },
});
```

**Options:**

- `items`: Array of list items with label, value, and optional description
- `onSelect`: Callback when selection changes
- `onSubmit`: Callback when Enter is pressed
- `multiSelect`: Enable multiple selections (boolean)

### ScrollArea Component

Scrollable content area with mouse wheel support.

```typescript
const scrollArea = new UI.ScrollArea({
  content: "Long content that will scroll...",
  scrollBarColor: "blue",
});

// Update content dynamically
scrollArea.setContent("New content...");
```

**Options:**

- `content`: Initial content string
- `scrollBarColor`: Color for the scrollbar indicator

### Button Component

Clickable button with styling.

```typescript
const button = new UI.Button({
  label: "Click Me!",
  onPress: () => {
    console.log("Button pressed!");
  },
  style: "primary", // "primary", "secondary", "danger"
});
```

### Progress Bar Component

Visual progress indicator.

```typescript
const progressBar = new UI.ProgressBar({
  value: 0.75, // 75% complete
  label: "Loading...",
  showPercentage: true,
});

// Update progress
progressBar.setValue(0.9);
```

## Layout System

### SplitLayout

Divides space into two regions (horizontal or vertical).

```typescript
const splitLayout = new UI.SplitLayout({
  direction: "horizontal", // or "vertical"
  splitRatio: 0.3, // 30% for first component
  first: leftComponent,
  second: rightComponent,
});
```

### StackLayout

Stacks components on top of each other with navigation.

```typescript
const stackLayout = new UI.StackNavigator({
  initialComponent: firstComponent,
});

// Navigate to new component
stackLayout.push(newComponent);

// Go back
stackLayout.pop();
```

### GridLayout

Arranges components in a grid.

```typescript
const gridLayout = new UI.GridLayout({
  columns: 3,
  rows: 2,
  gap: 1,
  components: [
    component1,
    component2,
    component3,
    component4,
    component5,
    component6,
  ],
});
```

## Theming and Styling

### Built-in Themes

```typescript
// Available themes
UI.ThemeManager.setTheme("Default");
UI.ThemeManager.setTheme("Light");
UI.ThemeManager.setTheme("Monokai");
UI.ThemeManager.setTheme("Dracula");
```

### Custom Themes

```typescript
const customTheme = {
  name: "MyTheme",
  primary: "#FF6B6B",
  secondary: "#4ECDC4",
  background: "#1A1A1A",
  text: "#FFFFFF",
  accent: "#FFE66D",
  success: "#95E77E",
  warning: "#FFA500",
  error: "#FF6B6B",
  muted: "#888888",
};

UI.ThemeManager.registerTheme(customTheme);
UI.ThemeManager.setTheme("MyTheme");
```

### Using Theme Colors

```typescript
const t = UI.ThemeManager.current;
const styledText = `${t.accent("Important")} ${t.muted("secondary info")}`;
```

## Event Handling

### Keyboard Events

```typescript
class MyComponent extends UI.Component {
  public override handleInput(key: string) {
    switch (key) {
      case "up":
        // Handle up arrow
        break;
      case "down":
        // Handle down arrow
        break;
      case "enter":
        // Handle Enter key
        break;
      case "escape":
        // Handle Escape key
        break;
      default:
        // Pass to parent
        super.handleInput(key);
    }
  }
}
```

### Mouse Events

```typescript
class MyComponent extends UI.Component {
  public override handleMouse(event: UI.IMouseEvent) {
    switch (event.type) {
      case "click":
        // Handle click
        break;
      case "scroll":
        // Handle scroll wheel
        break;
      case "drag":
        // Handle drag
        break;
    }
  }
}
```

### Global Event Handlers

```typescript
class GlobalHandler extends UI.Component {
  constructor(private child: UI.Component) {
    super({});
  }

  public override handleInput(key: string) {
    // Handle global shortcuts
    if (key === "ctrl+c") {
      app.exit();
      return;
    }

    // Pass to child
    this.child.handleInput(key);
  }
}
```

## Advanced Patterns

### Custom Components

```typescript
class CustomComponent extends UI.Component {
  private state = { counter: 0 };

  public override render() {
    const t = UI.ThemeManager.current;
    return [
      `${t.accent("Counter:")} ${this.state.counter}`,
      `${t.muted("Press 'i' to increment")}`,
    ];
  }

  public override handleInput(key: string) {
    if (key === "i") {
      this.state.counter++;
      this.markDirty(); // Trigger re-render
    } else {
      super.handleInput(key);
    }
  }
}
```

### Data Binding

```typescript
class DataBoundComponent extends UI.Component {
  private data: any[];

  constructor(data: any[]) {
    super({});
    this.data = data;
  }

  public updateData(newData: any[]) {
    this.data = newData;
    this.markDirty();
  }

  public override render() {
    return this.data.map((item) => `- ${item.name}`).join("\n");
  }
}
```

### Async Operations

```typescript
class AsyncComponent extends UI.Component {
  private loading = false;
  private data: any[] = [];

  async loadData() {
    this.loading = true;
    this.markDirty();

    try {
      this.data = await fetchSomeData();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
      this.markDirty();
    }
  }

  public override render() {
    if (this.loading) {
      return "Loading...";
    }

    return this.data.map((item) => `- ${item.name}`).join("\n");
  }
}
```

## Best Practices

### 1. Component Composition

Build complex UIs by composing simple components:

```typescript
// Good: Compose smaller components
const searchBox = new UI.Input({ placeholder: "Search..." });
const resultsList = new UI.List({ items: [] });
const layout = new UI.SplitLayout({
  direction: "vertical",
  splitRatio: 0.2,
  first: searchBox,
  second: resultsList,
});

// Avoid: Monolithic components
class BadComponent extends UI.Component {
  // Handles search, results, layout, etc. all in one place
}
```

### 2. Responsive Design

Consider different terminal sizes:

```typescript
class ResponsiveLayout extends UI.Component {
  public override resize(x, y, width, height) {
    if (width < 80) {
      // Use compact layout
      this.useCompactLayout();
    } else {
      // Use full layout
      this.useFullLayout();
    }
    super.resize(x, y, width, height);
  }
}
```

### 3. Performance Optimization

- Only call `markDirty()` when state actually changes
- Use `requestAnimationFrame` for frequent updates
- Avoid expensive operations in `render()`

### 4. Accessibility

- Use high-contrast colors
- Provide keyboard alternatives to mouse operations
- Include descriptive labels and placeholders

### 5. Error Handling

```typescript
class RobustComponent extends UI.Component {
  public override render() {
    try {
      return this.renderContent();
    } catch (error) {
      const t = UI.ThemeManager.current;
      return `${t.error("Error:")} ${error.message}`;
    }
  }
}
```

## Examples

### Example 1: Simple Form

```typescript
import { UI } from "@alcyone-labs/arg-parser";

UI.ThemeManager.setTheme("Default");

const nameInput = new UI.Input({
  placeholder: "Enter your name",
  validator: (value) => value.length >= 2 || "Name too short",
});

const emailInput = new UI.Input({
  placeholder: "Enter your email",
  validator: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || "Invalid email";
  },
});

const submitButton = new UI.Button({
  label: "Submit",
  onPress: () => {
    console.log(`Name: ${nameInput.getValue()}`);
    console.log(`Email: ${emailInput.getValue()}`);
  },
});

const formLayout = new UI.SplitLayout({
  direction: "vertical",
  splitRatio: 0.4,
  first: nameInput,
  second: new UI.SplitLayout({
    direction: "vertical",
    splitRatio: 0.5,
    first: emailInput,
    second: submitButton,
  }),
});

const app = new UI.App();
app.run(formLayout);
```

### Example 2: File Browser

```typescript
import { readdir, stat } from "fs/promises";
import { UI } from "@alcyone-labs/arg-parser";

class FileBrowser extends UI.Component {
  private currentPath = process.cwd();
  private files: any[] = [];
  private selectedIndex = 0;

  async loadFiles() {
    try {
      const entries = await readdir(this.currentPath, { withFileTypes: true });
      this.files = await Promise.all(
        entries.map(async (entry) => {
          const stats = await stat(`${this.currentPath}/${entry.name}`);
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
          };
        }),
      );
      this.markDirty();
    } catch (error) {
      this.files = [];
      this.markDirty();
    }
  }

  public override render() {
    const t = UI.ThemeManager.current;
    const header = `${t.accent("File Browser:")} ${this.currentPath}`;
    const fileList = this.files
      .map((file, index) => {
        const prefix = index === this.selectedIndex ? "▶ " : "  ";
        const icon = file.isDirectory ? "📁" : "📄";
        const color = file.isDirectory ? t.accent : t.text;
        return `${prefix}${icon} ${color(file.name)}`;
      })
      .join("\n");

    return [header, "", fileList].join("\n");
  }

  public override handleInput(key: string) {
    switch (key) {
      case "up":
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.markDirty();
        break;
      case "down":
        this.selectedIndex = Math.min(
          this.files.length - 1,
          this.selectedIndex + 1,
        );
        this.markDirty();
        break;
      case "enter":
        const selected = this.files[this.selectedIndex];
        if (selected?.isDirectory) {
          this.currentPath += `/${selected.name}`;
          this.selectedIndex = 0;
          this.loadFiles();
        }
        break;
      case "escape":
        this.selectedIndex = 0;
        this.currentPath = process.cwd();
        this.loadFiles();
        break;
    }
  }
}

const browser = new FileBrowser();
browser.loadFiles();

const app = new UI.App();
app.run(browser);
```

### Example 3: Real-time Dashboard

```typescript
import { UI } from "@alcyone-labs/arg-parser";

class Dashboard extends UI.Component {
  private metrics = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  };

  private interval: NodeJS.Timeout;

  constructor() {
    super({});
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    this.interval = setInterval(() => {
      // Simulate metrics collection
      this.metrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
      };
      this.markDirty();
    }, 1000);
  }

  public override render() {
    const t = UI.ThemeManager.current;

    const cpuBar = this.createProgressBar(this.metrics.cpu, "CPU");
    const memBar = this.createProgressBar(this.metrics.memory, "Memory");
    const diskBar = this.createProgressBar(this.metrics.disk, "Disk");
    const netBar = this.createProgressBar(this.metrics.network, "Network");

    return [
      t.accent("System Dashboard"),
      "",
      cpuBar,
      memBar,
      diskBar,
      netBar,
      "",
      t.muted("Updated: " + new Date().toLocaleTimeString()),
    ].join("\n");
  }

  private createProgressBar(value: number, label: string): string {
    const t = UI.ThemeManager.current;
    const percentage = Math.round(value);
    const barLength = 20;
    const filledLength = Math.round((value / 100) * barLength);
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);
    const color = value > 80 ? t.error : value > 60 ? t.warning : t.success;

    return `${label.padEnd(8)} ${color(bar)} ${percentage.toString().padStart(3)}%`;
  }

  public destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

const dashboard = new Dashboard();
const app = new UI.App();
app.run(dashboard);
```

## Conclusion

The ArgParser TUI SDK provides a powerful foundation for building sophisticated terminal user interfaces. By following the patterns and best practices outlined in this guide, you can create beautiful, responsive, and maintainable TUI applications.

For more examples and advanced usage, check out the `examples/` directory in the repository.
