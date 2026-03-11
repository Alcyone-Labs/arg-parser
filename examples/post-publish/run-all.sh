#!/bin/bash

# Post-Publish Verification Test Runner
# Run this after publishing to verify packages work from npm

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASSED=0
FAILED=0

echo "🚀 Post-Publish Verification Tests"
echo "==================================="
echo ""

run_test() {
  local dir=$1
  local name=$2
  
  echo "📦 Testing: $name"
  echo "   Directory: $dir"
  
  cd "$SCRIPT_DIR/$dir"
  
  # Clean install
  rm -rf node_modules package-lock.json
  
  if ! npm install --quiet 2>&1; then
    echo "   ❌ npm install failed"
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Run test
  if npm test 2>&1; then
    echo "   ✅ Passed"
    PASSED=$((PASSED + 1))
  else
    echo "   ❌ Failed"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
}

# Run all tests
run_test "core-only" "@alcyone-labs/arg-parser (core only)"
run_test "mcp-integration" "@alcyone-labs/arg-parser-mcp"
run_test "full-stack" "Full stack (core + MCP + DXT)"

# Summary
echo "==================================="
echo "📊 Summary: $PASSED passed, $FAILED failed"
echo "==================================="

if [ $FAILED -gt 0 ]; then
  echo "❌ Some tests failed!"
  exit 1
else
  echo "✅ All post-publish tests passed!"
  exit 0
fi
