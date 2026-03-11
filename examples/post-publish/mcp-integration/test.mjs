/**
 * Post-publish test for @alcyone-labs/arg-parser-mcp package
 * This test pulls from npm registry to verify the published package works correctly.
 */

import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin, McpPlugin } from '@alcyone-labs/arg-parser-mcp';

console.log('🧪 Testing @alcyone-labs/arg-parser-mcp package...\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

// Test 1: mcpPlugin function exists
console.log('1. mcpPlugin export');
assert(typeof mcpPlugin === 'function', 'mcpPlugin is a function');

// Test 2: McpPlugin class exists
console.log('\n2. McpPlugin class');
assert(typeof McpPlugin === 'function', 'McpPlugin class is available');

// Test 3: ArgParser with MCP plugin
console.log('\n3. ArgParser with MCP plugin');
const parser = new ArgParser({
  appName: 'mcp-test-cli',
  description: 'Test MCP integration',
  handler: async (ctx) => ({ result: 'success' }),
});

const plugin = mcpPlugin({
  serverInfo: {
    name: 'test-mcp-server',
    version: '1.0.0',
    description: 'Test MCP server for post-publish verification',
  },
});

assert(typeof plugin === 'object', 'mcpPlugin returns plugin object');
assert(typeof plugin.install === 'function', 'Plugin has install method');

// Test 4: Install plugin using .use()
console.log('\n4. Plugin installation');
const parserWithMcp = parser.use(plugin);
assert(parserWithMcp !== undefined, 'Plugin installs successfully');

// Test 5: Add tool using addTool (added by MCP plugin)
console.log('\n5. Tool management');
parserWithMcp.addTool({
  name: 'test-tool',
  description: 'A test tool',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'A message' },
    },
  },
  handler: async (ctx, args) => {
    return { content: [{ type: 'text', text: `Received: ${args.message}` }] };
  },
});
assert(true, 'Tool added successfully via addTool');

// Test 6: Verify tools are registered
console.log('\n6. Tool verification');
const tools = parserWithMcp.getTools();
assert(tools.has('test-tool'), 'Tool is registered in tools map');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Post-publish MCP tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Post-publish MCP tests PASSED');
  process.exit(0);
}
