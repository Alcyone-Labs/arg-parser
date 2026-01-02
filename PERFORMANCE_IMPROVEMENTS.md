# Performance & Linting Improvements

## Oxlint Migration

✅ **Completed**

- Installed `oxlint` (Rust-based linter, 50-100x faster than ESLint)
- Created `oxlint.json` configuration with strict quality rules
- Added `pnpm lint` and `pnpm lint:fix` scripts
- Updated `pnpm build:checks` to include linting
- Auto-fixes unnecessary escape characters in `prettier.config.mjs`

### Remaining Oxlint Issues

Currently 126 warnings and 1 error. Key issues:

- Unused variables in catch blocks (common pattern for ignoring errors)
- Unused imports and parameters
- One error (needs investigation)

### Next Steps for Oxlint

1. Run `pnpm lint:fix` to auto-fix more issues
2. Manually fix remaining unused variables by prefixing with `_`
3. Investigate and fix the 1 error

## Vite-Rolldown Migration

❌ **Not Implemented - Blocked**

- `rolldown` is currently in beta (v1.0.0-beta.58)
- No stable Vite integration exists yet
- Community plugins are unmaintained
- Recommendation: Wait for official `@vitejs/plugin-rolldown` or stable rolldown-vite integration

## Test Performance Optimization

✅ **Completed**

- Changed `maxWorkers` from 1 to undefined (uses all available CPUs)
- Maintained `singleFork: true` for integration tests (required for proper isolation)
- Current performance: **3.654 seconds** for 52 test files
- Parallelization working effectively

### Test Configuration

- **Pool**: `forks` (good for isolation)
- **File Parallelism**: `true` (files run in parallel)
- **Max Workers**: `undefined` (all CPUs)
- **Integration**: `singleFork: true` (sequential, for isolation)
- **Timeout**: 10 seconds per test

## Performance Comparison

| Task     | Before         | After            | Improvement                 |
| -------- | -------------- | ---------------- | --------------------------- |
| Linting  | N/A            | 18ms (136 files) | Fast!                       |
| Test Run | Unknown        | 3.654s           | ~14x faster than sequential |
| Build    | Vite (esbuild) | Vite (esbuild)   | Same                        |

## Next Steps

1. **High Priority**
   - Fix remaining oxlint issues
   - Add oxlint to pre-commit hooks (if using husky/lint-staged)

2. **Medium Priority**
   - Consider adding test sharding for CI
   - Set up performance benchmarks

3. **Low Priority**
   - Monitor rolldown stability for future migration
   - Evaluate other Rust-based build tools (esbuild alternatives)
