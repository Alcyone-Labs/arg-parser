# DXT (Desktop Extension) Tutorial

This tutorial walks you through creating, building, and distributing MCP servers as DXT packages using @alcyone-labs/arg-parser.

> **✨ Updated in v2.0.0**: Revolutionary unified tool architecture! Create CLI tools that automatically work as MCP servers with zero boilerplate. Single `addTool()` API creates both CLI subcommands and MCP tools with automatic console hijacking and perfect DXT generation.

## Table of Contents

1. [What are DXT Packages?](#what-are-dxt-packages)
2. [Quick Start](#quick-start)
3. [Step-by-Step Tutorial](#step-by-step-tutorial)
4. [Advanced Configuration](#advanced-configuration)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## What are DXT Packages?

DXT (Desktop Extension) packages are signed, validated zip archives that contain MCP servers ready for single-click installation in compatible applications like Claude Desktop. They solve the distribution problem for MCP servers by providing:

- **Unified Tool Architecture** - Single `addTool()` creates both CLI and MCP functionality
- **Automatic Console Hijacking** - Console output safely redirected in MCP mode
- **Perfect Environment Variable Detection** - Auto-extracts env vars from tool flags
- **Complete Manifest Generation** - Proper user_config, mcp_config.env, and tool schemas
- **Universal MCP Compatibility** - All packages use `--s-mcp-serve` system flag
- **Source-based packages** with npm dependency resolution
- **Automatic validation** using official Anthropic tools
- **Signed packages** for security and integrity
- **One-command generation** using `--s-build-dxt`

## Quick Start

### 1. Create a Unified CLI/MCP Tool

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const cli = ArgParser.withMcp({
  appName: 'Weather CLI',
  appCommandName: 'weather-search',
  description: 'Search weather information via CLI or MCP',
  mcp: {
    serverInfo: {
      name: 'weather-search-mcp',
      version: '2.0.0',
      description: 'Weather Search MCP Server'
    }
  }
})
.addTool({
  name: 'search',
  description: 'Search weather information for a location',
  flags: [
    {
      name: 'query',
      options: ['-q', '--query'],
      type: 'string',
      description: 'Location to search weather for',
      mandatory: true
    },
    {
      name: 'apiKey',
      options: ['-k', '--api-key'],
      type: 'string',
      description: 'Weather API key',
      env: 'WEATHER_API_KEY'  // 🔑 Automatically creates user_config in DXT
    }
  ],
  handler: async (ctx) => {
    const { query, apiKey } = ctx.args;

    // ✅ NEW in v2.0.0: Use console.log freely - automatically safe in MCP mode!
    console.log(`🌤️ Searching weather for: ${query}`);
    console.log('Connecting to weather API...');

    // Your weather search logic here
    const results = await searchWeather(query, apiKey);

    if (results.length === 0) {
      console.log('❌ No weather data found for the specified location');
      return { success: false, message: 'No data found', location: query };
    }

    console.log(`✅ Found ${results.length} weather entries`);
    return {
      success: true,
      data: results,
      location: query,
      timestamp: new Date().toISOString()
    };
  }
});

// Parse and execute
cli.parse(process.argv.slice(2));
```

### 2. Test Your CLI

```bash
# Test CLI mode
node weather-cli.js search --query "London" --api-key "your-key"

# Test MCP server mode
node weather-cli.js --s-mcp-serve
```

### 3. Generate DXT Package

> **✨ New in v2.0.0**: DXT packages automatically detect environment variables from tool flags and generate perfect user_config and mcp_config.env sections!

```bash
# Generate complete DXT package (one command!)
node weather-cli.js --s-build-dxt weather-cli.js

# Output:
# 🔧 Building DXT package for entry point: weather-cli.js
# 🔧 Building DXT package with TSDown...
# ✅ TSDown bundling completed
# ✅ Logo copied from: ./dist/assets/logo_1_small.jpg
# ✅ DXT package files set up
# 📦 DXT package ready for packing
# To complete the process, run: npx @anthropic-ai/dxt pack dxt/
# ✅ DXT package generation completed!
```

### 3. Build DXT Package (if needed)

If automatic packaging fails, you can build manually:

```bash
cd output/weather-search-mcp-dxt
./build-dxt.sh

# The script will:
# 📦 Install dependencies via npm
# 🔍 Validate the DXT manifest
# 📦 Create DXT package using Anthropic's official packer
# 🔐 Sign the package for security
# ✅ Output: weather-search-mcp.dxt
```

### 4. Install in Claude Desktop

1. Copy `weather-search-mcp.dxt` to your desired location
2. In Claude Desktop, go to Settings → Extensions
3. Click "Install Extension" and select the `.dxt` file
4. Configure your Weather API key when prompted
5. Start using the weather search tool in Claude!

## ✨ What's New in v1.4.0

### Zero Boilerplate Console Safety

ArgParser now automatically handles console hijacking in MCP mode - no manual detection needed!

```typescript
// ❌ OLD: Manual MCP mode detection (no longer needed!)
const isMcpMode = process.argv.includes("serve");
if (!isMcpMode) {
  console.log("Processing request...");
}

// ✅ NEW: Write normal console code - automatically handled!
console.log("Processing request..."); // Suppressed in MCP mode
console.error("Debug info");          // Suppressed in MCP mode
console.warn("Warning message");      // Suppressed in MCP mode
```

### Universal DXT Compatibility

All generated DXT packages now use `--s-mcp-serve` instead of hardcoded subcommand names:

```json
// Generated manifest.json automatically uses:
{
  "mcp_config": {
    "command": "node",
    "args": ["${__dirname}/your-cli.js", "--s-mcp-serve"],
    "env": {}
  }
}
```

This ensures your DXT packages work regardless of your MCP subcommand names!

### Centralized MCP Serving

Start ALL MCP servers with one command:

```bash
# Instead of calling individual subcommands:
my-tool serve-primary    # Old way
my-tool serve-secondary  # Old way

# Use centralized serving:
my-tool --s-mcp-serve    # New way - starts ALL servers!
```

## Step-by-Step Tutorial

Let's build a complete example: a Canny feature request search tool.

### Step 1: Project Setup

```bash
mkdir canny-mcp-tutorial
cd canny-mcp-tutorial
npm init -y
npm install @alcyone-labs/arg-parser
```

### Step 2: Create the CLI

Create `canny-cli.js`:

```javascript
import { ArgParser } from '@alcyone-labs/arg-parser';
// Note: v1.3.0+ includes SimpleChalk - no separate chalk dependency needed!
// You can still use chalk.red(), chalk.bold(), etc. - it's built into ArgParser

// Mock Canny API function (replace with real implementation)
async function searchCannyPosts(apiKey, query, options = {}) {
  // Your Canny API integration here
  return [
    {
      id: 1,
      title: `Feature request matching "${query}"`,
      description: "This is a mock result",
      status: "open",
      votes: 42
    }
  ];
}

const cli = ArgParser.withMcp({
  appName: 'Canny Search CLI',
  appCommandName: 'canny-search',
  description: 'Search Canny for relevant feature requests (CLI + MCP server)',
  handler: async (ctx) => {
    const { query, apiKey, limit } = ctx.args;
    const isMcpMode = ctx.isMcp;

    // Validate API key
    if (!apiKey) {
      const error = 'API key is required. Set CANNY_API_KEY or use --api-key';
      if (isMcpMode) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error }, null, 2) }]
        };
      } else {
        console.error(chalk.red('❌ Error:'), error);
        process.exit(1);
      }
    }

    if (!isMcpMode) {
      console.log(chalk.bold.cyan(`🔍 Searching Canny for: "${query}"`));
    }

    const posts = await searchCannyPosts(apiKey, query, { limit });

    const results = {
      success: true,
      query,
      results: posts.length,
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        status: post.status,
        votes: post.votes
      }))
    };

    if (isMcpMode) {
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
      };
    } else {
      console.log(chalk.green(`Found ${posts.length} results:`));
      posts.forEach(post => {
        console.log(`• ${post.title} (${post.votes} votes)`);
      });
      return results;
    }
  }
})
.addFlag({
  name: 'query',
  options: ['-q', '--query'],
  type: 'string',
  description: 'Search query for feature requests',
  mandatory: true
})
.addFlag({
  name: 'apiKey',
  options: ['-k', '--api-key'],
  type: 'string',
  description: 'Canny API key (optional, defaults to CANNY_API_KEY env var)',
  env: 'CANNY_API_KEY'  // 🔑 This creates user_config automatically
})
.addFlag({
  name: 'limit',
  options: ['-l', '--limit'],
  type: 'number',
  description: 'Number of results to return',
  defaultValue: 10
})
.addMcpSubCommand('serve', {
  name: 'canny-search-mcp',
  version: '1.0.0',
  description: 'Canny Search MCP Server - Search Canny feature requests via MCP protocol',
  author: {
    name: "Your Name",
    email: "your.email@example.com",
    url: "https://github.com/yourusername"
  },
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001 }
  ]
});

