import { StringEnum } from "@earendil-works/pi-ai";
import type { defineTool as DefineToolType } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Inlined identity so this extension has no runtime dep on a
// specific coding-agent fork (pi-mono vs senpi vs ...).
const defineTool: typeof DefineToolType = (t) => t;

import { runSg } from "./cli.js";
import { CLI_LANGUAGES } from "./languages.js";
import { getPatternHint } from "./pattern-hints.js";
import { renderReplaceCall, renderReplaceResult, renderSearchCall, renderSearchResult } from "./render.js";
import { formatReplaceResult, formatSearchResult } from "./result-formatter.js";
import type { CliLanguage, RunSgOptions, SgResult, SgTruncationReason } from "./types.js";

function isCliLanguage(value: unknown): value is CliLanguage {
	return typeof value === "string" && CLI_LANGUAGES.some((language) => language === value);
}

function invalidLanguageResult(language: unknown): {
	content: Array<{ type: "text"; text: string }>;
	details: undefined;
} {
	return {
		content: [{ type: "text", text: `Unsupported language: ${String(language)}` }],
		details: undefined,
	};
}

const SearchParams = Type.Object({
	pattern: Type.String({
		description: "AST pattern with meta-variables ($VAR, $$$). Must be a complete AST node.",
	}),
	lang: StringEnum(CLI_LANGUAGES, { description: "Target language" }),
	paths: Type.Optional(
		Type.Array(Type.String(), {
			description: "Paths to search (default: current working directory)",
		}),
	),
	globs: Type.Optional(
		Type.Array(Type.String(), {
			description: "Include/exclude globs (prefix ! to exclude)",
		}),
	),
	context: Type.Optional(Type.Number({ description: "Number of context lines around each match" })),
});

const ReplaceParams = Type.Object({
	pattern: Type.String({ description: "AST pattern to match" }),
	rewrite: Type.String({ description: "Replacement pattern (can use $VAR from pattern)" }),
	lang: StringEnum(CLI_LANGUAGES, { description: "Target language" }),
	paths: Type.Optional(Type.Array(Type.String(), { description: "Paths to search" })),
	globs: Type.Optional(Type.Array(Type.String(), { description: "Include/exclude globs" })),
	dryRun: Type.Optional(Type.Boolean({ description: "Preview changes without applying (default: true)" })),
});

export interface AstGrepSearchDetails {
	pattern: string;
	lang: CliLanguage;
	paths: string[];
	globs?: string[];
	matches: SgResult["matches"];
	totalMatches: number;
	truncated: boolean;
	truncatedReason?: SgTruncationReason;
	error?: string;
	hint?: string;
}

export interface AstGrepReplaceDetails {
	pattern: string;
	rewrite: string;
	lang: CliLanguage;
	paths: string[];
	globs?: string[];
	dryRun: boolean;
	matches: SgResult["matches"];
	totalMatches: number;
	truncated: boolean;
	truncatedReason?: SgTruncationReason;
	error?: string;
}

export const ast_grep_search = defineTool({
	name: "ast_grep_search",
	label: "AST Grep Search",
	description:
		"Search code patterns across the filesystem using AST-aware matching. " +
		"Use meta-variables: $VAR (single node), $$$ (multiple nodes). " +
		"Patterns must be complete AST nodes (valid code). " +
		"Examples: 'console.log($MSG)', 'def $FUNC($$$):', 'function $NAME($$$) { $$$ }'.",
	promptSnippet: "Search code by AST structure across 25 languages using $VAR and $$$ meta-variables (NOT regex).",
	promptGuidelines: [
		"Use ast_grep_search instead of grep when the pattern depends on code structure (function/class/import/call shape).",
		"Use grep instead of ast_grep_search for plain text or cross-language regex search.",
		"Run multiple ast_grep_search calls in parallel when checking different patterns.",
	],
	parameters: SearchParams,
	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		if (!isCliLanguage(params.lang)) {
			return invalidLanguageResult(params.lang);
		}

		const paths = params.paths && params.paths.length > 0 ? params.paths : [ctx.cwd];
		const options: RunSgOptions = {
			pattern: params.pattern,
			lang: params.lang,
			paths,
		};
		if (params.globs !== undefined) options.globs = params.globs;
		if (params.context !== undefined) options.context = params.context;
		const result = await runSg(options);

		const text = formatSearchResult(result);
		const hint =
			result.matches.length === 0 && !result.error
				? (getPatternHint(params.pattern, params.lang) ?? undefined)
				: undefined;
		const finalText = hint ? `${text}\n\n${hint}` : text;

		const details: AstGrepSearchDetails = {
			pattern: params.pattern,
			lang: params.lang,
			paths,
			matches: result.matches,
			totalMatches: result.totalMatches,
			truncated: result.truncated,
		};
		if (params.globs !== undefined) details.globs = params.globs;
		if (result.truncatedReason !== undefined) details.truncatedReason = result.truncatedReason;
		if (result.error !== undefined) details.error = result.error;
		if (hint !== undefined) details.hint = hint;

		return {
			content: [{ type: "text", text: finalText }],
			details,
		};
	},
	renderCall: renderSearchCall,
	renderResult: renderSearchResult,
});

export const ast_grep_replace = defineTool({
	name: "ast_grep_replace",
	label: "AST Grep Replace",
	description:
		"Replace code patterns across the filesystem with AST-aware rewriting. " +
		"Dry-run by default. Use meta-variables in `rewrite` to preserve matched content. " +
		"Example: pattern='console.log($MSG)' rewrite='logger.info($MSG)'.",
	promptSnippet: "Rewrite code by AST pattern across 25 languages. Dry-run by default; pass dryRun=false to apply.",
	promptGuidelines: [
		"Use ast_grep_replace dryRun=true first to preview changes; only set dryRun=false after confirming match list.",
		"Use ast_grep_replace instead of edit when the rewrite spans many files with the same structural pattern.",
	],
	parameters: ReplaceParams,
	executionMode: "sequential",
	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		if (!isCliLanguage(params.lang)) {
			return invalidLanguageResult(params.lang);
		}

		const paths = params.paths && params.paths.length > 0 ? params.paths : [ctx.cwd];
		const dryRun = params.dryRun !== false;
		const options: RunSgOptions = {
			pattern: params.pattern,
			rewrite: params.rewrite,
			lang: params.lang,
			paths,
			updateAll: !dryRun,
		};
		if (params.globs !== undefined) options.globs = params.globs;
		const result = await runSg(options);

		const text = formatReplaceResult(result, dryRun);

		const details: AstGrepReplaceDetails = {
			pattern: params.pattern,
			rewrite: params.rewrite,
			lang: params.lang,
			paths,
			dryRun,
			matches: result.matches,
			totalMatches: result.totalMatches,
			truncated: result.truncated,
		};
		if (params.globs !== undefined) details.globs = params.globs;
		if (result.truncatedReason !== undefined) details.truncatedReason = result.truncatedReason;
		if (result.error !== undefined) details.error = result.error;

		return {
			content: [{ type: "text", text }],
			details,
		};
	},
	renderCall: renderReplaceCall,
	renderResult: renderReplaceResult,
});
