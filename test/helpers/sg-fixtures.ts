import type { CliMatch } from "../../src/ast-grep/types.js";

export function makeCliMatch(overrides: Partial<CliMatch> = {}): CliMatch {
	const base: CliMatch = {
		text: 'console.log("hello");',
		range: {
			byteOffset: { start: 0, end: 21 },
			start: { line: 0, column: 0 },
			end: { line: 0, column: 21 },
		},
		file: "file.ts",
		lines: 'console.log("hello");',
		charCount: { leading: 0, trailing: 0 },
		language: "TypeScript",
	};

	const range = overrides.range
		? {
				...base.range,
				...overrides.range,
				byteOffset: {
					...base.range.byteOffset,
					...overrides.range.byteOffset,
				},
				start: {
					...base.range.start,
					...overrides.range.start,
				},
				end: {
					...base.range.end,
					...overrides.range.end,
				},
			}
		: base.range;

	const charCount = overrides.charCount ? { ...base.charCount, ...overrides.charCount } : base.charCount;

	return {
		...base,
		...overrides,
		range,
		charCount,
	};
}

export function buildJsonStdout(matches: CliMatch[]): string {
	return JSON.stringify(matches);
}

export function buildLargeStdout(matchCount: number, padBytes = 0): string {
	const padding = "x".repeat(padBytes);
	const matches = Array.from({ length: matchCount }, (_, index) =>
		makeCliMatch({
			text: `match-${index}${padding}`,
			file: `file-${index}.ts`,
			lines: `match-${index}${padding}`,
			range: {
				byteOffset: { start: index, end: index + 1 },
				start: { line: index, column: 0 },
				end: { line: index, column: 1 },
			},
		}),
	);

	return JSON.stringify(matches);
}
