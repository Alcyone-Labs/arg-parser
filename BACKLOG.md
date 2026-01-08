## Backlog

- [x] Publish as an open-source library
- [x] Make ArgParser compatible with MCP out-of-the-box
- [x] Rename --LIB-* flags to --s-*
- [x] Make it possible to pass a `--s-save-to-env /path/to/file` parameter that saves all the parameters to a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Make it possible to pass a `--s-with-env /path/to/file` parameter that loads all the parameters from a file (works with Bash-style .env, JSON, YAML, TOML)
- [x] Add support for async type function to enable more flexibility
- [x] Upgrade to Zod/V4 (V4 does not support functions well, this will take more time, not a priority)
- [ ] Add System flags to args.systemArgs
- [ ] Improve flag options collision prevention
- [ ] (potentially) add support for fully typed parsed output, this has proven very challenging
- [ ] Add support for locales / translations

### (known) Bugs / DX improvement points

- [ ] When a flag with `flagOnly: false` is going to consume a value that appears like a valid flag from the set, raise the appropriate warning
