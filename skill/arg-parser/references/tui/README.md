# TUI Reference

Everything about Terminal User Interface (TUI) in ArgParser.

## Overview

Two TUI frameworks available:

- **Modern**: OpenTUI v2 (SolidJS-based, recommended)
- **Legacy**: Simple component-based TUI

## Components (OpenTUI v2)

| Component            | Purpose                   |
| -------------------- | ------------------------- |
| `TuiProvider`        | Main app wrapper          |
| `VirtualList`        | Efficient scrolling lists |
| `MasterDetail`       | Master-detail layout      |
| `Card` / `StatCard`  | Card components           |
| `Button`             | Interactive buttons       |
| `DrillDownNavigator` | Navigation hierarchy      |
| `MarkdownBlock`      | Markdown rendering        |

## When to Use

- Interactive CLI tools
- File explorers
- Data dashboards
- Configuration UIs
- Any terminal-based UI

## Peer Dependencies

```json
{
  "@opentui/core": "^2.0.0",
  "@opentui/solid": "^2.0.0",
  "solid-js": "^1.8.0"
}
```

## Related Files

- `api.md` - Component API reference
- `patterns.md` - TUI patterns
