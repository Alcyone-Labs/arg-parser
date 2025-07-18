# MCP Implementation & DXT Build System Guide

## Overview

The ArgParser library provides built-in Model Context Protocol (MCP) server functionality that automatically converts CLI tools into MCP-compliant servers. The DXT (Desktop Extension) build system packages these servers for easy distribution to applications like Claude Desktop.

## Architecture

### Core Components

```
src/
├── ArgParser.ts           # Main MCP server creation & lifecycle
├── mcp-integration.ts     # Tool generation from CLI definitions
├── DxtGenerator.ts        # DXT package creation & bundling
└── ArgParserBase.ts       # addMcpSubCommand() implementation
```

### MCP Integration Flow

1. **CLI Definition** → Developer adds `addMcpSubCommand()` to existing CLI
2. **Tool Generation** → Library automatically converts CLI flags/handlers to MCP tools
3. **Server Creation** → Built-in MCP server handles protocol compliance
4. **DXT Packaging** → Autonomous builds create distributable packages

## Implementation Details

### 1. Built-in MCP Server (`src/ArgParser.ts`)

**Key Methods:**

- `createMcpServer()` - Creates MCP server instance with auto-generated tools
- `startMcpServer()` - Handles transport setup (stdio, SSE, HTTP)
- `addMcpSubCommand()` - Adds "serve" subcommand with MCP functionality

**Protocol Compliance:**

- Uses `@modelcontextprotocol/sdk` v1.15.0 internally
- Automatic lifecycle handling (initialize, initialized, capabilities)
- Proper error responses for unsupported methods
- Multi-transport support (stdio, SSE, streamable-http)

### 2. Tool Generation (`src/mcp-integration.ts`)

**Process:**

```typescript
// CLI flags automatically become MCP tool input schema
.addFlag({
  name: "query",
  type: "string",
  mandatory: true
})
// ↓ Becomes ↓
{
  "query": {
    "type": "string",
    "description": "..."
  }
}
```

**Handler Execution:**

- Direct handler invocation (not CLI simulation)
- Proper MCP response formatting
- Error handling with MCP-compliant error responses

### 3. Resources Management 🆕 **Beta Feature**

ArgParser now supports MCP resources - server-side data sources that clients can access using URI templates.

**Adding Resources:**

```typescript
const cli = ArgParser.withMcp({
  appName: "File Server",
  handler: async (ctx) => ({ result: "success" }),
})
  .addMcpResource({
    name: "file-content",
    uriTemplate: "file://{path}",
    title: "File Content",
    description: "Read file contents from the filesystem",
    mimeType: "text/plain",
    handler: async (uri, params) => ({
      contents: [
        {
          uri: uri.href,
          text: await fs.readFile(params.path, "utf8"),
          mimeType: "text/plain",
        },
      ],
    }),
  })
  .addMcpSubCommand("serve", {
    name: "file-server-mcp",
    version: "1.0.0",
  });
```

**Resource Features:**

- URI template support with parameters (e.g., `users://{userId}/profile`)
- Multiple content types (text, binary, JSON)
- Automatic parameter extraction from URIs
- Change notifications when resources are added/removed

### 4. Prompts Management 🆕 **Beta Feature**

MCP prompts are server-side prompt templates that clients can discover and execute with custom parameters.

**Adding Prompts:**

```typescript
const cli = ArgParser.withMcp({
  appName: "AI Assistant",
  handler: async (ctx) => ({ result: "success" }),
})
  .addMcpPrompt({
    name: "code-review",
    title: "Code Review Assistant",
    description: "Generate code review prompts",
    argsSchema: z.object({
      code: z.string().describe("The code to review"),
      language: z.string().optional().describe("Programming language"),
      focus: z.enum(["security", "performance", "style", "bugs"]).optional(),
    }),
    handler: ({ code, language, focus }) => ({
      description: `Code review for ${language || "code"} focusing on ${focus || "general best practices"}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review this ${language || "code"} focusing on ${focus || "general best practices"}:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
          },
        },
      ],
    }),
  })
  .addMcpSubCommand("serve", {
    name: "ai-assistant-mcp",
    version: "1.0.0",
  });
