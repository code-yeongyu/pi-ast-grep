import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { findSgCliPathSync } from "./ast-grep/binary-path.js";
import { ensureAstGrepBinary, getCacheDir, getCachedBinaryPath } from "./ast-grep/downloader.js";
import { ast_grep_replace, ast_grep_search } from "./ast-grep/tools.js";

/**
 * pi-ast-grep — AST-aware code search and replace for the pi coding agent.
 *
 * Ports omo's ast-grep tool stack as a pi extension. Resolves the `sg`
 * binary in this order: cache → @ast-grep/cli npm package → platform
 * package → PATH → Homebrew → GitHub release auto-download (last resort,
 * gated by `PI_OFFLINE`).
 *
 * Tools registered:
 *   - ast_grep_search   — AST pattern search across files (parallel-safe)
 *   - ast_grep_replace  — AST pattern replace, sequential when applying
 *
 * Commands registered:
 *   - /ast-grep         — show binary path, version, and cache location
 *   - /ast-grep install — force-download the sg binary into the cache
 *
 * See README.md for installation and usage.
 */
export default function (pi: ExtensionAPI): void {
	pi.registerTool(ast_grep_search);
	pi.registerTool(ast_grep_replace);

	pi.registerCommand("ast-grep", {
		description: "Show ast-grep binary path, version, and cache directory",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const wantsInstall = trimmed === "install" || trimmed === "download";

			const cachedPath = getCachedBinaryPath();
			const localPath = findSgCliPathSync();
			const cacheDir = getCacheDir();

			if (wantsInstall) {
				ctx.ui.setStatus("pi-ast-grep", "Downloading sg binary...");
				const path = await ensureAstGrepBinary();
				ctx.ui.setStatus("pi-ast-grep", undefined);
				if (path) {
					ctx.ui.notify(`ast-grep ready: ${path}`, "info");
				} else {
					ctx.ui.notify(
						"Auto-download failed. Try: npm install -g @ast-grep/cli or brew install ast-grep",
						"error",
					);
				}
				return;
			}

			const lines = [
				"pi-ast-grep",
				`  Cache dir : ${cacheDir}`,
				`  Cached sg : ${cachedPath ?? "not downloaded"}`,
				`  Local sg  : ${localPath ?? "not on PATH"}`,
			].join("\n");
			ctx.ui.notify(lines, "info");
		},
	});
}