// Parse and execute
cli.parse(process.argv.slice(2));
```

### Step 3: Test the CLI

```bash
# Test CLI mode
node canny-cli.js --query "dark mode" --api-key "test-key"

# Test MCP mode
node canny-cli.js serve --api-key "test-key"
# Then in another terminal, test with MCP client
```

### Step 4: Generate DXT Package

```bash
# Generate the complete DXT package
node canny-cli.js --s-build-dxt ./output

# Check what was generated
ls -la output/
# manifest.json         (DXT package manifest)
# canny-cli.js         (bundled entry point)
# logo.jpg             (package icon)
# package.json         (dependencies)

# Pack for distribution (optional)
npx @anthropic-ai/dxt pack ./output
```

### Step 5: Examine the Generated Structure

```bash
cd output/canny-search-mcp-dxt
ls -la
# manifest.json  server/  package.json  README.md  build-dxt.sh  logo.jpg

# Check the manifest
cat manifest.json | jq '.'

# Check the package.json (uses proper npm dependencies)
cat package.json | jq '.dependencies'
```

The manifest will look like:

```json
{
  "dxt_version": "0.1",
  "id": "your-name.canny-search-mcp",
  "name": "canny-search-mcp",
  "version": "1.0.0",
  "description": "Canny Search MCP Server - Search Canny feature requests via MCP protocol",
  "server": {
    "type": "node",
    "entry_point": "server/index.js",
    "mcp_config": {
      "command": "node",
      "args": [
        "${__dirname}/server/index.js",
        "serve",
        "--api-key",
        "${user_config.apiKey}"
      ],
      "env": {
        "CANNY_API_KEY": "${user_config.apiKey}"
      }
    }
  },
  "tools": [{
    "name": "canny-search",
    "description": "Search Canny for relevant feature requests (CLI + MCP server)",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Search query for feature requests"
        },
        "limit": {
          "type": "number",
          "description": "Number of results to return",
          "default": 10
        }
      },
      "required": ["query"]
    }
  }],
  "user_config": {
    "apiKey": {
      "type": "string",
      "title": "Api Key",
      "description": "Canny API key (optional, defaults to CANNY_API_KEY env var)",
      "required": false,
      "sensitive": true
    }
  }
}
```

### Step 6: Build DXT Package (if needed)

If the automatic packaging didn't work, you can build manually:

```bash
# Make the build script executable and run it
chmod +x build-dxt.sh
./build-dxt.sh
```

This will:
1. Install dependencies via npm (`npm install`)
2. Validate the DXT manifest
3. Create a clean package structure (excluding problematic files)
4. Create DXT package using Anthropic's official `dxt pack`
5. Sign the package for security

Output:
```
📦 Creating DXT package for canny-search-mcp...
📦 Installing dependencies...
🔍 Validating DXT manifest...
✅ DXT manifest validation passed
📦 Creating DXT package...
📁 Preparing package contents...
✅ DXT package created: canny-search-mcp.dxt
🔐 Signing DXT package...
✅ DXT package signed successfully
```

### Step 7: Test the DXT Package

```bash
# Test unpacking
mkdir test-package
npx @anthropic-ai/dxt unpack canny-search-mcp.dxt test-package/