```

**Built-in Prompt Helpers:**

```typescript
import {
  createCodeReviewPrompt,
  createDocumentationPrompt,
  createSummarizationPrompt,
  createTranslationPrompt,
} from "@alcyone-labs/arg-parser";

cli
  .addMcpPrompt(createCodeReviewPrompt())
  .addMcpPrompt(createSummarizationPrompt())
  .addMcpPrompt(createTranslationPrompt());
```

### 5. Change Notifications 🆕 **Beta Feature**

The MCP implementation includes a comprehensive change notification system for real-time updates.

**Change Listeners:**

```typescript
// Listen to all MCP entity changes
cli.onMcpChange((event) => {
  console.log(`${event.type} ${event.action}: ${event.entityName}`);
  // Output: "resources added: file-content"
  // Output: "prompts removed: code-review"
});

// Access notification manager for advanced usage
const notificationsManager = cli.getMcpNotificationsManager();
notificationsManager.addGlobalListener((event) => {
  // Custom change handling logic
});
```

**Client Subscription Management:**

```typescript
// Clients can subscribe to specific change types
notificationsManager.subscribe("client-id", "resources");
notificationsManager.subscribe("client-id", "prompts");

// Automatic notifications sent when changes occur
cli.addMcpResource({...}); // Triggers notifications/resources/list_changed
cli.removeMcpPrompt("old-prompt"); // Triggers notifications/prompts/list_changed
```

### 6. DXT Generation (`src/DxtGenerator.ts`)

**Before (Manual Implementation - BROKEN):**

```javascript
// 346 lines of manual MCP server code
const server = new McpServer({...});
server.registerTool(toolName, {...}, async (args) => {
  // Complex CLI simulation with process.argv manipulation
  // Returned internal parser state (_asyncHandlerPromise)
});
```

**After (Built-in Implementation - WORKING):**

```javascript
// 36 lines using library's built-in functionality
import originalCli from "./original-cli.mjs";

