import type { AgentToolResult, Theme, ToolRenderResultOptions } from "@earendil-works/pi-coding-agent";
import { type Component, Text, truncateToWidth } from "@earendil-works/pi-tui";

import type { AstGrepReplaceDetails, AstGrepSearchDetails } from "./tools.js";
import type { CliLanguage, CliMatch, SgTruncationReason } from "./types.js";

interface RenderContext {
	lastComponent: Component | undefined;
	isError?: boolean;
}

interface AstGrepSearchCallArgs {
	pattern?: string;
	lang?: string;
	paths?: string[];
	globs?: string[];
	context?: number;
}

interface AstGrepReplaceCallArgs {
	pattern?: string;
	rewrite?: string;
	lang?: string;
	paths?: string[];
	globs?: string[];
	dryRun?: boolean;
}

interface MatchGroup {
	file: string;
	matches: CliMatch[];
}

const MAX_COLLAPSED_ERROR_LENGTH = 180;
const MAX_COLLAPSED_FILES = 3;
const MAX_EXPANDED_MATCHES = 15;
const MAX_PATH_LENGTH = 42;
const MAX_SNIPPET_LENGTH = 160;

function getTextContent<TDetails>(result: AgentToolResult<TDetails>): string {
	return result.content.find((content) => content.type === "text")?.text ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const property = value[key];
	return typeof property === "string" ? property : undefined;
}

function readNumber(value: unknown, key: string): number | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const property = value[key];
	return typeof property === "number" ? property : undefined;
}

function readBoolean(value: unknown, key: string): boolean | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const property = value[key];
	return typeof property === "boolean" ? property : undefined;
}

function readStringArray(value: unknown, key: string): string[] | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const property = value[key];
	return Array.isArray(property) && property.every((item) => typeof item === "string") ? property : undefined;
}

function isCliLanguage(value: unknown): value is CliLanguage {
	return typeof value === "string";
}

function isTruncationReason(value: unknown): value is SgTruncationReason {
	return value === "max_matches" || value === "max_output_bytes" || value === "timeout";
}

function isCliMatch(value: unknown): value is CliMatch {
	if (!isRecord(value)) {
		return false;
	}

	const range = value["range"];
	if (!isRecord(range)) {
		return false;
	}

	const start = range["start"];
	if (!isRecord(start)) {
		return false;
	}

	return (
		typeof value["file"] === "string" &&
		typeof value["lines"] === "string" &&
		typeof value["text"] === "string" &&
		typeof start["line"] === "number" &&
		typeof start["column"] === "number"
	);
}

function isCliMatchArray(value: unknown): value is CliMatch[] {
	return Array.isArray(value) && value.every(isCliMatch);
}

function getSearchCallArgs(args: unknown): AstGrepSearchCallArgs | undefined {
	if (!isRecord(args)) {
		return undefined;
	}

	const result: AstGrepSearchCallArgs = {};
	const pattern = readString(args, "pattern");
	const lang = readString(args, "lang");
	const paths = readStringArray(args, "paths");
	const globs = readStringArray(args, "globs");
	const context = readNumber(args, "context");
	if (pattern !== undefined) result.pattern = pattern;
	if (lang !== undefined) result.lang = lang;
	if (paths !== undefined) result.paths = paths;
	if (globs !== undefined) result.globs = globs;
	if (context !== undefined) result.context = context;
	return result;
}

function getReplaceCallArgs(args: unknown): AstGrepReplaceCallArgs | undefined {
	if (!isRecord(args)) {
		return undefined;
	}

	const result: AstGrepReplaceCallArgs = {};
	const pattern = readString(args, "pattern");
	const rewrite = readString(args, "rewrite");
	const lang = readString(args, "lang");
	const paths = readStringArray(args, "paths");
	const globs = readStringArray(args, "globs");
	const dryRun = readBoolean(args, "dryRun");
	if (pattern !== undefined) result.pattern = pattern;
	if (rewrite !== undefined) result.rewrite = rewrite;
	if (lang !== undefined) result.lang = lang;
	if (paths !== undefined) result.paths = paths;
	if (globs !== undefined) result.globs = globs;
	if (dryRun !== undefined) result.dryRun = dryRun;
	return result;
}

