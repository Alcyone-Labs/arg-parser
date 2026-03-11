# Post-Publish Verification Tests

These tests verify that published npm packages work correctly after release.

## Structure

```
post-publish/
├── core-only/          # Tests @alcyone-labs/arg-parser only
├── mcp-integration/    # Tests core + @alcyone-labs/arg-parser-mcp
└── full-stack/         # Tests core + MCP + DXT together
```

## Running Tests

### Run all tests:
```bash
./run-all.sh
```

### Run individual tests:
```bash
# Core only
cd core-only && npm install && npm test

# MCP integration
cd mcp-integration && npm install && npm test

# Full stack
cd full-stack && npm install && npm test
```

## When to Run

Run these tests **after** publishing a new version to npm to verify:
1. Package exports are correct
2. TypeScript types resolve properly
3. Runtime functionality works as expected
4. Inter-package dependencies work correctly

## Adding New Tests

Create a new directory with:
1. `package.json` - dependencies from npm (not workspace)
2. `test.mjs` - ESM test file that exercises the package
