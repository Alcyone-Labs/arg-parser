## Changelog

### v2.14.0

**New Feature: Interactive Prompts with @clack/prompts**

Added comprehensive interactive prompt support using @clack/prompts, enabling dual-mode CLIs that work both programmatically (via flags) and interactively (via prompts).

#### Interactive Prompts Core Features

- **`promptWhen` Configuration**: Control when prompts appear:
  - `"interactive-flag"` (default): Show prompts when `--interactive` or `-i` flag is present
  - `"missing"`: Show prompts when any promptable flag is missing a value
  - `"always"`: Always show prompts (overrides CLI args)

- **Prompt Types**: Support for all @clack/prompts types:
  - `text` - Free text input with validation
  - `password` - Hidden input for sensitive data
  - `confirm` - Yes/no boolean prompts
  - `select` - Single choice from list with hints
  - `multiselect` - Multiple selections with array output

- **Sequential Prompts**: Chain prompts with dependencies using `promptSequence`:

```typescript
cli.addFlag({
  name: "environment",
  promptSequence: 1,
  prompt: async () => ({ type: "select", message: "Env:", options: ["staging", "prod"] }),
} as IPromptableFlag);

cli.addFlag({
  name: "version",
  promptSequence: 2,
  prompt: async (ctx) => {
    const env = ctx.promptAnswers?.environment; // Access previous answer
    return { type: "select", message: `Version for ${env}:`, options: getVersions(env) };
  },
} as IPromptableFlag);
```

- **Validation & Re-prompt**: Built-in validation with automatic re-prompt on failure:

```typescript
prompt: async () => ({
  type: "text",
  message: "Email:",
  validate: (val) => val.includes("@") || "Invalid email",
});
```

- **TTY Detection**: Automatically falls back to flag-only mode in CI/pipes (non-TTY environments)

- **Cancel Handling**: Graceful Ctrl+C handling with `onCancel` callback

#### New APIs

- **`IPromptableFlag`** interface - Extends `IFlag` with `prompt` and `promptSequence` properties
- **`IInteractiveSubCommand`** interface - Extends `ISubCommand` with `promptWhen` and `onCancel`
- **`PromptManager`** class - Manages prompt execution, sorting, and validation
  - `PromptManager.isInteractiveEnvironment()` - Check TTY status
  - `PromptManager.shouldTriggerInteractive()` - Check trigger conditions
  - `PromptManager.sortFlagsBySequence()` - Sort prompts by sequence
- **`IHandlerContext` extensions**:
  - `promptAnswers?: Record<string, any>` - Collected prompt answers
  - `isInteractive?: boolean` - Whether running in interactive mode
- **ArgParser methods**:
  - `getPromptableFlags()` - Get all flags with prompt configuration
  - `getPromptWhen()` / `setPromptWhen()` - Get/set prompt trigger mode
  - `setOnCancel()` - Set cancel callback

#### System Flags Enhancement

- **`args.systemArgs`** - System flags (like `--s-debug`, `--s-mcp-serve`) are now exposed in handler context:

```typescript
handler: async (ctx) => {
  console.log(ctx.systemArgs); // { debug: true, mcpServe: true, ... }
};
```

#### Flag Options Collision Detection

- **Enhanced `FlagManager`** now detects and warns about option string collisions:

```typescript
// This will warn: "-f" collides between "file" and "force" flags
cli.addFlag({ name: "file", options: ["-f", "--file"], type: "string" });
cli.addFlag({ name: "force", options: ["-f", "--force"], type: "boolean" }); // Warning!
```

- Configure behavior with `detectOptionCollisions` and `throwForOptionCollisions` options

#### Documentation & Examples

- **Comprehensive Examples**: Added `examples/interactive-prompts-examples.ts` with 5 working examples:
  1. Basic greeting CLI
  2. Deployment with dynamic versions
  3. Git helper with "missing" trigger
  4. Database setup with password prompts
  5. Feature installer with multiselect
- **Master Example Runner**: Interactive demo that lets users select and run any example

- **Complete Documentation**:
  - `docs/specs/INTERACTIVE_PROMPTS.md` - Full specification
  - `docs/CORE_CONCEPTS.md` - Updated with interactive prompts section
  - JSDoc for all new public APIs
  - 24 comprehensive test cases

