# ArgParser v2.0.0 Release Notes 🚀

## 🎉 Revolutionary Unified Tool Architecture

ArgParser v2.0.0 introduces a groundbreaking unified tool architecture that eliminates the complexity of building CLI tools that also work as MCP servers. This is a **major breaking change** that dramatically simplifies the developer experience.

## 🔥 **What's New**

### **🔧 Unified Tools - Single API for CLI & MCP**

**Before v2.0.0** (Complex, Boilerplate-Heavy):
```javascript
// Separate CLI and MCP definitions
cli.addSubCommand({
  name: "search",
  handler: async (ctx) => {
    if (ctx.isMcp) {
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } else {
      console.log("Search results...");
      return result;
    }
  }
})
.addMcpSubCommand("serve", { /* MCP config */ });
```

**After v2.0.0** (Simple, Unified):
```javascript
// Single tool definition works for both CLI and MCP
cli.addTool({
  name: "search",
  description: "Search for items",
  flags: [
    { name: "query", type: "string", mandatory: true },
    { name: "apiKey", type: "string", env: "API_KEY" }
  ],
  handler: async (ctx) => {
    // Use console.log freely - automatically handled in MCP mode!
    console.log(`Searching for: ${ctx.args.query}`);
    const results = await performSearch(ctx.args.query, ctx.args.apiKey);
    console.log(`Found ${results.length} results`);
    return { success: true, results };
  }
});

// CLI usage: mycli search --query "test"
// MCP usage: mycli --s-mcp-serve (then call 'search' tool via MCP)
```

### **🛡️ Automatic Console Hijacking**

- **Zero Configuration**: Console output automatically redirected in MCP mode
- **No Code Changes**: Use `console.log()`, `console.error()`, etc. freely
- **Perfect STDOUT Protection**: Prevents JSON-RPC message contamination
- **Per-Tool Isolation**: Each tool execution gets its own console scope
- **Smart Fallback**: Graceful degradation if simple-mcp-logger unavailable

### **🎯 Perfect DXT Package Generation**

- **Automatic Environment Variable Detection**: Extracts env vars from tool flags
- **Complete Manifest Generation**: Perfect user_config, mcp_config.env, tool schemas
- **Universal MCP Compatibility**: All packages use `--s-mcp-serve` system flag
- **One-Command Generation**: `--s-build-dxt` creates ready-to-install packages

## 💥 **Breaking Changes**

### **1. API Changes**

| v1.x API | v2.0.0 API | Migration |
|----------|------------|-----------|
| `addMcpSubCommand()` | `addTool()` | Replace with unified tools |
| `ctx.isMcp` checks | Not needed | Remove manual MCP detection |
| Manual MCP response formatting | Automatic | Return plain objects |
| Separate CLI/MCP handlers | Single handler | Combine into one handler |

### **2. Console Handling**

| v1.x Behavior | v2.0.0 Behavior |
|---------------|------------------|
| Manual MCP mode detection required | Automatic console hijacking |
| `console.log()` breaks MCP servers | `console.log()` automatically safe |
| Complex response formatting | Simple return objects |

### **3. DXT Generation**

| v1.x Process | v2.0.0 Process |
|--------------|----------------|
| Manual manifest creation | Automatic manifest generation |
| Manual env var configuration | Auto-detected from tool flags |
| Complex MCP setup | Universal `--s-mcp-serve` |

## 🚀 **Migration Guide**

### **Step 1: Update Tool Definitions**

```javascript
// OLD: Separate CLI and MCP
.addSubCommand({
  name: "process",
  handler: async (ctx) => {
    if (ctx.isMcp) {
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
    console.log("Processing...");
    return result;
  }
})
.addMcpSubCommand("serve", config);

// NEW: Unified tool
.addTool({
  name: "process",
  description: "Process data",
  flags: [
    { name: "input", type: "string", mandatory: true },
    { name: "apiKey", type: "string", env: "API_KEY" }
  ],
  handler: async (ctx) => {
    console.log("Processing..."); // Automatically safe!
    return { success: true, result };
  }
});
```

### **Step 2: Remove Manual MCP Handling**

```javascript
// REMOVE: Manual MCP mode detection
if (ctx.isMcp) {
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
}

// KEEP: Simple return objects
return { success: true, data: processedData };
```

### **Step 3: Update DXT Generation**

```bash
# OLD: Complex multi-step process
node cli.js --s-save-dxt
# ... manual manifest editing ...

# NEW: One command
node cli.js --s-build-dxt cli.js
```

## 📊 **Benefits**

- **50% Less Code**: Single tool definition instead of separate CLI/MCP handlers
- **Zero Console Issues**: Automatic STDOUT protection in MCP mode
- **Perfect DXT Packages**: Environment variables and schemas auto-generated
- **Type Safety**: Full TypeScript support with automatic inference
- **Universal Compatibility**: Works with all MCP clients via `--s-mcp-serve`

## 🔧 **New Features**

### **Enhanced withMcp() Configuration**

```javascript
const cli = ArgParser.withMcp({
  appName: 'My CLI',
  appCommandName: 'mycli',
  mcp: {
    serverInfo: { name: 'my-mcp-server', version: '2.0.0' },
    defaultTransports: [
      { type: 'stdio' },
      { type: 'sse', port: 3001 }
    ]
  }
});
```

### **Automatic Schema Generation**

Tool flags automatically become MCP input schemas:

```javascript
flags: [
  { name: 'query', type: 'string', mandatory: true },
  { name: 'limit', type: 'number', defaultValue: 10 },
  { name: 'format', type: 'string', enum: ['json', 'xml'] }
]

// Automatically generates:
// {
//   "type": "object",
//   "properties": {
//     "query": { "type": "string", "description": "..." },
//     "limit": { "type": "number", "default": 10 },
//     "format": { "type": "string", "enum": ["json", "xml"] }
//   },
//   "required": ["query"]
// }
```

## 🎯 **Upgrade Recommendations**

1. **Start with new projects**: Use v2.0.0 for all new CLI/MCP projects
2. **Migrate gradually**: Update existing projects one tool at a time
3. **Test thoroughly**: Use the comprehensive test suite to verify migrations
4. **Leverage automation**: Use `--s-build-dxt` for instant DXT package generation

## 📚 **Updated Documentation**

- **README.md**: Updated with v2.0.0 examples and migration guide
- **DXT-TUTORIAL.md**: Rewritten for unified tool architecture
- **Examples**: All examples updated to demonstrate new patterns
- **Getting Started**: Simplified onboarding with unified tools

## 🧪 **Testing**

- **Comprehensive Test Suite**: New tests for console hijacking and unified tools
- **MCP Compliance**: Verified against official MCP specifications
- **DXT Validation**: Tested with Claude Desktop integration
- **Backward Compatibility**: Legacy APIs still supported with deprecation warnings

---

**Ready to upgrade?** Check out the updated [README.md](README.md) and [examples/](examples/) for the latest patterns!
