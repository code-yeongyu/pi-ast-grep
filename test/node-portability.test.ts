import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface SourceLine {
	filePath: string;
	lineNumber: number;
	text: string;
}

function collectTypescriptFiles(directoryPath: string): string[] {
	const entries = readdirSync(directoryPath, { withFileTypes: true });
	const filePaths: string[] = [];

	for (const entry of entries) {
		const entryPath = join(directoryPath, entry.name);
		if (entry.isDirectory()) {
			filePaths.push(...collectTypescriptFiles(entryPath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith(".ts")) {
			filePaths.push(entryPath);
		}
	}

	return filePaths;
}

function readSourceLines(): SourceLine[] {
	const sourceDirectory = join(process.cwd(), "src");
	return collectTypescriptFiles(sourceDirectory).flatMap((filePath) => {
		const contents = readFileSync(filePath, "utf-8");
		return contents.split("\n").map((text, index) => ({
			filePath,
			lineNumber: index + 1,
			text,
		}));
	});
}

function findLinesContaining(pattern: string): SourceLine[] {
	return readSourceLines().filter((line) => line.text.includes(pattern));
}

describe("node portability", () => {
	it('#given source files #when scanning imports #then no line contains from "bun"', () => {
		// given / when
		const violations = findLinesContaining('from "bun"');

		// then
		expect(violations).toEqual([]);
	});

	it("#given source files #when scanning runtime globals #then no line contains Bun dot", () => {
		// given / when
		const violations = findLinesContaining("Bun.");

		// then
		expect(violations).toEqual([]);
	});

	it("#given source files #when scanning process APIs #then no line contains exited marker", () => {
		// given / when
		const violations = findLinesContaining(".exited");

		// then
		expect(violations).toEqual([]);
	});
});
