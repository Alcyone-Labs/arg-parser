# Documentation Template

Use this template when creating new documentation for ArgParser.

## File Structure

Every documentation file must have these 5 sections in order:

1. **Overview** - Purpose, prerequisites, learning outcomes
2. **Quickstart** - Single copy-pasteable example (<5 min)
3. **Deep Dive** - Detailed explanation with numbered steps
4. **Examples** - 2-3 runnable examples (basic, advanced, real-world)
5. **References** - Internal and external links

## Template

```markdown
# {Topic Title}

## Overview

{One paragraph explaining the purpose of this document}

**Prerequisites:**
- Item 1
- Item 2

**Learning Outcomes:**
After reading this guide, you will be able to:
- Outcome 1
- Outcome 2
- Outcome 3

---

## Quickstart

{Single code block that can be copy-pasted and run in <5 minutes}

**Expected Output:**
```
{Show what the user should see}
```

---

## Deep Dive

### 1. {First Major Topic}

{Detailed explanation}

{Code example}

**Edge Cases:**
- Case 1: {explanation}
- Case 2: {explanation}

### 2. {Second Major Topic}

{Detailed explanation}

---

## Examples

### Example 1: {Basic Use Case}

```typescript
{Simple, clear example}
```

**Usage:**
```bash
{Show command line usage}
```

### Example 2: {Advanced Use Case}

```typescript
{More complex example}
```

### Example 3: {Real-World Scenario}

```typescript
{Production-ready example}
```

---

## References

### Internal Links

- [Related Doc](./path/to/doc.md) - Description
- [Another Doc](./path/to/other.md) - Description

### External Links

- [External Resource](https://example.com) - Description

### API Reference

- `ClassName` - Brief description
- `functionName()` - Brief description

---

## Quality Gates

- [ ] Template used correctly
- [ ] All 5 mandatory sections present
- [ ] Quickstart code is runnable
- [ ] Examples have expected outputs
- [ ] Internal links documented
- [ ] External references vetted
- [ ] `pnpm run spellcheck` passes
- [ ] `pnpm run linkcheck` passes
```

## Naming Conventions

- **Files**: Use kebab-case (e.g., `my-topic-guide.md`)
- **Directories**: Use kebab-case (e.g., `how-to-guides/`)
- **Max Depth**: 3 levels (e.g., `docs/topic/subtopic/file.md`)

## Code Conventions

### TypeScript

```typescript
// Always use .js extension in imports
import { Something } from './path/to/file.js';

// Use proper JSDoc
/**
 * Brief description
 * @param paramName - Parameter description
 * @returns Return description
 */
function myFunction(paramName: string): boolean {
  return true;
}
```

### File Organization

```
docs/
├── topic-name/
│   ├── index.md              # Main guide
│   ├── api-reference.md      # API docs
│   └── advanced-topics.md    # Additional guides
├── README.md                 # Docs index
└── .templates/              # This directory
```

## Quality Checklist

Before submitting documentation:

- [ ] Follows the 5-section structure
- [ ] All code examples are tested and working
- [ ] Links are valid (run `pnpm run linkcheck`)
- [ ] No spelling errors (run `pnpm run spellcheck`)
- [ ] TOC generated for >500 words
- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] All placeholders replaced with real content

## Common Patterns

### Adding a Code Example

```markdown
### Example: {Descriptive Name}

```typescript
import { ArgParser } from '@alcyone-labs/arg-parser';

const parser = new ArgParser({
  // ... configuration
});
```

**Usage:**
```bash
$ node script.js --flag value
Expected output here
```
```

### Adding a Table

```markdown
| Column 1 | Column 2 | Description |
|----------|----------|-------------|
| Value 1  | Value 2  | Description |
```

### Adding a Note/Warning

```markdown
> **Note:** This is an important note.

> **Warning:** This is a warning about potential issues.
```

## Validation Commands

```bash
# Check spelling
pnpm run spellcheck

# Check links
pnpm run linkcheck

# Generate TOC
pnpm run toc

# Validate all docs
pnpm run docs:validate
```

## Resources

- [Documentation Guidelines](../DOCUMENTATION_GUIDELINES.md)
- [Examples Directory](../examples/)
- [Contributing Guide](../CONTRIBUTING.md)
