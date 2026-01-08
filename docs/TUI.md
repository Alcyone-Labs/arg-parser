# OpenTUI v2 - Terminal User Interface Framework

A reactive TUI framework built on [SolidJS](https://www.solidjs.com/) and [SST's OpenTUI](https://github.com/sst/opentui).

## Quick Start

```tsx
import {
  MasterDetail,
  render,
  TuiProvider,
  useTheme,
  useTui,
  VirtualList,
} from "@alcyone-labs/arg-parser/tui";

function App() {
  const { viewportHeight, exit } = useTui();
  const { current: theme, cycle: cycleTheme } = useTheme();
  const [idx, setIdx] = createSignal(0);

  return (
    <MasterDetail
      header="My App"
      master={
        <VirtualList items={DATA} selectedIndex={idx()} onSelect={setIdx} />
      }
      detail={<Details item={DATA[idx()]} />}
    />
  );
}

render(() => (
  <TuiProvider theme="dark" onScroll={(d) => setIdx((i) => i + d)}>
    <App />
  </TuiProvider>
));
```

---

## Installation

```bash
pnpm add @alcyone-labs/arg-parser
```

Configure TypeScript and Bun:

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid"
  }
}
```

```toml
# bunfig.toml
preload = ["@opentui/solid/preload"]
```

---

## Core Concepts

### TuiProvider

The unified provider that handles everything automatically:

```tsx
<TuiProvider
  theme="dark"              // Theme name or TuiTheme object
  onScroll={(delta) => {}}  // Mouse wheel callback (-3 up, +3 down)
  scrollSpeed={3}           // Lines per scroll tick
  shortcuts={[...]}         // Keyboard shortcuts
  reservedRows={8}          // Rows reserved for header/footer
>
  <App />
</TuiProvider>
```

**Features:**

- ✅ Mouse wheel reporting (automatic)
- ✅ Terminal resize handling
- ✅ TTY cleanup on exit
- ✅ SIGINT/SIGTERM handlers
- ✅ Theme context
- ✅ Shortcut context
- ✅ Toast notifications

### useTui Hook

Access TUI context inside components:

```tsx
function MyComponent() {
  const { viewportHeight, viewportWidth, exit } = useTui();

  return <text>Height: {viewportHeight()} rows</text>;
}
```

---

## Theme System

### Built-in Themes

```ts
import { THEMES } from "@alcyone-labs/arg-parser/tui";

// Available: dark, light, monokai, dracula, nord, solarized
const darkTheme = THEMES.dark;
```

### Custom Themes

```ts
import { Theme, THEMES } from "@alcyone-labs/arg-parser/tui";

// Extend existing theme
const myTheme = Theme.from(THEMES.dark).extend({
  name: "my-dark",
  colors: {
    background: "#1e1e1e",
    accent: "#ff6b6b",
  },
});

// Create from scratch
const custom = Theme.create({
  name: "custom",
  colors: {
    text: "#ffffff",
    muted: "#888888",
    background: "#000000",
    accent: "#00ff00",
    success: "#00ff00",
    warning: "#ffff00",
    error: "#ff0000",
    border: "#333333",
    selection: "#0066cc",
  },
});
```

### useTheme Hook

```tsx
function ThemedComponent() {
  const { current: theme, cycle, setTheme, names } = useTheme();

  return (
    <box backgroundColor={theme().colors.background}>
      <text color={theme().colors.accent}>Accent text</text>
      <text onPress={cycle}>Press to cycle themes</text>
    </box>
  );
}
```

---

## Components

### MasterDetail

Slot-based two-panel layout:

```tsx
<MasterDetail
  header="App Title" // Header text
  headerIcon="📋" // Optional emoji
  breadcrumb={["A", "B", "C"]} // Navigation path
  footer="q: Quit | t: Theme" // Shortcuts hint
  masterWidth="35%" // Left panel width
  master={<LeftPanel />} // Master slot (list)
  detail={<RightPanel />} // Detail slot (custom)
/>
```

### VirtualList

Virtualized scrollable list:

```tsx
<VirtualList
  items={items} // Array or Accessor<Array>
  selectedIndex={idx()} // Current selection
  onSelect={setIdx} // Selection callback
  viewportHeight={20} // Visible rows
  title="Items" // Optional title
  getLabel={(item) => item.name} // Label extractor
  showIndicator={true} // Show "›" indicator
  renderItem={(
    item,
    idx,
    sel, // Custom renderer
  ) => <MyItem item={item} selected={sel} />}