#### Usage Example

```typescript
import { ArgParser, type IPromptableFlag } from "@alcyone-labs/arg-parser";

const cli = new ArgParser({
  appName: "deploy-tool",
  promptWhen: "interactive-flag",
  handler: async (ctx) => {
    // Merge CLI args with prompt answers
    const env = ctx.args.environment || ctx.promptAnswers?.["environment"];
    console.log(`Deploying to ${env}...`);
  },
});

// Add interactive flag
cli.addFlag({
  name: "interactive",
  options: ["--interactive", "-i"],
  type: "boolean",
  flagOnly: true,
});

// Add promptable flag
cli.addFlag({
  name: "environment",
  options: ["--env", "-e"],
  type: "string",
  prompt: async () => ({
    type: "select",
    message: "Select environment:",
    options: [
      { label: "Staging", value: "staging", hint: "Safe for testing" },
      { label: "Production", value: "production", hint: "Careful!" },
    ],
  }),
} as IPromptableFlag);

await cli.parse();
```

#### Breaking Changes

None. All changes are additive and backward compatible.

### v2.13.5

**OpenTUI TUI Display Fixes**

Fixed critical issues where TUI applications would not display properly in remote projects after pulling from NPM registry:

- **Automatic Terminal Setup**: `createTuiApp()` and `TuiProvider` now automatically:
  - Call `switchToAlternateScreen()` and `enableMouseReporting()` on mount
  - Call `cleanupTerminal()` on component destroy/exit
  - This ensures the terminal is properly configured before rendering and cleaned up on exit

- **Peer Dependencies**: Moved `@opentui/core` and `@opentui/solid` to `peerDependencies` to make OpenTUI requirements explicit for consumers. Users must install these packages when using TUI features.

- **Runtime Documentation**: Added Bun runtime requirement warning to README. OpenTUI requires Bun, not Node.js. Remote projects running on Node.js will experience issues.

- **New TUI Tests**: Added comprehensive test suite (`tests/tui/tui.test.ts`) with 20 tests covering:
  - Terminal utility function exports and behavior
  - Terminal setup/cleanup sequences
  - Theme system exports and Theme builder functionality
  - All provider, component, and hook exports
  - Mouse event parsing
  - Peer dependencies verification

- **Exports**: Added `switchToAlternateScreen()` and `switchToMainScreen()` to TUI exports for advanced use cases.

### v2.13.4

- Fixing OpenTUI compilation & bundling issues

### v2.13.3

- Fixing bundling issues

### v2.13.2

**Documentation Refactor**

- Restructured documentation with new comprehensive guides:
  - `README` was completely broken down into sub-components
  - `CHANGELOG.md` - Complete version history from v1.1.0 to v2.13.2
  - `CORE_CONCEPTS.md` - Flags, types, inheritance, and feature documentation
  - `MCP.md` - Model Context Protocol integration guide
  - `MIGRATION_V2.md` - v1.x to v2.0 ArgParser migration guide
  - `BACKLOG.md` - Completed features and future roadmap (this is quite outdated now)

- TUI documentation updates:
  - Re-exports `render` and `useKeyboard` from `@alcyone-labs/arg-parser/tui`
  - Removed external `@opentui/solid` dependency from examples
  - Updated component imports table

- General cleanup:
  - Simplified README table of contents
  - Removed obsolete PRD files
  - Updated `DXT_MIGRATION.md` and `DISPLAY_HELP.md`

### v2.13.1

**Fixes**

- OpenTUI implementation now properly exits and cleans the context
- Sub-command description now properly displays in displayHelp() screen

### v2.13.0

**New Feature: Positional Arguments**

Added support for positional (trailing) arguments, enabling more natural CLI syntax:

```bash
# Before: flags required
workflow show --id 8fadf090-xxx

# After: positional syntax works too!
workflow show 8fadf090-xxx
```

Flags can now specify `positional: N` (1-indexed) to capture trailing arguments:

```typescript
.addFlag({
  name: "id",
  type: "string",
  mandatory: true,
  options: ["--id"],      // Still works as fallback
  positional: 1,          // Captures first trailing arg
  description: "Resource ID",
})
```

