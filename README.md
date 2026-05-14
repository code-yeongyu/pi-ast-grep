# pi-ast-grep

[![ci](https://github.com/code-yeongyu/pi-ast-grep/actions/workflows/ci.yml/badge.svg)](https://github.com/code-yeongyu/pi-ast-grep/actions/workflows/ci.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

AST-aware code search and rewrite for the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). Faithful port of the ast-grep tool stack from [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent).

## Origin

This package is a port of the ast-grep tools originally written for [oh-my-openagent (omo)](https://github.com/code-yeongyu/oh-my-openagent) by Yeongyu Kim ([@code-yeongyu](https://github.com/code-yeongyu)). The omo source for the tools lives at `src/tools/ast-grep/` in that repository.

The same author re-licensed the ported source under MIT for distribution in the pi-coding-agent ecosystem. omo itself remains under SUL-1.0; this package's MIT scope covers only the code that ships in this repository. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Quick Demo

```text
> Find every console.log in src/

[ast_grep_search] /console.log($MSG)/ in src/  (typescript)
4 matches • 3 files
  src/index.ts (1 match)
  src/cli.ts (1 match)
  src/foo.ts (2 matches)

src/index.ts
  11:3  console.log("greeting");
src/cli.ts
  42:1  console.log("loaded");
src/foo.ts
  18:5  console.log(error);
  27:3  console.log("ready");
```

```text
> Rewrite the console.log calls to logger.info, dry run first.

[ast_grep_replace] /console.log($MSG)/ → /logger.info($MSG)/  [DRY RUN]  (typescript)
[DRY RUN] 4 replacements previewed • 3 files
  src/index.ts (1 match)
  src/cli.ts (1 match)
  src/foo.ts (2 matches)

src/index.ts
  11:3  console.log("greeting");
src/cli.ts
  42:1  console.log("loaded");
src/foo.ts
  18:5  console.log(error);
  27:3  console.log("ready");
```

## Installation

The package targets the [`pi`](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) coding agent. Pi loads extensions from `~/.pi/agent/extensions/`, project `.pi/extensions/`, or via the `--extension` / `-e` CLI flag.

Pick whichever route fits:

```bash
# 1. From npm (once published)
pi install npm:@code-yeongyu/pi-ast-grep

# 2. From git (once the repository is pushed)
pi install git:github.com/code-yeongyu/pi-ast-grep

# 3. Manual placement (always works)
git clone https://github.com/code-yeongyu/pi-ast-grep ~/.pi/agent/extensions/pi-ast-grep
cd ~/.pi/agent/extensions/pi-ast-grep && npm install

# 4. Dev / one-shot test
pi -e /path/to/pi-ast-grep/src/index.ts
```

After installation, restart pi (or run `/reload` inside an interactive session). Both tools register automatically and become callable by the LLM.

## Tools

### `ast_grep_search`

Search code by AST structure across 25 languages.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` (required) | AST pattern with `$VAR` (single node) or `$$$` (multiple nodes). Must be a complete AST node. |
| `lang` | one of `CLI_LANGUAGES` (required) | Target language. |
| `paths` | `string[]` (optional, default `[ctx.cwd]`) | Roots to search. |
| `globs` | `string[]` (optional) | Include / exclude globs (prefix `!` to exclude). |
| `context` | `number` (optional) | Lines of context around each match. |

### `ast_grep_replace`

AST-aware rewrite. Dry-run by default.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` (required) | AST pattern to match. |
| `rewrite` | `string` (required) | Replacement pattern. May reference `$VAR` captures from `pattern`. |
| `lang` | one of `CLI_LANGUAGES` (required) | Target language. |
| `paths` | `string[]` (optional, default `[ctx.cwd]`) | Roots to search. |
| `globs` | `string[]` (optional) | Include / exclude globs. |
| `dryRun` | `boolean` (optional, default `true`) | Preview without writing. Pass `dryRun: false` to apply. |

## Supported Languages

| | | | |
|---|---|---|---|
| `bash` | `c` | `cpp` | `csharp` |
| `css` | `elixir` | `go` | `haskell` |
| `html` | `java` | `javascript` | `json` |
| `kotlin` | `lua` | `nix` | `php` |
| `python` | `ruby` | `rust` | `scala` |
| `solidity` | `swift` | `typescript` | `tsx` |
| `yaml` | | | |

Source: omo's `CLI_LANGUAGES` 25-tuple, mirrored verbatim in `src/ast-grep/languages.ts`.

## Pattern Hints

Patterns are AST nodes, not regex. The following do NOT work and the tools will return a hint nudging you toward `grep` for plain-text search:

| Anti-pattern | Why it fails | Use instead |
|--------------|--------------|-------------|
| `foo\|bar` | `\|` is regex alternation. ast-grep does not alternate. | Two `ast_grep_search` calls, or built-in `grep`. |
| `.*` / `.+` | Regex wildcards. | `$$$` between AST fragments. |
| `\w`, `\d`, `\s`, `\b` | Regex escapes. | `$VAR` to capture any identifier. |
| `[a-z]` | Regex character class. | No AST equivalent — use `grep`. |
| `function $NAME` (no body) | Missing required AST nodes. | `function $NAME($$$) { $$$ }` |
| `def $FUNC($$$):` | Trailing colon. | `def $FUNC($$$)` |

When you genuinely want text search, use the built-in `grep` tool instead.

## Binary Management

`pi-ast-grep` resolves the `sg` binary in this order:

1. **Cached download** — `$XDG_CACHE_HOME/pi-ast-grep/bin/sg` on Unix, `%LOCALAPPDATA%\pi-ast-grep\bin\sg.exe` on Windows. Validated by existence and `>10000` byte size.
2. **`@ast-grep/cli` npm package** — resolved relative to this package via `createRequire`.
3. **Platform-specific npm package** — `@ast-grep/cli-{platform}-{arch}-{libc}` (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-x64`, `win32-arm64`, `win32-ia32`).
4. **`PATH`** — any `sg` (or `sg.exe`) on the system PATH.
5. **Homebrew** — `/opt/homebrew/bin/sg`, `/usr/local/bin/sg` on macOS.
6. **GitHub release auto-download** (last resort) — pulls `app-{arch}-{os}.zip` from `https://github.com/ast-grep/ast-grep/releases/download/<version>/...` and extracts to the cache directory. The version comes from the `@ast-grep/cli` package.json when present, otherwise `0.41.1`.

### Trust model

Auto-download fetches release assets over HTTPS. There is **no checksum verification beyond TLS**. If your security posture requires reproducible binary provenance, install `sg` manually and disable auto-download with `PI_OFFLINE=1`.

### Offline / locked-down networks

Set `PI_OFFLINE=1` (or `PI_OFFLINE=true`) to skip the GitHub download path. The tools will surface manual-install guidance instead.

```bash
export PI_OFFLINE=1
```

Manual install options when offline:

```bash
# npm
npm install -g @ast-grep/cli

# cargo
cargo install ast-grep --locked

# Homebrew (macOS)
brew install ast-grep
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "ast-grep (sg) binary not found" | Install via npm / cargo / brew (see above), or unset `PI_OFFLINE`. |
| Locked-down corporate network | Set `PI_OFFLINE=1` and install `sg` manually. |
| `EACCES` writing to cache | On Unix, ensure `$XDG_CACHE_HOME` (or `~/.cache`) is writable. On Windows, ensure `%LOCALAPPDATA%` is writable. |
| Tool registers but never runs | Confirm pi loaded the extension: `pi --list-models -e ./src/index.ts` should show no extension errors. Use `pi -e ./src/index.ts` for one-shot manual smoke. |
| Pattern always returns "No matches found" | Run with `--lang` matching the file. Double-check the pattern is a complete AST node (function patterns need params and body). The tool returns a hint when it detects regex-style patterns. |

## Development

```bash
git clone https://github.com/code-yeongyu/pi-ast-grep
cd pi-ast-grep
npm install            # install dev + peer dependencies
npm test               # run vitest
npm run typecheck      # strict tsc --noEmit
npm run check          # tsc + biome
pi -e ./src/index.ts   # smoke-test inside a real pi session
```

The test suite uses vitest. Test descriptions follow `#given .. #when .. #then` style; bodies use plain `// given / // when / // then` comments. No `any`, no enums.

## License

[MIT](LICENSE). See [NOTICE](NOTICE) for re-license disclosure relative to omo.

## Related

- [senpi](https://github.com/code-yeongyu/senpi) — the fork/runtime these extensions are extracted from.
- [Ultraworkers Discord](https://discord.gg/PUwSMR9XNk) — community link from the senpi README.
- [Dori](https://sisyphuslabs.ai) — the product powered by senpi under the hood.

## Acknowledgements

- **Yeongyu Kim** ([@code-yeongyu](https://github.com/code-yeongyu)) — author of the original ast-grep tools in [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent), and of this pi port.
- **Mario Zechner** ([@badlogic](https://github.com/badlogic)) — author of [pi-mono](https://github.com/badlogic/pi-mono) and the pi-coding-agent extension API this package targets.
- **Herrington Darkholme** ([@HerringtonDarkholme](https://github.com/HerringtonDarkholme)) — author of [ast-grep](https://ast-grep.github.io), the underlying CLI this package wraps.
