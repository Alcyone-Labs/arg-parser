# ArgParser TUI SDK (v2)

The ArgParser TUI SDK provides a modern, reactive framework for building beautiful terminal user interfaces. It is built on **SolidJS** and **OpenTUI**, giving you:

- ⚛️ **Declarative UI**: Build terminal UIs with JSX components
- 🪄 **Reactivity**: Automatically update UI when state changes
- 🎨 **Theming**: Built-in themes (Dark, Light, Monokai, Dracula)
- ⌨️ **Shortcuts**: Powerful key bindings with chord support (e.g., `Ctrl+K D`)
- 🧩 **Components**: Rich library of pre-built components

## Installation

The TUI SDK is included in `@alcyone-labs/arg-parser`, but requires specific peer dependencies for the runtime.

```bash
# Install dependencies
npm install @opentui/solid @opentui/core solid-js
```

## Quick Start

The TUI module is available via a **separate entry point** to ensure compatibility with all Node.js environments.

```typescript
import { createTuiApp } from "@alcyone-labs/arg-parser/tui";
import { Card, Button } from "@alcyone-labs/arg-parser/tui";

function App() {
  return (
    <Card title="Hello World" padding={1}>
      <text>Welcome to OpenTUI v2!</text>
      <Button label="Exit" onClick={() => process.exit(0)} />
    </Card>
  );
}

// Launch the app
createTuiApp(() => <App />, {
  theme: "monokai",
  shortcuts: [
    { key: "q", action: () => process.exit(0) }
  ]
});
```

## Core Concepts

### 1. The Application Wrapper
`createTuiApp` initializes the terminal, sets up providers (Theme, Shortcuts, Toast), and renders your root component.

```typescript
createTuiApp(() => <Root />, {
  theme: "dark", // "dark", "light", "monokai", "dracula"
  shortcuts: [], // Global key bindings
  onDestroy: () => console.log("Exited")
});
```

### 2. Layouts
Use standard Flexbox properties via `box` primitives or high-level layout components.

**Master-Detail Layout**:
```tsx
import { MasterDetailLayout } from "@alcyone-labs/arg-parser/tui";

<MasterDetailLayout
  masterWidth="30%"
  master={<List items={items} />}
  detail={<Details selected={selectedItem} />}
/>
```

### 3. Navigation
Use `DrillDownNavigator` for stack-based navigation (like a mobile app or file browser).

```tsx
import { DrillDownNavigator } from "@alcyone-labs/arg-parser/tui";

<DrillDownNavigator>
  {(nav) => (
    <List onSelect={(item) => nav.push(() => <Details item={item} />)} />
  )}
</DrillDownNavigator>
```

- `nav.push(Component)`: Go deeper
- `nav.pop()`: Go back (triggered by Esc / ArrowLeft automatically)
- `nav.replace(Component)`: Switch view without adding to history

## Component Library

### `Card` & `StatCard`
Dashboard-style containers with borders and titles.

```tsx
<Card title="System Status" borderStyle="double">
  <text>All systems operational.</text>
</Card>

<StatCard 
  label="CPU Usage" 
  value={0.45} 
  format="percent" 
  trend="up" 
/>
```

### `Button`
Interactive buttons with hover states.
```tsx
<Button label="Deploy" variant="primary" onClick={deploy} />
<Button label="Cancel" variant="danger" onClick={cancel} />
```

### `MarkdownBlock`
Render text content (simple rendering).
```tsx
<MarkdownBlock content="# Title\n\nSome text here." />
```

## Theming
Access the current theme or switch themes at runtime.

```tsx
import { useTheme } from "@alcyone-labs/arg-parser/tui";

function ThemeSwitcher() {
  const { current, setTheme, cycle } = useTheme();
  
  return (
    <text style={{ fg: current().colors.accent }}>
      Current theme: {current().name}
    </text>
  );
}
```

## Keyboard Shortcuts
Register shortcuts locally constrained to a component's lifecycle.

```tsx
import { useShortcuts } from "@alcyone-labs/arg-parser/tui";

function Editor() {
  const { register } = useShortcuts();
  
  // Register Ctrl+S when this component is mounted
  // Automatically redundant when unmounted
  register({
    key: "ctrl+s",
    action: () => saveFile(),
    description: "Save File"
  });

  return <text>Press Ctrl+S to save</text>;
}
```

### Chord Shortcuts
Support for key sequences like `Ctrl+K` followed by `V`.
```typescript
register({
  key: "ctrl+k v", 
  action: () => openVerticalSplit()
});
```

## Toast Notifications
Transient messages for user feedback.

```tsx
import { useToast } from "@alcyone-labs/arg-parser/tui";

function CopyButton() {
  const toast = useToast();
  return (
    <Button label="Copy" onClick={() => {
      clipboard.write("text");
      toast.success("Copied to clipboard!");
    }} />
  );
}
```

## Migrating from v1
The old object-oriented API (`UI.App`, `UI.Component`) is **deprecated** and has been removed in favor of the SolidJS-based functional API.

| Old v1 | New v2 |
|--------|--------|
| `new UI.App().run()` | `createTuiApp(() => <App />)` |
| `class MyComp extends UI.Component` | `function MyComp() { return <box>...` |
| `UI.List` | Build with `<box>` loops or use custom components |
| `markDirty()` | Automatic Reactivity (Signals) |

## Example: Trace Viewer
See `examples/tui-demo-v2.tsx` for a full dashboard example.
