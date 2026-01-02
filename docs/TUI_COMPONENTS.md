# TUI Component Reference

This document provides detailed reference information for all TUI components available in the ArgParser TUI SDK.

## Table of Contents

- [Input Component](#input-component)
- [List Component](#list-component)
- [ScrollArea Component](#scrollarea-component)
- [Label Component](#label-component)
- [Button Component](#button-component)
- [Card Component](#card-component)
- [Toast Component](#toast-component)
- [SplitLayout Component](#splitlayout-component)
- [StackNavigator Component](#stacknavigator-component)
- [App Component](#app-component)
- [Theme System](#theme-system)
- [Clipboard Utility](#clipboard-utility)

---

## Input Component

A text input field with validation and event handling.

### Constructor

```typescript
new UI.Input({
  placeholder?: string,
  prefix?: string,
  suffix?: string,
  onChange?: (value: string) => void,
  onSubmit?: (value: string) => void,
  validator?: (value: string) => string | null
})
```

### Properties

| Property      | Type       | Description                        |
| ------------- | ---------- | ---------------------------------- |
| `placeholder` | `string`   | Text shown when input is empty     |
| `prefix`      | `string`   | Text shown before the input cursor |
| `suffix`      | `string`   | Text shown after the input cursor  |
| `onChange`    | `function` | Callback when input value changes  |
| `onSubmit`    | `function` | Callback when Enter is pressed     |
| `validator`   | `function` | Function to validate input         |

### Methods

| Method       | Signature | Description                      |
| ------------ | --------- | -------------------------------- |
| `getValue()` | `string`  | Get current input value          |
| `setValue()` | `void`    | Set input value programmatically |
| `focus()`    | `void`    | Focus the input field            |
| `blur()`     | `void`    | Remove focus from input field    |

### Usage Example

```typescript
const input = new UI.Input({
  placeholder: "Enter your name...",
  onChange: (value) => {
    console.log("Input changed:", value);
  },
  onSubmit: (value) => {
    console.log("Form submitted:", value);
  },
});
```

---

## List Component

An interactive list with keyboard navigation and selection handling.

### Constructor

```typescript
new UI.List({
  items: UI.IListItem[],
  onSelect?: (item: UI.IListItem) => void,
  onSubmit?: (item: UI.IListItem) => void,
  multiSelect?: boolean
})
```

### Properties

| Property      | Type             | Description                     |
| ------------- | ---------------- | ------------------------------- |
| `items`       | `UI.IListItem[]` | Array of list items             |
| `onSelect`    | `function`       | Callback when selection changes |
| `onSubmit`    | `function`       | Callback when Enter is pressed  |
| `multiSelect` | `boolean`        | Enable multiple selections      |

### Type Definition

```typescript
interface UI.IListItem {
  label: string;
  value: string;
  description?: string;
}
```

### Usage Example

```typescript
const list = new UI.List({
  items: [
    { label: "Option 1", value: "opt1", description: "First option" },
    { label: "Option 2", value: "opt2", description: "Second option" },
  ],
  onSelect: (item) => {
    console.log("Selected:", item);
  },
});
```

---

## ScrollArea Component

A scrollable content area with mouse wheel support and visual scrollbar.

### Constructor

```typescript
new UI.ScrollArea({
  content: string,
  scrollBarColor?: string
})
```

### Properties

| Property         | Type     | Description                   |
| ---------------- | -------- | ----------------------------- |
| `content`        | `string` | Initial content to display    |
| `scrollBarColor` | `string` | Color for scrollbar indicator |

### Methods

| Method             | Signature | Description                 |
| ------------------ | --------- | --------------------------- |
| `setContent()`     | `void`    | Update the content          |
| `scrollTo()`       | `void`    | Scroll to specific position |
| `scrollToTop()`    | `void`    | Scroll to beginning         |
| `scrollToBottom()` | `void`    | Scroll to end               |

### Usage Example

```typescript
const scrollArea = new UI.ScrollArea({
  content: "Long content that will scroll...",
});

// Update content later
scrollArea.setContent("New content...");
```

---

## Label Component

A flexible text component with alignment and basic styling.

### Constructor

```typescript
new UI.Label({
  text: string,
  align?: "left" | "center" | "right",
  dim?: boolean,
  onClick?: () => void,
  style?: IComponentStyle
})
```

### Properties

| Property  | Type       | Description    |
| --------- | ---------- | -------------- |
| `text`    | `string`   | Text content   |
| `align`   | `string`   | Text alignment |
| `dim`     | `boolean`  | Muted styling  |
| `onClick` | `function` | Click handler  |

### Usage Example

```typescript
new UI.Label({
  text: "Click to Copy ID",
  onClick: () => {
    UI.Clipboard.copy("ID-123");
    app.toast.show("Copied!", "success");
  },
});
```

---

## Button Component

A clickable button with customizable styling.

### Constructor

```typescript
new UI.Button({
  label: string,
  onPress?: () => void,
  style?: "primary" | "secondary" | "danger"
})
```

### Properties

| Property  | Type       | Description           |
| --------- | ---------- | --------------------- |
| `label`   | `string`   | Button text           |
| `onPress` | `function` | Callback when clicked |
| `style`   | `string`   | Visual style variant  |

### Usage Example

```typescript
const button = new UI.Button({
  label: "Click Me!",
  onPress: () => {
    console.log("Button clicked!");
  },
  style: "primary",
});
```

---

## ProgressBar Component

A visual progress indicator for operations.

### Constructor

```typescript
new UI.ProgressBar({
  value: number, // 0.0 to 1.0
  label?: string,
  showPercentage?: boolean
})
```

### Properties

| Property         | Type      | Description             |
| ---------------- | --------- | ----------------------- |
| `value`          | `number`  | Current progress (0-1)  |
| `label`          | `string`  | Optional label text     |
| `showPercentage` | `boolean` | Show percentage display |

### Methods

| Method       | Signature | Description           |
| ------------ | --------- | --------------------- |
| `setValue()` | `void`    | Update progress value |

### Usage Example

```typescript
const progressBar = new UI.ProgressBar({
  value: 0.75,
  label: "Loading...",
  showPercentage: true,
});

// Update progress
progressBar.setValue(0.9);
```

---

## SplitLayout Component

Divides space into two regions with configurable ratio and direction.

### Constructor

```typescript
new UI.SplitLayout({
  direction: "horizontal" | "vertical",
  splitRatio: number | "auto", // 0.0 to 1.0 or "auto" (v2.10.4)
  gap?: number, // column gap between panes (v2.10.4)
  first: UI.Component,
  second: UI.Component,
});
```

### Properties

| Property     | Type               | Description                                                        |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| `direction`  | `string`           | Layout direction                                                   |
| `splitRatio` | `number \| "auto"` | Size ratio for first component. "auto" uses `getPreferredWidth()`. |
| `gap`        | `number`           | Space between panes                                                |
| `first`      | `UI.Component`     | First component                                                    |
| `second`     | `UI.Component`     | Second component                                                   |

### Usage Example

```typescript
const layout = new UI.SplitLayout({
  direction: "horizontal",
  splitRatio: 0.3,
  first: leftPanel,
  second: rightPanel,
});
```

---

## StackNavigator Component

Manages a stack of components with navigation history.

### Constructor

```typescript
new UI.StackNavigator({
  initialComponent: UI.Component,
});
```

### Methods

| Method      | Signature | Description                   |
| ----------- | --------- | ----------------------------- |
| `push()`    | `void`    | Push new component onto stack |
| `pop()`     | `void`    | Remove current component      |
| `replace()` | `void`    | Replace current component     |

### Usage Example

```typescript
const navigator = new UI.StackNavigator({
  initialComponent: firstScreen,
});

// Navigate to new screen
navigator.push(secondScreen);

// Go back
navigator.pop();
```

---

## App Component

The main application controller that manages the TUI lifecycle.

### Constructor

```typescript
new UI.App();
```

### Methods

| Method   | Signature | Description               |
| -------- | --------- | ------------------------- |
| `run()`  | `void`    | Start the TUI application |
| `exit()` | `void`    | Exit the application      |

### Usage Example

```typescript
const app = new UI.App();
app.run(rootComponent);
```

---

## Theme System

Provides theming capabilities with built-in and custom themes.

### Available Themes

- `"Default"` - Dark theme with blue accents
- `"Light"` - Light theme with subtle colors
- `"Monokai"` - Popular dark theme
- `"Dracula"` - Dark purple theme

### Theme Manager

```typescript
// Set theme
UI.ThemeManager.setTheme("Default");

// Get current theme
const currentTheme = UI.ThemeManager.current;

// Register custom theme
UI.ThemeManager.registerTheme(customTheme);
```

### Theme Colors

| Color        | Description                |
| ------------ | -------------------------- |
| `primary`    | Main action color          |
| `secondary`  | Secondary action color     |
| `accent`     | Highlight color            |
| `success`    | Success state color        |
| `warning`    | Warning state color        |
| `error`      | Error state color          |
| `muted`      | Disabled/subtle text color |
| `background` | Background color           |
| `text`       | Primary text color         |

### Usage Example

```typescript
const t = UI.ThemeManager.current;
const styledText = `${t.accent("Important")} ${t.muted("secondary info")}`;
```

---

## Event Handling

### Keyboard Events

| Key             | Description            |
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

### Best Practices

1. **Component Composition**: Build complex UIs by combining simple components
2. **Responsive Design**: Handle different terminal sizes
3. **Event Delegation**: Use proper event handling patterns
4. **Performance**: Only call `markDirty()` when state changes
5. **Accessibility**: Use semantic colors and clear labels
6. **Error Handling**: Implement proper validation and error states

---

## Clipboard Utility

Cross-platform clipboard helper.

### Methods

| Method   | Signature                         | Description            |
| -------- | --------------------------------- | ---------------------- |
| `copy()` | `(text: string) => Promise<void>` | Copy text to clipboard |

### Usage Example

```typescript
await UI.Clipboard.copy("Hello World");
```