function isSearchDetails(value: unknown): value is AstGrepSearchDetails {
	if (!isRecord(value)) {
		return false;
	}

	const truncatedReason = value["truncatedReason"];
	const error = value["error"];
	const hint = value["hint"];
	return (
		typeof value["pattern"] === "string" &&
		isCliLanguage(value["lang"]) &&
		Array.isArray(value["paths"]) &&
		value["paths"].every((item) => typeof item === "string") &&
		isCliMatchArray(value["matches"]) &&
		typeof value["totalMatches"] === "number" &&
		typeof value["truncated"] === "boolean" &&
		(truncatedReason === undefined || isTruncationReason(truncatedReason)) &&
		(error === undefined || typeof error === "string") &&
		(hint === undefined || typeof hint === "string")
	);
}

function isReplaceDetails(value: unknown): value is AstGrepReplaceDetails {
	if (!isRecord(value)) {
		return false;
	}

	const truncatedReason = value["truncatedReason"];
	const error = value["error"];
	return (
		typeof value["pattern"] === "string" &&
		typeof value["rewrite"] === "string" &&
		isCliLanguage(value["lang"]) &&
		Array.isArray(value["paths"]) &&
		value["paths"].every((item) => typeof item === "string") &&
		typeof value["dryRun"] === "boolean" &&
		isCliMatchArray(value["matches"]) &&
		typeof value["totalMatches"] === "number" &&
		typeof value["truncated"] === "boolean" &&
		(truncatedReason === undefined || isTruncationReason(truncatedReason)) &&
		(error === undefined || typeof error === "string")
	);
}

function reuseText(context: RenderContext): Text {
	const text = context.lastComponent instanceof Text ? context.lastComponent : new Text("", 0, 0);
	return text;
}

function truncateMessage(message: string): string {
	if (message.length <= MAX_COLLAPSED_ERROR_LENGTH) {
		return message;
	}

	return `${message.slice(0, MAX_COLLAPSED_ERROR_LENGTH - 1)}…`;
}

function shortenPath(path: string): string {
	const normalizedPath = path.replace(/\\/g, "/");
	const homeDirectory = process.env["HOME"]?.replace(/\\/g, "/");
	const displayPath =
		homeDirectory && normalizedPath.startsWith(homeDirectory)
			? `~${normalizedPath.slice(homeDirectory.length)}`
			: normalizedPath;

	if (displayPath.length <= MAX_PATH_LENGTH) {
		return displayPath || ".";
	}

	return `…${displayPath.slice(-(MAX_PATH_LENGTH - 1))}`;
}

function formatPaths(paths: string[] | undefined): string {
	if (!paths || paths.length === 0) {
		return ".";
	}

	const [firstPath, ...remainingPaths] = paths;
	const suffix = remainingPaths.length > 0 ? ` +${remainingPaths.length}` : "";
	return `${shortenPath(firstPath ?? ".")}${suffix}`;
}

function formatGlobBadge(globs: string[] | undefined, theme: Theme): string {
	if (!globs || globs.length === 0) {
		return "";
	}

	const [firstGlob, ...remainingGlobs] = globs;
	const suffix = remainingGlobs.length > 0 ? ` +${remainingGlobs.length}` : "";
	return theme.fg("dim", ` [glob ${firstGlob ?? ""}${suffix}]`);
}

function formatSearchBadges(args: AstGrepSearchCallArgs | undefined, theme: Theme): string {
	let badges = "";
	if (args?.lang) {
		badges += theme.fg("dim", ` [${args.lang}]`);
	}
	badges += formatGlobBadge(args?.globs, theme);
	if (args?.context !== undefined) {
		badges += theme.fg("dim", ` [context ${args.context}]`);
	}
	return badges;
}

function formatReplaceBadges(args: AstGrepReplaceCallArgs | undefined, theme: Theme): string {
	let badges = "";
	if (args?.lang) {
		badges += theme.fg("dim", ` [${args.lang}]`);
	}
	badges += formatGlobBadge(args?.globs, theme);
	if (args?.dryRun !== false) {
		badges += theme.fg("warning", " [dry-run]");
	}
	return badges;
}