Key features:

- **Dual syntax**: Both `--flag value` and positional work interchangeably
- **Precedence**: Flag syntax takes priority if both provided
- **Multiple positional args**: Use `positional: 1`, `positional: 2`, etc.
- **Help text enhancement**: Shows usage pattern like `Usage: cmd [OPTIONS] <ID>`
- **Full validation**: Works with `mandatory`, type coercion, and enum validation
- **Automatic help documentation**: Positional information is automatically included in help output

See [Positional Arguments](./docs/CORE_CONCEPTS.md#positional-arguments) for complete documentation.

### v2.12.3

**Fixes**

- Make sure that when setWorkingDir is used, the newly discovered .env override process.env variables
- Display subcommand descriptions on separate lines for better readability

### v2.12.2

**Fixes**

- Fix env config matching and improve working directory integration

Explicitly call dotenv.config when an env file is auto-discovered
to populate process.env. This ensures flags with the 'env' property
can bind values from the discovered file.

### v2.12.0

- Switch back to official @modelcontextprotocol/sdk as it now supports Zod V4, this resolves a security issue from a dependency in MCP SDK @ 1.16.0 branch.

### v2.11.0

Working Directory Management & OpenTUI v2 Framework

#### Working Directory Management (chdir)

A major new capability for monorepo support and complex project structures:

- **`setWorkingDirectory` Flag Property**: Designate any flag's value as the effective working directory. When used, `.env` file loading and relative path operations automatically resolve from this directory.
- **`rootPath` in Handler Context**: Access the original working directory (where the user ran the command) via `ctx.rootPath`. Perfect for displaying user-friendly paths or resolving user-provided files relative to their PWD.
- **Smart `.env` Auto-Discovery**: When used with `--s-with-env`, automatically discovers `.env.local`, `.env.local.json`, `.env.dev`, `.env.test`, or `.env` in the effective working directory (priority order).
- **Protected Validation**: Warnings for invalid paths (nonexistent, not a directory) and multiple workspace flags.

```typescript
const parser = new ArgParser({
  appName: "Monorepo CLI",
  handler: async (ctx) => {
    console.log("Effective cwd:", process.cwd()); // Changed by --workspace
    console.log("User's cwd:", ctx.rootPath); // Original location
  },
}).addFlag({
  name: "workspace",
  options: ["--workspace", "-w"],
  type: "string",
  setWorkingDirectory: true, // Makes this flag control the working directory
});
```

See [Working Directory Documentation](./docs/WORKING_DIRECTORY.md) for complete examples.

#### OpenTUI v2 - Complete TUI Rewrite

The TUI framework has been completely rewritten using **SolidJS** and **SST's OpenTUI** for a reactive, component-based architecture:

- **Reactive Components**: `TuiProvider`, `VirtualList`, `MasterDetail`, `Breadcrumb` built on SolidJS signals.
- **Unified Provider**: `TuiProvider` handles mouse wheel reporting, terminal resize, TTY cleanup, and theme/shortcut contexts automatically.
- **Rich Theme System**: 6 built-in themes (`dark`, `light`, `monokai`, `dracula`, `nord`, `solarized`) with `Theme.from().extend()` for custom themes.
- **VirtualList**: Efficient virtualized scrolling with `createVirtualListController` for navigation control.
- **Slot-Based Layouts**: `MasterDetail` component with header, breadcrumb, footer, and customizable panel widths.
- **Hooks**: `useTui()` for viewport/exit, `useTheme()` for theming, plus mouse and virtual scroll hooks.
- **TTY Utilities**: Exported `cleanupTerminal`, `enableMouseReporting`, etc. for custom terminal control.

```tsx
import { MasterDetail, TuiProvider, useTui, VirtualList } from "@alcyone-labs/arg-parser/tui";
import { render } from "@opentui/solid";

function App() {
  const { viewportHeight, exit } = useTui();
  const [idx, setIdx] = createSignal(0);

  return (
    <MasterDetail
      header="My App"
      master={<VirtualList items={DATA} selectedIndex={idx()} onSelect={setIdx} />}
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

See [TUI Documentation](./docs/TUI.md) for complete API reference and examples.

#### Other Improvements

- **Data-Safe Logging**: Integrated `@alcyone-labs/simple-mcp-logger` for STDOUT-safe logging.
- **Bun Configuration**: Added `bunfig.toml` with OpenTUI preload for native JSX support.
- **New Examples**: `aquaria-trace-viewer.tsx`, `framework-demo.tsx`, `template-demo.tsx`, `tui-demo-v2.tsx`.

### v2.10.3

**Flag Inheritance Improvements**

- **Full Chain Inheritance**: Introduced `FlagInheritance.AllParents` option to support deep flag propagation. This fixes issues where nested sub-commands (e.g., `root > mid > leaf`) failed to inherit root flags when constructed bottom-up.
- **Granular Control**: New `FlagInheritance` configuration object provides clear options: `NONE`, `DirectParentOnly` (legacy behavior), and `AllParents`.
- **Type Safety**: New `TFlagInheritance` type definition for better TypeScript support.
- **Backward Compatibility**: Kept `inheritParentFlags` for legacy behavior, but now it's just an alias for `FlagInheritance.DirectParentOnly`.

**Auto-Help Features**

- **Programmatic Help**: Added `ctx.displayHelp()` method to command handlers, allowing easy help display from within your logic.
- **Auto-Trigger**: Added `triggerAutoHelpIfNoHandler` option to automatically show help messages for "container" commands that don't have their own handler.
- **Helper Function**: Exported `autoHelpHandler` utility for quick setup of help-only commands. This can be passed as `setHandler(autoHelpHandler)` or `handler: autoHelpHandler` depending on your API of choice.

### v2.10.2

**OpenTUI Improvements**

- **Soft Wrapping**: Added `wrapText` (boolean) to `ScrollArea` component. When enabled, text automatically reflows to fit the container width (preventing clipping).
- **ANSI Preservation**: Soft-wrapping logic is ANSI-aware; color and style states are correctly carried over to wrapped lines.

### v2.10.1

- **Bug Fixes**:
  - Fixed a crash in `Terminal.moveCursor` when running in certain environments where `node:readline` utilities were inaccessible. Switched to direct ANSI escape codes for cursor positioning.

### v2.10.0 - OpenTUI integration + IFlag "env" property now first-class citizen

#### OpenTUI Integration

- **OpenTUI**: Integrated a complete Terminal User Interface (TUI) framework into the library core.
- **StackNavigator**: Standardized UX for deep navigation with `Enter`/`Right` to push and `Esc`/`Left` to pop views.
- **Reactive Themes**: Centralized `ThemeManager` with `Default`, `Ocean` (High-Contrast), and `Monokai` presets.
- **Scroll Performance**: ANSI-aware left-side scrollbars with automatic height calculation and scroll-state management.
- **Mouse Integration**: Native SGR mouse reporting for wheel scrolling and hit-detected clicks.
- **Safety**: Robust TTY restoration and process-level cleanup to prevent terminal lockups on exit or crash.
- **Components**: Exported `List`, `ScrollArea`, `Input`, and `SplitLayout` under the `UI` namespace.

#### Universal Environment Variable Support

- **Universal `env` Support**: The `env` property is now a core feature available to all commands and tools, not just DXT/MCP contexts.
- **Resolution Priority**: Implemented strict precedence: **CLI Flag > Environment Variable > Default Value**.
- **Reverse Sync**: Resolved flag values (from CLI or Env) are now automatically synced back to `process.env`, ensuring downstream code sees the correct configuration.
- **Flexible Mapping**: Supports both string and array-of-strings for `env` (first match wins).
- **Automatic Type Conversion**: Environment variables are automatically coerced to the flag's defined type (Number, Boolean, etc.).

### v2.8.2

- UX: Help shows example values via `valueHint` for non-boolean flags; repeatable flags display 'Multiple values allowed (repeat flag)' with example; examples use `valueHint` when present.
- Types: Added `IFlag.valueHint?: string`; accepted by `zodFlagSchema`; included in processed flags; supported in manifest-driven dynamic flags.
- Examples: `examples/core/dynamic-flags-demo.ts` updated to demonstrate `valueHint` for `--url`.

### v2.8.1

- Feature: Dynamic flags via `IFlag.dynamicRegister(ctx)` to register additional flags at runtime (e.g., from a manifest file)
- Help: `--help` preloads dynamic flags without executing handlers; help output includes both static and dynamic flags
- Flow: Two-phase parsing (load dynamic flags → re-parse with full flag set)
- Cleanup: Dynamically registered flags are reset between parses to avoid accumulation
- Types: Exported `DynamicRegisterContext` and `DynamicRegisterFn`
- Internal: `FlagManager.removeFlag(name)` to support cleanup

### v2.7.2

**Feat**

**MCP**:

- outputSchema is now included in MCP tool registration for MCP 2025-06-18+ clients and will generate a JSON Schema in `tools/list` responses to make JSON introspection easier.

**Fixes and Changes**

**MCP**:

- The app parameter in configureExpress: (app) => {} is now fully typed to improve intellisense.
- Express' x-powered-by was disabled by default. It can be re-enabled or changed via configureExpress as needed.
- Logger parameters were still not fully functional and log level was still ignored, this has been fixed.

### v2.7.0

**Feat**

**MCP**:

- Add support for CORS and authentication options, enabling powerful tools to serve Web UIs and publicly exposed APIs
- Add supports for configuring express by exposing the app before it runs

**CLI**:

- Add support for NOT automatically executing the CLI if the script is imported, but will execute if called directly as a CLI. This enables use cases such as programmatically loading the CLI and scanning for tools or testing it from another script via the --s-enable-fuzzy flag or your own script.

### v2.6.0

**Feat**

**DXT**:

- Improve how paths and dynamic variables are handled when bundling into a DXT, to improve compatibility and reduce paths that will fail in a sandbox when the CLI / MCP expects path available on the system. Dynamic path resolution with `${VARIABLE}` syntax supporting `${HOME}`, `${DOCUMENTS}`, `${__dirname}`, `${DXT_DIR}`, and more. Context-aware path resolution with `DxtPathResolver.createUserDataPath()`, `createTempPath()`, `createConfigPath()`.
- Add new IFlag.dxtOption set of options for each flag to allow finer control on how the flags are perceived on the DXT manifest / Claude Desktop.

**Fixes and Changes**

**DXT**:

- Improve handling of sensitive env variable, they were previously always showing as sensitive.

**Known Limitations**

**DXT**:

The DXT bundling / packing / unpacking / launching process is notoriously early and brittle. There are many reasons something is not working, but **MOST** importantly it will not work if:

1. You are bundling a package in a mono-repo (you will need to temporarily create a pnpm-workspace.yaml file for example to break the hierarchy)
2. You do _not_ hard-install your node_modules as detailed in the documentation (it will only work if the node_modules are hard installed)
3. In some cases if your CLI entrypoint does not run a main loop (see documentation for working examples)
4. If you use PATH-dependent variables (for example relying on ~/.config/path/to/some.json). This has been addressed in v2.6.0, but you have to make sure you use the correct patterns (see documentation)

### v2.5.0

**Feat**

- **Zod Schema Flags**: You can now use Zod schemas as flag types for structured JSON input validation. This enables complex object validation with automatic JSON Schema generation for MCP clients while maintaining full type safety and CLI compatibility.
- **Improved MCP Tool Documentation**: Zod schema descriptions automatically become MCP tool parameter documentation

### v2.4.2

**Fixes and Changes**

- add missing MCP lifecycle event documentation
- fix the behavior of the withMcp() options.mcp.log that was not working as expected

### v2.4.1

**Fixes and Changes**

- switch to NPM version of @alcyone-labs/modelcontextprotocol-sdk to freeze the dependency and avoid side-effects

### v2.4.0

**Feat**

- MCP client now supports initialization during the client 'initialize' call, which allows to do certain things such as establishing database connection or even running migrations
- MCP client now sanitizes the method names to ensure spec-compliants MCP behavior, names that collision will be logged
- There were some use-cases where the DXT bundling failed, this new release addresses all of them, namely:
  1. Output structure will match that of the input so relative files (for example DB migrations) will work
  2. Deeper folder structure was previously not working
- DXT bundling now supports including resources via options: `{dxt: {include: ['TSDown blob-like paths']}`
- Logger was improved to support log level via `options:{ log: {} }` so you can set it to level: 'debug' and the MCP log will contain 100% of the console output, logPath setting was not impacted

**Fixes and Changes**

- Zod has been upgraded to V4 and no issue was identified (but @modelcontextprotocol/sdk had to be upgraded to V4 as well, which was more challenging).

### v2.3.0

The DXT bundling is working pretty well now, and we have had a lot of success building, bundling and running various extensions. If you see issues, feel free to open an Issue on GitHub with details, or ask about it on [Alcyone Labs' Discord](https://discord.gg/rRHhpz5nS5)

Make sure to clearly identify if you need to include the node_modules or not. In doubt, include them using `--s-with-node-modules`

**Feat**

- **New `--s-with-node-modules` flag**: Create fully autonomous DXT packages that include complete native dependencies. Perfect for projects using ONNX Runtime, Sharp, SQLite, or other packages with `.node` binaries. Use `rm -rf ./node_modules && pnpm install --prod --node-linker=hoisted` followed by `my-cli --s-build-dxt ./dxt --s-with-node-modules` to create self-contained packages that work without Claude needing to install dependencies.
  Note that when bundling with node_modules, it's likely that the built-in Node.js will not work with that extension, so go to `Claude Desktop > Settings > Extensions > Advanced Settings` and turn **OFF** `Use Built-in Node.js for MCP`.

### v2.2.1

**Feat**

- You can now specify logPath for the MCP output and easily disambiguate what the path is relative to (`__dirname` versus `process.cwd()` versus absolute)

**Fixes and changes**

- Fixes an issue where building a DXT package via `--s-build-dxt` would generate an invalid package if the entry_point was a TypeScript .ts file.

### v2.2.0

**Feat**

- IFlag function-based `type` now supports async methods such as `type: async () => Promise<string>`.

**Fixes and changes**

- `.parse()` can now work without arguments, it will try to infer that if you are in CLI mode and on a Node environment, it should use `process.argv` as the input. You can still pass parameters to control more granularly.
- `--s-build-dxt` now takes an optional path to specify where to prepare the assets prior to packing, the path you pass is in relation to process.cwd() (current working directory).
- `--s-build-dxt` logo detection now resolves paths more accurately...

### v2.1.1

**Fixes and changes**

- Fix missing missing types fr

### v2.1.0

**Feat**

- IFlag function-based `type` handling must now define the type it returns, this unlocks nice features such as providing nicer Intellisense, `output schemas` support and makes it easier to upgrade to Zod V4
- Add support for MCP output_schema field for clients that support it, CLI isn't impacted by it, this helps a lot the interactivity, self-documentation, and improves the API guarantees

**Fixes and changes**

- Improved MCP version compliance

### v2.0.0

- **Unified Tool Architecture**: Introduced `.addTool()` to define CLI subcommands and MCP tools in a single declaration.
- **Universal Environment Variables Support**: The `env` property on any `IFlag` now provides native `process.env` fallback/sync logic for all commands, while maintaining its role in generating `user_config` entries for DXT manifests.
- **Enhanced DXT Generation**: The `env` property on flags now automatically generates `user_config` entries in the DXT manifest.
- **Automatic Console Safety**: Console output is automatically and safely redirected in MCP mode to prevent protocol contamination.
- **Breaking Changes**: The `addMcpSubCommand()` and separate `addSubCommand()` for MCP tools are deprecated in favor of `addTool()` and `--s-mcp-serve`.

### v1.3.0

- **Plugin System & Architecture**: Refactored to a dependency-injection model, making the core library dependency-free. Optional plugins for TOML/YAML.
- **Global Console Replacement**: Implemented the first version of automatic console suppression for MCP compliance.
- **Autonomous Build Improvements**: Significantly reduced DXT bundle size and removed dynamic `require` issues.

### v1.2.0

- **Critical MCP Fixes**: Resolved issues where MCP tools with output schemas would fail. Ensured correct JSON-RPC 2.0 response formatting.
- **Enhanced Handler Context**: Added `isMcp` flag to the handler context for more reliable mode detection.

### v1.1.0

- **Major Features**: First release with MCP Integration, System Flags (`--s-debug`, `--s-with-env`, etc.), and environment loading from files.
