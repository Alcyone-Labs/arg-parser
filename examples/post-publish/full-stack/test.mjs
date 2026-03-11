/**
 * Post-publish test for full stack integration
 * Tests core + MCP + DXT packages working together
 */

import { ArgParser } from '@alcyone-labs/arg-parser';
import { mcpPlugin } from '@alcyone-labs/arg-parser-mcp';
import { dxtPlugin, DxtGenerator } from '@alcyone-labs/arg-parser-dxt';

console.log('🧪 Testing full stack integration (core + MCP + DXT)...\n');

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

// Test 1: All exports available
console.log('1. Package exports');
assert(typeof ArgParser === 'function', 'ArgParser from core available');
assert(typeof mcpPlugin === 'function', 'mcpPlugin from MCP available');
assert(typeof dxtPlugin === 'function', 'dxtPlugin from DXT available');
assert(typeof DxtGenerator === 'function', 'DxtGenerator from DXT available');

// Test 2: Full stack parser setup
console.log('\n2. Full stack parser setup');
const parser = new ArgParser({
  appName: 'full-stack-test',
  appVersion: '1.0.0',
  description: 'Full stack test CLI',
  handler: async (ctx) => {
    return { message: `Hello, ${ctx.args.name || 'World'}!` };
  },
}).addFlag({
  name: 'name',
  options: ['--name', '-n'],
  description: 'Name to greet',
  type: String,
  required: false,
});

assert(parser !== undefined, 'Parser with flags created');

// Test 3: MCP plugin integration
console.log('\n3. MCP plugin integration');
const mcp = mcpPlugin({
  serverInfo: {
    name: 'full-stack-mcp',
    version: '1.0.0',
  },
});
const parserWithMcp = parser.use(mcp);
assert(parserWithMcp !== undefined, 'MCP plugin attached successfully');

// Test 4: Add tool via MCP plugin
console.log('\n4. Tool management via MCP');
parserWithMcp.addTool({
  name: 'greet',
  description: 'Greet someone',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name to greet' },
    },
  },
  handler: async (ctx, args) => {
    return { content: [{ type: 'text', text: `Hello, ${args.name}!` }] };
  },
});
const tools = parserWithMcp.getTools();
assert(tools.has('greet'), 'Tool added via MCP plugin');

// Test 5: DXT plugin integration
console.log('\n5. DXT plugin integration');
const dxt = dxtPlugin({
  outputDir: './dist-dxt',
  manifest: {
    name: 'full-stack-dxt',
    version: '1.0.0',
    description: 'Full stack DXT test',
  },
});
assert(typeof dxt === 'object', 'DXT plugin created successfully');

// Test 6: DxtGenerator
console.log('\n6. DxtGenerator');
const generator = new DxtGenerator({
  name: 'test-dxt',
  version: '1.0.0',
  description: 'Test DXT generation',
  entryPoint: './test.mjs',
});
assert(generator !== undefined, 'DxtGenerator creates successfully');

// Test 7: Parse execution
console.log('\n7. Parse execution');
const result = await parser.parse(['node', 'test', '--name', 'TestUser']);
assert(result !== undefined, 'Parse executes without error');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Post-publish full stack tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Post-publish full stack tests PASSED');
  process.exit(0);
}