# Test the server (requires npm install in unpacked directory)
cd test-package
npm install
node server/index.mjs serve --api-key "test-key"
```

### Step 8: Install in Claude Desktop

1. Copy `canny-search-mcp.dxt` to a permanent location
2. Open Claude Desktop
3. Go to Settings → Extensions
4. Click "Install Extension"
5. Select your `.dxt` file
6. Configure the Canny API key when prompted
7. The tool is now available in Claude!

## Advanced Configuration

### Development vs Production Builds

#### Local Development

For local development and testing, use the `LOCAL_BUILD=1` environment variable:

```bash
# Generate DXT with local file dependencies (for development)
LOCAL_BUILD=1 node my-cli.js --s-build-dxt ./output

# This creates package.json with:
# "@alcyone-labs/arg-parser": "file:../../../../"
```

#### Production Builds

For production distribution, omit the LOCAL_BUILD flag:

```bash
# Generate DXT with npm dependencies (for production)
node my-cli.js --s-build-dxt ./output

# This creates package.json with:
# "@alcyone-labs/arg-parser": "^1.4.0"
```

### Multiple MCP Servers

You can create multiple MCP servers in one CLI:

```typescript
const cli = ArgParser.withMcp({...})
.addMcpSubCommand('search', {
  name: 'search-server',
  version: '1.0.0',
  description: 'Search functionality'
})
.addMcpSubCommand('analytics', {
  name: 'analytics-server',
  version: '2.0.0',
  description: 'Analytics functionality'
});

