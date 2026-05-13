# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release porting omo's `ast_grep_search` and `ast_grep_replace` tools
  as a pi-coding-agent extension.
- `sg` binary resolution from `PATH`, with manual ast-grep installation
  documented for major platforms.
- Custom TUI rendering: collapsed match counts, expanded match list with
  `file:line:col`, dry-run vs applied replace styling, truncation warnings,
  and infrastructure-error rendering.
- TypeBox tool schemas with `StringEnum` for the `lang` parameter so the tool
  surface stays compatible with Google's tool-calling API.
- `ast_grep_replace.executionMode = "sequential"` so the external `sg --update-all`
  process never races against pi's parallel tool execution.
