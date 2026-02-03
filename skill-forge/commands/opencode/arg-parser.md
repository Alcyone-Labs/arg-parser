---
description: Load arg-parser skill to build type-safe CLIs with MCP and interactive prompts
---

If $ARGUMENTS contains `--update-skill`:
  - Determine install location:
    - Check if `.opencode/skills/skill-forge/skill/arg-parser/` exists → local
    - Check if `~/.config/opencode/skills/skill-forge/skill/arg-parser/` exists → global
  - Run appropriate install command:
    - Local: `curl -fsSL https://raw.githubusercontent.com/Alcyone-Labs/arg-parser/main/skill-forge/install.sh | bash -s -- --self --local`
    - Global: `curl -fsSL https://raw.githubusercontent.com/Alcyone-Labs/arg-parser/main/skill-forge/install.sh | bash -s -- --self --global`
  - Output success message and stop

Load skill: skill({ name: 'arg-parser' })

Analyze $ARGUMENTS to determine task type:

**Task Types:**

1. **New CLI with flags** → Read `references/core-api/README.md`, `references/flags/README.md`
   - Workflow: Create parser → Add flags → Define handler → Parse

2. **Add MCP server** → Read `references/mcp-integration/README.md`
   - Workflow: Add flags → Call `.withMcp()` → Add tools → Parse

3. **Add interactive prompts** → Read `references/interactive-prompts/README.md`
   - Workflow: Set `promptWhen` → Add `prompt` to flags → Handle `ctx.promptAnswers`

4. **Define flags with Zod** → Read `references/types/README.md`, `references/flags/README.md`
   - Use `zodFlagSchema` for validation

5. **Create subcommands** → Read `references/core-api/README.md`
   - Use `addSubCommand()` with separate parsers

6. **DXT bundling** → Read `references/mcp-integration/README.md`
   - Call `.withMcp({ dxt: {...} })`

**Decision Tree:**

```
Need CLI?
├── Yes → Need MCP?
│   ├── Yes → Read mcp-integration/ → Use .withMcp()
│   └── No → Need interactive prompts?
│       ├── Yes → Read interactive-prompts/ → Add prompt to flags
│       └── No → Read core-api/, flags/ → Standard CLI
└── No → Read types/ for type definitions
```

Execute task using skill rules and workflow.