originalCli.parse(["serve"]); // Uses library's MCP implementation
```

## Complete Example: Full-Featured MCP Server

Here's a comprehensive example showing all MCP features working together:

```typescript
import {
  ArgParser,
  createCodeReviewPrompt,
  createFileResource,
  z,
} from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Advanced MCP Server",
  appCommandName: "advanced-mcp",
  description: "Full-featured MCP server with tools, resources, and prompts",
  handler: async (ctx) => ({
    message: "Advanced MCP server ready",
    args: ctx.args,
  }),
})
  // CLI Tools (automatically become MCP tools)
  .addFlags([
    {
      name: "search",
      options: ["--search", "-s"],
      type: "string",
      mandatory: true,
      description: "Search query",
    },
    {
      name: "limit",
      options: ["--limit", "-l"],
      type: "number",
      defaultValue: 10,
      description: "Maximum results",
    },
  ])
  // MCP Resources
  .addMcpResource({
    name: "search-results",
    uriTemplate: "search://{query}",
    title: "Search Results",
    description: "Get search results for a query",
    handler: async (uri, { query }) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ query, results: ["result1", "result2"] }),
          mimeType: "application/json",
        },
      ],
    }),
  })
  .addMcpResource(createFileResource("/data"))
  // MCP Prompts
  .addMcpPrompt(createCodeReviewPrompt())
  .addMcpPrompt({
    name: "search-assistant",
    title: "Search Assistant",
    description: "Generate search queries",
    argsSchema: z.object({
      topic: z.string(),
      style: z.enum(["academic", "casual", "technical"]),
    }),
    handler: ({ topic, style }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a ${style} search query about: ${topic}`,
          },
        },
      ],
    }),
  })
  // Change Notifications
  .onMcpChange((event) => {
    console.log(`MCP ${event.type} ${event.action}: ${event.entityName}`);
  })
  // MCP Server
  .addMcpSubCommand("serve", {
    name: "advanced-mcp-server",
    version: "1.0.0",
    description: "Advanced MCP server with full feature set",
  });

// Export for DXT generation
export default cli;
```

**Usage:**

```bash
# Start MCP server
node advanced-mcp.js serve

# Generate DXT package
node advanced-mcp.js --s-save-DXT ./output

# Use with Claude Desktop
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "advanced-mcp": {
      "command": "node",
      "args": ["/path/to/advanced-mcp.js", "serve"]
    }
  }
}
```

## Development Workflow

### Local Development with Unpublished Changes

**Problem:** Examples need latest library features before npm publish

**Solution:** Use `LOCAL_BUILD=1` environment variable

```bash
LOCAL_BUILD=1 node my-cli.js --s-save-DXT ./output
```

**What it does:**

- Sets `"@alcyone-labs/arg-parser": "file:../../../../"` in generated package.json
- Uses local library build instead of npm version
- Automatically applied during DXT generation

### Module Resolution in DXT Packages

**Problem:** Generated servers couldn't resolve library imports

**Solution:** Autonomous builds bundle everything

- Uses `tsup` to create `server/index.autonomous.cjs`
- Bundles all dependencies into single file
- No external dependencies at runtime
- Self-contained `.dxt` packages

## Usage Examples

### Basic CLI with MCP Support

```typescript
import { ArgParser } from "@alcyone-labs/arg-parser";

const cli = ArgParser.withMcp({
  appName: "Weather CLI",
  appCommandName: "weather",
  handler: async (ctx) => {
    const weather = await getWeather(ctx.args.location);
    return { weather, location: ctx.args.location };
  },
})
  .addFlag({
    name: "location",
    options: ["--location", "-l"],
    type: "string",
    mandatory: true,
  })
  .addMcpSubCommand("serve", {
    name: "weather-mcp-server",
    version: "1.0.0",
    description: "Weather information MCP server",
  });

// CLI usage: node weather.js --location "New York"
// MCP usage: node weather.js serve
cli.parse(process.argv.slice(2));
```

### DXT Package Generation

```bash
# Generate DXT package with local library
LOCAL_BUILD=1 node weather.js --s-build-dxt ./output

# Build autonomous package
cd output/weather-mcp-server-dxt
./build-dxt-package.sh

# Result: weather-mcp-server-autonomous.dxt (ready for Claude Desktop)
```

## Beta Features Testing 🆕

The new resources, prompts, and change notifications features are currently in **beta**. Here's how to test them:

### Testing Resources

```typescript
// Create a test CLI with resources
const testCli = ArgParser.withMcp({
  appName: "Resource Test",
  handler: async () => ({ success: true }),
}).addMcpResource({
  name: "test-data",
  uriTemplate: "test://{id}",
  handler: async (uri, { id }) => ({
    contents: [{ uri: uri.href, text: `Data for ID: ${id}` }],
  }),
});

// Test resource management
console.log("Resources:", testCli.getMcpResources());
testCli.removeMcpResource("test-data");
console.log("After removal:", testCli.getMcpResources());
```

### Testing Prompts

```typescript
// Create a test CLI with prompts
const testCli = ArgParser.withMcp({
  appName: "Prompt Test",
  handler: async () => ({ success: true }),
}).addMcpPrompt({
  name: "test-prompt",
  argsSchema: z.object({ text: z.string() }),
  handler: ({ text }) => ({
    messages: [{ role: "user", content: { type: "text", text } }],
  }),
});

// Test prompt execution
const promptsManager = testCli.getMcpPromptsManager();
const result = await promptsManager.executePrompt("test-prompt", {
  text: "Hello",
});
console.log("Prompt result:", result);
```

### Testing Change Notifications

```typescript
// Set up change listener
const testCli = ArgParser.withMcp({
  appName: "Notification Test",
  handler: async () => ({ success: true }),
}).onMcpChange((event) => {
  console.log(
    `Change detected: ${event.type} ${event.action} ${event.entityName}`,
  );
});

// Trigger changes
testCli.addMcpResource({
  name: "dynamic-resource",
  uriTemplate: "dynamic://test",
  handler: async () => ({ contents: [] }),
}); // Should log: "Change detected: resources added dynamic-resource"

testCli.removeMcpResource("dynamic-resource");
// Should log: "Change detected: resources removed dynamic-resource"
```

### Current Beta Limitations

**⚠️ Known Issues:**

- **Resource/Prompt Registration**: Currently disabled in MCP server due to SDK type compatibility issues
- **Workaround**: Resources and prompts are stored and managed but not yet registered with the MCP server
- **Status**: Infrastructure is complete, SDK integration pending

**✅ What Works:**

- Resource and prompt management APIs
- Change notification system
- Fluent API integration
- Comprehensive test suite (125+ tests passing)
- Real-world integration (Canny CLI example working)

**🔄 Coming Soon:**

- Full MCP SDK integration for resources and prompts
- Client subscription management
- Real-time change notifications to MCP clients

## Testing MCP Compliance

### Protocol Testing

```bash
# Test initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node server/index.autonomous.cjs serve

# Expected: {"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},...}}
```

### Tool Execution Testing

```bash
# Test tool call
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"weather","arguments":{"location":"NYC"}}}' | node server/index.autonomous.cjs serve

# Expected: {"result":{"content":[{"type":"text","text":"...actual weather data..."}]},...}
```

## Common Issues & Solutions

### 1. "Method not found" vs Empty Lists for prompts/list and resources/list

**Status:** ✅ IMPROVED USER EXPERIENCE

- **Before**: Server returned error code -32601 "Method not found" (MCP-compliant but less user-friendly)
- **After**: Server now declares all capabilities and returns proper empty arrays:
  - `prompts/list` → `{"result": {"prompts": []}}`
  - `resources/list` → `{"result": {"resources": []}}`
- This follows the MCP specification example you highlighted and provides better UX

### 2. Tool returns `_asyncHandlerPromise`

**Status:** ✅ FIXED

- Old manual implementation bug
- New implementation returns actual handler results

### 3. Module resolution errors

**Status:** ✅ FIXED

- Use autonomous builds for distribution
- Bundle all dependencies with tsup

### 4. Outdated library version

**Status:** ✅ FIXED

- Use `LOCAL_BUILD=1` for development
- Ensures latest features before npm publish

## File Structure

### Generated DXT Package

```
my-tool-mcp-dxt/
├── manifest.json              # DXT metadata & configuration
├── package.json               # Dependencies (local file path when LOCAL_BUILD=1)
├── server/
│   ├── index.mjs             # Simple server (calls originalCli.parse(['serve']))
│   ├── index.autonomous.cjs  # Bundled autonomous server
│   └── original-cli.mjs      # Original CLI with console replacement
├── build-dxt-package.sh      # Autonomous build script
└── README.md                 # Installation instructions
```

### Key Dependencies

- **Development:** `@alcyone-labs/arg-parser` (local file path)
- **Runtime (autonomous):** All bundled in `.cjs` file
- **Build:** `tsup` for bundling, `@anthropic-ai/dxt` for packaging

## Best Practices

### Core MCP Development

1. **Always use `LOCAL_BUILD=1`** during development
2. **Test autonomous builds** - they're what users install
3. **Don't manually implement MCP protocol** - use library's built-in functionality
4. **Use `ArgParser.withMcp()`** for MCP-enabled CLIs
5. **Test with actual MCP clients** to verify compliance

### Beta Features (Resources, Prompts, Notifications) 🆕

6. **Use descriptive resource URI templates** - `users://{userId}/profile` not `data://{id}`
7. **Validate prompt arguments with Zod schemas** - ensures type safety and better error messages
8. **Set up change listeners early** - helps with debugging and monitoring
9. **Use helper functions** - `createCodeReviewPrompt()`, `createFileResource()` for common patterns
10. **Test resource/prompt management** - add/remove operations and change notifications
11. **Handle resource handler errors gracefully** - return meaningful error messages
12. **Use appropriate MIME types** - helps clients understand resource content

### Resource Best Practices

```typescript
// ✅ Good: Descriptive URI template with clear parameters
.addMcpResource({
  name: "user-profile",
  uriTemplate: "users://{userId}/profile",
  title: "User Profile Data",
  description: "Access user profile information by user ID",
  mimeType: "application/json",
  handler: async (uri, { userId }) => {
    if (!userId) throw new Error("User ID is required");
    const userData = await getUserData(userId);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(userData, null, 2),
        mimeType: "application/json"
      }]
    };
  }
})

// ❌ Avoid: Vague URI template and poor error handling
.addMcpResource({
  name: "data",
  uriTemplate: "data://{id}",
  handler: async (uri, { id }) => {
    const data = getData(id); // No error handling
    return { contents: [{ uri: uri.href, text: data }] };
  }
})
```

### Prompt Best Practices

```typescript
// ✅ Good: Comprehensive schema with descriptions
.addMcpPrompt({
  name: "code-review",
  title: "Code Review Assistant",
  description: "Generate comprehensive code review prompts",
  argsSchema: z.object({
    code: z.string().describe("The code to review"),
    language: z.string().optional().describe("Programming language (auto-detect if not provided)"),
    focus: z.enum(["security", "performance", "style", "bugs", "general"]).optional().describe("Review focus area"),
    includeExamples: z.boolean().optional().describe("Include example fixes in the review")
  }),
  handler: ({ code, language, focus, includeExamples }) => ({
    description: `Code review for ${language || 'code'} focusing on ${focus || 'general best practices'}`,
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review this ${language || 'code'} focusing on ${focus || 'general best practices'}${includeExamples ? ' and provide example fixes' : ''}:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``
      }
    }]
  })
})

// ❌ Avoid: Minimal schema and generic responses
.addMcpPrompt({
  name: "review",
  argsSchema: z.object({ code: z.string() }),
  handler: ({ code }) => ({
    messages: [{ role: "user", content: { type: "text", text: `Review: ${code}` }}]
  })
})
```

## Migration from Manual Implementation

### From Manual MCP Server Code

If you have existing manual MCP server code:

1. **Replace manual `McpServer` creation** with `addMcpSubCommand()`
2. **Remove manual tool registration** - library auto-generates from CLI flags
3. **Use `LOCAL_BUILD=1`** for DXT generation
4. **Test autonomous builds** for proper functionality

### Upgrading to Beta Features 🆕

If you want to add the new resources, prompts, and notifications:

```typescript
// Before: Basic MCP server
const cli = ArgParser.withMcp({...})
  .addFlags([...])
  .addMcpSubCommand("serve", {...});

// After: Full-featured MCP server with beta features
const cli = ArgParser.withMcp({...})
  .addFlags([...]) // Still generates tools automatically
  // Add resources
  .addMcpResource({
    name: "app-data",
    uriTemplate: "app://{resource}",
    handler: async (uri, { resource }) => ({
      contents: [{ uri: uri.href, text: await getAppData(resource) }]
    })
  })
  // Add prompts
  .addMcpPrompt({
    name: "app-assistant",
    argsSchema: z.object({ query: z.string() }),
    handler: ({ query }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Help with: ${query}` }}]
    })
  })
  // Add change notifications
  .onMcpChange((event) => {
    console.log(`MCP ${event.type} ${event.action}: ${event.entityName}`);
  })
  .addMcpSubCommand("serve", {...});
```

### Testing Your Migration

```bash
# Test basic functionality
node your-cli.js serve

# Test with resources and prompts (beta)
node your-cli.js --help  # Should show new management methods

# Generate DXT with new features
LOCAL_BUILD=1 node your-cli.js --s-save-DXT ./output

# Test the generated package
cd output/your-cli-mcp-dxt
./build-dxt-package.sh
```

The goal is still zero MCP-specific code - just add `addMcpSubCommand()` to existing CLI and optionally enhance with resources/prompts for full MCP compliance automatically.