/>
```

### Breadcrumb

Navigation path display:

```tsx
<Breadcrumb segments={["Home", "Category", "Item"]} separator="›" />
```

### createVirtualListController

Hook for external navigation control:

```tsx
const list = createVirtualListController(
  () => items, // Items accessor
  selectedIdx, // Selection accessor
  setSelectedIdx, // Setter
  viewportHeight, // Height accessor
);

// Use in keyboard handler
useKeyboard((key) => {
  if (key.name === "up") list.selectPrevious();
  if (key.name === "down") list.selectNext();
});

// Access scroll state
console.log(list.scrollOffset());
```

---

## Keyboard Navigation

### useKeyboard

```tsx
import { useKeyboard } from "@alcyone-labs/arg-parser/tui";

useKeyboard((key) => {
  console.log(key.name); // "up", "down", "enter", "q", etc.
  console.log(key.ctrl); // true if Ctrl held
  console.log(key.shift); // true if Shift held

  if (key.name === "q") exit(0);
  if (key.ctrl && key.name === "c") exit(0);
});
```

### Shortcut Bindings

```tsx
<TuiProvider
  shortcuts={[
    { key: "q", action: () => exit(0), description: "Quit" },
    { key: "t", action: cycleTheme, description: "Cycle theme" },
    { key: "ctrl+r", action: refresh, description: "Refresh" },
  ]}
>
```

---

## TTY Utilities

```ts
import {
  cleanupTerminal, // Full cleanup (call on exit)
  clearScreen,
  disableMouseReporting,
  enableMouseReporting, // Enable mouse wheel
  resetAttributes,
  restoreStdin,
} from "@alcyone-labs/arg-parser/tui";
```

---

## Complete Example

```tsx
import { createSignal } from "solid-js";
import {
  cleanupTerminal,
  createVirtualListController,
  MasterDetail,
  render,
  TuiProvider,
  useTheme,
  useTui,
  useKeyboard,
  VirtualList,
} from "@alcyone-labs/arg-parser/tui";

interface Item {
  id: string;
  name: string;
  value: number;
}

const DATA: Item[] = Array.from({ length: 100 }, (_, i) => ({
  id: `item_${i}`,
  name: `Item ${i + 1}`,
  value: Math.random() * 100,
}));

function ItemDetails(props: { item: Item }) {
  const { current: theme } = useTheme();
  return (
    <>
      <text bold color={theme().colors.accent}>
        {props.item.name}
      </text>
      <text color={theme().colors.muted}>ID: {props.item.id}</text>
      <text color={theme().colors.text}>
        Value: {props.item.value.toFixed(2)}
      </text>
    </>
  );
}

function App() {
  const { viewportHeight, exit } = useTui();
  const { current: theme, cycle } = useTheme();
  const [idx, setIdx] = createSignal(0);

  const list = createVirtualListController(
    () => DATA,
    idx,
    setIdx,
    viewportHeight,
  );

  useKeyboard((key) => {
    if (key.name === "q") exit(0);
    if (key.name === "t") cycle();
    if (key.name === "j" || key.name === "down") list.selectNext();
    if (key.name === "k" || key.name === "up") list.selectPrevious();
  });

  return (
    <MasterDetail
      header="Data Browser"
      headerIcon="📊"
      breadcrumb={["Items", DATA[idx()]!.name]}
      footer={`j/k: Navigate | t: Theme (${theme().name}) | q: Quit`}
      master={
        <VirtualList
          items={DATA}
          selectedIndex={idx()}
          onSelect={setIdx}
          viewportHeight={viewportHeight()}
          title="Items"
          getLabel={(item) => item.name}
        />
      }
      detail={<ItemDetails item={DATA[idx()]!} />}
    />
  );
}

render(
  () => (
    <TuiProvider
      theme="dark"
      onScroll={(d) => {
        /* Mouse scroll handled here */
      }}
    >
      <App />
    </TuiProvider>
  ),
  { onDestroy: cleanupTerminal },
);
```

Run: `bun my-app.tsx`

---

## API Reference

| Export                        | Description                               |
| ----------------------------- | ----------------------------------------- |
| `TuiProvider`                 | Unified provider for all TUI features     |
| `useTui`                      | Hook for viewport/exit access             |
| `useTheme`                    | Hook for theme access                     |
| `THEMES`                      | Built-in theme presets                    |
| `Theme`                       | Theme builder (`.from().extend()`)        |
| `MasterDetail`                | Two-panel layout component                |
| `VirtualList`                 | Virtualized scrollable list               |
| `Breadcrumb`                  | Navigation path component                 |
| `createVirtualListController` | List navigation hook                      |
| `cleanupTerminal`             | TTY cleanup function                      |
| `useKeyboard`                 | Keyboard input hook (re-exported)         |
| `render`                      | Render function (re-exported)             |