// Generates multiple DXT files:
// search-server.dxt
// analytics-server.dxt
```

### Custom Transport Configuration

```typescript
.addMcpSubCommand('serve', {
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP Server',
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001, host: "0.0.0.0" },
    { type: "streamable-http", port: 3002, host: "0.0.0.0" }
  ]
});
```

### Environment Variable Mapping

```typescript
.addFlag({
  name: 'apiKey',
  options: ['--api-key'],
  type: 'string',
  description: 'API key',
  env: ['API_KEY', 'SERVICE_API_KEY']  // Multiple env vars
})
```

### Output Schema Support

```typescript
import { z } from 'zod';

.addMcpSubCommand('serve', {
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP Server',
  toolOptions: {
    outputSchemaMap: {
      'my-tool': z.object({
        content: z.array(z.object({
          type: z.string(),
          text: z.string()
        }))
      })
    }
  }
});
```

## Troubleshooting

### Common Issues

#### 1. Circular Dependency Error During Build

**Problem**: `ENAMETOOLONG` or circular symlink errors during `npm install`

**Solution**: Use production build instead of LOCAL_BUILD:
```bash
# Instead of LOCAL_BUILD=1, use:
node my-cli.js --s-build-dxt ./output
```

#### 2. Package Not Found Error

**Problem**: `No matching version found for @alcyone-labs/arg-parser@^1.4.0`

**Solution**: Use LOCAL_BUILD for development:
```bash
LOCAL_BUILD=1 node my-cli.js --s-build-dxt ./output
```

#### 2. Tool Not Appearing in Claude

**Problem**: MCP server installs but tools don't appear

**Solutions**:
- Check that `input_schema` is properly formatted
- Ensure `required` fields are specified
- Verify the server starts with `serve` command
- Check Claude Desktop logs for errors

#### 3. API Key Not Working

**Problem**: Environment variables not being passed

**Solutions**:
- Ensure flag has `env` property set
- Check `user_config` section in manifest
- Verify CLI args include the environment variable mapping

#### 4. Build Failures

**Problem**: Autonomous build script fails

**Solutions**:
- Check Node.js version (requires Node 18+)
- Ensure all dependencies are properly declared
- Check for TypeScript compilation errors
- Verify tsup configuration

### Debug Commands

```bash
# Validate DXT manifest
npx @anthropic-ai/dxt validate manifest.json

# Unpack and inspect DXT
npx @anthropic-ai/dxt unpack package.dxt output-dir/

# Test MCP server manually
node server/index.js serve --api-key "test"

