## Migrating from v1.x to the v2.0 `addTool` API

Version 2.0 introduces the `addTool()` method to unify CLI subcommand and MCP tool creation. This simplifies development by removing boilerplate and conditional logic.

### Before v2.0: Separate Definitions

Previously, you had to define CLI handlers and MCP tools separately, often with conditional logic inside the handler to manage different output formats.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// Old way: Separate CLI subcommands and MCP tools
cli
  .addSubCommand({
    name: "search",
    handler: async (ctx) => {
      // Manual MCP detection was required
      if (ctx.isMcp) {
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } else {
        console.log("Search results...");
        return result;
      }
    },
  })
  // And a separate command to start the server
  .addMcpSubCommand("serve", {
    /* MCP config */
  });
```

### After v2.0: The Unified `addTool()` Method

Now, a single `addTool()` definition creates both the CLI subcommand and the MCP tool. Console output is automatically managed, flags are converted to MCP schemas, and the server is started with a universal system flag.

```javascript
const cli = ArgParser.withMcp({
  appName: "My Awesome CLI",
  appCommandName: "mycli",
  description: "A tool that works in both CLI and MCP mode",
  mcp: {
    serverInfo: { name: "my-awesome-mcp-server", version: "1.0.0" },
  },
});

// New way: A single tool definition for both CLI and MCP
cli.addTool({
  name: "search",
  description: "Search for items",
  flags: [
    { name: "query", type: "string", mandatory: true },
    { name: "apiKey", type: "string", env: "API_KEY" }, // Universal Env support (also used for DXT)
  ],
  handler: async (ctx) => {
    // No more MCP detection! Use console.log freely.
    console.log(`Searching for: ${ctx.args.query}`);
    const results = await performSearch(ctx.args.query, ctx.args.apiKey);
    console.log(`Found ${results.length} results`);
    return { success: true, results };
  },
});

// CLI usage: mycli search --query "test"
// MCP usage: mycli --s-mcp-serve
```

**Benefits of Migrating:**

- **Less Code**: A single definition replaces two or more complex ones.
- **Simpler Logic**: No more manual MCP mode detection or response formatting.
- **Automatic Schemas**: Flags are automatically converted into the `input_schema` for MCP tools.
- **Automatic Console Safety**: `console.log` is automatically redirected in MCP mode.
- **Optional Output Schemas**: Add `outputSchema` only if you want structured responses for MCP clients - CLI mode works perfectly without them.
