## Backlog

- [x] Publish as an open-source library
- [x] Make ArgParser compatible with MCP out-of-the-box
- [x] Rename --LIB-\* flags to --s-\*
- [x] Make it possible to pass a `--s-save-to-env /path/to/file` parameter that saves all the parameters to a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Make it possible to pass a `--s-with-env /path/to/file` parameter that loads all the parameters from a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Add support for async type function to enable more flexibility
- [x] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)
- [x] Add System flags to args.systemArgs
- [x] Improve flag options collision prevention
- [x] Add support for `@clack/prompts` where we add a new command type "interactive" where we pass a new object "prompts" {promptText: "Prompt Text", options: [1,2,3,4] or options: async () => {/_ fetch files from a folder _/}}, then the outcome are passed to the context as args.promptAnswers
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Add support for locales / translations

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