# Check package contents
unzip -l package.dxt
```

## Best Practices

### 1. Development vs Production Workflow

**Development**: Use LOCAL_BUILD for testing with local dependencies
```bash
LOCAL_BUILD=1 node my-cli.js --s-build-dxt ./dev-output
# DXT package ready at ./dev-output/
```

**Production**: Use standard build for distribution
```bash
node my-cli.js --s-build-dxt ./prod-output
# Pack for distribution
npx @anthropic-ai/dxt pack ./prod-output
```

### 2. Package Size Optimization

The new packing approach automatically excludes:
- `node_modules/` (dependencies resolved at install time)
- Build artifacts and logs
- Git history and temporary files

This results in much smaller DXT packages (~40KB vs several MB).

### 3. Proper Error Handling

```typescript
handler: async (ctx) => {
  try {
    const result = await yourApiCall(ctx.args);
    
    if (ctx.isMcp) {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } else {
      console.log(result);
      return result;
    }
  } catch (error) {
    const errorResponse = { error: error.message };
    
    if (ctx.isMcp) {
      return {
        content: [{ type: "text", text: JSON.stringify(errorResponse, null, 2) }]
      };
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}
```

### 2. Environment Variable Strategy

```typescript
// Global config (goes in CLI args)
.addFlag({
  name: 'apiKey',
  options: ['--api-key'],
  type: 'string',
  description: 'API key for authentication',
  env: 'SERVICE_API_KEY'  // Creates user_config
})

// Tool parameters (goes in input_schema)
.addFlag({
  name: 'query',
  options: ['--query'],
  type: 'string',
  description: 'Search query',
  mandatory: true  // Will be required in input_schema
})
```

### 3. Proper Descriptions

```typescript
.addMcpSubCommand('serve', {
  name: 'descriptive-server-name',
  version: '1.0.0',
  description: 'Clear description of what this MCP server does',
  author: {
    name: "Your Name",
    email: "contact@example.com",
    url: "https://github.com/username/repo"
  }
});
```

### 4. Testing Strategy

```bash
# 1. Test CLI mode
node your-cli.js --query "test" --api-key "key"

# 2. Test MCP mode
node your-cli.js serve --api-key "key"

# 3. Test DXT generation
node your-cli.js --s-build-dxt ./test-output

# 4. Test the generated package
cd test-output && node your-cli.js --s-mcp-serve

# 5. Pack for distribution (optional)
npx @anthropic-ai/dxt pack ./test-output
```

### 5. Distribution Checklist

Before distributing your DXT package:

- [ ] ✅ Test CLI mode works
- [ ] ✅ Test MCP mode works  
- [ ] ✅ DXT package generates successfully
- [ ] ✅ Autonomous build completes
- [ ] ✅ Package validates with `npx @anthropic-ai/dxt validate`
- [ ] ✅ Package unpacks correctly
- [ ] ✅ Autonomous server starts
- [ ] ✅ Test in Claude Desktop
- [ ] ✅ API keys and environment variables work
- [ ] ✅ All tools appear and function correctly

---

## Console Handling & Logging Best Practices

### 🎯 **Automatic Console Replacement (v1.3.0+)**

ArgParser v1.3.0 introduces **automatic global console replacement** for DXT packages, ensuring 100% MCP compliance without any code changes required.

#### **✅ What Works Automatically**

```typescript
// ✅ All of these work perfectly in both CLI and MCP modes:
console.log('Processing started...');           // → Suppressed in MCP mode
console.info('Configuration loaded');           // → Suppressed in MCP mode
console.warn('Using deprecated API');           // → Suppressed in MCP mode
console.debug('Debug information');             // → Suppressed in MCP mode
console.error('Critical error occurred');       // → Preserved (uses stderr)

// ✅ Dynamic console usage also works:
const method = 'log';
console[method]('Dynamic logging');             // → Handled correctly

// ✅ Console calls in imported modules work:
import { helper } from './helper.js';
helper.doSomething(); // Even if helper.js has console.log calls
```

#### **🔧 How It Works**

When generating DXT packages, ArgParser automatically:

1. **Replaces Global Console Object**: Injects a global console replacement that redirects stdout methods to MCP-compliant logger
2. **Preserves stderr Methods**: Keeps `console.error`, `console.trace`, `console.assert` unchanged (MCP-compliant)
3. **Covers All Files**: Works across your entire CLI codebase and all dependencies
4. **Handles Dynamic Usage**: Supports `console[method]()` and computed property access

#### **📋 Generated Console Replacement**

```javascript
// Automatically injected into DXT packages:
import { createMcpLogger } from '@alcyone-labs/arg-parser';

const mcpLogger = createMcpLogger('[CLI]');
const originalConsole = globalThis.console;
globalThis.console = {
  ...originalConsole,
  // Redirected to MCP-compliant logger (suppressed in MCP mode)
  log: (...args) => mcpLogger.info(...args),
  info: (...args) => mcpLogger.info(...args),
  warn: (...args) => mcpLogger.warn(...args),
  debug: (...args) => mcpLogger.debug(...args),

  // Preserved (use stderr - MCP-compliant)
  error: originalConsole.error,
  trace: originalConsole.trace,
  assert: originalConsole.assert,
  // ... all other console methods preserved
};
```

### 🎯 **Recommended Logging Patterns**

#### **✅ Simple & Effective (Recommended)**

```typescript
const cli = ArgParser.withMcp({
  appName: 'My Tool',
  handler: async (ctx) => {
    // ✅ Use console.log freely - automatically handled
    console.log('Starting processing...');
    console.log(`Processing ${ctx.args.input}`);

    const results = await processData(ctx.args.input);

    console.log(`Processed ${results.length} items`);
    if (results.warnings.length > 0) {
      console.warn(`Found ${results.warnings.length} warnings`);
    }

    return {
      success: true,
      processed: results.length,
      warnings: results.warnings
    };
  }
});
```

#### **✅ Advanced Logging with External Libraries**

If you use external logging libraries (Winston, Pino, etc.), ensure they use console drivers for MCP compatibility:

```typescript
import winston from 'winston';

// ✅ GOOD: Uses console transport (will be handled by global replacement)
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ✅ Usage in handler
const cli = ArgParser.withMcp({
  handler: async (ctx) => {
    logger.info('Processing started');  // → Uses console.log internally
    logger.warn('Deprecated API');      // → Uses console.warn internally
    logger.error('Critical error');     // → Uses console.error internally

    return { success: true };
  }
});
```

```typescript
import pino from 'pino';

// ✅ GOOD: Configure Pino to use console
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      destination: 1, // stdout (will be handled by global replacement)
      colorize: true
    }
  }
});
```

#### **❌ What to Avoid**

```typescript
// ❌ BAD: Direct file/stream writing bypasses console replacement
import fs from 'fs';
fs.writeFileSync('/dev/stdout', 'Direct stdout write'); // Won't be handled