function formatTruncationReason(reason: SgTruncationReason | undefined): string {
	if (reason === "max_matches") {
		return "match limit reached";
	}
	if (reason === "max_output_bytes") {
		return "output exceeded 1MB limit";
	}
	if (reason === "timeout") {
		return "search timed out";
	}
	return "results truncated";
}

function formatTruncationSuffix(
	details: { truncated: boolean; truncatedReason?: SgTruncationReason },
	theme: Theme,
): string {
	if (!details.truncated) {
		return "";
	}

	return ` ${theme.fg("warning", `[truncated: ${formatTruncationReason(details.truncatedReason)}]`)}`;
}

function formatTruncationBanner(
	details: { truncated: boolean; truncatedReason?: SgTruncationReason },
	theme: Theme,
): string {
	if (!details.truncated) {
		return "";
	}

	return `\n${theme.fg("warning", `[Truncated: ${formatTruncationReason(details.truncatedReason)}]`)}`;
}

function formatMatchLine(match: CliMatch): string {
	const line = match.lines.trim();
	return line.length > 0 ? line : match.text.trim();
}

function formatPosition(match: CliMatch): string {
	return `${match.range.start.line + 1}:${match.range.start.column + 1}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

function groupMatchesByFile(matches: CliMatch[]): MatchGroup[] {
	const groups: MatchGroup[] = [];
	const indexes = new Map<string, number>();

	for (const match of matches) {
		const existingIndex = indexes.get(match.file);
		if (existingIndex !== undefined) {
			groups[existingIndex]?.matches.push(match);
			continue;
		}

		indexes.set(match.file, groups.length);
		groups.push({ file: match.file, matches: [match] });
	}

	return groups;
}

function formatMatchSummary(totalMatches: number, fileCount: number, theme: Theme): string {
	return (
		theme.fg("success", pluralize(totalMatches, "match", "matches")) +
		theme.fg("muted", ` • ${pluralize(fileCount, "file")}`)
	);
}

function formatReplacementSummary(details: AstGrepReplaceDetails, fileCount: number, theme: Theme): string {
	const replacements = pluralize(details.totalMatches, "replacement");
	if (details.dryRun) {
		return (
			theme.fg("warning", `[DRY RUN] ${replacements} previewed`) +
			theme.fg("muted", ` • ${pluralize(fileCount, "file")}`)
		);
	}

	return theme.fg("success", `Applied ${replacements}`) + theme.fg("muted", ` • ${pluralize(fileCount, "file")}`);
}

function formatCollapsedMatchGroups(groups: MatchGroup[], theme: Theme): string {
	const lines: string[] = [];
	for (const group of groups.slice(0, MAX_COLLAPSED_FILES)) {
		lines.push(
			theme.fg("muted", `  ${shortenPath(group.file)} (${pluralize(group.matches.length, "match", "matches")})`),
		);
	}

	if (groups.length > MAX_COLLAPSED_FILES) {
		lines.push(theme.fg("dim", `  … ${groups.length - MAX_COLLAPSED_FILES} more files`));
	}

	return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

function formatExpandedMatches(matches: CliMatch[], totalMatches: number, theme: Theme): string {
	const groups = groupMatchesByFile(matches);
	const lines: string[] = [];
	let renderedMatches = 0;

	for (const group of groups) {
		if (renderedMatches >= MAX_EXPANDED_MATCHES) {
			break;
		}

		lines.push(theme.fg("accent", shortenPath(group.file)));
		for (const match of group.matches) {
			if (renderedMatches >= MAX_EXPANDED_MATCHES) {
				break;
			}

			const position = theme.fg("muted", formatPosition(match));
			const snippet = theme.fg("toolOutput", truncateToWidth(formatMatchLine(match), MAX_SNIPPET_LENGTH));
			lines.push(`  ${position}  ${snippet}`);
			renderedMatches++;
		}
	}

	if (totalMatches > renderedMatches) {
		lines.push(theme.fg("dim", `… ${totalMatches - renderedMatches} more matches not shown`));
	}

	return lines.length > 0 ? `\n\n${lines.join("\n")}` : "";
}

function formatFallbackResult<TDetails>(result: AgentToolResult<TDetails>, theme: Theme, isError = false): string {
	const output = getTextContent(result).trim();
	if (isError && output.length > 0) {
		return theme.fg("error", `Error: ${truncateMessage(output)}`);
	}
	return output.length > 0 ? theme.fg("toolOutput", output) : theme.fg("dim", "No output");
}

function formatSearchResultText(
	result: AgentToolResult<unknown>,
	options: ToolRenderResultOptions,
	theme: Theme,
	isError: boolean | undefined,
): string {
	const details = isSearchDetails(result.details) ? result.details : undefined;
	if (!details) {
		return formatFallbackResult(result, theme, isError);
	}

	if (details.error) {
		return theme.fg("error", `Error: ${truncateMessage(details.error)}`);
	}

	if (details.totalMatches === 0) {
		let text = theme.fg("dim", "No matches found");
		if (details.hint) {
			text += `\n${theme.fg("muted", details.hint)}`;
		}
		return text;
	}

	const groups = groupMatchesByFile(details.matches);
	const summary = formatMatchSummary(details.totalMatches, groups.length, theme);
	if (!options.expanded) {
		return `${summary}${formatTruncationSuffix(details, theme)}${formatCollapsedMatchGroups(groups, theme)}`;
	}

	return `${summary}${formatTruncationBanner(details, theme)}${formatExpandedMatches(details.matches, details.totalMatches, theme)}`;
}

function formatReplaceResultText(
	result: AgentToolResult<unknown>,
	options: ToolRenderResultOptions,
	theme: Theme,
	isError: boolean | undefined,
): string {
	const details = isReplaceDetails(result.details) ? result.details : undefined;
	if (!details) {
		return formatFallbackResult(result, theme, isError);
	}

	if (details.error) {
		return theme.fg("error", `Error: ${truncateMessage(details.error)}`);
	}

	if (details.totalMatches === 0) {
		return theme.fg("dim", "No matches found to replace");
	}

	const groups = groupMatchesByFile(details.matches);
	const summary = formatReplacementSummary(details, groups.length, theme);

	if (!options.expanded) {
		return `${summary}${formatTruncationSuffix(details, theme)}${formatCollapsedMatchGroups(groups, theme)}`;
	}

	return `${summary}${formatTruncationBanner(details, theme)}${formatExpandedMatches(details.matches, details.totalMatches, theme)}`;
}

export function renderSearchCall(args: unknown, theme: Theme, context: RenderContext): Text {
	const text = reuseText(context);
	const callArgs = getSearchCallArgs(args);
	const pattern = callArgs?.pattern ?? "";
	const paths = formatPaths(callArgs?.paths);
	text.setText(
		theme.fg("toolTitle", theme.bold("ast_grep_search ")) +
			theme.fg("accent", `/${pattern}/`) +
			theme.fg("toolOutput", ` in ${paths}`) +
			formatSearchBadges(callArgs, theme),
	);
	return text;
}

export function renderSearchResult(
	result: AgentToolResult<unknown>,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
): Text {
	const text = reuseText(context);
	text.setText(formatSearchResultText(result, options, theme, context.isError));
	return text;
}

export function renderReplaceCall(args: unknown, theme: Theme, context: RenderContext): Text {
	const text = reuseText(context);
	const callArgs = getReplaceCallArgs(args);
	const pattern = callArgs?.pattern ?? "";
	const rewrite = callArgs?.rewrite ?? "";
	const paths = formatPaths(callArgs?.paths);
	text.setText(
		theme.fg("toolTitle", theme.bold("ast_grep_replace ")) +
			theme.fg("accent", `/${pattern}/`) +
			theme.fg("dim", " → ") +
			theme.fg("accent", rewrite) +
			theme.fg("toolOutput", ` in ${paths}`) +
			formatReplaceBadges(callArgs, theme),
	);
	return text;
}

export function renderReplaceResult(
	result: AgentToolResult<unknown>,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
): Text {
	const text = reuseText(context);
	text.setText(formatReplaceResultText(result, options, theme, context.isError));
	return text;
}
