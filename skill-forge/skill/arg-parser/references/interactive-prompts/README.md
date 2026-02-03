# Interactive Prompts

Interactive prompts integration with @clack/prompts for creating dual-mode CLIs that work both programmatically (via flags) and interactively (via prompts).

## When to Use

Use interactive prompts when:

- Building CLIs that need to be user-friendly for newcomers
- Creating complex workflows with sequential inputs
- Implementing forms or wizards in CLI tools
- Supporting both automation (CI/CD) and manual usage
- Validating user input in real-time
- Providing rich selection interfaces (multiselect, autocomplete)

## Decision Tree

```
Need CLI with user input?
├── Yes → Will users run interactively?
│   ├── Yes → Use interactive prompts
│   │   ├── Need validation? → Use validate in prompt config
│   │   ├── Sequential dependencies? → Use promptSequence or array order
│   │   ├── Conditional options? → Access ctx.promptAnswers in prompt factory
│   │   └── Multiple selections? → Use multiselect type
│   └── No (automation only) → Regular flags only
└── No → Standard CLI without prompts
```

## Quick Reference

| Feature                 | How To                                          |
| ----------------------- | ----------------------------------------------- |
| Basic prompt            | Add `prompt` property to flag                   |
| Trigger mode            | Set `promptWhen` in ArgParser options           |
| Explicit ordering       | Use `promptSequence: 1, 2, 3...`                |
| Access previous answers | Use `ctx.promptAnswers` in prompt factory       |
| Validation              | Return `true` or error `string` from `validate` |
| Cancel handling         | Provide `onCancel` callback                     |
| Non-TTY fallback        | Automatic - uses flags only in CI/pipes         |

## Prompt Types

- `text` - Free text input with placeholder
- `password` - Hidden input (no placeholder support)
- `confirm` - Yes/No boolean
- `select` - Single choice from list
- `multiselect` - Multiple choices with array result

## File Structure

```
references/interactive-prompts/
├── README.md          # This file - overview and decision tree
├── api.md            # TypeScript interfaces and method signatures
├── configuration.md  # All config options and defaults
├── patterns.md       # Common implementation patterns
└── gotchas.md        # Pitfalls and limitations
```
