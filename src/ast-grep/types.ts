import type { CLI_LANGUAGES } from "./languages.js";

export type CliLanguage = (typeof CLI_LANGUAGES)[number];

export interface Position {
	line: number;
	column: number;
}

export interface Range {
	start: Position;
	end: Position;
}

export interface CliMatch {
	text: string;
	range: Range & {
		byteOffset: { start: number; end: number };
	};
	file: string;
	lines: string;
	charCount: { leading: number; trailing: number };
	language: string;
}

export type SgTruncationReason = "max_matches" | "max_output_bytes" | "timeout";

export interface SgResult {
	matches: CliMatch[];
	totalMatches: number;
	truncated: boolean;
	truncatedReason?: SgTruncationReason;
	error?: string;
}

export interface RunSgOptions {
	pattern: string;
	lang: CliLanguage;
	paths?: string[];
	globs?: string[];
	rewrite?: string;
	context?: number;
	updateAll?: boolean;
}
