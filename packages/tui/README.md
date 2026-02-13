# @alcyone-labs/arg-parser-tui

OpenTUI plugin for @alcyone-labs/arg-parser.

## Installation

```bash
npm install @alcyone-labs/arg-parser @alcyone-labs/arg-parser-tui
npm install @opentui/core @opentui/solid
```

## Quick Start

```tsx
import { ArgParser } from '@alcyone-labs/arg-parser';
import { tuiPlugin, createTuiApp, TuiProvider } from '@alcyone-labs/arg-parser-tui';

const parser = new ArgParser({
  appName: 'my-tui-app',
  handler: async (ctx) => {
    const app = createTuiApp({
      component: () => (
        <TuiProvider theme="dark">
          <text>Hello, TUI!</text>
        </TuiProvider>
      ),
      title: 'My TUI App'
    });
    
    await app.run();
  }
})
  .use(tuiPlugin({ theme: 'dark' }));

await parser.parse();
```

## Features

- OpenTUI integration for terminal UI
- SolidJS-based reactive components
- Theme support (dark/light)
- Mouse support
- Keyboard shortcuts

## Options

- `theme`: Default theme ('dark' or 'light')
- `mouseSupport`: Enable mouse support (default: true)
- `title`: App title

## License

MIT
