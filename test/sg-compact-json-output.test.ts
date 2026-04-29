import { describe, expect, it } from "vitest";

import { createSgResultFromStdout } from "../src/ast-grep/json-output.js";
import { DEFAULT_MAX_MATCHES, DEFAULT_MAX_OUTPUT_BYTES } from "../src/ast-grep/languages.js";
import { buildJsonStdout, buildLargeStdout, makeCliMatch } from "./helpers/sg-fixtures.js";

describe("createSgResultFromStdout", () => {
	it("#given empty stdout #when creating result #then returns empty non truncated result", () => {
		// given / when
		const result = createSgResultFromStdout("");

		// then
		expect(result).toEqual({ matches: [], totalMatches: 0, truncated: false });
	});

	it("#given whitespace stdout #when creating result #then returns empty non truncated result", () => {
		// given / when
		const result = createSgResultFromStdout("\n\t  ");

		// then
		expect(result).toEqual({ matches: [], totalMatches: 0, truncated: false });
	});

	it("#given valid JSON stdout #when creating result #then preserves matches without truncation", () => {
		// given
		const matches = [makeCliMatch({ file: "one.ts" }), makeCliMatch({ file: "two.ts" })];

		// when
		const result = createSgResultFromStdout(buildJsonStdout(matches));

		// then
		expect(result.matches).toEqual(matches);
		expect(result.totalMatches).toBe(2);
		expect(result.truncated).toBe(false);
		expect(result.truncatedReason).toBeUndefined();
	});

	it("#given more than max matches #when creating result #then slices matches and marks max match truncation", () => {
		// given
		const stdout = buildLargeStdout(DEFAULT_MAX_MATCHES + 1);

		// when
		const result = createSgResultFromStdout(stdout);

		// then
		expect(result.matches).toHaveLength(DEFAULT_MAX_MATCHES);
		expect(result.totalMatches).toBe(DEFAULT_MAX_MATCHES + 1);
		expect(result.truncated).toBe(true);
		expect(result.truncatedReason).toBe("max_matches");
	});

	it("#given truncated JSON after valid objects #when creating result #then salvages through last full object", () => {
		// given
		const firstMatch = makeCliMatch({ file: "first.ts" });
		const secondMatch = makeCliMatch({ file: "second.ts" });
		const validPrefix = `[${JSON.stringify(firstMatch)},${JSON.stringify(secondMatch)},`;
		const truncatedObject = `{"text":"${"x".repeat(DEFAULT_MAX_OUTPUT_BYTES)}`;
		const stdout = `${validPrefix}${truncatedObject}`;

		// when
		const result = createSgResultFromStdout(stdout);

		// then
		expect(result.matches).toEqual([firstMatch, secondMatch]);
		expect(result.totalMatches).toBe(2);
		expect(result.truncated).toBe(true);
		expect(result.truncatedReason).toBe("max_output_bytes");
	});

	it("#given unparsable truncated garbage #when creating result #then returns error result", () => {
		// given
		const stdout = "not json".repeat(DEFAULT_MAX_OUTPUT_BYTES);

		// when
		const result = createSgResultFromStdout(stdout);

		// then
		expect(result.matches).toEqual([]);
		expect(result.totalMatches).toBe(0);
		expect(result.truncated).toBe(true);
		expect(result.truncatedReason).toBe("max_output_bytes");
		expect(result.error).toBe("Output too large and could not be parsed");
	});
});
