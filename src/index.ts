import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { findSgCliPathSync } from "./ast-grep/binary-path.js";
import { ast_grep_replace, ast_grep_search } from "./ast-grep/tools.js";

/**
 * pi-ast-grep — AST-aware code search and replace for the pi coding agent.
 *
 * Ports omo's ast-grep tool stack as a pi extension. Requires the `sg`
 * ast-grep CLI to be installed on PATH.
 *
 * Tools registered:
 *   - ast_grep_search   — AST pattern search across files (parallel-safe)
 *   - ast_grep_replace  — AST pattern replace, sequential when applying
 *
 * Commands registered:
 *   - /ast-grep         — show the resolved sg binary path
 *
 * See README.md for installation and usage.
 */
export default function (pi: ExtensionAPI): void {
	pi.registerTool(ast_grep_search);
	pi.registerTool(ast_grep_replace);

	pi.registerCommand("ast-grep", {
		description: "Show ast-grep binary path",
		handler: async (_args, ctx) => {
			const localPath = findSgCliPathSync();
			const lines = ["pi-ast-grep", `  sg: ${localPath ?? "not found on PATH"}`].join("\n");
			ctx.ui.notify(lines, localPath ? "info" : "warning");
		},
	});
}
