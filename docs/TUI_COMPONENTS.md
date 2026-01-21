# TUI Component Reference (v2)

This document provides detailed reference information for the modern, reactive components available in the ArgParser TUI SDK (v2).

## Table of Contents

- [Layout Components](#layout-components)
  - [Card & StatCard](#card--statcard)
  - [MasterDetail](#masterdetail)
  - [Breadcrumb](#breadcrumb)
- [Interactive Components](#interactive-components)
  - [Button](#button)
  - [VirtualList](#virtuallist)
- [Navigation & Content](#navigation--content)
  - [DrillDownNavigator](#drilldownnavigator)
  - [MarkdownBlock](#markdownblock)
- [Providers & Hooks](#providers--hooks)
  - [TuiProvider](#tuiprovider)
  - [useTheme](#usetheme)
  - [useShortcuts](#useshortcuts)
  - [useToast](#usetoast)

---

## Layout Components

### `Card` & `StatCard`

Containers with borders, titles, and optional padding.

#### Props (`Card`)

| Prop          | Type          | Description                            |
| ------------- | ------------- | -------------------------------------- |
| `title`       | `string`      | Title displayed at the top             |
| `padding`     | `number`      | Internal padding (default: 0)          |
| `borderStyle` | `string`      | Border style (double, single, rounded) |
| `children`    | `JSX.Element` | Content of the card                    |

#### Props (`StatCard`)

| Prop     | Type                       | Description              |
| -------- | -------------------------- | ------------------------ |
| `label`  | `string`                   | Label for the metric     |
| `value`  | `number \| string`         | Main value to display    |
| `format` | `"percent" \| "number"`    | Value formatting         |
| `trend`  | `"up" \| "down" \| "none"` | Optional trend indicator |

```tsx
<StatCard label="Memory usage" value={0.65} format="percent" trend="up" />
```

---

### `MasterDetail`

A flexible split-pane layout with a "Master" list and "Detail" view.

#### Props

| Prop          | Type                         | Description                  |
| ------------- | ---------------------------- | ---------------------------- |
| `header`      | `string \| JSX.Element`      | Optional header content      |
| `master`      | `JSX.Element`                | Left/Top content             |
| `detail`      | `JSX.Element`                | Right/Bottom content         |
| `masterSize`  | `string`                     | Size of master (e.g., "30%") |
| `orientation` | `"horizontal" \| "vertical"` | Split orientation            |

---

### `Breadcrumb`

A path indicator typically used for navigation context.

#### Props

| Prop        | Type       | Description                        |
| ----------- | ---------- | ---------------------------------- |
| `items`     | `string[]` | Array of path segments             |
| `separator` | `string`   | Separator character (default: `>`) |

---

## Interactive Components

### `Button`

Standard button with hover and active states.

#### Props

| Prop       | Type                               | Description         |
| ---------- | ---------------------------------- | ------------------- |
| `label`    | `string`                           | Text content        |
| `onClick`  | `() => void`                       | Event handler       |
| `variant`  | `"primary" \| "danger" \| "muted"` | Visual style        |
| `disabled` | `boolean`                          | Disable interaction |

---

### `VirtualList`

A high-performance list that only renders visible items.

#### Props

| Prop            | Type                         | Description              |
| --------------- | ---------------------------- | ------------------------ |
| `items`         | `any[]`                      | Data items               |
| `selectedIndex` | `number`                     | Currently selected index |
| `onSelect`      | `(item: any) => void`        | Triggered on select      |
| `renderItem`    | `(item: any) => JSX.Element` | Custom item renderer     |

---

## Navigation & Content

### `DrillDownNavigator`

Stack-based navigation for deep hierarchies.

#### Props

| Prop       | Type                              | Description                                   |
| ---------- | --------------------------------- | --------------------------------------------- |
| `children` | `(nav: Navigator) => JSX.Element` | children as function receiving nav controller |

---

### `MarkdownBlock`

Renders markdown-formatted text.

#### Props

| Prop      | Type     | Description   |
| --------- | -------- | ------------- |
| `content` | `string` | Markdown text |

---

## Providers & Hooks

### `TuiProvider`

The essential wrapper for any TUI application.

```tsx
<TuiProvider theme="dark">
  <MyApp />
</TuiProvider>
```

### Hooks

| Hook             | Description                        |
| ---------------- | ---------------------------------- |
| `useTui()`       | Access global TUI state and config |
| `useTheme()`     | Get current theme and colors       |
| `useShortcuts()` | Register local keyboard shortcuts  |
| `useToast()`     | Trigger transient notifications    |
