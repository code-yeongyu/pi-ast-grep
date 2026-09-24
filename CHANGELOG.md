# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-09-24

### Changed

- Raised Node engine to `>=22.19.0`.
- Peer dependencies are `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, and `@earendil-works/pi-tui` at `*` (host-provided; never `^0.87`, because downstream runtimes use date versions).
- Added those Pi packages as exact `0.87.1` devDependencies so tests run against the current upstream runtime.
- Bumped `@ast-grep/cli` from `^0.41.1` to `0.45.3` and default GitHub-download fallback version to `0.45.3`.
- Bumped `extract-zip` to `2.0.1` and `@types/extract-zip` to `2.0.3`.
- Dev toolchain pins: `@biomejs/biome` `2.5.14`, `vitest` `5.0.1`, `typescript` `7.0.2`, `@types/node` `26.6.2`, `@typescript/native-preview` `7.0.0-dev.20260707.2`.
- CI uses Bun `1.4.2` (`oven-sh/setup-bun@v2`) with `actions/checkout@v7` / `actions/setup-node@v7`, Node `22`/`24` on ubuntu and macos, plus an `npm-consumer` job (`npm ci && npm test`).
- Development docs show Bun as the primary install/test path; npm consumer instructions remain valid.

### Fixed

- Tracking issue #3 (npm audit high vulnerabilities via stale Pi `^0.78.1` peers / lockfile).
- Test `ExtensionAPI` fixture for Pi 0.87 (`on` unsubscribe, `registerEntryRenderer`, `registerMarkdownTransformer`). Informed by #4 (@madgegja); that PR is superseded by this refresh.

## [0.1.0] - 2026-05-13

### Added

- Initial release porting omo's `ast_grep_search` and `ast_grep_replace` tools
  as a pi-coding-agent extension.
- Auto-resolution of the `sg` binary across `@ast-grep/cli` npm package,
  platform-specific npm packages, Homebrew (`/opt/homebrew/bin/sg`,
  `/usr/local/bin/sg`), `PATH`, and a last-resort GitHub release download
  cached under `$XDG_CACHE_HOME/pi-ast-grep/bin/`.
- `PI_OFFLINE=1` environment gate that skips the network download path and
  surfaces manual install guidance instead.
- Custom TUI rendering: collapsed match counts, expanded match list with
  `file:line:col`, dry-run vs applied replace styling, truncation warnings,
  and infrastructure-error rendering.
- TypeBox tool schemas with `StringEnum` for the `lang` parameter so the tool
  surface stays compatible with Google's tool-calling API.
- `ast_grep_replace.executionMode = "sequential"` so the external `sg --update-all`
  process never races against pi's parallel tool execution.