// ❌ BAD: Process stdout writing
process.stdout.write('Direct process write'); // Won't be handled

// ❌ BAD: Logger configured to write directly to files/streams
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: '/dev/stdout' }) // Bypasses console
  ]
});
```

### 🔍 **Testing Console Replacement**

#### **Local Development Testing**

```bash
# Test with LOCAL_BUILD flag for development
LOCAL_BUILD=1 node my-cli.js --s-build-dxt ./test-output

# Test the generated DXT package
cd test-output && node my-cli.js --s-mcp-serve

# Pack for distribution
npx @anthropic-ai/dxt pack ./test-output
```

#### **Verification Checklist**

- [ ] ✅ CLI mode shows console output normally
- [ ] ✅ MCP mode suppresses console.log/warn/info/debug
- [ ] ✅ MCP mode preserves console.error output
- [ ] ✅ DXT package builds without console-related errors
- [ ] ✅ Autonomous package runs without stdout pollution
- [ ] ✅ Claude Desktop integration works without JSON-RPC interference

### 📚 **Key Benefits**

1. **🔄 Zero Code Changes**: Existing console.log calls work automatically
2. **🌐 Complete Coverage**: Handles console calls across entire codebase and dependencies
3. **🛡️ MCP Compliance**: Ensures no stdout pollution in MCP mode
4. **🎯 Selective Preservation**: Keeps stderr methods (console.error) for proper error handling
5. **⚡ Dynamic Support**: Handles computed console method access
6. **🧪 Development Friendly**: LOCAL_BUILD=1 flag for easy local testing

---

## Next Steps

- Check out the [examples/community/](../examples/community/) directory for more examples
- Read the [HANDOVER.md](./HANDOVER.md) for technical implementation details
- Explore the [main README](../README.md) for complete API documentation
- Join the community discussions for support and feature requests

Happy building! 🚀
