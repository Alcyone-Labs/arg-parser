/**
 * Post-publish test for @alcyone-labs/arg-parser core package
 * This test pulls from npm registry to verify the published package works correctly.
 */

import { ArgParser, FlagManager } from '@alcyone-labs/arg-parser';

console.log('🧪 Testing @alcyone-labs/arg-parser core package...\n');

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

// Test 1: ArgParser instantiation
console.log('1. ArgParser instantiation');
const parser = new ArgParser({
  appName: 'test-cli',
  appVersion: '1.0.0',
  description: 'Test CLI for post-publish verification',
});
assert(parser !== undefined, 'ArgParser creates successfully');

// Test 2: FlagManager
console.log('\n2. FlagManager');
const flagManager = new FlagManager();
flagManager.addFlag({
  name: 'verbose',
  options: ['--verbose', '-v'],
  description: 'Enable verbose output',
  type: Boolean,
  required: false,
});
const flags = flagManager.getAllFlags();
assert(flags.length === 1, 'FlagManager adds flags correctly');
assert(flags[0].name === 'verbose', 'Flag has correct name');

// Test 3: ArgParser with flags using addFlag
console.log('\n3. ArgParser with flags');
let handlerCalled = false;
const parserWithHandler = new ArgParser({
  appName: 'test-cli',
  handler: async (ctx) => {
    handlerCalled = true;
    return { success: true };
  },
}).addFlag({
  name: 'name',
  options: ['--name', '-n'],
  description: 'Name to greet',
  type: String,
  required: false,
});
assert(parserWithHandler !== undefined, 'ArgParser with handler and flags creates successfully');

// Test 4: Parse with mock args
console.log('\n4. Parse functionality');
const result = await parserWithHandler.parse(['node', 'test', '--name', 'World']);
assert(handlerCalled, 'Handler is called during parse');

// Test 5: Help generation
console.log('\n5. Help generation');
const helpParser = new ArgParser({
  appName: 'help-test',
  description: 'Test help generation',
}).addFlag({
  name: 'verbose',
  options: ['--verbose', '-v'],
  description: 'Verbose mode',
  type: Boolean,
});
const helpText = helpParser.helpText();
assert(helpText.includes('help-test'), 'Help text includes app name');
assert(helpText.includes('--verbose'), 'Help text includes flag');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Post-publish core tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Post-publish core tests PASSED');
  process.exit(0);
}
