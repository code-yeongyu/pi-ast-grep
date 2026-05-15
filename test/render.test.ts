import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Theme } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

import { renderReplaceResult, renderSearchResult } from "../src/ast-grep/render.js";
import type { AstGrepReplaceDetails, AstGrepSearchDetails } from "../src/ast-grep/tools.js";
import { makeCliMatch } from "./helpers/sg-fixtures.js";

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const COLOR = "#ffffff";
const testTheme = new Theme(
	{
		accent: COLOR,
		border: COLOR,
		borderAccent: COLOR,
		borderMuted: COLOR,
		success: COLOR,
		error: COLOR,
		warning: COLOR,
		muted: COLOR,
		dim: COLOR,
		text: COLOR,
		thinkingText: COLOR,
		userMessageText: COLOR,
		customMessageText: COLOR,
		customMessageLabel: COLOR,
		toolTitle: COLOR,
		toolOutput: COLOR,
		mdHeading: COLOR,
		mdLink: COLOR,
		mdLinkUrl: COLOR,
		mdCode: COLOR,
		mdCodeBlock: COLOR,
		mdCodeBlockBorder: COLOR,
		mdQuote: COLOR,
		mdQuoteBorder: COLOR,
		mdHr: COLOR,
		mdListBullet: COLOR,
		toolDiffAdded: COLOR,
		toolDiffRemoved: COLOR,
		toolDiffContext: COLOR,
		syntaxComment: COLOR,
		syntaxKeyword: COLOR,
		syntaxFunction: COLOR,
		syntaxVariable: COLOR,
		syntaxString: COLOR,
		syntaxNumber: COLOR,
		syntaxType: COLOR,
		syntaxOperator: COLOR,
		syntaxPunctuation: COLOR,
		thinkingOff: COLOR,
		thinkingMinimal: COLOR,
		thinkingLow: COLOR,
		thinkingMedium: COLOR,
		thinkingHigh: COLOR,
		thinkingXhigh: COLOR,
		bashMode: COLOR,
	},
	{
		selectedBg: COLOR,
		userMessageBg: COLOR,
		customMessageBg: COLOR,
		toolPendingBg: COLOR,
		toolSuccessBg: COLOR,
		toolErrorBg: COLOR,
	},
	"truecolor",
);

function stripAnsi(text: string): string {
	return text.replace(ANSI_PATTERN, "");
}

function renderText(component: { render(width: number): string[] }): string {
	return stripAnsi(component.render(240).join("\n"));
}

function makeSearchDetails(overrides: Partial<AstGrepSearchDetails> = {}): AstGrepSearchDetails {
	const matches = [
		makeCliMatch({ file: "src/logger.ts" }),
		makeCliMatch({
			file: "src/console.ts",
			lines: "console.error(message);",
			text: "console.error(message);",
			range: {
				byteOffset: { start: 80, end: 103 },
				start: { line: 7, column: 1 },
				end: { line: 7, column: 24 },
			},
		}),
		makeCliMatch({
			file: "src/logger.ts",
			lines: "console.warn(message);",
			text: "console.warn(message);",
			range: {
				byteOffset: { start: 120, end: 142 },
				start: { line: 12, column: 2 },
				end: { line: 12, column: 24 },
			},
		}),
	];

	return {
		pattern: "console.$METHOD($$$)",
		lang: "typescript",
		paths: ["src"],
		matches,
		totalMatches: matches.length,
		truncated: false,
		...overrides,
	};
}

function makeReplaceDetails(overrides: Partial<AstGrepReplaceDetails> = {}): AstGrepReplaceDetails {
	const matches = [
		makeCliMatch({ file: "src/logger.ts" }),
		makeCliMatch({
			file: "src/console.ts",
			lines: "console.error(message);",
			text: "console.error(message);",
		}),
	];

	return {
		pattern: "console.log($MSG)",
		rewrite: "logger.info($MSG)",
		lang: "typescript",
		paths: ["src"],
		dryRun: true,
		matches,
		totalMatches: matches.length,
		truncated: false,
		...overrides,
	};
}

describe("renderSearchResult", () => {
	it("#given matches across files #when collapsed #then shows counts and file preview", () => {
		// given
		const details = makeSearchDetails();
		const result: AgentToolResult<AstGrepSearchDetails> = {
			content: [{ type: "text", text: "" }],
			details,
		};

		// when
		const output = renderText(
			renderSearchResult(result, { expanded: false, isPartial: false }, testTheme, { lastComponent: undefined }),
		);

		// then
		expect(output).toContain("3 matches");
		expect(output).toContain("2 files");
		expect(output).toContain("src/logger.ts");
		expect(output).toContain("src/console.ts");
	});

	it("#given matches across files #when expanded #then groups locations and snippets by file", () => {
		// given
		const details = makeSearchDetails();
		const result: AgentToolResult<AstGrepSearchDetails> = {
			content: [{ type: "text", text: "" }],
			details,
		};

		// when
		const output = renderText(
			renderSearchResult(result, { expanded: true, isPartial: false }, testTheme, { lastComponent: undefined }),
		);

		// then
		expect(output).toContain("3 matches");
		expect(output).toContain("2 files");
		expect(output).toContain("src/logger.ts");
		expect(output).toContain("1:1");
		expect(output).toContain("13:3");
		expect(output).toContain("src/console.ts");
		expect(output).toContain("8:2");
		expect(output).toContain("console.error(message);");
	});

	it("#given max output truncation #when collapsed #then explains the byte limit", () => {
		// given
		const details = makeSearchDetails({ truncated: true, truncatedReason: "max_output_bytes", totalMatches: 15 });
		const result: AgentToolResult<AstGrepSearchDetails> = {
			content: [{ type: "text", text: "" }],
			details,
		};

		// when
		const output = renderText(
			renderSearchResult(result, { expanded: false, isPartial: false }, testTheme, { lastComponent: undefined }),
		);

		// then
		expect(output).toContain("output exceeded 1MB limit");
		expect(output).not.toContain("max_output_bytes");
	});

	it("#given an error fallback #when rendering #then keeps the failure visible", () => {
		// given
		const result: AgentToolResult<unknown> = {
			content: [{ type: "text", text: "Output too large and could not be parsed" }],
			details: {},
		};

		// when
		const output = renderText(
			renderSearchResult(result, { expanded: false, isPartial: false }, testTheme, {
				lastComponent: undefined,
				isError: true,
			}),
		);

		// then
		expect(output).toContain("Error: Output too large and could not be parsed");
	});
});

describe("renderReplaceResult", () => {
	it("#given dry run replacements #when collapsed #then shows replacement counts and affected files", () => {
		// given
		const details = makeReplaceDetails();
		const result: AgentToolResult<AstGrepReplaceDetails> = {
			content: [{ type: "text", text: "" }],
			details,
		};

		// when
		const output = renderText(
			renderReplaceResult(result, { expanded: false, isPartial: false }, testTheme, { lastComponent: undefined }),
		);

		// then
		expect(output).toContain("[DRY RUN] 2 replacements previewed");
		expect(output).toContain("2 files");
		expect(output).toContain("src/logger.ts");
		expect(output).toContain("src/console.ts");
	});
});
