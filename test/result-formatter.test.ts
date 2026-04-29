import { describe, expect, it } from "vitest";

import { formatReplaceResult, formatSearchResult } from "../src/ast-grep/result-formatter.js";
import type { SgResult } from "../src/ast-grep/types.js";
import { makeCliMatch } from "./helpers/sg-fixtures.js";

function makeResult(overrides: Partial<SgResult> = {}): SgResult {
	return {
		matches: [makeCliMatch()],
		totalMatches: 1,
		truncated: false,
		...overrides,
	};
}

describe("formatSearchResult", () => {
	it("#given error result #when formatting search and replace #then returns error text", () => {
		// given
		const result = makeResult({ matches: [], totalMatches: 0, error: "boom" });

		// when / then
		expect(formatSearchResult(result)).toBe("Error: boom");
		expect(formatReplaceResult(result, true)).toBe("Error: boom");
	});

	it("#given empty matches #when formatting search and replace #then returns no matches text", () => {
		// given
		const result = makeResult({ matches: [], totalMatches: 0 });

		// when / then
		expect(formatSearchResult(result)).toBe("No matches found");
		expect(formatReplaceResult(result, true)).toBe("No matches found to replace");
	});

	it("#given zero based range #when formatting search #then converts to one based location", () => {
		// given
		const match = makeCliMatch({
			file: "file.ts",
			range: {
				byteOffset: { start: 0, end: 10 },
				start: { line: 4, column: 10 },
				end: { line: 4, column: 20 },
			},
		});
		const result = makeResult({ matches: [match] });

		// when
		const formatted = formatSearchResult(result);

		// then
		expect(formatted).toContain("file.ts:5:11");
	});

	it("#given max matches truncation #when formatting search #then shows first count banner", () => {
		// given
		const result = makeResult({
			truncated: true,
			truncatedReason: "max_matches",
			totalMatches: 7,
		});

		// when
		const formatted = formatSearchResult(result);

		// then
		expect(formatted).toContain("[TRUNCATED]");
		expect(formatted).toContain("showing first 1 of 7");
	});

	it("#given max output truncation #when formatting search #then shows output exceeded banner", () => {
		// given
		const result = makeResult({ truncated: true, truncatedReason: "max_output_bytes" });

		// when
		const formatted = formatSearchResult(result);

		// then
		expect(formatted).toContain("[TRUNCATED]");
		expect(formatted).toContain("output exceeded 1MB limit");
	});

	it("#given timeout truncation #when formatting search #then shows timed out banner", () => {
		// given
		const result = makeResult({ truncated: true, truncatedReason: "timeout" });

		// when
		const formatted = formatSearchResult(result);

		// then
		expect(formatted).toContain("[TRUNCATED]");
		expect(formatted).toContain("search timed out");
	});
});

describe("formatReplaceResult", () => {
	it("#given dry run replace result #when formatting #then shows dry run prefix and footer", () => {
		// given
		const result = makeResult({ matches: [makeCliMatch(), makeCliMatch({ file: "other.ts" })] });

		// when
		const formatted = formatReplaceResult(result, true);

		// then
		expect(formatted).toContain("[DRY RUN] 2 replacement(s)");
		expect(formatted).toContain("Use dryRun=false to apply changes");
	});

	it("#given applied replace result #when formatting #then omits dry run prefix and footer", () => {
		// given
		const result = makeResult();

		// when
		const formatted = formatReplaceResult(result, false);

		// then
		expect(formatted).toContain("1 replacement(s)");
		expect(formatted).not.toContain("[DRY RUN]");
		expect(formatted).not.toContain("Use dryRun=false to apply changes");
	});
});
